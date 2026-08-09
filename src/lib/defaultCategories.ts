import { Category } from "@/models/Category";
import mongoose from "mongoose";

export const DEFAULT_CATEGORIES = [
  { name: "Bus", icon: "🚌", isDefault: true },
  { name: "Rickshaw", icon: "🛺", isDefault: true },
  { name: "Metro", icon: "🚇", isDefault: true },
  { name: "Food", icon: "🍱", isDefault: true },
];

export async function ensureDefaultCategories(userId: string | mongoose.Types.ObjectId) {
  const existingDefaults = await Category.find({ userId, isDefault: true });
  
  if (existingDefaults.length === 0) {
    const docs = DEFAULT_CATEGORIES.map((cat) => ({
      userId,
      name: cat.name,
      icon: cat.icon,
      isDefault: true,
    }));
    await Category.insertMany(docs);
  }
}
