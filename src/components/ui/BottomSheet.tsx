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
  footer?: ReactNode
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
  footer,
}: BottomSheetProps) {
  const sheetRef = useRef<HTMLDivElement>(null)
  const dragHandleRef = useRef<HTMLDivElement>(null)
  const [dragY, setDragY] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const startYRef = useRef(0)

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    // Only start dragging if touch is on the drag handle
    const target = e.target as HTMLElement
    if (showDragHandle && dragHandleRef.current?.contains(target)) {
      startYRef.current = e.touches[0].clientY
      setIsDragging(true)
    }
  }, [showDragHandle])

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
            className={cn('bottom-sheet flex flex-col', className)}
            style={sheetStyle}
            role="dialog"
            aria-modal="true"
            aria-label={title || 'Bottom sheet'}
          >
            {showDragHandle && (
              <div
                ref={dragHandleRef}
                className="bottom-sheet-drag"
                aria-hidden="true"
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleTouchEnd}
                onTouchCancel={handleTouchEnd}
              />
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
              <div className="mb-4 px-4 flex-shrink-0">
                {title && <h3 className="text-lg font-semibold leading-none">{title}</h3>}
                {description && <p className="text-sm text-neutral-content mt-1">{description}</p>}
              </div>
            )}

            <div className={cn('pt-2 flex-1 overflow-y-auto', maxHeight && `max-h-[${maxHeight}]`)}>
              {children}
            </div>

            {footer && (
              <div className="px-4 pb-safe pt-2 border-t border-base-300 bg-base-100/95 backdrop-blur supports-[backdrop-filter]:bg-base-100/80 flex-shrink-0">
                {footer}
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}