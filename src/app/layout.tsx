import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "YouthFest Registration",
  description: "YouthFest 1-Day Program Registration Form",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
