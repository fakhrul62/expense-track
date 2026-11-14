"use client";
import { ArrowDown } from "lucide-react";
import { useUpdates } from "@/context/UpdateContext";

export default function UpdateBadge() {
  const { available } = useUpdates();
  if (!available) return null;
  return <><span data-testid="update-badge" className="update-badge" aria-hidden="true"><ArrowDown /></span><span className="sr-only">Update available</span></>;
}
