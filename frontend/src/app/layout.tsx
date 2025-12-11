import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LifeAdmin - Voice Agent',
  description: 'Jouw persoonlijke voice-powered life admin assistent',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="nl">
      <body>{children}</body>
    </html>
  );
}
