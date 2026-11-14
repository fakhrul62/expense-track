"use client";
import type { PaymentSource } from "@/lib/wallet";
import { Wallet, Landmark } from "lucide-react";

export default function PaymentSourcePicker({ value, onChange, income = false, disabled = false, label, balanceLabels = false }: { value: PaymentSource; onChange: (value: PaymentSource) => void; income?: boolean; disabled?: boolean; label?: string; balanceLabels?: boolean }) {
  return <fieldset disabled={disabled} className="space-y-2 min-w-0"><legend className="text-xs font-bold mb-2">{label ?? (income ? "ADD TO" : "PAY FROM")}</legend><div role={label ? undefined : "group"} aria-label={label ? undefined : income ? "Money destination" : "Payment source"} className="grid grid-cols-2 gap-2">{([['cash', balanceLabels ? 'Cash Balance' : 'Cash', Wallet], ['bank', balanceLabels ? 'Bank Balance' : 'Bank / Card', Landmark]] as const).map(([id, text, Icon]) => <button type="button" key={id} aria-pressed={value === id} onPointerDown={event => event.preventDefault()} onClick={() => onChange(id)} className={`${value === id ? "retro-btn" : "retro-btn-secondary"} px-2 py-2 gap-2 text-xs`}><Icon size={16} aria-hidden="true" />{text}</button>)}</div></fieldset>;
}
