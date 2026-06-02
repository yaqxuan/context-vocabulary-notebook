# Context Vocabulary Notebook 需求文档

## 1. 项目名称

**Context Vocabulary Notebook**

中文名：**语境单词本**

---

## 2. 项目定位

Context Vocabulary Notebook 是一个本地优先的轻量语境词汇复习工具。

它主要面向用户在观看外语视频时积累生词的场景。用户可以把视频中遇到的目标单词、当前语境释义、原句和对应视频片段记录下来，并通过 FSRS 算法进行复习。

系统的核心不是内置词库，而是用户自己从真实视频语境中积累词汇。

第一版主要支持：

```text
目标单词
当前语境释义
原句
本地视频语境
可选截图
可选音频
标签分类
FSRS 复习
导入导出
```

---

## 3. 第一版设计原则

第一版主打轻量、稳定、可长期使用。

核心原则：

```text
1. 本地优先。
2. 主要语境是本地视频。
3. 截图和音频作为可选补充材料。
4. 不内置词库。
5. 不接词典。
6. 不做音标。
7. 不做 AI 自动制卡。
8. 不做卡片修改回滚。
9. 不做来源表，用标签承担分类和来源标记。
10. 保留本地 API、CLI、AI、同步等后续扩展空间。
```

---

## 4. 核心数据模型

系统核心对象是：

**词义条目 Word Sense Card**

一个词义条目表示：

```text
某个目标单词 + 某个具体语义
```

例如：

```text
charge = 收费
```

一个词义条目下面可以有多个语境实例。

例如：

```text
The hotel charges $100 per night.
They charge extra for breakfast.
The app charges a monthly subscription fee.
```

同一个单词的同一个意思，只建立一个词义条目；新的视频片段、原句、截图或音频可以继续添加到这个词义条目下面。

---

## 5. 核心功能

### 5.1 制卡功能

用户可以创建词义条目，也可以给已有词义条目添加新的语境实例。

制卡时填写：

```text
目标单词
当前语境释义
原句
学习语言
释义语言
标签
备注
本地视频
可选截图
可选音频
```

默认设置：

```text
学习语言：英语
释义语言：中文
界面语言：中文
```

系统使用独立的 `id` 作为词义条目主键，制卡时间作为普通字段保存。

---

### 5.2 制卡时的已有词义联想

制卡页在目标单词为空时不展示已有词义联想模块，避免空侧栏和无效说明文字干扰填写。

用户输入目标单词后，系统自动查询并展示该单词已有的词义条目。联想模块标题应表达用途：查找已有词义，避免重复建卡。

例如用户输入：

```text
charge
```

系统可以展示：

```text
charge = 收费
charge = 指控
charge = 充电
```

处理规则：

```text
如果目标单词 + 当前语境释义完全匹配已有词义条目：
  隐藏创建新词义条目的选项
  当前原句、备注、本地视频、截图和音频保存为该已有词义条目的新语境实例

如果只有目标单词相同，但当前语境释义不同：
  已有词义只作为参考信息展示
  仍允许创建新的词义条目

如果没有同名单词：
  允许创建新的词义条目
```

用户主动选择已有词义条目时，当前原句、备注、本地视频、截图和音频会作为新的语境实例添加到该词义条目下。

---

### 5.3 语境实例

每个词义条目下面可以添加多个语境实例。

每个语境实例包含：

```text
原句
备注
是否主语境
排序序号
本地视频
可选截图
可选音频
```

语境主要针对本地视频。

截图和单独音频是附加材料，用于补充当时语境。

备注可以记录：

```text
视频名称
视频时间点
场景说明
截图说明
其他补充信息
```

---

### 5.4 主语境规则

每个词义条目需要有一个主语境。

主语境用于：

```text
列表页默认展示
复习页默认展示
搜索结果摘要展示
```

规则：

```text
用户可以手动设置主语境。
如果用户没有设置，系统默认使用最早创建的语境实例作为主语境。
如果主语境被删除，系统自动选择剩余语境中 created_at 最早的一条作为新的主语境。
如果该词义条目没有任何语境实例，列表和复习页显示“暂无语境”。
```

