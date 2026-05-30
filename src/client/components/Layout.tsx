import type { ReactNode } from 'react';

export interface NavItem {
  href: string;
  label: string;
  description: string;
  match: (hashPath: string) => boolean;
}

interface LayoutProps {
  navItems: NavItem[];
  currentPath: string;
  title: string;
  subtitle: string;
  children: ReactNode;
}

export function Layout({ navItems, currentPath, title, subtitle, children }: LayoutProps) {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 md:flex-row md:px-6 lg:px-8">
        <aside className="md:w-72 md:shrink-0">
          <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 md:sticky md:top-6">
            <p className="text-lg font-bold text-slate-950">语境单词本</p>
            <p className="mt-1 text-sm text-slate-500">Context Vocabulary Notebook</p>
            <nav className="mt-6 space-y-1" aria-label="主导航">
              {navItems.map((item) => {
                const active = item.match(currentPath);
                return (
                  <a
                    key={item.href}
                    href={item.href}
                    aria-current={active ? 'page' : undefined}
                    className={`block rounded-xl px-3 py-2 transition ${active ? 'bg-blue-50 text-blue-700 ring-1 ring-blue-100' : 'text-slate-700 hover:bg-slate-100'}`}
                  >
                    <span className="block text-sm font-semibold">{item.label}</span>
                    <span className="block text-xs text-slate-500">{item.description}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <section className="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200 md:p-8">
            <p className="text-sm font-medium text-blue-700">{subtitle}</p>
            <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-950">{title}</h1>
            <div className="mt-6">{children}</div>
          </section>
        </main>
      </div>
    </div>
  );
}
