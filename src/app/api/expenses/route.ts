import { NextRequest, NextResponse } from "next/server";
import { getUserFromRequest } from "@/lib/auth";
import { connectToDB } from "@/lib/db";
import { Expense } from "@/models/Expense";
import { Category } from "@/models/Category";

export async function GET(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDB();

    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2026-08"

    const query: Record<string, unknown> = { userId: userPayload.userId };

    if (month && /^\d{4}-\d{2}$/.test(month)) {
      query.date = { $regex: `^${month}` };
    }

    const expenses = await Expense.find(query)
      .populate({ path: "categoryId", model: Category, select: "name icon isDefault" })
      .sort({ date: -1, createdAt: -1 });

    return NextResponse.json({ expenses });
  } catch (error: unknown) {
    console.error("Fetch expenses error:", error);
    return NextResponse.json({ error: "Server error fetching expenses" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const userPayload = getUserFromRequest(req);
    if (!userPayload) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

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

    // Verify category exists and belongs to user
    const category = await Category.findOne({
      _id: categoryId,
      userId: userPayload.userId,
    });

    if (!category) {
      return NextResponse.json({ error: "Invalid category selected" }, { status: 400 });
    }

    // Default date to today's YYYY-MM-DD if not provided
    const expenseDate =
      date && /^\d{4}-\d{2}-\d{2}$/.test(date)
        ? date
        : new Date().toISOString().split("T")[0];

    const newExpense = await Expense.create({
      userId: userPayload.userId,
      amount: numAmount,
      categoryId,
      note: note ? String(note).trim() : "",
      date: expenseDate,
    });

    const populatedExpense = await Expense.findById(newExpense._id).populate({
      path: "categoryId",
      model: Category,
      select: "name icon isDefault",
    });

    return NextResponse.json({ expense: populatedExpense }, { status: 201 });
  } catch (error: unknown) {
    console.error("Create expense error:", error);
    return NextResponse.json({ error: "Server error creating expense" }, { status: 500 });
  }
}
