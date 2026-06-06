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
  "cards": {
    "list": {
      "title": "词义条目",
      "subtitle": "搜索、筛选和管理所有词义卡。",
      "loadFailed": "无法加载词义条目",
      "statusFailed": "更新复习状态失败",
      "favoriteFailed": "更新收藏状态失败",
      "empty": "还没有词义条目",
      "filteredEmpty": "没有匹配的词义条目"
    }
  },
  "favorites": {
    "title": "收藏",
    "subtitle": "集中查看你标记过的重点词义。",
    "loadFailed": "无法加载收藏词义",
    "empty": "还没有收藏词义",
    "filteredEmpty": "收藏里没有匹配的词义条目"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "尚未选择文件",
    "loadFailed": "加载词义失败",
    "loadTagsFailed": "加载已有词义标签失败",
    "videoTypeError": "仅支持 mp4 本地视频文件",
    "screenshotTypeError": "仅支持 jpg、png 或 webp 截图",
    "audioTypeError": "仅支持 mp3 音频文件",
    "targetWordRequired": "目标单词必填",
    "meaningRequired": "当前语境释义必填",
    "sentenceRequired": "原句必填",
    "appendSuccess": "已添加新语境",
    "createSuccess": "已创建词义条目",
    "saveFailed": "保存失败",
    "saving": "保存中…",
    "addToExisting": "添加为新语境",
    "createCard": "保存词义条目",
    "findExistingTitle": "添加到已有词义",
    "findExisting": "查找已有词义，避免重复建卡",
    "viewAllCards": "查看全部词义条目",
    "formAria": "制卡表单",
    "sentence": "原句",
    "sentenceHelp": "先写完整语境句子，再填写生词。",
    "targetWord": "目标单词",
    "targetWordPlaceholder": "例如：charge",
    "meaning": "当前语境释义",
    "meaningPlaceholder": "例如：收费",
    "meaningHelp": "只写这个语境下的意思。Enter 或点击建议采纳，Backspace 删除建议。",
    "aiSuggestionPrefix": "AI 建议：",
    "targetLanguage": "学习语言",
    "definitionLanguage": "释义语言",
    "tags": "标签",
    "aiSuggestion": "AI 建议",
    "aiGenerating": "AI 建议生成中…",
    "aiNoteHelp": "可保留、修改或删除这条语境用法说明。",
    "mediaSectionAria": "语境附件",
    "mediaSectionTitle": "语境附件",
    "mediaSectionHelp": "本地视频强烈推荐但不强制，截图和音频可补充当时语境。",
    "media": {
      "video": "本地视频 mp4",
      "badgeRecommended": "推荐",
      "uploadVideo": "上传本地视频",
      "screenshot": "截图 jpg / png / webp",
      "badgeOptional": "可选",
      "uploadScreenshot": "上传截图",
      "audio": "音频 mp3",
      "uploadAudio": "上传音频"
    },
    "appendContext": "正在为已有词义添加语境：{word} = {meaning}",
    "findingExisting": "正在查找已有词义……",
    "findExistingError": "已有词义加载失败，可以继续创建新条目",
    "exactMatchFound": "已找到相同词义：{word} = {meaning}",
    "otherMeaningNotice": "不同语义，仅供参考",
    "noCardsYet": "还没有这个单词的词义条目",
    "createNewCard": "创建新的词义条目",
    "newWordFallback": "新单词",
    "firstContextNotice": "当前语境会成为第一条主语境",
    "noSameMeaning": "未找到相同词义",
    "foundSameWord": "已找到同名词义，请确认是否相同："
  },
  "detail": {
    "title": "详情",
    "statusMastered": "已熟记：暂不进入复习队列，恢复复习后继续使用当前复习状态。",
    "statusReviewingNoDue": "正在复习中：已进入复习队列，可以现在复习。",
    "statusReviewingNow": "正在复习中：已进入复习队列，可以现在复习。",
    "statusReviewingDue": "复习中：下次复习 {date}。",
    "loadFailed": "无法加载词义详情",
    "actionFailed": "操作失败",
    "saveMeaningFailed": "保存释义失败",
    "saveTagsFailed": "保存标签失败",
    "loading": "正在加载词义详情……",
    "notFound": "词义条目不存在",
    "editMeaningAria": "编辑当前语境释义",
    "saveMeaning": "保存释义",
    "editMeaning": "编辑释义",
    "addContext": "添加语境",
    "deleteCard": "删除词义",
    "allContexts": "全部语境",
    "contextNumber": "语境 {number}",
    "primaryContext": "主语境",
    "moveUp": "上移",
    "moveDown": "下移",
    "setPrimary": "设为主语境",
    "deleteContext": "删除语境",
    "reviewInfo": "复习信息",
    "repsCount": "复习次数：{count}",
    "lapsesCount": "遗忘次数：{count}",
    "tagsTitle": "词义标签",
    "saveTags": "保存标签",
    "noTagsHint": "暂无标签，可点击“编辑标签”添加",
    "editTags": "编辑标签",
    "deleteCardTitle": "删除词义条目",
    "deleteCardMessage": "会软删除这个词义条目、语境实例和媒体记录。确认删除？",
    "deleteCardFailed": "删除词义失败",
    "deleteContextTitle": "删除语境实例",
    "deleteContextMessage": "会软删除这个语境和它的媒体记录。确认删除？"
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
  "cards": {
    "list": {
      "title": "Meaning Entries",
      "subtitle": "Search, filter, and manage all meaning cards.",
      "loadFailed": "Failed to load meaning entries",
      "statusFailed": "Failed to update review status",
      "favoriteFailed": "Failed to update favorite status",
      "empty": "No meaning entries yet",
      "filteredEmpty": "No matching meaning entries"
    }
  },
  "favorites": {
    "title": "Favorites",
    "subtitle": "View your marked important meaning entries.",
    "loadFailed": "Failed to load favorite entries",
    "empty": "No favorite entries yet",
    "filteredEmpty": "No matching entries in favorites"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "No file selected",
    "loadFailed": "Failed to load meaning",
    "loadTagsFailed": "Failed to load existing tags",
    "videoTypeError": "Only mp4 local video files are supported",
    "screenshotTypeError": "Only jpg, png, or webp screenshots are supported",
    "audioTypeError": "Only mp3 audio files are supported",
    "targetWordRequired": "Target word is required",
    "meaningRequired": "Context meaning is required",
    "sentenceRequired": "Sentence is required",
    "appendSuccess": "New context added",
    "createSuccess": "Meaning entry created",
    "saveFailed": "Save failed",
    "saving": "Saving...",
    "addToExisting": "Add as new context",
    "createCard": "Create card",
    "findExistingTitle": "Add to existing meaning",
    "findExisting": "Find existing meaning to avoid duplicates",
    "viewAllCards": "View all cards",
    "formAria": "Card creation form",
    "sentence": "Sentence",
    "sentenceHelp": "Write the complete sentence first, then fill in the target word.",
    "targetWord": "Target word",
    "targetWordPlaceholder": "e.g.: charge",
    "meaning": "Context meaning",
    "meaningPlaceholder": "e.g.: charge fee",
    "meaningHelp": "Write only the meaning in this context. Enter or click to accept suggestion, Backspace to delete.",
    "aiSuggestionPrefix": "AI Suggestion: ",
    "targetLanguage": "Target Language",
    "definitionLanguage": "Definition Language",
    "tags": "Tags",
    "aiSuggestion": "AI Suggestion",
    "aiGenerating": "Generating AI suggestion...",
    "aiNoteHelp": "You can keep, modify, or delete this usage note.",
    "mediaSectionAria": "Context media",
    "mediaSectionTitle": "Context media",
    "mediaSectionHelp": "Local video is highly recommended but not mandatory; screenshots and audio can supplement the context.",
    "media": {
      "video": "Local video mp4",
      "badgeRecommended": "Recommended",
      "uploadVideo": "Upload video",
      "screenshot": "Screenshot jpg / png / webp",
      "badgeOptional": "Optional",
      "uploadScreenshot": "Upload screenshot",
      "audio": "Audio mp3",
      "uploadAudio": "Upload audio"
    },
    "appendContext": "Adding context to existing meaning: {word} = {meaning}",
    "findingExisting": "Finding existing meaning...",
    "findExistingError": "Failed to load existing meaning, you can continue to create a new entry",
    "exactMatchFound": "Exact meaning found: {word} = {meaning}",
    "otherMeaningNotice": "Different meaning, for reference only",
    "noCardsYet": "No meaning entries for this word yet",
    "createNewCard": "Create new meaning entry",
    "newWordFallback": "New word",
    "firstContextNotice": "Current context will become the first main context",
    "noSameMeaning": "No identical meaning found",
    "foundSameWord": "Meaning with same word found, please confirm if identical:"
  },
  "detail": {
    "title": "详情",
    "statusMastered": "Mastered: Will not enter review queue until restored.",
    "statusReviewingNoDue": "Reviewing: In queue, can review now.",
    "statusReviewingNow": "Reviewing: In queue, can review now.",
    "statusReviewingDue": "Reviewing: Next review {date}.",
    "loadFailed": "Failed to load meaning detail",
    "actionFailed": "Action failed",
    "saveMeaningFailed": "Failed to save meaning",
    "saveTagsFailed": "Failed to save tags",
    "loading": "Loading meaning detail...",
    "notFound": "Meaning entry not found",
    "editMeaningAria": "Edit context meaning",
    "saveMeaning": "Save meaning",
    "editMeaning": "Edit meaning",
    "addContext": "Add context",
    "deleteCard": "Delete meaning",
    "allContexts": "All contexts",
    "contextNumber": "Context {number}",
    "primaryContext": "Primary context",
    "moveUp": "Move up",
    "moveDown": "Move down",
    "setPrimary": "Set as primary",
    "deleteContext": "Delete context",
    "reviewInfo": "Review info",
    "repsCount": "Reps: {count}",
    "lapsesCount": "Lapses: {count}",
    "tagsTitle": "Tags",
    "saveTags": "Save tags",
    "noTagsHint": "No tags, click 'Edit tags' to add",
    "editTags": "Edit tags",
    "deleteCardTitle": "Delete Meaning Entry",
    "deleteCardMessage": "This will soft-delete this meaning entry, context instances, and media records. Confirm?",
    "deleteCardFailed": "Failed to delete meaning",
    "deleteContextTitle": "Delete Context Instance",
    "deleteContextMessage": "This will soft-delete this context and its media records. Confirm?"
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
  "cards": {
    "list": {
      "title": "意味エントリ",
      "subtitle": "すべての意味カードを検索、フィルタリング、管理します。",
      "loadFailed": "意味エントリの読み込みに失敗しました",
      "statusFailed": "復習状態の更新に失敗しました",
      "favoriteFailed": "お気に入り状態の更新に失敗しました",
      "empty": "意味エントリはまだありません",
      "filteredEmpty": "一致する意味エントリはありません"
    }
  },
  "favorites": {
    "title": "お気に入り",
    "subtitle": "マークした重要な意味エントリを集中して表示します。",
    "loadFailed": "お気に入りエントリの読み込みに失敗しました",
    "empty": "お気に入りエントリはまだありません",
    "filteredEmpty": "お気に入りに一致するエントリはありません"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "ファイル未選択",
    "loadFailed": "意味の読み込みに失敗しました",
    "loadTagsFailed": "既存タグの読み込みに失敗しました",
    "videoTypeError": "mp4ローカル動画ファイルのみサポートされています",
    "screenshotTypeError": "jpg、png、またはwebpのスクリーンショットのみサポートされています",
    "audioTypeError": "mp3オーディオファイルのみサポートされています",
    "targetWordRequired": "対象単語は必須です",
    "meaningRequired": "文脈の意味は必須です",
    "sentenceRequired": "元の文は必須です",
    "appendSuccess": "新しい文脈を追加しました",
    "createSuccess": "意味エントリを作成しました",
    "saveFailed": "保存に失敗しました",
    "saving": "保存中…",
    "addToExisting": "新しい文脈として追加",
    "createCard": "カードを作成",
    "findExistingTitle": "既存の意味に追加",
    "findExisting": "既存の意味を検索して重複を防ぐ",
    "viewAllCards": "すべてのカードを表示",
    "formAria": "カード作成フォーム",
    "sentence": "元の文",
    "sentenceHelp": "まず完全な文脈の文を書き、次に対象単語を記入します。",
    "targetWord": "対象単語",
    "targetWordPlaceholder": "例：charge",
    "meaning": "文脈の意味",
    "meaningPlaceholder": "例：料金を請求する",
    "meaningHelp": "この文脈での意味だけを書きます。Enterまたはクリックで提案を採用、Backspaceで削除します。",
    "aiSuggestionPrefix": "AIの提案：",
    "targetLanguage": "学習言語",
    "definitionLanguage": "定義言語",
    "tags": "タグ",
    "aiSuggestion": "AIの提案",
    "aiGenerating": "AIの提案を生成中…",
    "aiNoteHelp": "この用法メモは保持、修正、または削除できます。",
    "mediaSectionAria": "文脈メディア",
    "mediaSectionTitle": "文脈メディア",
    "mediaSectionHelp": "ローカル動画は強く推奨されますが必須ではありません。スクリーンショットや音声で文脈を補完できます。",
    "media": {
      "video": "ローカル動画 mp4",
      "badgeRecommended": "推奨",
      "uploadVideo": "動画をアップロード",
      "screenshot": "スクリーンショット jpg / png / webp",
      "badgeOptional": "任意",
      "uploadScreenshot": "スクリーンショットをアップロード",
      "audio": "音声 mp3",
      "uploadAudio": "音声をアップロード"
    },
    "appendContext": "既存の意味に文脈を追加中：{word} = {meaning}",
    "findingExisting": "既存の意味を検索中…",
    "findExistingError": "既存の意味の読み込みに失敗しました。新しいエントリの作成を続行できます",
    "exactMatchFound": "同じ意味が見つかりました：{word} = {meaning}",
    "otherMeaningNotice": "異なる意味、参考用",
    "noCardsYet": "この単語の意味エントリはまだありません",
    "createNewCard": "新しい意味エントリを作成",
    "newWordFallback": "新しい単語",
    "firstContextNotice": "現在の文脈が最初の主要な文脈になります",
    "noSameMeaning": "同じ意味は見つかりませんでした",
    "foundSameWord": "同じ単語の意味が見つかりました、同じかどうか確認してください："
  },
  "detail": {
    "title": "详情",
    "statusMastered": "習得済み：復習キューに入りません。",
    "statusReviewingNoDue": "復習中：キューにあります。今すぐ復習できます。",
    "statusReviewingNow": "復習中：キューにあります。今すぐ復習できます。",
    "statusReviewingDue": "復習中：次回の復習 {date}。",
    "loadFailed": "意味の詳細の読み込みに失敗しました",
    "actionFailed": "操作に失敗しました",
    "saveMeaningFailed": "意味の保存に失敗しました",
    "saveTagsFailed": "タグの保存に失敗しました",
    "loading": "意味の詳細を読み込み中…",
    "notFound": "意味エントリが見つかりません",
    "editMeaningAria": "文脈の意味を編集",
    "saveMeaning": "意味を保存",
    "editMeaning": "意味を編集",
    "addContext": "文脈を追加",
    "deleteCard": "意味を削除",
    "allContexts": "すべての文脈",
    "contextNumber": "文脈 {number}",
    "primaryContext": "主な文脈",
    "moveUp": "上に移動",
    "moveDown": "下に移動",
    "setPrimary": "主な文脈に設定",
    "deleteContext": "文脈を削除",
    "reviewInfo": "復習情報",
    "repsCount": "復習回数：{count}",
    "lapsesCount": "忘却回数：{count}",
    "tagsTitle": "タグ",
    "saveTags": "タグを保存",
    "noTagsHint": "タグがありません、「タグを編集」をクリックして追加してください",
    "editTags": "タグを編集",
    "deleteCardTitle": "意味エントリを削除",
    "deleteCardMessage": "この意味エントリ、文脈インスタンス、メディア記録が論理削除されます。よろしいですか？",
    "deleteCardFailed": "意味の削除に失敗しました",
    "deleteContextTitle": "文脈インスタンスを削除",
    "deleteContextMessage": "この文脈とそのメディア記録が論理削除されます。よろしいですか？"
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
  "cards": {
    "list": {
      "title": "의미 항목",
      "subtitle": "모든 의미 카드를 검색, 필터링 및 관리합니다.",
      "loadFailed": "의미 항목을 불러오지 못했습니다",
      "statusFailed": "복습 상태 업데이트 실패",
      "favoriteFailed": "즐겨찾기 상태 업데이트 실패",
      "empty": "아직 의미 항목이 없습니다",
      "filteredEmpty": "일치하는 의미 항목이 없습니다"
    }
  },
  "favorites": {
    "title": "즐겨찾기",
    "subtitle": "표시한 중요한 의미 항목을 모아 봅니다.",
    "loadFailed": "즐겨찾기 항목을 불러오지 못했습니다",
    "empty": "아직 즐겨찾기 항목이 없습니다",
    "filteredEmpty": "즐겨찾기에 일치하는 항목이 없습니다"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "파일 선택 안됨",
    "loadFailed": "의미를 불러오지 못했습니다",
    "loadTagsFailed": "기존 태그를 불러오지 못했습니다",
    "videoTypeError": "mp4 로컬 비디오 파일만 지원됩니다",
    "screenshotTypeError": "jpg, png 또는 webp 스크린샷만 지원됩니다",
    "audioTypeError": "mp3 오디오 파일만 지원됩니다",
    "targetWordRequired": "목표 단어는 필수입니다",
    "meaningRequired": "문맥 의미는 필수입니다",
    "sentenceRequired": "원문은 필수입니다",
    "appendSuccess": "새 문맥이 추가되었습니다",
    "createSuccess": "의미 항목이 생성되었습니다",
    "saveFailed": "저장 실패",
    "saving": "저장 중...",
    "addToExisting": "새 문맥으로 추가",
    "createCard": "카드 생성",
    "findExistingTitle": "기존 의미에 추가",
    "findExisting": "기존 의미를 검색하여 중복 방지",
    "viewAllCards": "모든 카드 보기",
    "formAria": "카드 생성 폼",
    "sentence": "원문",
    "sentenceHelp": "먼저 완전한 문맥 문장을 쓴 다음 목표 단어를 채우세요.",
    "targetWord": "목표 단어",
    "targetWordPlaceholder": "예: charge",
    "meaning": "문맥 의미",
    "meaningPlaceholder": "예: 요금을 청구하다",
    "meaningHelp": "이 문맥에서의 의미만 작성하세요. Enter 또는 클릭하여 제안을 수락하고 Backspace로 삭제합니다.",
    "aiSuggestionPrefix": "AI 제안: ",
    "targetLanguage": "학습 언어",
    "definitionLanguage": "정의 언어",
    "tags": "태그",
    "aiSuggestion": "AI 제안",
    "aiGenerating": "AI 제안 생성 중...",
    "aiNoteHelp": "이 용법 메모를 유지, 수정 또는 삭제할 수 있습니다.",
    "mediaSectionAria": "문맥 미디어",
    "mediaSectionTitle": "문맥 미디어",
    "mediaSectionHelp": "로컬 비디오를 강력히 권장하지만 필수는 아닙니다. 스크린샷과 오디오로 문맥을 보완할 수 있습니다.",
    "media": {
      "video": "로컬 비디오 mp4",
      "badgeRecommended": "권장",
      "uploadVideo": "비디오 업로드",
      "screenshot": "스크린샷 jpg / png / webp",
      "badgeOptional": "선택",
      "uploadScreenshot": "스크린샷 업로드",
      "audio": "오디오 mp3",
      "uploadAudio": "오디오 업로드"
    },
    "appendContext": "기존 의미에 문맥 추가 중: {word} = {meaning}",
    "findingExisting": "기존 의미 검색 중...",
    "findExistingError": "기존 의미를 불러오지 못했습니다. 새 항목 생성을 계속할 수 있습니다",
    "exactMatchFound": "정확한 의미 발견: {word} = {meaning}",
    "otherMeaningNotice": "다른 의미, 참고용",
    "noCardsYet": "아직 이 단어에 대한 의미 항목이 없습니다",
    "createNewCard": "새 의미 항목 생성",
    "newWordFallback": "새 단어",
    "firstContextNotice": "현재 문맥이 첫 번째 주요 문맥이 됩니다",
    "noSameMeaning": "동일한 의미를 찾을 수 없습니다",
    "foundSameWord": "같은 단어의 의미가 발견되었습니다, 동일한지 확인하세요:"
  },
  "detail": {
    "title": "详情",
    "statusMastered": "마스터됨: 복습 큐에 들어가지 않습니다.",
    "statusReviewingNoDue": "복습 중: 큐에 있습니다. 지금 복습할 수 있습니다.",
    "statusReviewingNow": "복습 중: 큐에 있습니다. 지금 복습할 수 있습니다.",
    "statusReviewingDue": "복습 중: 다음 복습 {date}.",
    "loadFailed": "의미 세부 정보를 불러오지 못했습니다",
    "actionFailed": "작업 실패",
    "saveMeaningFailed": "의미 저장 실패",
    "saveTagsFailed": "태그 저장 실패",
    "loading": "의미 세부 정보 로딩 중...",
    "notFound": "의미 항목을 찾을 수 없습니다",
    "editMeaningAria": "문맥 의미 편집",
    "saveMeaning": "의미 저장",
    "editMeaning": "의미 편집",
    "addContext": "문맥 추가",
    "deleteCard": "의미 삭제",
    "allContexts": "모든 문맥",
    "contextNumber": "문맥 {number}",
    "primaryContext": "주요 문맥",
    "moveUp": "위로 이동",
    "moveDown": "아래로 이동",
    "setPrimary": "주요 문맥으로 설정",
    "deleteContext": "문맥 삭제",
    "reviewInfo": "복습 정보",
    "repsCount": "복습 횟수: {count}",
    "lapsesCount": "망각 횟수: {count}",
    "tagsTitle": "태그",
    "saveTags": "태그 저장",
    "noTagsHint": "태그가 없습니다, '태그 편집'을 클릭하여 추가하세요",
    "editTags": "태그 편집",
    "deleteCardTitle": "의미 항목 삭제",
    "deleteCardMessage": "이 의미 항목, 문맥 인스턴스 및 미디어 기록이 소프트 삭제됩니다. 삭제하시겠습니까?",
    "deleteCardFailed": "의미 삭제 실패",
    "deleteContextTitle": "문맥 인스턴스 삭제",
    "deleteContextMessage": "이 문맥과 관련 미디어 기록이 소프트 삭제됩니다. 삭제하시겠습니까?"
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
  "cards": {
    "list": {
      "title": "Entrées de sens",
      "subtitle": "Rechercher, filtrer et gérer toutes les cartes de sens.",
      "loadFailed": "Échec du chargement des entrées de sens",
      "statusFailed": "Échec de la mise à jour du statut de révision",
      "favoriteFailed": "Échec de la mise à jour du statut favori",
      "empty": "Aucune entrée de sens pour l'instant",
      "filteredEmpty": "Aucune entrée de sens correspondante"
    }
  },
  "favorites": {
    "title": "Favoris",
    "subtitle": "Affichez vos entrées de sens importantes marquées.",
    "loadFailed": "Échec du chargement des entrées favorites",
    "empty": "Aucune entrée favorite pour l'instant",
    "filteredEmpty": "Aucune entrée correspondante dans les favoris"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "Langue de l’interface",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "Paramètres enregistrés"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "Aucun fichier sélectionné",
    "loadFailed": "Échec du chargement du sens",
    "loadTagsFailed": "Échec du chargement des tags existants",
    "videoTypeError": "Seuls les fichiers vidéo locaux mp4 sont pris en charge",
    "screenshotTypeError": "Seules les captures d'écran jpg, png ou webp sont prises en charge",
    "audioTypeError": "Seuls les fichiers audio mp3 sont pris en charge",
    "targetWordRequired": "Le mot cible est requis",
    "meaningRequired": "Le sens contextuel est requis",
    "sentenceRequired": "La phrase est requise",
    "appendSuccess": "Nouveau contexte ajouté",
    "createSuccess": "Entrée de sens créée",
    "saveFailed": "Échec de l'enregistrement",
    "saving": "Enregistrement...",
    "addToExisting": "Ajouter comme nouveau contexte",
    "createCard": "Créer la carte",
    "findExistingTitle": "Ajouter à un sens existant",
    "findExisting": "Rechercher un sens existant pour éviter les doublons",
    "viewAllCards": "Voir toutes les cartes",
    "formAria": "Formulaire de création de carte",
    "sentence": "Phrase",
    "sentenceHelp": "Écrivez d'abord la phrase complète, puis remplissez le mot cible.",
    "targetWord": "Mot cible",
    "targetWordPlaceholder": "ex. : charge",
    "meaning": "Sens contextuel",
    "meaningPlaceholder": "ex. : facturer",
    "meaningHelp": "Écrivez uniquement le sens dans ce contexte. Entrée ou clic pour accepter la suggestion, Retour arrière pour supprimer.",
    "aiSuggestionPrefix": "Suggestion de l'IA : ",
    "targetLanguage": "Langue cible",
    "definitionLanguage": "Langue de définition",
    "tags": "Tags",
    "aiSuggestion": "Suggestion de l'IA",
    "aiGenerating": "Génération de la suggestion de l'IA...",
    "aiNoteHelp": "Vous pouvez conserver, modifier ou supprimer cette note d'utilisation.",
    "mediaSectionAria": "Médias contextuels",
    "mediaSectionTitle": "Médias contextuels",
    "mediaSectionHelp": "La vidéo locale est fortement recommandée mais non obligatoire ; les captures d'écran et l'audio peuvent compléter le contexte.",
    "media": {
      "video": "Vidéo locale mp4",
      "badgeRecommended": "Recommandé",
      "uploadVideo": "Uploader une vidéo",
      "screenshot": "Capture d'écran jpg / png / webp",
      "badgeOptional": "Optionnel",
      "uploadScreenshot": "Uploader une capture d'écran",
      "audio": "Audio mp3",
      "uploadAudio": "Uploader de l'audio"
    },
    "appendContext": "Ajout de contexte au sens existant : {word} = {meaning}",
    "findingExisting": "Recherche du sens existant...",
    "findExistingError": "Échec du chargement du sens existant, vous pouvez continuer à créer une nouvelle entrée",
    "exactMatchFound": "Sens exact trouvé : {word} = {meaning}",
    "otherMeaningNotice": "Sens différent, pour référence uniquement",
    "noCardsYet": "Aucune entrée de sens pour ce mot pour l'instant",
    "createNewCard": "Créer une nouvelle entrée de sens",
    "newWordFallback": "Nouveau mot",
    "firstContextNotice": "Le contexte actuel deviendra le premier contexte principal",
    "noSameMeaning": "Aucun sens identique trouvé",
    "foundSameWord": "Sens avec le même mot trouvé, veuillez confirmer s'il est identique :"
  },
  "detail": {
    "title": "详情",
    "statusMastered": "Maîtrisé : n'entrera pas dans la file de révision.",
    "statusReviewingNoDue": "En révision : dans la file, peut être révisé maintenant.",
    "statusReviewingNow": "En révision : dans la file, peut être révisé maintenant.",
    "statusReviewingDue": "En révision : prochaine révision {date}.",
    "loadFailed": "Échec du chargement des détails du sens",
    "actionFailed": "L'action a échoué",
    "saveMeaningFailed": "Échec de l'enregistrement du sens",
    "saveTagsFailed": "Échec de l'enregistrement des tags",
    "loading": "Chargement des détails du sens...",
    "notFound": "Entrée de sens non trouvée",
    "editMeaningAria": "Modifier le sens contextuel",
    "saveMeaning": "Enregistrer le sens",
    "editMeaning": "Modifier le sens",
    "addContext": "Ajouter un contexte",
    "deleteCard": "Supprimer le sens",
    "allContexts": "Tous les contextes",
    "contextNumber": "Contexte {number}",
    "primaryContext": "Contexte principal",
    "moveUp": "Déplacer vers le haut",
    "moveDown": "Déplacer vers le bas",
    "setPrimary": "Définir comme principal",
    "deleteContext": "Supprimer le contexte",
    "reviewInfo": "Informations de révision",
    "repsCount": "Répétitions : {count}",
    "lapsesCount": "Oublis : {count}",
    "tagsTitle": "Tags",
    "saveTags": "Enregistrer les tags",
    "noTagsHint": "Aucun tag, cliquez sur 'Modifier les tags' pour ajouter",
    "editTags": "Modifier les tags",
    "deleteCardTitle": "Supprimer l'entrée de sens",
    "deleteCardMessage": "Ceci supprimera (soft-delete) cette entrée de sens, les instances de contexte et les enregistrements de médias. Confirmer ?",
    "deleteCardFailed": "Échec de la suppression du sens",
    "deleteContextTitle": "Supprimer l'instance de contexte",
    "deleteContextMessage": "Ceci supprimera (soft-delete) ce contexte et ses enregistrements de médias. Confirmer ?"
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
  "cards": {
    "list": {
      "title": "Bedeutungseinträge",
      "subtitle": "Alle Bedeutungskarten suchen, filtern und verwalten.",
      "loadFailed": "Fehler beim Laden der Bedeutungseinträge",
      "statusFailed": "Fehler beim Aktualisieren des Wiederholungsstatus",
      "favoriteFailed": "Fehler beim Aktualisieren des Favoritenstatus",
      "empty": "Noch keine Bedeutungseinträge",
      "filteredEmpty": "Keine übereinstimmenden Bedeutungseinträge"
    }
  },
  "favorites": {
    "title": "Favoriten",
    "subtitle": "Sehen Sie sich Ihre markierten wichtigen Bedeutungseinträge an.",
    "loadFailed": "Fehler beim Laden der Favoriteneinträge",
    "empty": "Noch keine Favoriteneinträge",
    "filteredEmpty": "Keine übereinstimmenden Einträge in den Favoriten"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "Keine Datei ausgewählt",
    "loadFailed": "Fehler beim Laden der Bedeutung",
    "loadTagsFailed": "Fehler beim Laden vorhandener Tags",
    "videoTypeError": "Nur lokale mp4-Videodateien werden unterstützt",
    "screenshotTypeError": "Nur jpg, png oder webp Screenshots werden unterstützt",
    "audioTypeError": "Nur mp3-Audiodateien werden unterstützt",
    "targetWordRequired": "Zielwort ist erforderlich",
    "meaningRequired": "Kontextbedeutung ist erforderlich",
    "sentenceRequired": "Satz ist erforderlich",
    "appendSuccess": "Neuer Kontext hinzugefügt",
    "createSuccess": "Bedeutungseintrag erstellt",
    "saveFailed": "Speichern fehlgeschlagen",
    "saving": "Speichern...",
    "addToExisting": "Als neuen Kontext hinzufügen",
    "createCard": "Karte erstellen",
    "findExistingTitle": "Zu bestehender Bedeutung hinzufügen",
    "findExisting": "Vorhandene Bedeutung finden, um Duplikate zu vermeiden",
    "viewAllCards": "Alle Karten anzeigen",
    "formAria": "Kartenerstellungsformular",
    "sentence": "Satz",
    "sentenceHelp": "Schreiben Sie zuerst den vollständigen Satz und füllen Sie dann das Zielwort aus.",
    "targetWord": "Zielwort",
    "targetWordPlaceholder": "z.B.: charge",
    "meaning": "Kontextbedeutung",
    "meaningPlaceholder": "z.B.: Gebühr erheben",
    "meaningHelp": "Schreiben Sie nur die Bedeutung in diesem Kontext. Eingabe oder Klicken, um Vorschlag zu akzeptieren, Rücktaste zum Löschen.",
    "aiSuggestionPrefix": "KI-Vorschlag: ",
    "targetLanguage": "Zielsprache",
    "definitionLanguage": "Definitionssprache",
    "tags": "Tags",
    "aiSuggestion": "KI-Vorschlag",
    "aiGenerating": "KI-Vorschlag wird generiert...",
    "aiNoteHelp": "Sie können diese Nutzungsnotiz behalten, ändern oder löschen.",
    "mediaSectionAria": "Kontextmedien",
    "mediaSectionTitle": "Kontextmedien",
    "mediaSectionHelp": "Lokales Video wird dringend empfohlen, ist aber nicht obligatorisch; Screenshots und Audio können den Kontext ergänzen.",
    "media": {
      "video": "Lokales Video mp4",
      "badgeRecommended": "Empfohlen",
      "uploadVideo": "Video hochladen",
      "screenshot": "Screenshot jpg / png / webp",
      "badgeOptional": "Optional",
      "uploadScreenshot": "Screenshot hochladen",
      "audio": "Audio mp3",
      "uploadAudio": "Audio hochladen"
    },
    "appendContext": "Füge Kontext zu bestehender Bedeutung hinzu: {word} = {meaning}",
    "findingExisting": "Suche nach bestehender Bedeutung...",
    "findExistingError": "Fehler beim Laden der bestehenden Bedeutung, Sie können weiterhin einen neuen Eintrag erstellen",
    "exactMatchFound": "Genaue Bedeutung gefunden: {word} = {meaning}",
    "otherMeaningNotice": "Andere Bedeutung, nur zur Referenz",
    "noCardsYet": "Noch keine Bedeutungseinträge für dieses Wort",
    "createNewCard": "Neuen Bedeutungseintrag erstellen",
    "newWordFallback": "Neues Wort",
    "firstContextNotice": "Der aktuelle Kontext wird der erste Hauptkontext",
    "noSameMeaning": "Keine identische Bedeutung gefunden",
    "foundSameWord": "Bedeutung mit gleichem Wort gefunden, bitte bestätigen Sie, ob identisch:"
  },
  "detail": {
    "title": "详情",
    "statusMastered": "Gemeistert: Wird nicht in die Wiederholungsschlange aufgenommen.",
    "statusReviewingNoDue": "In Wiederholung: In der Warteschlange, kann jetzt wiederholt werden.",
    "statusReviewingNow": "In Wiederholung: In der Warteschlange, kann jetzt wiederholt werden.",
    "statusReviewingDue": "In Wiederholung: Nächste Wiederholung {date}.",
    "loadFailed": "Fehler beim Laden der Bedeutungsdetails",
    "actionFailed": "Aktion fehlgeschlagen",
    "saveMeaningFailed": "Fehler beim Speichern der Bedeutung",
    "saveTagsFailed": "Fehler beim Speichern der Tags",
    "loading": "Lade Bedeutungsdetails...",
    "notFound": "Bedeutungseintrag nicht gefunden",
    "editMeaningAria": "Kontextbedeutung bearbeiten",
    "saveMeaning": "Bedeutung speichern",
    "editMeaning": "Bedeutung bearbeiten",
    "addContext": "Kontext hinzufügen",
    "deleteCard": "Bedeutung löschen",
    "allContexts": "Alle Kontexte",
    "contextNumber": "Kontext {number}",
    "primaryContext": "Hauptkontext",
    "moveUp": "Nach oben",
    "moveDown": "Nach unten",
    "setPrimary": "Als primär festlegen",
    "deleteContext": "Kontext löschen",
    "reviewInfo": "Wiederholungsinformationen",
    "repsCount": "Wiederholungen: {count}",
    "lapsesCount": "Ausfälle: {count}",
    "tagsTitle": "Tags",
    "saveTags": "Tags speichern",
    "noTagsHint": "Keine Tags, klicken Sie auf 'Tags bearbeiten' zum Hinzufügen",
    "editTags": "Tags bearbeiten",
    "deleteCardTitle": "Bedeutungseintrag löschen",
    "deleteCardMessage": "Dies wird diesen Bedeutungseintrag, Kontextinstanzen und Medienaufzeichnungen soft-löschen. Bestätigen?",
    "deleteCardFailed": "Fehler beim Löschen der Bedeutung",
    "deleteContextTitle": "Kontextinstanz löschen",
    "deleteContextMessage": "Dies wird diesen Kontext und seine Medienaufzeichnungen soft-löschen. Bestätigen?"
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
  "cards": {
    "list": {
      "title": "Entradas de significado",
      "subtitle": "Buscar, filtrar y gestionar todas las tarjetas de significado.",
      "loadFailed": "Error al cargar las entradas de significado",
      "statusFailed": "Error al actualizar el estado de repaso",
      "favoriteFailed": "Error al actualizar el estado de favorito",
      "empty": "Aún no hay entradas de significado",
      "filteredEmpty": "No hay entradas de significado coincidentes"
    }
  },
  "favorites": {
    "title": "Favoritos",
    "subtitle": "Ver tus entradas de significado importantes marcadas.",
    "loadFailed": "Error al cargar las entradas favoritas",
    "empty": "Aún no hay entradas favoritas",
    "filteredEmpty": "No hay entradas coincidentes en favoritos"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "Ningún archivo seleccionado",
    "loadFailed": "Error al cargar el significado",
    "loadTagsFailed": "Error al cargar las etiquetas existentes",
    "videoTypeError": "Solo se admiten archivos de video locales mp4",
    "screenshotTypeError": "Solo se admiten capturas de pantalla jpg, png o webp",
    "audioTypeError": "Solo se admiten archivos de audio mp3",
    "targetWordRequired": "La palabra objetivo es obligatoria",
    "meaningRequired": "El significado contextual es obligatorio",
    "sentenceRequired": "La oración es obligatoria",
    "appendSuccess": "Nuevo contexto añadido",
    "createSuccess": "Entrada de significado creada",
    "saveFailed": "Error al guardar",
    "saving": "Guardando...",
    "addToExisting": "Añadir como nuevo contexto",
    "createCard": "Crear tarjeta",
    "findExistingTitle": "Añadir al significado existente",
    "findExisting": "Buscar significado existente para evitar duplicados",
    "viewAllCards": "Ver todas las tarjetas",
    "formAria": "Formulario de creación de tarjeta",
    "sentence": "Oración",
    "sentenceHelp": "Escribe la oración completa primero y luego completa la palabra objetivo.",
    "targetWord": "Palabra objetivo",
    "targetWordPlaceholder": "ej.: charge",
    "meaning": "Significado contextual",
    "meaningPlaceholder": "ej.: cobrar",
    "meaningHelp": "Escribe solo el significado en este contexto. Enter o clic para aceptar la sugerencia, Retroceso para borrar.",
    "aiSuggestionPrefix": "Sugerencia de IA: ",
    "targetLanguage": "Idioma objetivo",
    "definitionLanguage": "Idioma de definición",
    "tags": "Etiquetas",
    "aiSuggestion": "Sugerencia de IA",
    "aiGenerating": "Generando sugerencia de IA...",
    "aiNoteHelp": "Puedes conservar, modificar o eliminar esta nota de uso.",
    "mediaSectionAria": "Medios contextuales",
    "mediaSectionTitle": "Medios contextuales",
    "mediaSectionHelp": "Se recomienda encarecidamente el video local pero no es obligatorio; las capturas de pantalla y el audio pueden complementar el contexto.",
    "media": {
      "video": "Video local mp4",
      "badgeRecommended": "Recomendado",
      "uploadVideo": "Subir video",
      "screenshot": "Captura de pantalla jpg / png / webp",
      "badgeOptional": "Opcional",
      "uploadScreenshot": "Subir captura de pantalla",
      "audio": "Audio mp3",
      "uploadAudio": "Subir audio"
    },
    "appendContext": "Añadiendo contexto al significado existente: {word} = {meaning}",
    "findingExisting": "Buscando significado existente...",
    "findExistingError": "Error al cargar el significado existente, puedes continuar creando una nueva entrada",
    "exactMatchFound": "Significado exacto encontrado: {word} = {meaning}",
    "otherMeaningNotice": "Diferente significado, solo para referencia",
    "noCardsYet": "Aún no hay entradas de significado para esta palabra",
    "createNewCard": "Crear nueva entrada de significado",
    "newWordFallback": "Nueva palabra",
    "firstContextNotice": "El contexto actual se convertirá en el primer contexto principal",
    "noSameMeaning": "No se encontró ningún significado idéntico",
    "foundSameWord": "Significado con la misma palabra encontrado, por favor confirma si es idéntico:"
  },
  "detail": {
    "title": "详情",
    "statusMastered": "Dominado: no entrará en la cola de repaso.",
    "statusReviewingNoDue": "En repaso: en cola, se puede repasar ahora.",
    "statusReviewingNow": "En repaso: en cola, se puede repasar ahora.",
    "statusReviewingDue": "En repaso: próximo repaso {date}.",
    "loadFailed": "Error al cargar los detalles del significado",
    "actionFailed": "La acción falló",
    "saveMeaningFailed": "Error al guardar el significado",
    "saveTagsFailed": "Error al guardar etiquetas",
    "loading": "Cargando detalles del significado...",
    "notFound": "Entrada de significado no encontrada",
    "editMeaningAria": "Editar significado contextual",
    "saveMeaning": "Guardar significado",
    "editMeaning": "Editar significado",
    "addContext": "Añadir contexto",
    "deleteCard": "Eliminar significado",
    "allContexts": "Todos los contextos",
    "contextNumber": "Contexto {number}",
    "primaryContext": "Contexto principal",
    "moveUp": "Mover arriba",
    "moveDown": "Mover abajo",
    "setPrimary": "Establecer como principal",
    "deleteContext": "Eliminar contexto",
    "reviewInfo": "Información de repaso",
    "repsCount": "Repeticiones: {count}",
    "lapsesCount": "Olvidos: {count}",
    "tagsTitle": "Etiquetas",
    "saveTags": "Guardar etiquetas",
    "noTagsHint": "Sin etiquetas, haz clic en 'Editar etiquetas' para añadir",
    "editTags": "Editar etiquetas",
    "deleteCardTitle": "Eliminar entrada de significado",
    "deleteCardMessage": "Esto eliminará (soft-delete) esta entrada de significado, las instancias de contexto y los registros de medios. ¿Confirmar?",
    "deleteCardFailed": "Error al eliminar el significado",
    "deleteContextTitle": "Eliminar instancia de contexto",
    "deleteContextMessage": "Esto eliminará (soft-delete) este contexto y sus registros de medios. ¿Confirmar?"
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
  "cards": {
    "list": {
      "title": "Записи значений",
      "subtitle": "Поиск, фильтрация и управление всеми карточками значений.",
      "loadFailed": "Не удалось загрузить записи значений",
      "statusFailed": "Не удалось обновить статус повторения",
      "favoriteFailed": "Не удалось обновить статус избранного",
      "empty": "Пока нет записей значений",
      "filteredEmpty": "Нет подходящих записей значений"
    }
  },
  "favorites": {
    "title": "Избранное",
    "subtitle": "Просмотр отмеченных важных записей значений.",
    "loadFailed": "Не удалось загрузить избранные записи",
    "empty": "Пока нет избранных записей",
    "filteredEmpty": "В избранном нет подходящих записей"
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
    "loadFailed": "无法加载设置",
    "learning": {
      "title": "学习与界面设置",
      "interfaceLanguage": "界面语言",
      "targetLanguage": "默认学习语言",
      "defLanguage": "默认释义语言",
      "dailyLimit": "每日复习数量",
      "positiveInteger": "每日复习数量必须是正整数",
      "saveFailed": "保存失败",
      "saved": "设置已保存"
    },
    "ai": {
      "title": "AI API 配置",
      "desc": "使用 OpenAI-compatible 接口生成制卡建议。API Key 只保存在本地，导出数据不包含 Key。",
      "loading": "AI 配置加载中…",
      "empty": "暂无 AI 配置",
      "keySaved": "API Key 已保存",
      "keyNotSaved": "API Key 未保存",
      "active": "当前启用",
      "activate": "启用",
      "edit": "编辑",
      "delete": "删除",
      "name": "配置名称",
      "baseUrl": "Base URL",
      "apiKey": "API Key",
      "fetchModels": "获取模型列表",
      "fetching": "获取中…",
      "fetchModelsFailed": "模型列表获取失败",
      "noModels": "未获取到模型",
      "saveFailed": "AI 配置保存失败",
      "activateFailed": "AI 配置启用失败",
      "deleteFailed": "AI 配置删除失败",
      "model": "模型",
      "makeActive": "保存后立即启用",
      "save": "保存 AI 配置",
      "cancelEdit": "取消编辑",
      "saved": "AI 配置已保存"
    },
    "export": {
      "title": "导出数据",
      "markedDesc": "完整备份：包含卡片、语境、媒体、标签、复习记录、FSRS 状态和设置。",
      "markedBtn": "导出含有标记的卡片",
      "pureDesc": "纯内容分享：仅包含卡片和语境，不含个人状态、收藏或复习记录。",
      "pureBtn": "导出纯卡片"
    },
    "import": {
      "title": "导入数据",
      "fileSelect": "选择导入 zip",
      "scan": "扫描导入文件",
      "execute": "执行导入",
      "scanFailed": "扫描失败",
      "executeFailed": "导入失败",
      "cards": "卡片",
      "contexts": "语境",
      "media": "媒体文件",
      "tags": "标签",
      "conflicts": "冲突",
      "conflictWord": "冲突处理：",
      "skip": "跳过",
      "merge": "合并",
      "importAsNew": "作为新条目",
      "missingMedia": "缺少媒体文件",
      "modeTitle": "冲突处理方式",
      "modeSkip": "全部跳过",
      "modeMerge": "全部合并为已有词义条目的新语境",
      "modeNew": "全部作为新词义条目导入",
      "modePerItem": "逐项处理",
      "done": "导入完成",
      "importedCards": "已导入卡片",
      "importedContexts": "已导入语境",
      "importedMedia": "已导入媒体",
      "skipped": "已跳过",
      "merged": "已合并"
    }
  },
  "home": {
    "title": "首页"
  },
  "create": {
    "title": "创建",
    "noFile": "Файл не выбран",
    "loadFailed": "Не удалось загрузить значение",
    "loadTagsFailed": "Не удалось загрузить существующие теги",
    "videoTypeError": "Поддерживаются только локальные видеофайлы mp4",
    "screenshotTypeError": "Поддерживаются только скриншоты jpg, png или webp",
    "audioTypeError": "Поддерживаются только аудиофайлы mp3",
    "targetWordRequired": "Целевое слово обязательно",
    "meaningRequired": "Контекстное значение обязательно",
    "sentenceRequired": "Предложение обязательно",
    "appendSuccess": "Добавлен новый контекст",
    "createSuccess": "Запись значения создана",
    "saveFailed": "Ошибка сохранения",
    "saving": "Сохранение...",
    "addToExisting": "Добавить как новый контекст",
    "createCard": "Создать карточку",
    "findExistingTitle": "Добавить к существующему значению",
    "findExisting": "Найти существующее значение, чтобы избежать дубликатов",
    "viewAllCards": "Просмотреть все карточки",
    "formAria": "Форма создания карточки",
    "sentence": "Предложение",
    "sentenceHelp": "Сначала напишите полное предложение, затем введите целевое слово.",
    "targetWord": "Целевое слово",
    "targetWordPlaceholder": "напр.: charge",
    "meaning": "Контекстное значение",
    "meaningPlaceholder": "напр.: взимать плату",
    "meaningHelp": "Пишите значение только в этом контексте. Enter или клик, чтобы принять предложение, Backspace, чтобы удалить.",
    "aiSuggestionPrefix": "Предложение ИИ: ",
    "targetLanguage": "Изучаемый язык",
    "definitionLanguage": "Язык определения",
    "tags": "Теги",
    "aiSuggestion": "Предложение ИИ",
    "aiGenerating": "Генерация предложения ИИ...",
    "aiNoteHelp": "Вы можете сохранить, изменить или удалить эту заметку об использовании.",
    "mediaSectionAria": "Контекстные медиа",
    "mediaSectionTitle": "Контекстные медиа",
    "mediaSectionHelp": "Локальное видео настоятельно рекомендуется, но не обязательно; скриншоты и аудио могут дополнить контекст.",
    "media": {
      "video": "Локальное видео mp4",
      "badgeRecommended": "Рекомендуется",
      "uploadVideo": "Загрузить видео",
      "screenshot": "Скриншот jpg / png / webp",
      "badgeOptional": "Необязательно",
      "uploadScreenshot": "Загрузить скриншот",
      "audio": "Аудио mp3",
      "uploadAudio": "Загрузить аудио"
    },
    "appendContext": "Добавление контекста к существующему значению: {word} = {meaning}",
    "findingExisting": "Поиск существующего значения...",
    "findExistingError": "Не удалось загрузить существующее значение, вы можете продолжить создание новой записи",
    "exactMatchFound": "Найдено точное значение: {word} = {meaning}",
    "otherMeaningNotice": "Другое значение, только для справки",
    "noCardsYet": "Для этого слова пока нет записей значений",
    "createNewCard": "Создать новую запись значения",
    "newWordFallback": "Новое слово",
    "firstContextNotice": "Текущий контекст станет первым основным контекстом",
    "noSameMeaning": "Идентичное значение не найдено",
    "foundSameWord": "Найдено значение с тем же словом, пожалуйста, подтвердите, идентично ли:"
  },
  "detail": {
    "title": "详情",
    "statusMastered": "Освоено: не войдет в очередь на повторение.",
    "statusReviewingNoDue": "Повторение: в очереди, можно повторять сейчас.",
    "statusReviewingNow": "Повторение: в очереди, можно повторять сейчас.",
    "statusReviewingDue": "Повторение: следующее повторение {date}.",
    "loadFailed": "Не удалось загрузить подробности значения",
    "actionFailed": "Действие не удалось",
    "saveMeaningFailed": "Ошибка сохранения значения",
    "saveTagsFailed": "Ошибка сохранения тегов",
    "loading": "Загрузка подробностей значения...",
    "notFound": "Запись значения не найдена",
    "editMeaningAria": "Изменить контекстное значение",
    "saveMeaning": "Сохранить значение",
    "editMeaning": "Изменить значение",
    "addContext": "Добавить контекст",
    "deleteCard": "Удалить значение",
    "allContexts": "Все контексты",
    "contextNumber": "Контекст {number}",
    "primaryContext": "Основной контекст",
    "moveUp": "Переместить вверх",
    "moveDown": "Переместить вниз",
    "setPrimary": "Установить основным",
    "deleteContext": "Удалить контекст",
    "reviewInfo": "Информация о повторении",
    "repsCount": "Повторений: {count}",
    "lapsesCount": "Пропусков: {count}",
    "tagsTitle": "Теги",
    "saveTags": "Сохранить теги",
    "noTagsHint": "Нет тегов, нажмите 'Изменить теги', чтобы добавить",
    "editTags": "Изменить теги",
    "deleteCardTitle": "Удалить запись значения",
    "deleteCardMessage": "Это приведет к программному удалению этой записи значения, экземпляров контекста и медиа-записей. Подтверждаете?",
    "deleteCardFailed": "Не удалось удалить значение",
    "deleteContextTitle": "Удалить экземпляр контекста",
    "deleteContextMessage": "Это приведет к программному удалению этого контекста и его медиа-записей. Подтверждаете?"
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
