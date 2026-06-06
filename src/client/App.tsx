import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Layout, type NavItem } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { CardCreatePage } from './pages/CardCreatePage';
import { CardDetailPage } from './pages/CardDetailPage';
import { CardListPage } from './pages/CardListPage';
import { FavoritesPage } from './pages/FavoritesPage';
import { TagsPage } from './pages/TagsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { ReviewPage } from './pages/ReviewPage';
import { SettingsPage } from './pages/SettingsPage';
import { StatisticsPage } from './pages/StatisticsPage';
import { useI18n } from './i18n/I18nProvider';

function currentHashPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

function getNavItems(t: (key: any) => string): NavItem[] {
  return [
    { href: '#/', label: t('nav.home.label'), description: t('nav.home.description'), match: (path) => path === '/' },
    { href: '#/create', label: t('nav.create.label'), description: t('nav.create.description'), match: (path) => path === '/create' },
    { href: '#/cards', label: t('nav.cards.label'), description: t('nav.cards.description'), match: (path) => path === '/cards' || path.startsWith('/cards/') },
    { href: '#/review', label: t('nav.review.label'), description: t('nav.review.description'), match: (path) => path === '/review' },
    { href: '#/tags', label: t('nav.tags.label'), description: t('nav.tags.description'), match: (path) => path === '/tags' },
    { href: '#/favorites', label: t('nav.favorites.label'), description: t('nav.favorites.description'), match: (path) => path === '/favorites' },
    { href: '#/statistics', label: t('nav.statistics.label'), description: t('nav.statistics.description'), match: (path) => path === '/statistics' },
    { href: '#/settings', label: t('nav.settings.label'), description: t('nav.settings.description'), match: (path) => path === '/settings' },
  ];
}

interface RouteResult {
  title: string;
  subtitle: string;
  element: ReactNode;
}

function routeFor(path: string, t: (key: any) => string): RouteResult {
  if (path === '/') {
    return { title: t('nav.home.title'), subtitle: t('nav.home.description'), element: <HomePage /> };
  }
  if (path === '/create') {
    return { title: t('nav.create.title'), subtitle: t('nav.create.description'), element: <CardCreatePage /> };
  }
  if (path === '/cards') {
    return { title: t('nav.cards.title'), subtitle: t('nav.cards.description'), element: <CardListPage /> };
  }
  if (path.startsWith('/cards/')) {
    return { title: t('nav.cards.title'), subtitle: t('nav.cards.description'), element: <CardDetailPage key={path} /> };
  }
  if (path === '/review') {
    return { title: t('nav.review.title'), subtitle: t('nav.review.description'), element: <ReviewPage /> };
  }
  if (path === '/tags') {
    return { title: t('nav.tags.title'), subtitle: t('nav.tags.description'), element: <TagsPage /> };
  }
  if (path === '/favorites') {
    return { title: t('nav.favorites.title'), subtitle: t('nav.favorites.description'), element: <FavoritesPage /> };
  }
  if (path === '/statistics') {
    return { title: t('nav.statistics.title'), subtitle: t('nav.statistics.description'), element: <StatisticsPage /> };
  }
  if (path === '/settings') {
    return { title: t('nav.settings.title'), subtitle: t('nav.settings.description'), element: <SettingsPage /> };
  }
  return { title: t('nav.notFound.title'), subtitle: t('nav.notFound.message'), element: <PlaceholderPage message={t('nav.notFound.message')} phase="Phase 6" /> };
}

export function App() {
  const [path, setPath] = useState(currentHashPath);
  const { t } = useI18n();

  useEffect(() => {
    const onHashChange = () => setPath(currentHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const routePath = path.split('?')[0] || '/';
  const route = useMemo(() => routeFor(routePath, t), [routePath, t]);
  const items = useMemo(() => getNavItems(t), [t]);

  return (
    <Layout navItems={items} currentPath={routePath} title={route.title} subtitle={route.subtitle}>
      {route.element}
    </Layout>
  );
}
