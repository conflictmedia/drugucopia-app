'use client'

import { useEffect, useState } from 'react'
import { X, Github, ArrowUpRight, Bell } from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'drugucopia-last-checked-version'
const CHECK_INTERVAL_MS = 24 * 60 * 60 * 1000 // 24 hours

const GITHUB_REPO = 'conflictmedia/drugucopia-app'
const GITHUB_RELEASES_URL = `https://github.com/${GITHUB_REPO}/releases`
const GITHUB_API_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`

interface UpdateCheckPopupProps {
  currentVersion: string
  latestVersion: string
  releaseNotes: string
  releaseUrl: string
}

export function UpdateCheckPopup({
  currentVersion,
  latestVersion,
  releaseNotes,
  releaseUrl,
}: UpdateCheckPopupProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const lastChecked = getLastCheckedVersion()
    const lastCheckTime = getLastCheckTime()

    // Check if we should show the popup:
    // 1. Never checked before, OR
    // 2. New version available AND hasn't been dismissed for this version, OR
    // 3. It's been more than 24 hours since last check
    const shouldCheck =
      !lastChecked ||
      (lastChecked !== latestVersion && lastCheckTime && Date.now() - lastCheckTime > CHECK_INTERVAL_MS)

    if (shouldCheck && latestVersion !== currentVersion) {
      setIsOpen(true)
    }
  }, [currentVersion, latestVersion])

  const handleClose = () => {
    setIsOpen(false)
    setLastCheckedVersion(latestVersion)
    setLastCheckTime(Date.now())
  }

  const handleLater = () => {
    // Just update check time, don't mark version as seen
    setIsOpen(false)
    setLastCheckTime(Date.now())
  }

  if (!mounted || !isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={handleClose}>
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm" />
      <div
        className="relative z-10 card bg-base-100 shadow-2xl w-full max-w-md mx-4 max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="card-body overflow-y-auto">
          <div className="flex items-start justify-between gap-4 mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-warning/10 p-2 rounded-box">
                <Bell className="h-6 w-6 text-warning" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-base-content">
                  Update Available
                </h3>
                <p className="text-sm text-base-content/60">
                  Drugucopia v{latestVersion} is now available
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="btn btn-ghost btn-sm btn-circle"
              aria-label="Dismiss update notification"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mb-4 p-3 bg-base-200/50 rounded-box">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-base-content/60">Current version</span>
              <span className="font-mono text-base-content">v{currentVersion}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-base-content/60">Latest version</span>
              <span className="font-mono text-primary font-semibold">v{latestVersion}</span>
            </div>
          </div>

          {releaseNotes && (
            <div className="prose prose-sm max-w-none dark:prose-invert bg-base-200/50 rounded-box p-4 max-h-64 overflow-y-auto mb-4">
              <h4 className="text-sm font-semibold text-base-content mb-2">What's New</h4>
              <div className="text-sm text-base-content/80 whitespace-pre-wrap">{releaseNotes}</div>
            </div>
          )}

          <div className="flex items-center justify-end gap-2">
            <button onClick={handleLater} className="btn btn-ghost">
              Remind Me Later
            </button>
            <Link
              href={releaseUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={handleClose}
              className={cn('btn btn-primary', 'flex items-center gap-2')}
            >
              <Github className="h-4 w-4" />
              View on GitHub
              <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}

function getLastCheckedVersion(): string | null {
  if (typeof window === 'undefined') return null
  return window.localStorage.getItem(STORAGE_KEY)
}

function setLastCheckedVersion(version: string) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(STORAGE_KEY, version)
}

function getLastCheckTime(): number | null {
  if (typeof window === 'undefined') return null
  const time = window.localStorage.getItem(`${STORAGE_KEY}-time`)
  return time ? parseInt(time, 10) : null
}

function setLastCheckTime(time: number) {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(`${STORAGE_KEY}-time`, time.toString())
}

export { GITHUB_REPO, GITHUB_RELEASES_URL, GITHUB_API_URL }