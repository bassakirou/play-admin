import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import {
  Radio,
  Clock,
  Users,
  HardDrive,
  Save,
  CheckCircle2,
  Film,
  AlertTriangle,
} from "lucide-react";

export interface LiveSettingsConfig {
  id: string;
  maxDurationMinutes: number;
  maxViewers: number;
  enableRetention0Days: boolean;
  enableRetention3Days: boolean;
  enableRetention7Days: boolean;
  updatedAt?: string;
}

export default function LiveSettings() {
  const qc = useQueryClient();

  const { data: config, isLoading } = useQuery<LiveSettingsConfig>({
    queryKey: ["live-settings-config"],
    queryFn: async () => {
      const res = await api.get("/lives/config");
      return res.data;
    },
  });

  const [maxDurationMinutes, setMaxDurationMinutes] = useState(60);
  const [maxViewers, setMaxViewers] = useState(500);
  const [enableRetention0Days, setEnableRetention0Days] = useState(true);
  const [enableRetention3Days, setEnableRetention3Days] = useState(true);
  const [enableRetention7Days, setEnableRetention7Days] = useState(true);

  useEffect(() => {
    if (config) {
      setMaxDurationMinutes(config.maxDurationMinutes ?? 60);
      setMaxViewers(config.maxViewers ?? 500);
      setEnableRetention0Days(config.enableRetention0Days ?? true);
      setEnableRetention3Days(config.enableRetention3Days ?? true);
      setEnableRetention7Days(config.enableRetention7Days ?? true);
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: async (payload: Partial<LiveSettingsConfig>) => {
      const res = await api.patch("/lives/config", payload);
      return res.data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["live-settings-config"] });
      toast.success("Paramètres des Lives enregistrés avec succès.");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Erreur de sauvegarde";
      toast.error(msg);
    },
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate({
      maxDurationMinutes: Number(maxDurationMinutes) || 60,
      maxViewers: Number(maxViewers) || 0,
      enableRetention0Days,
      enableRetention3Days,
      enableRetention7Days,
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900 dark:text-white flex items-center gap-2.5">
            <Radio className="w-6 h-6 text-amber-500" />
            Configuration Globale des Lives
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Définissez les limites de durée, de spectateurs et la politique de rétention/replay des diffusions en direct.
          </p>
        </div>

        <Button
          type="button"
          onClick={handleSave}
          disabled={updateMutation.isPending || isLoading}
          className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-6 shadow-md flex items-center gap-2"
        >
          <Save className="w-4 h-4" />
          {updateMutation.isPending ? "Enregistrement..." : "Enregistrer"}
        </Button>
      </div>

      <form onSubmit={handleSave} className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Limites opérationnelles */}
        <Card className="border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <Clock className="w-5 h-5 text-amber-500" />
              Limites Opérationnelles
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Contrôlez les plafonds techniques imposés aux créateurs et spectateurs lors des directs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Durée maximale */}
            <div className="space-y-2">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Durée Maximale d'un Live (en minutes)
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={5}
                  max={480}
                  value={maxDurationMinutes}
                  onChange={(e) => setMaxDurationMinutes(Number(e.target.value))}
                  className="max-w-xs"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  minutes ({Math.floor(maxDurationMinutes / 60)}h {maxDurationMinutes % 60}m)
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Par défaut : 60 minutes (1 heure). À l'expiration de cette durée, le live est automatiquement arrêté par le système.
              </p>
            </div>

            {/* Spectateurs max */}
            <div className="space-y-2 pt-2 border-t border-slate-100 dark:border-white/5">
              <Label className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                Nombre Maximal de Spectateurs Simultanés
              </Label>
              <div className="flex items-center gap-3">
                <Input
                  type="number"
                  min={0}
                  max={100000}
                  value={maxViewers}
                  onChange={(e) => setMaxViewers(Number(e.target.value))}
                  className="max-w-xs"
                />
                <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold">
                  {maxViewers === 0 ? "Illimité" : "spectateurs max"}
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Indiquez 0 pour autoriser un nombre illimité de spectateurs.
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Rétention & Replay */}
        <Card className="border-slate-200 dark:border-white/10 shadow-sm bg-white dark:bg-slate-900">
          <CardHeader className="border-b border-slate-100 dark:border-white/5 pb-4">
            <CardTitle className="text-base font-bold flex items-center gap-2 text-slate-900 dark:text-white">
              <HardDrive className="w-5 h-5 text-amber-500" />
              Politique de Rétention & Replay
            </CardTitle>
            <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
              Choisissez les options de conservation temporaire proposées aux créateurs dans le studio.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pt-5">
            {/* Option 0 jour */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-white">
                  <AlertTriangle className="w-4 h-4 text-slate-400" />
                  0 jour (Suppression immédiate)
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Aucun replay n'est conservé. Les médias temporaires sont immédiatement purgés à la fin du live.
                </p>
              </div>
              <Switch
                checked={enableRetention0Days}
                onCheckedChange={setEnableRetention0Days}
              />
            </div>

            {/* Option 3 jours */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-white">
                  <Film className="w-4 h-4 text-amber-500" />
                  3 jours de Replay
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Le live reste disponible en vidéo replay pendant 72 heures avant suppression automatique.
                </p>
              </div>
              <Switch
                checked={enableRetention3Days}
                onCheckedChange={setEnableRetention3Days}
              />
            </div>

            {/* Option 7 jours */}
            <div className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-slate-800/40">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2 font-bold text-xs text-slate-800 dark:text-white">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  7 jours de Replay
                </div>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Le live reste disponible en vidéo replay pendant 1 semaine avant suppression automatique.
                </p>
              </div>
              <Switch
                checked={enableRetention7Days}
                onCheckedChange={setEnableRetention7Days}
              />
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
