import { useState, useRef, useEffect } from "react";
import { useAuth } from "../../auth/AuthContext";
import { useNavigate } from "react-router-dom";
import { LogOut, User, Settings, Bell, ChevronsUpDown, ShieldCheck } from "lucide-react";

export function UserMenuPopover() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const email = user?.email || "admin@pyramidplay.cm";
  const name = user?.name || email.split("@")[0];
  const roleName = typeof user?.role === "string" ? user?.role : user?.role?.name || "ADMIN";

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <div className="relative w-full" ref={menuRef}>
      {/* Popover Dropdown */}
      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-64 rounded-xl border bg-popover p-2 text-popover-foreground shadow-2xl z-50 animate-in fade-in slide-in-from-bottom-2">
          {/* User Details Header */}
          <div className="flex items-center gap-3 p-2 rounded-lg bg-muted/50 border mb-1">
            <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-primary-foreground font-semibold text-xs shadow">
              {initials}
            </div>
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-semibold truncate leading-none mb-1">
                {name}
              </span>
              <span className="text-xs text-muted-foreground truncate leading-none mb-1">
                {email}
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-primary bg-primary/10 px-1.5 py-0.5 rounded w-fit">
                <ShieldCheck className="h-2.5 w-2.5" />
                {roleName}
              </span>
            </div>
          </div>

          <div className="my-1 border-t" />

          {/* Menu Actions */}
          <div className="space-y-0.5">
            <button
              onClick={() => {
                setOpen(false);
                navigate("/users");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
            >
              <User className="h-4 w-4 text-muted-foreground" />
              <span>Mon Compte</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/roles");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              <span>Paramètres & Droits</span>
            </button>
            <button
              onClick={() => {
                setOpen(false);
                navigate("/maintenance");
              }}
              className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium hover:bg-accent transition-colors"
            >
              <Bell className="h-4 w-4 text-muted-foreground" />
              <span>Notifications & Maintenance</span>
            </button>
          </div>

          <div className="my-1 border-t" />

          <button
            onClick={onLogout}
            className="flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10 transition-colors"
          >
            <LogOut className="h-4 w-4" />
            <span>Se déconnecter</span>
          </button>
        </div>
      )}

      {/* User Card Button in Sidebar */}
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between rounded-xl p-2 text-left hover:bg-accent/80 transition-colors border border-border/50 bg-background/50"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-primary-foreground font-bold text-xs shrink-0 shadow-sm">
            {initials}
          </div>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-semibold truncate leading-tight">
              {name}
            </span>
            <span className="text-[11px] text-muted-foreground truncate leading-tight">
              {email}
            </span>
          </div>
        </div>
        <ChevronsUpDown className="h-4 w-4 text-muted-foreground shrink-0 ml-1" />
      </button>
    </div>
  );
}
