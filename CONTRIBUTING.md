# Contributing to XMarks

Thanks for your interest in contributing to XMarks! Here's how to get started.

## Getting Started

1. **Fork** the repository and clone your fork
2. **Install dependencies**: `bun install`
3. **Run the app**: `bun dev`

## Development Setup

### Prerequisites

- [Bun](https://bun.sh) 1.0+
- [Node.js](https://nodejs.org) 20+

### Project Structure

```
xmarks/
├── src/app/                # Next.js App Router (pages + API routes)
├── src/components/         # React components
│   ├── stats/              # D3 chart components
│   ├── layout/             # Sidebar + Header
│   └── ui/                 # shadcn/ui primitives
├── src/lib/                # Core logic (db, search, sync, types)
└── src/hooks/              # React hooks
```

### Running Locally

```bash
bun install              # Install dependencies
bun dev                  # Start dev server (http://localhost:3000)
bun run build            # Verify production build
bun run lint             # Lint
bunx tsc --noEmit        # Type check
```

## Making Changes

1. Create a branch from `main`: `git checkout -b my-feature`
2. Make your changes
3. Run `bun run lint && bunx tsc --noEmit` to verify nothing is broken
4. Commit with a clear message (e.g., `feat: add dark mode toggle`)
5. Push and open a pull request against `main`

## Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` — new feature
- `fix:` — bug fix
- `docs:` — documentation only
- `chore:` — maintenance (deps, CI, scripts)
- `refactor:` — code change that neither fixes a bug nor adds a feature

## Pull Requests

- Keep PRs focused — one feature or fix per PR
- Include a description of what changed and why
- Make sure the build passes (`bun run build`)
- Screenshots are welcome for UI changes

## D3 Guidelines

If you're adding or modifying visualization components:

- Import individual D3 modules (`d3-force`, `d3-scale`, etc.) — never the full `d3` package
- Use `structuredClone()` before passing data to d3-force simulations
- Wrap D3 components with `next/dynamic({ ssr: false })`
- Stats charts: Strategy A (D3 for math via `useMemo`, React for SVG rendering)
- Graph canvas: Strategy B (animated with `useRef` + `sim.on('tick')`)

## Reporting Bugs

Open an [issue](https://github.com/serrrfirat/xmarks/issues) with:

- Steps to reproduce
- Expected vs actual behavior
- OS and browser version

## License

By contributing, you agree that your contributions will be licensed under the [MIT License](LICENSE).
