import { syncHandler } from "@/lib/sync-server";
export const runtime = "nodejs";
export const maxDuration = 60;
export { syncHandler as POST, syncHandler as OPTIONS };
