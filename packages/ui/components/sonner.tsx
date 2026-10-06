import { AlertOctagon, AlertTriangle, CheckCircle, Info, Loader } from "lucide-react";
import { useTheme } from "next-themes";
import { type ToasterProps } from "sonner";
import { Toaster as Sonner } from "sonner";

function Toaster({ ...props }: ToasterProps) {
  const { theme = "system" } = useTheme();
  // SAFETY: next-themes' runtime value is limited to the toaster's supported theme names.
  const toasterTheme = theme as ToasterProps["theme"];

  // SAFETY: each CSS custom property below contains a CSS token string.
  const style = {
    "--border-radius": "var(--radius)",
    "--normal-bg": "var(--popover)",
    "--normal-border": "var(--border)",
    "--normal-text": "var(--popover-foreground)"
  } as React.CSSProperties;

  return (
    <Sonner
      theme={toasterTheme}
      className="toaster group"
      icons={{
        error: <AlertOctagon className="size-4" />,
        info: <Info className="size-4" />,
        loading: <Loader className="size-4 animate-spin" />,
        success: <CheckCircle className="size-4" />,
        warning: <AlertTriangle className="size-4" />
      }}
      style={style}
      toastOptions={{
        classNames: {
          toast: "cn-toast"
        }
      }}
      {...props}
    />
  );
}

export { Toaster };
