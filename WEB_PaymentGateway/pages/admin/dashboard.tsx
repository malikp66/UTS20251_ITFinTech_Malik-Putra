import { ChangeEvent, FormEvent, useEffect, useMemo, useState } from "react";
import Head from "next/head";
import { GetServerSideProps } from "next";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { formatCurrency } from "@/lib/utils";
import { getSessionFromContext } from "@/lib/server-session";

import styles from "@/styles/AdminChart.module.css";

type OrderItem = {
  productId: string;
  name: string;
  price: number;
  qty: number;
  subtotal: number;
};

type Order = {
  id: string;
  customer: { name: string; email: string };
  items: OrderItem[];
  total: number;
  status: "waiting_payment" | "paid" | "expired";
  createdAt: string;
};

type Product = {
  _id: string;
  name: string;
  price: number;
  description?: string;
  stock?: number;
  image?: string;
};

type AnalyticsResponse = {
  daily: Array<{ date: string; total: number }>;
  monthly: Array<{ month: string; total: number }>;
};

type ProductFormState = {
  name: string;
  price: string;
  description: string;
  stock: string;
  image: string;
};

function createInitialForm(): ProductFormState {
  return { name: "", price: "", description: "", stock: "0", image: "" };
}

function MiniBarChart({ data, labelKey }: { data: Array<{ [key: string]: string | number }>; labelKey: string }) {
  const max = useMemo(() => (data.length ? Math.max(...data.map((item) => Number(item.total ?? 0))) : 0), [data]);
  return (
    <div className={styles.chartContainer}>
      {data.map((item) => {
        const value = Number(item.total ?? 0);
        const height = max === 0 ? 0 : (value / max) * 100;
        return (
          <div key={item[labelKey] as string} className={styles.barWrapper}>
            <div className={styles.bar} style={{ height: `${height}%` }}>
              <span className={styles.barValue}>{value === 0 ? "" : `Rp ${value.toLocaleString("id-ID")}`}</span>
            </div>
            <span className={styles.barLabel}>{String(item[labelKey]).slice(-5)}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function AdminDashboardPage() {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsResponse>({ daily: [], monthly: [] });
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<ProductFormState>(createInitialForm());

  const loadAll = async () => {
    setLoading(true);
    try {
      const [ordersRes, analyticsRes, productsRes] = await Promise.all([
        fetch("/api/admin/orders"),
        fetch("/api/admin/analytics"),
        fetch("/api/admin/products")
      ]);
      const ordersJson = await ordersRes.json();
      const analyticsJson = await analyticsRes.json();
      const productsJson = await productsRes.json();
      if (!ordersRes.ok || !analyticsRes.ok || !productsRes.ok) {
        throw new Error("Tidak dapat memuat data admin");
      }
      setOrders(ordersJson.data ?? []);
      setAnalytics(analyticsJson.data ?? { daily: [], monthly: [] });
      setProducts(productsJson.data ?? []);
    } catch (error) {
      toast({ title: "Gagal memuat", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
  }, []);

  const handleStatusChange = async (orderId: string, status: Order["status"]) => {
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status })
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Gagal memperbarui status");
      }
      toast({ title: "Status diperbarui" });
      loadAll();
    } catch (error) {
      toast({ title: "Gagal memperbarui", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    }
  };

  const handleFormChange = (field: keyof ProductFormState) => (event: ChangeEvent<HTMLInputElement>) => {
    setForm((prev) => ({ ...prev, [field]: event.target.value }));
  };

  const handleSubmitProduct = async (event: FormEvent) => {
    event.preventDefault();
    const payload = {
      name: form.name,
      price: Number(form.price),
      description: form.description,
      stock: Number(form.stock),
      image: form.image
    };
    try {
      const endpoint = editingId ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = editingId ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Gagal menyimpan produk");
      }
      toast({ title: editingId ? "Produk diperbarui" : "Produk ditambahkan" });
      setForm(createInitialForm());
      setEditingId(null);
      loadAll();
    } catch (error) {
      toast({ title: "Gagal menyimpan", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    }
  };

  const handleEditProduct = (product: Product) => {
    setEditingId(product._id);
    setForm({
      name: product.name ?? "",
      price: String(product.price ?? 0),
      description: product.description ?? "",
      stock: String(product.stock ?? 0),
      image: product.image ?? ""
    });
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm("Hapus produk ini?")) {
      return;
    }
    try {
      const response = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error ?? "Gagal menghapus produk");
      }
      toast({ title: "Produk dihapus" });
      loadAll();
    } catch (error) {
      toast({ title: "Gagal menghapus", description: error instanceof Error ? error.message : "Terjadi kesalahan" });
    }
  };

  return (
    <>
      <Head>
        <title>Admin Dashboard | Malik Gaming Store</title>
      </Head>
      <main className="min-h-screen bg-slate-950 text-foreground">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 px-4 py-10">
          <header className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-white">Dashboard Admin</h1>
              <p className="text-sm text-slate-300">Pantau transaksi, pendapatan, dan kelola produk</p>
            </div>
            <Button variant="secondary" onClick={loadAll} disabled={loading}>
              Muat ulang data
            </Button>
          </header>

          <section className="grid gap-6 md:grid-cols-2">
            <Card className="bg-slate-900/80">
              <CardHeader>
                <CardTitle>Omzet Harian</CardTitle>
                <CardDescription>Total pembayaran yang diterima setiap hari</CardDescription>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={analytics.daily} labelKey="date" />
              </CardContent>
            </Card>
            <Card className="bg-slate-900/80">
              <CardHeader>
                <CardTitle>Omzet Bulanan</CardTitle>
                <CardDescription>Ringkasan transaksi per bulan</CardDescription>
              </CardHeader>
              <CardContent>
                <MiniBarChart data={analytics.monthly} labelKey="month" />
              </CardContent>
            </Card>
          </section>

          <section>
            <Card className="bg-slate-900/80">
              <CardHeader>
                <CardTitle>Daftar Pesanan</CardTitle>
                <CardDescription>Monitor status pembayaran dan produk yang dibeli pelanggan</CardDescription>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Pelanggan</TableHead>
                      <TableHead>Produk</TableHead>
                      <TableHead>Total</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Aksi</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {orders.map((order) => (
                      <TableRow key={order.id}>
                        <TableCell className="font-mono text-xs">{order.id}</TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="font-medium">{order.customer.name || "-"}</span>
                            <span className="text-xs text-muted-foreground">{order.customer.email}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <ul className="text-xs text-muted-foreground">
                            {order.items.map((item) => (
                              <li key={item.productId}>{item.name} x{item.qty}</li>
                            ))}
                          </ul>
                        </TableCell>
                        <TableCell>{formatCurrency(order.total)}</TableCell>
                        <TableCell>
                          {order.status === "paid" ? "Lunas" : order.status === "expired" ? "Kedaluwarsa" : "Menunggu"}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="outline" size="sm" onClick={() => handleStatusChange(order.id, "paid")}>Tandai lunas</Button>
                            <Button variant="ghost" size="sm" onClick={() => handleStatusChange(order.id, "waiting_payment")}>Menunggu</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {orders.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                          Belum ada pesanan
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </section>

          <section className="grid gap-6 md:grid-cols-[2fr_3fr]">
            <Card className="bg-slate-900/80">
              <CardHeader>
                <CardTitle>{editingId ? "Ubah Produk" : "Tambah Produk"}</CardTitle>
                <CardDescription>Isi formulir berikut untuk {editingId ? "memperbarui" : "menambahkan"} produk</CardDescription>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleSubmitProduct}>
                  <div>
                    <label className="text-sm font-medium">Nama</label>
                    <Input value={form.name} onChange={handleFormChange("name")} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Harga</label>
                    <Input type="number" min="0" value={form.price} onChange={handleFormChange("price")} required />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Stok</label>
                    <Input type="number" min="0" value={form.stock} onChange={handleFormChange("stock")} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Deskripsi</label>
                    <Input value={form.description} onChange={handleFormChange("description")} />
                  </div>
                  <div>
                    <label className="text-sm font-medium">URL Gambar</label>
                    <Input value={form.image} onChange={handleFormChange("image")} />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={loading}>
                      {editingId ? "Simpan Perubahan" : "Tambah Produk"}
                    </Button>
                    {editingId && (
                      <Button type="button" variant="ghost" onClick={() => setEditingId(null)}>
                        Batal
                      </Button>
                    )}
                  </div>
                </form>
              </CardContent>
            </Card>
            <Card className="bg-slate-900/80">
              <CardHeader>
                <CardTitle>Daftar Produk</CardTitle>
                <CardDescription>Edit atau hapus produk yang tersedia</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {products.map((product) => (
                  <div key={product._id} className="flex items-start justify-between rounded-lg border border-slate-700 p-4">
                    <div>
                      <p className="font-medium text-white">{product.name}</p>
                      <p className="text-sm text-slate-300">{formatCurrency(product.price)}</p>
                      {product.description && <p className="text-xs text-slate-400">{product.description}</p>}
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleEditProduct(product)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDeleteProduct(product._id)}>
                        Hapus
                      </Button>
                    </div>
                  </div>
                ))}
                {products.length === 0 && <p className="text-sm text-muted-foreground">Belum ada produk</p>}
              </CardContent>
            </Card>
          </section>
        </div>
      </main>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async (context) => {
  const session = getSessionFromContext(context);
  if (!session || session.role !== "admin") {
    return {
      redirect: {
        destination: "/admin/login",
        permanent: false
      }
    };
  }
  return { props: {} };
};
