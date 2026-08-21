import { Card, CardContent } from "../components/ui/card";
import { FileText } from "lucide-react";
import { MediaSpecificationsContent } from "../components/ui/media-specifications-dialog";

export default function MediaSpecifications() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2.5">
            <FileText className="w-7 h-7 text-primary" />
            Guide & Spécifications des Médias
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            Guide de référence officiel pour les formats, résolutions, ratios et débits des contenus PyramidPlay.
          </p>
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border rounded-2xl shadow-sm overflow-hidden bg-card">
        <CardContent className="p-6 md:p-8">
          <MediaSpecificationsContent />
        </CardContent>
      </Card>
    </div>
  );
}
