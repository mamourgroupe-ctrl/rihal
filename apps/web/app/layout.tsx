import type { Metadata, Viewport } from 'next';
import './globals.css';
import { AuthProvider } from '@/lib/auth';
import { ToastProvider } from '@/components/ui';

export const metadata: Metadata = {
  title: 'رحال | Rihal — عمليات الحج والعمرة',
  description:
    'منصة SaaS متعددة المستأجرين لإدارة المعتمرين والمجموعات والوثائق والفوترة لوكالات الحج والعمرة.',
};

export const viewport: Viewport = {
  themeColor: '#070d0b',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <AuthProvider>
          <ToastProvider>{children}</ToastProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
