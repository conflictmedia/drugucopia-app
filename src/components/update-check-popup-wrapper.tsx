'use client'

import { useEffect, useState } from 'react'
import { UpdateCheckPopup, GITHUB_API_URL } from './update-check-popup'
import { APP_VERSION } from '@/lib/version'

interface GitHubRelease {
  tag_name: string
  name: string
  body: string | null
  html_url: string
  published_at: string
}

function parseVersion(version: string): string {
  // Remove 'v' prefix if present
  return version.replace(/^v/, '')
}

function compareVersions(current: string, latest: string): number {
  const currentParts = parseVersion(current).split('.').map(Number)
  const latestParts = parseVersion(latest).split('.').map(Number)

  for (let i = 0; i < Math.max(currentParts.length, latestParts.length); i++) {
    const currentPart = currentParts[i] || 0
    const latestPart = latestParts[i] || 0
    if (currentPart !== latestPart) {
      return currentPart - latestPart
    }
  }
  return 0
}

export function UpdateCheckPopupWrapper() {
  const [latestVersion, setLatestVersion] = useState<string>('')
  const [releaseNotes, setReleaseNotes] = useState<string>('')
  const [releaseUrl, setReleaseUrl] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchLatestRelease() {
      try {
        const response = await fetch(GITHUB_API_URL, {
          headers: {
            Accept: 'application/vnd.github.v3+json',
          },
          // Cache for 1 hour to avoid rate limiting
          next: { revalidate: 3600 },
        })

        if (!response.ok) {
          if (response.status === 403) {
            // Rate limited - silently fail
            return
          }
          throw new Error(`GitHub API error: ${response.status}`)
        }

        const release: GitHubRelease = await response.json()

        // Parse version from tag_name (e.g., "v0.2.0" -> "0.2.0")
        const version = parseVersion(release.tag_name)

        // Compare versions
        const comparison = compareVersions(APP_VERSION, version)

        if (comparison < 0) {
          // New version available
          setLatestVersion(version)
          setReleaseNotes(release.body || 'No release notes provided.')
          setReleaseUrl(release.html_url)
        }
      } catch (err) {
        // Silently fail - don't show error to user
        console.debug('Update check failed:', err)
      } finally {
        setLoading(false)
      }
    }

    fetchLatestRelease()
  }, [])

  // Don't show anything if still loading, error, or no update available
  if (loading || error || !latestVersion) {
    return null
  }

  return (
    <UpdateCheckPopup
      currentVersion={APP_VERSION}
      latestVersion={latestVersion}
      releaseNotes={releaseNotes}
      releaseUrl={releaseUrl}
    />
  )
}