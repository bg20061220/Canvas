import "./globals.css";

export const metadata = {
  title: "Voice Canvas - Design with Your Voice",
  description: "Voice-controlled creative canvas for designing web components",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-[#0a0a1a] text-white min-h-screen">
        {children}
      </body>
    </html>
  );
}
