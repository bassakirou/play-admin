import React, { useEffect } from 'react'
import { cn } from '../../lib/utils'
import { X } from 'lucide-react'

type DialogProps = {
  open: boolean
  onOpenChange: (v: boolean) => void
  title?: string
  children: React.ReactNode
  footer?: React.ReactNode
  className?: string
}

export function Dialog({ open, onOpenChange, title, children, footer, className }: DialogProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) {
        onOpenChange(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onOpenChange])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm p-4 sm:p-6 md:p-10 flex items-start justify-center">
      {/* Backdrop overlay click handler */}
      <div className="fixed inset-0 -z-10" onClick={() => onOpenChange(false)} />

      {/* Modal Card Container */}
      <div
        className={cn(
          'relative z-10 w-full max-w-2xl my-auto rounded-xl border bg-card text-card-foreground shadow-2xl overflow-hidden',
          className
        )}
      >
        {/* Header */}
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b bg-card">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <button
              type="button"
              onClick={() => onOpenChange(false)}
              className="rounded-full p-1 text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6">
          {children}
        </div>

        {/* Footer (if provided) */}
        {footer && (
          <div className="flex items-center justify-end gap-2 px-6 py-4 border-t bg-card">
            {footer}
          </div>
        )}
      </div>
    </div>
  )
}
