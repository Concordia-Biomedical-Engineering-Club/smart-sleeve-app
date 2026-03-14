"use client";

import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { usePathname } from "next/navigation";

const inter = Inter({ subsets: ["latin"] });

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";

  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "bg-background min-h-screen")}>
        <AuthProvider>
          <div className="flex">
            {!isLoginPage && <Navbar />}
            <main className={cn("flex-1 p-10 min-h-screen", !isLoginPage && "ml-64")}>
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
