import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CivicEye AI - Your AI-Powered Community Watchdog",
  description:
    "Empower your local community. Report civic issues with images and let AI generate structured, actionable complaints for municipal authorities, tracking resolution and ward scores.",
  keywords: [
    "civic tech",
    "pothole reporting",
    "community watchdog",
    "municipal problems solver",
    "artificial intelligence",
    "Gemini Vision",
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200"
        />
      </head>
      <body className="min-h-full flex flex-col bg-slate-950 text-slate-100 font-sans selection:bg-violet-500/30 selection:text-violet-200">
        {/* Decorative background gradients */}
        <div className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
          <div className="absolute -top-40 -left-40 h-[600px] w-[600px] rounded-full bg-violet-600/10 blur-[120px]" />
          <div className="absolute top-[20%] right-[-200px] h-[600px] w-[600px] rounded-full bg-cyan-600/10 blur-[150px]" />
          <div className="absolute bottom-[-100px] left-[20%] h-[500px] w-[500px] rounded-full bg-emerald-600/5 blur-[100px]" />
        </div>

        <div className="relative z-10 flex flex-col min-h-screen">
          <Navbar />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
