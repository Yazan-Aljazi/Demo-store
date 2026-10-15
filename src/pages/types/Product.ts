export interface Product {
  id: string;
  name: string;
  category: string;
  price: number;
  oldPrice: number | null;
  image: string;
  stock: number;
}

export interface CartItem extends Product {
  quantity: number;
}

export type WishlistItem = Product;