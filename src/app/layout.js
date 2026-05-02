import { Toaster } from "react-hot-toast";
import Navigation from "@/components/Navigation";
import ClientWrapper from "@/components/ClientWrapper";
import "./globals.css";

export const metadata = {
  title: "Neural Nurture",
  description: "Neural Nurture - Precision Healthcare Platform",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="scroll-smooth" data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1e293b" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&amp;display=swap" rel="stylesheet" />
        <script dangerouslySetInnerHTML={{__html: `if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/sw.js').catch(()=>{}));}`}} />
        <style dangerouslySetInnerHTML={{__html: `
          .material-symbols-outlined {
              font-variation-settings: 'FILL' 0, 'wght' 400, 'GRAD' 0, 'opsz' 24;
          }
          .glass-card {
              background: rgba(255, 255, 255, 0.4);
              backdrop-filter: blur(20px);
              -webkit-backdrop-filter: blur(20px);
          }
          .gradient-text {
              background: linear-gradient(135deg, #4d5e8b 0%, #b4c5f9 100%);
              -webkit-background-clip: text;
              -webkit-text-fill-color: transparent;
          }
          .primary-gradient-btn {
              background: linear-gradient(135deg, #4d5e8b 0%, #b4c5f9 100%);
          }
        `}} />
      </head>
      <body className="bg-background text-on-background font-body selection:bg-primary-container selection:text-on-primary-container" suppressHydrationWarning>
        <Toaster position="top-right" reverseOrder={false} />
        <Navigation />
        <ClientWrapper>
          {children}
        </ClientWrapper>
      </body>
    </html>
  );
}