同一个词义条目下只能有一个主语境。

设置主语境时，系统需要在同一个事务中执行：

```text
1. 将同 card_id 下其他未删除语境实例的 is_primary 设置为 false。
2. 将当前语境实例的 is_primary 设置为 true。
```

---

### 5.5 语境实例排序

`context_examples.sort_order` 用于控制同一个词义条目下多个语境实例的展示顺序。

新建语境实例时：

```text
sort_order = 当前 card_id 下未删除语境实例的 MAX(sort_order) + 10
```

如果当前没有任何语境实例，则：

```text
sort_order = 10
```

示例：

```text
第 1 条语境：10
第 2 条语境：20
第 3 条语境：30
```

第一版使用上移 / 下移按钮调整顺序。

上移或下移时，交换相邻两个语境实例的 `sort_order`。

导入数据时，如果同一个词义条目下出现重复 `sort_order`，系统需要按当前顺序重新整理为：

```text
10, 20, 30, 40...
```

---

### 5.6 标签管理

标签用于自由分类，也可以承担来源标记作用。

示例：

```text
美剧
Friends
YouTube下载
电影
课堂视频
AI
计算机
口语
写作
高频
难词
日常表达
```

一个词义条目可以有多个标签，一个标签也可以对应多个词义条目。

标签用于分类、筛选和搜索，不影响复习算法。

标签名称在未删除标签中保持唯一。

---

### 5.7 搜索功能

搜索支持中文和外语。

可搜索内容包括：

```text
目标单词
中文释义
原句
标签
备注
```

示例：

```text
charge
收费
Friends
awkward
尴尬
```

第一版使用普通模糊搜索。

后续可以扩展为更高级的全文搜索或 AI 语义搜索。

---

## 6. 复习功能

### 6.1 复习对象

复习对象是词义条目，不是单个原句，也不是单个视频片段。

例如：

```text
charge = 收费
```

这是一个复习对象。

它下面可以挂多个语境实例。

---

### 6.2 复习页正面展示

复习时采用完整原句模式。

```text
完整显示主语境原句，目标单词不遮住。
用户回忆这个目标单词在当前语境下的中文释义。
```

例如正面显示：

```text
The hotel charges $100 per night.
```

用户需要回忆：

```text
charge 在这里是“收费”的意思。
```

页面可以高亮目标单词，帮助用户明确当前复习对象。

---

### 6.3 查看当时语境

复习页默认只显示主语境原句。

卡片下方提供：

```text
查看当时语境
```

点击后展开：

```text
本地视频
截图
音频
备注
其他语境实例
```

这样可以先回忆，再查看完整语境提示。

---

### 6.4 复习按钮

复习按钮只保留两个：

```text
Again
Good
```

判断规则：

```text
模糊、不知道、答错、不能顺利想起释义：Again
能够顺利想起当前语境下释义：Good
```

数据库保存：

```text
review_logs.rating = again / good
```

---

### 6.5 用户可见状态与 FSRS 状态

系统有两层状态。

用户可见状态：

```text
reviewing = 复习中
mastered = 已熟记
```

FSRS 内部状态：

```text
0 = New
1 = Learning
2 = Review
3 = Relearning
```

状态规则：

```text
复习中：参与 FSRS 调度，内部状态由 FSRS 算法维护。
已熟记：不进入复习队列，FSRS 状态保留但暂时冻结。
```

状态流转：

```text
创建词义条目
→ 用户状态：reviewing
→ FSRS 状态：New

复习中 + Again / Good
→ 用户状态保持 reviewing
→ FSRS 根据反馈更新内部状态和下次复习时间

reviewing → mastered
→ 不再进入复习队列
→ FSRS 数据保留

mastered → reviewing
→ FSRS 数据继续沿用
→ 如果 due_date 已经过期，则立即进入待复习队列
```

---

### 6.6 FSRS 初始状态

