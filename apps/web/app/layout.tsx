import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rihal | رحال - منصة الحج والعمرة",
  description: "منصة SaaS متعددة المستأجرين لإدارة عمليات وكالات الحج والعمرة",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>{children}</body>
    </html>
  );
}
