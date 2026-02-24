import type { Metadata } from 'next'
import { Newsreader, Instrument_Sans } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from '@/components/theme-provider'
import { SpotlightProvider } from '@/components/spotlight-provider'

const newsreader = Newsreader({
  weight: ['200', '300', '400'],
  subsets: ['latin'],
  variable: '--font-newsreader',
  style: ['normal', 'italic'],
})

const instrumentSans = Instrument_Sans({
  weight: ['400', '500', '600'],
  subsets: ['latin'],
  variable: '--font-instrument-sans',
})

export const metadata: Metadata = {
  title: 'XMarks',
  description: 'Personal X bookmark manager',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${newsreader.variable} ${instrumentSans.variable} antialiased bg-[#0C0A09] text-[#E7E5E4]`}>
        <ThemeProvider attribute="class" defaultTheme="dark" enableSystem>
          {children}
        </ThemeProvider>
        <div className="noise-overlay" aria-hidden="true" />
        <SpotlightProvider />
      </body>
    </html>
  )
}
