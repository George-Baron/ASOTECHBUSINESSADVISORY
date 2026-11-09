import type { ReactNode } from "react";
import { cn } from "@asotech/utilities";

export function Container({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("mx-auto w-full max-w-6xl px-4 sm:px-6", className)}>{children}</div>;
}

export function Section({ id, children, className, tone = "light" }: { id?: string; children: ReactNode; className?: string; tone?: "light" | "white" | "navy" }) {
  return (
    <section id={id} className={cn("py-14 sm:py-20", tone === "white" && "bg-white", tone === "navy" && "bg-navy text-white", className)}>
      <Container>{children}</Container>
    </section>
  );
}

export function SectionHeading({ kicker, title, children, center, onDark }: { kicker?: string; title: string; children?: ReactNode; center?: boolean; onDark?: boolean }) {
  return (
    <div className={cn("mb-10 max-w-3xl", center && "mx-auto text-center")}>
      {kicker && <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">{kicker}</p>}
      <h2 className={cn("text-3xl font-extrabold leading-tight sm:text-4xl", onDark ? "text-white" : "text-navy")}>{title}</h2>
      {children && <p className={cn("mt-3 text-base sm:text-lg", onDark ? "text-white/80" : "text-slate2")}>{children}</p>}
    </div>
  );
}

export function PageHero({ kicker, title, children, actions }: { kicker?: string; title: string; children?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="relative overflow-hidden bg-gradient-to-br from-navy via-navy-700 to-navy-500 text-white">
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 h-80 w-80 rounded-full bg-brand-orange/20 blur-3xl" />
      <Container className="relative py-14 sm:py-20">
        {kicker && <p className="mb-3 text-xs font-bold uppercase tracking-[0.2em] text-brand-orange">{kicker}</p>}
        <h1 className="max-w-3xl text-3xl font-extrabold leading-tight sm:text-5xl">{title}</h1>
        {children && <p className="mt-4 max-w-2xl text-base text-white/85 sm:text-lg">{children}</p>}
        {actions && <div className="mt-8 flex flex-wrap gap-3">{actions}</div>}
      </Container>
    </div>
  );
}

export function Tick({ children, onDark }: { children: ReactNode; onDark?: boolean }) {
  return (
    <li className="flex gap-2.5">
      <svg aria-hidden viewBox="0 0 20 20" className="mt-1 h-4 w-4 shrink-0 text-brand-orange"><path fill="currentColor" d="M7.6 13.4 4.2 10l-1.2 1.2 4.6 4.6L17 6.4 15.8 5.2z" /></svg>
      <span className={onDark ? "text-white/90" : "text-navy"}>{children}</span>
    </li>
  );
}
