'use client'

import { Suspense, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { HomeContent } from '@/components/home/home-content'
import { PullToRefresh } from '@/components/ui/PullToRefresh'

function HomeLoading() {
  return (
    <div className="min-h-screen bg-base-100 flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        <p className="text-sm text-neutral-content">Loading...</p>
      </div>
    </div>
  )
}

export default function Home() {
  const router = useRouter()

  const handleRefresh = useCallback(async () => {
    router.refresh()
  }, [router])

  return (
    <Suspense fallback={<HomeLoading />}>
      <PullToRefresh onRefresh={handleRefresh} threshold={60}>
        <HomeContent />
      </PullToRefresh>
    </Suspense>
  )
}
