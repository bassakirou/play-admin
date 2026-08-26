import { FileDropzone as BaseFileDropzone, type FileDropzoneProps } from "@pyramidplay/ui";
import api from "../../lib/api";

export function FileDropzone(props: FileDropzoneProps) {
  const resolveUrl = (url?: string) => {
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

  return <BaseFileDropzone {...props} resolveUrl={resolveUrl} />;
}
