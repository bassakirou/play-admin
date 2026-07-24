import { useMemo, useState, useRef, useEffect } from 'react'
import { cn } from '../../lib/utils'
import { ChevronDown, X, Check, Search } from 'lucide-react'

type Option = {
  value: string
  label: string
}

type Props = {
  options: Option[]
  value: string[]
  onChange: (value: string[]) => void
  placeholder?: string
  className?: string
  multiple?: boolean
}

export function MultiSelect({
  options,
  value = [],
  onChange,
  placeholder = 'Sélectionner...',
  className,
  multiple = true,
}: Props) {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOptions = useMemo(() => {
    return options.filter((o) => value.includes(o.value))
  }, [options, value])

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return options
    return options.filter((o) => o.label.toLowerCase().includes(q))
  }, [options, query])

  const toggleOption = (val: string, e?: React.MouseEvent) => {
    e?.stopPropagation()
    if (!multiple) {
      onChange(value.includes(val) ? [] : [val])
      setOpen(false)
      return
    }
    const set = new Set(value)
    if (set.has(val)) set.delete(val)
    else set.add(val)
    onChange(Array.from(set))
  }

  const removeOption = (val: string, e: React.MouseEvent) => {
    e.stopPropagation()
    onChange(value.filter((v) => v !== val))
  }

  return (
    <div ref={containerRef} className={cn('relative w-full text-sm', className)}>
      {/* Select Trigger Field */}
      <div
        onClick={() => setOpen((prev) => !prev)}
        className={cn(
          'min-h-[40px] w-full rounded-md border border-input bg-background px-3 py-1.5 shadow-sm transition-colors',
          'flex items-center justify-between gap-2 cursor-pointer hover:bg-accent/50 focus-within:ring-2 focus-within:ring-ring',
          open && 'ring-2 ring-primary border-primary'
        )}
      >
        <div className="flex flex-wrap items-center gap-1.5 flex-1 min-w-0">
          {selectedOptions.length > 0 ? (
            selectedOptions.map((opt) => (
              <span
                key={opt.value}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-primary/15 text-primary border border-primary/20"
              >
                <span className="truncate max-w-[140px]">{opt.label}</span>
                <button
                  type="button"
                  onClick={(e) => removeOption(opt.value, e)}
                  className="hover:bg-primary/30 rounded p-0.5 transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))
          ) : (
            <span className="text-muted-foreground select-none">{placeholder}</span>
          )}
        </div>
        <ChevronDown className={cn('h-4 w-4 shrink-0 opacity-50 transition-transform duration-200', open && 'rotate-180')} />
      </div>

      {/* Floating Select2 Popover */}
      {open && (
        <div className="absolute left-0 right-0 top-full mt-1.5 z-50 rounded-md border bg-popover text-popover-foreground shadow-xl animate-in fade-in-80 zoom-in-95">
          {/* Search Bar inside popover */}
          <div className="flex items-center gap-2 border-b px-3 py-2">
            <Search className="h-4 w-4 shrink-0 opacity-50" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Rechercher..."
              className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              autoFocus
              onClick={(e) => e.stopPropagation()}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-52 overflow-y-auto p-1 space-y-0.5">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = value.includes(opt.value)
                return (
                  <div
                    key={opt.value}
                    onClick={(e) => toggleOption(opt.value, e)}
                    className={cn(
                      'flex items-center justify-between px-3 py-2 rounded-sm text-sm cursor-pointer transition-colors select-none',
                      isSelected
                        ? 'bg-primary/10 text-primary font-medium'
                        : 'hover:bg-accent hover:text-accent-foreground'
                    )}
                  >
                    <span className="truncate">{opt.label}</span>
                    {isSelected && <Check className="h-4 w-4 shrink-0 text-primary" />}
                  </div>
                )
              })
            ) : (
              <div className="py-4 text-center text-xs text-muted-foreground select-none">
                Aucun résultat trouvé
              </div>
            )}
          </div>

          {/* Selection counter & Clear action */}
          {multiple && value.length > 0 && (
            <div className="flex items-center justify-between border-t px-3 py-1.5 text-xs text-muted-foreground bg-muted/30">
              <span>{value.length} sélectionné(s)</span>
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onChange([])
                }}
                className="text-destructive hover:underline font-medium"
              >
                Tout effacer
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
