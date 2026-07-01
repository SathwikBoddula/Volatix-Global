// src/app/layout.tsx
/**
 * Volatix Root Layout - Production App Shell
 * Optimized fonts, metadata, and performance
 */

import type { Metadata, Viewport } from 'next';
import { GeistSans } from 'geist/font/sans';
import { GeistMono } from 'geist/font/mono';
import '../styles/tailwind.css';
import { Toaster } from 'sonner';

// ---------------------------------------------------------------------------
// FONT OPTIMIZATION (Preload, display: swap, variable fonts)
// ---------------------------------------------------------------------------

// Geist Sans - UI font with variable weight
const geistSans = GeistSans;

// Geist Mono - Tabular data font
const geistMono = GeistMono;

// ---------------------------------------------------------------------------
// VIEWPORT (PWA-ready)
// ---------------------------------------------------------------------------

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
    { media: '(prefers-color-scheme: dark)', color: '#0a0a0c' },
  ],
  colorScheme: 'dark',
  viewportFit: 'cover',
};

// ---------------------------------------------------------------------------
// METADATA (SEO, Social, PWA)
// ---------------------------------------------------------------------------

export const metadata: Metadata = {
  metadataBase: new URL('https://volatix.app'),
  title: {
    default: 'Volatix — Institutional Stock Analytics & AI Prediction',
    template: '%s | Volatix',
  },
  description:
    'Volatix delivers institutional-grade stock analytics with LSTM-powered 7-day price forecasts, RSI/MACD signal detection, and multi-timeframe moving average analysis for professional traders.',
  keywords: [
    'stock analytics',
    'technical analysis',
    'price forecasting',
    'LSTM',
    'RSI',
    'MACD',
    'moving averages',
    'backtesting',
    'algorithmic trading',
    'financial dashboard',
  ],
  authors: [{ name: 'Volatix' }],
  creator: 'Volatix',
  publisher: 'Volatix',
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: '/',
    siteName: 'Volatix',
    title: 'Volatix — Institutional Stock Analytics & AI Prediction',
    description:
      'Professional stock analytics platform with AI-powered forecasts, technical indicators, and backtesting.',
    images: [
      {
        url: '/og-default.png',
        width: 1200,
        height: 630,
        alt: 'Volatix Analytics Dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Volatix — Institutional Stock Analytics',
    description: 'AI-powered stock analytics with 7-day forecasts and technical indicators.',
    images: ['/og-default.png'],
    creator: '@volatix',
  },
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: 'any' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/apple-touch-icon.png', sizes: '180x180', type: 'image/png' }],
    shortcut: '/favicon.ico',
    other: [
      {
        rel: 'manifest',
        url: '/manifest.json',
      },
    ],
  },
  manifest: '/manifest.json',
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION,
  },
  category: 'finance',
};

// ---------------------------------------------------------------------------
// ROOT LAYOUT
// ---------------------------------------------------------------------------

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
    >
      <head>
        {/* Font preconnect for faster loading */}
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />

        {/* PWA meta */}
        <meta name="theme-color" content="#0a0a0c" media="(prefers-color-scheme: dark)" />
        <meta name="theme-color" content="#ffffff" media="(prefers-color-scheme: light)" />
        <link rel="manifest" href="/manifest.json" />
      </head>
      <body className={`${geistSans.className} ${geistMono.className} antialiased`}>
        {children}
        <Toaster
          position="bottom-right"
          toastOptions={{
            style: {
              background: 'var(--card)',
              border: '1px solid var(--border)',
              color: 'var(--foreground)',
              boxShadow: '0 10px 40px rgba(0,0,0,0.4)',
            },
            duration: 4000,
          }}
        />
      </body>
    </html>
  );
}
