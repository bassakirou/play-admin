import { useState, useEffect } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { ThemeToggle } from "../ThemeToggle";
import { Button } from "../ui/button";
import {
  Library,
  Music,
  Video,
  Users,
  User,
  Shield,
  LayoutDashboard,
  Tag,
  BellRing,
  X,
  Download,
  PanelLeft,
  Sparkles,
  Activity,
  BookHeadphones,
} from "lucide-react";
import { useAuth } from "../../auth/AuthContext";
import { cn } from "../../lib/utils";
import { canAccess, RBACResource } from "../../auth/rbac";
import { UserMenuPopover } from "./UserMenuPopover";
import { QuickCreateMenu } from "./QuickCreateMenu";
import { SidebarAccordion } from "@pyramidplay/ui";

function useAdminTheme() {
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains("dark")
  );

  useEffect(() => {
    const updateTheme = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    updateTheme();

    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });

    return () => observer.disconnect();
  }, []);

  return isDark;
}

type NavItem = {
  to: string;
  label: string;
  icon: any;
  resource: string | null;
};

type NavGroup = {
  title: string;
  icon?: any;
  resource: string | null;
  items: {
    to: string;
    label: string;
    icon?: any;
  }[];
};

type NavSection = {
  title?: string;
  items: (NavItem | NavGroup)[];
};

