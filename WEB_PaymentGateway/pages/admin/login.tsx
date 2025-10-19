import { FormEvent, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { GetServerSideProps } from "next";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { getSessionFromContext } from "@/lib/server-session";

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [step, setStep] = useState<"login" | "otp">("login");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Login gagal");
      }
      toast({ title: "OTP dikirim", description: "Periksa WhatsApp Anda untuk kode OTP." });
      setStep("otp");
    } catch (error) {
      toast({ title: "Login gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: otp })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Verifikasi gagal");
      }
      if (json.data?.role !== "admin") {
        toast({ title: "Akses ditolak", description: "Akun ini bukan admin." });
        return;
      }
      toast({ title: "Selamat datang", description: "Anda berhasil masuk sebagai admin." });
      router.push("/admin/dashboard");
    } catch (error) {
      toast({ title: "Verifikasi gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login | Malik Gaming Store</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#111827] to-[#1f2937] px-4">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">Masuk Admin</CardTitle>
          </CardHeader>
          {step === "login" ? (
            <form onSubmit={handleLogin}>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <Input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
                </div>
                <div>
                  <label className="text-sm font-medium">Password</label>
                  <Input type="password" value={password} onChange={(event) => setPassword(event.target.value)} required />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Kirim OTP"}
                </Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">Masukkan kode OTP yang dikirim ke WhatsApp admin.</p>
                <Input value={otp} onChange={(event) => setOtp(event.target.value)} maxLength={6} required pattern="\d{6}" />
              </CardContent>
              <CardFooter>
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memverifikasi..." : "Masuk"}
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = getSessionFromContext(context);
  if (session?.role === "admin") {
    return {
      redirect: {
        destination: "/admin/dashboard",
        permanent: false
      }
    };
  }
  return { props: {} };
};
