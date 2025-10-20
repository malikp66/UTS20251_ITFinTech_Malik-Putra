import Head from "next/head";
import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/components/ui/use-toast";

type LoginResponse =
  | { success: true; user: { role: string } }
  | { mfaRequired: true; email: string }
  | { error: string };

type VerifyResponse =
  | { success: true; user?: { role: string } }
  | { error: string };

export default function AdminLoginPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"login" | "otp">("login");
  const [targetEmail, setTargetEmail] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isOtpMode = mode === "otp";

  const handleLoginSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, requireAdmin: true })
      });
      const json = (await response.json().catch(() => ({}))) as LoginResponse;
      if (!response.ok) {
        const errorPayload = json as { error?: unknown };
        const errorMessage = typeof errorPayload.error === "string" ? errorPayload.error : "Login gagal";
        throw new Error(errorMessage);
      }
      if ("mfaRequired" in json && json.mfaRequired) {
        const nextEmail = (json.email as string) || email;
        setTargetEmail(nextEmail);
        setMode("otp");
        toast({ title: "OTP dikirim", description: `Kode verifikasi sudah dikirim ke WhatsApp ${nextEmail}.` });
        return;
      }
      toast({ title: "Selamat datang, admin!" });
      router.push("/admin/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Periksa kredensial Anda.";
      toast({ title: "Login gagal", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOtpSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch("/api/auth/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: targetEmail || email, code: otpCode })
      });
      const json = (await response.json().catch(() => ({}))) as VerifyResponse;
      if (!response.ok) {
        const errorMessage = typeof json?.error === "string" ? json.error : "Kode OTP salah";
        throw new Error(errorMessage);
      }
      toast({ title: "Verifikasi berhasil", description: "Anda berhasil masuk ke dashboard admin." });
      router.push("/admin/dashboard");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Kode OTP salah.";
      toast({ title: "Verifikasi gagal", description: message, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Admin Login | Malik Gaming Store</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840] px-4 py-12">
        <Card className="w-full max-w-md bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-2xl">{isOtpMode ? "Verifikasi OTP Admin" : "Login Admin"}</CardTitle>
            <CardDescription>
              {isOtpMode
                ? `Masukkan kode OTP yang dikirim ke WhatsApp ${targetEmail || email}.`
                : "Akses dashboard untuk memantau penjualan dan produk."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isOtpMode ? (
              <form className="space-y-4" onSubmit={handleOtpSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="otp">Kode OTP</Label>
                  <Input
                    id="otp"
                    placeholder="123456"
                    value={otpCode}
                    onChange={event => setOtpCode(event.target.value)}
                    required
                  />
                </div>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Button className="w-full" type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Memverifikasi..." : "Verifikasi OTP"}
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="w-full"
                    disabled={isSubmitting}
                    onClick={() => {
                      setMode("login");
                      setOtpCode("");
                      setIsSubmitting(false);
                    }}
                  >
                    Kembali
                  </Button>
                </div>
              </form>
            ) : (
              <form className="space-y-4" onSubmit={handleLoginSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Admin</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@email.com"
                    value={email}
                    onChange={event => setEmail(event.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="********"
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                    required
                  />
                </div>
                <Button className="w-full" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Memproses..." : "Masuk"}
                </Button>
              </form>
            )}
            <p className="mt-6 text-center text-sm text-muted-foreground">
              Kembali ke{" "}
              <Link href="/" className="text-primary underline">
                beranda
              </Link>
              .
            </p>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
