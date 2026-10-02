import { NextRequest } from "next/server";
import { accountHandler } from "@/lib/account-server";
export const runtime = "nodejs";
type Context = { params: Promise<{ action: string }> };
async function handle(req: NextRequest, context: Context) {
  return accountHandler(req, (await context.params).action);
}
export { handle as POST, handle as GET, handle as OPTIONS };
