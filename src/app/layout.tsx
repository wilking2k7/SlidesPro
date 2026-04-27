import type { Metadata } from "next";
import { DM_Serif_Display, DM_Sans, Geist_Mono } from "next/font/google";
import "./globals.css";

const dmSans = DM_Sans({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const dmSerif = DM_Serif_Display({
  variable: "--font-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

const geistMono = Geist_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SlidesPro — Presentaciones IA editables",
  description:
    "Convierte cualquier video, transcript o brief en una presentación editable con narrativa, diseño y datos.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${dmSans.variable} ${dmSerif.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-[#eff3ff] text-slate-900"
        style={{ fontFamily: "var(--font-sans)" }}
        suppressHydrationWarning
      >
        {children}
      </body>
    </html>
  );
}
