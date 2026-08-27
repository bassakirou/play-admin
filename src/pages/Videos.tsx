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
import { ImageDropzone } from "../components/ui/image-dropzone";
import { FileDropzone } from "../components/ui/file-dropzone";
import { Tv, Film, Plus, Search, Pencil, Trash2, CheckCircle, Video as VideoIcon, X, HelpCircle } from "lucide-react";
import { MediaSpecificationsDialog } from "../components/ui/media-specifications-dialog";
import { VideoQualityVariants, type VideoSourceAnalysis, type QualityTier } from "@pyramidplay/ui";

type Channel = {
  id: string;
  name: string;
  bio?: string | null;
  imageUrl?: string | null;
  bannerUrl?: string | null;
  certified?: boolean;
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    role?: { name: string };
  } | null;
  _count?: {
    followers: number;
  };
  subscriberCount?: number;
  videoCount?: number;
};

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
  userId?: string | null;
  user?: {
    id: string;
    name: string;
    email: string;
    artistProfile?: Channel | null;
  } | null;
  artists?: { id: string; name: string }[];
  videoPlaylists?: { id: string; name: string }[];
};

type UserItem = {
  id: string;
  name: string;
  email: string;
  role?: { name: string };
  artistProfile?: { id: string; name: string } | null;
};

