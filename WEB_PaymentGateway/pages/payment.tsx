import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { useCart } from "@/contexts/CartContext";
import { ArrowLeft, CheckCircle2, Clock, ExternalLink, TimerReset, XCircle } from "lucide-react";

type OrderDetail = {
  _id: string;
  status: "waiting_payment" | "lunas" | "expired";
  total: number;
  items: Array<{
    productId: string;
    name: string;
    price: number;
    quantity: number;
    subtotal: number;
  }>;
  buyer: {
    email: string;
    phone: string;
  };
  payment?: {
    invoiceId: string;
    externalUrl: string;
    status: "PENDING" | "PAID" | "EXPIRED";
  };
};

type FetchState = "idle" | "loading" | "error" | "success";

export default function PaymentPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { orderId } = router.query as { orderId?: string };
  const { clearCart } = useCart();
  const [state, setState] = useState<FetchState>("idle");
  const [detail, setDetail] = useState<OrderDetail | null>(null);
  const hasClearedCartRef = useRef(false);

  useEffect(() => {
    hasClearedCartRef.current = false;
  }, [orderId]);

  useEffect(() => {
    if (detail?.status === "lunas" && !hasClearedCartRef.current) {
      clearCart();
      hasClearedCartRef.current = true;
    }
  }, [detail?.status, clearCart]);

  useEffect(() => {
    if (!orderId) {
      return;
    }
    let cancelled = false;
    let interval: NodeJS.Timeout | null = null;
    const load = async () => {
      try {
        const response = await fetch(`/api/checkout/${orderId}`);
        if (!response.ok) {
          throw new Error("Gagal memuat status");
        }
        const json = await response.json();
        if (!cancelled) {
          setDetail(json.data as OrderDetail);
          setState("success");
          if (json.data.status === "lunas" || json.data.status === "expired") {
            if (interval) {
              clearInterval(interval);
            }
          }
        }
      } catch (error) {
        if (!cancelled) {
          console.error(error);
          setState("error");
          toast({ title: "Tidak dapat memuat status", description: "Silakan coba lagi." });
        }
      }
    };
    setState("loading");
    load();
    interval = setInterval(load, 5000);
    return () => {
      cancelled = true;
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [orderId, toast]);

  const statusInfo = useMemo(() => {
    if (!detail) {
      return {
        label: "Menunggu",
        variant: "secondary" as const,
        icon: Clock
      };
    }
    if (detail.status === "lunas") {
      return {
        label: "Lunas",
        variant: "default" as const,
        icon: CheckCircle2
      };
    }
    if (detail.status === "expired") {
      return {
        label: "Kedaluwarsa",
        variant: "destructive" as const,
        icon: XCircle
      };
    }
    return {
      label: "Menunggu Pembayaran",
      variant: "secondary" as const,
      icon: TimerReset
    };
  }, [detail]);

  const StatusIcon = statusInfo.icon;

  const handleBack = () => {
    router.push("/");
  };

  const handleOpenInvoice = () => {
    if (detail?.payment?.externalUrl) {
      window.open(detail.payment.externalUrl, "_blank");
    }
  };

  return (
    <>
      <Head>
        <title>Status Pembayaran | Malik Gaming Store</title>
      </Head>
      <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840]">
        <div className="pointer-events-none absolute -left-32 top-24 h-72 w-72 rounded-full bg-primary/30 blur-3xl sm:-left-16 md:-left-8" aria-hidden="true" />
        <div className="pointer-events-none absolute -right-40 bottom-10 h-80 w-80 rounded-full bg-secondary/25 blur-3xl sm:-right-24 md:-right-12" aria-hidden="true" />
        <div className="relative z-10 container mx-auto px-4 py-10">
          <header className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="space-y-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Status Pembayaran</h1>
              <p className="text-sm text-muted-foreground sm:text-base">
                Pantau pembayaran invoice Xendit untuk order ID {orderId ?? "-"}.
              </p>
            </div>
            <Button variant="secondary" className="w-full md:w-fit" onClick={handleBack}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke beranda
            </Button>
          </header>
          {!orderId && (
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle>Order ID tidak ditemukan</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Akses halaman ini dari tautan invoice atau halaman riwayat transaksi.
                </p>
              </CardContent>
            </Card>
          )}
          {state === "loading" && (
            <Card className="bg-background/60">
              <CardHeader>
                <CardTitle>Memuat status pembayaran...</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Kami sedang memeriksa status terbaru di Xendit.
                </p>
              </CardContent>
            </Card>
          )}
          {state === "error" && (
            <Card className="bg-destructive/10 border border-destructive/40">
              <CardHeader>
                <CardTitle className="text-destructive-foreground">Tidak dapat memuat status</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-destructive-foreground">
                  Pastikan order ID valid atau coba lagi beberapa saat lagi.
                </p>
              </CardContent>
            </Card>
          )}
          {state === "success" && detail && (
            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
              <Card className="order-2 bg-background/70 lg:order-1">
                <CardHeader className="flex flex-col gap-4">
                  <div className="flex items-center gap-3">
                    <StatusIcon className="h-6 w-6 text-primary" />
                    <div className="flex items-center gap-2">
                      <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
                      <span className="text-xs text-muted-foreground">Order ID {detail._id}</span>
                    </div>
                  </div>
                  <div>
                    <h2 className="text-2xl font-semibold">Ringkasan Pembayaran</h2>
                    <p className="text-sm text-muted-foreground">
                      Total tagihan {formatCurrency(detail.total)} untuk {detail.items.length} item.
                    </p>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="rounded-3xl border border-border bg-background/40 p-4 text-sm">
                    <p className="font-semibold text-foreground">Data pembeli</p>
                    <p className="text-sm text-muted-foreground">Email: {detail.buyer.email}</p>
                    <p className="text-sm text-muted-foreground">Nomor HP: {detail.buyer.phone}</p>
                  </div>
                  <div className="space-y-4 lg:hidden">
                    {detail.items.map(item => (
                      <div
                        key={item.productId}
                        className="rounded-2xl border border-primary/25 bg-background/70 p-4 shadow-[0_12px_35px_rgba(12,9,35,0.45)]"
                      >
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div>
                            <p className="text-base font-semibold text-foreground">{item.name}</p>
                            <span className="text-xs text-muted-foreground">{formatCurrency(item.price)} per item</span>
                          </div>
                          <span className="text-sm font-semibold text-primary">
                            {formatCurrency(item.subtotal)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
                          <span>Qty</span>
                          <span className="font-semibold text-foreground">{item.quantity}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="hidden lg:block">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item</TableHead>
                          <TableHead className="w-20 text-center">Qty</TableHead>
                          <TableHead className="text-right">Subtotal</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {detail.items.map(item => (
                          <TableRow key={item.productId}>
                            <TableCell>
                              <div className="space-y-1">
                                <p className="text-sm font-semibold text-foreground">{item.name}</p>
                                <span className="text-xs text-muted-foreground">{formatCurrency(item.price)} per item</span>
                              </div>
                            </TableCell>
                            <TableCell className="text-center text-sm font-semibold">{item.quantity}</TableCell>
                            <TableCell className="text-right font-semibold">{formatCurrency(item.subtotal)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </CardContent>
              </Card>
              <Card className="order-1 bg-gradient-to-b from-primary/10 to-secondary/10 lg:order-2">
                <CardHeader>
                  <CardTitle>Langkah berikutnya</CardTitle>
                </CardHeader>
                <CardContent className="space-y-6 text-sm">
                  <div>
                    <p className="font-semibold text-foreground">Status pembayaran</p>
                    <p className="text-muted-foreground">
                      {detail.status === "lunas"
                        ? "Pembayaran selesai. Top up akan segera diproses."
                        : detail.status === "expired"
                        ? "Invoice kedaluwarsa. Buat pesanan baru untuk melanjutkan."
                        : "Invoice masih menunggu pembayaran. Segera selesaikan sebelum kedaluwarsa."}
                    </p>
                  </div>
                  {detail.payment?.externalUrl && detail.status !== "lunas" && (
                    <Button className="w-full" variant="secondary" onClick={handleOpenInvoice}>
                      Buka invoice Xendit
                      <ExternalLink className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  <Button className="w-full" onClick={handleBack}>
                    Kembali ke beranda
                  </Button>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
