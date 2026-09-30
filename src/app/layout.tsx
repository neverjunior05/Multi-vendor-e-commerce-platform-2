import type { Metadata } from "next";
import type { ReactNode } from "react";
import { AuthProvider } from "@/context/AuthContext";
import { CartProvider } from "@/context/CartContext";
import { SiteFooter, SiteHeader } from "@/components/site-header";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bazaario — multi-vendor marketplace for independent makers",
  description:
    "Browse and buy from independent vendors on one platform. Role-based accounts for customers, vendors and admins, with sandbox payments.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        {/* Sora for headings/prices, Plus Jakarta Sans for UI text */}
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Sora:wght@600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-dvh antialiased">
        <AuthProvider>
          <CartProvider>
            <SiteHeader />
            <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6">{children}</main>
            <SiteFooter />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
