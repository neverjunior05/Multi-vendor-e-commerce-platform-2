"use client";

import Link from "next/link";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes, TextareaHTMLAttributes } from "react";
import { STATUS_STYLES } from "@/lib/types";

/* ------------------------------- Button ------------------------------- */

type ButtonVariant = "primary" | "outline" | "ghost" | "danger" | "success" | "subtle";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: "bg-accent text-white hover:bg-accent-deep shadow-sm shadow-accent/30",
  outline: "border border-line bg-surface text-ink hover:border-accent hover:text-accent-deep",
  ghost: "text-ink-soft hover:text-ink hover:bg-accent-soft",
  danger: "bg-danger text-white hover:bg-rose-600",
  success: "bg-success text-white hover:bg-emerald-600",
  subtle: "bg-accent-soft text-accent-ink hover:bg-accent/20",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-13 px-7 text-base",
};

export function buttonClass(variant: ButtonVariant = "primary", size: ButtonSize = "md", extra = "") {
  return `inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-150 disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent ${VARIANTS[variant]} ${SIZES[size]} ${extra}`;
}

export function Button({
  variant = "primary",
  size = "md",
  className = "",
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: ButtonVariant; size?: ButtonSize }) {
  return (
    <button className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </button>
  );
}

export function LinkButton({
  href,
  variant = "primary",
  size = "md",
  className = "",
  children,
}: {
  href: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Link href={href} className={buttonClass(variant, size, className)}>
      {children}
    </Link>
  );
}

/* ------------------------------ Surfaces ------------------------------ */

export function Card({ className = "", children }: { className?: string; children: ReactNode }) {
  return <div className={`card ${className}`}>{children}</div>;
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        {eyebrow ? (
          <p className="mb-1.5 text-xs font-bold tracking-[0.18em] text-accent uppercase">{eyebrow}</p>
        ) : null}
        <h2 className="text-2xl font-bold sm:text-3xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm text-ink-soft">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------- Badges ------------------------------- */

export function StatusPill({ status, className = "" }: { status: string; className?: string }) {
  const style = STATUS_STYLES[status] ?? {
    label: status,
    className: "bg-line text-ink-soft border-line",
  };
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold tracking-wide uppercase ${style.className} ${className}`}
    >
      <span className="size-1.5 rounded-full bg-current" />
      {style.label}
    </span>
  );
}

export function Chip({
  active,
  children,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean }) {
  return (
    <button
      className={`rounded-full border px-3.5 py-1.5 text-sm font-semibold whitespace-nowrap transition ${
        active
          ? "border-accent bg-accent text-white"
          : "border-line bg-surface text-ink-soft hover:border-accent hover:text-accent-deep"
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

/* -------------------------------- Form -------------------------------- */

export function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold">{label}</span>
      {children}
      {hint && !error ? <span className="mt-1 block text-xs text-ink-soft">{hint}</span> : null}
      {error ? <span className="mt-1 block text-xs font-semibold text-danger">{error}</span> : null}
    </label>
  );
}

const inputBase =
  "w-full rounded-xl border border-line bg-surface px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-ink-soft/60 focus:border-accent focus:ring-2 focus:ring-accent/20";

export function Input({ className = "", ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${inputBase} ${className}`} {...rest} />;
}

export function Textarea({ className = "", ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={`${inputBase} min-h-24 ${className}`} {...rest} />;
}

export function Select({ className = "", children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select className={`${inputBase} ${className}`} {...rest}>
      {children}
    </select>
  );
}

/* ------------------------------- Display ------------------------------ */

export function Stars({ rating, size = 14 }: { rating: number | null; size?: number }) {
  const value = rating ?? 0;
  return (
    <span className="inline-flex items-center gap-0.5" style={{ fontSize: size }} aria-label={`${value.toFixed(1)} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <span key={star} className={star <= Math.round(value) ? "text-warn" : "text-line"}>
          ★
        </span>
      ))}
    </span>
  );
}

export function Price({ cents, compareAt, className = "" }: { cents: number; compareAt?: number | null; className?: string }) {
  return (
    <span className={`font-display font-bold ${className}`}>
      <span className="text-2xl">{(cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}</span>
      {compareAt && compareAt > cents ? (
        <span className="ml-2 text-sm font-medium text-ink-soft line-through">
          {(compareAt / 100).toLocaleString("en-US", { style: "currency", currency: "USD" })}
        </span>
      ) : null}
    </span>
  );
}

export function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent ${className}`}
      aria-hidden
    />
  );
}

export function EmptyState({
  icon = "🛍️",
  title,
  description,
  action,
}: {
  icon?: string;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="card flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="text-lg font-bold">{title}</h3>
      {description ? <p className="max-w-md text-sm text-ink-soft">{description}</p> : null}
      {action}
    </div>
  );
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "success" | "warn"; children: ReactNode }) {
  const tones = {
    danger: "bg-danger-soft text-rose-700 border-danger/30",
    success: "bg-success-soft text-emerald-800 border-success/30",
    warn: "bg-warn-soft text-amber-800 border-warn/30",
  };
  return <div className={`rounded-xl border px-4 py-3 text-sm font-medium ${tones[tone]}`}>{children}</div>;
}

export function Stat({
  label,
  value,
  sub,
  tone = "accent",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "accent" | "success" | "warn" | "danger";
}) {
  const bars = {
    accent: "bg-accent",
    success: "bg-success",
    warn: "bg-warn",
    danger: "bg-danger",
  };
  return (
    <div className="card relative overflow-hidden p-5">
      <span className={`absolute inset-x-0 top-0 h-1 ${bars[tone]}`} />
      <p className="text-xs font-bold tracking-[0.14em] text-ink-soft uppercase">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold">{value}</p>
      {sub ? <p className="mt-1 text-xs text-ink-soft">{sub}</p> : null}
    </div>
  );
}
