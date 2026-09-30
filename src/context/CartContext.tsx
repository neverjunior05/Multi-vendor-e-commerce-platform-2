"use client";

/**
 * CART CONTEXT
 * - Signed in: cart lives in Postgres (`/api/cart`) so it persists per user.
 * - Guest: cart lives in localStorage and is merged into the DB cart on login.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, apiErrorMessage } from "@/lib/api-client";
import { useAuth } from "@/context/AuthContext";
import type { ApiCart, ApiCartItem } from "@/lib/types";

const GUEST_KEY = "bazaario_guest_cart";

type GuestLine = { productId: number; quantity: number };

type CartState = {
  items: ApiCartItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  count: number;
  vendorCount: number;
  loading: boolean;
  error: string | null;
  add: (productId: number, quantity?: number) => Promise<void>;
  setQuantity: (productId: number, quantity: number) => Promise<void>;
  remove: (productId: number) => Promise<void>;
  clear: () => Promise<void>;
  reload: () => Promise<void>;
};

const CartContext = createContext<CartState | null>(null);

const EMPTY: ApiCart = {
  id: 0,
  items: [],
  subtotalCents: 0,
  shippingCents: 0,
  totalCents: 0,
  vendorCount: 0,
};

function readGuestCart(): GuestLine[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(window.localStorage.getItem(GUEST_KEY) ?? "[]") as GuestLine[];
  } catch {
    return [];
  }
}

function writeGuestCart(lines: GuestLine[]) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(GUEST_KEY, JSON.stringify(lines));
}

function cartFromLines(lines: GuestLine[]): ApiCart {
  const total = lines.reduce((sum, line) => sum + line.quantity, 0);
  return { ...EMPTY, items: [], totalCents: total * 100, vendorCount: lines.length };
}

export function CartProvider({ children }: { children: ReactNode }) {
  const { user, ready } = useAuth();
  const [cart, setCart] = useState<ApiCart>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const apply = useCallback((next: ApiCart | null | undefined) => {
    setCart(next ?? EMPTY);
  }, []);

  const reload = useCallback(async () => {
    if (!user) {
      // Guest: we cannot price the cart without product rows, so show counts only.
      const lines = readGuestCart();
      setCart(cartFromLines(lines));
      return;
    }
    setLoading(true);
    try {
      const { data } = await api.get<{ cart: ApiCart }>("/cart");
      apply(data.cart);
      setError(null);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [user, apply]);

  // Load on session change; merge the guest cart once we know who the user is.
  useEffect(() => {
    if (!ready) return;
    if (!user) {
      setCart(cartFromLines(readGuestCart()));
      return;
    }
    const guest = readGuestCart();
    const run = async () => {
      if (guest.length > 0) {
        try {
          const { data } = await api.post<{ cart: ApiCart }>("/cart", { merge: guest });
          apply(data.cart);
          writeGuestCart([]);
          return;
        } catch {
          /* fall through to a normal reload */
        }
      }
      await reload();
    };
    void run();
  }, [ready, user, reload, apply]);

  const add = useCallback(
    async (productId: number, quantity = 1) => {
      if (!user) {
        const lines = readGuestCart();
        const existing = lines.find((line) => line.productId === productId);
        if (existing) existing.quantity = Math.min(existing.quantity + quantity, 20);
        else lines.push({ productId, quantity });
        writeGuestCart(lines);
        setCart(cartFromLines(lines));
        return;
      }
      setLoading(true);
      try {
        const { data } = await api.post<{ cart: ApiCart }>("/cart", { productId, quantity });
        apply(data.cart);
        setError(null);
      } catch (err) {
        setError(apiErrorMessage(err));
        throw new Error(apiErrorMessage(err));
      } finally {
        setLoading(false);
      }
    },
    [user, apply],
  );

  const setQuantity = useCallback(
    async (productId: number, quantity: number) => {
      if (!user) {
        const lines = readGuestCart()
          .map((line) => (line.productId === productId ? { ...line, quantity } : line))
          .filter((line) => line.quantity > 0);
        writeGuestCart(lines);
        setCart(cartFromLines(lines));
        return;
      }
      const { data } = await api.patch<{ cart: ApiCart }>("/cart", { productId, quantity });
      apply(data.cart);
    },
    [user, apply],
  );

  const remove = useCallback(
    async (productId: number) => {
      if (!user) {
        const lines = readGuestCart().filter((line) => line.productId !== productId);
        writeGuestCart(lines);
        setCart(cartFromLines(lines));
        return;
      }
      const { data } = await api.delete<{ cart: ApiCart }>(`/cart?productId=${productId}`);
      apply(data.cart);
    },
    [user, apply],
  );

  const clear = useCallback(async () => {
    if (!user) {
      writeGuestCart([]);
      setCart(EMPTY);
      return;
    }
    const { data } = await api.delete<{ cart: ApiCart }>("/cart");
    apply(data.cart);
  }, [user, apply]);

  const value = useMemo<CartState>(
    () => ({
      items: cart.items,
      subtotalCents: cart.subtotalCents,
      shippingCents: cart.shippingCents,
      totalCents: cart.totalCents,
      vendorCount: cart.vendorCount,
      count: cart.items.reduce((sum, item) => sum + item.quantity, 0),
      loading,
      error,
      add,
      setQuantity,
      remove,
      clear,
      reload,
    }),
    [cart, loading, error, add, setQuantity, remove, clear, reload],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartState {
  const context = useContext(CartContext);
  if (!context) throw new Error("useCart must be used inside <CartProvider>");
  return context;
}
