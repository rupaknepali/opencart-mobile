import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, type CartOptionValue } from '../api/endpoints';
import type { Cart } from '../api/types';

export const cartKey = ['cart'] as const;

export function useCart() {
  return useQuery({ queryKey: cartKey, queryFn: api.cart.get });
}

/** Mutations that return the full cart write it straight into the cache. */
function useCartMutation<V>(fn: (vars: V) => Promise<Cart>) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (cart) => {
      queryClient.setQueryData(cartKey, cart);
      queryClient.invalidateQueries({ queryKey: ['checkout'] });
    },
  });
}

export function useAddToCart() {
  return useCartMutation((vars: { product_id: number; quantity: number; option?: Record<string, CartOptionValue>; subscription_plan_id?: number }) =>
    api.cart.add(vars),
  );
}

export function useUpdateCartItem() {
  return useCartMutation((vars: { key: number; quantity: number }) => api.cart.edit(vars.key, vars.quantity));
}

export function useRemoveCartItem() {
  return useCartMutation((key: number) => api.cart.remove(key));
}

export function useApplyCoupon() {
  return useCartMutation((coupon: string) => api.cart.coupon(coupon));
}

export function useCartCount() {
  const { data } = useCart();
  return data?.count ?? 0;
}
