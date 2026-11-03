import { useState } from "react";
import { cn } from "../../lib/utils";
import type { Metric, Overview } from "./monitoring-model";
const number = (v: number, unit: string) =>
  `${v.toLocaleString("fr-FR", { maximumFractionDigits: 1 })}${unit}`;
const date = (v?: string) =>
  v ? v.length === 10 ? new Date(v).toLocaleDateString("fr-FR") : new Date(v).toLocaleString("fr-FR") : "Indisponible";

const axis = (v: number) => v.toLocaleString("fr-FR", { notation: "compact", maximumFractionDigits: 1 });
export default function MonitoringGraph({
  title,
  values,
  times,
  unit = "",
  limit,
  percent = false,
}: {
  title: string;
  values: Metric[];
  times: string[];
  unit?: string;
  limit?: number;
  percent?: boolean;
}) {
  const present = values.filter(
    (v): v is number => v != null && Number.isFinite(v),
  );
  if (!present.length)
    return (
      <figure className="min-w-0">
        <figcaption className="text-sm font-medium">{title}</figcaption>
        <p className="mt-4 flex min-h-44 items-center justify-center rounded-xl bg-muted/40 px-6 text-center text-sm text-muted-foreground">
          Aucun relevé disponible pour cette période.
        </p>
      </figure>
    );
  const max = percent ? 100 : Math.max(1, ...present, limit || 0);
  const stamps = times.map((t) => new Date(t).getTime());
  const first = stamps[0],
    span = Math.max(1, stamps[stamps.length - 1] - first);
  const intervals = stamps
    .slice(1)
    .map((t, i) => t - stamps[i])
    .filter((v) => v > 0);
  const step = Math.min(...intervals);
  const paths: string[] = [];
  let segment = "";
  values.forEach((v, i) => {
    if (
      v == null ||
      !Number.isFinite(v) ||
      (i > 0 && stamps[i] - stamps[i - 1] > step * 1.5)
    ) {
      if (segment) paths.push(segment);
      segment = "";
    }
    if (v != null && Number.isFinite(v))
      segment += `${segment ? " L" : "M"}${4 + ((stamps[i] - first) / span) * 632},${176 - (Math.min(max, Math.max(0, v)) / max) * 168}`;
  });
  if (segment) paths.push(segment);
  return (
    <figure className="min-w-0">
      <figcaption className="mb-5 text-sm font-medium">{title}</figcaption>
      <div className="relative pl-12">
        <div className="absolute inset-y-0 left-0 flex w-10 flex-col justify-between pb-1 text-right text-xs tabular-nums text-muted-foreground">
          <span>{axis(max)}</span>
          <span>{axis(max / 2)}</span>
          <span>0</span>
        </div>
        <svg
          viewBox="0 0 640 180"
          preserveAspectRatio="none"
          className="h-52 w-full overflow-visible text-amber-700 dark:text-amber-400"
          role="img"
          aria-label={`${title}. Minimum ${number(Math.min(...present), unit)}, maximum ${number(Math.max(...present), unit)}.`}
        >
          <title>{title}</title>
          {[8, 92, 176].map((y) => (
            <line
              key={y}
              x1="0"
              x2="640"
              y1={y}
              y2={y}
              stroke="currentColor"
              className="text-border"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {limit != null && limit <= max && (
            <line
              x1="0"
              x2="640"
              y1={176 - (limit / max) * 168}
              y2={176 - (limit / max) * 168}
              stroke="currentColor"
              strokeDasharray="5 5"
              className="text-red-700 dark:text-red-400"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {paths.map((path, i) => (
            <path
              key={i}
              d={path}
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              vectorEffect="non-scaling-stroke"
            />
          ))}
          {present.length === 1 && (
            <circle
              cx="4"
              cy={176 - (Math.min(max, present[0]) / max) * 168}
              r="3"
              fill="currentColor"
            />
          )}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap justify-between gap-2 pl-12 text-xs text-muted-foreground">
        <time>{date(times[0])}</time>
        <time>{date(times[times.length - 1])}</time>
      </div>
      <p className="mt-4 text-xs text-muted-foreground">
        Maximum observé :{" "}
        <span className="font-medium tabular-nums text-foreground">
          {number(Math.max(...present), unit)}
        </span>
        {limit != null && <> · Seuil : {number(limit, unit)}</>}
      </p>
    </figure>
  );
}

export function ResourceHistory({ data }: { data: Overview }) {
  const options = [
    { id: "cpuPercent", label: "CPU", limit: data.thresholds?.cpu },
    { id: "memoryPercent", label: "Mémoire", limit: data.thresholds?.memory },
    { id: "diskPercent", label: "Disque", limit: data.thresholds?.disk },
    { id: "networkTxBps", label: "Réseau sortant" },
    { id: "activeSessions", label: "Lectures simultanées" },
  ] as const;
  const [selected, setSelected] = useState<string>("cpuPercent");
  const metric = options.find((o) => o.id === selected)!;
  const percent = ["cpuPercent", "memoryPercent", "diskPercent"].includes(
    metric.id,
  );
  const net = metric.id === "networkTxBps";
  const threshold =
    "limit" in metric
      ? metric.limit
      : net && data.latest?.networkCapacityMbps && data.thresholds
        ? (data.latest.networkCapacityMbps * data.thresholds.network) / 100
        : undefined;
  return (
    <div className="border-t pt-5">
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h4 className="text-sm font-semibold">Historique des ressources</h4>
          <p className="mt-1 text-xs text-muted-foreground">
            Maximum par intervalle ; débit moyen pour le réseau.
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-muted p-1">
          {options.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelected(o.id)}
              aria-pressed={selected === o.id}
              className={cn(
                "min-h-9 rounded-lg px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected === o.id
                  ? "bg-card text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>
      <MonitoringGraph
        title={metric.label}
        values={data.history.map((h) =>
          net && h.networkTxBps != null
            ? (h.networkTxBps * 8) / 1e6
            : h[metric.id],
        )}
        times={data.history.map((h) => h.at)}
        unit={percent ? " %" : net ? " Mbit/s" : ""}
        percent={percent}
        limit={threshold}
      />
    </div>
  );
}
