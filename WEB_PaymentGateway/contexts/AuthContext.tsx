import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { SessionUser } from "@/lib/auth";
import { useToast } from "@/components/ui/use-toast";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { OtpInput } from "@/components/otp-input";

type AuthModalMode = "login" | "register" | "otp" | null;

type AuthContextValue = {
  user: SessionUser | null;
  loading: boolean;
  refresh: () => Promise<void>;
  openLoginModal: () => void;
  openRegisterModal: () => void;
  ensureAuthenticated: (next?: () => void) => boolean;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const OTP_LENGTH = 6;

async function fetchSession(): Promise<SessionUser | null> {
  const response = await fetch("/api/auth/session");
  if (!response.ok) {
    return null;
  }
  const json = await response.json().catch(() => null);
  if (json && json.authenticated && json.user) {
    return json.user as SessionUser;
  }
  return null;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const { toast } = useToast();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<AuthModalMode>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [otpEmail, setOtpEmail] = useState("");
  const [otpPhone, setOtpPhone] = useState("");
  const [pendingAction, setPendingAction] = useState<(() => void) | null>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [otpCountdown, setOtpCountdown] = useState<number | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const sessionUser = await fetchSession();
      setUser(sessionUser);
    } catch (error) {
      console.error("Refresh session error", error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    if (modalMode !== "otp" || otpCountdown === null) {
      return;
    }
    if (otpCountdown <= 0) {
      setOtpCountdown(null);
      return;
    }
    const timer = setTimeout(() => setOtpCountdown(prev => (prev ? prev - 1 : null)), 1000);
    return () => clearTimeout(timer);
  }, [otpCountdown, modalMode]);

  useEffect(() => {
    if (modalMode !== "otp") {
      setOtpPhone("");
    }
  }, [modalMode]);

  const handlePostLogin = useCallback(async () => {
    await refresh();
    setModalMode(null);
    setModalBusy(false);
    if (pendingAction) {
      pendingAction();
      setPendingAction(null);
    }
  }, [pendingAction, refresh]);

  const submitLogin = useCallback(
    async (payload: { email: string; password: string }) => {
      setModalBusy(true);
      try {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...payload })
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "Login gagal");
        }
        if (json?.mfaRequired) {
          const emailValue = (json.email as string) || payload.email;
          setOtpEmail(emailValue);
          setOtpPhone(typeof json.phone === "string" ? json.phone.trim() : "");
          setModalMode("otp");
          setOtpCountdown(300);
          setModalBusy(false);
          toast({ title: "OTP dikirim", description: "Silakan periksa WhatsApp Anda dalam 5 menit." });
          return;
        }
        toast({ title: "Login berhasil", description: "Selamat datang kembali." });
        await handlePostLogin();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Login gagal";
        toast({ title: "Login gagal", description: message, variant: "destructive" });
        setModalBusy(false);
      }
    },
    [handlePostLogin, toast]
  );

  const submitRegister = useCallback(
    async (payload: { name: string; email: string; phone: string; password: string }) => {
      setModalBusy(true);
      try {
        const response = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "Registrasi gagal");
        }
        toast({ title: "Registrasi berhasil", description: "Silakan verifikasi login Anda." });
        setLoginEmail(payload.email);
        setModalMode("login");
      } catch (error) {
        const message = error instanceof Error ? error.message : "Registrasi gagal";
        toast({ title: "Registrasi gagal", description: message, variant: "destructive" });
      } finally {
        setModalBusy(false);
      }
    },
    [toast]
  );

  const submitOtp = useCallback(
    async (payload: { phone: string; code: string }) => {
      setModalBusy(true);
      try {
        const sanitizedCode = payload.code.replace(/\D/g, "").slice(0, OTP_LENGTH);
        if (sanitizedCode.length !== OTP_LENGTH) {
          toast({
            title: "Kode OTP tidak valid",
            description: `Kode OTP harus ${OTP_LENGTH} digit.`,
            variant: "destructive"
          });
          setModalBusy(false);
          return;
        }
        const sanitizedPhone = payload.phone.trim();
        if (!sanitizedPhone) {
          toast({
            title: "Nomor WhatsApp tidak ditemukan",
            description: "Silakan login ulang untuk menerima OTP baru.",
            variant: "destructive"
          });
          setModalBusy(false);
          return;
        }
        const response = await fetch("/api/auth/verify-otp", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ phone: sanitizedPhone, code: sanitizedCode })
        });
        const json = await response.json().catch(() => ({}));
        if (!response.ok) {
          throw new Error(typeof json?.error === "string" ? json.error : "Kode OTP salah");
        }
        toast({ title: "Verifikasi berhasil", description: "Anda berhasil login." });
        await handlePostLogin();
      } catch (error) {
        const message = error instanceof Error ? error.message : "Kode OTP salah";
        toast({ title: "Verifikasi gagal", description: message, variant: "destructive" });
        setModalBusy(false);
      }
    },
    [handlePostLogin, toast]
  );

  const openLoginModal = useCallback(() => {
    setModalMode("login");
  }, []);

  const openRegisterModal = useCallback(() => {
    setModalMode("register");
  }, []);

  const ensureAuthenticated = useCallback(
    (next?: () => void) => {
      if (user) {
        next?.();
        return true;
      }
      if (next) {
        setPendingAction(() => next);
      }
      setModalMode("login");
      return false;
    },
    [user]
  );

  const logout = useCallback(async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      setUser(null);
      setPendingAction(null);
    }
  }, []);

  const contextValue = useMemo<AuthContextValue>(
    () => ({
      user,
      loading,
      refresh,
      openLoginModal,
      openRegisterModal,
      ensureAuthenticated,
      logout
    }),
    [user, loading, refresh, openLoginModal, openRegisterModal, ensureAuthenticated, logout]
  );

  const closeModal = useCallback(() => {
    if (modalBusy) {
      return;
    }
    setModalMode(null);
    setOtpEmail("");
    setOtpPhone("");
    setOtpCountdown(null);
    setPendingAction(null);
  }, [modalBusy]);

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
      <AuthModals
        mode={modalMode}
        setMode={setModalMode}
        loginEmail={loginEmail}
        setLoginEmail={setLoginEmail}
        otpEmail={otpEmail}
        otpPhone={otpPhone}
        modalBusy={modalBusy}
        onLogin={submitLogin}
        onRegister={submitRegister}
        onVerifyOtp={submitOtp}
        onClose={closeModal}
        setModalBusy={setModalBusy}
        otpCountdown={otpCountdown}
        setOtpCountdown={setOtpCountdown}
        setOtpPhone={setOtpPhone}
      />
    </AuthContext.Provider>
  );
}

