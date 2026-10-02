import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { connectToDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { Category } from "@/models/Category";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const { amount, categoryId, note, date } = await req.json();

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json(
        { error: "Please enter a valid amount greater than 0" },
        { status: 400 }
      );
    }

    if (!categoryId) {
      return NextResponse.json({ error: "Category is required" }, { status: 400 });
    }

    await connectToDB();

    const expense = await Expense.findOne({
      _id: id,
      userId: userPayload.userId,
    });

    if (!expense) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    const category = await Category.findOne({
      _id: categoryId,
      userId: userPayload.userId,
    });

    if (!category) {
      return NextResponse.json({ error: "Invalid category selected" }, { status: 400 });
    }

    const expenseDate =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : expense.date;

    expense.amount = numAmount;
    expense.categoryId = categoryId;
    expense.note = note ? String(note).trim() : "";
    expense.date = expenseDate;

    await expense.save();

    const updatedExpense = await Expense.findById(expense._id).populate({
      path: "categoryId",
      model: Category,
      select: "name icon isDefault",
    });

    return NextResponse.json({ expense: updatedExpense });
  } catch (error: unknown) {
    console.error("Update expense error:", error);
    return NextResponse.json({ error: "Server error updating expense" }, { status: 500 });
  }
}

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

    const result = await Expense.deleteOne({
      _id: id,
      userId: userPayload.userId,
    });

    if (result.deletedCount === 0) {
      return NextResponse.json({ error: "Expense not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Expense deleted" });
  } catch (error: unknown) {
    console.error("Delete expense error:", error);
    return NextResponse.json({ error: "Server error deleting expense" }, { status: 500 });
  }
}
