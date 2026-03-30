export type OrderStatus =
  | "placed"
  | "accepted"
  | "preparing"
  | "ready"
  | "completed"
  | "cancelled"
  | "rejected";

export type ProfileRole = "customer" | "admin";

export type AppSettings = {
  singleton_key: "global";
  currency_code: string;
  language_code: string;
  locale_identifier: string;
};

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: ProfileRole;
};

export type MenuCategory = {
  id: string;
  name: string;
  sort_order: number;
  is_active: boolean;
};

export type MenuItem = {
  id: string;
  category_id: string;
  name: string;
  description: string;
  image_url: string | null;
  price_cents: number;
  prep_minutes: number;
  is_available: boolean;
  is_featured: boolean;
};

export type OrderItem = {
  id: string;
  order_id: string;
  menu_item_id: string | null;
  quantity: number;
  unit_price_cents: number;
  item_name_snapshot: string;
  created_at: string;
};

export type OrderHistoryEntry = {
  id: string;
  order_id: string;
  status: OrderStatus;
  note: string | null;
  created_at: string;
};

export type OrderRecord = {
  id: string;
  user_id: string;
  order_number: string;
  status: OrderStatus;
  subtotal_cents: number;
  total_cents: number;
  notes: string | null;
  estimated_ready_at: string | null;
  placed_at: string;
  accepted_at: string | null;
  ready_at: string | null;
  completed_at: string | null;
  cancelled_at: string | null;
  rejected_at: string | null;
  created_at: string;
  updated_at: string;
  items: OrderItem[];
  history: OrderHistoryEntry[];
  customer?: Profile | null;
};
