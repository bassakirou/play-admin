import { useState, useEffect } from "react";
import api from "../lib/api";
import { Activity, Clock, FileText, Rocket, Bug, PlusCircle } from "lucide-react";

type UpdateItem = {
  text: string;
  tag: string;
};

type Release = {
  version: string;
  date: string;
  items: UpdateItem[];
};

export default function Changelog() {
  const [releases, setReleases] = useState<Release[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetchChangelog();
  }, []);

  const fetchChangelog = async () => {
    try {
      const res = await api.get("/changelog", {
        headers: { Accept: "text/plain" },
      });
      const text = res.data;
      parseChangelog(text);
    } catch (err: any) {
      setError(err.response?.data || err.message || "Erreur réseau");
    } finally {
      setIsLoading(false);
    }
  };

  const parseChangelog = (text: string) => {
    const blocks = text.split("### ").slice(1);
    const parsedReleases: Release[] = blocks.map((block) => {
      const lines = block.split("\n").filter((line) => line.trim().length > 0);
      const titleLine = lines[0]; // e.g. "v1.0.1 29 Juillet 2026"
      
      const parts = titleLine.split(" ");
      const version = parts[0];
      const date = parts.slice(1).join(" ");

      const items: UpdateItem[] = [];
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line.startsWith("- ")) {
          const content = line.substring(2); // remove "- "
          const tagMatch = content.match(/\[(.*?)\]$/);
          if (tagMatch) {
            items.push({
              text: content.replace(tagMatch[0], "").trim(),
              tag: tagMatch[1],
            });
          } else {
            items.push({
              text: content,
              tag: "",
            });
          }
        }
      }

      return { version, date, items };
    });

    setReleases(parsedReleases);
  };

  const getTagStyle = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes("nouvelle") || t.includes("new") || t.includes("feature")) {
      return "bg-emerald-500/10 text-emerald-500 border-emerald-500/20";
    }
    if (t.includes("correction") || t.includes("bug") || t.includes("fix")) {
      return "bg-rose-500/10 text-rose-500 border-rose-500/20";
    }
    if (t.includes("amélioration") || t.includes("enhancement")) {
      return "bg-blue-500/10 text-blue-500 border-blue-500/20";
    }
    return "bg-muted text-muted-foreground border-border";
  };

  const getTagIcon = (tag: string) => {
    const t = tag.toLowerCase();
    if (t.includes("nouvelle") || t.includes("new") || t.includes("feature")) {
      return <Rocket className="w-3.5 h-3.5" />;
    }
    if (t.includes("correction") || t.includes("bug") || t.includes("fix")) {
      return <Bug className="w-3.5 h-3.5" />;
    }
    return <PlusCircle className="w-3.5 h-3.5" />;
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight mb-2 flex items-center gap-3">
            <Activity className="w-8 h-8 text-primary" />
            Mises à jour
          </h1>
          <p className="text-muted-foreground">
            Suivez l'évolution de la plateforme PyramidPlay.
          </p>
        </div>
      </div>

      {/* Content */}
      <div className="space-y-12 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-border before:to-transparent">
        {error && (
          <div className="p-4 bg-red-500/10 text-red-500 border border-red-500/20 rounded-xl relative z-10">
            {error}
          </div>
        )}

        {releases.map((release, index) => (
          <div key={index} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
            {/* Timeline Icon */}
            <div className="flex items-center justify-center w-10 h-10 rounded-full border-4 border-background bg-primary/20 text-primary shadow shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 relative z-10">
              <Clock className="w-4 h-4" />
            </div>
            
            {/* Content Card */}
            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-card border rounded-2xl p-6 shadow-sm relative z-10 transition-all hover:shadow-md hover:border-primary/30">
              <div className="flex items-center justify-between mb-4 pb-4 border-b">
                <h3 className="text-xl font-bold text-foreground">
                  {release.version}
                </h3>
                <span className="text-sm text-muted-foreground bg-muted px-3 py-1 rounded-full font-medium">
                  {release.date}
                </span>
              </div>
              
              <ul className="space-y-4">
                {release.items.map((item, idx) => (
                  <li key={idx} className="flex gap-3 text-sm">
                    <div className="mt-0.5 shrink-0">
                      <div className="w-1.5 h-1.5 rounded-full bg-primary/50 mt-1.5" />
                    </div>
                    <div className="flex-1">
                      <p className="text-foreground/90 leading-relaxed">
                        {item.text}
                      </p>
                      {item.tag && (
                        <span className={`inline-flex items-center gap-1.5 mt-2 px-2 py-0.5 rounded text-[11px] font-medium border ${getTagStyle(item.tag)}`}>
                          {getTagIcon(item.tag)}
                          {item.tag}
                        </span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}

        {releases.length === 0 && !error && (
          <div className="text-center p-12 bg-card rounded-2xl border border-dashed relative z-10">
            <FileText className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium">Aucune mise à jour</h3>
            <p className="text-sm text-muted-foreground mt-1">Le fichier changelog est vide.</p>
          </div>
        )}
      </div>
    </div>
  );
}
