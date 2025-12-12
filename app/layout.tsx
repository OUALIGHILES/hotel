import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import ClientLayout from './client-layout'
import "./globals.css"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "Wellhost",
  description: "Hotel Reservation & Property Management System",
  generator: "Wellhost PMS",
  icons: {
    icon: [
      {
        url: "/logo_lightmode.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/logo_darckmode.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/logo_lightmode.png",
        type: "image/png",
      },
    ],
    apple: "/apple-icon.png",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" dir="ltr" suppressHydrationWarning>
      <body className={`font-sans antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
        <Analytics />
      </body>
    </html>
  )
}
