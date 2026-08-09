import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { connectToDB } from "@/lib/db";
import { Category } from "@/models/Category";
import { Expense } from "@/models/Expense";

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    await connectToDB();

    const category = await Category.findOne({
      _id: id,
      userId: userPayload.userId,
    });

    if (!category) {
      return NextResponse.json({ error: "Category not found" }, { status: 404 });
    }

    if (category.isDefault) {
      return NextResponse.json(
        { error: "Default categories (Bus, Rickshaw, Metro, Food) cannot be deleted" },
        { status: 400 }
      );
    }

    // Check if expenses exist for this category
    const expenseCount = await Expense.countDocuments({ categoryId: id });
    if (expenseCount > 0) {
      return NextResponse.json(
        {
          error: `Cannot delete category because ${expenseCount} expense(s) are associated with it. Delete or reassign those expenses first.`,
        },
        { status: 400 }
      );
    }

    await Category.deleteOne({ _id: id });

    return NextResponse.json({ success: true, message: "Category deleted" });
  } catch (error: unknown) {
    console.error("Delete category error:", error);
    return NextResponse.json({ error: "Server error deleting category" }, { status: 500 });
  }
}
