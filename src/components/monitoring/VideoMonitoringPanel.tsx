import { useState } from "react";
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

type Metric = number | null;
type History = {
  at: string;
  cpuPercent: Metric;
  memoryPercent: Metric;
  diskPercent: Metric;
  networkTxBps: Metric;
  activeSessions: Metric;
};
type Probe = {
  probeId: string;
  observedAt: string;
  status: string;
  latencyMs: Metric;
};
type Overview = {
  hosts: { id: string; lastSeenAt: string }[];
  hostId: string | null;
  latest: null | {
    sampledAt: string;
    cpuPercent: Metric;
    memoryPercent: Metric;
    diskPercent: Metric;
    nodeRssBytes: Metric;
    networkRxBps: Metric;
    networkTxBps: Metric;
    networkCapacityMbps: Metric;
    databaseOk: boolean | null;
    minioOk: boolean | null;
    databaseMs: Metric;
    minioMs: Metric;
    disks: {
      path: string;
      totalBytes: number;
      availableBytes: number;
      usedPercent: number;
    }[];
  };
  history: History[];
  probes: Probe[];
  probeFailures: Probe[];
  audience: {
    activeSessions: number;
    starts: number;
    playedSeconds: number;
    bufferSeconds: number;
    stalls: number;
    errors: number;
    errorSessions: number;
    startupMsAvg: Metric;
    topVideos: {
      videoId: string;
      title: string;
      sessions: number;
      playedSeconds: number;
    }[];
    quality: { height: Metric; sessions: number }[];
  };
  alerts: {
    id: string;
    key: string;
    severity: string;
    message: string;
    openedAt: string;
    lastSeenAt: string;
    acknowledgedAt: string | null;
    resolvedAt: string | null;
  }[];
  cloudflare: {
    state: "unconfigured" | "ready" | "stale" | "error";
    month: string;
    fetchedAt: string | null;
    deliveryMinutes: Metric;
    storageUsedMinutes: Metric;
    storageCapacityMinutes: Metric;
    deliveryUsd: Metric;
    storageCapacityUsd: Metric;
    totalUsd: Metric;
    projectedDeliveryUsd: Metric;
    projectedTotalUsd: Metric;
    budgetUsd: Metric;
    countries: { code: string; minutes: number }[];
    daily: { date: string; minutes: number }[];
    error: string | null;
    estimated: true;
  };
};
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
    <div className="rounded-lg border p-3">
      <dt className="text-sm text-muted-foreground">{label}</dt>
      <dd className="mt-1 text-xl font-semibold">{value}</dd>
    </div>
  );
}
function Graph({
  title,
  values,
  times,
  unit = "",
}: {
  title: string;
  values: Metric[];
  times: string[];
  unit?: string;
}) {
  const present = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  const max = Math.max(1, ...present);
  const paths: string[] = [];
  let segment = "";
  values.forEach((value, i) => {
    if (value == null || !Number.isFinite(value)) {
      if (segment) paths.push(segment);
      segment = "";
      return;
    }
    segment += `${segment ? " L" : "M"}${10 + (i / Math.max(1, values.length - 1)) * 580},${100 - (value / max) * 85}`;
  });
  if (segment) paths.push(segment);
  return (
    <figure className="min-w-0 rounded-lg border p-3">
      <figcaption className="font-medium">{title}</figcaption>
      {present.length ? (
        <>
          <svg
            viewBox="0 0 600 115"
            role="img"
            aria-label={`${title}. Minimum ${number(Math.min(...present), unit)}, maximum ${number(Math.max(...present), unit)}. De ${date(times[0])} à ${date(times[times.length - 1])}.`}
            className="mt-3 w-full text-primary"
          >
            <title>{title}</title>
            <line
              x1="10"
              y1="100"
              x2="590"
              y2="100"
              stroke="currentColor"
              opacity="0.2"
            />
            {paths.map((path, i) => (
              <path
                key={i}
                d={path}
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              />
            ))}
            {present.length === 1 &&
              values.map((v, i) =>
                v == null ? null : (
                  <circle
                    key={i}
                    cx={10 + (i / Math.max(1, values.length - 1)) * 580}
                    cy={100 - (v / max) * 85}
                    r="3"
                    fill="currentColor"
                  />
                ),
              )}
          </svg>
          <p className="text-xs text-muted-foreground">
            Maximum : {number(Math.max(...present), unit)} · {date(times[0])} —{" "}
            {date(times[times.length - 1])}
          </p>
        </>
      ) : (
        <p className="py-6 text-sm text-muted-foreground">
          Aucun relevé disponible.
        </p>
      )}
    </figure>
  );
}

