import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import {
  Card,
  CardContent,
} from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { useAuth } from "../auth/AuthContext";
import { canAccess } from "../auth/rbac";
import { Dialog } from "../components/ui/dialog";
import { ConfirmDialog } from "../components/ui/confirm-dialog";
import { ImageDropzone } from "../components/ui/image-dropzone";
import { CreatableCombobox, CreatableOption } from "../components/ui/creatable-combobox";
import { FileDropzone } from "../components/ui/file-dropzone";
import { Switch } from "../components/ui/switch";
import {
  BookHeadphones,
  Plus,
  Search,
  Pencil,
  Trash2,
  ListMusic,
  Clock,
  UserCheck,
  Play,
  Pause,
  Layers,
  Flame,
  BookOpen,
  HelpCircle,
} from "lucide-react";
import { MediaSpecificationsDialog } from "../components/ui/media-specifications-dialog";

type AudiobookChapter = {
  id: string;
  audiobookId: string;
  title: string;
  duration: number;
  startAt: number;
  audioUrl?: string;
  order: number;
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
  "Général",
  "Roman & Fiction",
  "Développement personnel",
  "Histoire & Culture",
  "Tradition & Contes",
  "Business & Finance",
  "Spiritualité",
  "Poésie & Théâtre",
  "Jeunesse",
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
  const { user, permissions } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Tous");
  const [page, setPage] = useState(1);
  const pageSize = 12;

  // Modals state
  const [showForm, setShowForm] = useState(false);
  const [showMediaGuide, setShowMediaGuide] = useState(false);
  const [editingBook, setEditingBook] = useState<Audiobook | null>(null);
  const [managingChaptersBook, setManagingChaptersBook] = useState<Audiobook | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Audiobook | null>(null);

  // Audio preview player
  const [playingChapterId, setPlayingChapterId] = useState<string | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);

  // Author selection in form
  const [isSelfAuthor, setIsSelfAuthor] = useState(false);
  const [authorName, setAuthorName] = useState("");
  const [authorId, setAuthorId] = useState<string | undefined>(undefined);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverUrl, setCoverUrl] = useState<string>("");

  // Chapter creation in chapter modal
  const [chapterTitle, setChapterTitle] = useState("");
  const [chapterFile, setChapterFile] = useState<File | null>(null);
  const [chapterDuration, setChapterDuration] = useState<number>(0);
  const [isUploadingChapter, setIsUploadingChapter] = useState(false);

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

    // 1. Registered AUTHOR users
    for (const u of authorUsers) {
      map.set(u.name.toLowerCase(), {
        value: u.id,
        label: u.name,
        sublabel: "Membre auteur",
        isUser: true,
      });
    }

    // 2. Authors from existing audiobooks
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

  // Form setup
  const schema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    category: z.string().min(1, "La catégorie est requise"),
    narrator: z.string().optional().or(z.literal("")),
    description: z.string().optional().or(z.literal("")),
    isTrending: z.boolean(),
  });

  type FormValues = {
    title: string;
    category: string;
    narrator?: string;
    description?: string;
    isTrending: boolean;
  };

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      title: "",
      category: "Général",
      narrator: "",
      description: "",
      isTrending: false,
    },
  });

  // Open Create Dialog
  const handleOpenCreate = () => {
    setEditingBook(null);
    setIsSelfAuthor(false);
    setAuthorName("");
    setAuthorId(undefined);
    setCoverFile(null);
    setCoverUrl("");
    reset({
      title: "",
      category: "Général",
      narrator: "",
      description: "",
      isTrending: false,
    });
    setShowForm(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (book: Audiobook) => {
    setEditingBook(book);
    const self = !!(book.authorId && user?.id && book.authorId === user.id);
    setIsSelfAuthor(self);
    setAuthorName(book.author);
    setAuthorId(book.authorId || undefined);
    setCoverFile(null);
    setCoverUrl(book.coverUrl || "");
    reset({
      title: book.title,
      category: book.category || "Général",
      narrator: book.narrator || "",
      description: book.description || "",
      isTrending: book.isTrending || false,
    });
    setShowForm(true);
  };

  // Toggle "Je suis moi-même l'auteur"
  const handleToggleSelfAuthor = (checked: boolean) => {
    setIsSelfAuthor(checked);
    if (checked && user) {
      setAuthorName(user.name || "");
      setAuthorId(user.id);
    } else {
      setAuthorId(undefined);
      if (editingBook && !checked) {
        setAuthorName(editingBook.author || "");
      } else {
        setAuthorName("");
      }
    }
  };

  // Create / Update Audiobook Mutation
  const saveMutation = useMutation({
    mutationFn: async (data: FormValues) => {
      let finalCoverUrl = coverUrl;

      // Upload cover file if selected
      if (coverFile) {
        const formData = new FormData();
        formData.append("file", coverFile);
        const uploadRes = await api.post("/files/upload-image", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
        finalCoverUrl = uploadRes.data?.url || uploadRes.data?.fileUrl || finalCoverUrl;
      }

      const payload = {
        title: data.title,
        author: (authorName || user?.name || "Auteur").trim(),
        authorId: authorId || null,
        narrator: data.narrator ? data.narrator.trim() : null,
        description: data.description ? data.description.trim() : null,
        coverUrl: finalCoverUrl || null,
        category: data.category || "Général",
        isTrending: data.isTrending,
      };

      if (editingBook) {
        return api.put(`/audiobooks/${editingBook.id}`, payload);
      } else {
        return api.post("/audiobooks", payload);
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin_audiobooks"] });
      qc.invalidateQueries({ queryKey: ["audiobook_authors"] });
      toast.success(
        editingBook
          ? "Livre audio modifié avec succès"
          : "Nouveau livre audio créé avec succès",
      );
      setShowForm(false);
    },
    onError: (err: any) => {
      toast.error(
        err.response?.data?.message || "Erreur lors de l'enregistrement",
      );
    },
  });

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

  // Add Chapter to Audiobook
  const handleAddChapter = async () => {
    if (!managingChaptersBook) return;
    if (!chapterTitle.trim()) {
      toast.error("Veuillez saisir le titre du chapitre");
      return;
    }
    if (!chapterFile) {
      toast.error("Veuillez sélectionner un fichier audio pour ce chapitre");
      return;
    }

    setIsUploadingChapter(true);
    try {
      // 1. Upload audio file
      const formData = new FormData();
      formData.append("file", chapterFile);
      const uploadRes = await api.post("/files/upload-audio", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const audioUrl = uploadRes.data?.url || uploadRes.data?.fileUrl;

      // 2. Post chapter
      await api.post(`/audiobooks/${managingChaptersBook.id}/chapters`, {
        title: chapterTitle.trim(),
        duration: chapterDuration || 0,
        audioUrl,
      });

      toast.success("Chapitre ajouté avec succès");
      setChapterTitle("");
      setChapterFile(null);
      setChapterDuration(0);

      // Refresh book data
      const updatedRes = await api.get(`/audiobooks/${managingChaptersBook.id}`);
      setManagingChaptersBook(updatedRes.data);
      qc.invalidateQueries({ queryKey: ["admin_audiobooks"] });
    } catch (err: any) {
      toast.error(
        err.response?.data?.message || "Erreur lors de l'ajout du chapitre",
      );
    } finally {
      setIsUploadingChapter(false);
    }
  };

  // Delete Chapter
  const handleDeleteChapter = async (chapterId: string) => {
    if (!managingChaptersBook) return;
    try {
      await api.delete(
        `/audiobooks/${managingChaptersBook.id}/chapters/${chapterId}`,
      );
      toast.success("Chapitre supprimé");
      const updatedRes = await api.get(`/audiobooks/${managingChaptersBook.id}`);
      setManagingChaptersBook(updatedRes.data);
      qc.invalidateQueries({ queryKey: ["admin_audiobooks"] });
    } catch (err: any) {
      toast.error("Erreur lors de la suppression du chapitre");
    }
  };

  // Toggle chapter audio preview playback
  const togglePlayAudio = (chapter: AudiobookChapter) => {
    if (!chapter.audioUrl) {
      toast.error("Aucun fichier audio disponible pour ce chapitre");
      return;
    }

    if (playingChapterId === chapter.id) {
      audioElement?.pause();
      setPlayingChapterId(null);
      return;
    }

    if (audioElement) {
      audioElement.pause();
    }

    const audio = new Audio(chapter.audioUrl);
    audio.play();
    audio.onended = () => setPlayingChapterId(null);
    setAudioElement(audio);
    setPlayingChapterId(chapter.id);
  };

  // Stop audio on unmount or modal close
  useEffect(() => {
    return () => {
      audioElement?.pause();
    };
  }, [audioElement]);

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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <BookHeadphones className="w-7 h-7 text-primary" />
            Livres Audio
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Catalogue des livres audio, narrations et gestion des chapitres audio.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            onClick={() => setShowMediaGuide(true)}
            className="gap-1.5"
          >
            <HelpCircle className="w-4 h-4 text-muted-foreground" />
            <span>Guide des formats</span>
          </Button>

          {canCreate && (
            <Button onClick={handleOpenCreate} className="gap-2 shrink-0">
              <Plus className="w-4 h-4" />
              Nouveau Livre Audio
            </Button>
          )}
        </div>
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
                      ? "bg-primary text-primary-foreground shadow-sm font-semibold"
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
              className="h-72 rounded-2xl bg-muted/40 animate-pulse border"
            />
          ))}
        </div>
      ) : paginated.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center space-y-3">
            <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="font-semibold text-lg">Aucun livre audio trouvé</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Aucun livre audio ne correspond à vos filtres. Créez un nouveau livre audio pour enrichir la bibliothèque.
            </p>
            {canCreate && (
              <Button onClick={handleOpenCreate} variant="outline" className="gap-2 mt-2">
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
              className="overflow-hidden group hover:shadow-md transition-all flex flex-col justify-between border-border/80"
            >
              <div>
                {/* Cover with Overlay badges */}
                <div className="relative aspect-[3/4] bg-muted/50 overflow-hidden">
                  {book.coverUrl ? (
                    <img
                      src={book.coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-amber-500/20 to-orange-500/10 text-primary">
                      <BookHeadphones className="w-12 h-12 mb-2 opacity-80" />
                      <span className="text-xs font-semibold px-4 text-center truncate w-full">
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
                    <span className="bg-black/60 backdrop-blur-md text-white text-[10px] px-2 py-0.5 rounded-full">
                      {book.category}
                    </span>
                  </div>

                  <div className="absolute bottom-2 right-2 bg-black/70 backdrop-blur-md text-white text-[11px] font-medium px-2 py-0.5 rounded-lg flex items-center gap-1">
                    <Clock className="w-3 h-3" />
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
                        <UserCheck className="w-3.5 h-3.5 text-primary shrink-0" />
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
                      <Layers className="w-3.5 h-3.5" />
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
                  onClick={() => setManagingChaptersBook(book)}
                  className="flex-1 text-xs gap-1.5 h-8"
                  title="Gérer les chapitres audio"
                >
                  <ListMusic className="w-3.5 h-3.5" />
                  Chapitres ({book.chapters?.length || 0})
                </Button>

                {canUpdate && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => handleOpenEdit(book)}
                    className="h-8 w-8 text-muted-foreground hover:text-foreground"
                    title="Modifier le livre audio"
                  >
                    <Pencil className="w-3.5 h-3.5" />
                  </Button>
                )}

                {canDelete && (
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => setDeleteTarget(book)}
                    className="h-8 w-8 text-destructive hover:bg-destructive/10"
                    title="Supprimer le livre audio"
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
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            Précédent
          </Button>
          <span className="text-xs text-muted-foreground px-2">
            Page {page} sur {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Suivant
          </Button>
        </div>
      )}

      {/* ======================================================== */}
      {/* CREATE / EDIT AUDIOBOOK MODAL */}
      {/* ======================================================== */}
      <Dialog
        open={showForm}
        onOpenChange={setShowForm}
        title={editingBook ? "Modifier le livre audio" : "Nouveau livre audio"}
        className="max-w-xl"
      >
        <form onSubmit={handleSubmit((d) => saveMutation.mutate(d))} className="space-y-4">
          {/* Title */}
          <div>
            <label className="text-xs font-semibold mb-1 block">Titre du livre audio *</label>
            <Input
              {...register("title")}
              placeholder="Ex: L'art de la guerre"
              className={errors.title ? "border-destructive" : ""}
            />
            {errors.title && (
              <p className="text-xs text-destructive mt-1">{errors.title.message}</p>
            )}
          </div>

          {/* Author Selection Section */}
          <div className="p-3.5 rounded-xl border bg-muted/20 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold block">Auteur du livre audio *</label>

              {/* Checkbox: Je suis moi-même l'auteur */}
              <label className="flex items-center gap-2 text-xs font-medium cursor-pointer text-primary">
                <input
                  type="checkbox"
                  checked={isSelfAuthor}
                  onChange={(e) => handleToggleSelfAuthor(e.target.checked)}
                  className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4 cursor-pointer"
                />
                <span>Je suis moi-même l'auteur</span>
              </label>
            </div>

            {isSelfAuthor ? (
              <div className="p-2.5 rounded-lg bg-primary/10 border border-primary/20 flex items-center gap-2 text-xs">
                <UserCheck className="w-4 h-4 text-primary" />
                <span>
                  L'auteur sera enregistré sous votre nom : <strong>{user?.name}</strong>
                </span>
              </div>
            ) : (
              <div>
                <CreatableCombobox
                  options={authorOptions}
                  value={authorName}
                  onChange={(val, opt) => {
                    setAuthorName(val);
                    if (opt?.isUser && opt.value) {
                      setAuthorId(opt.value);
                    } else {
                      setAuthorId(undefined);
                    }
                  }}
                  placeholder="Sélectionner ou saisir un nom d'auteur..."
                  searchPlaceholder="Rechercher un auteur ou taper un nouveau nom..."
                />
                <p className="text-[11px] text-muted-foreground mt-1">
                  Sélectionnez un membre auteur ou tapez un nouveau nom pour l'ajouter à la volée.
                </p>
              </div>
            )}
          </div>

          {/* Narrator & Category */}
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold mb-1 block">Narrateur / Voix</label>
              <Input {...register("narrator")} placeholder="Ex: Jean Marc Bassahak" />
            </div>

            <div>
              <label className="text-xs font-semibold mb-1 block">Catégorie *</label>
              <select
                {...register("category")}
                className="w-full h-10 px-3 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
              >
                {CATEGORIES.filter((c) => c !== "Tous").map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold mb-1 block">Description / Synopsis</label>
            <textarea
              {...register("description")}
              rows={3}
              placeholder="Résumé et présentation du livre audio..."
              className="w-full p-3 text-sm rounded-xl border bg-background focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Cover Image Upload */}
          <div>
            <label className="text-xs font-semibold mb-1 block">Photo de couverture (Portrait)</label>
            <ImageDropzone
              valueUrl={coverUrl}
              onSelected={(file) => setCoverFile(file)}
              onRemoveValueUrl={() => setCoverUrl("")}
              previewSize={80}
            />
          </div>

          {/* Trending Switch */}
          <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/20">
            <div>
              <div className="text-xs font-semibold">Mettre en Tendance</div>
              <div className="text-[11px] text-muted-foreground">
                Affiche ce livre audio dans la section Tendances sur la page d'accueil
              </div>
            </div>
            <Switch
              checked={watch("isTrending")}
              onCheckedChange={(checked) => setValue("isTrending", checked)}
            />
          </div>

          {/* Footer Actions */}
          <div className="pt-2 flex justify-end gap-2 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowForm(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
              {editingBook ? "Enregistrer les modifications" : "Créer le livre audio"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ======================================================== */}
      {/* CHAPTERS MANAGER MODAL */}
      {/* ======================================================== */}
      <Dialog
        open={!!managingChaptersBook}
        onOpenChange={(open) => {
          if (!open) {
            audioElement?.pause();
            setPlayingChapterId(null);
            setManagingChaptersBook(null);
          }
        }}
        title={`Chapitres : ${managingChaptersBook?.title || ""}`}
        className="max-w-2xl"
      >
        <div className="space-y-6">
          {/* Audiobook Summary Banner */}
          {managingChaptersBook && (
            <div className="flex items-center gap-4 p-3.5 rounded-xl bg-muted/40 border">
              {managingChaptersBook.coverUrl ? (
                <img
                  src={managingChaptersBook.coverUrl}
                  alt={managingChaptersBook.title}
                  className="w-14 h-18 object-cover rounded-lg border shrink-0"
                />
              ) : (
                <div className="w-14 h-18 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <BookHeadphones className="w-7 h-7" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-sm truncate">{managingChaptersBook.title}</h4>
                <p className="text-xs text-muted-foreground truncate">
                  Par {managingChaptersBook.author} {managingChaptersBook.narrator && `• Voix: ${managingChaptersBook.narrator}`}
                </p>
                <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-primary" />
                    Durée totale : <strong>{formatDuration(managingChaptersBook.duration)}</strong>
                  </span>
                  <span>•</span>
                  <span>{managingChaptersBook.chapters?.length || 0} chapitres</span>
                </div>
              </div>
            </div>
          )}

          {/* Chapters List */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              Liste des chapitres ({managingChaptersBook?.chapters?.length || 0})
            </h4>

            {managingChaptersBook?.chapters && managingChaptersBook.chapters.length > 0 ? (
              <div className="max-h-60 overflow-y-auto space-y-1.5 pr-1">
                {managingChaptersBook.chapters.map((ch, idx) => (
                  <div
                    key={ch.id}
                    className="flex items-center justify-between p-3 rounded-xl border bg-card hover:bg-muted/40 transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground flex items-center justify-center text-xs font-semibold shrink-0">
                        {idx + 1}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-xs truncate">{ch.title}</div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-2">
                          <span>Durée : {formatDuration(ch.duration)}</span>
                          <span>• Débute à : {formatDuration(ch.startAt)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      {/* Audio preview button */}
                      {ch.audioUrl && (
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => togglePlayAudio(ch)}
                          className="h-8 w-8 rounded-full"
                          title="Écouter l'aperçu"
                        >
                          {playingChapterId === ch.id ? (
                            <Pause className="w-4 h-4 text-primary fill-primary" />
                          ) : (
                            <Play className="w-4 h-4 text-foreground fill-foreground" />
                          )}
                        </Button>
                      )}

                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteChapter(ch.id)}
                        className="h-8 w-8 text-destructive hover:bg-destructive/10"
                        title="Supprimer le chapitre"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-6 text-center text-xs text-muted-foreground rounded-xl border border-dashed p-4">
                Aucun chapitre pour le moment. Ajoutez le premier chapitre ci-dessous.
              </div>
            )}
          </div>

          {/* Add New Chapter Section */}
          <div className="p-4 rounded-xl border bg-muted/20 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider flex items-center gap-2">
              <Plus className="w-3.5 h-3.5 text-primary" />
              Ajouter un nouveau chapitre
            </h4>

            <div>
              <label className="text-xs font-medium mb-1 block">Titre du chapitre *</label>
              <Input
                placeholder="Ex: Chapitre 1 - Les origines"
                value={chapterTitle}
                onChange={(e) => setChapterTitle(e.target.value)}
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">
                Fichier Audio (.mp3, .m4b, .aac, .wav) *
              </label>
              <FileDropzone
                accept="audio/*"
                onSelected={(file, meta) => {
                  setChapterFile(file);
                  if (meta?.duration) {
                    setChapterDuration(meta.duration);
                  }
                }}
              />
              {chapterDuration > 0 && (
                <p className="text-[11px] text-primary font-medium mt-1">
                  ✓ Durée détectée automatiquement : {formatDuration(chapterDuration)}
                </p>
              )}
            </div>

            <div className="flex justify-end pt-1">
              <Button
                type="button"
                onClick={handleAddChapter}
                loading={isUploadingChapter}
                disabled={!chapterTitle.trim() || !chapterFile}
                className="gap-2 text-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                {isUploadingChapter ? "Téléversement…" : "Ajouter le chapitre"}
              </Button>
            </div>
          </div>
        </div>
      </Dialog>

      {/* ======================================================== */}
      {/* DELETE CONFIRM DIALOG */}
      {/* ======================================================== */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Supprimer ce livre audio ?"
        description={`Êtes-vous sûr de vouloir supprimer définitivement "${deleteTarget?.title}" et l'ensemble de ses chapitres ? Cette action est irréversible.`}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget.id)}
        loading={deleteMutation.isPending}
      />

      <MediaSpecificationsDialog
        open={showMediaGuide}
        onOpenChange={setShowMediaGuide}
      />
    </div>
  );
}
