"use client";

import Head from "next/head";
import { useRouter } from "next/router";
import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  Coins,
  Gamepad2,
  LogIn,
  LogOut,
  MessagesSquare,
  Minus,
  Plus,
  Rocket,
  Shield,
  ShoppingCart,
  Sparkles,
  Trash2,
  Trophy,
  User,
  UserPlus,
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
import { useAuth } from "@/contexts/AuthContext";
import { formatCurrency } from "@/lib/utils";
import { useToast } from "@/components/ui/use-toast";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from "@/components/ui/dropdown-menu";
import { SandboxNoticeToast } from "@/components/whatsapp-sandbox-notice";
import PromoCarousel from "@/components/PromoCarousel"; 

type Product = {
  _id: string;
  game: string;
  name: string;
  sku: string;
  price: number;
  currency: string;
  active: boolean;
};

type FetchState = "idle" | "loading" | "error" | "success";

type CartPanelProps = {
  onCheckout: () => void;
};

type GameTab = {
  value: string;
  label: string;
  img: string; 
  mode?: "grayscale" | "white";
};

const gameTabs: GameTab[] = [
  {
    value: "mobile legends",
    label: "Mobile Legends",
    img: "/mole.png",
    mode: "white",
  },
  {
    value: "pubg mobile",
    label: "PUBG Mobile",
    img: "/pubg.png",
    mode: "white",
  },
  {
    value: "roblox",
    label: "Roblox",
    img: "/roblox.png",
    mode: "white",
  },
];

