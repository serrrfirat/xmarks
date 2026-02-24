'use client'

import { useEffect, useState } from 'react'
import { SpotlightSearch } from './spotlight-search'

export function SpotlightProvider() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return <SpotlightSearch open={open} onOpenChange={setOpen} />
}
