import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { connectToDB } from "@/lib/db";
import { User } from "@/models/User";

export async function GET(req: NextRequest) {
  try {
    const payload = getUserFromRequest(req);

    if (!payload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();
    const user = await User.findById(payload.userId).select("-passwordHash");

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 444 });
    }

    return NextResponse.json({
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        createdAt: user.createdAt,
      },
    });
  } catch (error: unknown) {
    console.error("Auth me error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
