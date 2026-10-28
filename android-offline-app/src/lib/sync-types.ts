export type SyncStore = "categories" | "expenses";
export interface CloudCategory { _id: string; name: string; icon: string; isDefault: boolean; createdAt: string; updatedAt: string }
export interface CloudExpense { _id: string; amount: number; categoryId: string; note: string; date: string; createdAt: string; updatedAt: string }
export interface SyncMutation { store: SyncStore; id: string; mutationId: string; deleted?: boolean; record?: CloudCategory | CloudExpense }
export interface SyncResponse {
  acknowledged: string[];
  categories: CloudCategory[];
  expenses: CloudExpense[];
  deleted: { store: SyncStore; id: string }[];
  aliases: { id: string; canonicalId: string }[];
  warnings: string[];
}
export const syncPriority = (mutation: SyncMutation) => mutation.store === "categories" ? mutation.deleted ? 3 : 0 : mutation.deleted ? 1 : 2;
