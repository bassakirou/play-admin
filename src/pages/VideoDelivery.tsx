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
  progress?: { phase: string; percent: number | null };
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
  const routing = useQuery({ queryKey: ['video-routing'], enabled: admin, queryFn: async () => (await api.get('/video-delivery/routing')).data });
  const candidates = useQuery({ queryKey: ['video-migrations'], enabled: admin, queryFn: async () => (await api.get('/video-delivery/migration-candidates')).data as { id: string; title: string; duration: number }[] });
  const [busy, setBusy] = useState(false);
  const [details, setDetails] = useState<string | null>(null);
  const act = async (path: string, body?: unknown) => {
    setBusy(true); setActionError(null);
    try { await api.post(path, body); await Promise.all([queryClient.invalidateQueries({ queryKey: ['video-routing'] }), queryClient.invalidateQueries({ queryKey: ['video-migrations'] }), queryClient.invalidateQueries({ queryKey: ['video-delivery-overview'] })]); }
    catch (error: any) { setActionError(error.response?.data?.message || 'Action impossible. Vérifiez la disponibilité du service.'); }
    finally { setBusy(false); }
  };
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
      <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border bg-card p-6">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Activity className="h-6 w-6" />
            Supervision vidéo
          </h1>
          <p className="text-sm text-muted-foreground">
            Cloudflare Stream, ressources du VPS et alertes de diffusion.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => {
            void queryClient.invalidateQueries({
              queryKey: ["video-observability"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["monitoring-alerts"],
            });
            void queryClient.invalidateQueries({
              queryKey: ["video-delivery-overview"],
            });
          }}
          disabled={query.isFetching}
        >
          <RefreshCw className="mr-2 h-4 w-4" />
          Actualiser
        </Button>
      </div>
      <VideoMonitoringPanel
        delivery={
          <>
            <Card className="rounded-2xl shadow-none">
              <CardHeader><CardTitle>Priorité de diffusion</CardTitle><CardDescription>Cloudflare est prioritaire. Le secours local conserve les contrôles d’accès. Aucun plafond financier automatique n’est appliqué.</CardDescription></CardHeader>
              <CardContent className="space-y-4">
                {routing.isError ? <p role="alert">Politique indisponible.</p> : <p>Mode : {routing.data?.mode === 'LOCAL_ONLY' ? 'MinIO uniquement' : routing.data ? 'Cloudflare prioritaire, MinIO en secours' : 'Chargement…'}</p>}
                <div className="flex flex-wrap gap-3"><Button disabled={busy || !routing.data} onClick={() => void act('/video-delivery/routing', { mode: 'CLOUDFLARE_FIRST' })}>Cloudflare prioritaire</Button><Button variant="outline" disabled={busy || !routing.data} onClick={() => void act('/video-delivery/routing', { mode: 'LOCAL_ONLY' })}>Forcer MinIO</Button></div>
                <p className="text-xs text-muted-foreground">Le changement s’applique aux nouvelles demandes de lecture. Les lectures déjà démarrées ne sont pas interrompues.</p>
              </CardContent>
            </Card>
            <Card className="rounded-2xl shadow-none">
              <CardHeader><CardTitle>Anciennes vidéos</CardTitle><CardDescription>Migration sans republication : l’identifiant et les achats restent conservés. Chaque copie occupe du stockage Cloudflare ; l’original reste dans MinIO.</CardDescription></CardHeader>
              <CardContent className="space-y-3">
                {candidates.isError && <p role="alert">Liste indisponible.</p>}
                {candidates.data?.length === 0 && <p>Aucune vidéo à migrer.</p>}
                {candidates.data?.map(video => <div key={video.id} className="flex flex-wrap items-center justify-between gap-3 border-b py-3"><div><p className="font-medium">{video.title}</p><p className="text-xs text-muted-foreground">{Math.ceil(video.duration / 60)} minutes · original vérifié avant mise en file</p></div><Button variant="outline" disabled={busy || !query.data?.configuration.configured} onClick={() => void act(`/video-delivery/migrate/${encodeURIComponent(video.id)}`)}>Envoyer à Cloudflare</Button></div>)}
                <p className="text-xs text-muted-foreground">100 vidéos au maximum par liste. Si l’original manque, réimportez-le sur la vidéo existante ; une republication n’est pas nécessaire.</p>
              </CardContent>
            </Card>
            {(query.isError || actionError) && (
              <p role="alert" className="text-sm text-destructive">
                {actionError ||
                  "Le suivi est indisponible. Aucune donnée ne peut être confirmée."}
              </p>
            )}
            {query.isPending && <p role="status">Chargement du suivi…</p>}
            {query.data && (
              <>
                <Card className="rounded-2xl shadow-none">
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
                <Card className="rounded-2xl shadow-none">
                  <CardHeader>
                    <CardTitle>Derniers traitements</CardTitle>
                    <CardDescription>
                      Les 50 tâches modifiées le plus récemment.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {!query.data.jobs.length ? (
                      <p className="text-sm text-muted-foreground">
                        Aucun traitement Cloudflare. Les vidéos existantes
                        continuent d’utiliser leur source actuelle.
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
                                  <span className="mr-3 inline-flex items-center gap-2 align-middle" role="status" aria-label={job.progress?.percent != null ? `Encodage ${job.progress.percent} %` : labels[job.status]}>
                                    <svg width="32" height="32" viewBox="0 0 36 36" aria-hidden="true" className={job.status === 'PROCESSING' && job.progress?.percent == null ? 'animate-spin motion-reduce:animate-none' : ''}>
                                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" className="text-muted opacity-30" />
                                      <circle cx="18" cy="18" r="15" fill="none" stroke="currentColor" strokeWidth="3" pathLength="100" strokeDasharray={`${job.progress?.percent ?? (job.status === 'PROCESSING' ? 25 : 0)} 100`} strokeLinecap="round" transform="rotate(-90 18 18)" className="text-primary" />
                                    </svg>
                                    <span className="text-xs text-muted-foreground">{job.progress?.percent != null ? `${Math.round(job.progress.percent)} %` : job.progress?.phase === 'downloading' ? 'Transfert serveur' : labels[job.status]}</span>
                                  </span>
                                  <span className="font-medium">
                                    {job.title}
                                  </span>
                                  {job.lastError && (
                                    <p className="mt-1 max-w-sm text-xs text-destructive">
                                      {job.lastError}
                                    </p>
                                  )}
                                  {details === job.id && <p className="mt-2 text-xs text-muted-foreground">{job.status === 'PROCESSING' ? job.progress?.phase === 'downloading' ? 'Cloudflare récupère le fichier depuis le serveur. Pourcentage de transfert indisponible.' : 'Encodage chez Cloudflare. La progression sera actualisée automatiquement.' : labels[job.status]} · Traitement côté serveurs : vous pouvez fermer cette page. Référence : {job.id}</p>}
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
                                  {new Date(job.updatedAt).toLocaleString(
                                    "fr-FR",
                                  )}
                                </td>
                                <td className="p-3">
                                  <Button size="sm" variant="ghost" onClick={() => setDetails(details === job.id ? null : job.id)}>{details === job.id ? 'Masquer' : 'Détails'}</Button>
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
          </>
        }
      />
    </div>
  );
}
