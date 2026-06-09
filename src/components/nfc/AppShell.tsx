import { Link } from "@tanstack/react-router";
import { ArrowRight, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

interface Props {
  title: string;
  icon?: LucideIcon;
  children: ReactNode;
  back?: boolean;
}

export function AppShell({ title, icon: Icon, children, back = true }: Props) {
  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground pb-10">
      <header className="sticky top-0 z-10 border-b border-border/60 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-md items-center gap-3 px-4 py-3">
          {back && (
            <Link
              to="/"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-secondary-foreground transition hover:bg-secondary/70"
              aria-label="رجوع"
            >
              <ArrowRight className="h-4 w-4" />
            </Link>
          )}
          <div className="flex items-center gap-2">
            {Icon && <Icon className="h-5 w-5 text-primary" />}
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
        </div>
      </header>
      <main className="mx-auto max-w-md px-4 pt-5">{children}</main>
    </div>
  );
}
