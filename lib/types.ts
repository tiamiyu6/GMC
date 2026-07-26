export type Role = "customer" | "admin";

export type OrderStatus = "pending_payment" | "active" | "expired" | "cancelled";

export type PaymentType = "order_payment" | "wallet_topup";

export type Profile = {
  id: string;
  full_name: string | null;
  phone: string | null;
  role: Role;
  balance: number;
  created_at: string;
};

export type Package = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration_days: number;
  speed: string | null;
  data_limit_gb: number | null;
  mikrotik_profile: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type Order = {
  id: string;
  user_id: string;
  package_id: string;
  voucher_code: string;
  mikrotik_username: string;
  amount: number;
  status: OrderStatus;
  paid_from_balance: boolean;
  created_at: string;
  expires_at: string;
  activated_at: string | null;
  valid_until: string | null;
  payment_claimed_at: string | null;
  confirmed_by: string | null;
  cancelled_at: string | null;
  packages?: Package;
  profiles?: Pick<Profile, "id" | "full_name" | "phone">;
};

export type Payment = {
  id: string;
  user_id: string;
  order_id: string | null;
  amount: number;
  type: PaymentType;
  method: string;
  note: string | null;
  confirmed_by: string | null;
  created_at: string;
};

export const VOUCHER_GRACE_MINUTES = 10;

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "12";
  };
  public: {
    Tables: {
      profiles: {
        Row: Profile;
        Insert: Partial<Profile> & { id: string };
        Update: Partial<Profile>;
        Relationships: [];
      };
      packages: {
        Row: Package;
        Insert: Partial<Package> & {
          name: string;
          price: number;
          duration_days: number;
          mikrotik_profile: string;
        };
        Update: Partial<Package>;
        Relationships: [];
      };
      orders: {
        Row: Order;
        Insert: Partial<Order> & {
          user_id: string;
          package_id: string;
          voucher_code: string;
          mikrotik_username: string;
          amount: number;
          expires_at: string;
        };
        Update: Partial<Order>;
        Relationships: [];
      };
      payments: {
        Row: Payment;
        Insert: Partial<Payment> & {
          user_id: string;
          amount: number;
          type: PaymentType;
        };
        Update: Partial<Payment>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      adjust_balance: {
        Args: { p_user_id: string; p_delta: number };
        Returns: number;
      };
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      admin_total_revenue: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
      admin_revenue_since: {
        Args: { p_since: string };
        Returns: number;
      };
      admin_wallet_float: {
        Args: Record<PropertyKey, never>;
        Returns: number;
      };
    };
  };
};
