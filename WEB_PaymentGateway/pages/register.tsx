import { ChangeEvent, FormEvent, useState } from "react";
import Head from "next/head";
import { useRouter } from "next/router";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";

export default function RegisterPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof form) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form)
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Registrasi gagal");
      }
      toast({ title: "Registrasi berhasil", description: "Silakan masuk untuk melanjutkan." });
      router.push("/login");
    } catch (error) {
      toast({ title: "Registrasi gagal", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Daftar Akun | Malik Gaming Store</title>
      </Head>
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-[#0f172a] to-[#1e293b] px-4">
        <Card className="w-full max-w-lg bg-background/80 backdrop-blur">
          <CardHeader>
            <CardTitle className="text-center text-2xl font-bold">Buat akun baru</CardTitle>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Nama lengkap</label>
                <Input value={form.name} onChange={handleChange("name")} required />
              </div>
              <div>
                <label className="text-sm font-medium">Email</label>
                <Input type="email" value={form.email} onChange={handleChange("email")} required />
              </div>
              <div>
                <label className="text-sm font-medium">Nomor WhatsApp</label>
                <Input value={form.phone} onChange={handleChange("phone")} required />
              </div>
              <div className="md:col-span-2">
                <label className="text-sm font-medium">Password</label>
                <Input type="password" value={form.password} onChange={handleChange("password")} required minLength={6} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Memproses..." : "Daftar"}
              </Button>
              <Button variant="link" type="button" onClick={() => router.push("/login")}>Sudah punya akun? Masuk</Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </>
  );
}
