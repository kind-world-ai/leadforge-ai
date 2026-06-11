import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "LeadForge AI",
  description: "Local-first lead discovery, audit, outreach, and pipeline tracker."
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
