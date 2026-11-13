import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/endpoints';

export const wishlistKey = ['wishlist'] as const;

export function useWishlist() {
  return useQuery({ queryKey: wishlistKey, queryFn: api.wishlist.get });
}

export function useToggleWishlist() {
  const queryClient = useQueryClient();
  const { data } = useWishlist();
  const ids = new Set(data?.product_ids ?? []);

  const mutation = useMutation({
    mutationFn: (product_id: number) => (ids.has(product_id) ? api.wishlist.remove(product_id) : api.wishlist.add(product_id)),
    onSuccess: (result) => {
      queryClient.setQueryData(wishlistKey, result);
    },
  });

  return {
    isInWishlist: (product_id: number) => ids.has(product_id),
    toggle: mutation.mutate,
    toggleAsync: mutation.mutateAsync,
    isPending: mutation.isPending,
  };
}
