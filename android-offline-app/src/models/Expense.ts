import mongoose, { Schema, Document, Model } from "mongoose";

export interface IExpense extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  amount: number;
  categoryId: mongoose.Types.ObjectId;
  note?: string;
  date: string; // YYYY-MM-DD format for easy exact date grouping & sorting
  createdAt: Date;
}

const ExpenseSchema = new Schema<IExpense>(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    amount: { type: Number, required: true, min: 0 },
    categoryId: { type: Schema.Types.ObjectId, ref: "Category", required: true, index: true },
    note: { type: String, trim: true, default: "" },
    date: { type: String, required: true, index: true }, // Format: "YYYY-MM-DD"
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: false }
);

export const Expense: Model<IExpense> =
  mongoose.models.Expense || mongoose.model<IExpense>("Expense", ExpenseSchema);
