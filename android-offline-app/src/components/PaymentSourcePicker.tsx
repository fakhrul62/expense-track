"use client";
import type { PaymentSource } from "@/lib/wallet";
import { Wallet, Landmark } from "lucide-react";

export default function PaymentSourcePicker({ value, onChange, income = false, disabled = false }: { value: PaymentSource; onChange: (value: PaymentSource) => void; income?: boolean; disabled?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-2 min-w-0"><legend className="text-xs font-bold mb-2">{income ? "ADD TO" : "PAY FROM"}</legend><div role="group" aria-label={income ? "Money destination" : "Payment source"} className="grid grid-cols-2 gap-2">{([['cash', 'Cash', Wallet], ['bank', 'Bank / Card', Landmark]] as const).map(([id, label, Icon]) => <button type="button" key={id} aria-pressed={value === id} onPointerDown={event => event.preventDefault()} onClick={() => onChange(id)} className={`${value === id ? "retro-btn" : "retro-btn-secondary"} px-2 py-2 gap-2 text-xs`}><Icon size={16} aria-hidden="true" />{label}</button>)}</div></fieldset>;
}
