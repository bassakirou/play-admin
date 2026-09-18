import { useState } from "react";
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
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import {
  Share2,
  Plus,
  Pencil,
  Trash2,
  HelpCircle,
  Sliders,
  Sparkles,
} from "lucide-react";

export interface SharePlatform {
  id: string;
  key: string;
  name: string;
  icon?: string | null;
  color?: string | null;
  shareUrl: string;
  order: number;
  enabled: boolean;
  includeTitle: boolean;
  includeAuthor: boolean;
  includeDescription: boolean;
  defaultHashtags?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ShareModalConfig {
  id: string;
  showMediaPreview: boolean;
  showCustomization: boolean;
}

export default function ShareSettings() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<SharePlatform | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<SharePlatform | null>(null);
  const [search, setSearch] = useState("");

  // Form states
  const [key, setKey] = useState("");
  const [name, setName] = useState("");
  const [color, setColor] = useState("#3B82F6");
  const [shareUrl, setShareUrl] = useState("");
  const [order, setOrder] = useState(0);
  const [enabled, setEnabled] = useState(true);
  const [includeTitle, setIncludeTitle] = useState(true);
  const [includeAuthor, setIncludeAuthor] = useState(true);
  const [includeDescription, setIncludeDescription] = useState(false);
  const [defaultHashtags, setDefaultHashtags] = useState("");

  const { data: modalConfig } = useQuery({
    queryKey: ["share-modal-config"],
    queryFn: async () => {
      const res = await api.get("/share-settings/config");
      return res.data as ShareModalConfig;
    },
  });

  const updateConfigMutation = useMutation({
    mutationFn: async (payload: Partial<ShareModalConfig>) => {
      return (await api.patch("/share-settings/config", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-modal-config"] });
      toast.success("Configuration du modal de partage mise à jour");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors de la mise à jour");
    },
  });

  const { data: platforms, isLoading } = useQuery({
    queryKey: ["share-platforms-admin"],
    queryFn: async () => {
      const res = await api.get("/share-settings/all");
      return res.data as SharePlatform[];
    },
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: any) => {
      if (editing) {
        return (await api.patch(`/share-settings/${editing.id}`, payload)).data;
      }
      return (await api.post("/share-settings", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-platforms-admin"] });
      setShowForm(false);
      resetForm();
      toast.success(editing ? "Réseau de partage mis à jour" : "Réseau de partage ajouté");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors de la sauvegarde");
    },
  });

  const toggleMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      return (await api.patch(`/share-settings/${id}`, { enabled })).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-platforms-admin"] });
      toast.success("Statut mis à jour");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors du changement de statut");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/share-settings/${id}`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["share-platforms-admin"] });
      toast.success("Réseau supprimé");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors de la suppression");
    },
  });

  const resetForm = () => {
    setEditing(null);
    setKey("");
    setName("");
    setColor("#3B82F6");
    setShareUrl("");
    setOrder(0);
    setEnabled(true);
    setIncludeTitle(true);
    setIncludeAuthor(true);
    setIncludeDescription(false);
    setDefaultHashtags("");
  };

  const openCreate = () => {
    resetForm();
    setShowForm(true);
  };

  const openEdit = (p: SharePlatform) => {
    setEditing(p);
    setKey(p.key);
    setName(p.name);
    setColor(p.color || "#3B82F6");
    setShareUrl(p.shareUrl);
    setOrder(p.order);
    setEnabled(p.enabled);
    setIncludeTitle(p.includeTitle);
    setIncludeAuthor(p.includeAuthor);
    setIncludeDescription(p.includeDescription);
    setDefaultHashtags(p.defaultHashtags || "");
    setShowForm(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!key.trim() || !name.trim() || !shareUrl.trim()) {
      toast.error("Veuillez renseigner tous les champs obligatoires");
      return;
    }

    saveMutation.mutate({
      key: key.trim().toLowerCase(),
      name: name.trim(),
      color: color.trim(),
      shareUrl: shareUrl.trim(),
      order: Number(order) || 0,
      enabled,
      includeTitle,
      includeAuthor,
      includeDescription,
      defaultHashtags: defaultHashtags.trim() || null,
    });
  };

