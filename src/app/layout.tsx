import type { Metadata } from "next";
import { IBM_Plex_Sans, Merriweather_Sans } from "next/font/google";

import "./globals.css";

const headingFont = Merriweather_Sans({
  subsets: ["latin"],
  variable: "--font-heading",
  weight: ["500", "600", "700", "800"],
});

const bodyFont = IBM_Plex_Sans({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "SIMTAC AI Scenario Builder",
  description:
    "Professional AI-assisted Singapore healthcare simulation scenario builder with SIMTAC worksheet export and SimMan capability validation.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${headingFont.variable} ${bodyFont.variable} antialiased`}>{children}</body>
    </html>
  );
}
