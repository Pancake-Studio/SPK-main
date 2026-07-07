"use client";

import * as React from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { Logo } from "./logo";
import { SidebarNav } from "./sidebar-nav";
import { ThemeToggle } from "./theme-toggle";
import { UserMenu } from "./user-menu";
import { Button } from "@/components/ui/button";
import { roleLabel } from "@/lib/role";
import { navForRole } from "@/lib/nav";

type AppShellProps = {
  role: string;
  user: { name: string; email: string; avatarUrl?: string | null };
  bell: React.ReactNode;
  children: React.ReactNode;
};

function SidebarContent({ role, onNavigate }: { role: string; onNavigate?: () => void }) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex h-[72px] items-center px-6">
        <Logo />
      </div>
      <div className="px-6 pb-2">
        <span className="inline-flex rounded-full bg-secondary px-2.5 py-1 text-xs font-medium text-secondary-foreground">
          {roleLabel(role)}
        </span>
      </div>
      <div className="flex-1 overflow-y-auto py-2 scrollbar-thin">
        <SidebarNav items={navForRole(role)} onNavigate={onNavigate} />
      </div>
      <div className="border-t border-sidebar-border px-6 py-4">
        <p className="text-xs text-muted-foreground">School Productivity Kits · v0.1</p>
      </div>
    </div>
  );
}

export function AppShell({ role, user, bell, children }: AppShellProps) {
  const [mobileOpen, setMobileOpen] = React.useState(false);
  const pathname = usePathname();

  // Close the mobile drawer on route change.
  React.useEffect(() => setMobileOpen(false), [pathname]);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] border-r border-sidebar-border bg-sidebar lg:block">
        <SidebarContent role={role} />
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="lg:hidden">
            <motion.div
              className="fixed inset-0 z-40 bg-black/50"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              className="fixed inset-y-0 left-0 z-50 w-[280px] border-r border-sidebar-border bg-sidebar"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ duration: 0.22, ease: "easeOut" }}
            >
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="ปิดเมนู"
                className="absolute right-3 top-5 rounded-md p-1.5 text-muted-foreground hover:bg-muted"
              >
                <X className="size-5" />
              </button>
              <SidebarContent role={role} onNavigate={() => setMobileOpen(false)} />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      {/* Main column */}
      <div className="lg:pl-[280px]">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-2 border-b border-border bg-background/85 px-4 backdrop-blur sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="เปิดเมนู"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" />
          </Button>
          <div className="lg:hidden">
            <Logo withText={false} />
          </div>
          <div className="flex-1" />
          <ThemeToggle />
          {bell}
          <div className="ml-1">
            <UserMenu name={user.name} email={user.email} role={role} avatarUrl={user.avatarUrl} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