新建词义条目时，系统立即创建对应的 FSRS 状态。

初始状态：

```text
state = 0
due_date = created_at
reps = 0
lapses = 0
last_reviewed_at = NULL
```

含义：

```text
state = 0 表示 New。
due_date = created_at 表示新建后立即可以进入复习队列。
```

这样不需要额外处理“未开始复习”的特殊查询逻辑。

---

### 6.7 复习队列规则

复习队列只包含：

```text
word_sense_cards.status = reviewing
word_sense_cards.deleted_at IS NULL
fsrs_states.due_date <= now
```

排序规则：

```text
due_date ASC
created_at ASC
id ASC
```

说明：

```text
due_date 越早，越先复习。
due_date 相同，则创建时间更早的词义条目优先。
如果仍然相同，则按 id 升序。
```

---

### 6.8 每日复习上限

设置项：

```text
daily_review_limit
```

每日复习统计按用户设备本地自然日计算，每天 00:00 重置。

当用户达到每日复习上限后，复习页显示：

```text
今日复习目标已完成
```

用户可以选择：

```text
结束复习
继续复习
```

每日复习上限作为提醒和目标，不作为强制停止。

---

### 6.9 复习页零任务状态

如果没有待复习词义条目，复习页显示：

```text
今天没有待复习内容
```

并提供：

```text
返回首页
查看全部词义条目
```

---

## 7. 多媒体规则

第一版只支持本地媒体文件，不支持网站视频链接。

支持格式：

```text
视频：mp4
音频：mp3
图片：jpg / png / webp
```

文件大小建议：

```text
图片：单文件 10MB 以内
音频：单文件 50MB 以内
视频：单文件 300MB 以内
```

文件保存方式：

```text
数据库只保存文件信息和本地路径。
真实文件保存在本地 uploads 文件夹。
```

媒体文件需要记录可用状态：

```text
is_available = true / false
```

如果导入后文件缺失，则标记为：

```text
is_available = false
```

前端显示：

```text
文件不可用
```

---

## 8. 删除保护

系统使用软删除。

删除词义条目、语境实例、媒体文件、标签时，不立即物理删除数据，而是写入：

```text
deleted_at
```

用户删除前需要确认。

被删除内容默认不出现在列表、搜索和复习队列中。

---

### 8.1 删除词义条目

当删除 `word_sense_cards` 时，需要级联软删除：

```text
word_sense_cards.deleted_at = now
context_examples.deleted_at = now
media_files.deleted_at = now
```

也就是说，删除一个词义条目时，它下面的语境实例和媒体文件都一起进入软删除状态。

---

### 8.2 删除语境实例

当删除 `context_examples` 时，需要级联软删除：

```text
context_examples.deleted_at = now
media_files.deleted_at = now
```

也就是说，删除一个语境实例时，它下面的视频、截图、音频也一起进入软删除状态。

---

### 8.3 删除媒体文件

当删除 `media_files` 时，只软删除该媒体文件本身：

```text
media_files.deleted_at = now
```

---

### 8.4 删除标签

当删除 `tags` 时，只软删除标签本身：

```text
tags.deleted_at = now
```

`card_tags` 不单独软删除。
它的有效性跟随 `word_sense_cards` 和 `tags` 的 `deleted_at` 状态。

查询时只显示：

```text
word_sense_cards.deleted_at IS NULL
tags.deleted_at IS NULL
```

---

### 8.5 复习记录处理

`review_logs` 不跟随词义条目级联软删除。

但是统计页默认只统计未删除词义条目的复习记录。

也就是说：

```text
统计页 review_logs 需要关联 word_sense_cards
并过滤 word_sense_cards.deleted_at IS NULL
```

这样可以避免用户删除卡片后，列表看不到卡片，但统计数字仍然包含它导致的错位感。

---

## 9. 首页与统计页

### 9.1 首页

首页展示今日复习桌面和两个核心入口，不扩展新功能。

包含：