const statHighlights = [
  { icon: Sparkles, label: "Member Aktif", value: "12K+" },
  { icon: Gamepad2, label: "Game Support", value: "3+" },
  { icon: Shield, label: "Keamanan Transaksi", value: "100%" }
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
    <Card className="border z-50 border-white/10 bg-white/5 text-foreground shadow-[0_12px_32px_rgba(10,15,45,0.35)] backdrop-blur-sm">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-xl font-semibold">Keranjang</CardTitle>
          <p className="text-sm text-muted-foreground">Kelola item sebelum checkout</p>
        </div>
        <div className="rounded-3xl bg-primary/10 p-2 text-primary">
          <ShoppingCart className="h-5 w-5" />
        </div>
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
          <div className="flex flex-col items-center gap-3 rounded-3xl border border-dashed border-white/15 bg-black/30 p-6 text-center text-sm text-muted-foreground">
            <span>Belum ada item. Pilih varian top up untuk memulai.</span>
          </div>
        )}
        {ready && items.length > 0 && (
          <div className="space-y-4">
            {items.map(item => (
              <div
                key={item.productId}
                className="flex items-center justify-between rounded-3xl border border-white/10 bg-black/30 px-5 py-5 transition-colors duration-200 hover:border-primary/40 hover:bg-primary/10"
              >
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-foreground">{item.name}</p>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="rounded-3xl bg-primary/10 px-2 py-0.5 text-[11px] font-medium uppercase tracking-wide text-primary">
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
                    className="rounded-3xl bg-white/10 text-foreground transition hover:bg-primary/20 hover:text-primary"
                    onClick={() => updateQty(item.productId, item.qty - 1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-6 text-center text-sm font-semibold">{item.qty}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="rounded-3xl bg-white/10 text-foreground transition hover:bg-primary/20 hover:text-primary"
                    onClick={() => updateQty(item.productId, item.qty + 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="rounded-3xl bg-white/10 text-foreground transition hover:bg-destructive/20 hover:text-destructive"
                      >
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
      <CardFooter className="relative flex-col gap-4">
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
        <Button
          className="w-full bg-primary/90 text-primary-foreground shadow-lg transition hover:bg-primary"
          onClick={onCheckout}
          disabled={!ready || items.length === 0}
        >
          <span className="flex items-center justify-center gap-2 text-sm font-semibold uppercase tracking-wide">
            <Rocket className="h-4 w-4" />
            Lanjut checkout
          </span>
        </Button>
      </CardFooter>
    </Card>
  );
}

export default function HomePage() {
  const router = useRouter();
  const { addItem, items } = useCart();
  const { toast } = useToast();
  const { user, ensureAuthenticated, openLoginModal, openRegisterModal, logout } = useAuth();
  const [state, setState] = useState<FetchState>("idle");
  const [products, setProducts] = useState<Product[]>([]);
  const [activeGame, setActiveGame] = useState<string>(gameTabs[0].value);
  const [sandboxNoticeOpen, setSandboxNoticeOpen] = useState(false);
  const formattedWhatsAppNumber = "+62 851-2130-8836";
  const WA_CHAT_URL = "https://wa.me/message/XVBGCTS22UWMJ1";
  const SESSION_COOKIE_NAME = "session_token";

  function hasSessionCookie(): boolean {
    if (typeof document === "undefined") {
      return false;
    }
    try {
      return document.cookie
        .split(";")
        .map(cookie => cookie.trim())
        .some(cookie => {
          if (!cookie) return false;
          const [name, value] = cookie.split("=");
          return name === SESSION_COOKIE_NAME && Boolean(value);
        });
    } catch {
      return false;
    }
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!hasSessionCookie()) {
        setSandboxNoticeOpen(true);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, []);

  const tryCloseSandbox = () => {
    setSandboxNoticeOpen(false);
  };

  const handleOpenWhatsApp = () => {
    window.open(WA_CHAT_URL, "_blank", "noopener,noreferrer");
    setSandboxNoticeOpen(false);
  };

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

  useEffect(() => {
    if (sandboxNoticeOpen && hasSessionCookie()) {
      setSandboxNoticeOpen(false);
    }
  }, [sandboxNoticeOpen, user]);

  const filteredProducts = useMemo(
    () =>
      products.filter(product => product.active && product.game === activeGame),
    [products, activeGame]
  );

  const totalItems = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);

  const handleAdd = (product: Product) => {
    const addToCart = () => {
      addItem({
        productId: product._id,
        name: product.name,
        game: product.game,
        price: product.price,
        qty: 1
      });
      toast({ title: "Ditambahkan", description: `${product.name} masuk ke keranjang` });
    };
    ensureAuthenticated(addToCart);
  };

  const handleCheckout = () => {
    ensureAuthenticated(() => {
      if (items.length === 0) {
        toast({ title: "Keranjang kosong", description: "Tambahkan produk sebelum checkout." });
        return;
      }
      router.push("/checkout");
    });
  };

  const slides = [
    {
      id: "security",
      title: "Keamanan Premium",
      description:
        "Checkout dilindungi enkripsi Xendit + fraud detection real-time & monitoring nonstop.",
      icon: Shield,
      cta: { label: "Mulai Top-up", onClick: handleCheckout },
    },
    {
      id: "wa-sandbox",
      title: "Aktifkan Notifikasi WhatsApp",
      description:
        "Kirim chat ke nomor kami sekali saja agar OTP & update order bisa terkirim otomatis.",
      icon: MessagesSquare,
      cta: { label: "Chat WhatsApp", onClick: handleOpenWhatsApp },
    },
  ];

  return (
    <>
      <Head>
        <title>Malik Gaming Store</title>
        <meta name="description" content="Top up cepat untuk Mobile Legends, PUBG Mobile, dan Roblox" />
      </Head>
      <SandboxNoticeToast
        open={sandboxNoticeOpen}
        onClose={tryCloseSandbox}
        onAction={handleOpenWhatsApp}
        displayNumber={formattedWhatsAppNumber}
        lockUntilAction
      />
      <div className="min-h-screen bg-gradient-to-br from-[#070717] via-[#10102a] to-[#1a1840]">
        <div className="container mx-auto px-3 sm:px-4 py-8 sm:py-10">
          <header className="relative z-[20]">
            <div className="neon-border-shell relative rounded-3xl p-8 shadow-[0_18px_40px_rgba(10,15,45,0.35)] bg-[cornflowerblue] backdrop-blur">
              <div className="neon-border-frame pointer-events-none" aria-hidden="true" />
              <div className="relative z-10 flex flex-col gap-8 md:flex-row md:items-center items-end md:justify-between">
              <div className="max-w-2xl space-y-6">
                <span className="inline-flex items-center gap-2 self-start rounded-3xl border border-white/10 bg-black/20 px-4 py-1 text-xs font-semibold uppercase tracking-wider text-primary">
                  <Zap className="h-4 w-4" />
                  Top-up #1 untuk player kompetitif
                </span>
                <div className="flex gap-5 flex-row md:items-center">
                  <div className="grid place-items-center rounded-3xl bg-primary/10 text-primary p-4 shrink-0">
                    <div className="h-14 w-14 md:h-22 md:w-22 aspect-square">
                      <img
                        src="/icon.png"
                        alt="Malik Gaming Store Logo"
                        className="h-full w-full object-contain"
                        loading="lazy"
                      />
                    </div>
                  </div>

                  <div className="min-w-0">
                    <h1 className="text-[clamp(1.75rem,4.5vw,2.75rem)] font-extrabold tracking-tight md:text-5xl">
                      Malik Gaming Store
                    </h1>
                    <p className="mt-2 text-sm sm:text-base text-muted-foreground">
                      Pilih paket top up favorit untuk Mobile Legends, PUBG Mobile, dan Roblox
                      dengan pengalaman neon yang cepat dan aman.
                    </p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3">
                  {statHighlights.map(stat => (
                    <div
                      key={stat.label}
                      className="flex items-center gap-3 rounded-3xl border border-white/10 bg-black/20 px-4 py-3"
                    >
                      <div className="flex h-10 w-10 items-center justify-center rounded-3xl bg-primary/10 text-primary shrink-0">
                        <stat.icon className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-base sm:text-lg font-semibold text-foreground leading-tight">{stat.value}</p>
                        <p className="text-[10px] sm:text-xs uppercase tracking-wide text-muted-foreground truncate">{stat.label}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex w-full max-w-sm flex-col items-start gap-5 md:items-end">
                <div className="flex w-full items-center justify-end gap-3">
                  <HoverCard openDelay={120} closeDelay={120}>
                    <HoverCardTrigger asChild>
                      <Button variant="default" className="items-center gap-2 flex" onClick={handleCheckout}>
                        <ShoppingCart className="h-4 w-4 shrink-0" />
                        <span>Keranjang</span>
                        {totalItems > 0 && (
                          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground leading-none">
                            {totalItems}
                          </span>
                        )}
                      </Button>
                    </HoverCardTrigger>
                    <HoverCardContent
                      align="end"
                      sideOffset={10}
                      alignOffset={-4}
                      className="z-50 p-0 w-[min(92vw,480px)]"
                    >
                      <CartPanel onCheckout={handleCheckout} />
                    </HoverCardContent>
                  </HoverCard>
                  <DropdownMenu modal={false}>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="default"
                        className="h-11 w-11 !p-0 rounded-3xl"
                        title={user ? user.name : "Masuk atau daftar"}
                      >
                        <User className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 p-2 z-50">
                      {user ? (
                        <>
                          <DropdownMenuLabel>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-foreground">{user.name}</span>
                              <span className="text-xs text-muted-foreground">{user.email}</span>
                            </div>
                          </DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={event => {
                              event.preventDefault();
                              void logout();
                            }}
                          >
                            <LogOut className="mr-2 h-4 w-4" />
                            Keluar
                          </DropdownMenuItem>
                        </>
                      ) : (
                        <>
                          <DropdownMenuLabel>Halo, Gamer!</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={event => {
                              event.preventDefault();
                              openLoginModal();
                            }}
                          >
                            <LogIn className="mr-2 h-4 w-4" />
                            Masuk
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={event => {
                              event.preventDefault();
                              openRegisterModal();
                            }}
                          >
                            <UserPlus className="mr-2 h-4 w-4" />
                            Daftar
                          </DropdownMenuItem>
                        </>
                      )}
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
                <PromoCarousel slides={slides} />
              </div>
            </div>
          </div>
          </header>
          <main className="mt-10 z-10 relative space-y-10">
            <section className="space-y-6">
              <Tabs value={activeGame} onValueChange={setActiveGame}>
                <TabsList className="flex h-auto w-full flex-wrap gap-2 rounded-3xl border backdrop-blur-xl border-primary/40 bg-black/30 text-foreground shadow-[0_10px_26px_rgba(10,15,45,0.3)] p-2">
                  {gameTabs.map(tab => (
                    <TabsTrigger
                      key={tab.value}
                      value={tab.value}
                      className="group flex items-center gap-2 rounded-3xl border border-transparent px-3 sm:px-4 py-2 text-xs sm:text-sm font-semibold uppercase tracking-wide text-muted-foreground transition-all hover:border-primary/40 hover:bg-primary/10 hover:text-primary data-[state=active]:border-primary/60 data-[state=active]:bg-primary/20 data-[state=active]:text-primary-foreground"
                    >
                      <span className="h-6 w-6 sm:h-7 sm:w-7 shrink-0">
                        <img
                          src={tab.img}
                          alt={`${tab.label} logo`}
                          className={[
                            "h-full w-full object-contain",
                            tab.mode === "white" ? "[filter:brightness(0)_invert(1)]" : "",
                            tab.mode === "grayscale" ? "grayscale" : "",
                            "group-hover:opacity-100 opacity-90",
                            "data-[state=active]:opacity-100",
                          ].join(" ")}
                          loading="lazy"
                          referrerPolicy="no-referrer"
                        />
                      </span>
                      <span className="truncate">{tab.label}</span>
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
                      <div className="rounded-3xl border border-destructive/50 bg-destructive/10 p-6 text-center text-sm text-destructive-foreground">
                        Gagal memuat produk. Silakan muat ulang halaman.
                      </div>
                    )}
                    {state === "success" && filteredProducts.length === 0 && (
                      <div className="rounded-3xl border border-dashed border-primary/40 bg-background/40 p-10 text-center text-sm text-muted-foreground">
                        Varian belum tersedia untuk kategori ini.
                      </div>
                    )}
                    {state === "success" && filteredProducts.length > 0 && (
                      <div className="grid gap-4 sm:gap-6 grid-cols-1 sm:grid-cols-2 xl:grid-cols-3">
                        {filteredProducts.map(product => (
                          <Card
                            key={product._id}
                            className="border border-white/10 bg-black/30 text-foreground shadow-[0_10px_26px_rgba(10,15,45,0.3)] transition hover:border-primary/40 hover:bg-primary/10"
                          >
                            <CardHeader className="space-y-4">
                              <div className="flex items-center justify-between">
                                <Badge
                                  variant="secondary"
                                  className="rounded-3xl bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary"
                                >
                                  {product.game}
                                </Badge>
                                <span className="rounded-3xl border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                                  {product.sku}
                                </span>
                              </div>
                              <CardTitle className="text-2xl font-semibold leading-tight text-foreground">{product.name}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                              <div className="flex items-center justify-between text-sm text-muted-foreground">
                                <span className="flex items-center gap-2 text-base font-semibold text-primary">
                                  <Coins className="h-4 w-4" />
                                  {formatCurrency(product.price)}
                                </span>
                                <span className="rounded-3xl border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-wide text-muted-foreground">
                                  Instant
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground">
                                Instant delivery dengan bukti invoice Xendit resmi dan dukungan CS 24/7.
                              </p>
                            </CardContent>
                            <CardFooter>
                              <Button
                                className="w-full rounded-3xl bg-primary/90 text-sm font-semibold uppercase tracking-wide text-primary-foreground shadow-lg transition hover:bg-primary"
                                onClick={() => handleAdd(product)}
                              >
                                <span className="flex items-center justify-center gap-2">
                                  Tambah ke keranjang
                                  <ShoppingCart className="h-4 w-4" />
                                </span>
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
