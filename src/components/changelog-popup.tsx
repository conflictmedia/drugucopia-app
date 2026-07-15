'use client'

import { useEffect, useState } from 'react'
import { X, Sparkles, Github } from 'lucide-react'
import Link from 'next/link'
import ReactMarkdown from 'react-markdown'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'drugucopia-last-seen-version'

function getLastSeenVersion(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(STORAGE_KEY)
}

function setLastSeenVersion(version: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, version)
}

interface ChangelogPopupProps {
  version: string
  changelog: string
}

export function ChangelogPopup({ version, changelog }: ChangelogPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const lastSeen = getLastSeenVersion()
    if (lastSeen !== version) {
      setIsOpen(true)
    }
  }, [version])

  const handleClose = () => {
    setIsOpen(false)
    setLastSeenVersion(version)
  }

  if (!mounted || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative z-10 card bg-base-100 shadow-2xl w-full max-w-2xl mx-4 max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="card-body overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-primary/10 p-2 rounded-box">
                <Sparkles className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-base-content">
                  What's New in Drugucopia v{version}
                </h3>
                <p className="text-sm text-base-content/60">
                  Updated {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Close changelog"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="prose prose-sm max-w-none dark:prose-invert bg-base-200/50 rounded-box p-4 max-h-96 overflow-y-auto">
            <ReactMarkdown>{changelog}</ReactMarkdown>
          </div>

          <div className="flex items-center justify-end gap-2 mt-6">
            <button onClick={handleClose} className="btn btn-ghost">
              Later
            </button>
            <Link
              href="/changelog"
              prefetch={false}
              onClick={handleClose}
              className={cn('btn btn-primary', 'flex items-center gap-2')}
            >
              <Github className="h-4 w-4" />
              View Full Changelog
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
