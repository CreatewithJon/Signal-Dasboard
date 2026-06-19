/**
 * lib/relationships/store.ts
 *
 * Person / Relationship CRUD — Sovereign OS v5.2
 * All reads/writes go to localStorage key "sovereign_relationships".
 */

import { KEYS } from "@/lib/keys";
import type { Person, RelationshipStatus } from "@/lib/types/relationships";

// ── Read ───────────────────────────────────────────────────────────────────

export function loadPeople(): Person[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(KEYS.RELATIONSHIPS);
    if (!raw) return [];
    return JSON.parse(raw) as Person[];
  } catch {
    return [];
  }
}

// ── Write ──────────────────────────────────────────────────────────────────

function persist(items: Person[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(KEYS.RELATIONSHIPS, JSON.stringify(items));
  } catch { /* ignore */ }
}

// ── Create ─────────────────────────────────────────────────────────────────

export function createPerson(
  draft: Omit<Person, "id" | "created_at" | "updated_at">
): Person {
  const now = new Date().toISOString();
  const person: Person = { ...draft, id: crypto.randomUUID(), created_at: now, updated_at: now };
  persist([person, ...loadPeople()]);
  return person;
}

// ── Update ─────────────────────────────────────────────────────────────────

export function updatePerson(
  id: string,
  patch: Partial<Omit<Person, "id" | "created_at">>
): Person | null {
  const all = loadPeople();
  const idx = all.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  const updated = { ...all[idx], ...patch, updated_at: new Date().toISOString() };
  all[idx] = updated;
  persist(all);
  return updated;
}

// ── Delete ─────────────────────────────────────────────────────────────────

export function deletePerson(id: string): void {
  persist(loadPeople().filter((p) => p.id !== id));
}

// ── Status helper ──────────────────────────────────────────────────────────

export function setPersonStatus(id: string, status: RelationshipStatus): Person | null {
  return updatePerson(id, { status });
}

// ── Touch: record last contacted ────────────────────────────────────────────

export function touchPerson(id: string): Person | null {
  return updatePerson(id, { last_contacted_at: new Date().toISOString() });
}

// ── Follow-up helpers ──────────────────────────────────────────────────────

/** Returns true if next_follow_up_at is today or in the past */
export function isFollowUpDue(person: Person, todayStr: string): boolean {
  if (!person.next_follow_up_at) return false;
  return person.next_follow_up_at <= todayStr;
}

/** Returns true if next_follow_up_at is tomorrow or within 3 days */
export function isFollowUpSoon(person: Person, todayStr: string): boolean {
  if (!person.next_follow_up_at) return false;
  const diff = daysBetween(todayStr, person.next_follow_up_at);
  return diff >= 0 && diff <= 3;
}

function daysBetween(from: string, to: string): number {
  return Math.floor(
    (new Date(to + "T00:00:00").getTime() - new Date(from + "T00:00:00").getTime()) / 86_400_000
  );
}
