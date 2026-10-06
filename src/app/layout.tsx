import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Are We Cooked Yet? — The daily AI & engineering briefing",
  description:
    "A thoughtful daily reading list on AI and software engineering, with original headlines and direct links to the source.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" data-theme="dark">
      <body>{children}</body>
    </html>
  );
}
