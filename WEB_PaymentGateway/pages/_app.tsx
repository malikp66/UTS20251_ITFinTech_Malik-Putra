import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Geist, Geist_Mono } from "next/font/google";
import { CartProvider } from "@/contexts/CartContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { Toaster } from "@/components/ui/toaster";

const geistSans = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono" });

export default function App({ Component, pageProps }: AppProps) {
  const appClassName = [geistSans.variable, geistMono.variable, "min-h-screen bg-background text-foreground font-sans"].join(" ");
  return (
    <AuthProvider>
      <CartProvider>
        <div className={appClassName}>
          <Component {...pageProps} />
          <Toaster />
        </div>
      </CartProvider>
    </AuthProvider>
  );
}
