import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { Dialog } from "./dialog";
import { Button } from "./button";
import { Input } from "./input";
import { MultiSelect } from "./multi-select";
import { ImageDropzone } from "./image-dropzone";
import { toast } from "sonner";

type Option = {
  value: string;
  label: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  artistOptions: Option[];
  onSuccess?: (newGroup: { id: string; name: string }) => void;
};

export function CreateArtistGroupDialog({
  open,
  onOpenChange,
  artistOptions,
  onSuccess,
}: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [imageUrl, setImageUrl] = useState("");

  const groupMutation = useMutation({
    mutationFn: async (payload: { name: string; memberIds: string[]; imageUrl?: string }) =>
      (await api.post("/artist-groups", payload)).data,
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["artist-groups"] });
      qc.invalidateQueries({ queryKey: ["artists"] });
      toast.success("Groupe créé avec succès");
      onOpenChange(false);
      setName("");
      setMemberIds([]);
      setImageUrl("");
      onSuccess?.(data);
    },
    onError: () => toast.error("Échec de création du groupe"),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Le nom du groupe est requis");
      return;
    }
    groupMutation.mutate({
      name: name.trim(),
      memberIds,
      imageUrl: imageUrl || undefined,
    });
  };

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Nouveau groupe d’artistes"
    >
      <form onSubmit={handleSubmit} className="grid gap-4">
        <div className="space-y-1">
          <label className="text-sm font-medium">Nom du groupe</label>
          <Input
            placeholder="Ex: Cysoul & Lydol"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Membres du groupe</label>
          <MultiSelect
            options={artistOptions}
            value={memberIds}
            onChange={setMemberIds}
            placeholder="Sélectionner des artistes..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-medium">Image du groupe (optionnel)</label>
          <ImageDropzone
            accept="image/jpeg,image/png,image/webp"
            valueUrl={imageUrl}
            previewSize={90}
            onRemoveValueUrl={() => setImageUrl("")}
            onSelected={async (file) => {
              if (!file) {
                setImageUrl("");
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
                setImageUrl(url);
              } catch {
                toast.error("Échec d'upload de l'image");
              }
            }}
          />
          <div className="text-xs text-muted-foreground">
            Formats acceptés : JPG, PNG, WEBP
          </div>
        </div>

        <div className="flex gap-2 pt-2 border-t mt-2">
          <Button type="submit" disabled={groupMutation.isPending}>
            {groupMutation.isPending ? "Création..." : "Créer le groupe"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Annuler
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
