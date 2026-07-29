import { useState } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Lock, Save } from "lucide-react";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);

    if (newPassword !== confirmPassword) {
      setMessage({ type: "error", text: "Les nouveaux mots de passe ne correspondent pas." });
      return;
    }

    if (newPassword.length < 6) {
      setMessage({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword
      });

      setMessage({ type: "success", text: "Mot de passe modifié avec succès." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Une erreur est survenue";
      setMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h2 className="text-xl font-bold">Mon Profil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos paramètres de compte et votre sécurité.
          </p>
        </div>

        <div className="p-6">
          <div className="mb-8">
            <h3 className="text-sm font-semibold mb-2">Informations du compte</h3>
            <div className="grid gap-4">
              <div className="p-4 rounded-xl bg-accent/50 border">
                <div className="text-sm text-muted-foreground">Nom d'utilisateur</div>
                <div className="font-medium">{user?.name}</div>
              </div>
              <div className="p-4 rounded-xl bg-accent/50 border">
                <div className="text-sm text-muted-foreground">Adresse Email</div>
                <div className="font-medium">{user?.email}</div>
              </div>
              <div className="p-4 rounded-xl bg-accent/50 border">
                <div className="text-sm text-muted-foreground">Rôle</div>
                <div className="font-medium">{typeof user?.role === "string" ? user?.role : user?.role?.name || "N/A"}</div>
              </div>
            </div>
          </div>

          <div>
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Changer de mot de passe
            </h3>
            
            {message && (
              <div className={`p-4 mb-4 rounded-xl text-sm border ${message.type === 'success' ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                {message.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Mot de passe actuel</label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-background border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Nouveau mot de passe</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-background border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>

              <div>
                <label className="text-sm font-medium mb-1 block">Confirmer le nouveau mot de passe</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-2 rounded-xl bg-background border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                  required
                />
              </div>

              <div className="pt-2">
                <Button type="submit" loading={isLoading} className="w-full md:w-auto px-8 gap-2">
                  {!isLoading && <Save className="w-4 h-4" />}
                  {isLoading ? "Enregistrement…" : "Enregistrer les modifications"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
