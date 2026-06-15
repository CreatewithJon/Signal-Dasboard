import { redirect } from "next/navigation";

// /memory routes to the Narrative Bank (brand narratives / memory vault).
// Route alias — keeping /narrative working for backwards compat.
export default function MemoryPage() {
  redirect("/narrative");
}
