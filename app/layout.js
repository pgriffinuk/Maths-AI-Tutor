import './globals.css';

export const metadata = {
  title: 'Stepwise — Foundation Maths Coach',
  description: 'Step-by-step marked maths practice and coaching for Edexcel IGCSE Foundation tier'
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
