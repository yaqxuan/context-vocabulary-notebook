import type { SupportedLanguage } from '../../shared/constants';

export type GreetingAudience = 'shared';

export type GreetingBucket =
  | '04:00-07:00'
  | '07:00-11:00'
  | '11:00-13:00'
  | '13:00-18:00'
  | '18:00-21:00'
  | '21:00-23:00'
  | '23:00-04:00';

export interface GreetingPhrase {
  text: string;
  translation: string;
}

export interface GreetingContext {
  date: string;
  bucket: GreetingBucket;
  audience: GreetingAudience;
}

export interface GreetingSelection extends GreetingContext, GreetingPhrase {}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const LOCALIZED_GREETING_TEXT: Record<Exclude<SupportedLanguage, '中文' | '英语'>, Record<GreetingBucket, string>> = {
  日语: {
    '04:00-07:00': '夜明け前の静けさの中で、今日の最初の言葉を迎えましょう。',
    '07:00-11:00': '朝の時間に単語帳を開けば、新しい言葉が一日を明るくします。',
    '11:00-13:00': '昼の区切りに、ひとつの単語をもう一度確かめましょう。',
    '13:00-18:00': '午後の光の中で、覚えた言葉をゆっくり自分のものにしましょう。',
    '18:00-21:00': '夕方の復習は、今日出会った言葉をやさしく定着させます。',
    '21:00-23:00': '夜の静けさの中で、言葉は記憶の中に深く根を下ろします。',
    '23:00-04:00': '深夜の短い復習でも、明日の理解につながります。',
  },
  韩语: {
    '04:00-07:00': '새벽빛이 오기 전, 오늘의 첫 단어를 조용히 맞이해요.',
    '07:00-11:00': '아침에 단어장을 열면 새로운 말들이 하루를 밝게 합니다.',
    '11:00-13:00': '점심 무렵, 한 단어를 다시 확인하며 기억을 단단히 해요.',
    '13:00-18:00': '오후 햇살 속에서 배운 단어를 천천히 내 것으로 만들어요.',
    '18:00-21:00': '저녁 복습은 오늘 만난 단어를 부드럽게 붙잡아 줍니다.',
    '21:00-23:00': '밤의 고요 속에서 단어들이 기억 속에 깊이 자리 잡습니다.',
    '23:00-04:00': '늦은 밤의 짧은 복습도 내일의 이해로 이어집니다.',
  },
  法语: {
    '04:00-07:00': 'Avant l’aube, accueillez doucement le premier mot de la journée.',
    '07:00-11:00': 'Le matin, chaque mot nouveau peut éclairer toute la journée.',
    '11:00-13:00': 'À midi, revoyez un mot et laissez-le se fixer tranquillement.',
    '13:00-18:00': 'Dans la lumière de l’après-midi, les mots appris deviennent les vôtres.',
    '18:00-21:00': 'La révision du soir aide les mots du jour à rester près de vous.',
    '21:00-23:00': 'Dans le calme de la nuit, les mots prennent racine dans la mémoire.',
    '23:00-04:00': 'Même une courte révision tardive nourrit la compréhension de demain.',
  },
  德语: {
    '04:00-07:00': 'Vor dem Morgengrauen begrüßt du leise das erste Wort des Tages.',
    '07:00-11:00': 'Am Morgen macht jedes neue Wort deinen Tag ein wenig heller.',
    '11:00-13:00': 'Zur Mittagszeit festigt ein kurzer Blick zurück deine Erinnerung.',
    '13:00-18:00': 'Im Nachmittagslicht werden gelernte Wörter langsam zu deinen eigenen.',
    '18:00-21:00': 'Die Wiederholung am Abend hält die Wörter des Tages sanft fest.',
    '21:00-23:00': 'In der Ruhe der Nacht schlagen Wörter Wurzeln im Gedächtnis.',
    '23:00-04:00': 'Auch eine kurze späte Wiederholung stärkt das Verstehen von morgen.',
  },
  西班牙语: {
    '04:00-07:00': 'Antes del amanecer, saluda en silencio a la primera palabra del día.',
    '07:00-11:00': 'Por la mañana, cada palabra nueva puede iluminar todo el día.',
    '11:00-13:00': 'Al mediodía, repasa una palabra y deja que se afirme en la memoria.',
    '13:00-18:00': 'Con la luz de la tarde, las palabras aprendidas se vuelven tuyas.',
    '18:00-21:00': 'El repaso de la tarde ayuda a conservar las palabras de hoy.',
    '21:00-23:00': 'En la calma de la noche, las palabras echan raíces en la memoria.',
    '23:00-04:00': 'Incluso un repaso breve de madrugada alimenta la comprensión de mañana.',
  },
  俄语: {
    '04:00-07:00': 'До рассвета тихо встретьте первое слово этого дня.',
    '07:00-11:00': 'Утром каждое новое слово делает день немного светлее.',
    '11:00-13:00': 'В полдень повторите одно слово и дайте памяти укрепиться.',
    '13:00-18:00': 'В дневном свете выученные слова постепенно становятся вашими.',
    '18:00-21:00': 'Вечернее повторение мягко закрепляет слова, встреченные сегодня.',
    '21:00-23:00': 'В ночной тишине слова глубже укореняются в памяти.',
    '23:00-04:00': 'Даже короткое позднее повторение помогает завтрашнему пониманию.',
  },
};

export function getHomeGreetingText(greeting: GreetingSelection, language: SupportedLanguage): string {
  if (language === '中文') return greeting.text;
  if (language === '英语') return greeting.translation;
  return LOCALIZED_GREETING_TEXT[language][greeting.bucket];
}

