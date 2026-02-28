import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";
import { Dialog } from "../components/ui/dialog";
import { Pencil, Trash2, Plus, Tag } from "lucide-react";

type Genre = {
  id: string;
  name: string;
  isSystem: boolean;
  _count?: {
    songs: number;
  };
};

export default function Genres() {
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Genre | null>(null);
  const [search, setSearch] = useState("");

  const schema = z.object({
    name: z.string().min(1, "Le nom est requis"),
    isSystem: z.boolean().default(false),
  });

  type FormValues = z.infer<typeof schema>;

  const form = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: "",
      isSystem: false,
    },
  });

  const { data: genres, isLoading } = useQuery({
    queryKey: ["genres"],
    queryFn: async () => (await api.get("/genres")).data as Genre[],
  });

  const saveMutation = useMutation({
    mutationFn: async (payload: FormValues) => {
      if (editing) {
        return (await api.patch(`/genres/${editing.id}`, payload)).data;
      }
      return (await api.post("/genres", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["genres"] });
      setShowForm(false);
      setEditing(null);
      form.reset();
      toast.success(editing ? "Genre mis à jour" : "Genre créé");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Échec de sauvegarde du genre";
      toast.error(message);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return (await api.delete(`/genres/${id}`)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["genres"] });
      toast.success("Genre supprimé");
    },
    onError: (error: any) => {
      const message =
        error.response?.data?.message || "Échec de suppression du genre";
      toast.error(message);
    },
  });

  const onSubmit = (values: FormValues) => {
    saveMutation.mutate(values);
  };

  const handleEdit = (genre: Genre) => {
    setEditing(genre);
    form.reset({
      name: genre.name,
      isSystem: genre.isSystem,
    });
    setShowForm(true);
  };

  const handleDelete = (genre: Genre) => {
    if (
      window.confirm(
        `Êtes-vous sûr de vouloir supprimer le genre "${genre.name}" ?`,
      )
    ) {
      deleteMutation.mutate(genre.id);
    }
  };

  const filteredGenres = genres?.filter((g) =>
    g.name.toLowerCase().includes(search.toLowerCase()),
  );

  const roleName =
    typeof user?.role === "string" ? user?.role : (user as any)?.role?.name;
  const canManage = canAccess(roleName, permissions, "manage", "genre");

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Genres Musicaux</h1>
          <p className="text-muted-foreground">
            Gérez les genres musicaux disponibles sur la plateforme.
          </p>
        </div>
        {canManage && (
          <Button
            onClick={() => {
              setEditing(null);
              form.reset();
              setShowForm(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" /> Nouveau Genre
          </Button>
        )}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Liste des Genres</CardTitle>
            <div className="w-64">
              <Input
                placeholder="Rechercher un genre..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center">Chargement...</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredGenres?.map((genre) => (
                <div
                  key={genre.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <Tag className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{genre.name}</p>
                      {genre.isSystem && (
                        <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded uppercase font-bold">
                          Système
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    {canManage && (
                      <>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleEdit(genre)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => handleDelete(genre)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              ))}
              {filteredGenres?.length === 0 && (
                <div className="col-span-full py-10 text-center text-muted-foreground">
                  Aucun genre trouvé.
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>
                {editing ? "Modifier le genre" : "Nouveau genre"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={form.handleSubmit(onSubmit as any)}
                className="space-y-4"
              >
                <div className="space-y-2">
                  <label className="text-sm font-medium">Nom du genre</label>
                  <Input
                    {...form.register("name")}
                    placeholder="ex: Afro-Jazz, Makossa..."
                  />
                  {form.formState.errors.name && (
                    <p className="text-xs text-destructive">
                      {form.formState.errors.name.message}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2 pt-2">
                  <input
                    type="checkbox"
                    id="isSystem"
                    {...form.register("isSystem")}
                    disabled={roleName !== "ADMIN"}
                    className="rounded border-gray-300 text-primary focus:ring-primary disabled:opacity-50"
                  />
                  <label
                    htmlFor="isSystem"
                    className={`text-sm ${roleName !== "ADMIN" ? "text-muted-foreground" : ""}`}
                  >
                    Genre système (réservé à l'administration)
                  </label>
                </div>

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowForm(false)}
                  >
                    Annuler
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending
                      ? "Enregistrement..."
                      : "Enregistrer"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      </Dialog>
    </div>
  );
}
