/** Shared client-side types (mirrors the API JSON payloads). */

export type Role = "customer" | "vendor" | "admin";

export type SessionUser = {
  id: number;
  name: string;
  email: string;
  role: Role;
  isBlocked: boolean;
  createdAt: string;
};

export type VendorProfile = {
  id: number;
  userId: number;
  storeName: string;
  slug: string;
  tagline: string | null;
  description: string | null;
  city: string | null;
  logoUrl: string | null;
  status: "pending" | "approved" | "rejected";
  reviewedAt: string | null;
  createdAt: string;
};

/** Shape needed by cards/grids — server query results satisfy this too. */
export type ProductCardData = Omit<
  ApiProduct,
  "description" | "status" | "createdAt"
> & Partial<Pick<ApiProduct, "description" | "status" | "createdAt">>;

export type ApiProduct = {
  id: number;
  title: string;
  slug: string;
  description: string;
  priceCents: number;
  compareAtCents: number | null;
  stock: number;
  images: string[];
  attributes: Record<string, string | number | boolean | null>;
  status: "active" | "draft" | "removed";
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
  categoryId: number | null;
  categoryName: string | null;
  categorySlug: string | null;
  rating: number | null;
  reviewCount: number;
  createdAt: string;
};

export type ApiCartItem = {
  id: number;
  quantity: number;
  productId: number;
  title: string;
  priceCents: number;
  stock: number;
  images: string[];
  vendorId: number;
  vendorName: string;
  vendorSlug: string;
};

export type ApiCart = {
  id: number;
  items: ApiCartItem[];
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  vendorCount: number;
};

export type ApiOrderItem = {
  id: number;
  orderId: number;
  productId: number | null;
  vendorId: number;
  title: string;
  image: string | null;
  unitPriceCents: number;
  quantity: number;
};

export type ApiOrder = {
  id: number;
  status: "pending" | "paid" | "shipped" | "delivered" | "cancelled";
  subtotalCents: number;
  shippingCents: number;
  totalCents: number;
  shipName: string;
  shipLine1: string;
  shipCity: string;
  shipPostal: string;
  shipCountry: string;
  note: string | null;
  paymentRef: string;
  paymentBrand: string;
  createdAt: string;
  items: ApiOrderItem[];
};

export const STATUS_STYLES: Record<string, { label: string; className: string }> = {
  approved: { label: "Approved", className: "bg-success-soft text-emerald-800 border-success/30" },
  active: { label: "Active", className: "bg-success-soft text-emerald-800 border-success/30" },
  paid: { label: "Paid", className: "bg-success-soft text-emerald-800 border-success/30" },
  delivered: { label: "Delivered", className: "bg-success-soft text-emerald-800 border-success/30" },
  pending: { label: "Pending", className: "bg-warn-soft text-amber-800 border-warn/30" },
  draft: { label: "Draft", className: "bg-warn-soft text-amber-800 border-warn/30" },
  shipped: { label: "Shipped", className: "bg-warn-soft text-amber-800 border-warn/30" },
  rejected: { label: "Rejected", className: "bg-danger-soft text-rose-700 border-danger/30" },
  cancelled: { label: "Cancelled", className: "bg-danger-soft text-rose-700 border-danger/30" },
  removed: { label: "Removed", className: "bg-danger-soft text-rose-700 border-danger/30" },
};
