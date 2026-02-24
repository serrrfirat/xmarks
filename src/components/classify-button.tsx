'use client'

import { useClassify } from '@/hooks/use-classify'

export function ClassifyButton() {
  const { state, discover, isRunning } = useClassify()

  if (isRunning) {
    const phase = state.status === 'discovering' ? 'Discovering...' : 'Classifying...'
    const progress = state.progressTotal > 0
      ? ` (${state.progressCurrent}/${state.progressTotal})`
      : ''
    return (
      <div className="flex items-center gap-2 px-5 py-3">
        <span className="w-2 h-2 rounded-full bg-[#F97316] animate-pulse shrink-0" />
        <span className="text-[#78716C] font-sans text-xs">{phase}{progress}</span>
      </div>
    )
  }

  if (state.status === 'error') {
    return (
      <div className="flex flex-col gap-1.5 px-5 py-3">
        <span className="text-[#ef4444] font-sans text-xs truncate">
          {state.errorMessage ?? 'Classification failed'}
        </span>
        <button
          className="btn-pill btn-pill-secondary text-xs px-3 py-1 self-start"
          onClick={discover}
        >
          Retry
        </button>
      </div>
    )
  }


  if (state.completedAt === null) {

    return (
      <div className="px-5 py-3">
        <button
          className="btn-pill btn-pill-primary text-xs px-3 py-1"
          onClick={discover}
        >
          Discover Topics
        </button>
      </div>
    )
  }


  return (
    <div className="px-5 py-3">
      <button
        className="btn-pill btn-pill-secondary text-xs px-3 py-1"
        onClick={discover}
      >
        Re-discover
      </button>
    </div>
  )
}