export const GREETING_PHRASES: Record<GreetingBucket, GreetingPhrase[]> = {
  '04:00-07:00': [
    {
      text: '天光未亮，世界还在沉睡，你已经翻开单词本——你是今天第一个醒来的灵魂，也是第一个拥抱词语的人。',
      translation: 'Before daylight, while the world still sleeps, you have already opened your vocabulary notebook—the first soul awake today, and the first to embrace words.',
    },
    {
      text: '晨雾像一层薄纸，你用手指轻轻划破，露出下面那些闪闪发光的字母。',
      translation: 'Morning mist is like a thin sheet of paper. With a gentle finger, you part it and reveal the shining letters underneath.',
    },
    {
      text: '每个单词都是黎明前的一颗星星，你摘下一颗，它就变成你记忆里永不会熄灭的光。',
      translation: 'Every word is a star before dawn. Pick one, and it becomes a light in your memory that will never go out.',
    },
    {
      text: '早起背书不必求快，像煮一壶很慢的茶，单词的香气会在你的安静里慢慢散开。',
      translation: 'Early study does not need speed. Like brewing a slow pot of tea, the fragrance of words will spread through your quietness.',
    },
    {
      text: '昨夜梦里的碎片还没收走，正好给今天的生词当语境——每一个都带着梦的柔软。',
      translation: 'Fragments from last night’s dreams have not been cleared away, just right as context for today’s new words, each carrying dreamlike softness.',
    },
    {
      text: '鸟鸣还没开始，你的笔尖已经在纸面走动。那些单词会记住：你是它们遇见的第一缕光。',
      translation: 'Before birdsong begins, your pen is already moving across the page. Those words will remember: you were the first light they met.',
    },
    {
      text: '清晨的记忆力像一面没被触碰的湖，扔进去一个单词，涟漪就能荡一整天。',
      translation: 'Morning memory is like an untouched lake. Drop in one word, and its ripples can drift through the whole day.',
    },
    {
      text: '你掀开单词本的动作，比日出还轻，但比日出更有力量——因为你在为自己悄悄发光。',
      translation: 'The way you open your vocabulary notebook is lighter than sunrise, yet stronger than sunrise, because you are quietly shining for yourself.',
    },
    {
      text: '四点醒来的人，不是被焦虑叫醒的，是被好奇心轻轻推了一下：今天又会有哪些词成为朋友？',
      translation: 'Someone awake at four was not called by anxiety, but gently nudged by curiosity: which words will become friends today?',
    },
    {
      text: '背单词像在晨光里播种，不赶时间，每粒种子都会在你脑海里开出自己的花。',
      translation: 'Learning words is like sowing seeds in morning light. There is no rush; each seed will bloom its own flower in your mind.',
    },
    {
      text: '黎明把最干净的空气借给你，你把最专注的时间还给单词——这是很公平的交换。',
      translation: 'Dawn lends you its cleanest air, and you give words your most focused time in return. It is a fair exchange.',
    },
    {
      text: '你读出的每一个音节，都在空旷的清晨里弹跳，像石子在水面打出漂亮的水漂。',
      translation: 'Every syllable you read bounces through the open morning, like a stone skipping beautifully across water.',
    },
    {
      text: '这个时间，世界是你的自习室。单词们乖乖排队等你点名，语气比任何时候都温柔。',
      translation: 'At this hour, the world is your study room. Words line up obediently for roll call, speaking more gently than ever.',
    },
    {
      text: '你每背下一个单词，东方的云就会亮一点点。天亮的时候，你会发现身后坐满了词语。',
      translation: 'Each word you learn makes the eastern clouds brighten a little. By daybreak, you will find words seated all around you.',
    },
    {
      text: '清晨的风替你翻过一页，新的一页上写着今天第一个想要认识的词——它也在期待你。',
      translation: 'The morning wind turns a page for you. On the new page is the first word that wants to meet you today, and it is waiting too.',
    },
    {
      text: '背单词不是负担，是你在和未来的自己打招呼：嗨，这些词以后会替你说话。',
      translation: 'Vocabulary is not a burden. It is you greeting your future self: hello, these words will speak for you someday.',
    },
    {
      text: '四点到七点的光阴，像一张还没写字的白纸。你把单词写上去，就等于画了第一道彩虹。',
      translation: 'The hours from four to seven are like blank paper. Writing words on it is like drawing the first rainbow of the day.',
    },
    {
      text: '早起安静地复习几个旧词，会发现它们像老朋友一样对你微笑：你还没忘记我们呀。',
      translation: 'Review a few old words quietly in the morning, and they smile like old friends: you still remember us.',
    },
    {
      text: '天边那一点点鱼肚白，是你今天记住的第一个单词的颜色——柔和而笃定。',
      translation: 'That pale light on the horizon is the color of the first word you remember today: soft and certain.',
    },
    {
      text: '你合上单词本的时候，太阳刚好升起。今天所有的光，都照在你刚刚写过的那些字上。',
      translation: 'When you close your vocabulary notebook, the sun rises. All of today’s light falls on the words you have just written.',
    },
  ],
  '07:00-11:00': [
    {
      text: '阳光像剥开的橘子，一瓣一瓣落在你的单词本上。每一瓣里都藏着一个新的词。',
      translation: 'Sunlight is like a peeled orange, falling segment by segment onto your vocabulary notebook. Each segment hides a new word.',
    },
    {
      text: '上午的大脑像一块软海绵，你轻轻压下去，单词就吸得满满的，一滴都不会漏。',
      translation: 'The morning brain is like a soft sponge. Press gently, and it soaks up words completely, without losing a drop.',
    },
    {
      text: '你认识的每个新词，都是今天送给自己的一枚小勋章。戴久了，你就成了更有底气的人。',
      translation: 'Every new word you meet is a small medal you give yourself today. Wear enough of them, and you become more grounded.',
    },
    {
      text: '背书背累了就看一眼窗外的树，叶子们也在风中背它们的“摇动”，你们都是好学生。',
      translation: 'When study tires you, look at the trees outside. The leaves are practicing their own word, “swaying,” in the wind. You are all good students.',
    },
    {
      text: '上午的记忆不是硬塞进去的，是像水慢慢渗透纸张那样，自然而然地晕开。',
      translation: 'Morning memory is not forced in. It spreads naturally, like water slowly soaking through paper.',
    },
    {
      text: '你读单词的时候，声音会穿过窗户，和鸟鸣一起编成一首只有你自己能听懂的晨歌。',
      translation: 'When you read words aloud, your voice passes through the window and weaves with birdsong into a morning song only you understand.',
    },
    {
      text: '每个生词都是一扇门，你轻轻推开，里面是一个从未见过但很美的房间。',
      translation: 'Every new word is a door. Push it open gently, and inside is a room you have never seen, but it is beautiful.',
    },
    {
      text: '不用记住全部，哪怕只记住一个词，今天也有了它的核心词汇——你。',
      translation: 'You do not need to remember everything. Even one word gives today its core vocabulary: you.',
    },
    {
      text: '阳光斜斜地切过书桌，把单词表的格子照得明明暗暗。多有意思，连光线都在帮你分区复习。',
      translation: 'Sunlight cuts across the desk at an angle, lighting the word list in patches. How interesting—light itself is helping you review by sections.',
    },
    {
      text: '你盯着一个单词看三秒，它就会变成一个可爱的陌生人，再盯三秒，它就变成熟人。',
      translation: 'Look at a word for three seconds, and it becomes a lovely stranger. Look for three more, and it becomes familiar.',
    },
    {
      text: '一杯水放在旁边，你背一个词就喝一小口。到中午你会发现，水喝完了，词也记住了。',
      translation: 'Keep a glass of water beside you and take a sip after each word. By noon, the water is gone, and the words are remembered.',
    },
    {
      text: '九点的风把窗外所有的声音都调成低音量，只剩下你和单词在安静地交换眼神。',
      translation: 'The nine o’clock wind turns every outside sound down low, leaving only you and the words quietly exchanging glances.',
    },
    {
      text: '背单词像是在慢慢搭建一座桥，桥的另一边是更大的世界。你今天又铺了好几块木板。',
      translation: 'Learning words is slowly building a bridge. On the other side is a larger world, and today you laid down several more planks.',
    },
    {
      text: '每一个被你读出来的单词，都会在你的生命里多待一会儿——像一只撒娇的猫。',
      translation: 'Every word you read aloud stays a little longer in your life, like a cat asking for affection.',
    },
    {
      text: '今天上午你要认识十个新朋友（单词），不必深交，先打个招呼，以后慢慢熟。',
      translation: 'This morning you will meet ten new friends—words. No need for deep friendship yet; say hello first, and grow familiar later.',
    },
    {
      text: '记住，遗忘是正常的。你忘记一个词，就像风把树叶吹落，但树的根还在。',
      translation: 'Remember that forgetting is normal. Forgetting a word is like wind blowing down a leaf; the tree’s roots remain.',
    },
    {
      text: '阳光把你的影子拉得很长，影子也跟着你一起默背单词——你不是一个人在学。',
      translation: 'Sunlight stretches your shadow long, and your shadow silently studies with you. You are not learning alone.',
    },
    {
      text: '上午的黄金时间，你用来和词语约会。每个词都会因为你的专注而变得更好看。',
      translation: 'You spend the golden morning on a date with words. Each word becomes more beautiful because of your attention.',
    },
    {
      text: '翻开单词本，昨天背过的词像一排小花，今天的新词像刚冒头的芽——都在对你笑。',
      translation: 'Open the notebook: yesterday’s words are a row of little flowers, today’s new ones are fresh sprouts, and all are smiling at you.',
    },
    {
      text: '你每记住一个词，世界就多一个懂你的人。今天，你又多了好多个。',
      translation: 'Each word you remember adds one more person in the world who understands you. Today, you gain many more.',
    },
  ],
  '11:00-13:00': [
    {
      text: '太阳升到头顶，把你的影子缩成小小一团。单词们也缩成小小的形状，藏在你的脑海深处。',
      translation: 'The sun rises overhead and shrinks your shadow small. The words also shrink into tiny shapes and hide deep in your mind.',
    },
    {
      text: '该吃饭了，也给你的大脑喂点“复习餐”——随便翻几页，不费力，像吃一颗糖。',
      translation: 'It is time to eat, and also to feed your brain a “review meal”: flip a few pages lightly, as easy as eating a candy.',
    },
    {
      text: '正午的光线垂直落下，万物没有阴影。你的记忆也这么直接就好了——别急，阴影也是记忆的一部分。',
      translation: 'Noon light falls straight down, leaving everything without shadow. It would be nice if memory were that direct—but do not rush; shadows are part of memory too.',
    },
    {
      text: '放下笔，闭上眼，把上午背的单词在心里默默过一遍。像数羊，但数的是字母。',
      translation: 'Put down the pen, close your eyes, and quietly pass through the morning’s words in your mind. Like counting sheep, except you count letters.',
    },
    {
      text: '午饭后的困意里，最适合做这种事：盯着一个词看，看到它变成一幅画，你就永远记住了。',
      translation: 'In the drowsiness after lunch, this is perfect: stare at one word until it becomes a picture, and you will remember it forever.',
    },
    {
      text: '阳光正烈，你的单词本躲在屋檐的阴影下，像一个害羞的孩子。你轻轻翻开它，它就笑了。',
      translation: 'The sun is strong, and your notebook hides in the eaves’ shade like a shy child. Open it gently, and it smiles.',
    },
    {
      text: '今天已经背了这么多词啊。哪怕只背了三个，也是三颗糖果，甜甜地躺在你的记忆口袋里。',
      translation: 'You have learned this many words today. Even if it is only three, they are three candies lying sweetly in your pocket of memory.',
    },
    {
      text: '正午是天然的复习闹钟：它提醒你，上午的知识该打包收好了，下午还要继续。',
      translation: 'Noon is a natural review alarm: it reminds you to pack away the morning’s knowledge before the afternoon continues.',
    },
    {
      text: '你每复习一个旧词，就像和一个老朋友重新握手——温暖、熟悉、不需要多言。',
      translation: 'Each old word you review is like shaking hands again with an old friend: warm, familiar, and needing few words.',
    },
    {
      text: '把单词本摊在饭桌上，菜香和墨香混在一起。知识也可以有烟火气，很安心。',
      translation: 'Spread the notebook on the dining table, where food and ink scents mingle. Knowledge can carry everyday warmth, and it feels safe.',
    },
    {
      text: '别强迫自己在最困的时候背新词，复习就好。老朋友们不会怪你偷懒，它们只会说“又见面了”。',
      translation: 'Do not force new words when you are sleepiest. Review is enough. Old friends will not blame your laziness; they only say, “good to meet again.”',
    },
    {
      text: '太阳晒得人睁不开眼，你可以把眼睛闭上，在心里默写几个字母，看看它们还在不在。',
      translation: 'When the sun is too bright to keep your eyes open, close them and silently spell a few letters to see whether they are still there.',
    },
    {
      text: '正午的影子最短，但你记下的每一个词，都会在以后的某个时刻投下长长的、有用的影子。',
      translation: 'At noon shadows are shortest, but every word you remember will someday cast a long and useful shadow.',
    },
    {
      text: '吃完最后一口饭，再看一眼上午最难的那个词。它好像没那么讨厌了，对不对？',
      translation: 'After the last bite of lunch, glance once more at the hardest word from the morning. It seems less annoying now, does it not?',
    },
    {
      text: '午休时间，单词本也可以跟着一起休息。你合上它的时候，它会做一个关于你的梦。',
      translation: 'During lunch break, the vocabulary notebook may rest too. When you close it, it will dream about you.',
    },
    {
      text: '十二点是分界线，左边是上午的努力，右边是下午的期待。你已经做得很好了。',
      translation: 'Twelve o’clock is a dividing line: morning effort on the left, afternoon expectation on the right. You have already done well.',
    },
    {
      text: '复习不需要很正式，就像在脑海里翻相册，看到哪个词就冲它笑一笑。',
      translation: 'Review does not need ceremony. It is like flipping through an album in your mind and smiling at whichever word appears.',
    },
    {
      text: '你背过的每一个词，此刻都安静地睡在记忆里，等你下午醒来再叫醒它们。',
      translation: 'Every word you have learned is sleeping quietly in memory now, waiting for you to wake it again in the afternoon.',
    },
    {
      text: '正午的困意像一只大猫，趴在你的肩膀上。那就小憩一下，单词们会等你。',
      translation: 'Noon drowsiness is like a big cat resting on your shoulder. Take a short nap; the words will wait for you.',
    },
    {
      text: '你认真的样子，比正午的太阳还耀眼。不过现在可以放松一会儿啦，语言需要呼吸。',
      translation: 'Your serious look shines brighter than the noon sun. But now you may relax a little; language needs to breathe.',
    },
  ],
  '13:00-18:00': [
    {
      text: '午后的光阴又软又长，像一条缓慢的河。单词是河底光滑的石头，你伸手就能捞起好多。',
      translation: 'Afternoon time is soft and long, like a slow river. Words are smooth stones on the riverbed; reach in, and you can gather many.',
    },
    {
      text: '困倦的时候，把你最不喜欢的那个单词写在手背上。它陪你一下午，你就舍不得讨厌它了。',
      translation: 'When sleepy, write your least favorite word on the back of your hand. After it spends the afternoon with you, you may not want to dislike it.',
    },
    {
      text: '下午的学习像在慢慢织一件毛衣，每记住一个词就多一针。到傍晚，你就拥有了一件温暖的词语外套。',
      translation: 'Afternoon study is like slowly knitting a sweater; each word remembered adds a stitch. By dusk, you have a warm coat of words.',
    },
    {
      text: '阳光从左边移到右边，像钟表的分针。你的单词本也跟着慢慢移动，每一页都沾了不同的光。',
      translation: 'Sunlight moves from left to right like a clock’s minute hand. Your notebook moves with it, each page touched by different light.',
    },
    {
      text: '不要因为背了就忘而沮丧。忘记是记忆在帮你筛选最重要的东西，剩下的都是精华。',
      translation: 'Do not be discouraged when remembered words fade. Forgetting helps memory sift for what matters most; what remains is essence.',
    },
    {
      text: '午后适合把单词放进句子里，像把种子放进土壤。有了语境，它们才会发芽。',
      translation: 'Afternoons are good for placing words into sentences, like putting seeds into soil. With context, they begin to sprout.',
    },
    {
      text: '你每背完一组词，就可以奖励自己望向窗外五秒钟。看云慢慢走，也在帮你消化。',
      translation: 'After each group of words, reward yourself with five seconds at the window. Watching clouds move slowly helps you digest too.',
    },
    {
      text: '下午三点，最容易泄气。这时候对自己说：我已经坚持到了三点，再背一个词就是胜利。',
      translation: 'Three in the afternoon is when discouragement comes easiest. Tell yourself: I have made it to three; one more word is victory.',
    },
    {
      text: '把最难记的那个词画成一只小动物，它就不凶了，反而有点可爱。',
      translation: 'Draw the hardest word as a small animal. It stops being fierce and becomes a little cute instead.',
    },
    {
      text: '午后的光线把单词本的纸张照得半透明，好像能透过纸面看见明天的你已经会了所有这些词。',
      translation: 'Afternoon light makes the notebook pages half transparent, as if through the paper you can see tomorrow’s self already knowing every word.',
    },
    {
      text: '背单词不是往脑子里塞石头，是往心里种花。下午种的花，晚上就会开。',
      translation: 'Learning words is not stuffing stones into the brain; it is planting flowers in the heart. Flowers planted in the afternoon may bloom by night.',
    },
    {
      text: '你记单词的时候，窗外的风也在记树叶的摆动。你们都在用自己的方式学习这个世界的语言。',
      translation: 'While you remember words, the wind outside remembers how leaves move. Each of you studies the language of the world in your own way.',
    },
    {
      text: '慢慢来，每个单词都值得你多看它一眼。它从几千公里外的语言里赶来见你，不容易。',
      translation: 'Take your time. Every word deserves one more look. It has traveled from a language thousands of miles away to meet you, and that was not easy.',
    },
    {
      text: '把生词写在便签上，贴在桌边。它们会偷偷看你，被你多看了几次，就不好意思不认识了。',
      translation: 'Write new words on sticky notes and place them by your desk. They will secretly watch you; after you look back enough, they will be too shy to stay strangers.',
    },
    {
      text: '下午的脑子像有点发烫的电脑，需要时不时保存一下进度。复习就是那个保存键。',
      translation: 'The afternoon brain is like a slightly hot computer; it needs to save progress now and then. Review is that save button.',
    },
    {
      text: '你背单词时，杯子里的水凉了又热，热了又凉。时间在走，你在长，这就够了。',
      translation: 'While you study, the water in your cup cools and warms, warms and cools. Time moves, and you grow; that is enough.',
    },
    {
      text: '一个词，你盯着它看，它就变得陌生；你把它放进语境里读一遍，它又变得亲切。语言就是这样奇妙。',
      translation: 'Stare at a word, and it grows strange. Read it once inside context, and it becomes friendly again. Language is wonderfully strange like that.',
    },
    {
      text: '下午四点，影子开始拉长。你记住的单词也开始拉长，变成句子，变成你未来会说的一段话。',
      translation: 'At four in the afternoon, shadows grow long. The words you remember grow long too, becoming sentences, becoming something your future self will say.',
    },
    {
      text: '别让“还有好多没背”吓到你。把单词本想象成一整片星空，你只需要先点亮一颗。',
      translation: 'Do not let “so many left” frighten you. Imagine the notebook as a whole sky of stars; you only need to light one first.',
    },
    {
      text: '太阳慢慢往西边滑，你慢慢往脑子里装词。你们的方向不一样，但都在认真前行。',
      translation: 'The sun slowly slides west, and you slowly place words into your mind. Your directions differ, but both are moving forward with care.',
    },
  ],
  '18:00-21:00': [
    {
      text: '晚霞把天空涂成暖色，也把你今天背过的每一个词都镀上一层金。它们值得被记住。',
      translation: 'Sunset paints the sky in warm colors and gilds every word you learned today. They deserve to be remembered.',
    },
    {
      text: '黄昏的时候复习，像在天黑前盘点一天收获的果实。每个词都是沉甸甸的一枚。',
      translation: 'Reviewing at dusk is like counting the day’s harvested fruit before dark. Every word is one heavy, precious piece.',
    },
    {
      text: '你合上单词本，夕阳刚好落在封面上——那是天空给你的成绩单：今天表现很棒。',
      translation: 'You close the notebook just as sunset falls on its cover. That is the sky’s report card for you: excellent work today.',
    },
    {
      text: '傍晚的风很轻，你念单词的声音也很轻。它们合在一起，就成了黄昏最温柔的声音。',
      translation: 'The evening wind is light, and your voice reading words is light too. Together they become dusk’s gentlest sound.',
    },
    {
      text: '把今天新学的词一个一个念出来，像念出好朋友的名字。夕阳会帮你记住这份友谊。',
      translation: 'Read today’s new words one by one, as if saying the names of close friends. The sunset will help you remember the friendship.',
    },
    {
      text: '复习旧词的时候，你会发现它们比初见时顺眼多了——就像相处久了的人，怎么看都顺眼。',
      translation: 'When reviewing old words, you may find them much nicer than at first meeting, like people who become dear through time.',
    },
    {
      text: '黄昏是适合反思的时间：今天我最喜欢哪个词？哪个词最想和我做朋友？',
      translation: 'Dusk is a good time to reflect: which word did I like most today, and which word most wants to be my friend?',
    },
    {
      text: '晚饭后的时光，不要把单词本当负担，就当是餐后甜点。甜度刚好，不会腻。',
      translation: 'After dinner, do not treat the notebook as a burden. Treat it as dessert: just sweet enough, never too much.',
    },
    {
      text: '你背过的词，都会在黄昏时分变成晚霞里的一缕颜色。今天的晚霞有多美，你就记住了多少。',
      translation: 'The words you learned become colors in the sunset. However beautiful tonight’s sky is, that is how much you remembered.',
    },
    {
      text: '把最难的那个词写在手心里，摊开手掌看它一眼，再握紧——它就住进去了。',
      translation: 'Write the hardest word in your palm, open your hand to look once, then close it. Now it lives inside.',
    },
    {
      text: '天快黑了，但你的记忆还很亮。那些单词像路灯一样，一盏一盏在你脑海里亮起来。',
      translation: 'Night is approaching, but your memory is still bright. Those words light up in your mind one by one, like streetlamps.',
    },
    {
      text: '黄昏的光线最适合默写：不刺眼，不黯淡，刚好能看清每一个字母，也看清自己的进步。',
      translation: 'Dusk light is perfect for dictation: neither harsh nor dim, clear enough to see every letter and your own progress.',
    },
    {
      text: '你每正确回忆出一个词，窗外就多一颗星星。等天全黑了，你就能看见自己创造了满天星。',
      translation: 'Each word you recall correctly adds a star outside the window. When night falls fully, you will see the sky you made.',
    },
    {
      text: '复习不是重复，是加深感情。和一个词多见几次面，它就愿意跟你一辈子。',
      translation: 'Review is not repetition; it is deepening affection. Meet a word a few more times, and it may stay with you for life.',
    },
    {
      text: '傍晚的安静很像清晨，但多了一点收获的喜悦。你今天确实比早上多认识了几个世界。',
      translation: 'Evening quiet is like morning quiet, but with the joy of harvest. Today you truly know a few more worlds than you did this morning.',
    },
    {
      text: '把你最喜欢的那个词写在窗玻璃上，对着晚霞看它。它会变成你今天的座右铭。',
      translation: 'Write your favorite word on the window glass and look at it against the sunset. It becomes today’s motto.',
    },
    {
      text: '黄昏是一天学习最温柔的句号。不必完美，只要今天比昨天多认识一个词，就值得鼓掌。',
      translation: 'Dusk is the gentlest period at the end of a study day. No need for perfection; one more word than yesterday deserves applause.',
    },
    {
      text: '你坐在窗前复习的时候，远处的灯一盏盏亮起来。每一盏灯，都像你脑子里的一个词。',
      translation: 'As you review by the window, distant lights come on one by one. Each lamp is like a word in your mind.',
    },
    {
      text: '用今天学的任意三个词造一个句子，哪怕很可笑也没关系——那是属于你的语言玩具。',
      translation: 'Use any three words from today to make a sentence, even a silly one. That is your own language toy.',
    },
    {
      text: '天边最后一丝光消失的时候，你刚好复习完今天所有的词。你和夜晚交接班：你交出一份安静的满足。',
      translation: 'When the last light disappears from the horizon, you finish reviewing today’s words. You hand the shift to night with quiet satisfaction.',
    },
  ],
  '21:00-23:00': [
    {
      text: '夜晚把喧嚣调成静音，只剩下你和单词本的对视。那些字母不再陌生，像老朋友坐在床边。',
      translation: 'Night mutes the noise, leaving only you and the notebook looking at each other. The letters are no longer strangers; they sit by the bed like old friends.',
    },
    {
      text: '睡前再看一眼今天的新词，不用刻意记——让它们像星星一样沉进梦里，明天自然会亮。',
      translation: 'Before sleep, glance once more at today’s new words. No need to force memory; let them sink into dreams like stars and shine tomorrow.',
    },
    {
      text: '你的大脑正在悄悄整理白天的收获，像园丁把种子埋进土里。安心睡吧，它们会发芽的。',
      translation: 'Your brain is quietly sorting the day’s harvest, like a gardener burying seeds in soil. Sleep peacefully; they will sprout.',
    },
    {
      text: '月亮替你把单词表又读了一遍，每一个都点头说：今天你对我们真好。',
      translation: 'The moon reads the word list once more for you, and every word nods: you treated us so well today.',
    },
    {
      text: '把单词本合上，轻轻拍拍封面。你今天付出了温柔，单词们也会用记住来回报你。',
      translation: 'Close the notebook and pat the cover gently. You gave tenderness today, and the words will repay you by staying remembered.',
    },
    {
      text: '睡前一分钟，闭着眼睛回想三个今天最喜欢的词。想不出来也没关系，梦里它们会来串门。',
      translation: 'For one minute before sleep, close your eyes and recall three favorite words from today. If none come, they will visit in dreams.',
    },
    {
      text: '夜风翻动单词本，那是风在帮你复习。它不认识那些词，但它知道它们对你有意义。',
      translation: 'Night wind turns the notebook pages, helping you review. It does not know the words, but it knows they matter to you.',
    },
    {
      text: '你躺在床上的时候，今天的单词们也在你脑海里找地方睡觉。给它们留个暖和的位置。',
      translation: 'When you lie in bed, today’s words are looking for places to sleep in your mind. Leave them somewhere warm.',
    },
    {
      text: '夜晚的灯光把单词本的影子投在墙上，影子也在背单词——这个世界都在帮你。',
      translation: 'Lamplight casts the notebook’s shadow on the wall, and the shadow studies too. The whole world is helping you.',
    },
    {
      text: '睡前轻轻念一遍今天最难的那个词，像念一句咒语。念着念着，它就变得亲切了。',
      translation: 'Softly read the hardest word once before bed, like reciting a spell. As you repeat it, it grows familiar.',
    },
    {
      text: '你不需要在睡前把所有词都记住。允许几个词暂时迷路，明天你会找到它们。',
      translation: 'You do not need to remember every word before sleep. Let a few wander for now; tomorrow you will find them.',
    },
    {
      text: '夜很深，很安静，每个字母都在你耳边轻轻呼吸。它们说：谢谢你今天认识我。',
      translation: 'The night is deep and quiet. Every letter breathes softly by your ear, saying: thank you for meeting me today.',
    },
    {
      text: '把今天背的单词当作枕边故事，讲给自己听。讲着讲着，就会睡着，而且睡得很甜。',
      translation: 'Treat today’s words as a bedtime story and tell it to yourself. As you tell it, sleep will come, sweet and gentle.',
    },
    {
      text: '月亮洒在单词本上，那些字母像洒了一层银粉。明天翻开，它们还会在。',
      translation: 'Moonlight falls on the notebook, and the letters seem dusted with silver. Open it tomorrow, and they will still be there.',
    },
    {
      text: '你已经努力了一整天，现在可以好好休息了。单词们不赶时间，它们愿意等你到明天。',
      translation: 'You have worked hard all day; now you can rest well. Words are not in a hurry. They are willing to wait until tomorrow.',
    },
    {
      text: '睡前复习不要太认真，就像在看一部你已经知道结局的电影——温暖而安心。',
      translation: 'Bedtime review need not be too serious. It is like watching a film whose ending you already know: warm and reassuring.',
    },
    {
      text: '你闭上眼睛的时候，记忆会把今天所有的词重新排列一遍，排成一首只有你听得见的诗。',
      translation: 'When you close your eyes, memory rearranges today’s words into a poem only you can hear.',
    },
    {
      text: '夜风轻轻吹过，把你读单词的声音带到很远的地方。有些词会在风里旅行，第二天再回来找你。',
      translation: 'The night wind passes gently, carrying your word-reading voice far away. Some words travel in the wind and return to find you the next day.',
    },
    {
      text: '今天的最后一个动作：合上单词本，对自己说“晚安，你今天很棒”。',
      translation: 'The last action of today: close the notebook and tell yourself, “Good night, you did wonderfully today.”',
    },
    {
      text: '夜晚把所有知识变成梦境的一部分。明天醒来，你会发现有些词已经在你心里住了下来。',
      translation: 'Night turns all knowledge into part of the dream. When you wake tomorrow, some words will already be living in your heart.',
    },
  ],
  '23:00-04:00': [
    {
      text: '深夜的安静是最奢侈的语境。每个单词都在你耳边轻轻念出自己的名字，一遍，又一遍。',
      translation: 'The quiet of deep night is the most luxurious context. Each word softly says its own name by your ear, again and again.',
    },
    {
      text: '世界睡着了，但你的记忆还醒着，像一盏不灭的灯。那些单词是灯下的飞虫，绕啊绕，就住进了心里。',
      translation: 'The world is asleep, but your memory is awake like an unextinguished lamp. The words circle like moths beneath it until they settle in the heart.',
    },
    {
      text: '夜那么深，你还在和单词相守。它们一定很感动，所以偷偷把自己的样子刻得更深了一点。',
      translation: 'The night is so deep, and you are still keeping words company. They must be moved, so they quietly carve their shapes a little deeper.',
    },
    {
      text: '此刻背下的每一个词，都像深夜里的萤火虫。等天亮了，你会发现身后跟着一整片光。',
      translation: 'Every word learned now is like a firefly in the deep night. By dawn, you will find a whole field of light following you.',
    },
    {
      text: '如果睡不着，就让单词当你的摇篮曲。轻轻默念它们，字母与字母之间，藏着温柔的睡意。',
      translation: 'If sleep will not come, let words be your lullaby. Whisper them inwardly; between letter and letter hides a gentle sleepiness.',
    },
    {
      text: '深夜背单词，时间仿佛静止了。只有你和词语在空荡荡的世界里互相取暖。',
      translation: 'Studying words at night makes time seem still. Only you and the words remain in the empty world, warming each other.',
    },
    {
      text: '你每背下一个词，就像在深夜的墙上多开一扇窗。天亮了，阳光会从这些窗子里涌进来。',
      translation: 'Each word you learn opens another window in the wall of night. At dawn, sunlight will pour in through them.',
    },
    {
      text: '困到眼皮打架的时候，把你最记不住的那个词写一百遍。写到最后，它不是词了，是一幅画。',
      translation: 'When your eyelids are fighting, write the hardest word a hundred times. By the end, it is no longer a word but a picture.',
    },
    {
      text: '凌晨两点，万籁俱寂。你的呼吸声和翻书声是这世上仅存的动静——很美，很私密。',
      translation: 'At two in the morning, all is silent. Your breathing and page-turning are the only movements left in the world: beautiful and private.',
    },
    {
      text: '深夜的记忆像一层薄冰，你轻轻踩上去，每一个单词都留下清晰的脚印。',
      translation: 'Deep-night memory is like thin ice. Step onto it gently, and every word leaves a clear footprint.',
    },
    {
      text: '你还在坚持，说明这些词对你真的很重要。它们也知道，所以不会辜负你。',
      translation: 'You are still persisting, which means these words truly matter to you. They know it too, and they will not let you down.',
    },
    {
      text: '把台灯调到最暗的一档，光晕里只有你和单词本。这是你们的秘密基地，别人进不来。',
      translation: 'Turn the desk lamp to its dimmest setting. Inside the halo are only you and the notebook: your secret base, where no one else can enter.',
    },
    {
      text: '凌晨三点，最孤独也最自由。你在这个时刻选择的每一个词，都会成为你性格的一部分。',
      translation: 'At three in the morning, you are loneliest and freest. Every word you choose at this hour becomes part of your character.',
    },
    {
      text: '深夜背的单词，往往记得最牢，因为你是用对抗困意的意志力把它们钉进脑海的。',
      translation: 'Words learned late at night often stay the firmest, because you nail them into memory with the willpower that resists sleep.',
    },
    {
      text: '如果太累了，就放下笔，闭上眼睛，听自己的心跳。心跳的节奏和单词的读音一样，都是生命在说话。',
      translation: 'If you are too tired, put down the pen, close your eyes, and listen to your heartbeat. Its rhythm, like word pronunciation, is life speaking.',
    },
    {
      text: '深夜不是用来崩溃的，是用来悄悄变好的。你每记住一个词，就是在往“更好”的方向走一小步。',
      translation: 'Deep night is not for falling apart; it is for quietly becoming better. Every word remembered is one small step toward “better.”',
    },
    {
      text: '你背单词的时候，窗外的猫也在背它的黑夜语法。你们都是深夜的学习者，彼此不打扰，但互相陪伴。',
      translation: 'As you study words, the cat outside studies its grammar of night. You are both late-night learners, not disturbing each other, yet keeping company.',
    },
    {
      text: '凌晨四点的天还很黑，但你脑子里的世界已经很亮了，因为你装进了那么多词语的光。',
      translation: 'At four in the morning, the sky is still dark, but the world in your mind is bright because you have filled it with word-light.',
    },
    {
      text: '深夜的学习不需要效率，只需要你在。你在，词就在。',
      translation: 'Late-night study does not need efficiency; it only needs your presence. If you are here, the words are here.',
    },
    {
      text: '天快亮了，你可以安心睡一会儿。那些深夜背下的词，会替你在白天清醒着。',
      translation: 'Daybreak is near, and you may sleep for a while in peace. The words learned at night will stay awake for you in daylight.',
    },
  ],
};

