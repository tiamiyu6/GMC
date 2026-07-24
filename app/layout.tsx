import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "GMC ISP Billing",
  description: "Voucher-based ISP billing, Mikrotik hotspot control and self-service customer portal.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  );
}
