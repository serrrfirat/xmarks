import { runClaudeJSON } from './claude';
import { getDb } from './db';
import {
  assignCategory,
  clearAllAssignments,
  createCategory,
  deleteAllCategories,
  getCategories,
  updateClassificationState,
} from './categories';

type SampleTweet = {
  id: string;
  text: string;
  author_handle: string;
  created_at: string;
};

type UnclassifiedTweet = {
  id: string;
  text: string;
  author_handle: string;
};

function normalizeCategoryName(name: string): string {
  return name.trim().toLowerCase();
}

function escapeXml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&apos;');
}

function chunk<T>(items: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    out.push(items.slice(i, i + size));
  }
  return out;
}

function buildDiscoveryPrompt(samples: SampleTweet[]): string {
  const sampleText = samples
    .map((tweet) => `- @${tweet.author_handle}: ${tweet.text}`)
    .join('\n');

  return [
    'You are classifying X/Twitter bookmarks into semantic topics.',
    'Generate 10-15 broad, practical categories that can cover this dataset.',
    'Each category must include:',
    '- name: concise title (2-4 words)',
    '- description: one sentence explaining inclusion criteria',
    '',
    'Return JSON only with this exact shape:',
    '{"categories":[{"name":"...","description":"..."}]}',
    '',
    'Constraints:',
    '- 10 to 15 categories exactly',
    '- Non-overlapping where possible',
    '- Avoid overly generic buckets like "Misc"',
    '',
    'Sample tweets:',
    sampleText,
  ].join('\n');
}

function buildClassificationPrompt(
  categories: Array<{ name: string; description: string | null }>,
  tweetXml: string
): string {
  const categoryList = categories
    .map((category) => `- ${category.name}: ${category.description ?? ''}`)
    .join('\n');

  return [
    'Assign each tweet to exactly one category from the list.',
    'If unsure, choose the closest category from the provided options.',
    '',
    'Categories:',
    categoryList,
    '',
    'Tweets (XML):',
    tweetXml,
    '',
    'Return JSON only with this exact shape:',
    '{"assignments":[{"tweetId":"...","categoryName":"..."}]}',
    'Only use categoryName values exactly as listed above.',
  ].join('\n');
}

function getSampleTweets(): SampleTweet[] {
  const db = getDb();
  const earliest = db
    .query(`
      SELECT id, text, author_handle, created_at
      FROM tweets
      ORDER BY created_at ASC
      LIMIT 50
    `)
    .all() as SampleTweet[];

  const countRow = db.query(`SELECT COUNT(*) as count FROM tweets`).get() as { count: number };
  const middleOffset = Math.max(Math.floor((countRow.count - 50) / 2), 0);

  const middle = db
    .query(`
      SELECT id, text, author_handle, created_at
      FROM tweets
      ORDER BY created_at ASC
      LIMIT 50 OFFSET ?
    `)
    .all(middleOffset) as SampleTweet[];

  const latest = db
    .query(`
      SELECT id, text, author_handle, created_at
      FROM tweets
      ORDER BY created_at DESC
      LIMIT 50
    `)
    .all() as SampleTweet[];

  const merged = new Map<string, SampleTweet>();
  for (const tweet of [...earliest, ...middle, ...latest]) {
    merged.set(tweet.id, tweet);
  }

  return Array.from(merged.values());
}

function ensureUncategorizedCategoryId(categoryNameToId: Map<string, number>): number {
  const existing = categoryNameToId.get('uncategorized');
  if (existing) return existing;

  const created = createCategory('Uncategorized', 'Fallback category when no confident match exists.');
  categoryNameToId.set('uncategorized', created.id);
  return created.id;
}

export async function discoverTopics(): Promise<void> {
  try {
    updateClassificationState({
      status: 'discovering',
      phase: 'sampling',
      progressCurrent: 0,
      progressTotal: 3,
    });

    const samples = getSampleTweets();
    const prompt = buildDiscoveryPrompt(samples);
    const response = await runClaudeJSON<{
      categories: Array<{ name: string; description: string }>;
    }>(prompt);

    const cleaned = response.categories
      .map((category) => ({
        name: category.name.trim(),
        description: category.description.trim(),
      }))
      .filter((category) => category.name.length > 0 && category.description.length > 0);

    const deduped = Array.from(
      new Map(cleaned.map((category) => [normalizeCategoryName(category.name), category])).values()
    );

    if (deduped.length < 10) {
      throw new Error(`Claude returned too few categories (${deduped.length}); expected 10-15.`);
    }

    const categories = deduped.slice(0, 15);

    deleteAllCategories();
    clearAllAssignments();

    for (const category of categories) {
      createCategory(category.name, category.description);
    }

    updateClassificationState({
      status: 'idle',
      phase: null,
      progressCurrent: 0,
      progressTotal: 0,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateClassificationState({ status: 'error', errorMessage: message });
    throw error;
  }
}

export async function classifyBookmarks(): Promise<void> {
  try {
    updateClassificationState({
      status: 'classifying',
      phase: 'loading',
      progressCurrent: 0,
      progressTotal: 0,
    });

    const categories = getCategories();
    const categoryNameToId = new Map<string, number>(
      categories.map((category) => [normalizeCategoryName(category.name), category.id])
    );

    const db = getDb();
    const unclassified = db
      .query(`SELECT id, text, author_handle FROM tweets WHERE category_id IS NULL`)
      .all() as UnclassifiedTweet[];

    const batches = chunk(unclassified, 300);
    updateClassificationState({ progressTotal: batches.length });

    for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
      const batch = batches[batchIndex];
      const batchIds = new Set(batch.map((tweet) => tweet.id));

      const tweetXml = `<tweets>\n${batch
        .map(
          (tweet) =>
            `  <tweet id="${escapeXml(tweet.id)}">@${escapeXml(tweet.author_handle)}: ${escapeXml(tweet.text)}</tweet>`
        )
        .join('\n')}\n</tweets>`;

      const prompt = buildClassificationPrompt(
        getCategories().map((category) => ({
          name: category.name,
          description: category.description,
        })),
        tweetXml
      );

      const response = await runClaudeJSON<{
        assignments: Array<{ tweetId: string; categoryName: string }>;
      }>(prompt);

      const assignedTweetIds = new Set<string>();

      for (const assignment of response.assignments) {
        const tweetId = String(assignment.tweetId);
        if (!batchIds.has(tweetId)) continue;

        const categoryId = categoryNameToId.get(normalizeCategoryName(assignment.categoryName));
        if (categoryId) {
          assignCategory(tweetId, categoryId);
          assignedTweetIds.add(tweetId);
          continue;
        }

        const uncategorizedId = ensureUncategorizedCategoryId(categoryNameToId);
        assignCategory(tweetId, uncategorizedId);
        assignedTweetIds.add(tweetId);
      }

      for (const tweet of batch) {
        if (assignedTweetIds.has(tweet.id)) continue;
        const uncategorizedId = ensureUncategorizedCategoryId(categoryNameToId);
        assignCategory(tweet.id, uncategorizedId);
      }

      updateClassificationState({ progressCurrent: batchIndex + 1 });
    }

    updateClassificationState({
      status: 'idle',
      phase: null,
      completedAt: new Date().toISOString(),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    updateClassificationState({ status: 'error', errorMessage: message });
    throw error;
  }
}