export function getGreetingContext(now: Date = new Date()): GreetingContext {
  const hours = now.getHours();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}-${month}-${day}`;

  let bucket: GreetingBucket;

  if (hours >= 23 || hours < 4) {
    bucket = '23:00-04:00';
  } else if (hours >= 4 && hours < 7) {
    bucket = '04:00-07:00';
  } else if (hours >= 7 && hours < 11) {
    bucket = '07:00-11:00';
  } else if (hours >= 11 && hours < 13) {
    bucket = '11:00-13:00';
  } else if (hours >= 13 && hours < 18) {
    bucket = '13:00-18:00';
  } else if (hours >= 18 && hours < 21) {
    bucket = '18:00-21:00';
  } else {
    bucket = '21:00-23:00';
  }

  return {
    date: dateStr,
    bucket,
    audience: 'shared',
  };
}

function hashCode(str: string): number {
  let hash = 0;
  for (let i = 0, len = str.length; i < len; i++) {
    const chr = str.charCodeAt(i);
    hash = (hash << 5) - hash + chr;
    hash |= 0; // Convert to 32bit integer
  }
  return Math.abs(hash);
}

function getSafeStorage(): StorageLike | undefined {
  try {
    return typeof window !== 'undefined' ? window.localStorage : undefined;
  } catch (e) {
    return undefined;
  }
}

export function getHomeGreeting({
  now = new Date(),
  storage = getSafeStorage(),
}: {
  now?: Date;
  storage?: StorageLike;
} = {}): GreetingSelection {
  const context = getGreetingContext(now);
  const candidates = GREETING_PHRASES[context.bucket];

  if (!candidates || candidates.length === 0) {
    // Should never happen based on GREETING_PHRASES setup, but safety first
    return { ...context, text: '', translation: '' };
  }

  const selectionKey = `homeGreetingSelection:${context.bucket}:${context.audience}`;
  const lastKey = `homeGreetingLast:${context.bucket}:${context.audience}`;

  try {
    if (storage) {
      const stored = storage.getItem(selectionKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (
          parsed.date === context.date &&
          parsed.bucket === context.bucket &&
          parsed.audience === context.audience &&
          candidates.some((candidate) => candidate.text === parsed.text && candidate.translation === parsed.translation)
        ) {
          return parsed;
        }
      }
    }
  } catch (e) {
    // Ignore storage errors
  }

  let lastText = '';
  try {
    if (storage) {
      lastText = storage.getItem(lastKey) || '';
    }
  } catch (e) {
    // Ignore storage errors
  }

  let availableCandidates = candidates;
  if (candidates.length > 1 && lastText && candidates.some((candidate) => candidate.text === lastText)) {
    availableCandidates = candidates.filter((candidate) => candidate.text !== lastText);
  }

  const hashKey = `${context.date}:${context.bucket}:${context.audience}`;
  const index = hashCode(hashKey) % availableCandidates.length;
  const phrase = availableCandidates[index];

  const selection: GreetingSelection = { ...context, ...phrase };

  try {
    if (storage) {
      storage.setItem(selectionKey, JSON.stringify(selection));
      storage.setItem(lastKey, phrase.text);
    }
  } catch (e) {
    // Ignore storage errors
  }

  return selection;
}
