import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";
import { toast } from "sonner";
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Checkbox } from "../components/ui/checkbox";
import { Textarea } from "../components/ui/textarea";
import { Select } from "../components/ui/select";
import { MultiSelect } from "../components/ui/multi-select";
import { ImageDropzone } from "../components/ui/image-dropzone";
import { FileDropzone } from "../components/ui/file-dropzone";

type Video = {
  id: string;
  title: string;
  description?: string | null;
  videoUrl?: string | null;
  thumbnailUrl?: string | null;
  category?: string | null;
  tags?: unknown;
  genreId?: string | null;
  genre?: { id: string; name: string } | null;
  duration: number;
  views: number;
  isPublished: boolean;
  artists?: { id: string; name: string }[];
  videoPlaylists?: { id: string; name: string }[];
};

export default function Videos() {
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);

  const schema = z.object({
    title: z.string().min(1),
    description: z.string().optional(),
    artistIds: z.array(z.string().uuid()).min(1),
    genreId: z.string().uuid(),
    category: z.string().optional(),
    tagsInput: z.string().optional(),
    duration: z.coerce.number().int().positive(),
    thumbnailUrl: z.string().optional().or(z.literal("")),
    videoUrl: z.string().min(1),
    isPublished: z.boolean().optional(),
    playlistIds: z.array(z.string().uuid()).optional(),
  });
  type FormValues = z.infer<typeof schema>;
  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: "",
      description: "",
      artistIds: [],
      genreId: "",
      category: "",
      tagsInput: "",
      duration: 0,
      thumbnailUrl: "",
      videoUrl: "",
      isPublished: false,
      playlistIds: [],
    },
  });

  const { data, isLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => (await api.get("/videos/admin")).data as Video[],
  });

  const artistsQuery = useQuery({
    queryKey: ["artists-all"],
    queryFn: async () =>
      (await api.get("/artists")).data as { id: string; name: string }[],
  });

  const genresQuery = useQuery({
    queryKey: ["genres"],
    queryFn: async () =>
      (await api.get("/genres")).data as { id: string; name: string }[],
  });

  const playlistsQuery = useQuery({
    queryKey: ["video-playlists"],
    queryFn: async () =>
      (await api.get("/video-playlists")).data as { id: string; name: string }[],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (editing) {
        return (await api.patch(`/videos/${editing.id}`, payload)).data;
      }
      return (await api.post("/videos", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      setShowForm(false);
      setEditing(null);
      setUploadProgress(null);
      form.reset();
      toast.success(editing ? "Vidéo mise à jour" : "Vidéo créée");
    },
    onError: () => toast.error("Échec de sauvegarde de la vidéo"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/videos/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      toast.success("Vidéo supprimée");
    },
    onError: () => toast.error("Échec de suppression"),
  });

  const openCreate = () => {
    setEditing(null);
    setUploadProgress(null);
    form.reset();
    setShowForm(true);
  };

  const openEdit = (v: Video) => {
    setEditing(v);
    setUploadProgress(null);
    let tagsInput = "";
    if (Array.isArray(v.tags)) {
      tagsInput = v.tags.filter(Boolean).join(", ");
    } else if (typeof v.tags === "string") {
      try {
        const parsed = JSON.parse(v.tags);
        if (Array.isArray(parsed)) tagsInput = parsed.filter(Boolean).join(", ");
        else tagsInput = v.tags;
      } catch {
        tagsInput = v.tags;
      }
    }
    form.reset({
      title: v.title,
      description: v.description || "",
      artistIds: (v.artists || []).map((a) => a.id),
      genreId: v.genre?.id || v.genreId || "",
      category: v.category || "",
      tagsInput,
      duration: v.duration,
      thumbnailUrl: v.thumbnailUrl || "",
      videoUrl: v.videoUrl || "",
      isPublished: v.isPublished,
      playlistIds: (v.videoPlaylists || []).map((p) => p.id),
    });
    setShowForm(true);
  };

  const onSubmit = (values: FormValues) => {
    const tags = (values.tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    saveMutation.mutate({
      title: values.title,
      description: values.description || undefined,
      artistId: values.artistIds[0],
      artistIds: values.artistIds,
      genreId: values.genreId,
      category: values.category || undefined,
      tags,
      duration: values.duration,
      thumbnailUrl: values.thumbnailUrl || undefined,
      videoUrl: values.videoUrl,
      isPublished: !!values.isPublished,
      videoPlaylistIds: values.playlistIds || [],
    });
  };

  const uploadThumbnail = async (file: File | null) => {
    if (!file) {
      form.setValue("thumbnailUrl", "");
      return;
    }
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/files/upload-image", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const url = res.data?.url || res.data?.filename || "";
      if (!url) {
        toast.error("Échec d'upload de la miniature");
        return;
      }
      form.setValue("thumbnailUrl", url);
      form.clearErrors("thumbnailUrl");
    } catch {
      toast.error("Échec d'upload de la miniature");
    }
  };

  const uploadVideoFile = async (file: File, meta: { duration: number }) => {
    try {
      setUploadProgress(0);
      const fd = new FormData();
      fd.append("file", file);
      const res = await api.post("/files/upload-video", fd, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (evt) => {
          const total = evt.total || 0;
          if (!total) return;
          const percent = Math.round((evt.loaded * 100) / total);
          setUploadProgress(Math.max(0, Math.min(100, percent)));
        },
      });
      const url = res.data?.url || res.data?.filename || "";
      if (!url) {
        toast.error("Échec d'upload de la vidéo");
        setUploadProgress(null);
        return;
      }
      form.setValue("videoUrl", url);
      form.clearErrors("videoUrl");
      if (meta?.duration && meta.duration > 0) {
        form.setValue("duration", meta.duration);
        form.clearErrors("duration");
      }
      setUploadProgress(100);
    } catch {
      setUploadProgress(null);
      toast.error("Échec d'upload de la vidéo");
    }
  };

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = data || [];
    if (!q) return list;
    return list.filter((v) => {
      const titleMatch = v.title.toLowerCase().includes(q);
      const artistMatch = (v.artists || []).some((a) =>
        a.name.toLowerCase().includes(q),
      );
      return titleMatch || artistMatch;
    });
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const roleName =
    typeof user?.role === "string" ? user?.role : (user as any)?.role?.name;
  const canCreate = canAccess(roleName, permissions, "create", "video");
  const canUpdate = canAccess(roleName, permissions, "update", "video");
  const canDelete = canAccess(roleName, permissions, "delete", "video");

  const artistOptions = (artistsQuery.data || []).map((a) => ({
    value: a.id,
    label: a.name,
  }));

  const genreOptions = [{ value: "", label: "— Choisir un genre —" }].concat(
    (genresQuery.data || []).map((g) => ({ value: g.id, label: g.name })),
  );

  const playlistOptions = (playlistsQuery.data || []).map((p) => ({
    value: p.id,
    label: p.name,
  }));

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Vidéos</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher un titre ou un artiste…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            {canCreate && <Button onClick={openCreate}>Nouveau</Button>}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-muted">
                  <tr>
                    <th className="p-2">Titre</th>
                    <th className="p-2">Artistes</th>
                    <th className="p-2">Catégorie</th>
                    <th className="p-2">Durée (s)</th>
                    <th className="p-2">Vues</th>
                    <th className="p-2">Statut</th>
                    <th className="p-2 w-32">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.length === 0 ? (
                    <tr className="border-b">
                      <td
                        className="p-2 text-sm text-muted-foreground"
                        colSpan={7}
                      >
                        Aucune vidéo
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((v) => (
                      <tr key={v.id} className="border-b">
                        <td className="p-2">{v.title}</td>
                        <td className="p-2">
                          {(v.artists || []).map((a) => a.name).join(", ") ||
                            "—"}
                        </td>
                        <td className="p-2">{v.category || "—"}</td>
                        <td className="p-2">{v.duration}</td>
                        <td className="p-2">{v.views}</td>
                        <td className="p-2">
                          <span
                            className={
                              v.isPublished
                                ? "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-emerald-500/10 text-emerald-700"
                                : "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-500/10 text-amber-700"
                            }
                          >
                            {v.isPublished ? "Publié" : "Brouillon"}
                          </span>
                        </td>
                        <td className="p-2">
                          <div className="flex gap-2">
                            {canUpdate && (
                              <Button
                                variant="outline"
                                onClick={() => openEdit(v)}
                              >
                                Éditer
                              </Button>
                            )}
                            {canDelete && (
                              <Button
                                variant="destructive"
                                onClick={() => setDeleteTarget(v)}
                              >
                                Suppr.
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
              <div className="flex items-center justify-between mt-4">
                <div className="text-xs text-muted-foreground">
                  Page {page} / {totalPages}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </div>
          )}

          <Dialog
            open={showForm}
            onOpenChange={setShowForm}
            title={editing ? "Modifier une vidéo" : "Nouvelle vidéo"}
          >
            <form
              onSubmit={form.handleSubmit(onSubmit as any)}
              className="grid gap-3 sm:grid-cols-2"
            >
              <div className="sm:col-span-2 space-y-1">
                <Input placeholder="Titre" {...form.register("title")} />
                {form.formState.errors.title && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.title.message}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 space-y-1">
                <Textarea
                  placeholder="Description"
                  {...form.register("description")}
                />
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Artistes</label>
                <MultiSelect
                  options={artistOptions}
                  value={form.watch("artistIds")}
                  onChange={(vals) => {
                    form.setValue("artistIds", vals);
                    if (vals.length > 0) form.clearErrors("artistIds");
                  }}
                  placeholder="Rechercher un artiste..."
                />
                {form.formState.errors.artistIds && (
                  <p className="text-xs text-destructive">
                    Au moins un artiste est requis
                  </p>
                )}
              </div>
              <div className="space-y-1">
                <label className="text-sm font-medium">Genre</label>
                <Select options={genreOptions} {...form.register("genreId")} />
                {form.formState.errors.genreId && (
                  <p className="text-xs text-destructive">Le genre est requis</p>
                )}
              </div>
              <div className="space-y-1">
                <Input placeholder="Catégorie" {...form.register("category")} />
              </div>
              <div className="space-y-1">
                <Input
                  placeholder="Tags (séparés par des virgules)"
                  {...form.register("tagsInput")}
                />
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  placeholder="Durée (s)"
                  {...form.register("duration")}
                />
                {form.formState.errors.duration && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.duration.message}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium">Miniature</label>
                <ImageDropzone
                  accept="image/jpeg,image/png,image/webp"
                  valueUrl={form.watch("thumbnailUrl") || undefined}
                  onRemoveValueUrl={() => form.setValue("thumbnailUrl", "")}
                  onSelected={(file) => {
                    void uploadThumbnail(file);
                  }}
                />
                {form.formState.errors.thumbnailUrl && (
                  <p className="text-xs text-destructive">
                    {form.formState.errors.thumbnailUrl.message as string}
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 space-y-2">
                <label className="text-sm font-medium">Fichier vidéo (MP4)</label>
                <FileDropzone
                  accept="video/mp4,video/*"
                  onSelected={(file, meta) => {
                    void uploadVideoFile(file, meta);
                  }}
                  initialItems={
                    form.watch("videoUrl")
                      ? [form.watch("videoUrl") as string]
                      : undefined
                  }
                />
                {uploadProgress !== null && (
                  <div className="space-y-1">
                    <div className="h-2 w-full rounded bg-muted">
                      <div
                        className="h-2 rounded bg-primary transition-all duration-200"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Upload {uploadProgress}%
                    </div>
                  </div>
                )}
                {form.formState.errors.videoUrl && (
                  <p className="text-xs text-destructive">
                    Un fichier vidéo est requis
                  </p>
                )}
              </div>
              <div className="sm:col-span-2 flex items-center gap-2">
                <Checkbox
                  checked={!!form.watch("isPublished")}
                  onCheckedChange={(checked) =>
                    form.setValue("isPublished", checked)
                  }
                />
                <span className="text-sm">Publié</span>
              </div>
              <div className="sm:col-span-2 space-y-1">
                <label className="text-sm font-medium">Playlists vidéo</label>
                <MultiSelect
                  options={playlistOptions}
                  value={form.watch("playlistIds") || []}
                  onChange={(vals) => form.setValue("playlistIds", vals)}
                  placeholder="Rechercher une playlist..."
                />
              </div>
              <div className="flex gap-2 sm:col-span-2 pt-2">
                <Button type="submit" disabled={saveMutation.isPending}>
                  {editing ? "Mettre à jour" : "Créer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                    setUploadProgress(null);
                    form.reset();
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Dialog>

          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={`Supprimer la vidéo "${deleteTarget?.title}" ?`}
            description="Voulez-vous vraiment supprimer cette vidéo ? Cette action est irréversible."
            loading={deleteMutation.isPending}
            onConfirm={() => {
              if (deleteTarget) {
                deleteMutation.mutate(deleteTarget.id, {
                  onSettled: () => setDeleteTarget(null),
                });
              }
            }}
          />
        </CardContent>
      </Card>
    </div>
  );
}
