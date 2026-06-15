import type { Metadata } from "next";
import BrandPlanClient from "./BrandPlanClient";

export const metadata: Metadata = {
  title: "Brand Plan — Sovereign OS",
  description: "Personal brand operating system — positioning, mission, pillars, and offers.",
};

export default function BrandPage() {
  return <BrandPlanClient />;
}