  const filtered = (platforms || []).filter((p) =>
    `${p.name} ${p.key}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Share2 className="w-6 h-6 text-primary" />
            Réseaux & Partage Social
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Gérez la liste des plateformes disponibles pour le partage multi-contenus (vidéos, musiques, lives, livres audio).
          </p>
        </div>
        <Button onClick={openCreate} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Ajouter une plateforme
        </Button>
      </div>

      {/* Options d'affichage du Modal de Partage */}
      <Card className="border-border">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-primary" />
            <CardTitle>Affichage du modal de partage (Public)</CardTitle>
          </div>
          <CardDescription>
            Activez ou désactivez globalement l'affichage des blocs dans la fenêtre de partage pour l'application publique. Par défaut, le modal est en mode simplifié.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
            <div className="space-y-0.5 max-w-xl">
              <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Bloc 1 : Aperçu du média (Titre, Auteur, Miniature, Lien)
              </Label>
              <p className="text-xs text-muted-foreground">
                Affiche l'encadré visuel contenant la miniature, le type de média, le titre et le lien en haut du modal de partage.
              </p>
            </div>
            <Switch
              checked={modalConfig?.showMediaPreview ?? false}
              onCheckedChange={(val: boolean) =>
                updateConfigMutation.mutate({ showMediaPreview: val })
              }
              disabled={updateConfigMutation.isPending}
            />
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl border bg-muted/20">
            <div className="space-y-0.5 max-w-xl">
              <Label className="text-sm font-semibold flex items-center gap-2 text-foreground">
                <Sparkles className="w-4 h-4 text-amber-500" />
                Bloc 2 : Personnalisation des éléments inclus (Cases à cocher)
              </Label>
              <p className="text-xs text-muted-foreground">
                Affiche les cases à cocher permettant aux utilisateurs de personnaliser les informations incluses dans le texte de partage (Titre, Artiste, Description, Hashtags).
              </p>
            </div>
            <Switch
              checked={modalConfig?.showCustomization ?? false}
              onCheckedChange={(val: boolean) =>
                updateConfigMutation.mutate({ showCustomization: val })
              }
              disabled={updateConfigMutation.isPending}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Plateformes configurées</CardTitle>
            <CardDescription>
              Activez, désactivez ou personnalisez les modèles d'URL de partage.
            </CardDescription>
          </div>
          <div className="w-64">
            <Input
              placeholder="Rechercher une plateforme..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement des réseaux...</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-muted">
                  <tr>
                    <th className="p-3">Ordre</th>
                    <th className="p-3">Plateforme</th>
                    <th className="p-3">Identifiant (Clé)</th>
                    <th className="p-3">URL Modèle</th>
                    <th className="p-3">Inclusions par défaut</th>
                    <th className="p-3 text-center">Statut</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-6 text-center text-muted-foreground">
                        Aucune plateforme trouvée.
                      </td>
                    </tr>
                  ) : (
                    filtered.map((p) => (
                      <tr key={p.id} className="border-b hover:bg-muted/30 transition-colors">
                        <td className="p-3 font-medium text-muted-foreground">{p.order}</td>
                        <td className="p-3 font-medium">
                          <div className="flex items-center gap-2.5">
                            <span
                              className="w-3.5 h-3.5 rounded-full shrink-0"
                              style={{ backgroundColor: p.color || "#888" }}
                            />
                            <span>{p.name}</span>
                          </div>
                        </td>
                        <td className="p-3 text-muted-foreground font-mono text-xs">
                          {p.key}
                        </td>
                        <td className="p-3 max-w-xs truncate text-xs font-mono text-muted-foreground" title={p.shareUrl}>
                          {p.shareUrl}
                        </td>
                        <td className="p-3">
                          <div className="flex flex-wrap gap-1">
                            {p.includeTitle && (
                              <span className="px-2 py-0.5 text-[10px] rounded bg-primary/10 text-primary">Titre</span>
                            )}
                            {p.includeAuthor && (
                              <span className="px-2 py-0.5 text-[10px] rounded bg-secondary/80 text-secondary-foreground">Auteur</span>
                            )}
                            {p.includeDescription && (
                              <span className="px-2 py-0.5 text-[10px] rounded bg-muted text-muted-foreground">Desc</span>
                            )}
                            {p.defaultHashtags && (
                              <span className="px-2 py-0.5 text-[10px] rounded bg-accent text-accent-foreground font-mono">
                                #{p.defaultHashtags}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center">
                            <Switch
                              checked={p.enabled}
                              onCheckedChange={(val: boolean) =>
                                toggleMutation.mutate({ id: p.id, enabled: val })
                              }
                            />
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEdit(p)}
                              title="Modifier"
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeleteTarget(p)}
                              title="Supprimer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card className="border-dashed bg-muted/20">
        <CardContent className="pt-6">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-semibold text-foreground">
                Variables disponibles dans les modèles d'URL de partage :
              </p>
              <p>
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">&#123;url&#125;</code> : L'URL absolue vers le contenu partagé (encodée en URI).
              </p>
              <p>
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">&#123;text&#125;</code> : Le texte complet généré selon les paramètres cochés par l'utilisateur.
              </p>
              <p>
                <code className="bg-muted px-1.5 py-0.5 rounded font-mono text-[11px]">&#123;title&#125;</code> : Le titre seul du contenu (titre de la chanson, vidéo, live...).
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Modal Création / Modification */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          if (!open) setShowForm(false);
        }}
        title={editing ? `Modifier : ${editing.name}` : "Ajouter une plateforme de partage"}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Identifiant unique (clé) *</Label>
              <Input
                value={key}
                onChange={(e) => setKey(e.target.value)}
                placeholder="ex: reddit, threads, bluesky"
                disabled={!!editing}
                required
              />
            </div>
            <div>
              <Label>Nom affiché *</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ex: Reddit, Bluesky..."
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Couleur de la marque</Label>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-10 h-10 p-0.5 rounded border cursor-pointer"
                />
                <Input
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  placeholder="#FF4500"
                />
              </div>
            </div>
            <div>
              <Label>Ordre d'affichage</Label>
              <Input
                type="number"
                value={order}
                onChange={(e) => setOrder(Number(e.target.value))}
              />
            </div>
          </div>

          <div>
            <Label>Modèle d'URL de partage *</Label>
            <Input
              value={shareUrl}
              onChange={(e) => setShareUrl(e.target.value)}
              placeholder="https://example.com/share?url={url}&text={text}"
              required
            />
          </div>

          <div>
            <Label>Hashtags par défaut (séparés par une virgule)</Label>
            <Input
              value={defaultHashtags}
              onChange={(e) => setDefaultHashtags(e.target.value)}
              placeholder="PyramidPlay,Musique,Live"
            />
          </div>

          <div className="pt-2 border-t space-y-3">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Paramètres du post inclus par défaut
            </Label>
            <div className="flex flex-col gap-2">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeTitle}
                  onChange={(e) => setIncludeTitle(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Inclure le titre du contenu
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeAuthor}
                  onChange={(e) => setIncludeAuthor(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Inclure le nom de l'artiste ou du créateur
              </label>
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input
                  type="checkbox"
                  checked={includeDescription}
                  onChange={(e) => setIncludeDescription(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary"
                />
                Inclure la description courte
              </label>
            </div>
          </div>

          <div className="pt-2 border-t flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium cursor-pointer">
              <Switch checked={enabled} onCheckedChange={setEnabled} />
              Activer sur l'application publique
            </label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
                Annuler
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                {saveMutation.isPending ? "Enregistrement..." : "Enregistrer"}
              </Button>
            </div>
          </div>
        </form>
      </Dialog>

      {/* Dialogue de suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer la plateforme de partage"
        description={`Êtes-vous sûr de vouloir supprimer la plateforme "${deleteTarget?.name}" ? Cette action est irréversible.`}
        confirmText="Supprimer"
        cancelText="Annuler"
        variant="destructive"
        loading={deleteMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteMutation.mutate(deleteTarget.id, {
              onSettled: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
