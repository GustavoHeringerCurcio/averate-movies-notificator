import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import AppNavbar from './components/AppNavbar';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: 'Averate',
  description: 'Averate dashboard for now-playing movies with cached RapidAPI ratings.',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <AppNavbar />
        <main className="flex-1">{children}</main>
      </body>
    </html>
  );
}
