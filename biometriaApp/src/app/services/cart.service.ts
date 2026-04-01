import { Injectable, computed, signal } from '@angular/core';

export interface CartItem {
  id: string | number;
  name: string;
  price: number;
  image: string;
  quantity: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  public cartItems = signal<CartItem[]>([]);

  public cartTotal = computed(() =>
    this.cartItems().reduce((total, item) => total + item.price * item.quantity, 0),
  );

  addToCart(product: any) {
    const productId = product.product_id ?? product.id;
    this.cartItems.update((items) => {
      const existing = items.find((item) => item.id === productId);
      if (existing) {
        return items.map((item) =>
          item.id === productId ? { ...item, quantity: item.quantity + 1 } : item,
        );
      }

      return [
        ...items,
        {
          id: productId,
          name: product.title ?? product.name ?? 'Producto',
          price: Number(product.price) || 0,
          image: product.thumbnail ?? product.image ?? '',
          quantity: 1,
        },
      ];
    });
  }

  removeFromCart(productId: string | number) {
    this.cartItems.update((items) => items.filter((item) => item.id !== productId));
  }

  decreaseQuantity(productId: string | number) {
    this.cartItems.update((items) =>
      items.map((item) => {
        if (item.id === productId) {
          return { ...item, quantity: Math.max(1, item.quantity - 1) };
        }
        return item;
      }),
    );
  }
}
