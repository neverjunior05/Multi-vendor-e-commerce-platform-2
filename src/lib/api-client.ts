"use client";

/**
 * Axios client used by every client component.
 * - `withCredentials` sends the httpOnly JWT cookie.
 * - The request interceptor also attaches `Authorization: Bearer <jwt>` from
 *   localStorage, which is the classic SPA pattern (the cookie is the fallback).
 * - The response interceptor normalises API errors into Error.message.
 */
import axios, { AxiosError } from "axios";

export const TOKEN_KEY = "bazaario_token";

export const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  headers: { "Content-Type": "application/json" },
});

api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = window.localStorage.getItem(TOKEN_KEY);
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export function apiErrorMessage(error: unknown, fallback = "Something went wrong."): string {
  if (error instanceof AxiosError) {
    return (error.response?.data as { error?: string } | undefined)?.error ?? error.message ?? fallback;
  }
  if (error instanceof Error) return error.message;
  return fallback;
}
