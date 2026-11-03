import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bell, BellRing, CheckCheck, ExternalLink } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "../../auth/AuthContext";
import api from "../../lib/api";
import { Button } from "../ui/button";
import type { Overview } from "./monitoring-model";

type Alert = Overview["alerts"][number];
const stored = (key: string) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};
const save = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* In-memory notifications still work. */
  }
};
const identity = (alert: Alert) => `${alert.id}:${alert.openedAt}`;

/** One instance in the shell: alert polling continues when the metrics page is closed. */
export default function MonitoringAlertBell() {
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const role = typeof user?.role === "string" ? user.role : user?.role?.name;
  const allowed =
    !!token && !!user?.id && ["ADMIN", "SUPER_ADMIN"].includes(role || "");
  const preference = `pp-monitor-browser:${user?.id}`;
  const [enabled, setEnabled] = useState(() => stored(preference) === "true");
  const [permission, setPermission] = useState<
    NotificationPermission | "unavailable"
  >(
    typeof Notification === "undefined"
      ? "unavailable"
      : Notification.permission,
  );
  const [requesting, setRequesting] = useState(false);
  const details = useRef<HTMLDetailsElement>(null);
  const baseline = useRef<{
    userId?: string;
    seen: Set<string>;
    initialized: boolean;
  }>({ seen: new Set(), initialized: false });
  const query = useQuery({
    queryKey: ["monitoring-alerts", user?.id],
    enabled: allowed,
    queryFn: async ({ signal }) =>
      (await api.get("/video-observability/alerts", { signal })).data as {
        items: Alert[];
        activeCount: number;
      },
    refetchInterval: 15_000,
    refetchIntervalInBackground: true,
  });

  useEffect(() => {
    setEnabled(stored(preference) === "true");
  }, [preference]);
  useEffect(() => {
    const closeOutside = (event: PointerEvent) => {
      if (details.current && !details.current.contains(event.target as Node))
        details.current.open = false;
    };
    const update = () =>
      setPermission(
        typeof Notification === "undefined"
          ? "unavailable"
          : Notification.permission,
      );
    document.addEventListener("pointerdown", closeOutside);
    window.addEventListener("focus", update);
    return () => {
      document.removeEventListener("pointerdown", closeOutside);
      window.removeEventListener("focus", update);
    };
  }, []);

  useEffect(() => {
    if (!allowed || !query.data || !user?.id) return;
    const key = `pp-monitor-seen:${user.id}`;
    if (baseline.current.userId !== user.id) {
      let values: string[] = [];
      try {
        const value = JSON.parse(stored(key) || "null");
        if (Array.isArray(value))
          values = value.filter((v) => typeof v === "string");
      } catch {
        /* Initialize from the current list. */
      }
      baseline.current = {
        userId: user.id,
        seen: new Set(values),
        initialized: values.length > 0,
      };
    }
    const state = baseline.current;
    const incoming = query.data.items.filter(
      (alert) => !state.seen.has(identity(alert)),
    );
    const open = () => {
      if (details.current) details.current.open = false;
      navigate("/video-delivery?tab=alerts");
    };
    if (state.initialized && incoming.length) {
      const critical = incoming.find((alert) => alert.severity === "critical");
      const message =
        incoming.length === 1
          ? incoming[0].message
          : `${incoming.length} nouvelles alertes de supervision`;
      const notify = critical ? toast.error : toast.warning;
      notify(message, {
        id: identity(incoming[0]),
        duration: 10_000,
        action: { label: "Consulter", onClick: open },
      });
      if (
        enabled &&
        typeof Notification !== "undefined" &&
        Notification.permission === "granted"
      ) {
        try {
          const notification = new Notification(
            critical
              ? "PyramidPlay · Alerte critique"
              : "PyramidPlay · Supervision",
            { body: message, tag: identity(incoming[0]) },
          );
          notification.onclick = () => {
            window.focus();
            open();
            notification.close();
          };
        } catch {
          /* Browser notification support must not interrupt administration. */
        }
      }
    }
    for (const alert of query.data.items) state.seen.add(identity(alert));
    state.seen = new Set([...state.seen].slice(-300));
    state.initialized = true;
    save(key, JSON.stringify([...state.seen]));
  }, [allowed, query.data, user?.id, enabled, navigate]);

  const toggleBrowser = async () => {
    if (enabled) {
      setEnabled(false);
      save(preference, "false");
      return;
    }
    if (typeof Notification === "undefined") return;
    setRequesting(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result === "granted") {
        setEnabled(true);
        save(preference, "true");
        toast.success("Notifications du navigateur activées.");
      }
    } catch {
      toast.error("Le navigateur ne permet pas d’activer les notifications.");
    } finally {
      setRequesting(false);
    }
  };
  if (!allowed) return null;
  const count = query.data?.activeCount;
  return (
    <details
      ref={details}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && details.current) {
          details.current.open = false;
          details.current.querySelector("summary")?.focus();
        }
      }}
    >
      <summary role="button"
        className="relative flex h-9 w-9 cursor-pointer list-none items-center justify-center rounded-xl border border-border/60 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring [&::-webkit-details-marker]:hidden"
        aria-label={
          query.isError
            ? "Alertes de supervision indisponibles"
            : `Alertes de supervision${count == null ? "" : ` : ${count} à traiter`}`
        }
      >
        <Bell className="h-4 w-4" aria-hidden="true" />
        {count != null && count > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[11px] font-semibold text-destructive-foreground">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </summary>
      <div className="fixed inset-x-4 top-20 z-50 sm:absolute sm:inset-x-auto sm:right-0 sm:top-auto sm:mt-3 sm:w-[360px] overflow-hidden rounded-2xl border bg-popover text-popover-foreground shadow-lg">
        <div className="flex items-center justify-between gap-3 border-b p-4">
          <h2 className="font-semibold">Alertes de supervision</h2>
          <BellRing
            className="h-4 w-4 text-muted-foreground"
            aria-hidden="true"
          />
        </div>
        <div className="max-h-72 overflow-y-auto">
          {query.isPending && (
            <p className="p-4 text-sm text-muted-foreground" role="status">
              Chargement des alertes…
            </p>
          )}
          {query.isError && (
            <div className="p-4 text-sm" role="alert">
              <p>Impossible de vérifier les alertes.</p>
              <Button
                variant="link"
                className="h-auto p-0"
                onClick={() => void query.refetch()}
              >
                Réessayer
              </Button>
            </div>
          )}
          {query.data && !query.isError && !query.data.items.length && (
            <div className="flex gap-3 p-4">
              <CheckCheck className="mt-0.5 h-5 w-5 text-emerald-700 dark:text-emerald-300" />
              <p className="text-sm">Aucune alerte à traiter.</p>
            </div>
          )}
          {query.data?.items.slice().sort((a,b)=>Number(b.severity === "critical")-Number(a.severity === "critical")).slice(0,6).map((alert) => (
            <Link
              key={alert.id}
              to="/video-delivery?tab=alerts"
              onClick={() => {
                if (details.current) details.current.open = false;
              }}
              className="block border-b px-4 py-3 text-sm last:border-0 hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
            >
              <span
                className={
                  alert.severity === "critical"
                    ? "text-red-700 dark:text-red-300"
                    : "text-amber-800 dark:text-amber-300"
                }
              >
                {alert.severity === "critical" ? "Critique" : "Avertissement"}
              </span>
              <p className="mt-1 leading-relaxed">{alert.message}</p>
              <time className="mt-1 block text-xs text-muted-foreground">
                {new Date(alert.openedAt).toLocaleString("fr-FR")}
              </time>
            </Link>
          ))}
        </div>
        <div className="space-y-3 border-t bg-muted/30 p-4">
          <Link
            to="/video-delivery?tab=alerts"
            onClick={() => {
              if (details.current) details.current.open = false;
            }}
            className="flex items-center justify-between text-sm font-medium hover:underline"
          >
            Consulter toutes les alertes
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
          <Button
            variant="outline"
            className="h-auto min-h-9 w-full whitespace-normal text-xs"
            onClick={() => void toggleBrowser()}
            disabled={
              requesting ||
              permission === "unavailable" ||
              (permission === "denied" && !enabled)
            }
          >
            {requesting
              ? "Autorisation en cours…"
              : enabled && permission === "granted"
                ? "Désactiver les notifications du navigateur"
                : "Activer les notifications du navigateur"}
          </Button>
          <p className="text-xs leading-relaxed text-muted-foreground">
            {permission === "unavailable"
              ? "Notifications système indisponibles dans ce navigateur."
              : permission === "denied"
                ? "Notifications bloquées. Vous pouvez les autoriser dans les paramètres du site."
                : "Notifications système lorsque play-admin reste ouvert. Les alertes sont conservées même en votre absence."}
          </p>
        </div>
      </div>
    </details>
  );
}
