"use client";

import { useEffect } from "react";
import { MessagesSquare } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

type SandboxNoticeToastProps = {
  open: boolean;
  onClose: () => void;
  onAction: () => void;
  displayNumber: string;
};

export function SandboxNoticeToast({ open, onClose, onAction, displayNumber }: SandboxNoticeToastProps) {
  useEffect(() => {
    if (!open) {
      return;
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300"
        aria-hidden
      />
      <div className="pointer-events-none fixed inset-x-0 bottom-6 z-50 flex justify-center px-4 sm:bottom-10">
      <div className="pointer-events-auto relative w-full max-w-md overflow-hidden rounded-3xl border border-primary/50 bg-[#0b0a1c]/95 p-6 shadow-[0_30px_70px_rgba(88,51,255,0.55)] backdrop-blur-xl sm:rounded-[36px] sm:p-8">
        <div className="pointer-events-none absolute -inset-20 bg-[radial-gradient(circle_at_top,_rgba(99,102,241,0.28),transparent_60%)]" aria-hidden />
        <div className="relative space-y-6">
          <div className="relative mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-gradient-to-br from-primary via-purple-500 to-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.55)]">
            <span className="absolute h-20 w-20 rounded-[28px] bg-gradient-to-br from-primary/40 via-purple-500/30 to-indigo-500/30 blur-xl" aria-hidden />
            <MessagesSquare className="relative h-8 w-8 text-white" />
          </div>
          <div className="space-y-3 text-center">
            <Badge
              variant="secondary"
              className="mx-auto w-fit rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[10px] font-semibold uppercase tracking-[0.25em] text-primary"
            >
              Sandbox Notice
            </Badge>
            <h3 className="text-xl font-bold text-foreground sm:text-2xl">Aktifkan Notifikasi WhatsApp</h3>
            <p className="text-sm text-muted-foreground">
              WhatsApp gateway kami masih mode sandbox. Supaya notifikasi transaksi sampai, kirim pesan terlebih dahulu dari akun Anda ke nomor resmi kami.
            </p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-white/5 p-5 text-sm text-muted-foreground shadow-[0_0_30px_rgba(76,29,149,0.35)]">
            <p className="text-foreground">
              Simpan dan chat nomor berikut: <span className="font-semibold text-primary">{displayNumber}</span>
            </p>
            <p className="mt-2">
              Setelah Anda memulai chat, semua OTP dan update order akan dikirim dari nomor tersebut secara otomatis.
            </p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="w-full rounded-3xl border-white/15 bg-white/5 text-sm font-semibold uppercase tracking-wide text-muted-foreground transition sm:w-auto"
              onClick={onClose}
            >
              Mengerti
            </Button>
            <Button
              type="button"
              className="w-full rounded-3xl bg-gradient-to-r from-primary via-purple-500 to-indigo-500 px-6 py-3 text-sm font-semibold uppercase tracking-wide text-white shadow-[0_0_35px_rgba(99,102,241,0.5)] transition hover:shadow-[0_0_40px_rgba(168,85,247,0.6)] sm:w-auto"
              onClick={onAction}
            >
              Chat WhatsApp sekarang
            </Button>
          </div>
        </div>
      </div>
    </div>
    </>
  );
}
