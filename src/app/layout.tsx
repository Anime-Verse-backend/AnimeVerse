import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { cn } from '@/lib/utils';
import { Providers } from '@/components/providers';
import Script from 'next/script';

const fontSans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
});

const fontHeading = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-heading',
});

const defaultUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(defaultUrl),
  title: 'AnimeVerse | Tu Universo de Anime Online',
  description: 'Explora, descubre y comenta sobre tus series de anime favoritas. Únete a la comunidad más grande de anime en español. Series, reseñas, noticias y más.',
  icons: {
    icon: `data:image/svg+xml,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'><g fill='hsl(275, 70%, 42%)'><path d='M82 20L50 85L18 20H82Z' /><path d='M50 85L25 95H75L50 85Z' /></g><g fill='white'><path d='M50 50L40 65H60L50 50Z' /></g></svg>`
  },
  keywords: ['anime online', 'ver anime', 'anime gratis', 'anime español', 'anime subtitulado', 'series de anime', 'comunidad de anime'],
  openGraph: {
    title: 'AnimeVerse | Tu Universo de Anime Online',
    description: 'Explora, descubre y comenta sobre tus series de anime favoritas.',
    url: defaultUrl,
    siteName: 'AnimeVerse',
    locale: 'es_ES',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'AnimeVerse | Tu Universo de Anime Online',
    description: 'La comunidad más grande para fans del anime en español.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <Script
          async
          src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-2817373977587497"
          crossOrigin="anonymous"
          strategy="afterInteractive"
        />
      </head>
      <body
        className={cn(
          'min-h-screen bg-background font-body antialiased',
          fontSans.variable,
          fontHeading.variable
        )}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
