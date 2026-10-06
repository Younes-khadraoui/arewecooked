import type { Metadata } from "next";
import "./globals.css";
import { Geist } from "next/font/google";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Are We Cooked Yet? — The daily AI & engineering briefing",
  description:
    "A thoughtful daily reading list on AI and software engineering, with original headlines and direct links to the source.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark" className={`dark ${geist.variable}`}>
      <body>{children}</body>
    </html>
  );
}
