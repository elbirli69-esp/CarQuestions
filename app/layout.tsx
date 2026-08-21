import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "CarQuestions | ¿Cuánto vale realmente este coche?",
  description:
    "Estima el precio de mercado de un coche de segunda mano, compara anuncios similares y pregunta lo que quieras antes de comprarlo.",
  applicationName: "CarQuestions",
  keywords: [
    "tasación coche",
    "precio mercado segunda mano",
    "comparador coches",
    "BMW X1",
    "CarQuestions",
  ],
  openGraph: {
    title: "CarQuestions",
    description: "Tasador, comparador y asistente para comprar coches de segunda mano.",
    locale: "es_ES",
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full scroll-smooth antialiased`}
    >
      <body className="min-h-full bg-background font-sans text-foreground">
        <TooltipProvider>{children}</TooltipProvider>
      </body>
    </html>
  );
}
