import Head from "next/head";
import { GetServerSideProps } from "next";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/router";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
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
  expired: "Expired"
};

const STATUS_VARIANT: Record<OrderRow["status"], "default" | "secondary" | "outline" | "destructive"> = {
  waiting_payment: "secondary",
  lunas: "default",
  expired: "destructive"
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
  active: true
};

function formatCategoryLabel(value?: string | null) {
  if (!value || !value.trim()) {
    return "General";
  }
  return value
    .trim()
    .split(/\s+/)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

function getErrorMessage(error: unknown) {
  if (error instanceof Error) {
    return error.message;
  }
  return "Terjadi kesalahan tak terduga";
}

export default function AdminDashboardPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [orders, setOrders] = useState<OrderRow[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [dailyData, setDailyData] = useState<DailyPoint[]>([]);
  const [monthlyData, setMonthlyData] = useState<MonthlyPoint[]>([]);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [products, setProducts] = useState<ProductRow[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [productForm, setProductForm] = useState<ProductFormState>(emptyProductForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingProduct, setSavingProduct] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [productGameFilter, setProductGameFilter] = useState<string>("all");

  const productCategories = useMemo(() => {
    const map = new Map<string, string>();
    products.forEach(product => {
      const raw = (product.game ?? "").trim();
      const normalized = raw.length > 0 ? raw.toLowerCase() : "general";
      const label = formatCategoryLabel(raw);
      if (!map.has(normalized)) {
        map.set(normalized, label);
      }
    });
    if (!map.has("general")) {
      map.set("general", formatCategoryLabel(null));
    }
    return Array.from(map.entries())
      .sort((a, b) => a[1].localeCompare(b[1], "id"))
      .map(([value, label]) => ({ value, label }));
  }, [products]);

  const filteredProducts = useMemo(() => {
    if (productGameFilter === "all") {
      return products;
    }
    return products.filter(product => {
      const raw = (product.game ?? "").trim();
      const normalized = raw.length > 0 ? raw.toLowerCase() : "general";
      return normalized === productGameFilter;
    });
  }, [productGameFilter, products]);

  useEffect(() => {
    if (productGameFilter === "all") {
      return;
    }
    const exists = productCategories.some(category => category.value === productGameFilter);
    if (!exists) {
      setProductGameFilter("all");
    }
  }, [productCategories, productGameFilter]);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error", error);
    } finally {
      router.push("/admin/login");
    }
  };

  const loadOrders = useCallback(async () => {
    setLoadingOrders(true);
    try {
      const response = await fetch("/api/admin/orders");
      if (response.status === 401 || response.status === 403) {
        router.push("/admin/login");
        return;
      }
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Gagal memuat orders");
      setOrders(
        (json.data as OrderRow[]).map(order => ({
          ...order,
          createdAt: order.createdAt || new Date().toISOString()
        }))
      );
    } catch (error) {
      toast({ title: "Gagal memuat orders", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoadingOrders(false);
    }
  }, [router, toast]);

  const loadAnalytics = useCallback(async () => {
    setLoadingAnalytics(true);
    try {
      const response = await fetch("/api/admin/analytics");
      if (response.status === 401 || response.status === 403) {
        router.push("/admin/login");
        return;
      }
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Gagal memuat analytics");
      setDailyData(json.daily as DailyPoint[]);
      setMonthlyData(json.monthly as MonthlyPoint[]);
    } catch (error) {
      toast({ title: "Gagal memuat analytics", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoadingAnalytics(false);
    }
  }, [router, toast]);

  const loadProducts = useCallback(async () => {
    setLoadingProducts(true);
    try {
      const response = await fetch("/api/admin/products");
      if (response.status === 401 || response.status === 403) {
        router.push("/admin/login");
        return;
      }
      const json = await response.json();
      if (!response.ok) throw new Error(json?.error || "Gagal memuat produk");
      setProducts(json.data as ProductRow[]);
    } catch (error) {
      toast({ title: "Gagal memuat produk", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setLoadingProducts(false);
    }
  }, [router, toast]);

  useEffect(() => {
    loadOrders();
    loadAnalytics();
    loadProducts();
  }, [loadOrders, loadAnalytics, loadProducts]);

  const handleStatusUpdate = async (orderId: string, status: OrderRow["status"]) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "Gagal mengubah status");
      }
      toast({ title: "Status diperbarui" });
      loadOrders();
    } catch (error) {
      toast({ title: "Gagal mengubah status", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const resetForm = () => {
    setProductForm(emptyProductForm);
    setEditingId(null);
  };

  const closeProductModal = () => {
    setProductModalOpen(false);
  };

  const openCreateProductModal = () => {
    resetForm();
    setProductModalOpen(true);
  };

  const startEdit = (product: ProductRow) => {
    setEditingId(product._id);
    setProductForm({
      name: product.name,
      price: product.price.toString(),
      description: product.description ?? "",
      stock: product.stock?.toString() ?? "0",
      image: product.image ?? "",
      game: product.game ?? "",
      currency: product.currency ?? "IDR",
      active: product.active
    });
    setProductModalOpen(true);
  };

  const handleProductSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSavingProduct(true);
    try {
      const payload = {
        ...productForm,
        price: Number(productForm.price),
        stock: Number(productForm.stock)
      };
      const url = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = editingId ? "PATCH" : "POST";
      const response = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(json?.error || "Gagal menyimpan produk");
      }
      toast({ title: editingId ? "Produk diperbarui" : "Produk ditambahkan" });
      closeProductModal();
      await loadProducts();
    } catch (error) {
      toast({ title: "Gagal menyimpan produk", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingProduct(false);
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Hapus produk ini?")) return;
    try {
      const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      if (!response.ok) {
        const json = await response.json().catch(() => ({}));
        throw new Error(json?.error || "Gagal menghapus produk");
      }
      toast({ title: "Produk dihapus" });
      if (editingId === productId) {
        closeProductModal();
      }
      await loadProducts();
    } catch (error) {
      toast({ title: "Gagal menghapus produk", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const dailySeries = useMemo(
    () =>
      dailyData.map(entry => ({
        dateLabel: format(new Date(entry.date), "dd MMM"),
        total: entry.total
      })),
    [dailyData]
  );

  const monthlySeries = useMemo(
    () =>
      monthlyData.map(entry => {
        const date = new Date(entry.year, entry.month - 1);
        return {
          monthLabel: format(date, "MMM yyyy"),
          total: entry.total
        };
      }),
    [monthlyData]
  );

  return (
    <>
      <Head>
        <title>Admin Dashboard | Malik Gaming Store</title>
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840] px-4 py-10">
        <div className="mx-auto max-w-7xl space-y-8">
          <header className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Admin Dashboard</h1>
              <p className="text-sm text-muted-foreground">Pantau order, pendapatan, dan kelola produk Anda.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleLogout}>
                Keluar
              </Button>
              <Button variant="secondary" onClick={() => router.push("/")}>
                Kembali ke toko
              </Button>
            </div>
          </header>

          <section className="grid gap-6 lg:grid-cols-2">
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Order Terbaru</CardTitle>
                <CardDescription>Update status pembayaran pelanggan secara real-time.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingOrders ? (
                  <p className="text-sm text-muted-foreground">Memuat data orders...</p>
                ) : (
                  <div className="rounded-3xl border border-border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order</TableHead>
                          <TableHead>Pelanggan</TableHead>
                          <TableHead>Produk</TableHead>
                          <TableHead>Total</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.length === 0 && (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                              Belum ada order.
                            </TableCell>
                          </TableRow>
                        )}
                        {orders.map(order => (
                          <TableRow key={order._id}>
                            <TableCell className="align-top text-sm">
                              <div className="font-semibold">#{order._id.slice(-6)}</div>
                              <div className="text-xs text-muted-foreground">{format(new Date(order.createdAt), "dd MMM yyyy HH:mm")}</div>
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <div className="font-medium">{order.buyer.name || order.user?.name || "Guest"}</div>
                              <div className="text-xs text-muted-foreground">{order.buyer.email}</div>
                              <div className="text-xs text-muted-foreground">{order.buyer.phone}</div>
                            </TableCell>
                            <TableCell className="align-top text-sm">
                              <ul className="space-y-1">
                                {order.items.map(item => (
                                  <li key={item.name}>
                                    {item.name} <span className="text-xs text-muted-foreground">x{item.quantity}</span>
                                  </li>
                                ))}
                              </ul>
                            </TableCell>
                            <TableCell className="align-top text-sm">{formatCurrency(order.total)}</TableCell>
                            <TableCell className="align-top">
                              <Badge variant={STATUS_VARIANT[order.status]}>{STATUS_LABEL[order.status]}</Badge>
                            </TableCell>
                            <TableCell className="align-top">
                              <div className="flex flex-col gap-2">
                                <Button size="sm" variant="outline" onClick={() => handleStatusUpdate(order._id, "waiting_payment")} disabled={order.status === "waiting_payment"}>
                                  Waiting
                                </Button>
                                <Button size="sm" onClick={() => handleStatusUpdate(order._id, "lunas")} disabled={order.status === "lunas"}>
                                  Tandai Lunas
                                </Button>
                                <Button size="sm" variant="destructive" onClick={() => handleStatusUpdate(order._id, "expired")} disabled={order.status === "expired"}>
                                  Tandai Expired
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Analytics Penjualan</CardTitle>
                <CardDescription>Grafik omset harian dan bulanan berdasarkan order masuk.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {loadingAnalytics && <p className="text-sm text-muted-foreground">Memuat data grafik...</p>}
                {!loadingAnalytics && (
                  <Tabs defaultValue="daily">
                    <TabsList>
                      <TabsTrigger value="daily">Harian</TabsTrigger>
                      <TabsTrigger value="monthly">Bulanan</TabsTrigger>
                    </TabsList>
                    <TabsContent value="daily" className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dailySeries}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                          <XAxis dataKey="dateLabel" stroke="#cbd5f5" />
                          <YAxis stroke="#cbd5f5" tickFormatter={value => `Rp${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Area type="monotone" dataKey="total" stroke="#6366f1" fill="#6366f1" fillOpacity={0.3} />
                        </AreaChart>
                      </ResponsiveContainer>
                    </TabsContent>
                    <TabsContent value="monthly" className="h-64">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={monthlySeries}>
                          <CartesianGrid strokeDasharray="3 3" className="stroke-muted/40" />
                          <XAxis dataKey="monthLabel" stroke="#cbd5f5" />
                          <YAxis stroke="#cbd5f5" tickFormatter={value => `Rp${(value / 1000).toFixed(0)}k`} />
                          <Tooltip formatter={(value: number) => formatCurrency(value)} />
                          <Bar dataKey="total" fill="#22d3ee" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </TabsContent>
                  </Tabs>
                )}
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="bg-background/70 backdrop-blur">
              <CardHeader>
                <CardTitle>Manajemen Produk</CardTitle>
                <CardDescription>Tambah produk baru atau perbarui stok dan detail harga.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Kelola produk</p>
                    <p className="text-xs text-muted-foreground">Buat atau ubah produk melalui modal di tengah layar.</p>
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button type="button" onClick={openCreateProductModal} disabled={savingProduct}>
                      Tambah Produk
                    </Button>
                  </div>
                </div>

                <div className="flex flex-col gap-3 rounded-3xl border border-border/60 bg-background/40 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Filter produk</p>
                    <p className="text-xs text-muted-foreground">Tampilkan produk berdasarkan kategori atau jenis game.</p>
                  </div>
                  <div className="w-full sm:w-64">
                    <Select value={productGameFilter} onValueChange={setProductGameFilter}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih kategori" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Semua kategori</SelectItem>
                        {productCategories.map(category => (
                          <SelectItem key={category.value} value={category.value}>
                            {category.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="rounded-3xl border border-border">
                  {loadingProducts ? (
                    <p className="p-4 text-sm text-muted-foreground">Memuat produk...</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Produk</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Harga</TableHead>
                          <TableHead>Stok</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Aksi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredProducts.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                              {products.length === 0 ? "Belum ada produk terdaftar." : "Tidak ada produk pada kategori yang dipilih."}
                            </TableCell>
                          </TableRow>
                        ) : (
                          filteredProducts.map(product => {
                            const gameLabel = formatCategoryLabel(product.game);
                            return (
                              <TableRow key={product._id}>
                                <TableCell>
                                  <div className="font-medium">{product.name}</div>
                                  <div className="text-xs text-muted-foreground">{product.description}</div>
                                </TableCell>
                                <TableCell>{gameLabel}</TableCell>
                                <TableCell>{formatCurrency(product.price)}</TableCell>
                                <TableCell>{product.stock ?? 0}</TableCell>
                                <TableCell>
                                  <Badge variant={product.active ? "default" : "secondary"}>{product.active ? "Aktif" : "Nonaktif"}</Badge>
                                </TableCell>
                                <TableCell>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => startEdit(product)}>
                                      Edit
                                    </Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product._id)}>
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
      <Dialog
        open={productModalOpen}
        onOpenChange={open => {
          if (open) {
            setProductModalOpen(true);
          } else {
            setProductModalOpen(false);
            resetForm();
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Produk" : "Tambah Produk"}</DialogTitle>
            <DialogDescription>Isi detail produk dengan lengkap untuk menambah atau memperbarui katalog.</DialogDescription>
          </DialogHeader>
          <form className="space-y-6" onSubmit={handleProductSubmit}>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="modal-name">Nama Produk</Label>
                <Input id="modal-name" value={productForm.name} onChange={event => setProductForm(prev => ({ ...prev, name: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-price">Harga</Label>
                <Input id="modal-price" type="number" min="0" value={productForm.price} onChange={event => setProductForm(prev => ({ ...prev, price: event.target.value }))} required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="modal-description">Deskripsi</Label>
                <Input id="modal-description" value={productForm.description} onChange={event => setProductForm(prev => ({ ...prev, description: event.target.value }))} placeholder="Deskripsi singkat produk" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-stock">Stok</Label>
                <Input id="modal-stock" type="number" min="0" value={productForm.stock} onChange={event => setProductForm(prev => ({ ...prev, stock: event.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-game">Kategori/Game</Label>
                <Input id="modal-game" value={productForm.game} onChange={event => setProductForm(prev => ({ ...prev, game: event.target.value }))} placeholder="mis. mobile legends" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="modal-currency">Mata Uang</Label>
                <Input id="modal-currency" value={productForm.currency} onChange={event => setProductForm(prev => ({ ...prev, currency: event.target.value }))} />
              </div>
              <label className="sm:col-span-2 flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border-border bg-background accent-primary" checked={productForm.active} onChange={event => setProductForm(prev => ({ ...prev, active: event.target.checked }))} />
                Aktifkan produk ini
              </label>
            </div>
            <DialogFooter className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={savingProduct}>
                {savingProduct ? "Menyimpan..." : editingId ? "Update Produk" : "Tambah Produk"}
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

export const getServerSideProps: GetServerSideProps = async context => {
  const session = getSessionFromCookies(context.req.headers.cookie);
  if (!isAdminSession(session)) {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false
      }
    };
  }
  return {
    props: {}
  };
};
