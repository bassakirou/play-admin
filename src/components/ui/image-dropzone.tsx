import { ImageDropzone as BaseImageDropzone, type ImageDropzoneProps } from "@pyramidplay/ui";
import api from "../../lib/api";

export function ImageDropzone(props: ImageDropzoneProps) {
  const resolveUrl = (url?: string | null) => {
    if (!url) return null;
    if (url.startsWith("http://") || url.startsWith("https://")) {
      if (/localhost:9000|media\.pyramidplay\.cm/.test(url) && !url.includes("resolved-image")) {
        const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
        return `${base}/files/resolved-image?url=${encodeURIComponent(url)}`;
      }
      return url;
    }
    if (url.startsWith("/")) {
      const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
      return `${base}${url}`;
    }
    const base = (api.defaults.baseURL || "").replace(/\/+$/, "");
    return `${base}/files/resolved-image?url=${encodeURIComponent('/images/' + url)}`;
  };

  return <BaseImageDropzone {...props} resolveUrl={resolveUrl} />;
}
