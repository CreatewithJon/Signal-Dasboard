/**
 * lib/utils/arrays.ts
 * Safe array helpers for legacy localStorage data that may have undefined/null fields.
 */

export function safeArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

export function safeStringArray(value: unknown): string[] {
  return Array.isArray(value) ? (value as string[]) : [];
}
