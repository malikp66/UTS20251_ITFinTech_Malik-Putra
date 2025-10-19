"use client";

import { useMemo, useState, useTransition } from "react";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, BarChart, Bar } from "recharts";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatRupiah, formatDateTime } from "@/lib/format";

import type { Analytics, OrderRow } from "../page";

const STATUS_COLORS: Record<OrderRow["status"], string> = {
  "waiting payment": "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  lunas: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
};

type DashboardViewProps = {
  orders: OrderRow[];
  analytics: Analytics;
};

type OrderFilter = "all" | "waiting payment" | "lunas";

export function DashboardView({ orders, analytics }: DashboardViewProps) {
  const [filteredStatus, setFilteredStatus] = useState<OrderFilter>("all");
  const [query, setQuery] = useState("");
  const [orderState, setOrderState] = useState(orders);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();

  const filteredOrders = useMemo(() => {
    return orderState.filter((order) => {
      const matchesStatus = filteredStatus === "all" || order.status === filteredStatus;
      const matchesQuery = query
        ? [order.user?.name, order.user?.email, order.id].some((value) =>
            value?.toLowerCase().includes(query.toLowerCase())
          )
        : true;
      return matchesStatus && matchesQuery;
    });
  }, [orderState, filteredStatus, query]);

  const handleStatusChange = (orderId: string, status: OrderRow["status"]) => {
    startTransition(async () => {
      setUpdatingId(orderId);
      try {
        const response = await fetch(`/api/admin/orders/${orderId}/status`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status })
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Gagal memperbarui status");
        }
        setOrderState((prev) =>
          prev.map((order) => (order.id === orderId ? { ...order, status } : order))
        );
        toast({ title: "Status diperbarui" });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Gagal", description: error?.message ?? "Tidak dapat memperbarui status", variant: "destructive" });
      } finally {
        setUpdatingId(null);
      }
    });
  };

  return (
    <div className="space-y-8 p-6">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardDescription>Total Order</CardDescription>
            <CardTitle className="text-3xl">{analytics.stats.totalOrders}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Total Revenue</CardDescription>
            <CardTitle className="text-3xl">{formatRupiah(analytics.stats.totalRevenue)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>Sudah Lunas</CardDescription>
            <CardTitle className="text-3xl">{analytics.stats.paidCount}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader>
            <CardDescription>% Pembayaran</CardDescription>
            <CardTitle className="text-3xl">{analytics.stats.paidPercentage}%</CardTitle>
          </CardHeader>
        </Card>
      </section>

      <section className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Omset Harian</CardTitle>
            <CardDescription>Trend per hari</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={analytics.daily}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("id-ID", { day: "2-digit", month: "short" })}
                />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => formatRupiah(value)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString("id-ID")}
                />
                <Line type="monotone" dataKey="total" stroke="#2563eb" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Omset Bulanan</CardTitle>
            <CardDescription>Ringkasan bulanan</CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={analytics.monthly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => new Date(value).toLocaleDateString("id-ID", { month: "short", year: "2-digit" })}
                />
                <YAxis tickFormatter={(value) => `${value / 1000}k`} />
                <Tooltip
                  formatter={(value: number) => formatRupiah(value)}
                  labelFormatter={(label) => new Date(label).toLocaleDateString("id-ID", { month: "long", year: "numeric" })}
                />
                <Bar dataKey="total" fill="#16a34a" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </section>

      <Card>
        <CardHeader>
          <CardTitle>Daftar Order</CardTitle>
          <CardDescription>Pantau dan kelola status order pelanggan</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <Input
              placeholder="Cari nama, email, atau ID order"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="md:max-w-sm"
            />
            <Select value={filteredStatus} onValueChange={(value: OrderFilter) => setFilteredStatus(value)}>
              <SelectTrigger className="w-full md:w-48">
                <SelectValue placeholder="Filter status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Semua</SelectItem>
                <SelectItem value="waiting payment">Menunggu Pembayaran</SelectItem>
                <SelectItem value="lunas">Lunas</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Pelanggan</TableHead>
                  <TableHead>Produk</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className="font-mono text-xs">{order.id}</TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{order.user?.name ?? "Pengguna"}</p>
                        <p className="text-xs text-muted-foreground">{order.user?.email ?? "-"}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDateTime(order.createdAt)}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell className="space-y-1">
                      {order.items.map((item) => (
                        <p key={`${order.id}-${item.name}`} className="text-xs">
                          {item.name} × {item.quantity}
                        </p>
                      ))}
                    </TableCell>
                    <TableCell className="font-semibold">{formatRupiah(order.total)}</TableCell>
                    <TableCell>
                      <Badge className={STATUS_COLORS[order.status]}>{order.status}</Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={order.status}
                        onValueChange={(value: OrderRow["status"]) => handleStatusChange(order.id, value)}
                        disabled={updatingId === order.id || isPending}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="waiting payment">Waiting payment</SelectItem>
                          <SelectItem value="lunas">Lunas</SelectItem>
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {filteredOrders.length === 0 ? (
            <p className="text-sm text-muted-foreground">Belum ada order sesuai filter.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
