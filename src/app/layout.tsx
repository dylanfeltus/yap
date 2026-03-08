import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Sidebar } from "@/components/sidebar";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Yap",
  description: "Open source social media management",
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
        <main className="min-h-screen overflow-y-auto px-4 pt-14 pb-6 md:ml-60 md:px-8 md:py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
