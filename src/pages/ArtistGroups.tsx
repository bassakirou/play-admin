import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ImageDropzone } from "../components/ui/image-dropzone";
import { MultiSelect } from "../components/ui/multi-select";
import { toast } from "sonner";
import { Users, Plus, Pencil, Trash2, Search, Music, Disc } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";

type Artist = {
  id: string;
  name: string;
};

type ArtistGroup = {
  id: string;
  name: string;
  imageUrl?: string | null;
  customMembers?: string | null;
  members: Artist[];
  invitations?: any[];
  songs?: any[];
  albums?: any[];
  _count?: {
    members: number;
    songs: number;
    albums: number;
  };
};

export default function ArtistGroups() {
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const roleName = typeof user?.role === "string" ? user?.role : user?.role?.name;
  const canManage = canAccess(roleName, permissions, "manage", "artist") || canAccess(roleName, permissions, "create", "artist");

  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ArtistGroup | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ArtistGroup | null>(null);

  // Form states
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Queries
  const { data: groups = [], isLoading } = useQuery<ArtistGroup[]>({
    queryKey: ["artist-groups"],
    queryFn: async () => (await api.get("/artist-groups")).data,
  });

  const { data: artists = [] } = useQuery<Artist[]>({
    queryKey: ["artists"],
    queryFn: async () => (await api.get("/artists")).data,
  });

  const artistOptions = useMemo(
    () => artists.map((a) => ({ value: a.id, label: a.name })),
    [artists]
  );

  // Mutations
  const uploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/files/upload-image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data.url || res.data.filename || "";
  };

  const saveGroupMutation = useMutation({
    mutationFn: async (payload: { name: string; memberIds: string[]; imageFile?: File | null }) => {
      let finalImageUrl = imageUrl;
      if (payload.imageFile) {
        finalImageUrl = await uploadImage(payload.imageFile);
      }

      const body = {
        name: payload.name.trim(),
        memberIds: payload.memberIds,
        imageUrl: finalImageUrl || undefined,
      };

      if (editingGroup) {
        return (await api.patch(`/artist-groups/${editingGroup.id}`, body)).data;
      }
      return (await api.post("/artist-groups", body)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artist-groups"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      setShowForm(false);
      setEditingGroup(null);
      setName("");
      setMemberIds([]);
      setImageUrl(null);
      toast.success(editingGroup ? "Groupe mis à jour" : "Groupe créé");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Échec de sauvegarde du groupe");
    },
  });

  const deleteGroupMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/artist-groups/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["artist-groups"] });
      toast.success("Groupe supprimé");
    },
    onError: () => toast.error("Échec de suppression du groupe"),
  });

  // Filtering & Pagination
  const filtered = useMemo(() => {
    return groups.filter((g) => {
      const matchName = g.name.toLowerCase().includes(search.toLowerCase());
      const matchMembers = (g.members || []).some((m) =>
        m.name.toLowerCase().includes(search.toLowerCase())
      );
      return matchName || matchMembers;
    });
  }, [groups, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / pageSize));
  const pageItems = filtered.slice((page - 1) * pageSize, page * pageSize);

  const openCreate = () => {
    setEditingGroup(null);
    setName("");
    setMemberIds([]);
    setImageUrl(null);
    setShowForm(true);
  };

  const openEdit = (g: ArtistGroup) => {
    setEditingGroup(g);
    setName(g.name);
    setMemberIds((g.members || []).map((m) => m.id));
    setImageUrl(g.imageUrl || null);
    setShowForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Users className="w-5 h-5 text-primary" />
              Groupes d'Artistes
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Gérez les duos, collectifs et formations musicales collaboratives.
            </p>
          </div>

          <div className="flex gap-2 items-center">
            <div className="relative">
              <Search className="w-4 h-4 text-muted-foreground absolute left-2.5 top-1/2 -translate-y-1/2" />
              <Input
                placeholder="Rechercher un groupe…"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="w-60 pl-8"
              />
            </div>
            {canManage && (
              <Button onClick={openCreate} className="gap-1.5">
                <Plus className="w-4 h-4" />
                Nouveau groupe
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {isLoading ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              Chargement des groupes…
            </div>
          ) : pageItems.length === 0 ? (
            <div className="py-12 text-center text-sm text-muted-foreground">
              {search ? "Aucun groupe ne correspond à votre recherche." : "Aucun groupe d'artistes enregistré."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted text-left">
                  <tr>
                    <th className="p-3 w-16">Visuel</th>
                    <th className="p-3">Nom du groupe</th>
                    <th className="p-3">Membres</th>
                    <th className="p-3 text-center">Singles</th>
                    <th className="p-3 text-center">Albums</th>
                    <th className="p-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems.map((g) => {
                    const memberNames = (g.members || []).map((m) => m.name).join(", ");
                    const songsCount = g._count?.songs ?? g.songs?.length ?? 0;
                    const albumsCount = g._count?.albums ?? g.albums?.length ?? 0;

                    return (
                      <tr key={g.id} className="border-b hover:bg-muted/40 transition-colors">
                        <td className="p-3">
                          {g.imageUrl ? (
                            <img
                              src={g.imageUrl}
                              alt={g.name}
                              className="w-11 h-11 rounded-lg object-cover border border-border shadow-sm"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-sm">
                              {g.name.substring(0, 2).toUpperCase()}
                            </div>
                          )}
                        </td>
                        <td className="p-3">
                          <span className="font-semibold text-foreground">{g.name}</span>
                        </td>
                        <td className="p-3 max-w-xs truncate text-muted-foreground text-xs">
                          {memberNames || <span className="italic text-muted-foreground/60">Aucun membre</span>}
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                            <Music className="w-3 h-3 text-muted-foreground" />
                            {songsCount}
                          </span>
                        </td>
                        <td className="p-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-muted text-foreground">
                            <Disc className="w-3 h-3 text-muted-foreground" />
                            {albumsCount}
                          </span>
                        </td>
                        <td className="p-3 text-right">
                          {canManage && (
                            <div className="flex gap-1.5 justify-end">
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-8 w-8"
                                title="Modifier"
                                onClick={() => openEdit(g)}
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="h-8 w-8"
                                title="Supprimer"
                                onClick={() => setDeleteTarget(g)}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-4 text-xs text-muted-foreground">
                  <div>
                    Page {page} sur {totalPages} ({filtered.length} groupe(s))
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Précédent
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Suivant
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal Création / Modification */}
      <Dialog
        open={showForm}
        onOpenChange={(open) => {
          setShowForm(open);
          if (!open) {
            setEditingGroup(null);
            setName("");
            setMemberIds([]);
            setImageUrl(null);
          }
        }}
        title={editingGroup ? "Modifier le groupe d’artistes" : "Nouveau groupe d’artistes"}
        className="max-w-lg"
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) {
              toast.error("Le nom du groupe est requis");
              return;
            }
            if (!memberIds.length) {
              toast.error("Veuillez sélectionner au moins un artiste membre");
              return;
            }
            saveGroupMutation.mutate({
              name: name.trim(),
              memberIds,
            });
          }}
          className="grid gap-4"
        >
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Nom du groupe</label>
            <Input
              placeholder="Ex: Cysoul & Lydol"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Artistes membres</label>
            <MultiSelect
              options={artistOptions}
              value={memberIds}
              onChange={setMemberIds}
              placeholder="Sélectionner les artistes..."
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">
              Visuel du groupe (miniature carrée)
            </label>
            <ImageDropzone
              accept="image/jpeg,image/png,image/webp"
              valueUrl={imageUrl || ""}
              previewSize={100}
              onRemoveValueUrl={() => setImageUrl(null)}
              onSelected={async (file) => {
                if (!file) {
                  setImageUrl(null);
                  return;
                }
                try {
                  toast.loading("Téléversement du visuel...", { id: "upload-group-img" });
                  const url = await uploadImage(file);
                  setImageUrl(url);
                  toast.success("Visuel téléversé !", { id: "upload-group-img" });
                } catch {
                  toast.error("Échec de téléversement", { id: "upload-group-img" });
                }
              }}
            />
          </div>

          <div className="flex gap-2 pt-2 border-t mt-2">
            <Button type="submit" loading={saveGroupMutation.isPending}>
              {saveGroupMutation.isPending
                ? editingGroup
                  ? "Mise à jour…"
                  : "Création…"
                : editingGroup
                ? "Mettre à jour"
                : "Créer le groupe"}
            </Button>
            <Button type="button" variant="outline" onClick={() => setShowForm(false)}>
              Annuler
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Supprimer le groupe "${deleteTarget?.name}" ?`}
        description="Voulez-vous vraiment supprimer ce groupe d'artistes ? Ses singles et albums associés ne seront pas supprimés mais ne seront plus liés à ce groupe."
        loading={deleteGroupMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteGroupMutation.mutate(deleteTarget.id, {
              onSettled: () => setDeleteTarget(null),
            });
          }
        }}
      />
    </div>
  );
}
