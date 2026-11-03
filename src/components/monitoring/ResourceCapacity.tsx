import { Cpu, HardDrive, Network, Server } from "lucide-react";
import { cn } from "../../lib/utils";
import type { Overview } from "./monitoring-model";

export default function ResourceCapacity({ data }: { data: Overview }) {
  const latest = data.latest,
    thresholds = data.thresholds;
  const capacity = latest?.networkCapacityMbps;
  const tx = latest?.networkTxBps;
  const network =
    capacity != null && capacity > 0 && tx != null
      ? ((tx * 8) / 1e6 / capacity) * 100
      : null;
  const rows = [
    {
      label: "CPU",
      icon: Cpu,
      value: latest?.cpuPercent,
      threshold: thresholds?.cpu,
      note: thresholds
        ? `Seuil : ${thresholds.cpu} % sur ${thresholds.cpuConsecutiveSamples} relevés consécutifs.`
        : "Seuil non communiqué par l’API.",
    },
    {
      label: "Mémoire",
      icon: Server,
      value: latest?.memoryPercent,
      threshold: thresholds?.memory,
      note: thresholds
        ? `Seuil d’alerte : ${thresholds.memory} %.`
        : "Seuil non communiqué par l’API.",
    },
    {
      label: "Disque",
      icon: HardDrive,
      value: latest?.diskPercent,
      threshold: thresholds?.disk,
      note: thresholds
        ? `Avertissement : ${thresholds.disk} % · critique : ${thresholds.diskCritical} %.`
        : "Volume le plus rempli parmi les volumes surveillés.",
    },
    {
      label: "Réseau sortant",
      icon: Network,
      value: network,
      threshold: thresholds?.network,
      note: capacity
        ? `Capacité renseignée : ${capacity.toLocaleString("fr-FR")} Mbit/s.`
        : "Capacité réseau non renseignée : saturation indisponible.",
    },
  ];
  return (
    <div>
      <dl className="grid gap-x-8 gap-y-6 sm:grid-cols-2 xl:grid-cols-4">
        {rows.map(({ label, value, threshold, icon: Icon, note }) => {
          const known = value != null && Number.isFinite(value);
          const high = known && threshold != null && value >= threshold;
          const full = known && value >= 100;
          return (
            <div key={label} className="min-w-0">
              <dt className="flex items-center gap-2 text-sm font-medium">
                <Icon
                  className="h-4 w-4 text-muted-foreground"
                  aria-hidden="true"
                />
                {label}
              </dt>
              <dd className="my-3 flex flex-wrap items-baseline justify-between gap-2">
                <span className="text-2xl font-semibold tabular-nums tracking-tight">
                  {known
                    ? `${value.toLocaleString("fr-FR", { maximumFractionDigits: 1 })} %`
                    : "Indisponible"}
                </span>
                <span
                  className={cn(
                    "text-xs font-medium",
                    full
                      ? "text-red-700 dark:text-red-300"
                      : high
                        ? "text-amber-800 dark:text-amber-300"
                        : "text-muted-foreground",
                  )}
                >
                  {full
                    ? "Capacité atteinte"
                    : high
                      ? "Seuil franchi"
                      : known
                        ? "Utilisation"
                        : "Sans mesure"}
                </span>
              </dd>
              <div
                className="relative h-2 overflow-hidden rounded-full bg-muted"
                role={known ? "progressbar" : undefined}
                aria-label={`Utilisation ${label}`}
                aria-valuenow={
                  known ? Math.min(100, Math.max(0, value)) : undefined
                }
                aria-valuemin={0}
                aria-valuemax={100}
              >
                {known && (
                  <div
                    className={cn(
                      "h-full rounded-full",
                      full
                        ? "bg-red-600 dark:bg-red-400"
                        : high
                          ? "bg-amber-600 dark:bg-amber-400"
                          : "bg-slate-600 dark:bg-slate-400",
                    )}
                    style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
                  />
                )}
                {threshold != null && (
                  <span
                    className="absolute inset-y-0 w-0.5 bg-foreground/70"
                    style={{ left: `${threshold}%` }}
                  />
                )}
              </div>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                {note}
              </p>
            </div>
          );
        })}
      </dl>
      <p className="mt-5 border-t pt-4 text-xs leading-relaxed text-muted-foreground">
        Ces repères indiquent les seuils de surveillance. Ils ne constituent pas
        une capacité garantie en spectateurs. Les alertes confirmées
        apparaissent dans le centre d’alertes.
      </p>
    </div>
  );
}
