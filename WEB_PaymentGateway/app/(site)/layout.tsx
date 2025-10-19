import type { ReactNode } from "react";

import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "./components/auth/AuthProvider";

export default function SiteLayout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <div className="min-h-screen bg-background text-foreground">
        {children}
      </div>
      <Toaster />
    </AuthProvider>
  );
}
