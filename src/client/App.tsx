import { useEffect, useMemo, useState, type ReactNode } from 'react';

import { Layout, type NavItem } from './components/Layout';
import { HomePage } from './pages/HomePage';
import { PlaceholderPage } from './pages/PlaceholderPage';

function currentHashPath(): string {
  const hash = window.location.hash.replace(/^#/, '');
  return hash || '/';
}

const navItems: NavItem[] = [
  { href: '#/', label: '首页', description: '今日复习与快速入口', match: (path) => path === '/' },
  { href: '#/create', label: '制卡', description: '创建词义和语境', match: (path) => path === '/create' },
  { href: '#/cards', label: '词义条目', description: '搜索、筛选、管理', match: (path) => path === '/cards' || path.startsWith('/cards/') },
  { href: '#/review', label: '复习', description: 'Again / Good 复习', match: (path) => path === '/review' },
  { href: '#/tags', label: '标签', description: '分类和来源标记', match: (path) => path === '/tags' },
  { href: '#/favorites', label: '收藏', description: '查看收藏词义', match: (path) => path === '/favorites' },
  { href: '#/statistics', label: '统计', description: '复习和标签分析', match: (path) => path === '/statistics' },
  { href: '#/settings', label: '设置', description: '语言、目标和导入导出', match: (path) => path === '/settings' },
];

interface RouteResult {
  title: string;
  subtitle: string;
  element: ReactNode;
}

function routeFor(path: string): RouteResult {
  if (path === '/') {
    return { title: '首页', subtitle: '今日概览', element: <HomePage /> };
  }
  if (path === '/create') {
    return { title: '制卡', subtitle: '添加真实视频语境', element: <PlaceholderPage message="制卡页会支持新建词义和添加到已有词义" phase="Phase 6" /> };
  }
  if (path === '/cards') {
    return { title: '词义条目', subtitle: '管理所有词义', element: <PlaceholderPage message="词义条目页会支持搜索、筛选、分页和状态操作" phase="Phase 6" /> };
  }
  if (path.startsWith('/cards/')) {
    return { title: '词义详情', subtitle: '查看和维护语境', element: <PlaceholderPage message="词义详情页会展示语境、媒体、标签和复习信息" phase="Phase 6" /> };
  }
  if (path === '/review') {
    return { title: '复习', subtitle: 'FSRS 调度', element: <PlaceholderPage message="复习页会显示主语境原句并提供 Again / Good" phase="Phase 7" /> };
  }
  if (path === '/tags') {
    return { title: '标签管理', subtitle: '自由分类和来源标记', element: <PlaceholderPage message="标签页会支持新增、编辑、删除和查看标签下词义" phase="Phase 6" /> };
  }
  if (path === '/favorites') {
    return { title: '收藏', subtitle: '重点词义', element: <PlaceholderPage message="收藏页会展示和管理已收藏词义" phase="Phase 6" /> };
  }
  if (path === '/statistics') {
    return { title: '统计', subtitle: '复习分析', element: <PlaceholderPage message="统计页会展示复习趋势、正确率和标签分布" phase="Phase 7" /> };
  }
  if (path === '/settings') {
    return { title: '设置', subtitle: '本地 V1 设置', element: <PlaceholderPage message="设置页会支持语言、每日目标和数据导入导出" phase="Phase 7" /> };
  }
  return { title: '页面不存在', subtitle: '未知路由', element: <PlaceholderPage message="未找到对应页面" phase="Phase 6" /> };
}

export function App() {
  const [path, setPath] = useState(currentHashPath);

  useEffect(() => {
    const onHashChange = () => setPath(currentHashPath());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const route = useMemo(() => routeFor(path), [path]);

  return (
    <Layout navItems={navItems} currentPath={path} title={route.title} subtitle={route.subtitle}>
      {route.element}
    </Layout>
  );
}