```text
本地时间段问候语
开始复习按钮
快速制卡入口
今日待复习数量
今日已复习数量
今日 Again / Good 数量
复习节奏摘要
```

首页不展示实现细节或装饰性模块：

```text
不显示 LOCAL GREETING 标签
不显示问候语调度说明
不显示单独的 today progress 大卡
不在统计卡下显示解释性小字
不显示 soft goal 模块
```

每日目标是复习页的提醒逻辑，首页不单独展示“今日复习目标已完成 / 今天可以继续积累和复习”的目标状态卡。

---

### 9.2 统计页

统计页放分析信息：

```text
总词义条目数量
复习中数量
已熟记数量
收藏数量
每日复习数量折线图
每日正确率折线图
标签分布
Again / Good 趋势
```

Again / Good 趋势必须说明含义：Again 表示没想起或记错，Good 表示顺利想起。图表应按天对比两类评分次数，避免只显示两个难以理解的独立色块。

每日复习数量和正确率统计需要排除已软删除词义条目的复习记录。

---

## 10. 导入导出

系统提供两种导入导出模式。

---

### 10.1 导出含有标记的卡片

适用于同一个用户跨设备切换、迁移或备份。

包含：

```text
词义条目
语境实例
媒体文件
标签
标签关系
收藏状态
复习状态
FSRS 状态
复习记录
用户设置
```

导出格式：

```text
zip 压缩包
```

压缩包结构：

```text
export.json
uploads/
```

用途：

```text
个人完整备份
从一台电脑迁移到另一台电脑
保留自己的复习进度、收藏状态、熟记状态和媒体文件
```

---

### 10.2 导出纯卡片

适用于不同用户之间分享卡片。

包含：

```text
词义条目
语境实例
媒体文件
标签
标签关系
```

不包含：

```text
收藏状态
复习状态
FSRS 状态
复习记录
用户设置
```

导出格式：

```text
zip 压缩包
```

压缩包结构：

```text
export.json
uploads/
```

导入纯卡片后，系统为导入用户重新初始化复习状态：

```text
word_sense_cards.status = reviewing
fsrs_states.state = 0
fsrs_states.due_date = 导入时间
reps = 0
lapses = 0
last_reviewed_at = NULL
```

---

### 10.3 批量导入冲突处理

导入前，系统先扫描冲突。

冲突判断：

```text
target_word + context_meaning 相同
```

如果发现冲突，不逐条弹窗，而是显示冲突列表。

用户可以统一选择：

```text
全部跳过
全部合并为已有词义条目的新语境
全部作为新词义条目导入
逐项处理
```

导入过程中如果发现媒体文件缺失：

```text
保留媒体记录
is_available = false
```

---

## 11. 页面规划

第一版页面包括：

```text
首页
制卡页
词义条目列表页
词义条目详情页
复习页
标签管理页
收藏页
统计页
设置页
```

---

### 11.1 首页

展示今日复习任务、时间段问候语和快速入口。

包含：

```text
本地时间段问候语
开始复习按钮
快速制卡入口
今日待复习数量
今日已复习数量
今日 Again / Good 数量
复习节奏摘要
```

页面不展示：

```text
LOCAL GREETING 标签
问候语调度说明
独立 today progress 大卡
统计卡解释性小字
soft goal 模块
首页目标状态卡
```

---

### 11.2 制卡页

用于创建词义条目，或给已有词义条目添加新的语境实例。页面以表单为主，不展示额外的大型 hero 标题或装饰性说明文案。

核心功能：

```text
输入目标单词
输入当前语境释义
输入原句
添加标签
添加备注
上传本地视频 mp4
上传截图 jpg / png / webp
上传音频 mp3
保存
```

已有词义联想：

```text
目标单词为空时不展示已有词义模块
输入目标单词后展示已有词义模块
模块标题为“查找已有词义，避免重复建卡”
目标单词 + 当前语境释义完全匹配已有条目时，隐藏创建新词义条目的选项，并保存为新语境实例
同名单词但释义不同的条目仅作为参考，仍允许创建新词义条目
```

