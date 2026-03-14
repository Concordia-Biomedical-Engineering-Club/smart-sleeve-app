import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { ShellLayout } from "@/components/layout/ShellLayout";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "SmartSleeve Clinician Portal",
  description: "Clinical monitoring dashboard for Smart Sleeve patients",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={cn(inter.className, "bg-background min-h-screen")}>
        <AuthProvider>
          <ShellLayout>{children}</ShellLayout>
        </AuthProvider>
      </body>
    </html>
  );
}
