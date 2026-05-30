const navItems = ['首页', '制卡', '词义条目', '复习', '标签', '收藏', '统计', '设置'];

export function App() {
  return (
    <main className="min-h-screen bg-slate-50 px-6 py-8 text-slate-900">
      <section className="mx-auto max-w-5xl rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
        <p className="mb-2 text-sm font-medium text-blue-700">语境单词本</p>
        <h1 className="text-3xl font-bold tracking-tight">Context Vocabulary Notebook</h1>
        <p className="mt-3 max-w-2xl text-slate-600">
          本地优先的轻量语境词汇复习工具。
        </p>
        <nav className="mt-8 flex flex-wrap gap-3" aria-label="主导航">
          {navItems.map((item) => (
            <span key={item} className="rounded-full bg-slate-100 px-4 py-2 text-sm font-medium text-slate-700">
              {item}
            </span>
          ))}
        </nav>
      </section>
    </main>
  );
}
