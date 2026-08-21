import { useState, useRef, useEffect, useMemo } from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown, X, Check, Search, Plus, UserCheck } from 'lucide-react';

export type CreatableOption = {
  value: string;
  label: string;
  sublabel?: string;
  isUser?: boolean;
};

interface CreatableComboboxProps {
  options: CreatableOption[];
  value?: string;
  onChange: (value: string, selectedOption?: CreatableOption) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  disabled?: boolean;
  className?: string;
}

export function CreatableCombobox({
  options,
  value = '',
  onChange,
  placeholder = 'Sélectionner ou saisir...',
  searchPlaceholder = 'Rechercher ou ajouter...',
  disabled = false,
  className,
}: CreatableComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const selectedOption = useMemo(() => {
    return options.find(
      (o) => o.value === value || o.label.toLowerCase() === value.toLowerCase(),
    );
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) =>
        o.label.toLowerCase().includes(q) ||
        (o.sublabel && o.sublabel.toLowerCase().includes(q)),
    );
  }, [options, query]);

  const hasExactMatch = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return false;
    return options.some((o) => o.label.toLowerCase() === q);
  }, [options, query]);

  const handleSelect = (opt: CreatableOption) => {
    onChange(opt.label, opt);
    setQuery('');
    setOpen(false);
  };

  const handleCreateNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const newOpt: CreatableOption = {
      value: trimmed,
      label: trimmed,
    };
    onChange(trimmed, newOpt);
    setQuery('');
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange('');
    setQuery('');
  };

  return (
    <div ref={containerRef} className={cn('relative w-full', className)}>
      {/* Input Trigger */}
      <div
        onClick={() => {
          if (!disabled) {
            setOpen(!open);
            if (!open) {
              setTimeout(() => inputRef.current?.focus(), 50);
            }
          }
        }}
        className={cn(
          'flex min-h-[2.5rem] w-full items-center justify-between rounded-xl border border-input bg-background px-3 py-2 text-sm shadow-sm transition-all cursor-pointer',
          open && 'ring-2 ring-primary border-primary',
          disabled && 'opacity-50 cursor-not-allowed bg-muted/50',
        )}
      >
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {value ? (
            <div className="flex items-center gap-2 truncate">
              {selectedOption?.isUser && (
                <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
              )}
              <span className="font-medium text-foreground truncate">
                {selectedOption ? selectedOption.label : value}
              </span>
              {selectedOption?.sublabel && (
                <span className="text-xs text-muted-foreground truncate">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>
          ) : (
            <span className="text-muted-foreground truncate">{placeholder}</span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {value && !disabled && (
            <button
              type="button"
              onClick={handleClear}
              className="p-0.5 hover:bg-muted rounded-full text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <ChevronDown
            className={cn(
              'w-4 h-4 text-muted-foreground transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </div>
      </div>

      {/* Dropdown Menu */}
      {open && (
        <div className="absolute z-50 mt-1.5 w-full rounded-xl border bg-popover text-popover-foreground shadow-xl animate-in fade-in-0 zoom-in-95 overflow-hidden">
          {/* Search Box */}
          <div className="p-2 border-b bg-muted/30 flex items-center gap-2">
            <Search className="w-4 h-4 text-muted-foreground shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  if (filteredOptions.length > 0) {
                    handleSelect(filteredOptions[0]);
                  } else if (query.trim()) {
                    handleCreateNew();
                  }
                }
              }}
              placeholder={searchPlaceholder}
              className="w-full bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Options List */}
          <div className="max-h-56 overflow-y-auto p-1.5 space-y-0.5">
            {/* Create on the fly option */}
            {query.trim() && !hasExactMatch && (
              <button
                type="button"
                onClick={handleCreateNew}
                className="w-full flex items-center gap-2 px-3 py-2 text-xs font-semibold rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors text-left"
              >
                <Plus className="w-3.5 h-3.5 shrink-0" />
                <span>Ajouter "{query.trim()}" à la volée</span>
              </button>
            )}

            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected =
                  value === opt.value ||
                  value.toLowerCase() === opt.label.toLowerCase();

                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => handleSelect(opt)}
                    className={cn(
                      'w-full flex items-center justify-between px-3 py-2 text-xs rounded-lg transition-colors text-left group',
                      isSelected
                        ? 'bg-accent text-accent-foreground font-semibold'
                        : 'hover:bg-muted/70 text-foreground',
                    )}
                  >
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      {opt.isUser && (
                        <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[11px] text-muted-foreground truncate">
                          • {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-2" />
                    )}
                  </button>
                );
              })
            ) : (
              !query.trim() && (
                <div className="py-4 text-center text-xs text-muted-foreground">
                  Aucun auteur trouvé. Saisissez un nom ci-dessus.
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
