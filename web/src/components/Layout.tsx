import type { ReactNode } from "react";

interface LayoutProps {
  sidebar: ReactNode;
  main: ReactNode;
}

export function Layout({ sidebar, main }: LayoutProps) {
  return (
    <div className="flex h-screen overflow-hidden">
      <aside className="w-72 flex-shrink-0 border-r border-zinc-800 overflow-y-auto bg-zinc-900">
        {sidebar}
      </aside>
      <main className="flex-1 overflow-y-auto">{main}</main>
    </div>
  );
}
