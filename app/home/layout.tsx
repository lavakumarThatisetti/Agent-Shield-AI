import type { ReactNode } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/layout/app-sidebar";
import { TopHeader } from "@/components/layout/top-header";
import { SESSION_COOKIE, verifySessionToken } from "@/lib/auth/session";

export default async function HomeLayout({ children }: { children: ReactNode }) {
  const cookieStore = await cookies();
  const session = cookieStore.get(SESSION_COOKIE)?.value;

  if (!verifySessionToken(session)) {
    redirect("/login");
  }

  return (
    <div className="product-shell">
      <AppSidebar />
      <main className="product-main">
        <TopHeader />
        {children}
      </main>
    </div>
  );
}