const navSections: NavSection[] = [
  {
    title: "Vue d'ensemble",
    items: [
      { to: "/", label: "Tableau de bord", icon: LayoutDashboard, resource: null },
    ],
  },
  {
    title: "Médias & Contenus",
    items: [
      { to: "/songs", label: "Singles", icon: Music, resource: "song" },
      { to: "/albums", label: "Albums", icon: Library, resource: "album" },
      { to: "/audiobooks", label: "Livres Audio", icon: BookHeadphones, resource: "audiobook" },
      { to: "/videos", label: "Vidéos", icon: Video, resource: "video" },
      { to: "/genres", label: "Genres", icon: Tag, resource: "genre" },
      {
        title: "Artistes & Groupes",
        icon: Users,
        resource: "artist",
        items: [
          { to: "/artists", label: "Artistes Solos", icon: User },
          { to: "/artist-groups", label: "Groupes d'Artistes", icon: Users },
        ],
      },
    ],
  },
  {
    title: "Administration",
    items: [
      { to: "/users", label: "Utilisateurs", icon: Users, resource: "user" },
      { to: "/roles", label: "Rôles & Droits", icon: Shield, resource: "role" },
      { to: "/maintenance", label: "Maintenance", icon: BellRing, resource: null },
      { to: "/migration", label: "Migration & Backup", icon: Download, resource: null },
      { to: "/changelog", label: "Mises à jour", icon: Activity, resource: null },
    ],
  },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, permissions } = useAuth();
  const location = useLocation();
  const isDark = useAdminTheme();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const logoSrc = isDark
    ? "/assets/pyramid-play-white.svg"
    : "/assets/pyramid-play.svg";

  const hasAnyPermission = (resource: string | null) => {
    if (!resource) return true;
    const roleName =
      typeof user?.role === "string" ? user?.role : user?.role?.name;
    return ["create", "read", "update", "delete", "manage"].some((action) =>
      canAccess(roleName, permissions, action as any, resource as RBACResource),
    );
  };

  // Determine page title for breadcrumb
  const getCurrentTitle = () => {
    const p = location.pathname;
    if (p === "/") return "Tableau de bord";
    if (p.startsWith("/songs")) return "Singles & Morceaux";
    if (p.startsWith("/albums")) return "Albums";
    if (p.startsWith("/audiobooks")) return "Livres Audio";
    if (p.startsWith("/videos")) return "Vidéos";
    if (p.startsWith("/genres")) return "Genres";
    if (p.startsWith("/artist-groups")) return "Groupes d'Artistes";
    if (p.startsWith("/artists")) return "Artistes Solos";
    if (p.startsWith("/users")) return "Gestion des Utilisateurs";
    if (p.startsWith("/roles")) return "Rôles & Droits d'accès";
    if (p.startsWith("/maintenance")) return "Notifications Maintenance";
    if (p.startsWith("/migration")) return "Migration & Backup";
    if (p.startsWith("/changelog")) return "Mises à jour (Changelog)";
    if (p.startsWith("/media-specifications")) return "Guide & Spécifications Médias";
    return "Administration";
  };

  const renderNavEntry = (entry: NavItem | NavGroup, isMobile = false) => {
    if ("items" in entry) {
      // It's a NavGroup (Accordion)
      return (
        <SidebarAccordion
          key={entry.title}
          title={entry.title}
          icon={entry.icon}
          items={entry.items}
          collapsed={!isMobile && sidebarCollapsed}
          pathname={location.pathname}
          renderLink={({ item, children }) => (
            <NavLink
              to={item.to}
              onClick={() => isMobile && setIsMobileMenuOpen(false)}
              className="block"
            >
              {children}
            </NavLink>
          )}
        />
      );
    }

    // Single NavItem
    const { to, label, icon: Icon } = entry;
    return (
      <NavLink
        key={to}
        to={to}
        end={to === "/"}
        onClick={() => isMobile && setIsMobileMenuOpen(false)}
        className={({ isActive }) =>
          cn(
            "flex items-center gap-3 rounded-xl px-3 py-2 text-xs font-medium transition-all group relative",
            isActive
              ? "bg-primary text-primary-foreground shadow-sm font-semibold"
              : "text-muted-foreground hover:bg-accent hover:text-foreground",
            !isMobile && sidebarCollapsed && "justify-center px-2"
          )
        }
      >
        <Icon className="h-4 w-4 shrink-0 transition-transform group-hover:scale-110" />
        {(!sidebarCollapsed || isMobile) && <span>{label}</span>}
      </NavLink>
    );
  };

  return (
    <div className="min-h-screen bg-background flex text-foreground antialiased selection:bg-primary selection:text-primary-foreground">
      {/* Desktop Sidebar (New York Shadcn v4 style) */}
      <aside
        className={cn(
          "hidden md:flex flex-col border-r bg-card/60 backdrop-blur-xl transition-all duration-300 ease-in-out shrink-0 sticky top-0 h-screen z-30",
          sidebarCollapsed ? "w-[70px]" : "w-[260px]"
        )}
      >
        {/* Brand Header */}
        <div className="flex h-16 items-center justify-center px-4 border-b">
          {!sidebarCollapsed ? (
            <img
              src={logoSrc}
              alt="PyramidPlay Logo"
              className="h-8 w-auto block transition-all"
            />
          ) : (
            <img
              src="/assets/play-icone.png"
              alt="PyramidPlay Icon"
              className="h-8 w-8 mx-auto object-contain cursor-pointer"
              onClick={() => setSidebarCollapsed(false)}
            />
          )}
        </div>

        {/* Quick Create Action Button */}
        {!sidebarCollapsed && (
          <div className="p-3 border-b bg-muted/20">
            <QuickCreateMenu />
          </div>
        )}

        {/* Nav Sections */}
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-4">
          {navSections.map((section, idx) => {
            const filteredEntries = section.items.filter((entry) =>
              hasAnyPermission(entry.resource)
            );
            if (filteredEntries.length === 0) return null;

            return (
              <div key={idx} className="space-y-1">
                {!sidebarCollapsed && section.title && (
                  <h4 className="px-2.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">
                    {section.title}
                  </h4>
                )}
                {filteredEntries.map((entry) => renderNavEntry(entry, false))}
              </div>
            );
          })}
        </div>

        {/* Sidebar Footer User Card */}
        {!sidebarCollapsed ? (
          <div className="p-3 border-t bg-muted/10">
            <UserMenuPopover />
          </div>
        ) : (
          <div className="p-2 border-t flex justify-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(false)}
              className="h-9 w-9 rounded-full bg-primary/10 text-primary"
            >
              <Sparkles className="h-4 w-4" />
            </Button>
          </div>
        )}
      </aside>

      {/* Mobile Drawer */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm animate-in fade-in"
            onClick={() => setIsMobileMenuOpen(false)}
          />
          <aside className="relative w-[280px] h-full border-r bg-card p-4 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left">
            <div>
              <div className="flex items-center justify-between pb-4 border-b mb-4">
                <img
                  src={logoSrc}
                  alt="PyramidPlay Logo"
                  className="h-7 w-auto block transition-all"
                />
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <div className="mb-4">
                <QuickCreateMenu />
              </div>

              <div className="space-y-4">
                {navSections.map((section, idx) => {
                  const filteredEntries = section.items.filter((entry) =>
                    hasAnyPermission(entry.resource)
                  );
                  if (filteredEntries.length === 0) return null;

                  return (
                    <div key={idx} className="space-y-1">
                      {section.title && (
                        <h4 className="px-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {section.title}
                        </h4>
                      )}
                      {filteredEntries.map((entry) => renderNavEntry(entry, true))}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="pt-4 border-t">
              <UserMenuPopover />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar Header */}
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-4 border-b bg-background/80 backdrop-blur-md px-6">
          <div className="flex items-center gap-3">
            {/* Sidebar toggle button (Shadcn SidebarTrigger) */}
            <Button
              variant="outline"
              size="icon"
              onClick={() => {
                if (window.innerWidth < 768) {
                  setIsMobileMenuOpen(true);
                } else {
                  setSidebarCollapsed(!sidebarCollapsed);
                }
              }}
              className="h-9 w-9 rounded-xl border-border/60 hover:bg-accent"
              title="Toggle sidebar"
            >
              <PanelLeft className="h-4 w-4 text-muted-foreground" />
            </Button>

            <div className="h-4 w-px bg-border/60" />

            {/* Breadcrumb Title */}
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">Administration</span>
              <span className="text-xs text-muted-foreground">/</span>
              <h1 className="text-sm font-semibold tracking-tight">{getCurrentTitle()}</h1>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <ThemeToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 md:p-8 admin-main-bg overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
}
