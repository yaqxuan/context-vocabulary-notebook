import type { SupportedLanguage } from '../../shared/constants';

export const zh = {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
};

export const translations: Record<SupportedLanguage, typeof zh> = {
  '中文': zh,
  '英语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "Loading...",
    "loadFailed": "Load failed",
    "retry": "Retry",
    "confirm": "Confirm",
    "cancel": "Cancel",
    "save": "Save",
    "saving": "Saving...",
    "delete": "Delete",
    "edit": "Edit",
    "none": "None",
    "fileUnavailable": "File unavailable"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "Settings",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "Reviewing",
    "mastered": "Mastered",
    "favorite": "Favorited"
  },
  "pagination": {
    "summary": "Page {page} of {totalPages} (Total {total})",
    "pageSize": "Page size",
    "previous": "Previous",
    "next": "Next"
  },
  "catalogue": {
    "filters": "Filters",
    "actions": "Actions",
    "empty": "No matching cards",
    "loading": "Loading cards...",
    "total": "Total {total} cards",
    "noContext": "No context",
    "markMastered": "Mark as mastered",
    "restoreReview": "Restore review",
    "clearFilters": "Clear filters",
    "createLink": "Go to create",
    "notFavorite": "Not favorite",
    "removeFavorite": "Remove favorite",
    "addFavorite": "Favorite",
    "search": "Search",
    "searchPlaceholder": "Search words, definitions, sentences, tags or notes",
    "tagLabel": "Tags",
    "allTags": "All tags",
    "statusLabel": "Status",
    "allStatus": "All status",
    "favoriteLabel": "Favorites",
    "allFavorite": "All",
    "onlyFavorite": "Only favorites",
    "itemUnit": " items",
    "viewDetail": "View detail",
    "contextCount": "{count} contexts"
  },
  "tags": {
    "title": "Tags",
    "loadTimeout": "Loading tags timed out, please try again",
    "loadFailed": "Loading tags failed",
    "nameRequired": "Tag name is required",
    "createFailed": "Failed to create tag",
    "reload": "Reload tags",
    "loading": "Loading tags...",
    "empty": "No available tags",
    "newLabel": "New tag name",
    "newPlaceholder": "e.g. Movie",
    "createAction": "Create and select tag"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
},
  '日语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
},
  '韩语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
},
  '法语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
},
  '德语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
},
  '西班牙语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
},
  '俄语': {
  "app": {
    "brand": "语境单词本",
    "brandSubtitle": "在语境中学习单词",
    "navigation": "导航"
  },
  "common": {
    "loading": "加载中...",
    "loadFailed": "加载失败",
    "retry": "重试",
    "confirm": "确认",
    "cancel": "取消",
    "save": "保存",
    "saving": "保存中...",
    "delete": "删除",
    "edit": "编辑",
    "none": "无",
    "fileUnavailable": "文件不可用"
  },
  "nav": {
    "home": {
      "label": "主页",
      "title": "主页",
      "description": "返回主页"
    },
    "create": {
      "label": "新建",
      "title": "新建卡片",
      "description": "创建新卡片"
    },
    "cards": {
      "label": "卡片",
      "title": "所有卡片",
      "description": "浏览卡片"
    },
    "review": {
      "label": "复习",
      "title": "开始复习",
      "description": "复习卡片"
    },
    "tags": {
      "label": "标签",
      "title": "标签管理",
      "description": "管理标签"
    },
    "favorites": {
      "label": "收藏",
      "title": "我的收藏",
      "description": "收藏的卡片"
    },
    "statistics": {
      "label": "统计",
      "title": "学习统计",
      "description": "查看统计"
    },
    "settings": {
      "label": "设置",
      "title": "系统设置",
      "description": "修改设置"
    },
    "notFound": {
      "title": "未找到",
      "message": "页面不存在"
    }
  },
  "status": {
    "reviewing": "复习中",
    "mastered": "已熟记",
    "favorite": "已收藏"
  },
  "pagination": {
    "summary": "第 {page} 页，共 {totalPages} 页（总计 {total} 项）",
    "pageSize": "每页数量",
    "previous": "上一页",
    "next": "下一页"
  },
  "catalogue": {
    "filters": "筛选",
    "actions": "操作",
    "empty": "没有符合条件的卡片",
    "loading": "加载卡片中...",
    "total": "共 {total} 张卡片",
    "noContext": "暂无语境",
    "markMastered": "标记为已掌握",
    "restoreReview": "恢复复习",
    "clearFilters": "清除筛选",
    "createLink": "去制卡",
    "notFavorite": "未收藏",
    "removeFavorite": "取消收藏",
    "addFavorite": "收藏",
    "search": "搜索",
    "searchPlaceholder": "搜索单词、释义、原句、标签或备注",
    "tagLabel": "标签",
    "allTags": "全部标签",
    "statusLabel": "状态",
    "allStatus": "全部状态",
    "favoriteLabel": "收藏",
    "allFavorite": "全部",
    "onlyFavorite": "仅收藏",
    "itemUnit": " 个词义条目",
    "viewDetail": "查看详情",
    "contextCount": "{count} 条语境"
  },
  "tags": {
    "title": "标签",
    "loadTimeout": "标签列表加载超时，请重试",
    "loadFailed": "标签列表加载失败",
    "nameRequired": "标签名称必填",
    "createFailed": "新增标签失败",
    "reload": "重新加载标签",
    "loading": "加载标签中…",
    "empty": "暂无可选标签",
    "newLabel": "新增标签名称",
    "newPlaceholder": "例如：电影",
    "createAction": "新增并选中标签"
  },
  "settings": {
    "learning": {
      "title": "学习设置",
      "interfaceLanguage": "界面语言",
      "defaultTargetLanguage": "默认学习语言",
      "defaultDefinitionLanguage": "默认释义语言",
      "dailyReviewLimit": "每日复习上限",
      "positiveInteger": "必须是正整数",
      "save": "保存学习设置",
      "saved": "已保存",
      "saveFailed": "保存失败",
      "loadFailed": "加载失败"
    },
    "ai": {
      "title": "AI 设置",
      "description": "配置 AI 助手",
      "loading": "加载中...",
      "empty": "未配置",
      "loadFailed": "加载失败",
      "saved": "已保存"
    },
    "export": {
      "title": "导出数据"
    },
    "import": {
      "title": "导入数据",
      "done": "导入完成"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建"
  },
  "detail": {
    "title": "详情"
  },
  "review": {
    "title": "复习"
  },
  "statistics": {
    "title": "统计"
  },
  "placeholder": {
    "text": "占位符"
  }
}
};

export function getTranslationKeys(tree: any, prefix = ''): string[] {
  let keys: string[] = [];
  for (const key in tree) {
    const value = tree[key];
    const newPrefix = prefix ? `${prefix}.${key}` : key;
    if (typeof value === 'string') {
      keys.push(newPrefix);
    } else if (typeof value === 'object' && value !== null) {
      keys = keys.concat(getTranslationKeys(value, newPrefix));
    }
  }
  return keys.sort();
}
