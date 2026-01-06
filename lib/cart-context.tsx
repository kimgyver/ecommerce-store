"use client";

import {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect
} from "react";
import { useSession } from "next-auth/react";

export interface CartItem {
  id: string;
  name: string;
  price: number;
  basePrice?: number; // Original price before B2B discount
  quantity: number;
  image: string;
}

export interface CartError {
  itemId: string;
  message: string;
  maxAvailable?: number;
}

interface CartContextType {
  items: CartItem[];
  addToCart: (item: CartItem) => Promise<void>;
  removeFromCart: (id: string) => Promise<void>;
  updateQuantity: (id: string, quantity: number) => Promise<void>;
  clearCart: () => Promise<void>;
  getTotalPrice: () => number;
  isLoading: boolean;
  error: CartError | null;
  clearError: () => void;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<CartError | null>(null);
  const { data: session } = useSession();

  // Load cart from server (member) or from localStorage (guest) on mount or session change
  useEffect(() => {
    if (session?.user?.id) {
      loadCart();
    } else {
      // Guest: Load cart from localStorage
      const localCart = localStorage.getItem("guest_cart");
      if (localCart) {
        setItems(JSON.parse(localCart));
      } else {
        setItems([]);
      }
    }
  }, [session]);

  const loadCart = async () => {
    if (!session?.user?.id) return;
    try {
      setIsLoading(true);
      setError(null); // Clear error when loading cart
      const response = await fetch("/api/cart");
      if (response.ok) {
        const data = await response.json();
        setItems(data.items || []);
      }
    } catch (error) {
      console.error("Failed to load cart:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const addToCart = async (newItem: CartItem) => {
    setIsLoading(true);
    if (!session?.user?.id) {
      // Guest: Save to localStorage
      setItems(prev => {
        const exists = prev.find(item => item.id === newItem.id);
        let updated;
        if (exists) {
          updated = prev.map(item =>
            item.id === newItem.id
              ? { ...item, quantity: item.quantity + newItem.quantity }
              : item
          );
        } else {
          updated = [...prev, newItem];
        }
        localStorage.setItem("guest_cart", JSON.stringify(updated));
        return updated;
      });
      setIsLoading(false);
      return;
    }
    // Member: Use server API
    try {
      const response = await fetch("/api/cart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: newItem.id,
          quantity: newItem.quantity
        })
      });
      if (response.ok) {
        await loadCart();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to add to cart");
      }
    } catch (error) {
      console.error("Add to cart failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const removeFromCart = async (id: string) => {
    setIsLoading(true);
    if (!session?.user?.id) {
      // Guest: Remove from localStorage
      setItems(prev => {
        const updated = prev.filter(item => item.id !== id);
        localStorage.setItem("guest_cart", JSON.stringify(updated));
        return updated;
      });
      setIsLoading(false);
      return;
    }
    // Member: Use server API
    try {
      const response = await fetch(`/api/cart/${id}`, {
        method: "DELETE"
      });
      if (response.ok) {
        await loadCart();
      } else {
        const error = await response.json();
        throw new Error(error.error || "Failed to remove item");
      }
    } catch (error) {
      console.error("Remove from cart failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuantity = async (id: string, quantity: number) => {
    setIsLoading(true);
    if (!session?.user?.id) {
      // Guest: Update quantity in localStorage
      setItems(prev => {
        let updated;
        if (quantity <= 0) {
          updated = prev.filter(item => item.id !== id);
        } else {
          updated = prev.map(item =>
            item.id === id ? { ...item, quantity } : item
          );
        }
        localStorage.setItem("guest_cart", JSON.stringify(updated));
        return updated;
      });
      setIsLoading(false);
      return;
    }
    // Member: Use server API
    try {
      // Optimistic update - update UI immediately
      if (quantity <= 0) {
        setItems(items.filter(item => item.id !== id));
      } else {
        setItems(
          items.map(item => (item.id === id ? { ...item, quantity } : item))
        );
      }
      if (quantity <= 0) {
        await removeFromCart(id);
        return;
      }
      const response = await fetch(`/api/cart/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ quantity })
      });
      if (response.ok) {
        // Reload cart to get updated prices (especially for B2B quantity-based pricing)
        await loadCart();
      } else {
        const errorData = await response.json();
        // Revert on error and set error state
        await loadCart();
        // Set error state for UI to display
        const errorMsg = errorData.error || "Failed to update quantity";
        setError({
          itemId: id,
          message: errorMsg,
          maxAvailable: errorData.maxAvailable
        });
        console.warn(`Stock limit: ${errorMsg}`);
      }
    } catch (error) {
      console.error("Update quantity failed:", error);
      // Reload cart on error (but don't throw - let UI handle gracefully)
      await loadCart();
    } finally {
      setIsLoading(false);
    }
  };

  const clearCart = async () => {
    setIsLoading(true);
    if (!session?.user?.id) {
      // Guest: Remove all items from localStorage
      localStorage.removeItem("guest_cart");
      setItems([]);
      setIsLoading(false);
      return;
    }
    // Member: Use server API
    try {
      // Delete all items
      for (const item of items) {
        await fetch(`/api/cart/${item.id}`, {
          method: "DELETE"
        });
      }
      setItems([]);
    } catch (error) {
      console.error("Clear cart failed:", error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const getTotalPrice = () => {
    return items.reduce((total, item) => total + item.price * item.quantity, 0);
  };

  const clearError = () => {
    setError(null);
  };

  return (
    <CartContext.Provider
      value={{
        items,
        addToCart,
        removeFromCart,
        updateQuantity,
        clearCart,
        getTotalPrice,
        isLoading,
        error,
        clearError
      }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error("useCart must be used within CartProvider");
  }
  return context;
}
