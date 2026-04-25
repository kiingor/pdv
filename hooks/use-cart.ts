"use client";

import { useCallback, useMemo, useReducer } from "react";
import type { Id } from "@/convex/_generated/dataModel";
import type { PaymentMethod } from "@/lib/constants";

export type CartItem = {
  productId: Id<"products">;
  name: string;
  photoUrl: string | null;
  unitPriceCents: number;
  quantity: number;
  /** Estoque disponível no momento da adição. Null/undefined = ilimitado. */
  stockQuantity?: number;
};

export type CartState = {
  items: CartItem[];
  customerId: Id<"customers"> | null;
  customerName: string | null;
  paymentMethod: PaymentMethod | null;
  notes: string;
};

type Action =
  | {
      type: "ADD_PRODUCT";
      payload: {
        productId: Id<"products">;
        name: string;
        photoUrl: string | null;
        unitPriceCents: number;
        stockQuantity?: number;
        quantity?: number;
      };
    }
  | { type: "REMOVE_ITEM"; payload: { productId: Id<"products"> } }
  | { type: "INCREASE_QTY"; payload: { productId: Id<"products"> } }
  | { type: "DECREASE_QTY"; payload: { productId: Id<"products"> } }
  | {
      type: "SET_QTY";
      payload: { productId: Id<"products">; quantity: number };
    }
  | {
      type: "SET_UNIT_PRICE";
      payload: { productId: Id<"products">; unitPriceCents: number };
    }
  | {
      type: "SET_CUSTOMER";
      payload: { customerId: Id<"customers">; customerName: string };
    }
  | { type: "CLEAR_CUSTOMER" }
  | { type: "SET_PAYMENT_METHOD"; payload: PaymentMethod | null }
  | { type: "SET_NOTES"; payload: string }
  | { type: "CLEAR" };

const initialState: CartState = {
  items: [],
  customerId: null,
  customerName: null,
  paymentMethod: null,
  notes: "",
};

function reducer(state: CartState, action: Action): CartState {
  switch (action.type) {
    case "ADD_PRODUCT": {
      const { productId, name, photoUrl, unitPriceCents, stockQuantity } =
        action.payload;
      const qty = action.payload.quantity ?? 1;
      const idx = state.items.findIndex((it) => it.productId === productId);

      // Validação de estoque (se controlado).
      const limit = stockQuantity;
      const currentInCart = idx >= 0 ? state.items[idx].quantity : 0;
      if (limit !== undefined && currentInCart + qty > limit) {
        // Bloqueia silenciosamente — o card já é desabilitado quando atinge.
        // Mantém estado anterior pra não confundir.
        return state;
      }

      if (idx >= 0) {
        const next = [...state.items];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + qty,
          // Atualiza stockQuantity se mudou no backend.
          stockQuantity: stockQuantity ?? next[idx].stockQuantity,
        };
        const [moved] = next.splice(idx, 1);
        return { ...state, items: [moved, ...next] };
      }
      return {
        ...state,
        items: [
          {
            productId,
            name,
            photoUrl,
            unitPriceCents,
            quantity: qty,
            stockQuantity,
          },
          ...state.items,
        ],
      };
    }
    case "REMOVE_ITEM":
      return {
        ...state,
        items: state.items.filter(
          (it) => it.productId !== action.payload.productId
        ),
      };
    case "INCREASE_QTY":
      return {
        ...state,
        items: state.items.map((it) => {
          if (it.productId !== action.payload.productId) return it;
          // Respeita limite de estoque se houver.
          if (
            it.stockQuantity !== undefined &&
            it.quantity + 1 > it.stockQuantity
          ) {
            return it;
          }
          return { ...it, quantity: it.quantity + 1 };
        }),
      };
    case "DECREASE_QTY":
      return {
        ...state,
        items: state.items.flatMap((it) => {
          if (it.productId !== action.payload.productId) return [it];
          if (it.quantity <= 1) return [];
          return [{ ...it, quantity: it.quantity - 1 }];
        }),
      };
    case "SET_QTY": {
      const { productId, quantity } = action.payload;
      if (quantity <= 0) {
        return {
          ...state,
          items: state.items.filter((it) => it.productId !== productId),
        };
      }
      return {
        ...state,
        items: state.items.map((it) => {
          if (it.productId !== productId) return it;
          // Trunca pelo estoque disponível (ou usa quantity se ilimitado).
          const capped =
            it.stockQuantity !== undefined
              ? Math.min(quantity, it.stockQuantity)
              : quantity;
          return { ...it, quantity: capped };
        }),
      };
    }
    case "SET_UNIT_PRICE":
      return {
        ...state,
        items: state.items.map((it) =>
          it.productId === action.payload.productId
            ? { ...it, unitPriceCents: action.payload.unitPriceCents }
            : it
        ),
      };
    case "SET_CUSTOMER":
      return {
        ...state,
        customerId: action.payload.customerId,
        customerName: action.payload.customerName,
      };
    case "CLEAR_CUSTOMER":
      return { ...state, customerId: null, customerName: null };
    case "SET_PAYMENT_METHOD":
      return { ...state, paymentMethod: action.payload };
    case "SET_NOTES":
      return { ...state, notes: action.payload };
    case "CLEAR":
      return initialState;
    default:
      return state;
  }
}

