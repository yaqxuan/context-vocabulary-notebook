[中文](./README.md) | [English](./README.en.md) | [日本語](./README.ja.md) | [Español](./README.es.md) | [العربية](./README.ar.md) | [Deutsch](./README.de.md) | [Français](./README.fr.md) | [Italiano](./README.it.md) | [Latina](./README.la.md)

# Context Vocabulary Notebook (دفتر مفردات السياق)

عندما تصادف كلمة جديدة أثناء مشاهدة فيديو أو الاستماع إلى درس أو قراءة ترجمات، يحفظ التطبيق ليس “الكلمة نفسها” فقط، بل الجملة الأصلية والسياق ولقطة الشاشة ومقطع الصوت/الفيديو والملاحظات والوسوم.

عند المراجعة ترى المشهد الحقيقي الذي قابلت فيه الكلمة، لا مفردة معزولة.

يناسبك إذا كنت:

- تشاهد أو تستمع كثيرًا إلى فيديوهات أو دورات أو أفلام أو بودكاست أو مواد استماع بلغات أجنبية.
- تريد مراجعة متباعدة شبيهة بـ Anki، لكن مع بطاقات تحتفظ بالجملة الأصلية ولقطات الشاشة ومقاطع الوسائط.
- تريد إبقاء بيانات تعلمك على حاسوبك، من دون إنشاء حساب سحابي لمجرد دفتر مفردات.
- تحتاج إلى مساعدة في التعرف على الجمل من فيديوهات أو صوتيات أو صور محلية قبل تهذيبها يدويًا إلى بطاقات.

> هذا المشروع تطبيق ويب محلي. افتراضيًا تُخزَّن البيانات في قاعدة بيانات SQLite ومجلد `uploads/` على حاسوبك؛ ولا يلزم أي حساب سحابي.

## Demo

![مثال إنشاء بطاقة في Context Vocabulary Notebook](./docs/demo/01-create-card-ar.png)

## ما الذي يمكنك فعله به

- أنشئ بطاقات حول سياق حقيقي: الكلمة المستهدفة، الجملة الأصلية، المعنى السياقي، الملاحظات والوسوم.
- احفظ مرفقات وسائط محلية: فيديو `mp4`، صوت `mp3`، صور `jpg / png / webp`.
- استورد المقاطع دفعة واحدة: أدخل عدة مقاطع فيديو أو صوت أو صور معًا، راجع نتائج التعرف واحدًا واحدًا، ثم أنشئ البطاقات.
- استخدم مساعدات OCR/STT محلية اختيارية: اضبط ffmpeg و Tesseract و whisper.cpp للتعرف على الجمل من الصور أو إطارات الفيديو أو الصوت.
- أرفق عدة أمثلة سياقية بالمعنى نفسه للكلمة، لتعرف كيف يظهر المعنى في مواد مختلفة.
- راجع باستخدام التكرار المتباعد FSRS، مع إعادة كل كلمة إلى السياق الذي وجدتها فيه.
- ابحث، رشّح بالوسوم، أضف إلى المفضلة، اعرض الإحصاءات، واستورد/صدّر نسخ ZIP احتياطية.
- اقتراحات AI اختيارية: بعد إعداد API OpenAI-compatible، احصل على مساعدة في المعاني السياقية وملاحظات الاستخدام وترجمة الجملة كاملة والاشتقاق المعجمي والتدقيق الإملائي.

## مكان البيانات وتنبيه مساحة القرص

اختر مجلد التثبيت أولًا. افتراضيًا يحتفظ التطبيق بقاعدة البيانات والملفات المرفوعة والإعدادات تحت المجلد الذي يعمل منه.

البيانات المحلية الافتراضية:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

ملاحظة: بعد رفع الفيديوهات والصوت ولقطات الشاشة، قد يستمر `uploads/` في النمو. وقد تستهلك نماذج Whisper أيضًا من مئات MB إلى عدة GB.

تجنّب تشغيله في هذه المواقع:

- `/usr/local` أو `/opt` أو أي مجلدات أخرى تتطلب عادةً أذونات `sudo` أو root.
- `C:\Program Files` أو أي مجلدات أخرى محمية من النظام.
- المجلدات المؤقتة أو ذاكرات تنزيل مؤقتة أو مواقع قد يحذفها النظام أو أدوات التنظيف تلقائيًا.
- مواقع ذات مساحة حرة قليلة، أو قواعد مزامنة غير واضحة، أو سلوك تنظيف/حصة خاص بمحركات سحابية.

