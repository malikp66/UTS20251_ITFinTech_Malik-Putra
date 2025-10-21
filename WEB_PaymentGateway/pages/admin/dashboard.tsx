import Head from "next/head";
import { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from "recharts";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { getSessionFromCookies, isAdminSession } from "@/lib/auth";

type OrderRow = {
  _id: string;
  buyer: { name?: string; email: string; phone: string };
  items: { name: string; quantity: number; price: number; subtotal: number }[];
  total: number;
  status: "waiting_payment" | "lunas" | "expired";
  createdAt: string;
  user?: { name: string; email: string; phone: string } | null;
};

type ProductRow = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  stock?: number;
  image?: string;
  game?: string;
  currency: string;
  active: boolean;
};

type DailyPoint = { date: string; total: number };
type MonthlyPoint = { year: number; month: number; total: number };

const STATUS_LABEL: Record<OrderRow["status"], string> = {
  waiting_payment: "Waiting Payment",
  lunas: "Lunas",
  expired: "Expired",
};

const STATUS_VARIANT: Record<OrderRow["status"], "default" | "secondary" | "outline" | "destructive"> = {
  waiting_payment: "secondary",
  lunas: "default",
  expired: "destructive",
};

type ProductFormState = {
  name: string;
  price: string;
  description: string;
  stock: string;
  image: string;
  game: string;
  currency: string;
  active: boolean;
};

const emptyProductForm: ProductFormState = {
  name: "",
  price: "",
  description: "",
  stock: "0",
  image: "",
  game: "",
  currency: "IDR",
  active: true,
};

