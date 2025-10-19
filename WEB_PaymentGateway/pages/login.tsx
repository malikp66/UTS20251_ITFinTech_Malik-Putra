import { FormEvent, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function LoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<"login" | "otp">("login");

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
      toast({ title: "OTP dikirim", description: "Masukkan kode OTP yang Anda terima di WhatsApp." });
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
      toast({ title: "Berhasil", description: "Anda berhasil masuk" });
      if (json.data?.role === "admin") {
        router.push("/admin/dashboard");
      } else {
        router.push("/");
      }
    } catch (error) {
      toast({ title: "Verifikasi gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Masuk | Malik Gaming Store</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-4">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">Masuk ke akun Anda</CardTitle>
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
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memproses..." : "Masuk"}
                </Button>
                <Button variant="link" type="button" onClick={() => router.push("/register")}>Belum punya akun? Daftar</Button>
              </CardFooter>
            </form>
          ) : (
            <form onSubmit={handleVerify}>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">
                    Masukkan 6 digit kode OTP yang dikirim melalui WhatsApp.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium">Kode OTP</label>
                  <Input value={otp} onChange={(event) => setOtp(event.target.value)} maxLength={6} required pattern="\d{6}" />
                </div>
              </CardContent>
              <CardFooter className="flex flex-col gap-3">
                <Button type="submit" className="w-full" disabled={loading}>
                  {loading ? "Memverifikasi..." : "Verifikasi"}
                </Button>
                <Button variant="link" type="button" onClick={() => setStep("login")}>
                  Gunakan email & password lain
                </Button>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </>
  );
}
