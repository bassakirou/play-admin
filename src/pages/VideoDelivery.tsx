import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Activity, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import VideoMonitoringPanel from "../components/monitoring/VideoMonitoringPanel";

type Job = {
  id: string;
  title: string;
  status: string;
  attempts: number;
  originalRetained: boolean;
  lastError: string | null;
  updatedAt: string;
};
type Overview = {
  configuration: {
    provider: string;
    requested: boolean;
    configured: boolean;
    missing: string[];
  };
  counts: Record<string, number>;
  jobs: Job[];
};
const labels: Record<string, string> = {
  QUEUED: "En attente",
  PROCESSING: "Encodage",
  RETRY: "Nouvel essai prévu",
  READY: "Disponible",
  ERROR: "En erreur",
};

export default function VideoDelivery() {
  const { user } = useAuth();
  const admin = ["ADMIN", "SUPER_ADMIN"].includes(
    typeof user?.role === "string" ? user.role : user?.role?.name || "",
  );
  const queryClient = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [retrying, setRetrying] = useState<string | null>(null);
  const query = useQuery({
    queryKey: ["video-delivery-overview"],
    enabled: admin,
    queryFn: async () =>
      (await api.get("/video-delivery/overview")).data as Overview,
    refetchInterval: 15_000,
  });
  const retry = async (id: string) => {
    setRetrying(id);
    setActionError(null);
    try {
      await api.post(`/video-delivery/${id}/retry`);
      await queryClient.invalidateQueries({
        queryKey: ["video-delivery-overview"],
      });
    } catch {
      setActionError(
        "Impossible de relancer cette tâche. Vérifiez la configuration du service.",
      );
    } finally {
      setRetrying(null);
    }
  };
  if (!admin)
    return <p className="p-6">Cette page est réservée aux administrateurs.</p>;
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Diffusion vidéo
          </h1>
          <p className="text-sm text-muted-foreground">
            Originaux, préparation et disponibilité des vidéos.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => void query.refetch()}
          disabled={query.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>
      {(query.isError || actionError) && (
        <p role="alert" className="text-sm text-destructive">
          {actionError ||
            "Le suivi est indisponible. Aucune donnée ne peut être confirmée."}
        </p>
      )}
      {query.isPending && <p role="status">Chargement du suivi…</p>}
      {query.data && (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Service de diffusion</CardTitle>
              <CardDescription>
                {query.data.configuration.configured
                  ? "Cloudflare Stream configuré."
                  : query.data.configuration.requested
                    ? "Cloudflare demandé, configuration incomplète. Le parcours MinIO reste actif pour les nouvelles vidéos."
                    : "MinIO actif. Cloudflare Stream est désactivé."}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              {!!query.data.configuration.missing.length && (
                <p>
                  Paramètres manquants :{" "}
                  {query.data.configuration.missing.join(", ")}.
                </p>
              )}
              <p className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4" />
                Les originaux téléversés sont conservés dans MinIO.
              </p>
              <p className="text-muted-foreground">
                Actualisation des traitements toutes les 15 secondes.
              </p>
              <p className="text-xs text-muted-foreground">
                Dernier relevé :{" "}
                {new Date(query.dataUpdatedAt).toLocaleString("fr-FR")}
              </p>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
            {Object.entries(labels).map(([state, label]) => (
              <Card key={state}>
                <CardHeader>
                  <CardDescription>{label}</CardDescription>
                  <CardTitle>{query.data!.counts[state] || 0}</CardTitle>
                </CardHeader>
              </Card>
            ))}
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Derniers traitements</CardTitle>
              <CardDescription>
                Les 50 tâches modifiées le plus récemment.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!query.data.jobs.length ? (
                <p className="text-sm text-muted-foreground">
                  Aucun traitement Cloudflare. Les vidéos existantes continuent
                  d’utiliser leur source actuelle.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="p-3">Vidéo</th>
                        <th className="p-3">État</th>
                        <th className="p-3">Original</th>
                        <th className="p-3">Mise à jour</th>
                        <th className="p-3">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {query.data.jobs.map((job) => (
                        <tr key={job.id} className="border-b">
                          <td className="p-3">
                            <span className="font-medium">{job.title}</span>
                            {job.lastError && (
                              <p className="mt-1 max-w-sm text-xs text-destructive">
                                {job.lastError}
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            {labels[job.status] || job.status}
                            {job.attempts > 0 && (
                              <p className="text-xs text-muted-foreground">
                                {job.attempts} échec(s)
                              </p>
                            )}
                          </td>
                          <td className="p-3">
                            {job.originalRetained
                              ? "Référencé dans MinIO"
                              : "À vérifier"}
                          </td>
                          <td className="p-3 whitespace-nowrap">
                            {new Date(job.updatedAt).toLocaleString("fr-FR")}
                          </td>
                          <td className="p-3">
                            {job.status === "ERROR" && (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={
                                  !query.data!.configuration.configured ||
                                  retrying === job.id
                                }
                                onClick={() => void retry(job.id)}
                              >
                                Relancer
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
      <VideoMonitoringPanel />
    </div>
  );
}
