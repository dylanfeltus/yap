import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Content Command Center",
  description: "Content management and scheduling tool",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body
        className={`${inter.variable} font-sans antialiased bg-[#0a0a0a] text-zinc-100`}
      >
        <Sidebar />
        <main className="ml-60 min-h-screen overflow-y-auto px-8 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