/**
 * Hook que centraliza o estado do carrinho do PDV. Mantido em memória —
 * uma venda nova começa zerada após `clear()`.
 */
export function useCart() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const addProduct = useCallback(
    (payload: {
      productId: Id<"products">;
      name: string;
      photoUrl: string | null;
      unitPriceCents: number;
      stockQuantity?: number;
      quantity?: number;
    }) => dispatch({ type: "ADD_PRODUCT", payload }),
    []
  );

  const removeItem = useCallback(
    (productId: Id<"products">) =>
      dispatch({ type: "REMOVE_ITEM", payload: { productId } }),
    []
  );

  const increaseQty = useCallback(
    (productId: Id<"products">) =>
      dispatch({ type: "INCREASE_QTY", payload: { productId } }),
    []
  );

  const decreaseQty = useCallback(
    (productId: Id<"products">) =>
      dispatch({ type: "DECREASE_QTY", payload: { productId } }),
    []
  );

  const setQty = useCallback(
    (productId: Id<"products">, quantity: number) =>
      dispatch({ type: "SET_QTY", payload: { productId, quantity } }),
    []
  );

  const setUnitPrice = useCallback(
    (productId: Id<"products">, unitPriceCents: number) =>
      dispatch({
        type: "SET_UNIT_PRICE",
        payload: { productId, unitPriceCents },
      }),
    []
  );

  const setCustomer = useCallback(
    (customerId: Id<"customers">, customerName: string) =>
      dispatch({ type: "SET_CUSTOMER", payload: { customerId, customerName } }),
    []
  );

  const clearCustomer = useCallback(
    () => dispatch({ type: "CLEAR_CUSTOMER" }),
    []
  );

  const setPaymentMethod = useCallback(
    (method: PaymentMethod | null) =>
      dispatch({ type: "SET_PAYMENT_METHOD", payload: method }),
    []
  );

  const setNotes = useCallback(
    (notes: string) => dispatch({ type: "SET_NOTES", payload: notes }),
    []
  );

  const clear = useCallback(() => dispatch({ type: "CLEAR" }), []);

  const totalCents = useMemo(
    () =>
      state.items.reduce(
        (sum, it) => sum + it.unitPriceCents * it.quantity,
        0
      ),
    [state.items]
  );

  const itemCount = useMemo(
    () => state.items.reduce((sum, it) => sum + it.quantity, 0),
    [state.items]
  );

  return {
    state,
    totalCents,
    itemCount,
    addProduct,
    removeItem,
    increaseQty,
    decreaseQty,
    setQty,
    setUnitPrice,
    setCustomer,
    clearCustomer,
    setPaymentMethod,
    setNotes,
    clear,
  };
}

export type UseCart = ReturnType<typeof useCart>;
