import { useSearchParams } from "react-router-dom";
import type { Metric, Overview } from "./monitoring-model";
import ResourceCapacity from "./ResourceCapacity";
import { cn } from "../../lib/utils";
import Graph, { ResourceHistory } from "./MonitoringGraph";
import { useState, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, AlertTriangle, Server, Wallet } from "lucide-react";
import api from "../../lib/api";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent,
} from "../ui/card";
import { Button } from "../ui/button";

const number = (value: Metric | undefined, unit = "") =>
  value == null || !Number.isFinite(value)
    ? "Indisponible"
    : `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${unit}`;
const usd = (value: Metric) =>
  value == null
    ? "Indisponible"
    : new Intl.NumberFormat("fr-FR", {
        style: "currency",
        currency: "USD",
      }).format(value);
const date = (value?: string | null) =>
  value ? new Date(value).toLocaleString("fr-FR") : "Indisponible";
const bytes = (value: Metric | undefined) =>
  value == null ? "Indisponible" : number(value / 1024 ** 2, " Mio");
function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-xl font-semibold tabular-nums tracking-tight">
        {value}
      </dd>
    </div>
  );
}
/** Mounted only within the administrator-only delivery page. */
export default function VideoMonitoringPanel({
  delivery,
}: {
  delivery?: ReactNode;
}) {
  const [params, setParams] = useSearchParams();
  const tabs = [
    { id: "server", label: "Serveur" },
    { id: "audience", label: "Audience" },
    { id: "cloudflare", label: "Cloudflare Stream" },
    { id: "alerts", label: "Alertes" },
    { id: "delivery", label: "Traitements vidéo" },
  ];
  const tab = tabs.some((t) => t.id === params.get("tab"))
    ? params.get("tab")!
    : "server";
  const changeTab = (id: string) => {
    const next = new URLSearchParams(params);
    next.set("tab", id);
    setParams(next, { replace: true });
  };
  const [alertFilter, setAlertFilter] = useState("active");
  const [range, setRange] = useState("1h");
  const [host, setHost] = useState("");
  const [acknowledging, setAcknowledging] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["video-observability", range, host],
    queryFn: async ({ signal }) =>
      (
        await api.get("/video-observability/overview", {
          params: { range, ...(host ? { host } : {}) },
          signal,
        })
      ).data as Overview,
    refetchInterval: 15_000,
  });
  const ack = async (id: string) => {
    setAcknowledging(id);
    setActionError("");
    try {
      await api.post(`/video-observability/alerts/${id}/ack`);
      await queryClient.invalidateQueries({ queryKey: ["monitoring-alerts"] });
      await queryClient.invalidateQueries({
        queryKey: ["video-observability"],
      });
    } catch {
      setActionError("Impossible d’acquitter cette alerte.");
    } finally {
      setAcknowledging(null);
    }
  };
  const data = query.data;
  const latest = data?.latest;
  const unread =
    data?.alerts.filter((a) => !a.resolvedAt && !a.acknowledgedAt) || [];
  const visibleAlerts =
    data?.alerts
      .filter(
        (a) =>
          alertFilter === "all" ||
          (alertFilter === "active" ? !a.resolvedAt : !!a.resolvedAt),
      )
      .sort(
        (a, b) =>
          Number(b.severity === "critical") - Number(a.severity === "critical"),
      ) || [];
  const criticalAlert = unread.some(a => a.severity === "critical");
  const stale =
    !latest || Date.now() - new Date(latest.sampledAt).getTime() > 45_000;
  const cf = data?.cloudflare;
  const health = (ok: boolean | null, ms: Metric) =>
    ok == null
      ? "Indisponible"
      : `${ok ? "Disponible" : "En échec"} · ${number(ms, " ms")}`;
  return (
    <section className="space-y-5" aria-label="Supervision vidéo">
      {unread.length > 0 && (
        <div
          role="status"
          className={cn("flex flex-wrap items-center justify-between gap-3 rounded-xl border p-5", criticalAlert ? "border-red-300 bg-red-50 dark:border-red-900 dark:bg-red-950/30" : "border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/30")}
        >
          <div className="flex items-start gap-3">
            <AlertTriangle className={cn("mt-0.5 h-5 w-5 shrink-0", criticalAlert ? "text-red-700 dark:text-red-300" : "text-amber-800 dark:text-amber-300")} />
            <div>
              <p className="text-sm font-semibold">
                {unread.length} alerte{unread.length > 1 ? "s" : ""} à traiter
              </p>
              <p className="mt-1 text-sm leading-relaxed">
                {unread.find((a) => a.severity === "critical")?.message ||
                  unread[0].message}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="rounded-xl"
            onClick={() => changeTab("alerts")}
          >
            Examiner les alertes
          </Button>
        </div>
      )}
      <nav
        aria-label="Sections de supervision"
        className="monitoring-tabs flex gap-1 overflow-x-auto border-b"
      >
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tab === t.id ? "page" : undefined}
            onClick={() => changeTab(t.id)}
            className={
              "min-h-11 shrink-0 rounded-t-lg border-b-2 px-4 py-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring " +
              (tab === t.id
                ? "border-primary bg-card font-semibold text-foreground"
                : "border-transparent text-muted-foreground hover:bg-card/70 hover:text-foreground")
            }
          >
            {t.label}
            {t.id === "alerts" && unread.length > 0 && (
              <span className="ml-2 rounded-full bg-destructive px-1.5 text-xs text-destructive-foreground">
                {unread.length}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
        <span>
          {query.isError
            ? "Connexion aux mesures interrompue"
            : query.isPending
              ? "Connexion aux mesures…"
              : stale
                ? "Relevé ancien ou absent"
                : "Collecte opérationnelle"}{" "}
          · {latest ? date(latest.sampledAt) : "En attente du premier relevé"}
        </span>
        <span>Actualisation toutes les 15 secondes</span>
      </div>
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Activity className="h-5 w-5" />
          {tabs.find((t) => t.id === tab)?.label}
        </h2>
        {tab !== "cloudflare" && tab !== "delivery" && (
          <div className="flex flex-wrap gap-3">
            <label className="text-sm">
              Période
              <select
                className="ml-2 rounded-md border bg-background p-2"
                value={range}
                onChange={(e) => setRange(e.target.value)}
              >
                <option value="1h">1 heure</option>
                <option value="24h">24 heures</option>
                <option value="7d">7 jours</option>
              </select>
            </label>
            {tab === "server" && (<label className="text-sm">
              Hôte
              <select
                className="ml-2 rounded-md border bg-background p-2"
                value={host}
                onChange={(e) => setHost(e.target.value)}
              >
                <option value="">Dernier hôte actif</option>
                {data?.hosts.map((h) => (
                  <option key={h.id} value={h.id}>
                    {h.id}
                  </option>
                ))}
              </select>
            </label>)}
          </div>
        )}
      </div>
      {query.isPending && <p role="status">Chargement des mesures…</p>}
      {(query.isError || actionError) && (
        <p role="alert" className="text-sm text-destructive">
          {actionError ||
            "Mesures indisponibles. Les données affichées peuvent être anciennes."}
        </p>
      )}
      {data && (
        <>
          {tab === "server" && (
            <Card className="rounded-2xl border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Server className="h-5 w-5" />
                  Ressources serveur
                </CardTitle>
                <CardDescription>
                  Hôte : {data.hostId || "Indisponible"} · Dernier relevé :{" "}
                  {date(latest?.sampledAt)}. Collecte et actualisation toutes
                  les 15 secondes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stale && (
                  <p
                    role="status"
                    className="flex items-center gap-2 text-sm text-amber-800 dark:text-amber-300"
                  >
                    <AlertTriangle className="h-4 w-4" />
                    Les relevés de cet hôte sont absents ou datent de plus de 45
                    secondes.
                  </p>
                )}
                <ResourceCapacity data={data} />
                <p className="text-sm">
                  PostgreSQL :{" "}
                  {latest
                    ? health(latest.databaseOk, latest.databaseMs)
                    : "Indisponible"}{" "}
                  · MinIO :{" "}
                  {latest
                    ? health(latest.minioOk, latest.minioMs)
                    : "Indisponible"}
                </p>
                {!!latest?.disks.length && (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                      <caption className="sr-only">Volumes du serveur</caption>
                      <thead>
                        <tr className="border-b">
                          <th className="p-2">Volume</th>
                          <th className="p-2">Total</th>
                          <th className="p-2">Disponible</th>
                          <th className="p-2">Utilisation</th>
                        </tr>
                      </thead>
                      <tbody>
                        {latest.disks.map((d) => (
                          <tr key={d.path} className="border-b">
                            <td className="p-2">{d.path}</td>
                            <td className="p-2">{bytes(d.totalBytes)}</td>
                            <td className="p-2">{bytes(d.availableBytes)}</td>
                            <td className="p-2">
                              {number(d.usedPercent, " %")}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <ResourceHistory data={data} />
              </CardContent>
            </Card>
          )}
          {tab === "audience" && (
            <Card className="rounded-2xl border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Audience et qualité de lecture
                </CardTitle>
                <CardDescription>
                  Sessions de lecture estimées, distinctes des personnes uniques
                  et des minutes facturées. Une présence expire après 75
                  secondes. Les cumuls concernent les sessions démarrées dans la
                  période sélectionnée, depuis leur démarrage. Les sessions
                  actives couvrent toutes les lectures en cours.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                  <Stat
                    label="Sessions actives estimées"
                    value={number(data.audience.activeSessions)}
                  />
                  <Stat
                    label="Démarrages"
                    value={number(data.audience.starts)}
                  />
                  <Stat
                    label="Lecture"
                    value={number(data.audience.playedSeconds / 60, " min")}
                  />
                  <Stat
                    label="Attente de lecture"
                    value={number(data.audience.bufferSeconds, " s")}
                  />
                  <Stat
                    label="Interruptions"
                    value={number(data.audience.stalls)}
                  />
                  <Stat label="Erreurs" value={number(data.audience.errors)} />
                  <Stat
                    label="Sessions avec erreur"
                    value={number(data.audience.errorSessions)}
                  />
                  <Stat
                    label="Démarrage moyen"
                    value={number(data.audience.startupMsAvg, " ms")}
                  />
                </dl>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <caption className="mb-2 text-left font-medium">
                      Vidéos les plus regardées
                    </caption>
                    <thead>
                      <tr className="border-b">
                        <th className="p-2">Vidéo</th>
                        <th className="p-2">Sessions</th>
                        <th className="p-2">Lecture</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.audience.topVideos.map((v) => (
                        <tr key={v.videoId} className="border-b">
                          <td className="p-2">{v.title}</td>
                          <td className="p-2">{number(v.sessions)}</td>
                          <td className="p-2">
                            {number(v.playedSeconds / 60, " min")}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {!data.audience.topVideos.length && (
                    <p className="py-3 text-sm text-muted-foreground">
                      Aucune session sur cette période.
                    </p>
                  )}
                </div>
                <p className="text-sm">
                  Résolution observée :{" "}
                  {data.audience.quality.length
                    ? data.audience.quality
                        .map(
                          (q) =>
                            `${q.height == null ? "Indisponible" : `${q.height}p`} : ${number(q.sessions)} session(s)`,
                        )
                        .join(" · ")
                    : "Indisponible"}
                </p>
              </CardContent>
            </Card>
          )}
          {tab === "server" && (
            <Card className="rounded-2xl border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Disponibilité depuis l’extérieur
                </CardTitle>
                <CardDescription>
                  La sonde doit fonctionner sur une autre machine. En cas de
                  coupure de l’API, ses relevés sont transmis au rétablissement.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {!data.probes.length ? (
                  <p className="text-sm text-muted-foreground">
                    Aucun relevé externe disponible. Installer la sonde pour
                    mesurer les coupures complètes.
                  </p>
                ) : (
                  data.probes.map((probe) => (
                    <p key={probe.probeId} className="text-sm">
                      {probe.probeId} :{" "}
                      {Date.now() - new Date(probe.observedAt).getTime() >
                      180_000
                        ? "Relevé ancien"
                        : probe.status === "up"
                          ? "Accessible"
                          : "En échec"}{" "}
                      · {date(probe.observedAt)} ·{" "}
                      {number(probe.latencyMs, " ms")}
                    </p>
                  ))
                )}
                {!!data.probeFailures.length && (
                  <details>
                    <summary className="cursor-pointer text-sm font-medium">
                      Derniers relevés en échec sur la période (100 maximum)
                    </summary>
                    <ul className="mt-2 space-y-1 text-sm">
                      {data.probeFailures.map((probe) => (
                        <li key={`${probe.probeId}:${probe.observedAt}`}>
                          {probe.probeId} · {date(probe.observedAt)}
                        </li>
                      ))}
                    </ul>
                  </details>
                )}
              </CardContent>
            </Card>
          )}
          {tab === "alerts" && (
            <Card className="rounded-2xl border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="text-base font-semibold tracking-tight">
                  Alertes
                </CardTitle>
                <CardDescription>
                  Acquitter confirme la prise en compte ; la résolution dépend
                  du retour à la normale.
                </CardDescription>
                <label className="mt-3 flex items-center gap-3 text-sm">
                  Afficher
                  <select
                    className="min-h-10 rounded-xl border bg-background px-3"
                    value={alertFilter}
                    onChange={(e) => setAlertFilter(e.target.value)}
                  >
                    <option value="active">Alertes en cours</option>
                    <option value="all">Toutes les alertes</option>
                    <option value="resolved">Alertes résolues</option>
                  </select>
                </label>
              </CardHeader>
              <CardContent>
                {!visibleAlerts.length ? (
                  <p className="text-sm text-muted-foreground">
                    Aucune alerte pour ce filtre.
                  </p>
                ) : (
                  <ul className="divide-y">
                    {visibleAlerts.map((alert) => (
                      <li
                        key={alert.id}
                        className="flex flex-wrap items-center justify-between gap-3 py-3"
                      >
                        <div>
                          <p className="font-medium">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            <span
                              className={
                                alert.resolvedAt
                                  ? "text-muted-foreground"
                                  : alert.severity === "critical"
                                    ? "font-semibold text-red-700 dark:text-red-300"
                                    : "font-semibold text-amber-800 dark:text-amber-300"
                              }
                            >
                              {alert.severity === "critical"
                                ? "Critique"
                                : "Avertissement"}
                            </span>{" "}
                            · Ouverte le {date(alert.openedAt)} · Dernier
                            constat : {date(alert.lastSeenAt)}
                          </p>
                          <p className="text-xs">
                            {alert.resolvedAt
                              ? `Résolue le ${date(alert.resolvedAt)}`
                              : "En cours"}
                            {alert.acknowledgedAt
                              ? ` · Acquittée le ${date(alert.acknowledgedAt)}`
                              : ""}
                          </p>
                        </div>
                        {!alert.acknowledgedAt && !alert.resolvedAt && (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={acknowledging !== null}
                            onClick={() => void ack(alert.id)}
                          >
                            Prendre en compte
                          </Button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          )}
          {cf && tab === "cloudflare" && (
            <Card className="rounded-2xl border bg-card shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Cloudflare Stream — estimation USD
                </CardTitle>
                <CardDescription>
                  Mois : {cf.month}. Données Cloudflare échantillonnées,
                  distinctes de la télémétrie du lecteur et de la facture.
                  Synchronisation au plus toutes les 15 minutes.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm">
                  {cf.state === "unconfigured"
                    ? "Compte Cloudflare non configuré : coûts et audience Cloudflare indisponibles."
                    : cf.state === "error"
                      ? "Synchronisation Cloudflare en échec."
                      : cf.state === "stale"
                        ? "Données Cloudflare anciennes."
                        : "Données Cloudflare disponibles."}{" "}
                  Dernière synchronisation : {date(cf.fetchedAt)}
                </p>
                {cf.error && (
                  <p className="text-sm text-destructive">{cf.error}</p>
                )}
                {cf.state !== "unconfigured" && (
                  <>
                    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                      <Stat
                        label="Minutes délivrées"
                        value={number(cf.deliveryMinutes)}
                      />
                      <Stat
                        label="Stockage utilisé"
                        value={number(cf.storageUsedMinutes, " min")}
                      />
                      <Stat
                        label="Capacité de stockage achetée"
                        value={number(cf.storageCapacityMinutes, " min")}
                      />
                      <Stat
                        label="Livraison estimée"
                        value={usd(cf.deliveryUsd)}
                      />
                      <Stat
                        label="Capacité de stockage estimée"
                        value={usd(cf.storageCapacityUsd)}
                      />
                      <Stat label="Total estimé" value={usd(cf.totalUsd)} />
                      <Stat
                        label="Projection livraison en fin de mois"
                        value={usd(cf.projectedDeliveryUsd)}
                      />
                      <Stat
                        label="Projection totale en fin de mois"
                        value={usd(cf.projectedTotalUsd)}
                      />
                      <Stat label="Budget mensuel" value={usd(cf.budgetUsd)} />
                    </dl>
                    <p className="text-xs text-muted-foreground">
                      Estimations selon les tarifs configurés. Le stockage est
                      évalué sur la capacité achetée. Les projections supposent
                      un rythme de livraison constant ; aucun arrêt automatique
                      n’est déclenché.
                    </p>
                    <Graph
                      title="Minutes délivrées par jour"
                      values={cf.daily.map((d) => d.minutes)}
                      times={cf.daily.map((d) => d.date)}
                      unit=" min"
                    />
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                        <caption className="mb-2 text-left font-medium">
                          Livraison par pays
                        </caption>
                        <thead>
                          <tr className="border-b">
                            <th className="p-2">Pays (code ISO)</th>
                            <th className="p-2">Minutes</th>
                          </tr>
                        </thead>
                        <tbody>
                          {cf.countries.map((c) => (
                            <tr className="border-b" key={c.code}>
                              <td className="p-2">{c.code}</td>
                              <td className="p-2">{number(c.minutes)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {!cf.countries.length && (
                        <p className="py-3 text-sm text-muted-foreground">
                          Répartition indisponible.
                        </p>
                      )}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          )}
        </>
      )}
      {tab === "delivery" && delivery}
    </section>
  );
}
