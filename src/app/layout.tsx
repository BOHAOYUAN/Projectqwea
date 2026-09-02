import type { Metadata, Viewport } from 'next';
import './globals.css';
import { BUSINESS_CONFIG } from '@/lib/business';

export const metadata: Metadata = {
  title: `${BUSINESS_CONFIG.name} | Review Studio`,
  description: `A multi-merchant review studio, starting with ${BUSINESS_CONFIG.name} in ${BUSINESS_CONFIG.location}.`,
  icons: {
    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>✨</text></svg>',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#f8efdf',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" className="h-full antialiased">
      <body className="min-h-full flex flex-col font-sans">{children}</body>
    </html>
  );
}
