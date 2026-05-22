import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Providers from "@/components/Providers";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "TubeToBlog - Transform YouTube Videos into SEO Blog Posts",
  description: "AI-powered tool that converts YouTube videos into SEO-optimized blog posts in seconds.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen bg-gradient-to-br from-gray-50 to-white">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
