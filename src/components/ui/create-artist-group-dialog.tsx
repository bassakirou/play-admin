import { useQueryClient } from "@tanstack/react-query";
import api from "../../lib/api";
import { CreateArtistGroupDialog as BaseDialog, type CreateArtistGroupDialogProps } from "@pyramidplay/ui";

export function CreateArtistGroupDialog(
  props: Omit<CreateArtistGroupDialogProps, "onCreateGroup" | "onUploadImage">
) {
  const qc = useQueryClient();

  const handleCreateGroup = async (payload: {
    name: string;
    memberIds: string[];
    imageUrl?: string;
  }) => {
    const data = (await api.post("/artist-groups", payload)).data;
    qc.invalidateQueries({ queryKey: ["artist-groups"] });
    qc.invalidateQueries({ queryKey: ["artists"] });
    return data;
  };

  const handleUploadImage = async (file: File) => {
    const fd = new FormData();
    fd.append("file", file);
    const res = await api.post("/files/upload-image", fd, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    const url = res.data?.url || res.data?.filename || "";
    if (!url) throw new Error("Échec d'upload de l'image");
    return url;
  };

  return (
    <BaseDialog
      {...props}
      onCreateGroup={handleCreateGroup}
      onUploadImage={handleUploadImage}
    />
  );
}
