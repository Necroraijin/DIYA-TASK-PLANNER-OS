import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diya - Student Workspace",
  description: "A beautiful, calm, and interactive student workspace with AI circadian planning, habit tracking, and stress buster guides.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full bg-slate-950 text-slate-100 antialiased selection:bg-indigo-500/30 selection:text-indigo-200">
        {children}
      </body>
    </html>
  );
}
