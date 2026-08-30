import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import { Textarea } from "../components/ui/textarea";
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ImageDropzone } from "../components/ui/image-dropzone";
import { Checkbox } from "../components/ui/checkbox";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";
import { Pencil, Trash2, Disc, Eye } from "lucide-react";

type Artist = {
  id: string;
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  gallery?: string | null;
  certified?: boolean;
  birthDate?: string | null;
  country?: string | null;
  gender?: string | null;
  albums?: { id: string; title: string }[];
  songs?: { id: string; title: string }[];
};

type ArtistGroup = {
  id: string;
  name: string;
  members?: { id: string; name: string }[];
};

export default function Artists() {
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const navigate = useNavigate();

  const [search, setSearch] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Artist | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const [songsDetailArtist, setSongsDetailArtist] = useState<Artist | null>(
    null,
  );

  const [showArtistForm, setShowArtistForm] = useState(false);
  const [editingArtist, setEditingArtist] = useState<Artist | null>(null);
  const [artistName, setArtistName] = useState("");
  const [artistBio, setArtistBio] = useState("");
  const [artistCertified, setArtistCertified] = useState(false);
  const [artistImageUrl, setArtistImageUrl] = useState<File | null>(null);
  const [artistBannerUrl, setArtistBannerUrl] = useState<File | null>(null);
  const [artistGallery, setArtistGallery] = useState<File[]>([]);

  const removeFileFromGallery = (url: string) => {
    if (!editingArtist || !editingArtist.gallery) return;
    const gallery = JSON.parse(editingArtist.gallery);
    const nextGallery = gallery.filter((u: string) => u !== url);
    setEditingArtist({
      ...editingArtist,
      gallery: JSON.stringify(nextGallery),
    });
  };

  const artistsQuery = useQuery({
    queryKey: ["artists"],
    queryFn: async () => (await api.get("/artists")).data as Artist[],
  });

  const groupsQuery = useQuery({
    queryKey: ["artist-groups"],
    queryFn: async () =>
      (await api.get("/artist-groups")).data as ArtistGroup[],
  });

  const saveArtistMutation = useMutation({
    mutationFn: async (payload: any) => {
      const uploadImage = async (file: File) => {
        const formData = new FormData();
        formData.append("file", file);
        const res = await api.post("/files/upload-image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        return res.data.url;
      };

      const updateData: any = {
        name: payload.name,
        bio: payload.bio,
        certified: payload.certified,
      };

      if (payload.image) {
        updateData.imageUrl = await uploadImage(payload.image);
      } else if (editingArtist) {
        updateData.imageUrl = editingArtist.imageUrl;
      }

      if (payload.banner) {
        updateData.bannerUrl = await uploadImage(payload.banner);
      } else if (editingArtist) {
        updateData.bannerUrl = editingArtist.bannerUrl;
      }

      if (editingArtist) {
        updateData.gallery = editingArtist.gallery || null;
      }

      if (payload.galleryFiles?.length) {
        const newUrls = await Promise.all(
          payload.galleryFiles.map((f: File) => uploadImage(f)),
        );
        const existingGallery = editingArtist?.gallery
          ? JSON.parse(editingArtist.gallery)
          : [];
        updateData.gallery = JSON.stringify([...existingGallery, ...newUrls]);
      }

      if (editingArtist) {
        return (await api.patch(`/artists/${editingArtist.id}`, updateData))
          .data;
      }
      return (await api.post("/artists", updateData)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artists"] });
      setShowArtistForm(false);
      setEditingArtist(null);
      toast.success(editingArtist ? "Artiste mis à jour" : "Artiste créé");
    },
    onError: (error: any) => {
      console.error(
        "Save artist error:",
        error.response?.data || error.message,
      );
      toast.error("Échec de sauvegarde de l'artiste");
    },
  });

  const deleteArtistMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/artists/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artists"] });
      toast.success("Artiste supprimé");
    },
    onError: () => toast.error("Échec de suppression"),
  });

  const cleanupStaleMutation = useMutation({
    mutationFn: async () => (await api.post("/artists/cleanup-stale")).data,
    onSuccess: (data: { count: number; deleted: any[] }) => {
      qc.invalidateQueries({ queryKey: ["artists"] });
      if (data.count > 0) {
        toast.success(`${data.count} profil(s) artiste(s) orphelin(s) nettoyé(s)`);
      } else {
        toast.info("Aucun profil orphelin trouvé");
      }
    },
    onError: () => toast.error("Échec du nettoyage des profils orphelins"),
  });

  const filtered = useMemo(() => {
    const list = artistsQuery.data || [];
    return list.filter((a) =>
      a.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [artistsQuery.data, search]);

  const groupsByArtistId = useMemo(() => {
    const map: Record<string, ArtistGroup[]> = {};
    (groupsQuery.data || []).forEach((g) => {
      (g.members || []).forEach((m) => {
        if (!map[m.id]) map[m.id] = [];
        map[m.id].push(g);
      });
    });
    return map;
  }, [groupsQuery.data]);

  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const roleName =
    typeof user?.role === "string" ? user?.role : (user as any)?.role?.name;
  const canManageArtists = canAccess(roleName, permissions, "update", "artist");
  const canCreateAlbum = canAccess(roleName, permissions, "create", "album");

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Artistes Solos</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher un artiste…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-56"
            />
            {canManageArtists && (
              <>
                <Button
                  onClick={() => {
                    setEditingArtist(null);
                    setArtistName("");
                    setArtistBio("");
                    setArtistCertified(false);
                    setArtistImageUrl(null);
                    setArtistBannerUrl(null);
                    setArtistGallery([]);
                    setShowArtistForm(true);
                  }}
                >
                  Nouvel Artiste
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => cleanupStaleMutation.mutate()}
                  loading={cleanupStaleMutation.isPending}
                  title="Nettoyer les profils artistes générés automatiquement pour des utilisateurs sans chanson"
                >
                  Nettoyer orphelins
                </Button>
              </>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {artistsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground">Chargement…</p>
          ) : (
            <div className="space-y-6">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="text-left bg-muted">
                    <tr>
                      <th className="p-2">Nom</th>
                      <th className="p-2">Albums</th>
                      <th className="p-2">Groupes</th>
                      <th className="p-2 text-center">Chansons</th>
                      <th className="p-2 text-right min-w-[260px]">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pageItems?.map((a) => (
                      <tr key={a.id} className="border-b">
                        <td className="p-2 font-medium">{a.name}</td>
                        <td className="p-2">
                          {a.albums && a.albums.length ? (
                            <div className="flex flex-wrap gap-1">
                              {a.albums.map((alb) => (
                                <Button
                                  key={alb.id}
                                  type="button"
                                  variant="link"
                                  size="sm"
                                  onClick={() =>
                                    navigate(`/albums?artistId=${a.id}`)
                                  }
                                >
                                  {alb.title}
                                </Button>
                              ))}
                            </div>
                          ) : (
                            "—"
                          )}
                        </td>
                        <td className="p-2">
                          {(groupsByArtistId[a.id] || []).length
                            ? (groupsByArtistId[a.id] || [])
                                .map((g) => g.name)
                                .join(", ")
                            : "—"}
                        </td>
                        <td className="p-2 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <span className="font-semibold text-xs">{a.songs?.length ?? 0}</span>
                            {(a.songs?.length || 0) > 0 && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-amber-400 hover:bg-amber-400/10 hover:text-amber-300"
                                onClick={() => setSongsDetailArtist(a)}
                                title="Voir les chansons"
                              >
                                <Eye className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {canManageArtists && (
                              <>
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 hover:border-amber-400 hover:text-amber-400"
                                  title="Éditer l'artiste"
                                  onClick={() => {
                                    setEditingArtist(a);
                                    setArtistName(a.name);
                                    setArtistBio(a.bio || "");
                                    setArtistCertified(!!a.certified);
                                    setShowArtistForm(true);
                                  }}
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  title="Supprimer l'artiste"
                                  onClick={() => setDeleteTarget(a)}
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                            {canCreateAlbum && (
                              <Button
                                type="button"
                                size="icon"
                                className="h-8 w-8 bg-amber-500 hover:bg-amber-600 text-black shadow-sm"
                                title="Ajouter un album"
                                onClick={() =>
                                  navigate(`/albums?artistId=${a.id}&new=1`)
                                }
                              >
                                <Disc className="w-4 h-4" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
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
                      onClick={() =>
                        setPage((p) => Math.min(totalPages, p + 1))
                      }
                      disabled={page === totalPages}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <Dialog
            open={showArtistForm}
            onOpenChange={(open) => {
              setShowArtistForm(open);
              if (!open) {
                setEditingArtist(null);
                setArtistName("");
                setArtistBio("");
                setArtistCertified(false);
                setArtistImageUrl(null);
                setArtistBannerUrl(null);
                setArtistGallery([]);
              }
            }}
            title={editingArtist ? "Modifier l'artiste" : "Nouvel artiste"}
            className="max-w-xl"
          >
            <form
              onSubmit={(e) => {
                e.preventDefault();
                saveArtistMutation.mutate({
                  name: artistName,
                  bio: artistBio,
                  certified: artistCertified,
                  image: artistImageUrl,
                  banner: artistBannerUrl,
                  galleryFiles: artistGallery,
                });
              }}
              className="grid gap-4"
            >
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Biographie</Label>
                <Textarea
                  value={artistBio}
                  onChange={(e) => setArtistBio(e.target.value)}
                  rows={4}
                />
              </div>
              <div className="flex items-center gap-2">
                <Checkbox
                  id="certified"
                  checked={artistCertified}
                  onCheckedChange={(checked) => setArtistCertified(!!checked)}
                />
                <Label htmlFor="certified">Artiste certifié</Label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Image de profil</Label>
                  <ImageDropzone
                    onSelected={setArtistImageUrl}
                    valueUrl={editingArtist?.imageUrl || ""}
                    onRemoveValueUrl={() => {
                      if (editingArtist)
                        setEditingArtist({ ...editingArtist, imageUrl: null });
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Bannière</Label>
                  <ImageDropzone
                    onSelected={setArtistBannerUrl}
                    valueUrl={editingArtist?.bannerUrl || ""}
                    onRemoveValueUrl={() => {
                      if (editingArtist)
                        setEditingArtist({ ...editingArtist, bannerUrl: null });
                    }}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Galerie photos</Label>
                <ImageDropzone
                  multiple
                  onFilesSelected={setArtistGallery}
                  valueUrls={
                    editingArtist?.gallery
                      ? JSON.parse(editingArtist.gallery)
                      : []
                  }
                  onRemoveValueUrl={removeFileFromGallery}
                />
              </div>

              <div className="flex gap-2 pt-4 sticky bottom-0 bg-background pb-2">
                <Button type="submit" loading={saveArtistMutation.isPending}>
                  {saveArtistMutation.isPending
                    ? editingArtist
                      ? "Mise à jour…"
                      : "Création…"
                    : editingArtist
                    ? "Mettre à jour"
                    : "Créer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowArtistForm(false)}
                >
                  Annuler
                </Button>
              </div>
            </form>
          </Dialog>

          <Dialog
            open={!!songsDetailArtist}
            onOpenChange={(open) => {
              if (!open) {
                setSongsDetailArtist(null);
              }
            }}
            title={
              songsDetailArtist ? `Chansons de ${songsDetailArtist.name}` : ""
            }
          >
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {songsDetailArtist?.songs && songsDetailArtist.songs.length ? (
                songsDetailArtist.songs.map((s) => (
                  <div key={s.id} className="text-sm">
                    {s.title}
                  </div>
                ))
              ) : (
                <p className="text-xs text-muted-foreground">Aucune chanson.</p>
              )}
            </div>
          </Dialog>

          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={`Supprimer l'artiste "${deleteTarget?.name}" ?`}
            description="Voulez-vous vraiment supprimer cet artiste ? Ses chansons et albums seront également affectés. Cette action est irréversible."
            loading={deleteArtistMutation.isPending}
            onConfirm={() => {
              if (deleteTarget) {
                deleteArtistMutation.mutate(deleteTarget.id, {
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