يفضَّل مكان يمكنك الاحتفاظ به على المدى الطويل، مثل:

```text
D:\study\context-vocabulary-notebook
E:\study\context
$HOME/context-vocabulary-notebook
```

## تثبيت بخطوة واحدة

ادخل إلى مجلد فارغ تريد وضع ملفات المشروع فيه، ثم شغّل الأمر المناسب لنظامك. يثبّت السكربت المشروع في المجلد الحالي؛ وإذا كان المجلد يحتوي هذا المشروع بالفعل فسيحدّثه تلقائيًا.

| النظام | الأمر |
|------|------|
| Linux / macOS / WSL | انظر أمر Linux / macOS / WSL أدناه |
| Windows PowerShell | انظر أمر Windows PowerShell أدناه |

### Linux / macOS / WSL

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

### Windows PowerShell

```powershell
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

بعد التثبيت، شغّله باستخدام:

```bash
npm run dev
```

افتحه في المتصفح:

```text
http://localhost:5173
```

فحص صحة backend:

```text
http://localhost:3107/api/health
```

## التحديث إلى أحدث إصدار

ادخل إلى المجلد الذي ثبّت فيه المشروع، ثم شغّل:

Linux / macOS / WSL / Git Bash:

```bash
git pull --ff-only
npm ci
npm run build
npm run dev
```

Windows PowerShell:

```powershell
git pull --ff-only
npm ci
npm run build
npm run dev
```

يمكنك أيضًا تشغيل أمر التثبيت بخطوة واحدة مرة أخرى. عندما يكتشف السكربت أن المجلد الحالي مشروع موجود، فسيحدّثه تلقائيًا ويثبّت الاعتماديات ويبنيه.

## OCR / تعرف صوتي محلي (اختياري)

لا يحتاج دفتر المفردات الأساسي إلى OCR/STT. يمكنك أولًا إنشاء البطاقات ومراجعتها يدويًا. لا تُعدّ هذه الأدوات إلا إذا أردت التعرف تلقائيًا على الجملة الأصلية من الفيديو أو الصوت أو الصور.

يستخدم التعرف المحلي:

- ffmpeg: يستخرج الصوت من الفيديو.
- Tesseract: يتعرف على النص في الصور أو إطارات الفيديو.
- whisper.cpp + نموذج Whisper: يتعرف على الكلام في الصوت أو الفيديو.

### تكوين التعرف المحلي تلقائيًا (جرّبه أولًا)

شغّل هذا داخل مجلد المشروع:

Linux / macOS / WSL:

```bash
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_TESSERACT_LANG='eng'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

للتعرف على ترجمات صينية وإنجليزية، غيّر اللغة إلى:

```powershell
$env:CVN_TESSERACT_LANG='eng+chi_sim'; irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install-recognition-windows.ps1 -ErrorAction Stop | iex
```

بعد انتهاء السكربت، انقر **I installed it, check again** في بطاقة التعرف المحلي في صفحة إعدادات التطبيق. تعيد الإصدارات الجديدة تحميل `.env`، لذلك لا تحتاج عادةً إلى إعادة تشغيل backend يدويًا.

### النماذج واستخدام القرص

نماذج Whisper كبيرة، ويختلف وقت التنزيل حسب الشبكة:

- `tiny` / `base`: صغيرة وسريعة ومناسبة للتجربة، لكنها أقل دقة.
- `small` / `medium`: أدق، لكنها تستهلك مساحة قرص و CPU أكثر.
- `large`: كبيرة جدًا وقد تكون بطيئة على الحواسيب العادية. لا يُنصح بها كخيار افتراضي.

ينزّل مثبت التعرف على Windows افتراضيًا `ggml-small.bin`. حجمه يقارب بضع مئات من MB.

### تكوين التعرف المحلي يدويًا

إذا فشل الإعداد بخطوة واحدة، أو إذا أردت إدارة مسارات الأدوات بنفسك، فثبّت الأدوات يدويًا واكتب هذه القيم في `.env`:

