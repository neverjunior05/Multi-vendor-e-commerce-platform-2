import { Suspense } from "react";
import { ProductsBrowser } from "@/components/products-browser";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Shop all products · Bazaario",
};

export default function ProductsPage() {
  return (
    <Suspense fallback={<div className="card grid place-items-center py-24 text-sm text-ink-soft">Loading catalogue…</div>}>
      <ProductsBrowser />
    </Suspense>
  );
}
