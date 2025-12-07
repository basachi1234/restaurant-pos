export type Category = { id: number; name: string };

export type MenuItem = {
  id: number;
  name: string;
  price: number;
  category_id: number;
  is_available: boolean;
  image_url: string | null;
  promotion_qty: number;
  promotion_price: number;
  is_weight: boolean; // ✅ เพิ่มบรรทัดนี้ครับ
};

export type UserProfile = {
  id: number;
  name: string;
  pin: string;
  role: 'owner' | 'staff';
};

export type TopItem = { name: string; quantity: number; revenue: number };

export type Transaction = {
  id: number;
  type: 'income' | 'expense';
  amount: number;
  description: string;
  created_at: string;
};

export type Discount = {
  id: number;
  name: string;
  type: 'percent' | 'amount';
  value: number;
  is_active: boolean;
};

export type StoreSetting = {
  id: number;
  shop_name: string;
  promptpay_id: string;
  shop_logo_url: string | null;
  is_open: boolean;
};