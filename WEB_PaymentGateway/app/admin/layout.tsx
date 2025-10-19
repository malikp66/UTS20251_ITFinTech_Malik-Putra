import type { ReactNode } from "react";

import { AuthProvider } from "../(site)/components/auth/AuthProvider";

export default function AdminLayout({ children }: { children: ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}
