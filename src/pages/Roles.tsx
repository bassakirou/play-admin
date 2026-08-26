import { useMemo, useState } from "react";
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
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ALL_PERMISSIONS, canAccess } from "../auth/rbac";
import { Pencil, Trash2 } from "lucide-react";

type Role = {
  id: string;
  name: string;
  permissions: any;
};

const SYSTEM_ROLES = ["ADMIN", "SUPER_ADMIN", "USER", "ARTIST", "AUTHOR", "CREATOR"];

export default function Roles() {
  const qc = useQueryClient();
  const { user, permissions: authPermissions } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Role | null>(null);
  const [name, setName] = useState("");
  const [permissions, setPermissions] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["roles"],
    queryFn: async () => (await api.get("/roles")).data as Role[],
  });
  const permQuery = useQuery({
    queryKey: ["permissions"],
    queryFn: async () =>
      (await api.get("/permissions")).data as any[],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: { name: string; permissions: string[] }) => {
      if (editing)
        return (await api.patch(`/roles/${editing.id}`, payload)).data;
      return (await api.post("/roles", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setShowForm(false);
      setEditing(null);
      setName("");
      setPermissions("");
      toast.success(editing ? "Rôle mis à jour" : "Rôle créé");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Échec d'enregistrement du rôle"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/roles/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["roles"] });
      setDeleteTarget(null);
      toast.success("Rôle supprimé");
    },
    onError: (err: any) => toast.error(err?.response?.data?.message || "Échec de suppression du rôle"),
  });

  const openCreate = () => {
    setEditing(null);
    setName("");
    setPermissions("");
    setShowForm(true);
  };
  const openEdit = (r: Role) => {
    setEditing(r);
    setName(r.name);
    const pids = (r.permissions as any[])?.map((p) => p.id) || [];
    setPermissions(pids.join(","));
    setShowForm(true);
  };
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim().toUpperCase();
    if (!cleanName) {
      toast.error("Le nom du rôle est obligatoire");
      return;
    }
    if (!editing && SYSTEM_ROLES.includes(cleanName)) {
      toast.error(`"${cleanName}" est un rôle système réservé.`);
      return;
    }
    const pids = permissions
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    saveMutation.mutate({ name: cleanName, permissions: pids });
  };

  const filtered = useMemo(() => {
    const list = data || [];
    return list.filter((r) =>
      r.name.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);
  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const roleName =
    typeof user?.role === "string" ? user?.role : (user as any)?.role?.name;
  const canCreate = canAccess(
    roleName,
    authPermissions as any,
    "create",
    "role",
  );
  const canUpdate = canAccess(
    roleName,
    authPermissions as any,
    "update",
    "role",
  );
  const canDelete = canAccess(
    roleName,
    authPermissions as any,
    "delete",
    "role",
  );

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Rôles & Droits</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher un rôle…"
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
                    <th className="p-2">Nom</th>
                    <th className="p-2">Droits</th>
                    <th className="p-2 text-right min-w-[100px]">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pageItems?.map((r) => {
                    const isSystem = SYSTEM_ROLES.includes(r.name.toUpperCase());
                    return (
                      <tr key={r.id} className="border-b">
                        <td className="p-2 font-medium">
                          <div className="flex items-center gap-2">
                            <span>{r.name}</span>
                            {isSystem && (
                              <span className="text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full font-bold uppercase">
                                Système
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-2 text-xs text-muted-foreground max-w-xl truncate">
                          {(Array.isArray(r.permissions) ? r.permissions : [])
                            .map((p: any) => `${p.action}:${p.resource}`)
                            .join(", ") || (isSystem ? "Accès standard du rôle système" : "—")}
                        </td>
                        <td className="p-2 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                            {isSystem ? (
                              <span className="text-xs text-muted-foreground italic px-2">Verrouillé</span>
                            ) : (
                              <>
                                {canUpdate && (
                                  <Button
                                    variant="outline"
                                    size="icon"
                                    className="h-8 w-8 hover:border-amber-400 hover:text-amber-400"
                                    onClick={() => openEdit(r)}
                                    title="Éditer les droits du rôle"
                                  >
                                    <Pencil className="w-4 h-4" />
                                  </Button>
                                )}
                                {canDelete && (
                                  <Button
                                    variant="destructive"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => setDeleteTarget(r)}
                                    title="Supprimer le rôle"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                )}
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
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
          {showForm && (
            <form onSubmit={onSubmit} className="mt-6 grid gap-4">
              <div className="grid sm:grid-cols-2 gap-3">
                <Input
                  placeholder="Nom du rôle"
                  value={name}
                  onChange={(e) => setName(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {["song", "video", "album", "artist", "genre", "user", "role"].map(
                  (res) => (
                    <div key={res} className="border rounded-md p-3">
                      <div className="font-medium mb-2 uppercase text-xs tracking-wider text-muted-foreground font-bold">
                        {res === "song" ? "Song / Musiques" : res === "video" ? "Video / Vidéos" : res}
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        {ALL_PERMISSIONS.filter((p) => p.resource === res).map(
                          (p) => {
                            const key = `${p.action}:${p.resource}`;
                            // Find ID from DB if available
                            const checked = permissions
                              .split(",")
                              .map((s) => s.trim())
                              .includes(key);
                            return (
                              (permQuery.data as any[])?.find(
                                (dp) =>
                                  dp.action === p.action &&
                                  dp.resource === p.resource,
                              ) && (
                                <label
                                  key={key}
                                  className="flex items-center gap-2 text-sm"
                                >
                                  <input
                                    type="checkbox"
                                    checked={checked}
                                    onChange={(e) => {
                                      const set = new Set(
                                        permissions
                                          .split(",")
                                          .map((s) => s.trim())
                                          .filter(Boolean),
                                      );
                                      if (e.target.checked) set.add(key);
                                      else set.delete(key);
                                      setPermissions(Array.from(set).join(","));
                                    }}
                                  />
                                  <span>{p.action}</span>
                                </label>
                              )
                            );
                          },
                        )}
                      </div>
                    </div>
                  ),
                )}
              </div>
              <div className="flex gap-2">
                <Button type="submit" loading={saveMutation.isPending}>
                  {saveMutation.isPending ? "Enregistrement…" : "Enregistrer"}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditing(null);
                  }}
                >
                  Annuler
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Supprimer le rôle "${deleteTarget?.name}" ?`}
        description="Voulez-vous vraiment supprimer ce rôle ? Les utilisateurs associés perdronnt ces permissions."
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
