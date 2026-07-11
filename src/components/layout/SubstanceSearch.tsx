'use client'

import { AnimatePresence, motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { useDebounce } from '@/hooks/use-debounce'
import { Input } from '@/components/ui/input'
import { searchSubstancesRanked } from '@/lib/substances/index'
import { cn } from '@/lib/utils'

const CATEGORY_DOTS: Record<string, string> = {
  stimulants: 'bg-amber-500',
  depressants: 'bg-indigo-500',
  hallucinogens: 'bg-purple-500',
  dissociatives: 'bg-cyan-500',
  empathogens: 'bg-pink-500',
  cannabinoids: 'bg-green-500',
  opioids: 'bg-red-500',
  deliriants: 'bg-slate-500',
  nootropics: 'bg-teal-500',
  other: 'bg-zinc-500',
}

function highlightMatch(text: string, query: string) {
  if (!query.trim()) return text
  const lower = text.toLowerCase()
  const lowerQuery = query.toLowerCase().trim()
  const index = lower.indexOf(lowerQuery)
  if (index === -1) return text

  return (
    <>
      {text.slice(0, index)}
      <span className="font-semibold text-primary">
        {text.slice(index, index + lowerQuery.length)}
      </span>
      {text.slice(index + lowerQuery.length)}
    </>
  )
}

interface SubstanceSearchProps {
  mobile?: boolean
  onNavigate?: () => void
  showShortcutHint?: boolean
}

export function SubstanceSearch({
  mobile = false,
  onNavigate,
  showShortcutHint = false,
}: SubstanceSearchProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryParam = searchParams.get('q') ?? ''
  const [searchQuery, setSearchQuery] = useState(queryParam)
  const [searchOpen, setSearchOpen] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const searchRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent('drugucopia:search', { detail: searchQuery }),
    )
  }, [searchQuery])

  useEffect(() => {
    if (!searchOpen) return

    const handler = (event: MouseEvent) => {
      if (
        searchRef.current &&
        !searchRef.current.contains(event.target as Node)
      ) {
        setSearchOpen(false)
        setActiveIndex(-1)
      }
    }

    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [searchOpen])

  const debouncedQuery = useDebounce(searchQuery, 300)

  const searchResults = useMemo(() => {
    if (!debouncedQuery.trim()) return []
    return searchSubstancesRanked(debouncedQuery, { limit: 8 })
  }, [debouncedQuery])

  const navigateToSubstance = useCallback(
    (substanceId: string) => {
      setSearchOpen(false)
      setActiveIndex(-1)
      onNavigate?.()

      const viewParam = searchParams.get('view')
      const url = viewParam
        ? `/?substance=${substanceId}&view=${viewParam}`
        : `/?substance=${substanceId}`

      router.push(url)
    },
    [onNavigate, router, searchParams],
  )

  const handleKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (!searchOpen || searchResults.length === 0) {
        if (event.key === 'Enter' && searchQuery.trim()) {
          event.preventDefault()
          setSearchOpen(false)
          setActiveIndex(-1)
          onNavigate?.()
          router.push(`/?q=${encodeURIComponent(searchQuery.trim())}`)
        }
        if (event.key === 'Escape') {
          event.preventDefault()
          setSearchOpen(false)
          setActiveIndex(-1)
        }
        return
      }

      switch (event.key) {
        case 'ArrowDown':
          event.preventDefault()
          setActiveIndex((prev) =>
            prev < searchResults.length - 1 ? prev + 1 : 0,
          )
          break
        case 'ArrowUp':
          event.preventDefault()
          setActiveIndex((prev) =>
            prev > 0 ? prev - 1 : searchResults.length - 1,
          )
          break
        case 'Tab':
          event.preventDefault()
          if (event.shiftKey) {
            setActiveIndex((prev) =>
              prev > 0 ? prev - 1 : searchResults.length - 1,
            )
          } else {
            setActiveIndex((prev) =>
              prev < searchResults.length - 1 ? prev + 1 : 0,
            )
          }
          break
        case 'Enter': {
          event.preventDefault()
          const index = activeIndex >= 0 ? activeIndex : 0
          if (index < searchResults.length) {
            navigateToSubstance(searchResults[index].substance.id)
          }
          break
        }
        case 'Escape':
          event.preventDefault()
          setSearchOpen(false)
          setActiveIndex(-1)
          break
      }
    },
    [
      activeIndex,
      navigateToSubstance,
      onNavigate,
      router,
      searchOpen,
      searchQuery,
      searchResults,
    ],
  )

  const clearSearch = useCallback(() => {
    setSearchQuery('')
    setSearchOpen(false)
    setActiveIndex(-1)
    inputRef.current?.focus()
  }, [])

  return (
    <div ref={searchRef} className="relative w-full">
      <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-neutral-content" />
      <Input
        ref={inputRef}
        type="search"
        placeholder="Search substances..."
        value={searchQuery}
        onChange={(event) => {
          setSearchQuery(event.target.value)
          setSearchOpen(true)
          setActiveIndex(-1)
        }}
        onFocus={() => {
          if (searchQuery.trim()) setSearchOpen(true)
        }}
        onKeyDown={handleKeyDown}
        className={cn(
          'w-full bg-base-100 pl-9 pr-10 shadow-none',
          mobile ? 'h-10 text-sm' : 'h-10',
        )}
      />

      {showShortcutHint && !searchQuery && !mobile && (
        <kbd
          className="pointer-events-none absolute right-3 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-base-300 bg-base-200 px-1.5 py-0.5 text-[10px] font-mono text-neutral-content/70 lg:inline-flex"
          aria-hidden="true"
        >
          ⌘K
        </kbd>
      )}

      {searchQuery && (
        <button
          type="button"
          onClick={clearSearch}
          className="absolute right-3 top-1/2 z-10 -translate-y-1/2 text-neutral-content transition-colors hover:text-base-content"
          aria-label="Clear search"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <AnimatePresence>
        {searchOpen && searchResults.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.12 }}
            className="absolute left-0 top-full z-50 mt-1 w-full overflow-hidden rounded-box border border-base-300 bg-base-100 shadow-xl"
          >
            <div className="max-h-80 overflow-y-auto p-1.5">
              {searchResults.map((result, index) => {
                const substance = result.substance
                const isActive = index === activeIndex
                const matchedAlias =
                  result.matchField !== 'name' &&
                  result.matchField !== 'class' &&
                  result.matchField !== 'category' &&
                  result.matchField !== 'description'
                    ? result.matchField
                    : null

                return (
                  <button
                    key={substance.id}
                    type="button"
                    onClick={() => navigateToSubstance(substance.id)}
                    onMouseEnter={() => setActiveIndex(index)}
                    className={cn(
                      'flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-left text-sm transition-colors min-h-[44px]',
                      isActive
                        ? 'bg-accent text-accent-content'
                        : 'hover:bg-base-200',
                    )}
                  >
                    <span
                      className={cn(
                        'h-2 w-2 shrink-0 rounded-full',
                        CATEGORY_DOTS[substance.categories[0]] || 'bg-zinc-500',
                      )}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate">
                        {result.matchField === 'name'
                          ? highlightMatch(substance.name, searchQuery)
                          : substance.name}
                      </div>
                      <div className="truncate text-[10px] text-neutral-content">
                        {substance.class}
                      </div>
                    </div>
                    {matchedAlias && (
                      <span className="badge badge-ghost badge-xs max-w-[96px] shrink-0 truncate">
                        {matchedAlias}
                      </span>
                    )}
                    <span className="badge badge-outline badge-xs hidden shrink-0 sm:inline-flex">
                      {substance.categories[0]}
                    </span>
                  </button>
                )
              })}
            </div>
            <div className="flex items-center justify-between border-t border-base-300 px-3 py-2 text-[10px] text-neutral-content">
              <span>
                {searchResults.length} result
                {searchResults.length === 1 ? '' : 's'}
              </span>
              <span className="hidden sm:inline">
                <kbd className="rounded border border-base-300 bg-base-200 px-1 py-0.5 font-mono text-[9px]">
                  ↑↓
                </kbd>{' '}
                navigate{' '}
                <kbd className="rounded border border-base-300 bg-base-200 px-1 py-0.5 font-mono text-[9px]">
                  ↵
                </kbd>{' '}
                open
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
