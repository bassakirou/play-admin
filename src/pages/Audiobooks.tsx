import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { MediaSpecificationsDialog } from "../components/ui/media-specifications-dialog";
import { CreatableOption } from "../components/ui/creatable-combobox";
import { CreateAudiobookModal } from "@pyramidplay/ui";
import {
  BookHeadphones,
  Plus,
  Search,
  Pencil,
  Trash2,
  ListMusic,
  Clock,
  UserCheck,
  Layers,
  Flame,
  BookOpen,
  HelpCircle,
} from "lucide-react";

type AudiobookChapter = {
  id: string;
  audiobookId: string;
  title: string;
  duration: number;
  startAt: number;
  audioUrl?: string;
  order: number;
  text?: string;
  audioSource?: "HUMAN" | "TTS";
  status?: "READY" | "PENDING" | "PROCESSING" | "FAILED";
  timestamps?: any;
  createdAt: string;
};

type Audiobook = {
  id: string;
  title: string;
  author: string;
  authorId?: string | null;
  authorUser?: { id: string; name: string; email: string } | null;
  narrator?: string | null;
  description?: string | null;
  coverUrl?: string | null;
  duration: number;
  category: string;
  rating: number;
  totalReviews: number;
  isTrending: boolean;
  isNew: boolean;
  createdAt: string;
  chapters?: AudiobookChapter[];
};

const CATEGORIES = [
  "Tous",
  "Roman & Fiction",
  "Développement personnel",
  "Histoire & Culture",
  "Tradition & Contes",
  "Business & Finance",
  "Spiritualité",
  "Poésie & Théâtre",
  "Jeunesse",
  "Général",
];

function formatDuration(sec: number) {
  if (!sec || isNaN(sec)) return "0 min";
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) {
    return `${h} h ${m.toString().padStart(2, "0")} min`;
  }
  return `${m} min ${s.toString().padStart(2, "0")} s`;
}

