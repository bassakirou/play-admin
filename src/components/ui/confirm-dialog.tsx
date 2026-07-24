import { Dialog } from "./dialog";
import { Button } from "./button";
import { AlertTriangle } from "lucide-react";

type ConfirmDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "destructive" | "primary";
  loading?: boolean;
  onConfirm: () => void;
};

export function ConfirmDialog({
  open,
  onOpenChange,
  title = "Êtes-vous sûr ?",
  description = "Cette action est irréversible. Souhaitez-vous vraiment continuer ?",
  confirmText = "Supprimer",
  cancelText = "Annuler",
  variant = "destructive",
  loading = false,
  onConfirm,
}: ConfirmDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-md p-6">
      <div className="flex items-start gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertTriangle className="h-5 w-5" />
        </div>
        <div className="space-y-1 text-left flex-1">
          <h3 className="text-base font-semibold leading-6 text-foreground">
            {title}
          </h3>
          <p className="text-sm text-muted-foreground">{description}</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-3">
        <Button
          type="button"
          variant="outline"
          disabled={loading}
          onClick={() => onOpenChange(false)}
        >
          {cancelText}
        </Button>
        <Button
          type="button"
          variant={variant === "destructive" ? "destructive" : "default"}
          disabled={loading}
          onClick={() => {
            onConfirm();
          }}
        >
          {loading ? "En cours..." : confirmText}
        </Button>
      </div>
    </Dialog>
  );
}
