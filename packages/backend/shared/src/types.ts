export interface MenuItem { 
  id: string; 
  name: string; 
  description: string;
  priceUsd: number; 
  category: string;
  dietaryTags?: string[];
  imageUrl?: string;
  available: boolean;
  preparationTime: number; // in minutes
  calories?: number;
  ingredients?: string[];
}

export interface OrderItem { 
  menuItemId: string; 
  quantity: number;
  specialInstructions?: string;
}

export interface Order {
  id: string;
  items: OrderItem[];
  dietaryNotes?: string;
  language: string;
  status: 'pending' | 'paid' | 'preparing' | 'ready' | 'completed';
  createdAt: string;
  totalAmount?: number;
  customerName?: string;
  orderType: 'dine-in' | 'takeout' | 'delivery';
  transactionSignature?: string;
  paidAt?: string;
}

export interface MenuCategory {
  id: string;
  name: string;
  description?: string;
  displayOrder: number;
} 