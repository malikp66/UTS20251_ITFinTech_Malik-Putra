import Head from "next/head";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { ArrowLeft, CheckCircle2, Minus, Phone, Plus, ShoppingCart } from "lucide-react";

type CheckoutResponse = {
  checkoutId: string;
};

type InvoiceResponse = {
  invoiceUrl: string;
};

export default function CheckoutPage() {
  const router = useRouter();
  const { items, subtotal, updateQty, ready } = useCart();
  const { toast } = useToast();
  const [buyerName, setBuyerName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fee = useMemo(() => (subtotal > 0 ? 2000 : 0), [subtotal]);
  const total = useMemo(() => subtotal + fee, [subtotal, fee]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (items.length === 0) {
      toast({ title: "Keranjang kosong", description: "Tambahkan produk sebelum checkout" });
      return;
    }
    if (!buyerName || !email || !phone) {
      toast({ title: "Lengkapi data", description: "Nama, email, dan nomor HP wajib diisi" });
      return;
    }
    setIsSubmitting(true);
    try {
      const checkoutPayload = {
        items: items.map(item => ({
          productId: item.productId,
          name: item.name,
          price: item.price,
          qty: item.qty
        })),
        buyer: {
          name: buyerName,
          email,
          phone
        }
      };
      const checkoutResponse = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(checkoutPayload)
      })
      if (!checkoutResponse.ok) {
        const err = await checkoutResponse.json().catch(() => ({}))
        throw new Error(err?.message || "Gagal membuat checkout")
      }

      const checkoutJson = (await checkoutResponse.json()) as CheckoutResponse;
      const invoiceResponse = await fetch("/api/payments/invoice", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ checkoutId: checkoutJson.checkoutId })
      });
      if (!invoiceResponse.ok) {
        throw new Error("Gagal membuat invoice");
      }
      const invoiceJson = (await invoiceResponse.json()) as InvoiceResponse;
      if (typeof window !== "undefined") {
        window.open(invoiceJson.invoiceUrl, "_blank", "noopener,noreferrer");
      }
      await router.push(`/payment?checkoutId=${checkoutJson.checkoutId}`);
    } catch (error) {
      console.error(error);
      toast({ title: "Checkout gagal", description: "Periksa kembali data dan coba lagi" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Head>
        <title>Checkout | Malik Gaming Store</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840]">
        <div className="container mx-auto px-4 py-10">
          <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-primary">
                <ShoppingCart className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold">Checkout</h1>
                <p className="text-sm text-muted-foreground">
                  Review pesanan dan isi data pembeli sebelum lanjut ke pembayaran.
                </p>
              </div>
            </div>
            <Button variant="secondary" className="w-fit" onClick={() => router.push("/")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Kembali ke beranda
            </Button>
          </div>
          {!ready && (
            <Card className="bg-background/50">
              <CardHeader>
                <CardTitle>Loading keranjang...</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">Silakan tunggu.</p>
              </CardContent>
            </Card>
          )}
          {ready && items.length === 0 && (
            <Card className="bg-background/60 text-center">
              <CardHeader>
                <CardTitle>Keranjang masih kosong</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-sm text-muted-foreground">
                  Tambahkan paket top up di halaman utama sebelum melakukan checkout.
                </p>
                <Button className="mt-6" onClick={() => router.push("/")}>
                  Pilih produk
                </Button>
              </CardContent>
            </Card>
          )}
          {ready && items.length > 0 && (
            <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_360px]">
              <Card className="bg-background/60">
                <CardHeader>
                  <CardTitle>Ringkasan pesanan</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item</TableHead>
                        <TableHead className="w-24 text-center">Qty</TableHead>
                        <TableHead className="text-right">Harga</TableHead>
                        <TableHead className="text-right">Subtotal</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {items.map(item => (
                        <TableRow key={item.productId}>
                          <TableCell>
                            <div className="space-y-1">
                              <p className="text-sm font-semibold text-foreground">{item.name}</p>
                              <Badge variant="secondary" className="uppercase text-[11px] tracking-wide">
                                {item.game}
                              </Badge>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateQty(item.productId, item.qty - 1)}
                              >
                                <Minus className="h-4 w-4" />
                              </Button>
                              <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                              <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => updateQty(item.productId, item.qty + 1)}
                              >
                                <Plus className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                          <TableCell className="text-right text-sm text-muted-foreground">
                            {formatCurrency(item.price)}
                          </TableCell>
                          <TableCell className="text-right font-semibold">
                            {formatCurrency(item.price * item.qty)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    <TableCaption className="text-left text-xs text-muted-foreground">
                      Perubahan qty otomatis tersimpan di keranjang.
                    </TableCaption>
                  </Table>
                </CardContent>
              </Card>
              <Card className="h-max bg-gradient-to-b from-primary/10 to-secondary/10">
                <CardHeader>
                  <CardTitle>Detail pembayaran</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="mb-6 space-y-2 text-sm">
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Subtotal</span>
                      <span>{formatCurrency(subtotal)}</span>
                    </div>
                    <div className="flex items-center justify-between text-muted-foreground">
                      <span>Biaya admin</span>
                      <span>{formatCurrency(fee)}</span>
                    </div>
                    <div className="flex items-center justify-between text-base font-semibold text-foreground">
                      <span>Total</span>
                      <span>{formatCurrency(total)}</span>
                    </div>
                  </div>
                  <form className="space-y-4" onSubmit={handleSubmit}>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="buyer-name">
                        Nama pemesan
                      </label>
                      <Input
                        id="buyer-name"
                        required
                        value={buyerName}
                        onChange={event => setBuyerName(event.target.value)}
                        placeholder="Nama lengkap"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="email">
                        Email tujuan invoice
                      </label>
                      <div className="relative">
                        <Input
                          id="email"
                          type="email"
                          required
                          value={email}
                          onChange={event => setEmail(event.target.value)}
                          placeholder="nama@email.com"
                          className="pr-10"
                        />
                        <CheckCircle2 className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium" htmlFor="phone">
                        Nomor HP WhatsApp aktif
                      </label>
                      <div className="relative">
                        <Input
                          id="phone"
                          type="tel"
                          required
                          value={phone}
                          onChange={event => setPhone(event.target.value)}
                          placeholder="08xxxxxxxxxx"
                          className="pr-10"
                        />
                        <Phone className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-primary" />
                      </div>
                    </div>
                    <Button type="submit" className="w-full" disabled={isSubmitting}>
                      {isSubmitting ? "Memproses..." : "Bayar sekarang"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