```env
CVN_FFMPEG_PATH=/absolute/path/to/ffmpeg

CVN_STT_PROVIDER=whisper.cpp
CVN_WHISPER_CPP_PATH=/absolute/path/to/whisper-cli
CVN_WHISPER_CPP_MODEL=/absolute/path/to/ggml-small.bin
CVN_WHISPER_CPP_TIMEOUT_MS=120000

CVN_OCR_PROVIDER=tesseract
CVN_TESSERACT_PATH=/absolute/path/to/tesseract
CVN_TESSERACT_LANG=eng
CVN_TESSERACT_TIMEOUT_MS=30000
```

مثال مسار Windows:

```env
CVN_FFMPEG_PATH=E:\study\context\tools\ffmpeg\bin\ffmpeg.exe
CVN_WHISPER_CPP_PATH=E:\study\context\tools\whisper.cpp\Release\whisper-cli.exe
CVN_WHISPER_CPP_MODEL=E:\study\context\models\ggml-small.bin
CVN_TESSERACT_PATH=E:\study\context\tools\tesseract\tesseract.exe
CVN_TESSERACT_LANG=eng+chi_sim
```


## خيارات تثبيت متقدمة

### تحديد مجلد التثبيت

Linux / macOS / WSL:

```bash
export CVN_HOME="$HOME/context-vocabulary-notebook"
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_HOME = "C:\path\to\empty-folder"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

### السماح لمثبت التطبيق الأساسي بمحاولة إضافة الأدوات الاختيارية

هذا غير مطلوب في التثبيت الأول العادي. استخدمه فقط عند الحاجة.

Linux / macOS / WSL:

```bash
export CVN_INSTALL_FFMPEG=1
export CVN_INSTALL_TESSERACT=1
curl --retry 5 --retry-delay 2 --retry-connrefused -fsSL https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.sh | bash
```

Windows PowerShell:

```powershell
$env:CVN_INSTALL_FFMPEG = "1"
$env:CVN_INSTALL_TESSERACT = "1"
irm https://raw.githubusercontent.com/yaqxuan/context-vocabulary-notebook/main/scripts/install.ps1 -ErrorAction Stop | iex
```

مصدر المثبّت:

- Linux / macOS / WSL: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.sh
- Windows PowerShell: https://github.com/yaqxuan/context-vocabulary-notebook/blob/main/scripts/install.ps1

## التثبيت اليدوي

إذا لم يستطع سكربت الخطوة الواحدة تجهيز البيئة، فثبّت أولًا Node.js 22 LTS و npm و Git وأدوات البناء الأصلية المطلوبة يدويًا، ثم شغّل:

Linux / macOS / WSL / Git Bash:

```bash
cd "$HOME"
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
cd context-vocabulary-notebook
cp .env.example .env
npm ci
npm run dev
```

Windows PowerShell:

```powershell
Set-Location $HOME
git clone https://github.com/yaqxuan/context-vocabulary-notebook.git context-vocabulary-notebook
Set-Location context-vocabulary-notebook
Copy-Item .env.example .env
npm ci
npm run dev
```

افتحه في المتصفح:

```text
http://localhost:5173
```

## الأسئلة الشائعة

### ماذا أفعل إذا فشل التثبيت بخطوة واحدة؟

- إذا قالت الرسالة إن أمرًا مفقود، فأغلق الطرفية وافتحها من جديد، ثم شغّل المثبّت مرة أخرى.
- Linux / WSL: إذا أبلغ `apt-get update` عن أخطاء Docker أو Chromium أو Snap أو مفتاح GPG أو ما شابه، فهي عادةً مشكلة مصدر apt موجود أو إعداد حزمة غير مكتمل، وليست لأن هذا المشروع يعتمد على تلك الحزم. أصلح/عطّل مصدر apt المتأثر أولًا، أو ثبّت Git و Node.js 22 LTS و npm يدويًا قبل إعادة المحاولة.
- macOS: إذا ظهرت مطالبة Xcode Command Line Tools، فانقر Install، ثم أعد تشغيل المثبّت بعد اكتمالها.
- Windows: إذا فشل `npm ci` عند `better-sqlite3`، فعادةً تحتاج إلى Python و Visual Studio Build Tools / MSVC؛ وإذا لم تكن معتادًا على هذه الأدوات، فيُوصى باستخدام WSL.

### تفتح الصفحة، لكن التعرف المحلي ما زال يظهر غير مهيأ

تأكد أولًا من اكتمال مثبت التعرف ومن وجود مسارات `CVN_*` المقابلة في `.env`. ثم انقر **I installed it, check again** في صفحة الإعدادات.

إذا ظل لا يعمل:

- تأكد من أن التطبيق شُغّل من مجلد المشروع نفسه.
- تأكد من عدم وجود عملية backend قديمة على `3107` تشغل المنفذ.
- شغّل `npm run dev` مرة أخرى وحدّث الصفحة.

### المنفذ مستخدم بالفعل

غيّر منفذ backend:

```env
PORT=3108
```

لتغيير منفذ frontend في Linux / macOS / WSL / Git Bash:

```bash
CLIENT_PORT=5174 npm run dev
```

لتغيير منفذ frontend في Windows PowerShell:

```powershell
$env:CLIENT_PORT = "5174"
npm run dev
```

### لا توجد ترجمات مرئية في المقطع، لذلك لا يتم التعرف على الجملة الأصلية

إذا لم تكن هناك ترجمات ظاهرة في إطار الفيديو، أو كانت الترجمات صغيرة أو ضبابية، فقد لا يعثر OCR على جملة؛ في هذه الحالة تحتاج إلى التعرف على الكلام. تأكد من توفر ffmpeg و whisper.cpp و `CVN_WHISPER_CPP_MODEL`. وإذا كان الصوت أيضًا لا يحتوي على كلام واضح، فأدخل الجملة الأصلية يدويًا.

إذا ظهرت الرسالة `Audio extraction failed`، فعادةً يكون ffmpeg غير متاح، أو المسار غير صحيح، أو أن ffmpeg لا يستطيع قراءة ملف الفيديو/الصوت الأصلي.

### بيانات لغة Tesseract مفقودة

إذا أبلغ OCR عن بيانات لغة مفقودة، فهذا يعني أنه عُثر على Tesseract لكن ملف traineddata المطابق غير مثبت. رموز اللغات الشائعة:

- الإنجليزية: `eng`
- الصينية المبسطة: `chi_sim`
- اليابانية: `jpn`
- الكورية: `kor`
- الفرنسية: `fra`
- الألمانية: `deu`
- الإسبانية: `spa`
- الروسية: `rus`

لعدة لغات:

```env
CVN_TESSERACT_LANG=eng+chi_sim
```

### مسار نموذج Whisper غير مهيأ

لا يملك `CVN_WHISPER_CPP_MODEL` نموذجًا افتراضيًا. نزّل نموذج ggml مدعومًا من whisper.cpp واكتب مساره المطلق في `.env`.

## البيانات والنسخ الاحتياطي

افتراضيًا، توجد كل البيانات داخل مجلد المشروع:

```text
data/context-vocabulary-notebook.sqlite
uploads/
.env
```

للنسخ الاحتياطي، احفظها معًا:

```bash
tar -czf vocabulary-notebook-backup.tar.gz data uploads .env
```

للاستعادة، أعد هذه الملفات إلى مجلد المشروع نفسه وشغّل التطبيق.

يوفر التطبيق أيضًا استيراد/تصدير ZIP:

- نسخة احتياطية كاملة: تشمل البطاقات والسياقات والوسائط والوسوم والمفضلات وحالة المراجعة وحالة FSRS وسجلات المراجعة وإعدادات المستخدم.
- مشاركة البطاقات فقط: تستبعد تقدم المراجعة الشخصي وحالة المفضلة وإعدادات المستخدم.

مفاتيح AI API إعدادات محلية حساسة ولا تُضمّن في ملفات التصدير؛ تحتاج إلى إدخالها مرة أخرى على جهاز آخر.

## توصيات ملفات الوسائط

| النوع | الصيغ المدعومة | الحجم الموصى به |
|------|----------|----------|
| فيديو | `mp4` | ضمن 300MB لكل ملف |
| صوت | `mp3` | ضمن 50MB لكل ملف |
| صورة | `jpg` / `png` / `webp` | ضمن 10MB لكل ملف |

## إعداد اقتراحات الذكاء الاصطناعي

تدعم صفحة إنشاء البطاقات اقتراحات AI اختيارية. أضف تكوين API متوافقًا مع OpenAI في صفحة الإعدادات:

- اسم العرض
- Base URL
- API Key
- Model

ملاحظات:

- بدون تكوين AI، يظل إنشاء البطاقات يدويًا والمراجعة يعملان بشكل طبيعي.
- يُخزّن API Key في قاعدة البيانات المحلية ويُخفى في UI.
- لا يُضمّن API Key في ملفات التصدير.
- يستطيع AI اقتراح معانٍ سياقية وملاحظات استخدام وترجمات للجمل الكاملة وردّ الكلمات إلى أصلها وتدقيقًا إملائيًا أثناء إنشاء البطاقة.
- نماذج النص المتوافقة مع OpenAI مثل DeepSeek لا تنفذ OCR/STT المحلي؛ يعتمد التعرف على نص الصور على Tesseract، ويعتمد التعرف على الكلام على whisper.cpp.

## المتطلبات

| البيئة | المتطلب | ملاحظات |
|------|------|------|
| Node.js | يُوصى بـ Node.js 22 LTS | يعتمد بناء frontend وخوادم التطوير وخدمة backend كلها على Node.js. يحاول المثبّت توفيره. |
| npm | يُثبّت مع Node.js | يحتوي المستودع على `package-lock.json`؛ تُثبّت الاعتماديات باستخدام `npm ci`. |
| Git | مطلوب عند الاستنساخ من GitHub | يتحقق المثبّت من وجوده ويحاول توفيره. |
| المتصفح | Chrome / Edge / Firefox / Safari أو متصفح حديث آخر | يُستخدم التطبيق عبر صفحة ويب محلية. |
| أدوات بناء C/C++ | قد تكون مطلوبة | `better-sqlite3` وحدة أصلية؛ إذا لم تتوفر حزمة مبنية مسبقًا، يحاول `npm ci` ترجمتها محليًا. |
| ffmpeg | اختياري | مطلوب لتحليل مقاطع الفيديو/الصوت. |
| Tesseract OCR | اختياري | مطلوب لتنفيذ OCR على الصور أو إطارات الفيديو. |
| whisper.cpp + نموذج Whisper | اختياري | مطلوب للتعرف على الكلام في الصوت/الفيديو. |

### توصية WSL / Windows الأصلي

- عادةً يكون WSL الأكثر استقرارًا: مسارات Node و Git و ffmpeg و Tesseract وأدوات البناء الأصلية أقرب إلى Linux.
- Windows PowerShell الأصلي مدعوم: يعيد السكربت استخدام Git / Node.js / npm الموجودة ويحاول استخدام `winget` فقط عندما يكون شيء مفقودًا.
- إذا فشل `npm ci` في Windows الأصلي عند `better-sqlite3`، فثبّت Python و Visual Studio Build Tools / MSVC كما يُطلب، أو استخدم WSL.

## متغيرات البيئة

<!-- AUTO-GENERATED:ENV -->
| المتغير | مطلوب | الافتراضي | الوصف |
|------|------|--------|------|
| `PORT` | لا | `3107` | منفذ خدمة Express الخلفية. يوجّه خادم Vite التطويري طلبات `/api` إلى هذا المنفذ. |
| `DATABASE_PATH` | لا | `./data/context-vocabulary-notebook.sqlite` | مسار قاعدة بيانات SQLite. تُفسَّر المسارات النسبية من جذر المشروع. |
| `UPLOADS_DIR` | لا | `./uploads` | دليل ملفات الوسائط المرفوعة. تُفسَّر المسارات النسبية من جذر المشروع. |
| `CVN_FFMPEG_PATH` | لا | `ffmpeg` | مسار ملف ffmpeg التنفيذي؛ عند تثبيت أدوات Windows أصلية، استخدم مسارًا مطلقًا عند الحاجة. |
| `CVN_STT_PROVIDER` | لا | `whisper.cpp` | موفر التعرف المحلي على الكلام؛ يمكن أن يكون `whisper.cpp` أو `disabled`. |
| `CVN_WHISPER_CPP_PATH` | لا | `whisper-cli` | مسار ملف whisper.cpp التنفيذي؛ إذا كان نظامك يحتوي فقط على `main` القديم، فاضبطه إلى `main` أو إلى مسار مطلق. |
| `CVN_WHISPER_CPP_MODEL` | مطلوب لـ STT المحلي | فارغ | مسار ملف نموذج Whisper؛ لا يقوم المثبّت بتنزيل نموذج تلقائيًا. |
| `CVN_WHISPER_CPP_TIMEOUT_MS` | لا | `120000` | مهلة تشغيل تعرّف واحدة بواسطة whisper.cpp. |
| `CVN_OCR_PROVIDER` | لا | `tesseract` | موفر OCR المحلي؛ يمكن أن يكون `tesseract` أو `disabled`. |
| `CVN_TESSERACT_PATH` | لا | `tesseract` | مسار ملف Tesseract التنفيذي. |
| `CVN_TESSERACT_LANG` | لا | يُختار تلقائيًا حسب لغة الهدف | رموز لغات Tesseract، مثل `eng` و `chi_sim` و `eng+chi_sim`. |
| `CVN_TESSERACT_TIMEOUT_MS` | لا | `30000` | مهلة تشغيل OCR واحدة بواسطة Tesseract. |
| `CVN_CLIP_ANALYSIS_CLOUD_FALLBACK` | لا | `0` | السماح بالرجوع إلى التفريغ السحابي عندما يفشل التعرف المحلي على المقاطع؛ معطّل افتراضيًا. |
| `CVN_LOCAL_READINESS_TIMEOUT_MS` | لا | يحدده الخادم | مهلة فحوص جاهزية التعرف المحلي. |
<!-- /AUTO-GENERATED:ENV -->

## أوامر شائعة

<!-- AUTO-GENERATED:SCRIPTS -->
| الأمر | الوصف |
|------|------|
| `npm run dev` | يشغّل خادم تطوير backend وخادم تطوير Vite frontend معًا. |
| `npm run dev:client` | يشغّل خادم تطوير Vite frontend فقط، ويستمع افتراضيًا على `0.0.0.0:5173`. |
| `npm run dev:server` | يشغّل خادم تطوير Express backend فقط، ويستمع افتراضيًا على `localhost:3107`. |
| `npm run build` | يشغّل فحوص الأنواع، ثم يبني frontend و backend. |
| `npm test` | يشغّل اختبارات Vitest للوحدات/التكامل. |
| `npm run test:e2e` | يشغّل اختبارات Playwright E2E؛ ينجح حتى عندما لا توجد ملفات اختبار. |
| `npm run typecheck` | يشغّل فحوص أنواع TypeScript للـ frontend وجانب Node. |
| `npm run lint` | يعادل حاليًا `npm run typecheck`. |
<!-- /AUTO-GENERATED:SCRIPTS -->

## ملاحظات التطوير

حزمة المشروع:

- React + Vite
- Node.js + Express
- SQLite + better-sqlite3
- ts-fsrs
- Tailwind CSS
- Vitest
- Playwright

يبقى الإصدار 1 محليًا أولًا: لا قاموس مدمج، ولا تكامل مع قاموس، ولا روابط لفيديوهات مواقع الويب، ولا مزامنة. يضيف V2 الحالي اقتراحات AI أثناء إنشاء البطاقات ومساعدات التعرف المحلي على المقاطع.

## ملاحظات قبل التثبيت وإخلاء مسؤولية

بحسب معرفة المؤلف الحالية، لا يحتوي كود المصدر الخاص بهذا المشروع على أي كود خبيث. يتحقق المثبّت من البيئة المحلية، ويحاول على المنصات المدعومة تثبيت الاعتماديات المفقودة مثل Git و Node.js و npm؛ وعندما تكون أدوات البناء الأصلية مفقودة، يطبع إرشادات، وتتطلب بعض المنصات تثبيتًا يدويًا.

ينزّل التثبيت برامج واعتماديات من أطراف ثالثة عبر مديري حزم النظام و npm. وقد يتأثر التثبيت والاستخدام مع ذلك بأذونات النظام وحالة الشبكة وتوفر مدير الحزم وبرامج مكافحة الفيروسات وسياسات أجهزة المؤسسات ومساحة القرص وسلاسل توريد اعتماديات الطرف الثالث ونتائج ترجمة وحدات Node الأصلية وعوامل مشابهة. يتحمل المستخدم مسؤولية المشكلات والنتائج الناتجة عن تشغيل المثبّتات وتثبيت الاعتماديات وتعديل بيئة النظام ورفع/حفظ الملفات المحلية.

إذا لم يستطع السكربت تجهيز البيئة تلقائيًا، فسيطبع الأدوات المفقودة والخطوات التالية المقترحة؛ عندها تحتاج إلى تثبيتها يدويًا لنظامك ثم إعادة المحاولة.

## الرخصة

يستخدم هذا المشروع رخصة MIT. راجع [`LICENSE`](./LICENSE).

