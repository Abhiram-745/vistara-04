import { useTheme } from "next-themes";
import { Toaster as Sonner, toast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  const { theme = "system" } = useTheme();

  return (
    <Sonner
      theme={theme as ToasterProps["theme"]}
      className="toaster group"
      position="top-right"
      toastOptions={{
        classNames: {
          toast:
            "group toast backdrop-blur-xl bg-card/95 border-2 border-primary/20 shadow-2xl rounded-2xl p-4 gap-3 " +
            "data-[type=success]:bg-gradient-to-br data-[type=success]:from-green-50 data-[type=success]:to-emerald-50 " +
            "data-[type=success]:dark:from-green-950/50 data-[type=success]:dark:to-emerald-950/50 " +
            "data-[type=success]:border-green-400/40 data-[type=success]:shadow-green-500/20 " +
            "data-[type=error]:bg-gradient-to-br data-[type=error]:from-red-50 data-[type=error]:to-rose-50 " +
            "data-[type=error]:dark:from-red-950/50 data-[type=error]:dark:to-rose-950/50 " +
            "data-[type=error]:border-red-400/40 data-[type=error]:shadow-red-500/20 " +
            "data-[type=info]:bg-gradient-to-br data-[type=info]:from-blue-50 data-[type=info]:to-cyan-50 " +
            "data-[type=info]:dark:from-blue-950/50 data-[type=info]:dark:to-cyan-950/50 " +
            "data-[type=info]:border-blue-400/40 data-[type=info]:shadow-blue-500/20 " +
            "data-[type=warning]:bg-gradient-to-br data-[type=warning]:from-orange-50 data-[type=warning]:to-amber-50 " +
            "data-[type=warning]:dark:from-orange-950/50 data-[type=warning]:dark:to-amber-950/50 " +
            "data-[type=warning]:border-orange-400/40 data-[type=warning]:shadow-orange-500/20 " +
            "animate-in slide-in-from-top-4 fade-in-0 duration-300 " +
            "data-[swipe=end]:animate-out data-[swipe=end]:slide-out-to-right-full " +
            "data-[swipe=end]:fade-out-0",
          title: "text-sm font-semibold text-foreground group-[.toast]:leading-tight",
          description: "text-xs text-muted-foreground mt-1 group-[.toast]:leading-snug",
          actionButton: 
            "bg-gradient-primary text-white hover:opacity-90 transition-all shadow-md rounded-lg px-3 py-1.5 text-xs font-medium",
          cancelButton: 
            "bg-muted/80 text-muted-foreground hover:bg-muted transition-all rounded-lg px-3 py-1.5 text-xs font-medium",
          closeButton:
            "bg-background/80 hover:bg-background border border-border/60 rounded-full transition-all shadow-sm",
          icon: "w-5 h-5",
          success: "text-green-600 dark:text-green-400",
          error: "text-red-600 dark:text-red-400",
          info: "text-blue-600 dark:text-blue-400",
          warning: "text-orange-600 dark:text-orange-400",
        },
      }}
      {...props}
    />
  );
};

export { Toaster, toast };
