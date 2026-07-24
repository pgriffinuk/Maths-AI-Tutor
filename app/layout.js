import './globals.css';

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
