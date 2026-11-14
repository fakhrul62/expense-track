import type { Metadata, Viewport } from "next";
import "@fontsource/space-mono/400.css";
import "@fontsource/space-mono/700.css";
import "@fontsource/inter/latin.css";
import "@fontsource/arimo/latin-400.css";
import "@fontsource/arimo/latin-700.css";
import "@fontsource/carlito/latin-400.css";
import "@fontsource/carlito/latin-700.css";
import { FontPreference } from "@/components/FontSettings";
import NativeLifecycle from "@/components/NativeLifecycle";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { SyncProvider } from "@/context/SyncContext";
import { UpdateProvider } from "@/context/UpdateContext";

export const metadata: Metadata = {
  title: "EXPTRACK | Daily Expense Tracker",
  description: "A minimal retro-styled daily expense tracking web application.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col font-sans selection:bg-[#EA580C] selection:text-white transition-colors duration-250">
        <ThemeProvider>
          <FontPreference /><AuthProvider><UpdateProvider><SyncProvider><NativeLifecycle />{children}</SyncProvider></UpdateProvider></AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
