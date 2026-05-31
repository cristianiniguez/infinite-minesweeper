import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Infinite Minesweeper',
  description: 'An infinite procedural minesweeper with sector mechanics.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'Minesweeper',
  },
};

export const viewport: Viewport = {
  viewportFit: 'cover',
  themeColor: '#060d1a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="bg-gray-900 text-white antialiased">{children}</body>
    </html>
  );
}
