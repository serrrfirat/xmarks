'use client'

import { Pause, Play, SkipForward } from 'lucide-react'

interface TimelineControlsProps {
  minDate: string
  maxDate: string
  currentDate: string
  isPlaying: boolean
  speed: number
  onDateChange: (date: string) => void
  onPlayToggle: () => void
  onSpeedChange: (speed: number) => void
}

const DAY_MS = 24 * 60 * 60 * 1000

function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max)
}

export function TimelineControls({
  minDate,
  maxDate,
  currentDate,
  isPlaying,
  speed,
  onDateChange,
  onPlayToggle,
  onSpeedChange,
}: TimelineControlsProps) {
  const min = new Date(minDate)
  const max = new Date(maxDate)
  const current = currentDate ? new Date(currentDate) : min

  const totalDays = Math.max(
    1,
    Math.ceil((max.getTime() - min.getTime()) / DAY_MS),
  )

  const currentOffset = clamp(
    Math.round((current.getTime() - min.getTime()) / DAY_MS),
    0,
    totalDays,
  )

  const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })

  return (
    <div className="rounded-lg border border-[#292524] bg-[#1C1917] px-4 py-2.5 flex items-center gap-4">
      <button
        type="button"
        onClick={onPlayToggle}
        className={`transition-colors ${
          isPlaying ? 'text-[#F97316]' : 'text-[#78716C] hover:text-[#F97316]'
        }`}
        aria-label={isPlaying ? 'Pause timeline replay' : 'Play timeline replay'}
      >
        {isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
      </button>

      <div className="flex min-w-0 flex-1 items-center gap-3">
        <input
          type="range"
          min={0}
          max={totalDays}
          value={currentOffset}
          onChange={(e) => {
            const offset = Number(e.target.value)
            const nextDate = new Date(min.getTime() + offset * DAY_MS)
            onDateChange(nextDate.toISOString())
          }}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-[#292524] [&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:w-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-[#F97316] [&::-webkit-slider-runnable-track]:h-2 [&::-webkit-slider-runnable-track]:rounded-full [&::-webkit-slider-runnable-track]:bg-[#292524] [&::-webkit-slider-thumb]:-mt-[3px] [&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:w-3.5 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#F97316]"
        />

        <div className="shrink-0 text-right">
          <div className="text-[#E7E5E4] text-sm font-sans">
            {dateFormatter.format(current)}
          </div>
          <div className="text-[#78716C] text-xs font-sans">
            {dateFormatter.format(min)} - {dateFormatter.format(max)}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onSpeedChange(speed === 1 ? 2 : speed === 2 ? 4 : 1)}
        className="text-[#78716C] hover:text-[#F97316] transition-colors flex items-center gap-2"
        aria-label="Change playback speed"
      >
        <SkipForward className="size-4" />
        <span className="text-xs rounded-full bg-[#292524] px-2 py-0.5 text-[#E7E5E4]">
          {speed}x
        </span>
      </button>
    </div>
  )
}