function formatCategoryLabel(value?: string | null) {
  if (!value || !value.trim()) return "General";
  return value
    .trim()
    .split(/\s+/)
    .map((w) => w[0].toUpperCase() + w.slice(1))
    .join(" ");
}
function getErrorMessage(e: unknown) {
  return e instanceof Error ? e.message : "Terjadi kesalahan tak terduga";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();

  // data states
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // ui states
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);

  // filters
  const [orderStatusFilter, setOrderStatusFilter] = useState<"all" | OrderRow["status"]>("all");
  const [orderSearch, setOrderSearch] = useState("");
  const [productGameFilter, setProductGameFilter] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 8;

  // derived: product categories
  const productCategories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach((p) => {
      const raw = (p.game ?? "").trim();
      const normalized = raw ? raw.toLowerCase() : "general";
      const label = formatCategoryLabel(raw);
      if (!map.has(normalized)) map.set(normalized, label);
    });
    if (!map.has("general")) map.set("general", "General");
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "id"))
      .map(([value, label]) => ({ value, label }));
  }, [products]);

  // derived: filtered orders/products
  const filteredOrders = useMemo(() => {
    const q = orderSearch.trim().toLowerCase();
    return orders.filter((o) => {
      const okStatus = orderStatusFilter === "all" ? true : o.status === orderStatusFilter;
      const hay =
        `${o._id} ${o.buyer?.name ?? ""} ${o.user?.name ?? ""} ${o.buyer.email} ${o.buyer.phone} ${o.items
          .map((i) => i.name)
          .join(" ")}`.toLowerCase();
      const okSearch = q ? hay.includes(q) : true;
      return okStatus && okSearch;
    });
  }, [orders, orderStatusFilter, orderSearch]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    return products.filter((p) => {
      const normalized = (p.game ?? "").trim().toLowerCase() || "general";
      const okCat = productGameFilter === "all" ? true : normalized === productGameFilter;
      const hay = `${p.name} ${p.description ?? ""} ${p.game ?? ""}`.toLowerCase();
      const okSearch = q ? hay.includes(q) : true;
      return okCat && okSearch;
    });
  }, [products, productGameFilter, productSearch]);

  // KPI (informasi cepat)
  const kpi = useMemo(() => {
    const todayStr = format(new Date(), "yyyy-MM-dd");
    const todayTotal = orders
      .filter((o) => format(new Date(o.createdAt), "yyyy-MM-dd") === todayStr && o.status === "lunas")
      .reduce((s, o) => s + o.total, 0);
    const monthKey = format(new Date(), "yyyy-MM");
    const monthTotal = orders
      .filter((o) => format(new Date(o.createdAt), "yyyy-MM") === monthKey && o.status === "lunas")
      .reduce((s, o) => s + o.total, 0);
    const totalOrder = orders.length;
    const paidOrders = orders.filter((o) => o.status === "lunas");
    const aov = paidOrders.length ? Math.round(paidOrders.reduce((s, o) => s + o.total, 0) / paidOrders.length) : 0;
    return { todayTotal, monthTotal, totalOrder, aov };
  }, [orders]);

  // effects: load data
  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const res = await fetch("/api/admin/orders");
      if (res.status === 401 || res.status === 403) return router.push("/admin/login");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memuat orders");
      setOrders(
        (json.data as OrderRow[]).map((o) => ({ ...o, createdAt: o.createdAt || new Date().toISOString() }))
      );
    } catch (e) {
      toast({ title: "Gagal memuat orders", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoadingOrders(false);
    }
  }, [router, toast]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.status === 401 || res.status === 403) return router.push("/admin/login");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memuat analytics");
      setDailyData(json.daily as DailyPoint[]);
      setMonthlyData(json.monthly as MonthlyPoint[]);
    } catch (e) {
      toast({ title: "Gagal memuat analytics", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoadingAnalytics(false);
    }
  }, [router, toast]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const res = await fetch("/api/admin/products");
      if (res.status === 401 || res.status === 403) return router.push("/admin/login");
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "Gagal memuat produk");
      setProducts(json.data as ProductRow[]);
    } catch (e) {
      toast({ title: "Gagal memuat produk", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  }, [router, toast]);

  useEffect(() => {
    loadOrders();
    loadAnalytics();
    loadProducts();
  }, [loadOrders, loadAnalytics, loadProducts]);

  // auth
  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch {}
    router.push("/admin/login");
  };

  // product form
  const resetForm = () => {
    setProductForm(emptyProductForm);
    setEditingId(null);
  };
  const closeProductModal = () => setProductModalOpen(false);
  const openCreateProductModal = () => {
    resetForm();
    setProductModalOpen(true);
  };
  const startEdit = (p: ProductRow) => {
    setEditingId(p._id);
    setProductForm({
      name: p.name,
      price: String(p.price),
      description: p.description ?? "",
      stock: String(p.stock ?? 0),
      image: p.image ?? "",
      game: p.game ?? "",
      currency: p.currency ?? "IDR",
      active: p.active,
    });
    setProductModalOpen(true);
  };
  const handleProductSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSavingProduct(true);
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock),
      };
      const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = editingId ? "PATCH" : "POST";
      const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Gagal menyimpan produk");
      toast({ title: editingId ? "Produk diperbarui" : "Produk ditambahkan" });
      closeProductModal();
      await loadProducts();
    } catch (e) {
      toast({ title: "Gagal menyimpan produk", description: getErrorMessage(e), variant: "destructive" });
    } finally {
      setSavingProduct(false);
    }
  };
  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json?.error || "Gagal menghapus produk");
      toast({ title: "Produk dihapus" });
      if (editingId === id) closeProductModal();
      await loadProducts();
    } catch (e) {
      toast({ title: "Gagal menghapus produk", description: getErrorMessage(e), variant: "destructive" });
    }
  };

  // export CSV orders
  const exportOrdersCsv = () => {
    const rows = [
      ["order_id", "created_at", "buyer_name", "buyer_email", "buyer_phone", "status", "total", "items"].join(","),
      ...filteredOrders.map((o) =>
        [
          o._id,
          new Date(o.createdAt).toISOString(),
          (o.buyer.name || o.user?.name || "Guest").replace(/,/g, " "),
          o.buyer.email,
          o.buyer.phone,
          o.status,
          o.total,
          o.items.map((i) => `${i.name} x${i.quantity}`).join("|").replace(/,/g, " "),
        ].join(",")
      ),
    ].join("\n");
    const blob = new Blob([rows], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `orders_${format(new Date(), "yyyyMMdd_HHmmss")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // chart series
  const dailySeries = useMemo(
    () => dailyData.map((d) => ({ dateLabel: format(new Date(d.date), "dd MMM"), total: d.total })),
    [dailyData]
  );
  const monthlySeries = useMemo(
    () => monthlyData.map((m) => ({ monthLabel: format(new Date(m.year, m.month - 1), "MMM yyyy"), total: m.total })),
    [monthlyData]
  );

  // Format rupiah compact ("Rp178rb", "Rp1,2 jt")
  const fmtCompact = (n: number) =>
    new Intl.NumberFormat("id-ID", {
      style: "currency",
      currency: "IDR",
      maximumFractionDigits: 0,
      notation: "compact"
    }).format(n);

  // Tooltip kustom bergaya glass
  function NeonTooltip({
    active,
    payload,
    label,
    labelPrefix
  }: {
    active?: boolean;
    payload?: any[];
    label?: string;
    labelPrefix?: string; // "21 Oct" / "Okt 2025"
  }) {
    if (!active || !payload || !payload.length) return null;
    const v = payload[0].value as number;
    return (
      <div className="rounded-xl bg-black/70 ring-1 ring-white/10 backdrop-blur px-3 py-2 shadow-[0_8px_30px_rgba(0,0,0,.35)]">
        {label && (
          <div className="text-[11px] tracking-wide text-muted-foreground/80">
            {labelPrefix ?? ""}{labelPrefix ? " " : ""}{label}
          </div>
        )}
        <div className="mt-0.5 text-sm font-semibold text-foreground">
          Total: <span className="text-primary">{fmtCompact(v)}</span>
        </div>
      </div>
    );
  }


  return (
    <>
      <Head>
        <title>Admin Dashboard | Malik Gaming Store</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840] px-3 sm:px-4 py-6 sm:py-10">
        <div className="mx-auto w-full max-w-7xl space-y-6 sm:space-y-8">
          {/* HEADER */}
          <header className="top-0 z-40 -mx-3 sm:mx-0 px-3 sm:px-0 py-3">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-white">Admin Dashboard</h1>
                <p className="text-xs sm:text-sm text-muted-foreground">Pantau order, pendapatan, dan kelola produk Anda.</p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={handleLogout}>Keluar</Button>
                <Button variant="secondary" onClick={() => router.push("/")}>Kembali ke toko</Button>
              </div>
            </div>
          </header>

          {/* KPI CARDS */}
          <section className="grid grid-cols-2 gap-3 sm:grid-cols-4 sm:gap-4">
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="py-4">
                <CardDescription>Omzet Hari Ini</CardDescription>
                <CardTitle className="text-xl sm:text-2xl">{formatCurrency(kpi.todayTotal)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="py-4">
                <CardDescription>Omzet Bulan Ini</CardDescription>
                <CardTitle className="text-xl sm:text-2xl">{formatCurrency(kpi.monthTotal)}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="py-4">
                <CardDescription>Total Order</CardDescription>
                <CardTitle className="text-xl sm:text-2xl">{kpi.totalOrder}</CardTitle>
              </CardHeader>
            </Card>
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="py-4">
                <CardDescription>AOV (Rata-rata)</CardDescription>
                <CardTitle className="text-xl sm:text-2xl">{formatCurrency(kpi.aov)}</CardTitle>
              </CardHeader>
            </Card>
          </section>

          {/* ORDERS + ANALYTICS */}
          <section className="grid gap-6 lg:grid-cols-2">
            {/* ORDERS */}
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex flex-col justify-center space-y-1">
                  <CardTitle>Order Terbaru</CardTitle>
                  <CardDescription>Update status pembayaran pelanggan secara real-time.</CardDescription>
                </div>
                {/* toolbar */}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="col-span-2">
                    <Input
                      placeholder="Cari order (nama, email, item, nomor)…"
                      value={orderSearch}
                      onChange={(e) => setOrderSearch(e.target.value)}
                      aria-label="Cari order"
                    />
                  </div>
                  <Select value={orderStatusFilter} onValueChange={(v: any) => setOrderStatusFilter(v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Semua status</SelectItem>
                      <SelectItem value="waiting_payment">Waiting Payment</SelectItem>
                      <SelectItem value="lunas">Lunas</SelectItem>
                      <SelectItem value="expired">Expired</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {loadingOrders ? (
                  <p className="text-sm text-muted-foreground">Memuat data orders…</p>
                ) : (
                  <div className="overflow-x-auto rounded-2xl border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="whitespace-nowrap">Order</TableHead>
                          <TableHead className="whitespace-nowrap">Pelanggan</TableHead>
                          <TableHead className="whitespace-nowrap">Produk</TableHead>
                          <TableHead className="whitespace-nowrap">Total</TableHead>
                          <TableHead className="whitespace-nowrap">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredOrders.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                              {orders.length === 0 ? "Belum ada order." : "Tidak ada order sesuai filter."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredOrders
                            .slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage)
                            .map((order) => (
                            <TableRow key={order._id}>
                              <TableCell className="align-top text-sm min-w-[140px]">
                                <div className="font-semibold">#{order._id.slice(-6)}</div>
                                <div className="text-xs text-muted-foreground">
                                  {format(new Date(order.createdAt), "dd MMM yyyy HH:mm")}
                                </div>
                              </TableCell>
                              <TableCell className="align-top text-sm min-w-[200px]">
                                <div className="font-medium">{order.buyer.name || order.user?.name || "Guest"}</div>
                                <div className="text-xs text-muted-foreground">{order.buyer.email}</div>
                                <div className="text-xs text-muted-foreground">{order.buyer.phone}</div>
                              </TableCell>
                              <TableCell className="align-top text-sm min-w-[220px]">
                                <ul className="space-y-1">
                                  {order.items.map((it) => (
                                    <li key={it.name}>
                                      {it.name}{" "}
                                      <span className="text-xs text-muted-foreground">x{it.quantity}</span>
                                    </li>
                                  ))}
                                </ul>
                              </TableCell>
                              <TableCell className="align-top text-sm min-w-[120px]">
                                {formatCurrency(order.total)}
                              </TableCell>
                              <TableCell className="align-top min-w-[120px]">
                                <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <div className="flex items-center justify-between p-3 border-t border-border/40">
                      <p className="text-xs text-muted-foreground">
                        Halaman {currentPage} dari {totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === 1}
                          onClick={() => setCurrentPage((p) => p - 1)}
                        >
                          Sebelumnya
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={currentPage === totalPages}
                          onClick={() => setCurrentPage((p) => p + 1)}
                        >
                          Selanjutnya
                        </Button>
                      </div>
                    </div>

                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Menampilkan maksimal 8 order terakhir. Gunakan filter untuk mempersempit hasil.
                  </p>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={exportOrdersCsv}>Export CSV</Button>
                    <Button variant="secondary" onClick={loadOrders}>Refresh</Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ANALYTICS */}
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Analytics Penjualan</CardTitle>
                <CardDescription>Grafik omzet harian dan bulanan dari order masuk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingAnalytics ? (
                  <p className="text-sm text-muted-foreground">Memuat data grafik…</p>
                ) : (
                  <Tabs defaultValue="daily">
                    <TabsList className="w-full sm:w-auto">
                      <TabsTrigger value="daily" className="w-full sm:w-auto">Harian</TabsTrigger>
                      <TabsTrigger value="monthly" className="w-full sm:w-auto">Bulanan</TabsTrigger>
                    </TabsList>

                    <TabsContent value="daily" className="h-[240px] sm:h-[280px] lg:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailySeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#8b5cf6" stopOpacity={0.55} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.12} />
                            </linearGradient>
                            <linearGradient id="cursorStroke" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#a78bfa" stopOpacity={0.8} />
                              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0.8} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="4 8" stroke="rgba(148,163,184,.15)" vertical={false} />
                          <XAxis
                            dataKey="dateLabel"
                            tickLine={false}
                            axisLine={false}
                            stroke="#cbd5f5"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            stroke="#cbd5f5"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v) => fmtCompact(v)}
                            width={60}
                          />

                          <Tooltip
                            cursor={{ stroke: "url(#cursorStroke)", strokeWidth: 2, opacity: 0.6 }}
                            content={<NeonTooltip labelPrefix="" />}
                          />

                          <Area
                            type="monotoneX"
                            dataKey="total"
                            stroke="#a5b4fc"
                            strokeWidth={2}
                            fill="url(#areaFill)"
                            activeDot={{
                              r: 5,
                              stroke: "#a78bfa",
                              strokeWidth: 3,
                              fill: "#0b1022"
                            }}
                            dot={{ r: 2.2, strokeWidth: 0, fill: "#a5b4fc" }}
                            animationDuration={700}
                          />
                        </AreaChart>
                      </ResponsiveContainer>
                    </TabsContent>


                    <TabsContent value="monthly" className="h-[240px] sm:h-[280px] lg:h-[300px]">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlySeries} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <defs>
                            <linearGradient id="barFill" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.95} />
                              <stop offset="100%" stopColor="#6366f1" stopOpacity={0.65} />
                            </linearGradient>
                          </defs>

                          <CartesianGrid strokeDasharray="4 8" stroke="rgba(148,163,184,.15)" vertical={false} />
                          <XAxis
                            dataKey="monthLabel"
                            tickLine={false}
                            axisLine={false}
                            stroke="#cbd5f5"
                            tick={{ fontSize: 12 }}
                          />
                          <YAxis
                            tickLine={false}
                            axisLine={false}
                            stroke="#cbd5f5"
                            tick={{ fontSize: 12 }}
                            tickFormatter={(v) => fmtCompact(v)}
                            width={60}
                          />

                          <Tooltip content={<NeonTooltip />} cursor={{ fill: "rgba(99,102,241,.06)" }} />

                          <Bar
                            dataKey="total"
                            fill="url(#barFill)"
                            radius={[10, 10, 10, 10]}
                            barSize={26}
                            background={{ fill: "rgba(148,163,184,.10)", radius: 8 }}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>

                  </Tabs>
                )}
              </CardContent>
            </Card>
          </section>

          {/* PRODUCTS */}
          <section>
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader className="space-y-4">
                <div className="flex flex-col justify-center space-y-1">
                  <CardTitle>Manajemen Produk</CardTitle>
                  <CardDescription>Tambah produk baru atau perbarui harga.</CardDescription>
                </div>

                {/* toolbar */}
                <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="order-2 sm:order-1">
                    <Input
                      placeholder="Cari produk (nama, deskripsi, game)…"
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      aria-label="Cari produk"
                    />
                  </div>
                  <div className="order-3 sm:order-2">
                    <Select value={productGameFilter} onValueChange={setProductGameFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent className="max-h-64">
                        <SelectItem value="all">Semua kategori</SelectItem>
                        {productCategories.map((c) => (
                          <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="order-1 sm:order-3 flex justify-end">
                    <Button onClick={openCreateProductModal} disabled={savingProduct}>Tambah Produk</Button>
                  </div>
                </div>
              </CardHeader>

              <CardContent>
                <div className="overflow-x-auto rounded-2xl border">
                  {loadingProducts ? (
                    <p className="p-4 text-sm text-muted-foreground">Memuat produk…</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Harga</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                              {products.length === 0 ? "Belum ada produk terdaftar." : "Tidak ada produk sesuai filter."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProducts.map((p) => {
                            const gameLabel = formatCategoryLabel(p.game);
                            return (
                              <TableRow key={p._id}>
                                <TableCell className="align-top min-w-[220px]">
                                  <div className="font-medium">{p.name}</div>
                                  {p.description && (
                                    <div className="text-xs text-muted-foreground line-clamp-2">{p.description}</div>
                                  )}
                                </TableCell>
                                <TableCell className="align-top">{gameLabel}</TableCell>
                                <TableCell className="align-top">{formatCurrency(p.price)}</TableCell>
                                <TableCell className="align-top">
                                  <Badge variant={p.active ? "default" : "secondary"}>
                                    {p.active ? "Aktif" : "Nonaktif"}
                                  </Badge>
                                </TableCell>
                                <TableCell className="align-top">
                                  <div className="flex justify-end gap-2">
                                    <Button size="sm" variant="outline" onClick={() => startEdit(p)}>Edit</Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(p._id)}>
                                      Hapus
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            );
                          })
                        )}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </CardContent>
            </Card>
          </section>
        </div>
      </div>

      {/* PRODUCT MODAL */}
      <Dialog
        open={productModalOpen}
        onOpenChange={(open) => {
          if (!open) resetForm();
          setProductModalOpen(open);
        }}
      >
        <DialogContent className="max-w-2xl rounded-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
            <DialogDescription>Isi detail produk dengan lengkap untuk menambah atau memperbarui katalog.</DialogDescription>
          </DialogHeader>

          <form className="space-y-6" onSubmit={handleProductSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-name">Nama Produk</Label>
                <Input id="modal-name" value={productForm.name} onChange={(e) => setProductForm((p) => ({ ...p, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-price">Harga</Label>
                <Input id="modal-price" type="number" min="0" value={productForm.price} onChange={(e) => setProductForm((p) => ({ ...p, price: e.target.value }))} required />
              </div>

              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="modal-description">Deskripsi</Label>
                <Input id="modal-description" value={productForm.description} onChange={(e) => setProductForm((p) => ({ ...p, description: e.target.value }))} placeholder="Deskripsi singkat produk" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-stock">Stok</Label>
                <Input id="modal-stock" type="number" min="0" value={productForm.stock} onChange={(e) => setProductForm((p) => ({ ...p, stock: e.target.value }))} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-game">Kategori/Game</Label>
                <Input id="modal-game" value={productForm.game} onChange={(e) => setProductForm((p) => ({ ...p, game: e.target.value }))} placeholder="mis. mobile legends" />
              </div>

              <div className="space-y-2">
                <Label htmlFor="modal-currency">Mata Uang</Label>
                <Input id="modal-currency" value={productForm.currency} onChange={(e) => setProductForm((p) => ({ ...p, currency: e.target.value }))} />
              </div>

              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 rounded border-border bg-background accent-primary"
                  checked={productForm.active}
                  onChange={(e) => setProductForm((p) => ({ ...p, active: e.target.checked }))}
                />
                Aktifkan produk ini
              </label>
            </div>

            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={savingProduct}>
                {savingProduct ? "Menyimpan…" : editingId ? "Update Produk" : "Tambah Produk"}
              </Button>
              <Button type="button" variant="outline" disabled={savingProduct} onClick={closeProductModal}>
                Batal
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = getSessionFromCookies(context.req.headers.cookie);
  if (!isAdminSession(session)) {
    return { redirect: { destination: "/admin/login", permanent: false } };
  }
  return { props: {} };
};
