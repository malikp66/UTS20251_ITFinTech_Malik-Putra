import type { Metadata } from "next";
import { Inter } from "next/font/google";

import "@/styles/globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "UTS E-Commerce",
  description: "Platform e-commerce untuk tugas UTS"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={cn("min-h-screen bg-background text-foreground antialiased", inter.className)}>
        {children}
      </body>
    </html>
  );
}
