import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import api from "../lib/api";
import { Button } from "../components/ui/button";
import { Lock, Save, Sparkles, Music, BookOpen, Video, ShieldCheck, Check, GraduationCap } from "lucide-react";
import { toast } from "sonner";

export default function ProfileSettings() {
  const { user } = useAuth();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // System roles state
  const [systemRoles, setSystemRoles] = useState<string[]>([]);
  const [isSavingRoles, setIsSavingRoles] = useState(false);

  useEffect(() => {
    if (user?.id) {
      api.get(`/users/${user.id}`).then((res) => {
        if (res.data?.systemRoles) {
          setSystemRoles(res.data.systemRoles);
        } else if ((user as any)?.systemRoles) {
          setSystemRoles((user as any).systemRoles);
        }
      }).catch(() => {
        if ((user as any)?.systemRoles) {
          setSystemRoles((user as any).systemRoles);
        }
      });
    }
  }, [user]);

  const handleToggleRole = (role: string) => {
    if (role === "SUPER_ADMIN") return; // Super admin cannot be toggled manually
    setSystemRoles((prev) =>
      prev.includes(role) ? prev.filter((r) => r !== role) : [...prev, role]
    );
  };

  const handleSaveSystemRoles = async () => {
    setIsSavingRoles(true);
    try {
      await api.patch("/users/me/system-roles", { systemRoles });
      toast.success("Vos casquettes et rôles système ont été mis à jour avec succès.");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Erreur lors de la mise à jour";
      toast.error(errorMsg);
    } finally {
      setIsSavingRoles(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage(null);

    if (newPassword !== confirmPassword) {
      setPasswordMessage({ type: "error", text: "Les nouveaux mots de passe ne correspondent pas." });
      return;
    }

    if (newPassword.length < 6) {
      setPasswordMessage({ type: "error", text: "Le mot de passe doit contenir au moins 6 caractères." });
      return;
    }

    setIsLoading(true);
    try {
      await api.post("/auth/change-password", {
        currentPassword,
        newPassword
      });

      setPasswordMessage({ type: "success", text: "Mot de passe modifié avec succès." });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      const errorMsg = err.response?.data?.message || err.message || "Une erreur est survenue";
      setPasswordMessage({ type: "error", text: errorMsg });
    } finally {
      setIsLoading(false);
    }
  };

  const isSuperAdmin =
    systemRoles.includes("SUPER_ADMIN") ||
    user?.role === "SUPER_ADMIN" ||
    (typeof user?.role === "object" && user?.role?.name === "SUPER_ADMIN");

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Account Info Card */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h2 className="text-xl font-bold">Mon Profil</h2>
          <p className="text-sm text-muted-foreground mt-1">
            Gérez vos paramètres de compte, vos casquettes métiers et votre sécurité.
          </p>
        </div>

        <div className="p-6 space-y-6">
          <div>
            <h3 className="text-sm font-semibold mb-3">Informations du compte</h3>
            <div className="grid gap-3 sm:grid-cols-3">
              <div className="p-3.5 rounded-xl bg-accent/40 border">
                <div className="text-xs text-muted-foreground">Nom d'utilisateur</div>
                <div className="font-medium text-sm mt-0.5 truncate">{user?.name}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-accent/40 border">
                <div className="text-xs text-muted-foreground">Adresse Email</div>
                <div className="font-medium text-sm mt-0.5 truncate">{user?.email}</div>
              </div>
              <div className="p-3.5 rounded-xl bg-accent/40 border">
                <div className="text-xs text-muted-foreground">Rôle d'administration</div>
                <div className="font-medium text-sm mt-0.5 truncate">
                  {typeof user?.role === "string" ? user?.role : user?.role?.name || "N/A"}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* System Roles / Casquettes Card */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              Mes Casquettes & Rôles Métier (Système)
            </h3>
            <p className="text-xs text-muted-foreground mt-0.5">
              Définissez vos profils d'activité sur PyramidPlay. Vous pouvez cumuler plusieurs casquettes.
            </p>
          </div>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {/* ARTIST */}
            <div
              onClick={() => handleToggleRole("ARTIST")}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                systemRoles.includes("ARTIST")
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-muted/30 hover:bg-muted/60 border-border"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  systemRoles.includes("ARTIST")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Music className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Artiste (Musique)</h4>
                  {systemRoles.includes("ARTIST") && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check className="w-3.5 h-3.5" /> Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Crée et lie automatiquement votre profil au catalogue des artistes musicaux.
                </p>
              </div>
            </div>

            {/* AUTHOR */}
            <div
              onClick={() => handleToggleRole("AUTHOR")}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                systemRoles.includes("AUTHOR")
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-muted/30 hover:bg-muted/60 border-border"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  systemRoles.includes("AUTHOR")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Auteur (Livres Audio)</h4>
                  {systemRoles.includes("AUTHOR") && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check className="w-3.5 h-3.5" /> Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Vous permet de publier et d'apparaître comme auteur sélectionnable pour les livres audio.
                </p>
              </div>
            </div>

            {/* CREATOR */}
            <div
              onClick={() => handleToggleRole("CREATOR")}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                systemRoles.includes("CREATOR")
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-muted/30 hover:bg-muted/60 border-border"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  systemRoles.includes("CREATOR")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Video className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Créateur (Vidéos & Chaînes)</h4>
                  {systemRoles.includes("CREATOR") && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check className="w-3.5 h-3.5" /> Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Réservé à la publication et gestion de vidéos, podcasts visuels et chaînes.
                </p>
              </div>
            </div>

            {/* ACADEMIC */}
            <div
              onClick={() => handleToggleRole("ACADEMIC")}
              className={`p-4 rounded-xl border transition-all cursor-pointer flex items-start gap-3 ${
                systemRoles.includes("ACADEMIC")
                  ? "bg-primary/10 border-primary shadow-sm"
                  : "bg-muted/30 hover:bg-muted/60 border-border"
              }`}
            >
              <div
                className={`p-2 rounded-lg shrink-0 ${
                  systemRoles.includes("ACADEMIC")
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <GraduationCap className="w-5 h-5" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold">Formateur (Académique & LMS)</h4>
                  {systemRoles.includes("ACADEMIC") && (
                    <span className="flex items-center gap-1 text-[11px] font-semibold text-primary">
                      <Check className="w-3.5 h-3.5" /> Actif
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                  Autorise la création, la publication et la gestion de formations, cours, modules et syllabus.
                </p>
              </div>
            </div>

            {/* SUPER ADMIN (Read Only badge) */}
            {isSuperAdmin && (
              <div className="p-4 rounded-xl border bg-amber-500/10 border-amber-500/30 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-amber-500 text-white shrink-0">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-semibold text-amber-600 dark:text-amber-400">
                      Super Administrateur
                    </h4>
                    <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 dark:text-amber-400">
                      Réservé
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                    Accès complet et privilèges globaux sur la plateforme.
                  </p>
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end">
            <Button
              onClick={handleSaveSystemRoles}
              loading={isSavingRoles}
              className="gap-2 px-6"
            >
              {!isSavingRoles && <Save className="w-4 h-4" />}
              {isSavingRoles ? "Enregistrement…" : "Enregistrer mes casquettes"}
            </Button>
          </div>
        </div>
      </div>

      {/* Password Security Card */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="p-6 border-b bg-muted/20">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Lock className="w-4 h-4 text-primary" />
            Sécurité du mot de passe
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Modifiez votre mot de passe pour sécuriser votre compte.
          </p>
        </div>

        <div className="p-6">
          {passwordMessage && (
            <div
              className={`p-4 mb-4 rounded-xl text-sm border ${
                passwordMessage.type === "success"
                  ? "bg-green-500/10 text-green-600 border-green-500/20"
                  : "bg-red-500/10 text-red-600 border-red-500/20"
              }`}
            >
              {passwordMessage.text}
            </div>
          )}

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Mot de passe actuel</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                className="w-full px-4 py-2 text-sm rounded-xl bg-background border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">Nouveau mot de passe</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-4 py-2 text-sm rounded-xl bg-background border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            <div>
              <label className="text-xs font-medium mb-1 block">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-2 text-sm rounded-xl bg-background border focus:outline-none focus:ring-2 focus:ring-primary transition-all"
                required
              />
            </div>

            <div className="pt-2 flex justify-end">
              <Button type="submit" loading={isLoading} className="px-6 gap-2">
                {!isLoading && <Save className="w-4 h-4" />}
                {isLoading ? "Modification…" : "Changer le mot de passe"}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
