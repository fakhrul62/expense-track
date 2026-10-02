# 🕹️ EXPTRACK | Full-Stack Daily Expense Tracker

**EXPTRACK** is a full-stack, mobile-first daily expense tracking web application crafted with a distinct retro tactile UI aesthetic. Built with Next.js (App Router), Tailwind CSS, MongoDB (via Mongoose), and JWT authentication.

---

## ⚡ Tech Stack

- **Frontend**: Next.js 16 (App Router) + Tailwind CSS v4 + Framer Motion + Lucide React
- **Backend**: Next.js Serverless API Routes
- **Database**: MongoDB (via Mongoose ODM)
- **Auth**: JWT stored in `httpOnly` secure cookies + `bcryptjs` password hashing
- **Deployment**: Vercel

---

## ✨ Features

1. **JWT Authentication**:
   - Secure registration (`/register`) & login (`/login`)
   - HTTP-only cookie-based authentication state
   - Automatic route protection and session verification (`/api/auth/me`)

2. **Expense Tracking**:
   - Add, edit, and delete individual expenses
   - Amount, Category picker with emojis, Date (default today), and optional Note
   - Real-time **Daily Total** and **Monthly Total** calculation
   - Reverse-chronological expense list grouped by date with per-day totals
   - Month-by-month filter and navigation

3. **Category Management (Settings Page)**:
   - Default Categories: **Bus** (🚌), **Rickshaw** (🛺), **Metro** (🚇), **Food** (🍱)
   - Add new custom categories with custom name and emoji/icon selection
   - Delete custom categories (protected default categories remain intact)
   - Category reference integrity check before deletion

4. **Mobile-First Retro Design System**:
   - 2-3 color minimal palette (Vintage Warm Cream `#FBF7EE`, Charcoal `#1C1917`, Terracotta Accent `#EA580C`)
   - Monospace typography (`Space Mono`), thick solid borders, and tactile drop-shadows
   - Mobile bottom navigation bar with floating thumb-reachable add button
   - Full 44px+ touch targets and active press states with smooth Framer Motion modal transitions

---

## 🚀 Local Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB instance (local or MongoDB Atlas connection string)

### 1. Clone & Install Dependencies
```bash
git clone https://github.com/fakhrul62/expense-track.git
cd expense-track
npm install
```

### 2. Configure Environment Variables
Copy `.env.example` to `.env.local`:
```bash
cp .env.example .env.local
```

Edit `.env.local` with your values:
```env
MONGODB_URI=mongodb+srv://<username>:<password>@<cluster>.mongodb.net/expense_tracker?retryWrites=true&w=majority
JWT_SECRET=your_jwt_secret_key_here
```

### 3. Run Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🌐 Deploying to Vercel

### Step 1: Connect Repository
1. Push all code to GitHub:
   ```bash
   git remote add origin https://github.com/fakhrul62/expense-track.git
   git branch -M main
   git push -u origin main
   ```
2. Go to [Vercel Dashboard](https://vercel.com/new) and select **Import Repository**.
3. Choose `fakhrul62/expense-track`.

### Step 2: Configure Environment Variables in Vercel
In the Vercel project configuration page under **Environment Variables**, add:
- `MONGODB_URI` = Your MongoDB Atlas connection string
- `JWT_SECRET` = A strong secret string for signing JWT tokens

### Step 3: Target Domain / Project Name
When creating the Vercel project, set the Project Name to one of the following in priority order:
1. `exptrack` ➡️ **Live URL**: `https://exptrack.vercel.app`
2. `exptrack-app` ➡️ **Live URL**: `https://exptrack-app.vercel.app`
3. `myexptrack` ➡️ **Live URL**: `https://myexptrack.vercel.app`
4. `exptracker` ➡️ **Live URL**: `https://exptracker.vercel.app`

Click **Deploy**!

---

## 📁 Database Schema

- **User**: `name`, `email`, `passwordHash`, `createdAt`
- **Category**: `userId` (ref User), `name`, `icon`, `isDefault`, `createdAt`
- **Expense**: `userId` (ref User), `amount`, `categoryId` (ref Category), `note`, `date`, `createdAt`
