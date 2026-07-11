'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useCallback, useRef, useState, type ReactNode } from 'react'
import { cn } from '@/lib/utils'

interface BottomSheetProps {
  open: boolean
  onClose: () => void
  children: ReactNode
  title?: string
  description?: string
  maxHeight?: string
  showDragHandle?: boolean
  showCloseButton?: boolean
  className?: string
}

export function BottomSheet({
  open,
  onClose,
  children,
  title,
  description,
  maxHeight = '85dvh',
  showDragHandle = true,
  showCloseButton = true,
  className,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef(0)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    startYRef.current = e.touches[0].clientY
    setIsDragging(true)
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    if (!isDragging) return
    const deltaY = e.touches[0].clientY - startYRef.current
    if (deltaY > 0) {
      setDragY(deltaY)
    }
  }, [isDragging])

  const handleTouchEnd = useCallback(() => {
    setIsDragging(false)
    if (dragY > 100) {
      handleClose()
    }
    setDragY(0)
  }, [dragY, handleClose])

  const sheetStyle: React.CSSProperties = {
    transform: `translateY(${dragY}px)`,
    transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.32, 0.72, 0, 1)',
  }

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={handleClose}
            aria-hidden="true"
          />

          {/* Bottom Sheet */}
          <motion.div
            ref={sheetRef}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className={cn('bottom-sheet', className)}
            style={sheetStyle}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Bottom sheet'}
          >
            {showDragHandle && (
              <div className="bottom-sheet-drag" aria-hidden="true" />
            )}

            {showCloseButton && (
              <button
                type="button"
                aria-label="Close"
                className="btn btn-circle btn-ghost absolute right-4 top-3 h-9 w-9 min-h-0 p-0 z-10"
                onClick={handleClose}
              >
                <X className="h-5 w-5" />
              </button>
            )}

            {(title || description) && (
              <div className="mb-4 px-4">
                {title && <h3 className="text-lg font-semibold leading-none">{title}</h3>}
                {description && <p className="text-sm text-neutral-content mt-1">{description}</p>}
              </div>
            )}

            <div className={cn('pt-2 pb-safe max-h-[85dvh] overflow-y-auto', maxHeight && `max-h-[${maxHeight}]`)}>
              {children}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}