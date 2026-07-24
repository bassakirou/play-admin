import { useEffect, useState } from "react";
import { useAuth } from "../auth/AuthContext";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "../components/ui/card";
import { Button } from "../components/ui/button";
import {
  TrendingUp,
  TrendingDown,
  Music,
  Library,
  Video,
  Users,
  Play,
  ArrowUpRight,
  Sparkles,
  RefreshCw,
  Plus,
} from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function Dashboard() {
  const { user, token } = useAuth();
  const navigate = useNavigate();

  const [stats, setStats] = useState({
    songsCount: 0,
    albumsCount: 0,
    videosCount: 0,
    artistsCount: 0,
    usersCount: 0,
    recentSongs: [] as any[],
    loading: true,
  });

  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "3m">("3m");

  const fetchDashboardData = async () => {
    try {
      setStats((prev) => ({ ...prev, loading: true }));
      const headers = { Authorization: `Bearer ${token}` };

      const [songsRes, albumsRes, videosRes, artistsRes, usersRes] = await Promise.all([
        fetch("/api/songs", { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/albums", { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/videos/admin", { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/artists", { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
        fetch("/api/users", { headers }).then((r) => (r.ok ? r.json() : [])).catch(() => []),
      ]);

      const songsList = Array.isArray(songsRes) ? songsRes : [];
      const albumsList = Array.isArray(albumsRes) ? albumsRes : [];
      const videosList = Array.isArray(videosRes) ? videosRes : [];
      const artistsList = Array.isArray(artistsRes) ? artistsRes : [];
      const usersList = Array.isArray(usersRes) ? usersRes : [];

      setStats({
        songsCount: songsList.length,
        albumsCount: albumsList.length,
        videosCount: videosList.length,
        artistsCount: artistsList.length,
        usersCount: usersList.length,
        recentSongs: songsList.slice(0, 5),
        loading: false,
      });
    } catch (err) {
      console.error("[Dashboard] Error fetching stats:", err);
      setStats((prev) => ({ ...prev, loading: false }));
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Chart data simulation depending on timeRange
  const chartData = timeRange === "7d" 
    ? [
        { label: "Lun", v1: 420, v2: 210 },
        { label: "Mar", v1: 680, v2: 340 },
        { label: "Mer", v1: 590, v2: 290 },
        { label: "Jeu", v1: 820, v2: 410 },
        { label: "Ven", v1: 1100, v2: 550 },
        { label: "Sam", v1: 1450, v2: 720 },
        { label: "Dim", v1: 1280, v2: 640 },
      ]
    : timeRange === "30d"
    ? [
        { label: "Sem 1", v1: 3200, v2: 1600 },
        { label: "Sem 2", v1: 4800, v2: 2400 },
        { label: "Sem 3", v1: 6100, v2: 3050 },
        { label: "Sem 4", v1: 8900, v2: 4450 },
      ]
    : [
        { label: "Avr", v1: 12400, v2: 6200 },
        { label: "Mai", v1: 18900, v2: 9450 },
        { label: "Juin", v1: 24500, v2: 12250 },
        { label: "Juil", v1: 31200, v2: 15600 },
      ];

  return (
    <div className="space-y-6">
      {/* Top Banner / Welcome */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card border p-6 rounded-2xl shadow-sm">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <span>Bonjour, {user?.name || user?.email?.split("@")[0]}</span>
            <Sparkles className="h-5 w-5 text-amber-500 fill-amber-500/20" />
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Voici la vue d'ensemble des statistiques et des contenus de votre plateforme PyramidPlay.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={fetchDashboardData}
            disabled={stats.loading}
            className="gap-2 rounded-xl"
          >
            <RefreshCw className={`h-4 w-4 ${stats.loading ? "animate-spin" : ""}`} />
            <span>Actualiser</span>
          </Button>
          <Button
            size="sm"
            onClick={() => navigate("/songs?new=1")}
            className="gap-2 rounded-xl bg-primary shadow-md"
          >
            <Plus className="h-4 w-4" />
            <span>Nouveau morceau</span>
          </Button>
        </div>
      </div>

      {/* Row 1: KPI Cards (Shadcn New York v4 style) */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Card 1: Singles / Musiques */}
        <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Singles & Morceaux
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Music className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats.songsCount}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+12.5% ce mois</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Fichiers audio actifs en streaming
            </p>
          </CardContent>
        </Card>

        {/* Card 2: Albums */}
        <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Albums & EPs
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <Library className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats.albumsCount}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+8.2% cette période</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Discographie publiée
            </p>
          </CardContent>
        </Card>

        {/* Card 3: Vidéos */}
        <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Vidéos & Clips
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-rose-500/10 text-rose-500 flex items-center justify-center">
              <Video className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats.videosCount}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-rose-500 mt-1">
              <TrendingDown className="h-3.5 w-3.5" />
              <span>-2.1% cette période</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Contenus vidéos en VOD/HLS
            </p>
          </CardContent>
        </Card>

        {/* Card 4: Artistes & Créateurs */}
        <Card className="rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Artistes & Créateurs
            </CardTitle>
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Users className="h-4 w-4" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tracking-tight">
              {stats.artistsCount}
            </div>
            <div className="flex items-center gap-1 text-xs font-medium text-emerald-500 mt-1">
              <TrendingUp className="h-3.5 w-3.5" />
              <span>+14.0% ce mois</span>
            </div>
            <p className="text-[11px] text-muted-foreground mt-1">
              Comptes artistes vérifiés
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Interactive Chart (Shadcn Visitors Chart style) */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b">
          <div>
            <CardTitle className="text-base font-bold">
              Audience & Écoutes globales
            </CardTitle>
            <CardDescription className="text-xs">
              Progression des écoutes streaming et vidéos des derniers mois
            </CardDescription>
          </div>
          <div className="flex items-center bg-muted/60 p-1 rounded-xl border">
            <button
              onClick={() => setTimeRange("3m")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                timeRange === "3m"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              3 mois
            </button>
            <button
              onClick={() => setTimeRange("30d")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                timeRange === "30d"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              30 jours
            </button>
            <button
              onClick={() => setTimeRange("7d")}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                timeRange === "7d"
                  ? "bg-background text-foreground shadow-sm font-semibold"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              7 jours
            </button>
          </div>
        </CardHeader>
        <CardContent className="pt-6">
          {/* Custom Modern Gradient Area Chart SVG */}
          <div className="relative h-64 w-full">
            <svg className="h-full w-full overflow-visible" viewBox="0 0 500 160" preserveAspectRatio="none">
              <defs>
                <linearGradient id="chartGradientPrimary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.0" />
                </linearGradient>
                <linearGradient id="chartGradientSecondary" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
                  <stop offset="100%" stopColor="#6366f1" stopOpacity="0.0" />
                </linearGradient>
              </defs>

              {/* Horizontal Gridlines */}
              <line x1="0" y1="30" x2="500" y2="30" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
              <line x1="0" y1="70" x2="500" y2="70" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
              <line x1="0" y1="110" x2="500" y2="110" stroke="currentColor" className="text-border/40" strokeDasharray="3 3" />
              <line x1="0" y1="150" x2="500" y2="150" stroke="currentColor" className="text-border/60" />

              {/* Area 1 */}
              <path
                d={`M 0 150 L 0 100 Q 125 40 250 80 T 500 20 L 500 150 Z`}
                fill="url(#chartGradientPrimary)"
              />
              {/* Line 1 */}
              <path
                d={`M 0 100 Q 125 40 250 80 T 500 20`}
                fill="none"
                stroke="hsl(var(--primary))"
                strokeWidth="2.5"
                strokeLinecap="round"
              />

              {/* Area 2 */}
              <path
                d={`M 0 150 L 0 120 Q 125 80 250 110 T 500 60 L 500 150 Z`}
                fill="url(#chartGradientSecondary)"
              />
              {/* Line 2 */}
              <path
                d={`M 0 120 Q 125 80 250 110 T 500 60`}
                fill="none"
                stroke="#6366f1"
                strokeWidth="2"
                strokeDasharray="4 4"
                strokeLinecap="round"
              />
            </svg>

            {/* X-Axis Labels */}
            <div className="flex justify-between items-center text-xs text-muted-foreground pt-3 px-1">
              {chartData.map((d, i) => (
                <span key={i} className="font-medium">{d.label}</span>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Row 3: Derniers Médias Ajoutés Table */}
      <Card className="rounded-2xl border bg-card shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-bold">Derniers morceaux ajoutés</CardTitle>
            <CardDescription className="text-xs">
              Singles et pistes récemment ajoutés à la plateforme
            </CardDescription>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/songs")}
            className="gap-1 text-xs text-primary hover:text-primary"
          >
            <span>Voir tout</span>
            <ArrowUpRight className="h-3.5 w-3.5" />
          </Button>
        </CardHeader>
        <CardContent>
          {stats.recentSongs.length === 0 ? (
            <div className="py-8 text-center text-sm text-muted-foreground">
              Aucun morceau disponible pour le moment.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="py-2.5 px-3 font-semibold">Titre</th>
                    <th className="py-2.5 px-3 font-semibold">Artistes / Groupe</th>
                    <th className="py-2.5 px-3 font-semibold">Durée</th>
                    <th className="py-2.5 px-3 font-semibold">Statut</th>
                    <th className="py-2.5 px-3 font-semibold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {stats.recentSongs.map((s) => (
                    <tr key={s.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-3 px-3">
                        <div className="flex items-center gap-3">
                          {s.coverUrl ? (
                            <img
                              src={s.coverUrl}
                              alt={s.title}
                              className="h-9 w-9 rounded-lg object-cover border"
                              onError={(e) => {
                                (e.target as HTMLImageElement).src = "https://placehold.co/100x100?text=Music";
                              }}
                            />
                          ) : (
                            <div className="h-9 w-9 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
                              <Music className="h-4 w-4" />
                            </div>
                          )}
                          <div className="font-semibold text-foreground">
                            {s.title}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {s.artists?.map((a: any) => a.name).join(", ") ||
                          s.groups?.map((g: any) => g.name).join(", ") ||
                          "Indépendant"}
                      </td>
                      <td className="py-3 px-3 text-muted-foreground">
                        {s.duration ? `${s.duration} s` : "N/A"}
                      </td>
                      <td className="py-3 px-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-emerald-500/10 text-emerald-500 border border-emerald-500/20">
                          Disponible
                        </span>
                      </td>
                      <td className="py-3 px-3 text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => navigate("/songs")}
                          className="h-8 gap-1 rounded-lg text-xs"
                        >
                          <Play className="h-3 w-3 fill-current" />
                          <span>Voir</span>
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
