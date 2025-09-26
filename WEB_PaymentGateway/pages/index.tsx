import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
  Gamepad2,
  Minus,
  Plus,
  ShoppingCart,
  Trash2,
  Zap
} from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger
} from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { useCart } from "@/contexts/CartContext";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";

type Product = {
  _id: string;
  game: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  image?: string;
  active: boolean;
};

type FetchState = "idle" | "loading" | "error" | "success";

type CartPanelProps = {
  onCheckout: () => void;
};

const gameTabs = [
  { value: "mobile legends", label: "Mobile Legends" },
  { value: "pubg mobile", label: "PUBG Mobile" },
  { value: "roblox", label: "Roblox" }
];

function CartPanel({ onCheckout }: CartPanelProps) {
  const { items, subtotal, updateQty, removeItem, ready } = useCart();
  const { toast } = useToast();
  const fee = subtotal > 0 ? 2000 : 0;
  const total = subtotal + fee;

  const handleRemove = (productId: string) => {
    removeItem(productId);
    toast({ title: "Item dihapus", description: "Produk dihapus dari cart" });
  };

  return (
    <Card className="bg-gradient-to-b from-secondary/40 to-secondary/10">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl">Keranjang</CardTitle>
          <p className="text-sm text-muted-foreground">Kelola item sebelum checkout</p>
        </div>
        <ShoppingCart className="h-6 w-6 text-primary" />
      </CardHeader>
      <CardContent className="space-y-4">
        {!ready && (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        )}
        {ready && items.length === 0 && (
          <div className="rounded-lg border border-dashed border-muted bg-background/50 p-6 text-center text-sm text-muted-foreground">
            Belum ada item. Pilih varian top up untuk memulai.
          </div>
        )}
        {ready && items.length > 0 && (
          <div className="space-y-4">
            {items.map(item => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-lg border border-border bg-background/40 p-3"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="uppercase tracking-wide">
                      {item.game}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {formatCurrency(item.price)}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button size="icon" variant="ghost">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Hapus item</AlertDialogTitle>
                        <AlertDialogDescription>
                          Item akan dihapus dari keranjang.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel asChild>
                          <Button variant="ghost">Batal</Button>
                        </AlertDialogCancel>
                        <AlertDialogAction asChild>
                          <Button variant="destructive" onClick={() => handleRemove(item.productId)}>
                            Hapus
                          </Button>
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
      <CardFooter className="flex-col gap-4">
        <div className="w-full space-y-2 text-sm">
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
        <Button className="w-full" onClick={onCheckout} disabled={!ready || items.length === 0}>
          Lanjut checkout
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const [state, setState] = useState<FetchState>("idle");
  const [products, setProducts] = useState<Product[]>([]);
  const [activeGame, setActiveGame] = useState<string>(gameTabs[0].value);

  useEffect(() => {
    let aborted = false;
    const loadProducts = async () => {
      setState("loading");
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Gagal memuat produk");
        }
        const json = await response.json();
        if (!aborted) {
          setProducts(json.data as Product[]);
          setState("success");
        }
      } catch (error) {
        if (!aborted) {
          console.error(error);
          setState("error");
          toast({ title: "Gagal memuat produk", description: "Silakan coba lagi." });
        }
      }
    };
    loadProducts();
    return () => {
      aborted = true;
    };
  }, [toast]);

  const filteredProducts = useMemo(
    () =>
      products.filter(product => product.active && product.game === activeGame),
    [products, activeGame]
  );

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  const handleAdd = (product: Product) => {
    addItem({
      productId: product._id,
      name: product.name,
      game: product.game,
      price: product.price,
      image: product.image,
      qty: 1
    });
    toast({ title: "Ditambahkan", description: `${product.name} masuk ke keranjang` });
  };

  const handleCheckout = () => {
    router.push("/checkout");
  };

  return (
    <>
      <Head>
        <title>Malik Gaming Store</title>
        <meta name="description" content="Top up cepat untuk Mobile Legends, PUBG Mobile, dan Roblox" />
      </Head>
      <div className="min-h-screen bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840]">
        <div className="container mx-auto px-4 py-10">
          <header className="flex flex-col gap-6 border-b border-white/10 pb-10 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <div className="grid h-12 w-12 place-items-center rounded-xl bg-primary/20 text-primary">
                <Gamepad2 className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-3xl font-bold md:text-4xl">malik gaming store</h1>
                <p className="text-sm text-muted-foreground">
                  Pilih paket top up favorit untuk Mobile Legends, PUBG Mobile, dan Roblox
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Sheet>
                <SheetTrigger asChild>
                  <Button variant="secondary" className="flex items-center gap-2 md:hidden">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Keranjang</span>
                    {totalItems > 0 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {totalItems}
                      </span>
                    )}
                  </Button>
                </SheetTrigger>
                <SheetContent side="right">
                  <SheetHeader>
                    <SheetTitle>Keranjang</SheetTitle>
                  </SheetHeader>
                  <div className="pt-6">
                    <CartPanel onCheckout={handleCheckout} />
                  </div>
                </SheetContent>
              </Sheet>

              <HoverCard openDelay={120} closeDelay={120}>
                <HoverCardTrigger asChild>
                  <Button variant="secondary" className="hidden md:flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" />
                    <span>Keranjang</span>
                    {totalItems > 0 && (
                      <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                        {totalItems}
                      </span>
                    )}
                  </Button>
                </HoverCardTrigger>
                <HoverCardContent align="end" className="w-[380px] p-0">
                  <CartPanel onCheckout={handleCheckout} />
                </HoverCardContent>
              </HoverCard>
            </div>

          </header>
          <main className="mt-10">
            <section className="space-y-6">
              <Tabs value={activeGame} onValueChange={setActiveGame}>
                <TabsList className="flex w-full flex-wrap gap-2 bg-white/5 p-2">
                  {gameTabs.map(tab => (
                    <TabsTrigger key={tab.value} value={tab.value} className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
                      {tab.label}
                    </TabsTrigger>
                  ))}
                </TabsList>
                {gameTabs.map(tab => (
                  <TabsContent key={tab.value} value={tab.value}>
                    {state === "loading" && (
                      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {[...Array(6)].map((_, index) => (
                          <Card key={index} className="border-border/40 bg-background/40">
                            <CardHeader className="space-y-3">
                              <Skeleton className="h-5 w-2/3" />
                              <Skeleton className="h-4 w-1/3" />
                              <Skeleton className="h-8 w-full" />
                            </CardHeader>
                          </Card>
                        ))}
                      </div>
                    )}
                    {state === "error" && (
                      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive-foreground">
                        Gagal memuat produk. Silakan muat ulang halaman.
                      </div>
                    )}
                    {state === "success" && filteredProducts.length === 0 && (
                      <div className="rounded-lg border border-dashed border-primary/40 bg-background/40 p-10 text-center text-sm text-muted-foreground">
                        Varian belum tersedia untuk kategori ini.
                      </div>
                    )}
                    {state === "success" && filteredProducts.length > 0 && (
                      <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredProducts.map(product => (
                          <Card key={product._id} className="group border-border/40 bg-background/60 backdrop-blur">
                            <CardHeader>
                              <div className="flex items-center justify-between">
                                <Badge variant="secondary" className="uppercase tracking-wide">
                                  {product.game}
                                </Badge>
                                <span className="text-xs text-muted-foreground">{product.sku}</span>
                              </div>
                              <CardTitle className="text-xl">{product.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              <p className="text-sm text-muted-foreground">{formatCurrency(product.price)}</p>
                              <p className="text-xs text-muted-foreground">
                                Instant delivery dengan bukti invoice Xendit resmi.
                              </p>
                            </CardContent>
                            <CardFooter>
                              <Button className="w-full" onClick={() => handleAdd(product)}>
                                Tambah ke keranjang
                              </Button>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    )}
                  </TabsContent>
                ))}
              </Tabs>
            </section>
          </main>
        </div>
      </div>
    </>
  );
}

