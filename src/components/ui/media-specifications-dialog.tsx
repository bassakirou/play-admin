import { Dialog } from "./dialog";
import {
  Music,
  Video,
  BookHeadphones,
  Image,
  Layers,
  Radio,
  Info,
  CheckCircle2,
  Maximize2,
} from "lucide-react";
import { Card, CardContent } from "./card";

interface MediaSpecificationsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSection?: "all" | "music" | "video" | "audiobooks";
}

export function MediaSpecificationsContent() {
  return (
    <div className="space-y-6 text-sm text-foreground">
      {/* Introduction Banner */}
      <div className="p-4 rounded-2xl bg-primary/10 border border-primary/20 flex items-start gap-3">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="text-xs space-y-1">
          <p className="font-semibold text-foreground">
            Standards & Formats Recommandés sur PyramidPlay
          </p>
          <p className="text-muted-foreground leading-relaxed">
            Pour assurer des temps de chargement ultra-rapides et une compatibilité maximale sur mobile et web, suivez les ratios d'aspect et formats ci-dessous.
          </p>
        </div>
      </div>

      {/* 1. Résumé des formats autorisés */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Layers className="w-4 h-4 text-primary" />
          1. Formats et Extensions Autorisés
        </h3>
        <div className="grid gap-3 sm:grid-cols-3">
          <Card className="bg-card/60 border-border/80">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-emerald-500 font-semibold text-xs">
                <Music className="w-4 h-4" />
                <span>Fichiers Audio</span>
              </div>
              <div className="text-xs font-mono font-medium text-foreground">
                .mp3, .m4a, .aac, .flac, .wav
              </div>
              <p className="text-[11px] text-muted-foreground">
                320 kbps (Musique) / 128 kbps (Voix). Max 100 Mo.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/80">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-rose-500 font-semibold text-xs">
                <Video className="w-4 h-4" />
                <span>Fichiers Vidéo</span>
              </div>
              <div className="text-xs font-mono font-medium text-foreground">
                .mp4, .webm, .mov, .mkv
              </div>
              <p className="text-[11px] text-muted-foreground">
                H.264 / AAC (1080p ou 720p). Max 2 Go à 5 Go.
              </p>
            </CardContent>
          </Card>

          <Card className="bg-card/60 border-border/80">
            <CardContent className="p-3.5 space-y-1.5">
              <div className="flex items-center gap-2 text-amber-500 font-semibold text-xs">
                <Image className="w-4 h-4" />
                <span>Images & Pochettes</span>
              </div>
              <div className="text-xs font-mono font-medium text-foreground">
                .webp, .jpg, .jpeg, .png
              </div>
              <p className="text-[11px] text-muted-foreground">
                WebP recommandé. Max 5 Mo par image.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* 2. Ratios & Dimensions des Images */}
      <div>
        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3 flex items-center gap-2">
          <Maximize2 className="w-4 h-4 text-primary" />
          2. Ratios et Dimensions des Miniatures & Couvertures
        </h3>

        <div className="overflow-x-auto rounded-xl border">
          <table className="w-full text-left text-xs">
            <thead className="bg-muted/50 border-b font-semibold text-muted-foreground">
              <tr>
                <th className="p-3">Type de Contenu</th>
                <th className="p-3">Ratio</th>
                <th className="p-3">Résolution Optimale</th>
                <th className="p-3">Résolution Minimale</th>
                <th className="p-3">Format Conseillé</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  <Music className="w-3.5 h-3.5 text-emerald-500" />
                  Single / Morceau
                </td>
                <td className="p-3 font-mono font-semibold">1:1 (Carré)</td>
                <td className="p-3 font-mono">1000 × 1000 px</td>
                <td className="p-3 font-mono text-muted-foreground">500 × 500 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  <Layers className="w-3.5 h-3.5 text-indigo-500" />
                  Album Musical
                </td>
                <td className="p-3 font-mono font-semibold">1:1 (Carré)</td>
                <td className="p-3 font-mono">1400 × 1400 px</td>
                <td className="p-3 font-mono text-muted-foreground">600 × 600 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
              <tr className="hover:bg-muted/20 bg-amber-500/5">
                <td className="p-3 font-semibold flex items-center gap-2 text-amber-600 dark:text-amber-400">
                  <BookHeadphones className="w-3.5 h-3.5" />
                  Livre Audio (Audiobook)
                </td>
                <td className="p-3 font-mono font-bold text-amber-600 dark:text-amber-400">10:16 (Portrait)</td>
                <td className="p-3 font-mono">800 × 1280 px</td>
                <td className="p-3 font-mono text-muted-foreground">500 × 800 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  <Video className="w-3.5 h-3.5 text-rose-500" />
                  Miniature Vidéo (VOD)
                </td>
                <td className="p-3 font-mono font-semibold">16:9 (Paysage)</td>
                <td className="p-3 font-mono">1280 × 720 px (HD)</td>
                <td className="p-3 font-mono text-muted-foreground">640 × 360 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-red-500" />
                  Direct Vidéo (Live)
                </td>
                <td className="p-3 font-mono font-semibold">16:9 (Paysage)</td>
                <td className="p-3 font-mono">1920 × 1080 px (FHD)</td>
                <td className="p-3 font-mono text-muted-foreground">1280 × 720 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium flex items-center gap-2">
                  <Radio className="w-3.5 h-3.5 text-cyan-500" />
                  Web Radio 24/7
                </td>
                <td className="p-3 font-mono font-semibold">1:1 (Carré)</td>
                <td className="p-3 font-mono">800 × 800 px</td>
                <td className="p-3 font-mono text-muted-foreground">400 × 400 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium">Avatar Artiste / Chaîne</td>
                <td className="p-3 font-mono font-semibold">1:1 (Cercle)</td>
                <td className="p-3 font-mono">800 × 800 px</td>
                <td className="p-3 font-mono text-muted-foreground">300 × 300 px</td>
                <td className="p-3">WebP / JPEG / PNG</td>
              </tr>
              <tr className="hover:bg-muted/20">
                <td className="p-3 font-medium">Bannière Artiste / Chaîne</td>
                <td className="p-3 font-mono font-semibold">16:5 (Panoramique)</td>
                <td className="p-3 font-mono">2048 × 640 px</td>
                <td className="p-3 font-mono text-muted-foreground">1280 × 400 px</td>
                <td className="p-3">WebP / JPEG</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 3. Conseils & Optimisation */}
      <div className="p-4 rounded-xl border bg-muted/20 space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-foreground flex items-center gap-1.5">
          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          Bonnes Pratiques de Publication
        </h4>
        <ul className="text-xs text-muted-foreground space-y-1.5 list-disc list-inside leading-relaxed">
          <li><strong>Format WebP</strong> : Utilisez le format WebP pour toutes les images pour diviser leur poids par deux sans perte de netteté.</li>
          <li><strong>Vidéo Faststart (Moov Atom)</strong> : Exportez les vidéos MP4 avec l'option "Fast Start" pour que la vidéo commence immédiatement en streaming.</li>
          <li><strong>Livres Audio</strong> : Chaque chapitre audio importé est automatiquement analysé pour calculer sa durée exacte et le point de départ dans le livre.</li>
        </ul>
      </div>
    </div>
  );
}

export function MediaSpecificationsDialog({
  open,
  onOpenChange,
}: MediaSpecificationsDialogProps) {
  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      title="Guide & Spécifications des Médias"
      className="max-w-3xl max-h-[85vh] overflow-y-auto"
    >
      <MediaSpecificationsContent />
    </Dialog>
  );
}
