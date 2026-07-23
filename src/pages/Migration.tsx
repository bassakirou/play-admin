import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { useAuth } from "../auth/AuthContext";
import { Download, Upload, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

export default function Migration() {
  const { token } = useAuth();
  const [isExporting, setIsExporting] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importSuccess, setImportSuccess] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  const API_URL = import.meta.env.VITE_API_URL || import.meta.env.VITE_API_BASE_URL || "http://localhost:3000";

  const handleExport = async () => {
    try {
      setIsExporting(true);
      const res = await fetch(`${API_URL}/migration/export`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) throw new Error("Erreur lors de l'exportation");

      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `pyramidplay-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err: any) {
      console.error(err);
      alert(err.message || "Failed to export data");
    } finally {
      setIsExporting(false);
    }
  };

  const handleImport = async () => {
    if (!importFile) return;

    try {
      setIsImporting(true);
      setImportError(null);
      setImportSuccess(false);

      const fileText = await importFile.text();
      const jsonData = JSON.parse(fileText);

      const res = await fetch(`${API_URL}/migration/import`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(jsonData),
      });

      if (!res.ok) {
         const errData = await res.json().catch(() => null);
         throw new Error(errData?.message || "Erreur lors de l'importation");
      }

      setImportSuccess(true);
      setImportFile(null);
    } catch (err: any) {
      console.error(err);
      setImportError(err.message || "Échec de l'importation. Vérifiez le format du fichier.");
    } finally {
      setIsImporting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Migration & Backup</h1>
        <p className="text-muted-foreground">
          Gérez l'exportation et l'importation de toutes les données de la plateforme, incluant le transfert de médias CDN.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Export Card */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="w-5 h-5" />
              Exporter les données
            </CardTitle>
            <CardDescription>
              Téléchargez l'intégralité de la base de données (Utilisateurs, Artistes, Albums, Chansons, Vidéos) sous format JSON.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleExport} disabled={isExporting} className="w-full">
              {isExporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Génération en cours...
                </>
              ) : (
                "Télécharger la sauvegarde (JSON)"
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Import Card */}
        <Card className="border-blue-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="w-5 h-5" />
              Importer et Migrer
            </CardTitle>
            <CardDescription>
              Uploadez un fichier JSON. Le système restaurera la base de données et téléchargera automatiquement les médias (Vercel) vers votre CDN local (MinIO).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            
            <div className="bg-yellow-500/10 text-yellow-600 p-3 rounded-md flex gap-2 items-start text-sm">
               <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
               <p>
                 Cette opération peut prendre <strong>beaucoup de temps</strong> selon le nombre de médias à télécharger. Veuillez ne pas fermer cette page pendant le chargement.
               </p>
            </div>

            <div className="space-y-2">
               <Input
                 type="file"
                 accept=".json,application/json"
                 onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                 disabled={isImporting}
               />
            </div>

            <Button 
               onClick={handleImport} 
               disabled={!importFile || isImporting} 
               className="w-full"
               variant="default"
            >
              {isImporting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Importation en cours... (Ne pas fermer)
                </>
              ) : (
                "Lancer la migration"
              )}
            </Button>

            {importError && (
              <p className="text-sm text-red-500 mt-2 font-medium">
                {importError}
              </p>
            )}
            
            {importSuccess && (
              <div className="flex items-center gap-2 text-sm text-green-500 mt-2 font-medium">
                <CheckCircle2 className="w-4 h-4" />
                Importation et migration terminées avec succès !
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
