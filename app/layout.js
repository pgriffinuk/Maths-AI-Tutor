import './globals.css';

export const metadata = {
  title: 'Foundation Maths — Marked Practice',
  description: 'AI-marked Edexcel IGCSE Foundation maths practice'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
