import type { ReactNode } from 'react';
import { useI18n } from '../i18n/I18nProvider';
import { GlobalReviewBackdrop } from './GlobalReviewBackdrop';

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
    <div className="app-shell" data-route={currentPath}>
      <GlobalReviewBackdrop currentPath={currentPath} />
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
                  <span className="app-nav-label">{item.label}</span>
                  <span className="sr-only">{item.description}</span>
                </a>
              );
            })}
          </nav>

          <div className="app-sidebar-crystals" aria-hidden="true">
            <i />
            <i />
            <i />
            <span />
          </div>
        </aside>

        <main className="app-main">
          {currentPath === '/' ? (
            <>
              <h1 className="sr-only">{title}</h1>
              <p className="sr-only">{subtitle}</p>
            </>
          ) : (
            <header className="app-page-header">
              <div className="app-page-header-copy">
                <span className="app-page-kicker" aria-hidden="true">Lexicon · Archive</span>
                <h1>{title}</h1>
                <p>{subtitle}</p>
              </div>
              <span className="app-page-sigil" aria-hidden="true">
                <i className="app-page-sigil-crystal" />
                <i className="app-page-sigil-book" />
              </span>
            </header>
          )}
          <section className="app-content-shell">
            {children}
          </section>
        </main>
      </div>
    </div>
  );
}
