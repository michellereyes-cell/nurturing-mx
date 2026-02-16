import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Nurturing MX - Dashboard de conversión | Tiendanube",
  description: "Dashboard de conversión de nurturing para Tiendanube México",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className="min-h-screen antialiased">
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-4">
            <a
              href="https://www.tiendanube.com/mx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0"
              aria-label="Tiendanube"
            >
              <svg
                width="140"
                height="24"
                viewBox="0 0 140 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="text-nimbus-primary"
              >
                <path
                  d="M12 0L0 12l12 12 12-12L12 0zm0 4.8L7.2 9.6 12 14.4l4.8-4.8L12 4.8z"
                  fill="currentColor"
                />
                <text
                  x="32"
                  y="17"
                  fill="currentColor"
                  fontSize="16"
                  fontWeight="600"
                  fontFamily="system-ui, sans-serif"
                >
                  Tiendanube
                </text>
              </svg>
            </a>
            <span className="text-gray-400">|</span>
            <h1 className="text-lg font-semibold text-nimbus-text-high">
              Nurturing MX – Dashboard de conversión
            </h1>
          </div>
        </header>
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
