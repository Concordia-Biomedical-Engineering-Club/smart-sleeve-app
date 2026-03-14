"use client";

import { usePathname } from "next/navigation";
import { Navbar } from "@/components/layout/Navbar";
import { cn } from "@/lib/utils";

export function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === "/login" || pathname === "/register";

  return (
    <div className="flex">
      {!isAuthPage && <Navbar />}
      <main className={cn("flex-1 p-10 min-h-screen", !isAuthPage && "ml-64")}>
        {children}
      </main>
    </div>
  );
}
