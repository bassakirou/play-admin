import { NavLink, useNavigate } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import {
  Library,
  Music,
  Users,
  Shield,
  LayoutDashboard,
  LogOut,
  Tag,
  BellRing,
  Menu,
  X,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";
import { canAccess, RBACResource } from "../../auth/rbac";
import { useState } from "react";

const navItems = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, resource: null },
  { to: "/songs", label: "Songs", icon: Music, resource: "song" },
  { to: "/albums", label: "Albums", icon: Library, resource: "album" },
  { to: "/genres", label: "Genres", icon: Tag, resource: "genre" },
  { to: "/artists", label: "Artistes", icon: Users, resource: "artist" },
  { to: "/users", label: "Utilisateurs", icon: Users, resource: "user" },
  { to: "/roles", label: "Rôles & Droits", icon: Shield, resource: "role" },
  { to: "/maintenance", label: "Maintenance", icon: BellRing, resource: null },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, logout, permissions } = useAuth();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const onLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const hasAnyPermission = (resource: string | null) => {
    if (!resource) return true; // Dashboard is always accessible

    // Normalize role name: if user.role is a string, use it; otherwise access .name
    const roleName =
      typeof user?.role === "string" ? user?.role : user?.role?.name;

    // Check if user has ANY permission (create, read, update, delete, manage) on the resource
    return ["create", "read", "update", "delete", "manage"].some((action) =>
      canAccess(roleName, permissions, action as any, resource as RBACResource),
    );
  };

  const filteredNavItems = navItems.filter((item) =>
    hasAnyPermission(item.resource),
  );

  return (
    <div className="grid min-h-screen md:grid-cols-[220px_1fr]">
      {/* Desktop Sidebar */}
      <aside className="hidden border-r bg-card md:block">
        <div className="p-4 text-lg font-semibold">PyramidPlay</div>
        <nav className="px-2 space-y-1">
          {filteredNavItems.map(({ to, label, icon: Icon }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted",
                  isActive && "bg-muted",
                )
              }
              end={to === "/"}
            >
              <Icon className="h-4 w-4" /> <span>{label}</span>
            </NavLink>
          ))}
        </nav>
      </aside>

      {/* Mobile Sidebar (Drawer) */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/50"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-64 h-full border-r bg-card p-4 shadow-xl animate-in slide-in-from-left">
            <div className="flex items-center justify-between mb-6">
              <div className="text-lg font-semibold">PyramidPlay</div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <nav className="space-y-1">
              {filteredNavItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      "flex items-center gap-2 rounded-md px-3 py-2 text-sm hover:bg-muted",
                      isActive && "bg-muted",
                    )
                  }
                  end={to === "/"}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <Icon className="h-4 w-4" /> <span>{label}</span>
                </NavLink>
              ))}
            </nav>
          </aside>
        </div>
      )}

      <div className="flex flex-col min-w-0">
        <header className="flex h-14 items-center justify-between gap-2 border-b px-4 bg-background sticky top-0 z-10">
          <div className="flex items-center gap-2 md:hidden">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsMobileMenuOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="font-semibold">PyramidPlay</div>
          </div>

          <div className="flex items-center gap-2 ml-auto">
            <ThemeToggle />
            <div className="text-sm text-muted-foreground hidden sm:block">
              {user?.email}
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onLogout}
              aria-label="Se déconnecter"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </header>
        <main className="flex-1 overflow-x-hidden">{children}</main>
      </div>
    </div>
  );
}