/** Mounted only within the administrator-only delivery page. */
export default function VideoMonitoringPanel() {
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
  const stale =
    !latest || Date.now() - new Date(latest.sampledAt).getTime() > 45_000;
  const cf = data?.cloudflare;
  const health = (ok: boolean | null, ms: Metric) =>
    ok == null
      ? "Indisponible"
      : `${ok ? "Disponible" : "En échec"} · ${number(ms, " ms")}`;
  return (
    <section className="space-y-6" aria-label="Supervision vidéo">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="flex items-center gap-2 text-xl font-semibold">
          <Activity className="h-5 w-5" />
          Supervision
        </h2>
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
          <label className="text-sm">
            Hôte
            <select
              className="ml-2 rounded-md border bg-background p-2"
              value={host}
              onChange={(e) => setHost(e.target.value)}
            >
              <option value="">Hôte courant</option>
              {data?.hosts.map((h) => (
                <option key={h.id} value={h.id}>
                  {h.id}
                </option>
              ))}
            </select>
          </label>
        </div>
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
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5" />
                Ressources serveur
              </CardTitle>
              <CardDescription>
                Hôte : {data.hostId || "Indisponible"} · Dernier relevé :{" "}
                {date(latest?.sampledAt)}. Collecte et actualisation toutes les
                15 secondes.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {stale && (
                <p
                  role="status"
                  className="flex items-center gap-2 text-sm text-amber-600"
                >
                  <AlertTriangle className="h-4 w-4" />
                  Les relevés de cet hôte sont absents ou datent de plus de 45
                  secondes.
                </p>
              )}
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat label="CPU" value={number(latest?.cpuPercent, " %")} />
                <Stat
                  label="Mémoire"
                  value={number(latest?.memoryPercent, " %")}
                />
                <Stat
                  label="Disque"
                  value={number(latest?.diskPercent, " %")}
                />
                <Stat
                  label="Mémoire du processus API"
                  value={bytes(latest?.nodeRssBytes)}
                />
                <Stat
                  label="Réseau entrant"
                  value={
                    latest?.networkRxBps == null
                      ? "Indisponible"
                      : number(latest.networkRxBps / 1024, " Kio/s")
                  }
                />
                <Stat
                  label="Réseau sortant"
                  value={
                    latest?.networkTxBps == null
                      ? "Indisponible"
                      : number(latest.networkTxBps / 1024, " Kio/s")
                  }
                />
                <Stat
                  label="Capacité réseau configurée"
                  value={number(latest?.networkCapacityMbps, " Mbit/s")}
                />
              </dl>
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
                          <td className="p-2">{number(d.usedPercent, " %")}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              <div className="grid gap-3 md:grid-cols-2">
                {(
                  [
                    "cpuPercent",
                    "memoryPercent",
                    "diskPercent",
                    "activeSessions",
                  ] as const
                ).map((key, i) => (
                  <Graph
                    key={key}
                    title={
                      ["CPU", "Mémoire", "Disque", "Sessions actives estimées"][
                        i
                      ]
                    }
                    values={data.history.map((h) => h[key])}
                    times={data.history.map((h) => h.at)}
                    unit={i < 3 ? " %" : ""}
                  />
                ))}
                <Graph
                  title="Réseau sortant"
                  values={data.history.map((h) =>
                    h.networkTxBps == null ? null : h.networkTxBps / 1024,
                  )}
                  times={data.history.map((h) => h.at)}
                  unit=" Kio/s"
                />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Audience et qualité de lecture</CardTitle>
              <CardDescription>
                Sessions de lecture estimées, distinctes des personnes uniques
                et des minutes facturées. Une présence expire après 75 secondes.
                Les cumuls concernent les sessions démarrées dans la période
                sélectionnée, depuis leur démarrage. Les sessions actives
                couvrent toutes les lectures en cours.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <Stat
                  label="Sessions actives estimées"
                  value={number(data.audience.activeSessions)}
                />
                <Stat label="Démarrages" value={number(data.audience.starts)} />
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
          <Card>
            <CardHeader>
              <CardTitle>Disponibilité depuis l’extérieur</CardTitle>
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
                    {Date.now() - new Date(probe.observedAt).getTime() > 180_000
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
          <Card>
            <CardHeader>
              <CardTitle>Alertes</CardTitle>
              <CardDescription>
                Acquitter confirme la prise en compte ; la résolution dépend du
                retour à la normale.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!data.alerts.length ? (
                <p className="text-sm text-muted-foreground">
                  Aucune alerte enregistrée.
                </p>
              ) : (
                <ul className="divide-y">
                  {data.alerts.map((alert) => (
                    <li
                      key={alert.id}
                      className="flex flex-wrap items-center justify-between gap-3 py-3"
                    >
                      <div>
                        <p className="font-medium">{alert.message}</p>
                        <p className="text-xs text-muted-foreground">
                          {alert.severity} · Ouverte le {date(alert.openedAt)} ·
                          Dernier constat : {date(alert.lastSeenAt)}
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
                          Acquitter
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          {cf && (
            <Card>
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
    </section>
  );
}
