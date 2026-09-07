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
import { Label } from "../components/ui/label";
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { Select } from "../components/ui/select";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";
import { Pencil, Trash2 } from "lucide-react";

type AppUser = {
  id: string;
  email: string;
  name?: string;
  role: any;
  systemRoles?: string[];
};

type UserPayload = {
  email?: string;
  name?: string;
  role?: string;
  systemRoles?: string[];
  password?: string;
  birthDate?: string;
  country?: string;
  gender?: string;
};

export default function Users() {
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<AppUser | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<AppUser | null>(null);
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState("USER");
  const [password, setPassword] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [country, setCountry] = useState("");
  const [gender, setGender] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const { data, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => (await api.get("/users")).data as AppUser[],
  });
  const rolesQuery = useQuery({
    queryKey: ["roles"],
    queryFn: async () =>
      (await api.get("/roles")).data as { id: string; name: string }[],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: UserPayload) => {
      if (editing) return (await api.patch(`/users/${editing.id}`, payload)).data;
      return (await api.post("/users", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      setShowForm(false);
      setEditing(null);
      setEmail("");
      setName("");
      setRole("USER");
      setPassword("");
      setBirthDate("");
      setCountry("");
      setGender("");
      toast.success(editing ? "Utilisateur mis à jour" : "Utilisateur créé");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Échec d'enregistrement de l'utilisateur"),
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/users/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      setDeleteTarget(null);
      toast.success("Utilisateur supprimé");
    },
    onError: (err: any) =>
      toast.error(err?.response?.data?.message || "Échec de suppression de l'utilisateur"),
  });

  const openCreate = () => {
    setEditing(null);
    setEmail("");
    setName("");
    setRole("USER");
    setPassword("");
    setShowForm(true);
  };
  const openEdit = (u: AppUser) => {
    setEditing(u);
    setEmail(u.email);
    setName(u.name || "");
    const currentRole = u.role?.name ?? u.role;
    setRole(currentRole);
    setPassword("");
    setShowForm(true);
  };
  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const roleName = role.toUpperCase();
    const systemRoles = ["ADMIN", "SUPER_ADMIN", "ARTIST", "AUTHOR", "CREATOR", "ACADEMIC", "USER"].includes(roleName)
      ? [roleName]
      : [];

    if (editing) {
      saveMutation.mutate({
        email,
        name,
        role: roleName,
        systemRoles,
        ...(password.trim() ? { password: password.trim() } : {}),
      });
    } else {
      saveMutation.mutate({
        email,
        name,
        password,
        role: roleName,
        systemRoles,
        ...(roleName === "CREATOR" || roleName === "ARTIST"
          ? { birthDate, country, gender }
          : {}),
      });
    }
  };

  const filtered = useMemo(() => {
    const list = data || [];
    return list.filter((u) =>
      `${u.email} ${u.name || ""}`.toLowerCase().includes(search.toLowerCase()),
    );
  }, [data, search]);
  const totalPages = Math.max(1, Math.ceil((filtered?.length || 0) / pageSize));
  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page]);

  const roleName =
    typeof user?.role === "string" ? user?.role : (user as any)?.role?.name;
  const canCreate = canAccess(roleName, permissions, "create", "user");
  const canUpdate = canAccess(roleName, permissions, "update", "user");
  const canDelete = canAccess(roleName, permissions, "delete", "user");
  const showActions = canUpdate || canDelete;

  const isCurrentUserSuperAdmin =
    (user as any)?.role === "SUPER_ADMIN" ||
    (user as any)?.role?.name === "SUPER_ADMIN" ||
    (user as any)?.systemRoles?.includes("SUPER_ADMIN") ||
    user?.email?.toLowerCase() === "bassahakjm@gmail.com";

  return (
    <div className="p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Utilisateurs</CardTitle>
          <div className="flex gap-2">
            <Input
              placeholder="Rechercher un utilisateur…"
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
                    <th className="p-2">Email</th>
                    <th className="p-2">Nom</th>
                    <th className="p-2">Rôle(s)</th>
                    {showActions && <th className="p-2 text-right min-w-[100px]">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {pageItems?.map((u) => {
                    const targetRoleName = (u.role?.name ?? u.role)?.toUpperCase();
                    const isTargetSuperAdmin =
                      targetRoleName === "SUPER_ADMIN" ||
                      (u.systemRoles || []).map((r) => r.toUpperCase()).includes("SUPER_ADMIN") ||
                      u.email.toLowerCase() === "bassahakjm@gmail.com";

                    const isTargetAdmin =
                      targetRoleName === "ADMIN" ||
                      (u.systemRoles || []).map((r) => r.toUpperCase()).includes("ADMIN");

                    const canDeleteTarget =
                      canDelete &&
                      !isTargetSuperAdmin &&
                      (!isTargetAdmin || isCurrentUserSuperAdmin);

                    const canEditTarget =
                      canUpdate &&
                      (!isTargetSuperAdmin || isCurrentUserSuperAdmin);

                    return (
                      <tr key={u.id} className="border-b">
                        <td className="p-2 font-medium">{u.email}</td>
                        <td className="p-2">{u.name || "—"}</td>
                        <td className="p-2">
                          <div className="flex flex-wrap gap-1 items-center">
                            {isTargetSuperAdmin ? (
                              <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold bg-amber-500 text-black shadow-sm">
                                SUPER ADMIN
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-primary/10 text-primary border border-primary/20">
                                {u.role?.name ?? u.role}
                              </span>
                            )}
                            {(u.systemRoles || [])
                              .filter(
                                (sr) =>
                                  sr.toUpperCase() !== "SUPER_ADMIN" &&
                                  sr !== (u.role?.name ?? u.role),
                              )
                              .map((sr) => (
                                <span
                                  key={sr}
                                  className="inline-flex items-center rounded-full px-1.5 py-0.2 text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/20"
                                >
                                  {sr}
                                </span>
                              ))}
                          </div>
                        </td>
                        {showActions && (
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              {canEditTarget ? (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  className="h-8 w-8 hover:border-amber-400 hover:text-amber-400"
                                  onClick={() => openEdit(u)}
                                  title="Éditer l'utilisateur"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              ) : null}
                              {canDeleteTarget ? (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  className="h-8 w-8"
                                  onClick={() => setDeleteTarget(u)}
                                  title="Supprimer l'utilisateur"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              ) : null}
                            </div>
                          </td>
                        )}
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
          <Dialog
            open={showForm}
            onOpenChange={setShowForm}
            title={
              editing ? "Mettre à jour un utilisateur" : "Nouvel utilisateur"
            }
          >
            <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2 space-y-2">
                <Label>Email</Label>
                <Input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Nom</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>
                  Mot de passe{" "}
                  {editing && (
                    <span className="text-[11px] text-muted-foreground font-normal">
                      (facultatif)
                    </span>
                  )}
                </Label>
                <Input
                  type="password"
                  placeholder={
                    editing
                      ? "Laisser vide pour ne pas changer"
                      : "Entrez un mot de passe"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required={!editing}
                />
              </div>
              <div className="space-y-2">
                <Label>Rôle</Label>
                <Select
                  options={[
                    { value: "", label: "— Choisir un rôle —" },
                    { value: "ADMIN", label: "ADMIN (Système - Administration)" },
                    { value: "ARTIST", label: "ARTIST (Système - Chanteur / Interprète)" },
                    { value: "AUTHOR", label: "AUTHOR (Système - Auteur / Écrivain)" },
                    { value: "CREATOR", label: "CREATOR (Système - Vidéaste / Chaîne)" },
                    { value: "ACADEMIC", label: "ACADEMIC (Système - Formateur / Enseignant)" },
                    { value: "USER", label: "USER (Système - Auditeur / Public)" },
                    ...(rolesQuery.data || [])
                      .filter(
                        (r) =>
                          !["SUPER_ADMIN", "ADMIN", "ARTIST", "AUTHOR", "CREATOR", "ACADEMIC", "USER"].includes(
                            r.name.toUpperCase(),
                          ),
                      )
                      .map((r) => ({
                        value: r.name,
                        label: `${r.name} (Personnalisé)`,
                      })),
                  ]}
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                />
              </div>

              {(role.toUpperCase() === "CREATOR" || role.toUpperCase() === "ARTIST") && !editing && (
                <>
                  <div className="space-y-2">
                    <Label>Date de naissance</Label>
                    <Input
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Pays</Label>
                    <Input
                      placeholder="Ex: Cameroun"
                      value={country}
                      onChange={(e) => setCountry(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Select
                      options={[
                        { value: "", label: "Non spécifié" },
                        { value: "MALE", label: "Homme" },
                        { value: "FEMALE", label: "Femme" },
                        { value: "OTHER", label: "Autre" },
                      ]}
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    />
                  </div>
                </>
              )}

              <div className="flex gap-2 sm:col-span-2">
                <Button type="submit" loading={saveMutation.isPending}>
                  {saveMutation.isPending
                    ? editing
                      ? "Mise à jour…"
                      : "Création…"
                    : editing
                    ? "Mettre à jour"
                    : "Créer"}
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
          </Dialog>

          <ConfirmDialog
            open={!!deleteTarget}
            onOpenChange={(open) => !open && setDeleteTarget(null)}
            title={`Supprimer l'utilisateur "${deleteTarget?.email}" ?`}
            description="Voulez-vous vraiment supprimer cet utilisateur ? Ses données d'accès seront définitivement révoquées."
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
