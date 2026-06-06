import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';

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
  const { t } = useI18n();

  return (
    <div className="app-shell">
      <div className="app-grain" aria-hidden="true" />
      <div className="app-frame">
        <aside className="app-sidebar">
          <div className="app-brand">
            <div className="app-brand-mark" aria-hidden="true" />
            <div>
              <p>{t('app.brand')}</p>
              <span>{t('app.brandSubtitle')}</span>
            </div>
          </div>

          <nav className="app-nav" aria-label={t('app.navigation')}>
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
        </aside>

        <main className="app-main">
          <h1 className="sr-only">{title}</h1>
          <p className="sr-only">{subtitle}</p>
          <section className="app-content-shell">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
