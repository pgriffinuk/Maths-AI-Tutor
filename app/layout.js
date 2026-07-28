import { Zilla_Slab, Inter, JetBrains_Mono, Caveat } from 'next/font/google';
import './globals.css';
import 'katex/dist/katex.min.css';
import { ToastProvider } from './components/Toast';

const zillaSlab = Zilla_Slab({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  variable: '--font-zilla-slab',
  display: 'swap'
});

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap'
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-jetbrains-mono',
  display: 'swap'
});

const caveat = Caveat({
  subsets: ['latin'],
  weight: ['500', '600'],
  variable: '--font-caveat',
  display: 'swap'
});

export const metadata = {
  title: 'Stepwise — Maths Coach',
  description: 'Step-by-step marked maths practice and coaching, GCSE to A Level Further Maths'
};

export const viewport = {
  width: 'device-width',
  initialScale: 1
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${zillaSlab.variable} ${inter.variable} ${jetbrainsMono.variable} ${caveat.variable}`}>
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