---

### 11.3 词义条目列表页

支持：

```text
搜索
分页
标签筛选
状态筛选
收藏筛选
标记熟记
查看详情
```

列表页不展示独立的顶部大条“快速制卡”按钮；快速制卡入口保留在首页和主导航。

列表默认展示：

```text
目标单词
当前语境释义
主语境原句
标签
复习状态
收藏状态
```

默认排序：

```text
updated_at DESC
```

分页规则：

```text
默认每页 20 条
可选 20 / 50 / 100
```

---

### 11.4 词义条目详情页

展示：

```text
目标单词
当前语境释义
全部语境实例
本地视频
截图
音频
标签
备注
复习信息
```

可操作：

```text
添加新的语境实例
设置主语境
上移 / 下移语境实例
编辑释义
编辑标签
标记熟记
恢复复习
删除
```

语境实例排序第一版使用上移 / 下移按钮。

---

### 11.5 复习页

按照 FSRS 调度展示待复习词义条目。

复习队列排序：

```text
due_date ASC
created_at ASC
id ASC
```

默认显示主语境原句。

点击“查看当时语境”后展开：

```text
本地视频
截图
音频
备注
其他语境实例
```

用户查看答案后点击：

```text
Again
Good
```

如果没有待复习内容，显示：

```text
今天没有待复习内容
```

并提供：

```text
返回首页
查看全部词义条目
```

达到每日复习上限后，显示：

```text
今日复习目标已完成
```

并提供：

```text
结束复习
继续复习
```

---

### 11.6 标签管理页

用于新增、编辑、删除标签，并查看某个标签下的词义条目。

同名标签不允许重复。

---

### 11.7 收藏页

展示用户收藏的词义条目。

支持：

```text
搜索
分页
查看详情
取消收藏
```

默认排序：

```text
updated_at DESC
```

分页规则与词义条目列表页保持一致：

```text
默认每页 20 条
可选 20 / 50 / 100
```

---

### 11.8 统计页

展示：

```text
总词义条目数量
复习中数量
已熟记数量
收藏数量
每日复习数量折线图
每日正确率折线图
标签分布
Again / Good 趋势
```

Again / Good 趋势展示按天对比的 Again 与 Good 次数，并在页面上说明：Again 是没想起或记错，Good 是顺利想起。

---

### 11.9 设置页

用于设置：

```text
界面语言
默认学习语言
默认释义语言
每日复习数量
数据导入导出
```

第一版设置页不显示本地 API、CLI、AI、同步相关配置。

---

## 12. 数据库核心表

### 12.1 word_sense_cards

词义条目表。

```text
id
target_word
context_meaning
target_language
definition_language
status
is_favorite
created_at
updated_at
deleted_at
```

枚举：

```text
status = reviewing / mastered
```

说明：

```text
id 是主键。
target_word 是目标单词。
context_meaning 是当前语境释义。
status 是用户可见复习状态。
is_favorite 表示是否收藏。
deleted_at 用于软删除。
```

---

### 12.2 context_examples

语境实例表。

```text
id
card_id
sentence
note
is_primary
sort_order
created_at
updated_at
deleted_at
```

说明：

```text
is_primary 用于标记主语境。
sort_order 用于控制多个语境实例的展示顺序。
同一个 card_id 下只能有一个 is_primary = true。
```

---

### 12.3 media_files

媒体附件表。

```text
id
context_example_id
media_type
file_name
file_path
mime_type
file_size
is_available
created_at
deleted_at
```

枚举：

```text
media_type = video / image / audio
```

说明：

```text
第一版只支持本地媒体文件。
视频只支持 mp4。
音频只支持 mp3。
图片支持 jpg / png / webp。
本地文件保存在 uploads 文件夹。
is_available 用于标记文件是否存在且可访问。
```

---

### 12.4 tags

标签表。

```text
id
name
created_at
updated_at
deleted_at
```

约束：

```text
未删除标签中 name 唯一。
```

---

### 12.5 card_tags