export default function Audiobooks() {
  const qc = useQueryClient();
  const { user, token, permissions } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modals state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showMediaGuide, setShowMediaGuide] = useState(false);
  const [editingBook, setEditingBook] = useState<Audiobook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Audiobook | null>(null);

  // Permissions
  const roleName = typeof user?.role === "string" ? user?.role : user?.role?.name;
  const canCreate = canAccess(roleName, permissions, "create", "audiobook");
  const canUpdate = canAccess(roleName, permissions, "update", "audiobook");
  const canDelete = canAccess(roleName, permissions, "delete", "audiobook");

  // Query: Audiobooks list
  const { data: audiobooks = [], isLoading } = useQuery<Audiobook[]>({
    queryKey: ["admin_audiobooks", selectedCategory, search],
    queryFn: async () => {
      const params: Record<string, string> = {};
      if (selectedCategory !== "Tous") params.category = selectedCategory;
      if (search.trim()) params.search = search.trim();
      const res = await api.get("/audiobooks", { params });
      return res.data;
    },
  });

  // Query: Authors list (registered users with AUTHOR role + audiobook authors)
  const { data: authors = [] } = useQuery<{ name: string; authorId?: string; count?: number }[]>({
    queryKey: ["audiobook_authors"],
    queryFn: async () => {
      const res = await api.get("/audiobooks/authors");
      return res.data;
    },
  });

  // Query: Users with AUTHOR role
  const { data: authorUsers = [] } = useQuery<{ id: string; name: string; email: string }[]>({
    queryKey: ["author_users"],
    queryFn: async () => {
      const res = await api.get("/users/authors");
      return res.data;
    },
  });

  // Combine author options for Select2 CreatableCombobox
  const authorOptions: CreatableOption[] = useMemo(() => {
    const map = new Map<string, CreatableOption>();

    for (const u of authorUsers) {
      map.set(u.name.toLowerCase(), {
        value: u.id,
        label: u.name,
        sublabel: "Membre auteur",
        isUser: true,
      });
    }

    for (const a of authors) {
      const key = a.name.toLowerCase();
      if (!map.has(key)) {
        map.set(key, {
          value: a.authorId || a.name,
          label: a.name,
          sublabel: a.authorId ? "Membre auteur" : "Auteur externe",
          isUser: !!a.authorId,
        });
      }
    }

    return Array.from(map.values());
  }, [authorUsers, authors]);

  // Delete Audiobook Mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      return api.delete(`/audiobooks/${id}`);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_audiobooks"] });
      qc.invalidateQueries({ queryKey: ["audiobook_authors"] });
      toast.success("Livre audio supprimé avec succès");
      setDeleteTarget(null);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Erreur lors de la suppression",
      );
    },
  });

  // Statistics calculation

  // Statistics calculation
  const totalBooks = audiobooks.length;
  const totalDurationSeconds = audiobooks.reduce((acc, b) => acc + (b.duration || 0), 0);
  const totalChaptersCount = audiobooks.reduce((acc, b) => acc + (b.chapters?.length || 0), 0);
  const trendingCount = audiobooks.filter((b) => b.isTrending).length;

  // Filtered & Paginated
  const filtered = useMemo(() => {
    return audiobooks.filter((b) => {
      const matchesCat =
        selectedCategory === "Tous" ||
        b.category?.toLowerCase() === selectedCategory.toLowerCase();
      const matchesSearch =
        !search.trim() ||
        b.title.toLowerCase().includes(search.toLowerCase()) ||
        b.author.toLowerCase().includes(search.toLowerCase()) ||
        (b.narrator && b.narrator.toLowerCase().includes(search.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [audiobooks, selectedCategory, search]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <BookHeadphones className="w-7 h-7 text-indigo-500" />
            Livres Audio & Récits
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catalogue des livres audio, gestion des chapitres ordonnés, narration humaine & voix de synthèse TTS.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMediaGuide(true)}
            className="gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <span>Guide Formats 10:16</span>
          </Button>

          {canCreate && (
            <Button
              onClick={() => {
                setEditingBook(null);
                setShowCreateModal(true);
              }}
              className="gap-2 shrink-0 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold shadow-lg shadow-indigo-600/20"
            >
              <Plus className="w-4 h-4" />
              Nouveau Livre Audio
            </Button>
          )}
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="bg-gradient-to-br from-indigo-950/20 to-slate-900 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Total Livres</p>
              <h3 className="text-2xl font-extrabold text-foreground mt-0.5">{totalBooks}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
              <BookOpen className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-950/20 to-slate-900 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Heures de Récits</p>
              <h3 className="text-2xl font-extrabold text-purple-400 mt-0.5">
                {formatDuration(totalDurationSeconds)}
              </h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-emerald-950/20 to-slate-900 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">Chapitres Actifs</p>
              <h3 className="text-2xl font-extrabold text-emerald-400 mt-0.5">{totalChaptersCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-amber-950/20 to-slate-900 border-border/80">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-xs text-muted-foreground font-medium">En Tendance</p>
              <h3 className="text-2xl font-extrabold text-amber-400 mt-0.5">{trendingCount}</h3>
            </div>
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <Flame className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Search Bar */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <div className="flex flex-col gap-3 md:flex-row md:items-center">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Rechercher par titre, auteur, narrateur..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                className="pl-9"
              />
            </div>

            {/* Category Select */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  onClick={() => {
                    setSelectedCategory(cat);
                    setPage(1);
                  }}
                  className={`px-3 py-1.5 text-xs rounded-xl font-medium transition-all whitespace-nowrap ${
                    selectedCategory === cat
                      ? "bg-indigo-600 text-white shadow-sm font-semibold"
                      : "bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Audiobooks Grid */}
      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={i}
              className="h-80 rounded-2xl bg-muted/40 animate-pulse border"
            />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Aucun livre audio trouvé</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Aucun livre audio ne correspond à vos filtres. Créez un nouveau livre audio pour enrichir la bibliothèque.
            </p>
            {canCreate && (
              <Button
                onClick={() => {
                  setEditingBook(null);
                  setShowCreateModal(true);
                }}
                className="gap-2 mt-2 bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                <Plus className="w-4 h-4" />
                Créer un livre audio
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {paginated.map((book) => (
            <Card
              key={book.id}
              className="overflow-hidden group hover:shadow-xl transition-all flex flex-col justify-between border-border/80 hover:border-indigo-500/40"
            >
              <div>
                {/* Cover 10:16 aspect */}
                <div className="relative aspect-[10/16] bg-slate-950 overflow-hidden">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-indigo-950/40 to-slate-900 text-indigo-400 p-4">
                      <BookHeadphones className="w-12 h-12 mb-2 opacity-80" />
                      <span className="text-xs font-semibold text-center line-clamp-2">
                        {book.title}
                      </span>
                    </div>
                  )}

                  {/* Badges */}
                  <div className="absolute top-2 left-2 flex flex-col gap-1">
                    {book.isTrending && (
                      <span className="flex items-center gap-1 bg-amber-500 text-black text-[10px] font-bold px-2 py-0.5 rounded-full shadow">
                        <Flame className="w-3 h-3 fill-black" /> Tendance
                      </span>
                    )}
                    <span className="bg-black/70 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full">
                      {book.category}
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/80 backdrop-blur-md text-white text-[11px] font-mono px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3 text-indigo-400" />
                    {formatDuration(book.duration)}
                  </div>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h3 className="font-bold text-sm line-clamp-1 leading-snug" title={book.title}>
                    {book.title}
                  </h3>

                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground truncate">
                    {book.authorId && (
                      <span title="Auteur membre vérifié">
                        <UserCheck className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                      </span>
                    )}
                    <span className="truncate font-medium text-foreground">
                      {book.author}
                    </span>
                  </div>

                  {book.narrator && (
                    <div className="text-[11px] text-muted-foreground truncate">
                      Voix : <span className="text-foreground">{book.narrator}</span>
                    </div>
                  )}

                  <div className="pt-2 flex items-center justify-between text-xs text-muted-foreground border-t">
                    <span className="flex items-center gap-1">
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      {book.chapters?.length || 0} chapitres
                    </span>
                    <span>⭐ {book.rating?.toFixed(1) || "5.0"}</span>
                  </div>
                </div>
              </div>

              {/* Actions Footer */}
              <div className="p-3 pt-0 flex items-center gap-1.5 border-t bg-muted/10">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    setEditingBook(book);
                    setShowCreateModal(true);
                  }}
                  className="flex-1 text-xs gap-1.5 h-8 border-indigo-500/30 hover:bg-indigo-500/10 hover:text-indigo-300"
                  title="Gérer les chapitres & modifier"
                >
                  <ListMusic className="w-3.5 h-3.5 text-indigo-400" />
                  Chapitres ({book.chapters?.length || 0})
                </Button>

                {canUpdate && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      setEditingBook(book);
                      setShowCreateModal(true);
                    }}
                    className="h-8 w-8 p-0"
                    title="Modifier"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setDeleteTarget(book)}
                    className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                    title="Supprimer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-4">
          <Button
            variant="outline"
            size="sm"
            disabled={page === 1}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
          >
            Précédent
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page === totalPages}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* Global Universal Create/Edit Audiobook Modal */}
      <CreateAudiobookModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingBook(null);
        }}
        onSuccess={() => {
          qc.invalidateQueries({ queryKey: ["admin_audiobooks"] });
          qc.invalidateQueries({ queryKey: ["audiobook_authors"] });
        }}
        editingAudiobook={editingBook}
        currentUser={user}
        token={token}
        authorOptions={authorOptions}
        apiBaseUrl={api.defaults.baseURL || import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || "http://localhost:3022"}
        onSubmitOverride={async (payload, isEditing, bookId) => {
          if (isEditing && bookId) {
            await api.put(`/audiobooks/${bookId}`, payload);
          } else {
            await api.post(`/audiobooks`, payload);
          }
        }}
      />

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null);
        }}
        title="Supprimer le livre audio"
        description={`Êtes-vous sûr de vouloir supprimer définitivement "${deleteTarget?.title}" et tous ses chapitres audio associés ? Cette action est irréversible.`}
        confirmText="Supprimer"
        variant="destructive"
        onConfirm={() => {
          if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
        }}
        loading={deleteMutation.isPending}
      />

      {/* Media Specifications Dialog */}
      <MediaSpecificationsDialog
        open={showMediaGuide}
        onOpenChange={setShowMediaGuide}
        defaultSection="audiobooks"
      />
    </div>
  );
}
