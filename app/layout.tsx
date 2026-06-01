import type { Metadata } from 'next';
import './globals.css';
import 'sonner/dist/styles.css';
import { SonnerProvider } from '../components/sonner-provider';

export const metadata: Metadata = {
  title: 'MouhibHub',
  description: 'Professional dashboard for MouhibHub contact submissions.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      <body suppressHydrationWarning>
        <SonnerProvider />
        {children}
      </body>
    </html>
  );
}
