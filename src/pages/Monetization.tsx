import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../lib/api";
import { useAuth } from "../auth/AuthContext";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { Label } from "../components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Switch } from "../components/ui/switch";
import { toast } from "sonner";
import {
  Coins,
  Percent,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowDownToLine,
  Gift,
  DollarSign,
  TrendingUp,
  CreditCard,
  Building,
  Plus,
  Trash2,
  Settings,
  Users,
  Smartphone,
  Lock,
} from "lucide-react";

export default function Monetization() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState<"stats" | "config" | "gifts" | "withdrawals">("stats");

  // Rôle Super Admin obligatoire
  const isSuperAdmin =
    user?.role === "SUPER_ADMIN" ||
    (typeof user?.role === "object" && (user.role as any)?.name === "SUPER_ADMIN") ||
    user?.systemRoles?.includes("SUPER_ADMIN");

  // 1. Config Query
  const { data: config } = useQuery({
    queryKey: ["monetization-config"],
    queryFn: async () => {
      const res = await api.get("/monetization/admin/config");
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  // 2. Stats Query
  const { data: stats } = useQuery({
    queryKey: ["monetization-admin-stats"],
    queryFn: async () => {
      const res = await api.get("/monetization/admin/stats");
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  // 3. Gifts Query
  const { data: gifts = [] } = useQuery({
    queryKey: ["monetization-admin-gifts"],
    queryFn: async () => {
      const res = await api.get("/monetization/admin/gifts");
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  // 4. Withdrawals Query
  const { data: withdrawals = [] } = useQuery({
    queryKey: ["monetization-admin-withdrawals"],
    queryFn: async () => {
      const res = await api.get("/monetization/admin/withdrawals");
      return res.data;
    },
    enabled: isSuperAdmin,
  });

  // États pour Formulaire Configuration
  const [taraApiKey, setTaraApiKey] = useState("");
  const [taraBusinessId, setTaraBusinessId] = useState("");
  const [taraWebhookSecret, setTaraWebhookSecret] = useState("");
  const [taraBaseUrl, setTaraBaseUrl] = useState("https://www.dklo.co/api/tara");
  const [taraReturnUrl, setTaraReturnUrl] = useState("");
  const [taraWebhookUrl, setTaraWebhookUrl] = useState("");
  const [isLiveMode, setIsLiveMode] = useState(false);
  const [platformFeePercent, setPlatformFeePercent] = useState(30);
  const [creatorSharePercent, setCreatorSharePercent] = useState(70);
  const [minWithdrawalAmount, setMinWithdrawalAmount] = useState(5000);
  const [operatorOmFeePercent, setOperatorOmFeePercent] = useState(1.5);
  const [operatorMomoFeePercent, setOperatorMomoFeePercent] = useState(1.5);

  useEffect(() => {
    if (config) {
      setTaraApiKey(config.taraApiKey || "");
      setTaraBusinessId(config.taraBusinessId || "");
      setTaraWebhookSecret(config.taraWebhookSecret || "");
      setTaraBaseUrl(config.taraBaseUrl || "https://www.dklo.co/api/tara");
      setTaraReturnUrl(config.taraReturnUrl || "");
      setTaraWebhookUrl(config.taraWebhookUrl || "");
      setIsLiveMode(config.isLiveMode ?? false);
      setPlatformFeePercent(config.platformFeePercent ?? 30);
      setCreatorSharePercent(config.creatorSharePercent ?? 70);
      setMinWithdrawalAmount(config.minWithdrawalAmount ?? 5000);
      setOperatorOmFeePercent(config.operatorOmFeePercent ?? 1.5);
      setOperatorMomoFeePercent(config.operatorMomoFeePercent ?? 1.5);
    }
  }, [config]);

  // Mutation Sauvegarde Config
  const updateConfigMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.put("/monetization/admin/config", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Configuration financière enregistrée !");
      qc.invalidateQueries({ queryKey: ["monetization-config"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors de la sauvegarde.");
    },
  });

  const handleSaveConfig = () => {
    updateConfigMutation.mutate({
      taraApiKey,
      taraBusinessId,
      taraWebhookSecret,
      taraBaseUrl,
      taraReturnUrl,
      taraWebhookUrl,
      isLiveMode,
      platformFeePercent: Number(platformFeePercent),
      creatorSharePercent: Number(creatorSharePercent),
      minWithdrawalAmount: Number(minWithdrawalAmount),
      operatorOmFeePercent: Number(operatorOmFeePercent),
      operatorMomoFeePercent: Number(operatorMomoFeePercent),
    });
  };

  // États pour Création de Cadeau
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [newGiftName, setNewGiftName] = useState("");
  const [newGiftLabel, setNewGiftLabel] = useState("");
  const [newGiftAmount, setNewGiftAmount] = useState(1000);
  const [newGiftIconUrl, setNewGiftIconUrl] = useState("");
  const [newGiftDesc, setNewGiftDesc] = useState("");

  const createGiftMutation = useMutation({
    mutationFn: async (payload: any) => {
      const res = await api.post("/monetization/admin/gifts", payload);
      return res.data;
    },
    onSuccess: () => {
      toast.success("Nouveau cadeau créé avec succès !");
      qc.invalidateQueries({ queryKey: ["monetization-admin-gifts"] });
      setShowGiftModal(false);
      setNewGiftName("");
      setNewGiftLabel("");
      setNewGiftAmount(1000);
      setNewGiftIconUrl("");
      setNewGiftDesc("");
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors de la création.");
    },
  });

  const deleteGiftMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete("/monetization/admin/gifts/" + id);
    },
    onSuccess: () => {
      toast.success("Cadeau supprimé.");
      qc.invalidateQueries({ queryKey: ["monetization-admin-gifts"] });
    },
  });

  // Mutation Traitement Retrait
  const reviewWithdrawalMutation = useMutation({
    mutationFn: async ({ id, action, rejectionReason }: { id: string; action: string; rejectionReason?: string }) => {
      const res = await api.post("/monetization/admin/withdrawals/" + id + "/review", {
        action,
        rejectionReason,
      });
      return res.data;
    },
    onSuccess: (_, vars) => {
      if (vars.action === "PAY_NOW") {
        toast.success("Versement Tara initié et marqué PAYÉ avec succès !");
      } else if (vars.action === "APPROVE") {
        toast.success("Demande validée.");
      } else {
        toast.info("Demande rejetée.");
      }
      qc.invalidateQueries({ queryKey: ["monetization-admin-withdrawals"] });
      qc.invalidateQueries({ queryKey: ["monetization-admin-stats"] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || "Erreur lors du traitement.");
    },
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <div className="p-4 rounded-full bg-destructive/10 text-destructive mb-4">
          <Lock className="w-10 h-10" />
        </div>
        <h2 className="text-xl font-bold">Accès Réservé aux Super Administrateurs</h2>
        <p className="text-sm text-muted-foreground mt-2 max-w-md">
          Cet espace de contrôle de la monétisation, des flux financiers Tara Money et des reversements nécessite des privilèges Super Admin.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 border-b pb-6">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-500">
              <Coins className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tight">Espace Monétisation & Finance</h1>
              <p className="text-xs text-muted-foreground">
                Passerelle Tara Money • Flux Orange Money & MTN MoMo • Commissions 70/30 • Cadeaux & Abonnements
              </p>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-muted/60 rounded-xl border border-border/50 text-xs font-semibold">
          <button
            onClick={() => setActiveTab("stats")}
            className={"flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all " + (activeTab === "stats" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground")}
          >
            <TrendingUp className="w-4 h-4" />
            <span>Tableau de Bord</span>
          </button>
          <button
            onClick={() => setActiveTab("withdrawals")}
            className={"flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all " + (activeTab === "withdrawals" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground")}
          >
            <ArrowDownToLine className="w-4 h-4" />
            <span>Réclamations Retraits</span>
          </button>
          <button
            onClick={() => setActiveTab("gifts")}
            className={"flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all " + (activeTab === "gifts" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground")}
          >
            <Gift className="w-4 h-4" />
            <span>Cadeaux Personnalisés</span>
          </button>
          <button
            onClick={() => setActiveTab("config")}
            className={"flex items-center gap-2 px-3.5 py-2 rounded-lg transition-all " + (activeTab === "config" ? "bg-background text-foreground shadow-sm font-bold" : "text-muted-foreground hover:text-foreground")}
          >
            <Settings className="w-4 h-4" />
            <span>Clés API & Frais</span>
          </button>
        </div>
      </div>

      {/* 1. ONGLET STATISTIQUES FINANCIÈRES */}
      {activeTab === "stats" && (
        <div className="space-y-6">
          {/* Key KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="bg-card/70 backdrop-blur-sm border-border/60">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Volume d'Affaires Brut</p>
                  <h3 className="text-2xl font-black mt-1 text-foreground">
                    {(stats?.totalVolume ?? 0).toLocaleString()} <span className="text-xs font-bold text-amber-500">XAF</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Transactions validées</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                  <DollarSign className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border/60">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">CA PyramidPlay (30%)</p>
                  <h3 className="text-2xl font-black mt-1 text-emerald-500">
                    {(stats?.totalPlatformRevenue ?? 0).toLocaleString()} <span className="text-xs font-bold">XAF</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Commissions nettes Play</p>
                </div>
                <div className="p-3 rounded-2xl bg-emerald-500/10 text-emerald-500">
                  <Percent className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border/60">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Part Créateurs (70%)</p>
                  <h3 className="text-2xl font-black mt-1 text-blue-500">
                    {(stats?.totalCreatorPayouts ?? 0).toLocaleString()} <span className="text-xs font-bold">XAF</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">Gains des créateurs & artistes</p>
                </div>
                <div className="p-3 rounded-2xl bg-blue-500/10 text-blue-500">
                  <Users className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>

            <Card className="bg-card/70 backdrop-blur-sm border-border/60">
              <CardContent className="p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Retraits en Attente</p>
                  <h3 className="text-2xl font-black mt-1 text-amber-600 dark:text-amber-400">
                    {(stats?.totalPendingWithdrawals ?? 0).toLocaleString()} <span className="text-xs font-bold">XAF</span>
                  </h3>
                  <p className="text-[11px] text-muted-foreground mt-1">À valider ou verser</p>
                </div>
                <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500">
                  <Clock className="w-6 h-6" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Top Créateurs */}
            <Card className="lg:col-span-2 border-border/60">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-bold flex items-center gap-2">
                  <Users className="w-4 h-4 text-primary" />
                  Top Créateurs & Artistes Rémunérés
                </CardTitle>
                <CardDescription className="text-xs">Classement selon les revenus nets générés (70%)</CardDescription>
              </CardHeader>
              <CardContent>
                {stats?.topArtists && stats.topArtists.length > 0 ? (
                  <div className="divide-y divide-border/40">
                    {stats.topArtists.map((item: any, idx: number) => (
                      <div key={item.artistId} className="py-3 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="text-xs font-bold w-5 text-muted-foreground">#{idx + 1}</span>
                          <div className="w-9 h-9 rounded-full bg-muted flex items-center justify-center overflow-hidden border">
                            {item.artist?.imageUrl ? (
                              <img src={item.artist.imageUrl} alt={item.artist.name} className="w-full h-full object-cover" />
                            ) : (
                              <Users className="w-4 h-4 text-muted-foreground" />
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-foreground">{item.artist?.name || "Artiste inconnu"}</p>
                            <p className="text-[11px] text-muted-foreground">{item.artist?.country || "Cameroun"}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-black text-amber-500">{item.revenue.toLocaleString()} XAF</p>
                          <span className="text-[10px] text-muted-foreground">Gains 70%</span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center text-xs text-muted-foreground">
                    Aucune transaction enregistrée pour le moment.
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Répartition par type & opérateur */}
            <div className="space-y-6">
              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <CreditCard className="w-4 h-4 text-primary" />
                    Répartition par Type de Flux
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Ventes de Contenus</span>
                    <span className="font-bold">{((stats?.byType?.CONTENT_PURCHASE ?? 0)).toLocaleString()} XAF</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Cadeaux & Pourboires</span>
                    <span className="font-bold">{((stats?.byType?.GIFT ?? 0)).toLocaleString()} XAF</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-muted-foreground">Abonnements Rôle Académique</span>
                    <span className="font-bold">{((stats?.byType?.ACADEMIC_SUBSCRIPTION ?? 0)).toLocaleString()} XAF</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60">
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-bold flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-primary" />
                    Opérateurs de Règlement
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-orange-500"></span>
                      <span>Orange Money Cameroun</span>
                    </div>
                    <span className="font-bold">{((stats?.byOperator?.ORANGE_CMR ?? 0)).toLocaleString()} XAF</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-yellow-500"></span>
                      <span>MTN Mobile Money</span>
                    </div>
                    <span className="font-bold">{((stats?.byOperator?.MTN_MOMO_CMR ?? 0)).toLocaleString()} XAF</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      )}

      {/* 2. ONGLET RÉCLAMATIONS DE RETRAIT */}
      {activeTab === "withdrawals" && (
        <Card className="border-border/60">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <ArrowDownToLine className="w-4 h-4 text-primary" />
                Demandes de Versement des Artistes & Créateurs
              </CardTitle>
              <CardDescription className="text-xs">
                Les artistes réclament le versement de leurs 70%. Les frais opérateurs sont supportés par le bénéficiaire.
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {withdrawals.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b bg-muted/30 uppercase font-semibold text-muted-foreground">
                    <tr>
                      <th className="p-3">Créateur / Artiste</th>
                      <th className="p-3">Téléphone & Mode</th>
                      <th className="p-3 text-right">Montant Brut</th>
                      <th className="p-3 text-right">Frais Opérateur</th>
                      <th className="p-3 text-right">Net à Verser</th>
                      <th className="p-3">Statut</th>
                      <th className="p-3 text-right">Actions Super Admin</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {withdrawals.map((w: any) => (
                      <tr key={w.id} className="hover:bg-muted/20 transition-colors">
                        <td className="p-3">
                          <p className="font-bold text-foreground">{w.artist?.name}</p>
                          <p className="text-[11px] text-muted-foreground">{w.user?.email}</p>
                        </td>
                        <td className="p-3">
                          <p className="font-medium font-mono">{w.phoneNumber}</p>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-muted font-bold">
                            {w.paymentMethod}
                          </span>
                        </td>
                        <td className="p-3 text-right font-medium">{w.amountRequested.toLocaleString()} XAF</td>
                        <td className="p-3 text-right text-destructive font-medium">-{w.operatorFees.toLocaleString()} XAF</td>
                        <td className="p-3 text-right font-bold text-emerald-500">{w.netAmount.toLocaleString()} XAF</td>
                        <td className="p-3">
                          <span
                            className={
                              "px-2 py-1 rounded-full text-[10px] font-bold " +
                              (w.status === "PAID"
                                ? "bg-emerald-500/10 text-emerald-500"
                                : w.status === "PENDING"
                                ? "bg-amber-500/10 text-amber-500"
                                : w.status === "APPROVED"
                                ? "bg-blue-500/10 text-blue-500"
                                : "bg-destructive/10 text-destructive")
                            }
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="p-3 text-right space-x-2">
                          {w.status === "PENDING" && (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs border-emerald-500 text-emerald-500 hover:bg-emerald-500/10"
                                onClick={() => reviewWithdrawalMutation.mutate({ id: w.id, action: "PAY_NOW" })}
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                                Payer (Tara)
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                className="h-7 text-xs text-destructive hover:bg-destructive/10"
                                onClick={() => {
                                  const reason = prompt("Motif du rejet :");
                                  if (reason) {
                                    reviewWithdrawalMutation.mutate({ id: w.id, action: "REJECT", rejectionReason: reason });
                                  }
                                }}
                              >
                                Rejeter
                              </Button>
                            </>
                          )}
                          {w.status === "PAID" && (
                            <span className="text-[11px] text-muted-foreground font-mono">
                              Payout #{w.payoutId}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-muted-foreground">
                Aucune réclamation de retrait enregistrée.
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* 3. ONGLET CATALOGUE DES CADEAUX */}
      {activeTab === "gifts" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold">Catalogue des Cadeaux Personnalisés</h3>
              <p className="text-xs text-muted-foreground">
                Inspirés de la cosmogonie et de la symbolique africaine (Lion, Cauris, Baobab, Tortue, etc.)
              </p>
            </div>
            <Button onClick={() => setShowGiftModal(true)} className="gap-2 text-xs">
              <Plus className="w-4 h-4" />
              Nouveau Cadeau
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {gifts.map((g: any) => (
              <Card key={g.id} className="border-border/60 hover:border-amber-500/50 transition-colors">
                <CardContent className="p-4 flex flex-col justify-between h-full space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-muted text-muted-foreground font-mono">
                      {g.name}
                    </span>
                    <button
                      onClick={() => {
                        if (confirm("Supprimer ce cadeau ?")) {
                          deleteGiftMutation.mutate(g.id);
                        }
                      }}
                      className="p-1 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex flex-col items-center text-center space-y-2 py-2">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 flex items-center justify-center p-3 border border-amber-500/20">
                      {g.iconUrl ? (
                        <img src={g.iconUrl} alt={g.label} className="w-full h-full object-contain" />
                      ) : (
                        <Gift className="w-8 h-8 text-amber-500" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-black text-sm text-foreground">{g.label}</h4>
                      <p className="text-[11px] text-muted-foreground line-clamp-2 mt-1">{g.description}</p>
                    </div>
                  </div>

                  <div className="pt-2 border-t flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Valeur :</span>
                    <span className="text-sm font-black text-amber-500">{g.amount.toLocaleString()} XAF</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Modal Ajout Cadeau */}
          {showGiftModal && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-card border border-border rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold">Ajouter un Cadeau Africain</h3>
                  <button onClick={() => setShowGiftModal(false)} className="text-muted-foreground hover:text-foreground">
                    <XCircle className="w-5 h-5" />
                  </button>
                </div>

                <div className="space-y-3 text-xs">
                  <div>
                    <Label className="text-xs">Identifiant Majuscule (ex: LION, TORTUE)</Label>
                    <Input
                      value={newGiftName}
                      onChange={(e) => setNewGiftName(e.target.value)}
                      placeholder="LION"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Libellé d'affichage (ex: Lion Royal Indomptable)</Label>
                    <Input
                      value={newGiftLabel}
                      onChange={(e) => setNewGiftLabel(e.target.value)}
                      placeholder="Lion Royal"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Montant en XAF (ex: 100000)</Label>
                    <Input
                      type="number"
                      value={newGiftAmount}
                      onChange={(e) => setNewGiftAmount(Number(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">URL de l'icône (PNG, SVG, GIF)</Label>
                    <Input
                      value={newGiftIconUrl}
                      onChange={(e) => setNewGiftIconUrl(e.target.value)}
                      placeholder="/assets/gifts/lion.svg"
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label className="text-xs">Description symbolique</Label>
                    <Input
                      value={newGiftDesc}
                      onChange={(e) => setNewGiftDesc(e.target.value)}
                      placeholder="Symbole ancestral de puissance et dignité royale."
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="pt-4 flex justify-end gap-2">
                  <Button variant="outline" size="sm" onClick={() => setShowGiftModal(false)}>
                    Annuler
                  </Button>
                  <Button
                    size="sm"
                    disabled={!newGiftName || !newGiftLabel || newGiftAmount <= 0}
                    onClick={() =>
                      createGiftMutation.mutate({
                        name: newGiftName,
                        label: newGiftLabel,
                        amount: newGiftAmount,
                        iconUrl: newGiftIconUrl || "/assets/gifts/default.svg",
                        description: newGiftDesc,
                      })
                    }
                  >
                    Enregistrer le Cadeau
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ONGLET CONFIGURATION CLÉS API & FRAIS */}
      {activeTab === "config" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Credentials Tara Money */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Building className="w-4 h-4 text-primary" />
                Paramètres API Tara Money
              </CardTitle>
              <CardDescription className="text-xs">
                Credentials de votre compte marchand Tara Money (https://www.dklo.co/api/tara)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-1">
                <Label className="text-xs font-semibold">Clé API (Production / Sandbox)</Label>
                <Input
                  type="password"
                  value={taraApiKey}
                  onChange={(e) => setTaraApiKey(e.target.value)}
                  placeholder="tara_live_... ou tara_sandbox_..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Business ID Marchand</Label>
                <Input
                  value={taraBusinessId}
                  onChange={(e) => setTaraBusinessId(e.target.value)}
                  placeholder="biz_..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Secret Webhook (Optionnel)</Label>
                <Input
                  type="password"
                  value={taraWebhookSecret}
                  onChange={(e) => setTaraWebhookSecret(e.target.value)}
                  placeholder="whsec_..."
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Base URL API Tara Money</Label>
                <Input
                  value={taraBaseUrl}
                  onChange={(e) => setTaraBaseUrl(e.target.value)}
                  placeholder="https://www.dklo.co/api/tara"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">Par défaut: https://www.dklo.co/api/tara</p>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Return URL (Redirection post-paiement)</Label>
                <Input
                  value={taraReturnUrl}
                  onChange={(e) => setTaraReturnUrl(e.target.value)}
                  placeholder="https://play.pyramidplay.cm ou URL de retour"
                  className="font-mono text-xs"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Webhook URL (Notifications IPN Tara)</Label>
                <Input
                  value={taraWebhookUrl}
                  onChange={(e) => setTaraWebhookUrl(e.target.value)}
                  placeholder="https://votre-domaine.com/monetization/webhook/tara ou URL Ngrok"
                  className="font-mono text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  En local avec Ngrok : https://xxxx.ngrok-free.dev/monetization/webhook/tara
                </p>
              </div>

              <div className="pt-2 flex items-center justify-between border-t">
                <div>
                  <Label className="text-xs font-semibold">Mode Live / Production</Label>
                  <p className="text-[11px] text-muted-foreground">
                    Désactivé = flux de simulation local pour tests sans débit réel
                  </p>
                </div>
                <Switch checked={isLiveMode} onCheckedChange={setIsLiveMode} />
              </div>

              <div className="pt-4 flex justify-end border-t">
                <Button 
                  onClick={handleSaveConfig} 
                  disabled={updateConfigMutation.isPending}
                  className="gap-2 text-xs w-full sm:w-auto"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {updateConfigMutation.isPending ? "Enregistrement..." : "Enregistrer la Configuration Tara"}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Commissions & Règles Opérateurs */}
          <Card className="border-border/60">
            <CardHeader>
              <CardTitle className="text-base font-bold flex items-center gap-2">
                <Percent className="w-4 h-4 text-primary" />
                Commissions & Frais Opérateurs
              </CardTitle>
              <CardDescription className="text-xs">
                Répartition des revenus (70/30) et gestion des frais de versement
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Part PyramidPlay (%)</Label>
                  <Input
                    type="number"
                    value={platformFeePercent}
                    onChange={(e) => setPlatformFeePercent(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-muted-foreground">Par défaut 30%</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Part Créateurs (%)</Label>
                  <Input
                    type="number"
                    value={creatorSharePercent}
                    onChange={(e) => setCreatorSharePercent(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-muted-foreground">Par défaut 70%</span>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-semibold">Seuil Minimum de Réclamation de Retrait (XAF)</Label>
                <Input
                  type="number"
                  value={minWithdrawalAmount}
                  onChange={(e) => setMinWithdrawalAmount(Number(e.target.value))}
                />
                <span className="text-[10px] text-muted-foreground">Montant minimum requis pour demander un versement</span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2 border-t">
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Frais Versement Orange Money (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={operatorOmFeePercent}
                    onChange={(e) => setOperatorOmFeePercent(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-muted-foreground">Déduits au créateur</span>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs font-semibold">Frais Versement MTN MoMo (%)</Label>
                  <Input
                    type="number"
                    step="0.1"
                    value={operatorMomoFeePercent}
                    onChange={(e) => setOperatorMomoFeePercent(Number(e.target.value))}
                  />
                  <span className="text-[10px] text-muted-foreground">Déduits au créateur</span>
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button onClick={handleSaveConfig} className="gap-2 text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Sauvegarder les Paramètres
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
