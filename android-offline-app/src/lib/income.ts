// Stable category IDs keep income classification identical in SQLite, IndexedDB and cloud sync.
export const INCOME_SOURCES = [
  ['10000000-0000-4000-8000-000000000001', 'Salary', "💼"],
  ['10000000-0000-4000-8000-000000000002', 'Loan received', "🏦"],
  ['10000000-0000-4000-8000-000000000003', 'Owed money repaid', "🤝"],
  ['10000000-0000-4000-8000-000000000004', 'Freelance', "💻"],
  ['10000000-0000-4000-8000-000000000005', 'Other money received', "💰"],
] as const;
export const isIncomeCategory = (category: string | { _id: string }) => INCOME_SOURCES.some(([id]) => id === (typeof category === 'string' ? category : category._id));
export const incomeLabel = (name: string) => name.replace(/^Income: /, '');
