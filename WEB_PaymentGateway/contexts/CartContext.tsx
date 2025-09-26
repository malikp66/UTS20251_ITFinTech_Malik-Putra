import { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  productId: string;
  name: string;
  game: string;
  price: number;
  image?: string;
  qty: number;
};

type CartContextValue = {
  items: CartItem[];
  ready: boolean;
  addItem: (item: CartItem) => void;
  updateQty: (productId: string, qty: number) => void;
  removeItem: (productId: string) => void;
  clearCart: () => void;
  subtotal: number;
};

const STORAGE_KEY = "malik-gaming-store-cart";

const CartContext = createContext<CartContextValue | undefined>(undefined);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved) as CartItem[];
        setItems(parsed);
      } catch (error) {
        window.localStorage.removeItem(STORAGE_KEY);
      }
    }
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready || typeof window === "undefined") {
      return;
    }
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items, ready]);

  const addItem = (item: CartItem) => {
    setItems(prev => {
      const existing = prev.find(entry => entry.productId === item.productId);
      if (existing) {
        return prev.map(entry =>
          entry.productId === item.productId
            ? { ...entry, qty: entry.qty + item.qty }
            : entry
        );
      }
      return [...prev, item];
    });
  };

  const updateQty = (productId: string, qty: number) => {
    setItems(prev => {
      if (qty <= 0) {
        return prev.filter(entry => entry.productId !== productId);
      }
      return prev.map(entry =>
        entry.productId === productId ? { ...entry, qty } : entry
      );
    });
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(entry => entry.productId !== productId));
  };

  const clearCart = () => setItems([]);

  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);

  const value = useMemo(
    () => ({ items, ready, addItem, updateQty, removeItem, clearCart, subtotal }),
    [items, ready, subtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