词义条目与标签关系表。

```text
card_id
tag_id
created_at
```

约束：

```text
card_id + tag_id 联合唯一。
```

说明：

```text
card_tags 不单独软删除。
其有效性跟随 word_sense_cards 和 tags 的 deleted_at 状态。
```

---

### 12.6 fsrs_states

FSRS 状态表。

```text
id
card_id
due_date
stability
difficulty
reps
lapses
state
last_reviewed_at
created_at
updated_at
```

约束：

```text
card_id UNIQUE
```

枚举：

```text
state = 0 / 1 / 2 / 3

0 = New
1 = Learning
2 = Review
3 = Relearning
```

说明：

```text
fsrs_states 与 word_sense_cards 是一对一关系。
elapsed_days 和 scheduled_days 作为运行时计算值，不持久化保存。
```

---

### 12.7 review_logs

复习记录表。

```text
id
card_id
rating
reviewed_at
due_date_before
due_date_after
created_at
```

枚举：

```text
rating = again / good
```

说明：

```text
due_date_before 和 due_date_after 保留在同一条复习记录中，方便单条记录自解释。
review_logs 不跟随卡片软删除。
统计时默认排除已软删除卡片的复习记录。
```

---

### 12.8 user_settings

用户设置表。

```text
id
interface_language
default_target_language
default_definition_language
daily_review_limit
created_at
updated_at
```

说明：

```text
user_settings 是单行配置表。
固定 id = 1。
首次启动时自动创建默认配置。
后续更新使用 UPDATE id = 1。
```

---

## 13. 数据库关系

```text
一个词义条目可以有多个语境实例。
一个语境实例属于一个词义条目。

一个语境实例可以有多个媒体文件。
一个媒体文件属于一个语境实例。

一个词义条目可以有多个标签。
一个标签可以对应多个词义条目。

一个词义条目有一个 FSRS 状态。
一个词义条目可以有多条复习记录。
```

关系总结：

```text
word_sense_cards 1 - N context_examples
context_examples 1 - N media_files
word_sense_cards N - M tags
word_sense_cards 1 - 1 fsrs_states
word_sense_cards 1 - N review_logs
```

---

## 14. 本地 API 与 CLI 扩展

第一版先完成本地 Web 应用。

后续可以提供本地 API 和 CLI 命令，让终端或 AI 工具直接操作系统。

### 14.1 本地 API 示例

```text
POST /api/cards
GET /api/cards
GET /api/cards/:id
POST /api/cards/:id/examples
GET /api/review/due
POST /api/review/:id
GET /api/search
POST /api/export
```

### 14.2 CLI 示例

```bash
cvn add --word exhausted --sentence "I was exhausted." --meaning "筋疲力尽的"

cvn search exhausted

cvn search 筋疲力尽

cvn review due

cvn tag list

cvn export --type marked

cvn export --type pure
```

---

## 15. 后续扩展方向

系统保留后续扩展能力：

```text
本地 API
CLI 命令
MCP Server
AI 辅助制卡
AI 语义搜索
OCR 截图识别
ASR 音频识别
视频字幕提取
浏览器插件
移动端适配
桌面端打包
自动备份
同步按钮
Anki 导出
多语言学习
多释义语言
```

其中，同步按钮用于后续支持跨设备使用。第一版只保留扩展空间，不实现同步功能。

---
## 16. 技术栈
前端：React + Vite
后端：Node.js + Express
数据库：SQLite（better-sqlite3）
FSRS：ts-fsrs 库
样式：Tailwind CSS
---
## 17. 项目一句话介绍

Context Vocabulary Notebook 是一个本地优先的轻量语境词汇复习工具。用户可以围绕本地视频创建词义条目，每个词义条目代表一个目标单词在某个具体语义下的含义，并可以关联多个原句、本地视频、截图和音频语境。系统通过 FSRS 算法安排复习，标签用于自由分类、来源标记、搜索和筛选，并为后续本地 API、CLI、AI 辅助和跨设备同步保留扩展空间。
