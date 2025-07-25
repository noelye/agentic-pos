export interface MenuItem { id: string; name: string; priceUsd: number; dietaryTags?: string[]; }
export interface OrderItem { menuItemId: string; quantity: number; }
export interface Order {
  id: string;
  items: OrderItem[];
  dietaryNotes?: string;
  language: string;
  status: 'pending' | 'paid' | 'completed';
  createdAt: string;
} 