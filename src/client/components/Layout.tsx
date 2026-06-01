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
    <div className="app-shell">
      <div className="app-grain" aria-hidden="true" />
      <div className="app-frame">
        <aside className="app-sidebar">
          <div className="app-brand">
            <div className="app-brand-mark" aria-hidden="true" />
            <div>
              <p>语境单词本</p>
              <span>Context Review Desk</span>
            </div>
          </div>

          <nav className="app-nav" aria-label="主导航">
            {navItems.map((item) => {
              const active = item.match(currentPath);
              return (
                <a
                  key={item.href}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={active ? 'active' : undefined}
                >
                  {item.label}
                  <small>{item.description}</small>
                </a>
              );
            })}
          </nav>

          <div className="app-side-card" aria-label="应用定位">
            <span>local-first</span>
            <strong>本地优先</strong>
            <p>手动制卡、真实语境、FSRS 复习。数据保存在本地，长期使用不依赖云端服务。</p>
          </div>
        </aside>

        <main className="app-main">
          <div className="app-route-title">
            <div>
              <h1>{title}</h1>
              <p>{subtitle}</p>
            </div>
            <span>local-first</span>
          </div>

          <section className="app-content-shell">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
