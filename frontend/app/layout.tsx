import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AETHER COMMAND | XAUUSD ORBITAL OPS",
  description: "Multi-Agent AI Trading Command Center with Human-in-the-Loop Orchestration",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#030712] text-slate-200 min-h-screen antialiased">
        {children}
      </body>
    </html>
  );
}