type AuthModalsProps = {
  mode: AuthModalMode;
  setMode: (mode: AuthModalMode) => void;
  loginEmail: string;
  setLoginEmail: (value: string) => void;
  otpEmail: string;
  otpPhone: string;
  modalBusy: boolean;
  onLogin: (payload: { email: string; password: string }) => Promise<void>;
  onRegister: (payload: { name: string; email: string; phone: string; password: string }) => Promise<void>;
  onVerifyOtp: (payload: { phone: string; code: string }) => Promise<void>;
  onClose: () => void;
  setModalBusy: (value: boolean) => void;
  otpCountdown: number | null;
  setOtpCountdown: (value: number | null) => void;
  setOtpPhone: (value: string) => void;
};

function AuthModals({
  mode,
  setMode,
  loginEmail,
  setLoginEmail,
  otpEmail,
  otpPhone,
  modalBusy,
  onLogin,
  onRegister,
  onVerifyOtp,
  onClose,
  setModalBusy,
  otpCountdown,
  setOtpCountdown,
  setOtpPhone
}: AuthModalsProps) {
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [otpCode, setOtpCode] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [showPwdReg, setShowPwdReg] = useState(false);
  const handleOtpChange = useCallback(
    (next: string) => {
      setOtpCode(next.replace(/\D/g, "").slice(0, OTP_LENGTH));
    },
    [setOtpCode]
  );
  const isOtpReady = otpCode.length === OTP_LENGTH;
  const otpInputId = "otp-code";

  useEffect(() => {
    if (mode === "login") {
      setPassword("");
    }
    if (mode === "register") {
      setPassword("");
      setName("");
      setPhone("");
    }
    if (mode === "otp") {
      setOtpCode("");
    }
  }, [mode]);

  const convertCountdownToLabel = (value: number | null) => {
    if (!value || value <= 0) return "";
    const minutes = Math.floor(value / 60);
    const seconds = value % 60;
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <Dialog open={mode !== null} onOpenChange={(open) => (!open ? onClose() : undefined)}>
  <DialogContent className="max-w-md overflow-hidden px-5 py-10 rounded-3xl">
    {/* Header with switch buttons */}
    <div className="relative">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(1200px_400px_at_20%_-10%,theme(colors.violet.500/.25),transparent_60%),radial-gradient(800px_300px_at_110%_0%,theme(colors.fuchsia.500/.25),transparent_60%)]" />
      <div className="relative flex items-center justify-between gap-3 px-6 py-5">
        <div>
          <DialogHeader className="space-y-1">
            <DialogTitle className="text-xl tracking-tight">
              {mode === "register" ? "Buat akun baru" : mode === "otp" ? "Verifikasi OTP WhatsApp" : "Masuk ke akun Anda"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              {mode === "register"
                ? "Daftarkan diri Anda untuk dapat menambahkan produk ke keranjang."
                : mode === "otp"
                ? (
                    <>
                      Kami telah mengirim kode ke WhatsApp{" "}
                      <strong>{otpPhone || "nomor WhatsApp terdaftar"}</strong>. Masukkan kode dalam 5 menit.
                    </>
                  )
                : "Masukkan email dan password untuk melanjutkan."}
            </DialogDescription>
          </DialogHeader>
        </div>

        {/* Mode switcher — buttons only */}
        {mode !== "otp" && (
          <div className="flex shrink-0 rounded-3xl bg-muted p-1">
            <Button
              type="button"
              size="sm"
              variant={mode === "login" ? "default" : "ghost"}
              className="rounded-3xl"
              onClick={() => {
                if (mode !== "login") setMode("login");
                setModalBusy(false);
              }}
            >
              Login
            </Button>
            <Button
              type="button"
              size="sm"
              variant={mode === "register" ? "default" : "ghost"}
              className="rounded-3xl"
              onClick={() => {
                if (mode !== "register") setMode("register");
                setModalBusy(false);
              }}
            >
              Daftar
            </Button>
          </div>
        )}
      </div>
      <div className="h-px w-full bg-gradient-to-r from-transparent via-border to-transparent" />
    </div>

    {/* Body */}
    <div className="space-y-4 px-6 py-5">
      {mode === "login" && (
        <>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor="login-email">Email</Label>
              <div className="relative">
                <Input
                  id="login-email"
                  type="email"
                  value={loginEmail}
                  onChange={(e) => setLoginEmail(e.target.value)}
                  placeholder="nama@email.com"
                  required
                  className="pl-10"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {/* lucide-react Mail */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M4 4h16v16H4z"/><path d="m22 6-10 7L2 6"/></svg>
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="login-password">Password</Label>
              <div className="relative">
                <Input
                  id="login-password"
                  type={showPwd ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="********"
                  required
                  className="pl-10 pr-10"
                />
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  {/* lucide-react Lock */}
                  <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                </span>
                <button
                  type="button"
                  aria-label={showPwd ? "Sembunyikan password" : "Tampilkan password"}
                  onClick={() => setShowPwd((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {/* Eye / EyeOff */}
                  {showPwd ? (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M17.94 17.94A10.94 10.94 0 0 1 12 20C7 20 2.73 16.11 1 12c.53-1.2 1.27-2.33 2.19-3.32M10.58 10.58a2 2 0 1 0 2.84 2.84M6.1 6.1 17.9 17.9M22.54 11.08A11.05 11.05 0 0 0 12 4c-1.61 0-3.16.33-4.56.93"/></svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z"/><circle cx="12" cy="12" r="3"/></svg>
                  )}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full"
              disabled={modalBusy}
              onClick={() => void onLogin({ email: loginEmail, password })}
            >
              {modalBusy ? "Memproses..." : "Masuk"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={modalBusy}
              onClick={() => {
                setMode("register");
                setModalBusy(false);
              }}
            >
              Buat akun baru
            </Button>
          </DialogFooter>
        </>
      )}

      {mode === "register" && (
        <>
          <div className="grid gap-3">
            <div className="space-y-2">
              <Label htmlFor="register-name">Nama lengkap</Label>
              <Input
                id="register-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nama lengkap"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-email">Email</Label>
              <Input
                id="register-email"
                type="email"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                placeholder="nama@email.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-phone">Nomor WhatsApp</Label>
              <Input
                id="register-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="08xxxxxxxxxx"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="register-password">Password</Label>
              <Input
                id="register-password"
                type={showPwdReg ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 8 karakter"
                required
              />
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Min. 8 karakter • kombinasi huruf & angka</span>
                <button
                  type="button"
                  className="underline hover:text-foreground"
                  onClick={() => setShowPwdReg((s) => !s)}
                >
                  {showPwdReg ? "Sembunyikan" : "Tampilkan"}
                </button>
              </div>
            </div>
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full"
              disabled={modalBusy}
              onClick={() => void onRegister({ name, email: loginEmail, phone, password })}
            >
              {modalBusy ? "Mendaftarkan..." : "Daftar"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={modalBusy}
              onClick={() => {
                setMode("login");
                setModalBusy(false);
              }}
            >
              Sudah punya akun
            </Button>
          </DialogFooter>
        </>
      )}

      {mode === "otp" && (
        <>
          <div className="space-y-3">
            <div className="space-y-2">
              <Label htmlFor={otpInputId}>Kode OTP</Label>
              <OtpInput
                id={otpInputId}
                value={otpCode}
                length={OTP_LENGTH}
                onChange={handleOtpChange}
                disabled={modalBusy}
              />
            </div>
            {otpCountdown !== null && otpCountdown > 0 && (
              <p className="text-sm text-muted-foreground">
                Kode kedaluwarsa dalam {convertCountdownToLabel(otpCountdown)}.
              </p>
            )}
          </div>

          <DialogFooter className="mt-4 flex flex-col gap-2 sm:flex-row">
            <Button
              className="w-full"
              disabled={modalBusy || !isOtpReady || !otpPhone}
              onClick={() => void onVerifyOtp({ phone: otpPhone, code: otpCode })}
            >
              {modalBusy ? "Memverifikasi..." : "Verifikasi"}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="w-full"
              disabled={modalBusy}
              onClick={() => {
                setMode("login");
                setModalBusy(false);
                setOtpCountdown(null);
                setOtpCode("");
                setOtpPhone("");
              }}
            >
              Kembali ke login
            </Button>
          </DialogFooter>
        </>
      )}
    </div>
  </DialogContent>
</Dialog>

  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
