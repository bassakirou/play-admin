import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing, Copy, Mail, Send, Users } from "lucide-react";
import { toast } from "sonner";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Switch } from "../components/ui/switch";

type MaintenanceSubscription = {
  id: string;
  email: string;
  createdAt: string;
  notifiedAt: string | null;
};

type MaintenanceResponse = {
  items: MaintenanceSubscription[];
  stats: {
    total: number;
    pending: number;
    notified: number;
  };
};

type MaintenanceState = {
  id: string;
  enabled: boolean;
  adminPriority: boolean;
  adminEnabled: boolean;
  overrideEnabled: boolean | null;
  source: "admin" | "env";
  updatedAt: string;
};

function formatDate(value: string | null) {
  if (!value) return "En attente";

  return new Intl.DateTimeFormat("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export default function MaintenanceSubscribers() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["maintenance-subscribers"],
    queryFn: async () =>
      (await api.get("/maintenance-subscriptions")).data as MaintenanceResponse,
  });

  const { data: maintenanceState, isLoading: isLoadingState } = useQuery({
    queryKey: ["maintenance-state"],
    queryFn: async () =>
      (await api.get("/maintenance-subscriptions/state"))
        .data as MaintenanceState,
  });

  const maintenanceToggleMutation = useMutation({
    mutationFn: async (enabled: boolean) =>
      (
        await api.patch("/maintenance-subscriptions/state", {
          enabled,
        })
      ).data as MaintenanceState,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["maintenance-state"] });
      toast.success(
        result.enabled
          ? "Le mode maintenance est maintenant active."
          : "Le mode maintenance est maintenant desactive.",
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Impossible de modifier l etat du mode maintenance.";
      toast.error(message);
    },
  });

  const priorityToggleMutation = useMutation({
    mutationFn: async (adminPriority: boolean) =>
      (
        await api.patch("/maintenance-subscriptions/state", {
          adminPriority,
        })
      ).data as MaintenanceState,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["maintenance-state"] });
      toast.success(
        result.adminPriority
          ? "La priorite a l admin est maintenant active."
          : "La priorite a l admin est maintenant desactivee.",
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message ||
        "Impossible de modifier la priorite.";
      toast.error(message);
    },
  });

  const notifyMutation = useMutation({
    mutationFn: async () =>
      (await api.post("/maintenance-subscriptions/notify")).data,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ["maintenance-subscribers"] });
      toast.success(
        result?.sent
          ? `${result.sent} alerte(s) envoyee(s) avec succes.`
          : result?.message || "Aucune nouvelle alerte a envoyer.",
      );
    },
    onError: (error: any) => {
      const message =
        error?.response?.data?.message || "Impossible d envoyer les alertes.";
      toast.error(message);
    },
  });

  const filteredItems = useMemo(() => {
    const items = data?.items || [];
    const query = search.trim().toLowerCase();

    if (!query) return items;

    return items.filter((item) => item.email.toLowerCase().includes(query));
  }, [data?.items, search]);

  const handleCopyEmails = async () => {
    const emails = filteredItems.map((item) => item.email).join(", ");

    if (!emails) {
      toast.error("Aucune adresse e-mail a copier.");
      return;
    }

    try {
      await navigator.clipboard.writeText(emails);
      toast.success("Liste des e-mails copiee.");
    } catch {
      toast.error("Impossible de copier la liste des e-mails.");
    }
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Inscriptions maintenance
          </h1>
          <p className="text-muted-foreground">
            Consultez les adresses inscrites et declenchez l alerte e-mail
            lorsque la plateforme redevient disponible.
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row">
          <Button variant="outline" onClick={handleCopyEmails}>
            <Copy className="mr-2 h-4 w-4" />
            Copier les e-mails
          </Button>
          <Button
            onClick={() => notifyMutation.mutate()}
            disabled={notifyMutation.isPending}
          >
            <Send className="mr-2 h-4 w-4" />
            {notifyMutation.isPending
              ? "Envoi en cours..."
              : "Envoyer l alerte"}
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader className="gap-3">
          <CardTitle>Maintenance ON/OFF</CardTitle>
          <p className="text-sm text-muted-foreground">
            Activez ou desactivez la page de maintenance pour www.pyramidplay.cm
            sans modifier le code.
          </p>
          {maintenanceState?.source === "env" ? (
            <p className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Override actif via `MAINTENANCE_MODE_OVERRIDE=
              {maintenanceState.overrideEnabled ? "on" : "off"}`. Videz cette
              variable sur Vercel pour reutiliser le bouton admin.
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b pb-6 border-zinc-100 dark:border-zinc-800">
            <div className="space-y-1">
              <label htmlFor="admin-priority-switch" className="text-base font-semibold">
                Prioriser la configuration de l'admin
              </label>
              <p className="text-sm text-muted-foreground">
                Activez pour appliquer l'etat de maintenance ci-dessous au site. Sinon, la logique du code frontend s'applique.
              </p>
            </div>
            <Switch
              id="admin-priority-switch"
              checked={maintenanceState?.adminPriority ?? false}
              onCheckedChange={(checked) => priorityToggleMutation.mutate(checked)}
              disabled={isLoadingState || priorityToggleMutation.isPending}
            />
          </div>

          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Etat de la maintenance admin</p>
              <p className="mt-1 text-lg font-semibold">
                {maintenanceState?.enabled
                  ? "Maintenance active"
                  : "Maintenance inactive"}
              </p>
              {maintenanceState?.source === "env" ? (
                <p className="mt-1 text-sm text-muted-foreground">
                  Etat admin memorise:{" "}
                  {maintenanceState.adminEnabled ? "ON" : "OFF"}
                </p>
              ) : null}
            </div>

            <Button
              type="button"
              onClick={() =>
                maintenanceToggleMutation.mutate(!maintenanceState?.enabled)
              }
              disabled={
                isLoadingState ||
                maintenanceToggleMutation.isPending ||
                maintenanceState?.source === "env" ||
                !maintenanceState?.adminPriority
              }
              variant={maintenanceState?.enabled ? "destructive" : "default"}
              className="min-w-44"
            >
              {maintenanceToggleMutation.isPending
                ? "Mise a jour..."
                : maintenanceState?.source === "env"
                  ? "Override par variable"
                  : !maintenanceState?.adminPriority
                    ? "Priorite admin requise"
                    : maintenanceState?.enabled
                      ? "Passer a OFF"
                      : "Passer a ON"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total inscrits
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.total ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Alertes en attente
            </CardTitle>
            <BellRing className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{data?.stats.pending ?? 0}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Alertes envoyees
            </CardTitle>
            <Mail className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {data?.stats.notified ?? 0}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="gap-4">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <CardTitle>Liste des e-mails inscrits</CardTitle>
            <div className="w-full lg:w-80">
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher une adresse e-mail"
              />
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-muted-foreground">
              Chargement...
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground">
              Aucune inscription trouvee.
            </div>
          ) : (
            <div className="space-y-3">
              {filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="flex flex-col gap-3 rounded-2xl border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium">{item.email}</p>
                    <p className="text-sm text-muted-foreground">
                      Inscrit le {formatDate(item.createdAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                        item.notifiedAt
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
                          : "bg-amber-500/10 text-amber-600 dark:text-amber-400"
                      }`}
                    >
                      {item.notifiedAt ? "Alerte envoyee" : "En attente"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {formatDate(item.notifiedAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
