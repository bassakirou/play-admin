import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Music, Library, Video, UserPlus, ChevronDown } from "lucide-react";

export function QuickCreateMenu() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full" ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between gap-2 rounded-xl bg-primary px-3 py-2.5 text-xs font-semibold text-primary-foreground shadow-md hover:bg-primary/90 transition-all active:scale-[0.98]"
      >
        <div className="flex items-center gap-2">
          <Plus className="h-4 w-4 stroke-[3]" />
          <span>Création Rapide</span>
        </div>
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-full rounded-xl border bg-popover p-1.5 text-popover-foreground shadow-xl z-50 animate-in fade-in slide-in-from-top-1">
          <button
            onClick={() => {
              setOpen(false);
              navigate("/songs?new=1");
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Music className="h-4 w-4 text-emerald-500" />
            <span>Nouveau Single</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/albums?new=1");
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Library className="h-4 w-4 text-indigo-500" />
            <span>Nouvel Album</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/videos?new=1");
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
          >
            <Video className="h-4 w-4 text-rose-500" />
            <span>Nouvelle Vidéo</span>
          </button>
          <button
            onClick={() => {
              setOpen(false);
              navigate("/artists?new=1");
            }}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
          >
            <UserPlus className="h-4 w-4 text-amber-500" />
            <span>Créer un Artiste</span>
          </button>
        </div>
      )}
    </div>
  );
}
