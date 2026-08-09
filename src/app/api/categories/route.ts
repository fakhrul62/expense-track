import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { connectToDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { ensureDefaultCategories } from "@/lib/defaultCategories";

export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();
    await ensureDefaultCategories(userPayload.userId);

    const categories = await Category.find({ userId: userPayload.userId }).sort({
      isDefault: -1,
      createdAt: 1,
    });

    return NextResponse.json({ categories });
  } catch (error: unknown) {
    console.error("Fetch categories error:", error);
    return NextResponse.json({ error: "Server error fetching categories" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { name, icon } = await req.json();

    if (!name || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    await connectToDB();

    const categoryIcon = (icon && icon.trim()) || "🏷️";

    const newCategory = await Category.create({
      userId: userPayload.userId,
      name: name.trim(),
      icon: categoryIcon,
      isDefault: false,
    });

    return NextResponse.json({ category: newCategory }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create category error:", error);
    return NextResponse.json({ error: "Server error creating category" }, { status: 500 });
  }
}
