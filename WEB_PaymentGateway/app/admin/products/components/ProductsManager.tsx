"use client";

import { useEffect, useState, useTransition } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { formatDate } from "@/lib/format";
import { zodResolver } from "@/lib/zod-resolver";

import type { ProductRow } from "../page";

const productSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  price: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  description: z.string().optional(),
  stock: z.coerce.number().int().min(0, "Stok tidak boleh negatif"),
  image: z
    .string()
    .optional()
    .transform((value) => value?.trim() ?? "")
    .refine((value) => value === "" || /^https?:\/\//.test(value), {
      message: "URL gambar harus valid"
    })
});

type FormValues = z.infer<typeof productSchema>;

type DialogMode = "create" | "edit";

type ProductsManagerProps = {
  products: ProductRow[];
};

export function ProductsManager({ products }: ProductsManagerProps) {
  const [items, setItems] = useState(products);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mode, setMode] = useState<DialogMode>("create");
  const [selected, setSelected] = useState<ProductRow | null>(null);
  const [isPending, startTransition] = useTransition();
  const { toast } = useToast();
  const form = useForm<FormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: { name: "", price: 0, description: "", stock: 0, image: "" }
  });

  useEffect(() => {
    if (selected) {
      form.reset({
        name: selected.name,
        price: selected.price,
        description: selected.description,
        stock: selected.stock,
        image: selected.image ?? ""
      });
    } else {
      form.reset({ name: "", price: 0, description: "", stock: 0, image: "" });
    }
  }, [selected, form]);

  const openCreateDialog = () => {
    setMode("create");
    setSelected(null);
    setDialogOpen(true);
  };

  const openEditDialog = (product: ProductRow) => {
    setMode("edit");
    setSelected(product);
    setDialogOpen(true);
  };

  const handleSubmit = (values: FormValues) => {
    startTransition(async () => {
      try {
        const endpoint = mode === "create" ? "/api/admin/products" : `/api/admin/products/${selected?.id}`;
        const method = mode === "create" ? "POST" : "PATCH";
        const response = await fetch(endpoint, {
          method,
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values)
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Gagal menyimpan produk");
        }
        const data = await response.json();
        const product: ProductRow = {
          ...data.product,
          createdAt: data.product.createdAt,
          updatedAt: data.product.updatedAt
        };
        setItems((prev) => {
          if (mode === "create") {
            return [product, ...prev];
          }
          return prev.map((item) => (item.id === product.id ? product : item));
        });
        toast({ title: mode === "create" ? "Produk ditambahkan" : "Produk diperbarui" });
        setDialogOpen(false);
        setSelected(null);
      } catch (error: any) {
        console.error(error);
        toast({ title: "Gagal", description: error?.message ?? "Terjadi kesalahan", variant: "destructive" });
      }
    });
  };

  const handleDelete = (product: ProductRow) => {
    const confirmed = window.confirm(`Hapus produk ${product.name}?`);
    if (!confirmed) return;
    startTransition(async () => {
      try {
        const response = await fetch(`/api/admin/products/${product.id}`, {
          method: "DELETE"
        });
        if (!response.ok) {
          const payload = await response.json().catch(() => null);
          throw new Error(payload?.error ?? "Gagal menghapus produk");
        }
        setItems((prev) => prev.filter((item) => item.id !== product.id));
        toast({ title: "Produk dihapus" });
      } catch (error: any) {
        console.error(error);
        toast({ title: "Gagal", description: error?.message ?? "Tidak dapat menghapus", variant: "destructive" });
      }
    });
  };

  return (
    <div className="space-y-6 p-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <div className="space-y-1">
            <CardTitle>Produk</CardTitle>
            <CardDescription>Kelola katalog produk yang tampil pada toko.</CardDescription>
          </div>
          <Button onClick={openCreateDialog}>Tambah Produk</Button>
        </CardHeader>
        <CardContent>
          <div className="overflow-hidden rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nama</TableHead>
                  <TableHead>Harga</TableHead>
                  <TableHead>Stok</TableHead>
                  <TableHead>Pembaruan</TableHead>
                  <TableHead>Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{product.name}</p>
                        <p className="text-xs text-muted-foreground">{product.description || "-"}</p>
                      </div>
                    </TableCell>
                    <TableCell>{new Intl.NumberFormat("id-ID").format(product.price)}</TableCell>
                    <TableCell>
                      <Badge variant={product.stock > 0 ? "default" : "destructive"}>{product.stock}</Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(product.updatedAt)}
                    </TableCell>
                    <TableCell className="space-x-2">
                      <Button size="sm" variant="outline" onClick={() => openEditDialog(product)}>
                        Edit
                      </Button>
                      <Button size="sm" variant="destructive" onClick={() => handleDelete(product)}>
                        Hapus
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          {items.length === 0 ? <p className="mt-4 text-sm text-muted-foreground">Belum ada produk.</p> : null}
        </CardContent>
      </Card>

      <Dialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) {
            setSelected(null);
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{mode === "create" ? "Tambah Produk" : `Edit ${selected?.name}`}</DialogTitle>
          </DialogHeader>
          <Form form={form} onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Nama produk" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="price"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="stock"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Stok</FormLabel>
                  <FormControl>
                    <Input {...field} type="number" min={0} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="image"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Gambar</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="https://..." />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Deskripsi</FormLabel>
                  <FormControl>
                    <Input {...field} placeholder="Deskripsi singkat" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Batal
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? "Menyimpan..." : "Simpan"}
              </Button>
            </DialogFooter>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