export default function Videos() {
  const qc = useQueryClient();
  const { user, permissions } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedChannelFilter, setSelectedChannelFilter] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const pageSize = 10;

  // Video modal states
  const [showForm, setShowForm] = useState(false);
  const [showMediaGuide, setShowMediaGuide] = useState(false);
  const [editing, setEditing] = useState<Video | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Video | null>(null);
  const [sourceAnalysis, setSourceAnalysis] = useState<VideoSourceAnalysis | null>(null);
  const [rawSourceUrl, setRawSourceUrl] = useState<string>("");
  const [qualityVariants, setQualityVariants] = useState<Partial<Record<QualityTier, string>>>({});
  const [isGeneratingVariants, setIsGeneratingVariants] = useState(false);
  const [generatingQuality, setGeneratingQuality] = useState<QualityTier | "all" | null>(null);

  // Channels modal states
  const [showChannelsModal, setShowChannelsModal] = useState(false);
  const [channelSearch, setChannelSearch] = useState("");
  const [showChannelForm, setShowChannelForm] = useState(false);
  const [editingChannel, setEditingChannel] = useState<Channel | null>(null);

  // Video Form Schema
  const videoSchema = z.object({
    title: z.string().min(1, "Le titre est requis"),
    description: z.string().optional(),
    channelId: z.string().min(1, "La chaîne de publication est requise"),
    category: z.string().optional(),
    tagsInput: z.string().optional(),
    duration: z.coerce.number().int().min(0).default(0),
    thumbnailUrl: z.string().optional().or(z.literal("")),
    videoUrl: z.string().min(1, "Le fichier vidéo est requis"),
    isPublished: z.boolean().optional(),
  });
  type VideoFormValues = z.infer<typeof videoSchema>;

  const EMPTY_VIDEO_FORM: VideoFormValues = {
    title: "",
    description: "",
    channelId: "",
    category: "",
    tagsInput: "",
    duration: 0,
    thumbnailUrl: "",
    videoUrl: "",
    isPublished: true,
  };

  const form = useForm<VideoFormValues>({
    resolver: zodResolver(videoSchema) as any,
    defaultValues: EMPTY_VIDEO_FORM,
  });

  // Channel Form Schema
  const channelSchema = z.object({
    userId: z.string().min(1, "L'utilisateur est requis"),
    name: z.string().min(1, "Le nom de la chaîne est requis"),
    bio: z.string().optional(),
    imageUrl: z.string().optional().or(z.literal("")),
    bannerUrl: z.string().optional().or(z.literal("")),
    certified: z.boolean().optional(),
  });
  type ChannelFormValues = z.infer<typeof channelSchema>;

  const channelForm = useForm<ChannelFormValues>({
    resolver: zodResolver(channelSchema) as any,
    defaultValues: {
      userId: "",
      name: "",
      bio: "",
      imageUrl: "",
      bannerUrl: "",
      certified: false,
    },
  });

  // Queries
  const { data: videosData, isLoading: videosLoading } = useQuery({
    queryKey: ["videos"],
    queryFn: async () => (await api.get("/videos/admin")).data as Video[],
  });

  const channelsQuery = useQuery({
    queryKey: ["channels-all"],
    queryFn: async () => (await api.get("/artists/channels")).data as Channel[],
  });

  const usersQuery = useQuery({
    queryKey: ["users-all"],
    queryFn: async () => (await api.get("/users")).data as UserItem[],
  });

  // Mutations
  const saveVideoMutation = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      if (editing) {
        return (await api.patch(`/videos/${editing.id}`, payload)).data;
      }
      return (await api.post("/videos", payload)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["channels-all"] });
      setShowForm(false);
      setEditing(null);
      setUploadProgress(null);
      form.reset(EMPTY_VIDEO_FORM);
      toast.success(editing ? "Vidéo mise à jour" : "Vidéo créée");
    },
    onError: () => toast.error("Échec de sauvegarde de la vidéo"),
  });

  const deleteVideoMutation = useMutation({
    mutationFn: async (id: string) => (await api.delete(`/videos/${id}`)).data,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["videos"] });
      qc.invalidateQueries({ queryKey: ["channels-all"] });
      toast.success("Vidéo supprimée");
    },
    onError: () => toast.error("Échec de suppression"),
  });

  const saveChannelMutation = useMutation({
    mutationFn: async (values: ChannelFormValues) => {
      if (editingChannel) {
        return (await api.patch(`/artists/${editingChannel.id}`, values)).data;
      }
      return (await api.post("/artists/channels", values)).data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["channels-all"] });
      qc.invalidateQueries({ queryKey: ["videos"] });
      setShowChannelForm(false);
      setEditingChannel(null);
      channelForm.reset();
      toast.success(editingChannel ? "Chaîne mise à jour" : "Chaîne créée");
    },
    onError: () => toast.error("Échec de sauvegarde de la chaîne"),
  });

  // Video Handlers
  const openCreateVideo = () => {
    setEditing(null);
    setUploadProgress(null);
    setSourceAnalysis(null);
    setRawSourceUrl("");
    setQualityVariants({});
    const channels = channelsQuery.data || [];
    // Default to first channel or matching user channel
    const defaultChannel = channels.find((c) => c.userId === user?.id) || channels[0];
    form.reset({
      ...EMPTY_VIDEO_FORM,
      channelId: defaultChannel?.id || "",
    });
    setShowForm(true);
  };

  const openEditVideo = (v: Video) => {
    setEditing(v);
    setUploadProgress(null);
    setRawSourceUrl(v.videoUrl || "");
    setQualityVariants({});
    setSourceAnalysis(null);

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

    const currentChannel = (channelsQuery.data || []).find(
      (c) => c.userId === v.userId || (v.user?.artistProfile && c.id === v.user.artistProfile.id)
    );

    form.reset({
      title: v.title,
      description: v.description || "",
      channelId: currentChannel?.id || v.user?.artistProfile?.id || "",
      category: v.category || "",
      tagsInput,
      duration: v.duration || 0,
      thumbnailUrl: v.thumbnailUrl || "",
      videoUrl: v.videoUrl || "",
      isPublished: v.isPublished,
    });
    setShowForm(true);
  };

  const onVideoSubmit = (values: VideoFormValues) => {
    const tags = (values.tagsInput || "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    saveVideoMutation.mutate({
      title: values.title,
      description: values.description || undefined,
      channelId: values.channelId,
      category: values.category || undefined,
      tags,
      duration: values.duration,
      thumbnailUrl: values.thumbnailUrl || undefined,
      videoUrl: values.videoUrl,
      isPublished: !!values.isPublished,
    });
  };

  // Channel Handlers
  const openCreateChannel = () => {
    setEditingChannel(null);
    channelForm.reset({
      userId: (usersQuery.data || [])[0]?.id || "",
      name: "",
      bio: "",
      imageUrl: "",
      bannerUrl: "",
      certified: false,
    });
    setShowChannelForm(true);
  };

  const openEditChannel = (channel: Channel) => {
    setEditingChannel(channel);
    channelForm.reset({
      userId: channel.userId || "",
      name: channel.name,
      bio: channel.bio || "",
      imageUrl: channel.imageUrl || "",
      bannerUrl: channel.bannerUrl || "",
      certified: !!channel.certified,
    });
    setShowChannelForm(true);
  };

  const onChannelSubmit = (values: ChannelFormValues) => {
    saveChannelMutation.mutate(values);
  };

  // Upload Helpers
  const uploadImage = async (file: File | null, field: "thumbnailUrl" | "imageUrl" | "bannerUrl", formInstance: any) => {
    if (!file) {
      formInstance.setValue(field, "");
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
        toast.error("Échec d'upload de l'image");
        return;
      }
      formInstance.setValue(field, url);
      formInstance.clearErrors(field);
    } catch {
      toast.error("Échec d'upload de l'image");
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
      const rawUrl = res.data?.rawUrl || url;
      setRawSourceUrl(rawUrl);
      form.setValue("videoUrl", url);
      form.clearErrors("videoUrl");

      const detectedDuration =
        res.data?.analysis?.duration && res.data.analysis.duration > 0
          ? res.data.analysis.duration
          : meta?.duration && meta.duration > 0
          ? meta.duration
          : 0;

      if (res.data?.analysis) {
        setSourceAnalysis(res.data.analysis);
      }
      if (detectedDuration > 0) {
        form.setValue("duration", detectedDuration);
        form.clearErrors("duration");
      }

      setUploadProgress(100);
      toast.success("Vidéo source uploadée. Encodage et génération des variantes HLS en cours...");
      
      // Auto-trigger HLS multi-quality generation immediately
      await handleGenerateAllVariants(rawUrl);
    } catch {
      setUploadProgress(null);
      toast.error("Échec d'upload de la vidéo");
    }
  };

  const handleGenerateAllVariants = async (overrideUrl?: string) => {
    const targetUrl = overrideUrl || rawSourceUrl || form.watch("videoUrl");
    if (!targetUrl) {
      toast.error("Veuillez d'abord téléverser une vidéo source");
      return;
    }
    setIsGeneratingVariants(true);
    setGeneratingQuality("all");
    try {
      const res = await api.post("/files/generate-video-variants", {
        url: targetUrl,
      });
      const data = res.data;
      if (data?.masterUrl) {
        form.setValue("videoUrl", data.masterUrl);
        form.clearErrors("videoUrl");
      }
      if (data?.variants) {
        setQualityVariants(data.variants);
      }
      if (data?.analysis) {
        setSourceAnalysis(data.analysis);
        if (data.analysis.duration > 0 && !form.watch("duration")) {
          form.setValue("duration", data.analysis.duration);
        }
      }
      toast.success("Variantes de qualité HLS générées avec succès !");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Échec de la génération des variantes");
    } finally {
      setIsGeneratingVariants(false);
      setGeneratingQuality(null);
    }
  };

  const handleGenerateSingleVariant = async (quality: QualityTier) => {
    const targetUrl = rawSourceUrl || form.watch("videoUrl");
    if (!targetUrl) {
      toast.error("Veuillez d'abord téléverser une vidéo source");
      return;
    }
    setIsGeneratingVariants(true);
    setGeneratingQuality(quality);
    try {
      const res = await api.post("/files/generate-video-variants", {
        url: targetUrl,
        targetQualities: [quality],
      });
      const data = res.data;
      if (data?.variants?.[quality]) {
        setQualityVariants((prev) => ({ ...prev, [quality]: data.variants[quality] }));
      }
      if (data?.masterUrl) {
        form.setValue("videoUrl", data.masterUrl);
      }
      toast.success(`Variante ${quality} générée avec succès`);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || `Échec de génération de la variante ${quality}`);
    } finally {
      setIsGeneratingVariants(false);
      setGeneratingQuality(null);
    }
  };

  const resolveMediaUrl = (url?: string) => {
    if (!url) return undefined;
    if (url.startsWith("blob:")) return url;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if ((/localhost:9000|media\.pyramidplay\.cm/.test(url)) && !url.includes("resolved-video")) {
        const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
        return `${base}/files/resolved-video?url=${encodeURIComponent(url)}`;
      }
      return url;
    }
    if (url.startsWith("/")) {
      const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
      return `${base}${url}`;
    }
    const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
    return `${base}/files/resolved-video?url=${encodeURIComponent('/videos/' + url)}`;
  };

  // Filters & Pagination
  const filteredVideos = useMemo(() => {
    const q = search.trim().toLowerCase();
    let list = videosData || [];

    if (selectedChannelFilter) {
      list = list.filter((v) => {
        const chanId = v.user?.artistProfile?.id;
        const userId = v.userId;
        return chanId === selectedChannelFilter || userId === selectedChannelFilter;
      });
    }

    if (!q) return list;
    return list.filter((v) => {
      const titleMatch = v.title.toLowerCase().includes(q);
      const channelMatch =
        (v.user?.artistProfile?.name || v.user?.name || "").toLowerCase().includes(q);
      const categoryMatch = (v.category || "").toLowerCase().includes(q);
      return titleMatch || channelMatch || categoryMatch;
    });
  }, [videosData, search, selectedChannelFilter]);

  const filteredChannels = useMemo(() => {
    const q = channelSearch.trim().toLowerCase();
    const list = channelsQuery.data || [];
    if (!q) return list;
    return list.filter((c) => {
      const nameMatch = c.name.toLowerCase().includes(q);
      const userMatch = (c.user?.name || c.user?.email || "").toLowerCase().includes(q);
      return nameMatch || userMatch;
    });
  }, [channelsQuery.data, channelSearch]);

  const totalPages = Math.max(1, Math.ceil((filteredVideos?.length || 0) / pageSize));
  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [totalPages, page]);

  const pageItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filteredVideos.slice(start, start + pageSize);
  }, [filteredVideos, page]);

  const roleName =
    typeof user?.role === "string" ? user?.role : (user as any)?.role?.name;
  const canCreate = canAccess(roleName, permissions, "create", "video");
  const canUpdate = canAccess(roleName, permissions, "update", "video");
  const canDelete = canAccess(roleName, permissions, "delete", "video");

  // Options for dropdowns
  const channelOptions = [
    { value: "", label: "— Sélectionner une chaîne —" },
  ].concat(
    (channelsQuery.data || []).map((c) => ({
      value: c.id,
      label: `${c.name} (${c.user?.name || c.user?.email || "Créateur"})`,
    }))
  );

  const userOptions = [{ value: "", label: "— Choisir un utilisateur —" }].concat(
    (usersQuery.data || []).map((u) => ({
      value: u.id,
      label: `${u.name || "Sans nom"} (${u.email}) [${u.role?.name || "USER"}]`,
    }))
  );

  return (
    <div className="p-6 space-y-6">
      <Card>
        <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-xl font-bold flex items-center gap-2">
              <Film className="w-6 h-6 text-primary" />
              Gestion des Vidéos
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Gérez les vidéos publiées par les différentes chaînes créateurs
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Titre, chaîne ou artiste…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 pl-8"
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setShowMediaGuide(true)}
              className="flex items-center gap-1.5"
            >
              <HelpCircle className="w-4 h-4 text-muted-foreground" />
              <span className="hidden sm:inline">Guide formats</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowChannelsModal(true)}
              className="flex items-center gap-2 border-primary/30 hover:border-primary text-primary"
            >
              <Tv className="w-4 h-4" />
              <span>Chaînes</span>
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-xs bg-primary/10 text-primary font-bold">
                {channelsQuery.data?.length ?? 0}
              </span>
            </Button>
            {canCreate && (
              <Button onClick={openCreateVideo} className="flex items-center gap-1">
                <Plus className="w-4 h-4" />
                Nouveau
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent>
          {selectedChannelFilter && (
            <div className="mb-4 flex items-center gap-2 bg-primary/10 border border-primary/20 text-primary px-3 py-1.5 rounded-lg text-sm w-fit">
              <span>
                Filtré par chaîne :{" "}
                <strong>
                  {channelsQuery.data?.find((c) => c.id === selectedChannelFilter || c.userId === selectedChannelFilter)?.name || selectedChannelFilter}
                </strong>
              </span>
              <button
                onClick={() => setSelectedChannelFilter(null)}
                className="hover:bg-primary/20 p-0.5 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {videosLoading ? (
            <p className="text-sm text-muted-foreground py-8 text-center">Chargement des vidéos…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-muted/60 text-muted-foreground uppercase text-xs">
                  <tr>
                    <th className="p-3 rounded-l-md">Titre</th>
                    <th className="p-3">Chaîne (Uploader)</th>
                    <th className="p-3">Catégorie</th>
                    <th className="p-3">Tags</th>
                    <th className="p-3">Durée</th>
                    <th className="p-3">Vues</th>
                    <th className="p-3">Statut</th>
                    <th className="p-3 text-right rounded-r-md">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {pageItems.length === 0 ? (
                    <tr>
                      <td
                        className="p-8 text-center text-sm text-muted-foreground"
                        colSpan={8}
                      >
                        Aucune vidéo trouvée
                      </td>
                    </tr>
                  ) : (
                    pageItems.map((v) => {
                      const channel = v.user?.artistProfile;
                      const channelName = channel?.name || v.user?.name || "Chaîne";
                      const channelAvatar = channel?.imageUrl || "https://placehold.co/100x100?text=C";

                      return (
                        <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                          <td className="p-3 font-medium">
                            <div className="flex items-center gap-3">
                              {v.thumbnailUrl ? (
                                <img
                                  src={v.thumbnailUrl}
                                  alt={v.title}
                                  className="w-12 h-8 rounded object-cover flex-shrink-0 bg-muted"
                                />
                              ) : (
                                <div className="w-12 h-8 rounded bg-muted flex items-center justify-center text-muted-foreground">
                                  <VideoIcon className="w-4 h-4" />
                                </div>
                              )}
                              <span className="line-clamp-1 max-w-[220px]" title={v.title}>
                                {v.title}
                              </span>
                            </div>
                          </td>
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <img
                                src={channelAvatar}
                                alt={channelName}
                                className="w-6 h-6 rounded-full object-cover border border-border flex-shrink-0"
                              />
                              <span className="font-medium text-foreground line-clamp-1">
                                {channelName}
                              </span>
                            </div>
                          </td>
                          <td className="p-3 text-muted-foreground">{v.category || "—"}</td>
                          <td className="p-3 text-muted-foreground max-w-[150px] truncate" title={Array.isArray(v.tags) ? v.tags.join(", ") : String(v.tags || "")}>
                            {Array.isArray(v.tags) && v.tags.length > 0
                              ? v.tags.join(", ")
                              : typeof v.tags === "string" && v.tags
                              ? v.tags
                              : "—"}
                          </td>
                          <td className="p-3 text-muted-foreground font-mono">{v.duration}s</td>
                          <td className="p-3 text-muted-foreground font-mono">{v.views}</td>
                          <td className="p-3">
                            <span
                              className={
                                v.isPublished
                                  ? "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-emerald-500/10 text-emerald-600 border border-emerald-500/20"
                                  : "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold bg-amber-500/10 text-amber-600 border border-amber-500/20"
                              }
                            >
                              {v.isPublished ? "Publié" : "Brouillon"}
                            </span>
                          </td>
                          <td className="p-3 text-right">
                            <div className="flex items-center justify-end gap-1.5 flex-nowrap">
                              {canUpdate && (
                                <Button
                                  variant="outline"
                                  size="icon"
                                  onClick={() => openEditVideo(v)}
                                  className="h-8 w-8 hover:border-amber-400 hover:text-amber-400"
                                  title="Éditer la vidéo"
                                >
                                  <Pencil className="w-4 h-4" />
                                </Button>
                              )}
                              {canDelete && (
                                <Button
                                  variant="destructive"
                                  size="icon"
                                  onClick={() => setDeleteTarget(v)}
                                  className="h-8 w-8"
                                  title="Supprimer la vidéo"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>

              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <div className="text-xs text-muted-foreground">
                  Affichage page {page} sur {totalPages} ({filteredVideos.length} vidéos au total)
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={page === 1}
                  >
                    Précédent
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={page === totalPages}
                  >
                    Suivant
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* ========================================================================= */}
      {/* DIALOG 1 : GESTION DES CHAÎNES VIDÉO                                      */}
      {/* ========================================================================= */}
      <Dialog
        open={showChannelsModal}
        onOpenChange={setShowChannelsModal}
        title="Gestion des Chaînes de Publication Vidéo"
        className="max-w-3xl"
      >
        <div className="space-y-4 max-h-[75vh] overflow-y-auto pr-1">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pb-3 border-b">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
              <Input
                placeholder="Rechercher une chaîne ou utilisateur…"
                value={channelSearch}
                onChange={(e) => setChannelSearch(e.target.value)}
                className="pl-8"
              />
            </div>
            {canCreate && (
              <Button onClick={openCreateChannel} size="sm" className="w-full sm:w-auto flex items-center gap-1.5">
                <Plus className="w-4 h-4" />
                Nouvelle Chaîne
              </Button>
            )}
          </div>

          {channelsQuery.isLoading ? (
            <p className="text-sm text-muted-foreground py-6 text-center">Chargement des chaînes…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left bg-muted/60 text-muted-foreground text-xs uppercase">
                  <tr>
                    <th className="p-2.5 rounded-l-md">Chaîne</th>
                    <th className="p-2.5">Propriétaire</th>
                    <th className="p-2.5">Vidéos</th>
                    <th className="p-2.5">Abonnés</th>
                    <th className="p-2.5">Certifié</th>
                    <th className="p-2.5 text-right rounded-r-md">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {filteredChannels.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-6 text-center text-sm text-muted-foreground">
                        Aucune chaîne trouvée
                      </td>
                    </tr>
                  ) : (
                    filteredChannels.map((c) => (
                      <tr key={c.id} className="hover:bg-muted/30 transition-colors">
                        <td className="p-2.5">
                          <div className="flex items-center gap-2.5">
                            <img
                              src={c.imageUrl || "https://placehold.co/100x100?text=C"}
                              alt={c.name}
                              className="w-8 h-8 rounded-full object-cover border border-border flex-shrink-0"
                            />
                            <div>
                              <div className="font-semibold text-foreground">{c.name}</div>
                              {c.bio && (
                                <div className="text-xs text-muted-foreground line-clamp-1 max-w-[200px]">
                                  {c.bio}
                                </div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-2.5 text-xs">
                          <div className="font-medium text-foreground">{c.user?.name || "Sans nom"}</div>
                          <div className="text-muted-foreground">{c.user?.email}</div>
                          {c.user?.role?.name && (
                            <span className="inline-block mt-0.5 px-1.5 py-0.2 rounded text-[10px] bg-muted font-bold">
                              {c.user.role.name}
                            </span>
                          )}
                        </td>
                        <td className="p-2.5 font-mono text-center">{c.videoCount ?? 0}</td>
                        <td className="p-2.5 font-mono text-center">{c.subscriberCount ?? c._count?.followers ?? 0}</td>
                        <td className="p-2.5">
                          {c.certified ? (
                            <span className="inline-flex items-center gap-1 text-xs text-emerald-600 font-medium">
                              <CheckCircle className="w-3.5 h-3.5" /> Oui
                            </span>
                          ) : (
                            <span className="text-xs text-muted-foreground">Non</span>
                          )}
                        </td>
                        <td className="p-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedChannelFilter(c.id);
                                setShowChannelsModal(false);
                              }}
                              className="h-7 px-2 text-xs"
                              title="Voir les vidéos de cette chaîne"
                            >
                              Vidéos
                            </Button>
                            {canUpdate && (
                              <Button
                                variant="outline"
                                size="icon"
                                onClick={() => openEditChannel(c)}
                                className="h-7 w-7 hover:border-amber-400 hover:text-amber-400"
                                title="Éditer la chaîne"
                              >
                                <Pencil className="w-3.5 h-3.5" />
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 2 : CRÉATION / ÉDITION D'UNE CHAÎNE                                */}
      {/* ========================================================================= */}
      <Dialog
        open={showChannelForm}
        onOpenChange={setShowChannelForm}
        title={editingChannel ? `Modifier la chaîne "${editingChannel.name}"` : "Créer une chaîne créateur"}
      >
        <form onSubmit={channelForm.handleSubmit(onChannelSubmit as any)} className="space-y-4">
          <div className="space-y-1">
            <label className="text-sm font-medium">Utilisateur Propriétaire</label>
            <Select
              options={userOptions}
              disabled={!!editingChannel}
              {...channelForm.register("userId")}
            />
            {channelForm.formState.errors.userId && (
              <p className="text-xs text-destructive">{channelForm.formState.errors.userId.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Nom de la chaîne</label>
            <Input placeholder="Ex: Pyramid Studio, Bassahak Live..." {...channelForm.register("name")} />
            {channelForm.formState.errors.name && (
              <p className="text-xs text-destructive">{channelForm.formState.errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Description / Bio</label>
            <Textarea placeholder="Description publique de la chaîne..." {...channelForm.register("bio")} />
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="text-sm font-medium">Avatar de la chaîne</label>
              <ImageDropzone
                key={editingChannel ? `chan-img-${editingChannel.id}` : "chan-img-new"}
                accept="image/jpeg,image/png,image/webp"
                valueUrl={channelForm.watch("imageUrl") || undefined}
                onRemoveValueUrl={() => channelForm.setValue("imageUrl", "")}
                onSelected={(file) => {
                  void uploadImage(file, "imageUrl", channelForm);
                }}
                onSelectedUrl={(url) => {
                  channelForm.setValue("imageUrl", url);
                }}
                onSelectedLibraryItems={(items) => {
                  if (items[0]) {
                    channelForm.setValue("imageUrl", items[0].fileUrl);
                  }
                }}
              />
            </div>
            <div className="space-y-1">
              <label className="text-sm font-medium">Bannière de la chaîne</label>
              <ImageDropzone
                key={editingChannel ? `chan-banner-${editingChannel.id}` : "chan-banner-new"}
                accept="image/jpeg,image/png,image/webp"
                valueUrl={channelForm.watch("bannerUrl") || undefined}
                onRemoveValueUrl={() => channelForm.setValue("bannerUrl", "")}
                onSelected={(file) => {
                  void uploadImage(file, "bannerUrl", channelForm);
                }}
                onSelectedUrl={(url) => {
                  channelForm.setValue("bannerUrl", url);
                }}
                onSelectedLibraryItems={(items) => {
                  if (items[0]) {
                    channelForm.setValue("bannerUrl", items[0].fileUrl);
                  }
                }}
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <Checkbox
              checked={!!channelForm.watch("certified")}
              onCheckedChange={(checked) => channelForm.setValue("certified", checked)}
            />
            <span className="text-sm font-medium">Chaîne Certifiée (Badge officiel)</span>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowChannelForm(false)}
            >
              Annuler
            </Button>
            <Button type="submit" loading={saveChannelMutation.isPending}>
              {saveChannelMutation.isPending ? "Sauvegarde…" : editingChannel ? "Mettre à jour" : "Créer la chaîne"}
            </Button>
          </div>
        </form>
      </Dialog>

      {/* ========================================================================= */}
      {/* DIALOG 3 : CRÉATION / ÉDITION D'UNE VIDÉO                                  */}
      {/* ========================================================================= */}
      <Dialog
        open={showForm}
        onOpenChange={setShowForm}
        title={editing ? "Modifier la vidéo" : "Nouvelle Vidéo"}
      >
        <form
          onSubmit={form.handleSubmit(onVideoSubmit as any)}
          className="grid gap-3 sm:grid-cols-2 pr-1"
        >
          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">Titre de la vidéo</label>
            <Input placeholder="Titre attractif..." {...form.register("title")} />
            {form.formState.errors.title && (
              <p className="text-xs text-destructive">
                {form.formState.errors.title.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">Chaîne de publication (Uploader)</label>
            <Select options={channelOptions} {...form.register("channelId")} />
            {form.formState.errors.channelId && (
              <p className="text-xs text-destructive">
                {form.formState.errors.channelId.message}
              </p>
            )}
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              placeholder="Description détaillée de la vidéo..."
              {...form.register("description")}
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Catégorie</label>
            <Input placeholder="Ex: Clip, Live, Interview, Vlog, Tutoriel..." {...form.register("category")} />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium">Tags</label>
            <Input
              placeholder="Tags séparés par des virgules (ex: afrobeats, concert, 2026)"
              {...form.register("tagsInput")}
            />
          </div>

          <div className="sm:col-span-2 space-y-1">
            <label className="text-sm font-medium">Durée de la vidéo</label>
            <div className="relative">
              <Input
                type="text"
                readOnly
                className="bg-muted/40 cursor-default text-muted-foreground font-mono"
                value={
                  form.watch("duration") && form.watch("duration") > 0
                    ? `${form.watch("duration")} secondes (${Math.floor(form.watch("duration") / 60)}:${String(form.watch("duration") % 60).padStart(2, "0")})`
                    : "Automatique (calculée lors du téléversement)"
                }
                placeholder="Automatique (calculée lors du téléversement)"
              />
            </div>
            <p className="text-[11px] text-muted-foreground">
              La durée est détectée automatiquement à partir des métadonnées du fichier vidéo.
            </p>
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium">Miniature (Image de couverture)</label>
            <ImageDropzone
              key={editing ? `thumb-${editing.id}` : "thumb-new"}
              accept="image/jpeg,image/png,image/webp"
              valueUrl={form.watch("thumbnailUrl") || undefined}
              onRemoveValueUrl={() => form.setValue("thumbnailUrl", "")}
              onSelected={(file) => {
                void uploadImage(file, "thumbnailUrl", form);
              }}
              onSelectedUrl={(url) => {
                form.setValue("thumbnailUrl", url);
                form.clearErrors("thumbnailUrl");
              }}
              onSelectedLibraryItems={(items) => {
                if (items[0]) {
                  form.setValue("thumbnailUrl", items[0].fileUrl);
                  form.clearErrors("thumbnailUrl");
                }
              }}
            />
          </div>

          <div className="sm:col-span-2 space-y-2">
            <label className="text-sm font-medium">Fichier vidéo source (MP4 / HLS)</label>
            <FileDropzone
              key={editing ? `video-${editing.id}` : "video-new"}
              accept="video/mp4,video/*"
              onSelected={(file, meta) => {
                void uploadVideoFile(file, meta);
              }}
              onSelectedUrl={(url, meta) => {
                form.setValue("videoUrl", url);
                form.clearErrors("videoUrl");
                if (meta?.duration) {
                  form.setValue("duration", meta.duration);
                  form.clearErrors("duration");
                }
              }}
              onSelectedLibraryItems={(items) => {
                if (items[0]) {
                  const item = items[0];
                  form.setValue("videoUrl", item.fileUrl);
                  form.clearErrors("videoUrl");
                  if (item.duration) {
                    form.setValue("duration", item.duration);
                    form.clearErrors("duration");
                  }
                  if (!form.getValues("title") && item.title) {
                    form.setValue("title", item.title);
                  }
                  if (!form.getValues("thumbnailUrl") && item.thumbnailUrl) {
                    form.setValue("thumbnailUrl", item.thumbnailUrl);
                  }
                  setRawSourceUrl(item.fileUrl);
                  toast.success(`Vidéo "${item.title || item.filename}" sélectionnée.`);
                  void handleGenerateAllVariants(item.fileUrl);
                }
              }}
              initialItems={
                form.watch("videoUrl")
                  ? [form.watch("videoUrl") as string]
                  : undefined
              }
            />
            {uploadProgress !== null && (
              <div className="space-y-1">
                <div className="h-2 w-full rounded bg-muted overflow-hidden">
                  <div
                    className="h-2 rounded bg-primary transition-all duration-200"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <div className="text-xs text-muted-foreground font-mono flex items-center justify-between">
                  <span>Progression : {uploadProgress}%</span>
                  {isGeneratingVariants && (
                    <span className="text-amber-500 font-semibold animate-pulse">
                      Génération FFmpeg HLS en cours...
                    </span>
                  )}
                </div>
              </div>
            )}
            {form.formState.errors.videoUrl && (
              <p className="text-xs text-destructive">
                {form.formState.errors.videoUrl.message}
              </p>
            )}
          </div>

          {/* Variantes de Qualité Vidéo (1080p, 720p, 480p, 360p) */}
          <div className="sm:col-span-2 pt-2 border-t mt-2">
            <VideoQualityVariants
              sourceUrl={rawSourceUrl || form.watch("videoUrl")}
              analysis={sourceAnalysis}
              variants={qualityVariants}
              resolveUrl={resolveMediaUrl}
              onVariantsChange={(v) => {
                setQualityVariants(v);
              }}
              onGenerateAll={handleGenerateAllVariants}
              onGenerateSingle={handleGenerateSingleVariant}
              onRemoveSource={() => {
                form.setValue("videoUrl", "");
                setRawSourceUrl("");
                setSourceAnalysis(null);
                setQualityVariants({});
              }}
              isGenerating={isGeneratingVariants}
              generatingQuality={generatingQuality}
            />
          </div>

          <div className="sm:col-span-2 flex items-center gap-2 pt-2">
            <Checkbox
              checked={!!form.watch("isPublished")}
              onCheckedChange={(checked) =>
                form.setValue("isPublished", checked)
              }
            />
            <span className="text-sm font-medium">Publier immédiatement la vidéo</span>
          </div>

          <div className="flex gap-2 sm:col-span-2 pt-3 border-t mt-4">
            <Button
              type="submit"
              loading={saveVideoMutation.isPending || isGeneratingVariants}
              disabled={
                saveVideoMutation.isPending ||
                isGeneratingVariants ||
                (uploadProgress !== null && uploadProgress < 100)
              }
            >
              {saveVideoMutation.isPending
                ? editing
                  ? "Mise à jour…"
                  : "Création…"
                : isGeneratingVariants
                ? "Génération des qualités HLS en cours…"
                : editing
                ? "Mettre à jour"
                : "Créer la vidéo"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setShowForm(false);
                setEditing(null);
                setUploadProgress(null);
                form.reset(EMPTY_VIDEO_FORM);
              }}
            >
              Annuler
            </Button>
          </div>
        </form>
      </Dialog>

      {/* Confirmation Suppression */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title={`Supprimer la vidéo "${deleteTarget?.title}" ?`}
        description="Voulez-vous vraiment supprimer cette vidéo ? Cette action est irréversible."
        loading={deleteVideoMutation.isPending}
        onConfirm={() => {
          if (deleteTarget) {
            deleteVideoMutation.mutate(deleteTarget.id, {
              onSettled: () => setDeleteTarget(null),
            });
          }
        }}
      />

      <MediaSpecificationsDialog
        open={showMediaGuide}
        onOpenChange={setShowMediaGuide}
      />
    </div>
  );
}
