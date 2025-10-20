import { Toast, ToastClose, ToastDescription, ToastProvider, ToastTitle, ToastViewport } from "@/components/ui/toast";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export function Toaster() {
  const { toasts } = useToast();
  return (
    <ToastProvider>
      {toasts.map(function ({ id, title, description, action, variant, className, ...props }) {
        const variantClassName =
          variant === "destructive"
            ? "border-destructive/40 bg-destructive/10 text-destructive-foreground"
            : variant === "success"
              ? "border-emerald-400/40 bg-emerald-500/10 text-foreground"
              : undefined;
        return (
          <Toast key={id} {...props} className={cn(variantClassName, className)}>
            <div className="grid gap-1">
              {title && <ToastTitle>{title}</ToastTitle>}
              {description && <ToastDescription>{description}</ToastDescription>}
            </div>
            {action}
            <ToastClose />
          </Toast>
        );
      })}
      <ToastViewport />
    </ToastProvider>
  );
}
