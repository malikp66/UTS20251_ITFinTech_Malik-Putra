"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";

import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useToast } from "@/components/ui/use-toast";
import { zodResolver } from "@/lib/zod-resolver";

import { OtpForm } from "./OtpForm";

type UserAuthModalProps = {
  trigger?: React.ReactNode;
};

const loginSchema = z.object({
  email: z.string().email("Email tidak valid"),
  password: z.string().min(1, "Password wajib diisi")
});

const registerSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  email: z.string().email("Email tidak valid"),
  phone: z.string().min(8, "Nomor WA wajib diisi"),
  password: z.string().min(6, "Password minimal 6 karakter")
});

type LoginValues = z.infer<typeof loginSchema>;
type RegisterValues = z.infer<typeof registerSchema>;

export function UserAuthModal({ trigger }: UserAuthModalProps) {
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("login");
  const [requiresOtp, setRequiresOtp] = useState(false);
  const [pendingEmail, setPendingEmail] = useState<string>("");
  const [loginError, setLoginError] = useState<string | null>(null);
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [isLoginPending, startLoginTransition] = useTransition();
  const [isRegisterPending, startRegisterTransition] = useTransition();
  const { toast } = useToast();

  const loginForm = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" }
  });

  const registerForm = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: { name: "", email: "", phone: "", password: "" }
  });

  const handleLoginSubmit = (values: LoginValues) => {
    startLoginTransition(async () => {
      setLoginError(null);
      setRequiresOtp(false);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          setLoginError(payload?.error ?? "Email atau password salah");
          return;
        }
        setPendingEmail(values.email);
        setRequiresOtp(true);
      } catch (error) {
        console.error(error);
        setLoginError("Tidak dapat terhubung ke server");
      }
    });
  };

  const handleRegisterSubmit = (values: RegisterValues) => {
    startRegisterTransition(async () => {
      setRegisterError(null);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          if (response.status === 409) {
            setRegisterError("Email sudah terdaftar");
          } else {
            setRegisterError(payload?.error ?? "Gagal mendaftar");
          }
          return;
        }
        toast({ title: "Registrasi berhasil", description: "Silakan masuk menggunakan akun Anda." });
        registerForm.reset();
        setActiveTab("login");
      } catch (error) {
        console.error(error);
        setRegisterError("Terjadi kesalahan jaringan");
      }
    });
  };

  const closeModal = () => {
    setOpen(false);
    setRequiresOtp(false);
    setPendingEmail("");
    loginForm.reset();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => {
      setOpen(value);
      if (!value) {
        setRequiresOtp(false);
        setPendingEmail("");
        setLoginError(null);
        setRegisterError(null);
      }
    }}>
      <DialogTrigger asChild>{trigger ?? <Button variant="default">Masuk</Button>}</DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{requiresOtp ? "Verifikasi OTP" : "Masuk atau Daftar"}</DialogTitle>
        </DialogHeader>
        {requiresOtp ? (
          <OtpForm
            email={pendingEmail}
            onSuccess={() => {
              toast({ title: "Berhasil masuk", description: "Selamat datang kembali!" });
              closeModal();
            }}
          />
        ) : (
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              setLoginError(null);
              setRegisterError(null);
            }}
          >
            <TabsList className="grid grid-cols-2">
              <TabsTrigger value="login">Masuk</TabsTrigger>
              <TabsTrigger value="register">Daftar</TabsTrigger>
            </TabsList>
            <TabsContent value="login" className="space-y-4">
              {loginError ? (
                <Alert variant="destructive">
                  <AlertTitle>Masuk gagal</AlertTitle>
                  <AlertDescription>{loginError}</AlertDescription>
                </Alert>
              ) : null}
              <Form form={loginForm} onSubmit={loginForm.handleSubmit(handleLoginSubmit)} className="space-y-4">
                <FormField
                  control={loginForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="nama@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={loginForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isLoginPending}>
                  {isLoginPending ? "Memproses..." : "Lanjutkan"}
                </Button>
              </Form>
            </TabsContent>
            <TabsContent value="register" className="space-y-4">
              {registerError ? (
                <Alert variant="destructive">
                  <AlertTitle>Registrasi gagal</AlertTitle>
                  <AlertDescription>{registerError}</AlertDescription>
                </Alert>
              ) : null}
              <Form
                form={registerForm}
                onSubmit={registerForm.handleSubmit(handleRegisterSubmit)}
                className="space-y-4"
              >
                <FormField
                  control={registerForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nama lengkap</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Nama Anda" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Email</FormLabel>
                      <FormControl>
                        <Input {...field} type="email" placeholder="nama@email.com" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nomor WhatsApp</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="628123456789" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={registerForm.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" placeholder="Password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button type="submit" className="w-full" disabled={isRegisterPending}>
                  {isRegisterPending ? "Mendaftarkan..." : "Buat Akun"}
                </Button>
              </Form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
