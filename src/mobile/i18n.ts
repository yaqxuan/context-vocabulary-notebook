import { LANGUAGE_ISO_639_1_CODES, type SupportedLanguage } from '../shared/constants.js';
import type { MobileError, MobileErrorCode } from './errors.js';

export interface MobileStrings {
  app: string; offline: string; pairTitle: string; pairHelp: string; scan: string; pair: string;
  waiting: string; lan: string; tailscale: string; sync: string; syncing: string; lastSync: string;
  unpair: string; noDue: string; again: string; good: string; connection: string;
  preparing: string; updateConnection: string; save: string; interfaceLanguage: string;
  videoUnavailable: string; progress: string; pending: string; lanAddress: string; apply: string;
  scanProfile: string; wrongAgain: string; next: string; confirmAgain: string; syncHelp: string;
  favorite: string; unfavorite: string; markMastered: string; pcLearningLanguage: string;
  phoneLearningLanguage: string; followPc: string; downloadingLibrary: string; downloadingLibraryHelp: string;
  retrySync: string; snapshotReady: string; connectionUpdated: string; never: string;
  syncSummary: string; unknownError: string; technicalDetails: string;
  errors: Record<MobileErrorCode, string>;
}

const enErrors: Record<MobileErrorCode, string> = {
  unknown: 'An unexpected error occurred.', database_unavailable: 'Encrypted offline storage is unavailable.',
  snapshot_invalid: 'The PC library snapshot is invalid.', snapshot_protocol: 'The PC snapshot protocol is incompatible.',
  review_state_missing: 'This card has no scheduling state.', card_unavailable: 'This card is no longer available.',
  scanner_unsupported: 'This device has no supported QR scanner. Paste the pairing text instead.',
  scanner_installing: 'The QR scanner is being installed. Try again shortly, or paste the pairing text.',
  qr_not_read: 'No QR code was read.', pairing_code_invalid: 'This is not a supported pairing code.',
  pairing_transport_missing: 'The pairing code does not contain the selected connection method.',
  pairing_denied: 'Pairing was denied on the PC.', pairing_expired: 'The pairing session expired.',
  lan_not_configured: 'The local-network connection is not configured.',
  tailscale_not_configured: 'The Tailscale connection is not configured.',
  https_required: 'Only HTTPS sync addresses are allowed.', server_mismatch: 'The connected PC identity or protocol does not match.',
  upgrade_required: 'Android app {minimum} or newer is required. Installed: {current}.',
  profile_wrong_pc: 'This connection profile belongs to another PC.',
  profile_signature_invalid: 'The connection profile signature is invalid.',
  pc_identity_changed: 'The PC identity changed. Pair again.', not_paired: 'Pair with a PC before syncing.',
  http_error: 'The sync request failed (HTTP {status}).',
};

export const mobileTranslations: Record<SupportedLanguage, MobileStrings> = {
  英语: {
    app: 'Context Vocabulary Notebook', offline: 'Offline review', pairTitle: 'Pair with your PC',
    pairHelp: 'Scan the QR code in PC Settings, or paste the pairing text.', scan: 'Scan QR code', pair: 'Pair device',
    waiting: 'Waiting for approval on the PC…', lan: 'Local network', tailscale: 'Tailscale', sync: 'Sync now',
    syncing: 'Syncing…', lastSync: 'Last sync', unpair: 'Unpair', noDue: 'No cards are due.', again: 'Again', good: 'Good',
    connection: 'Connection', preparing: 'Preparing encrypted offline storage…', updateConnection: 'Update connection profile',
    save: 'Save', interfaceLanguage: 'Interface language', videoUnavailable: 'Video has not been downloaded yet. Sync again when connected.',
    progress: 'Today', pending: 'Pending upload', lanAddress: 'LAN HTTPS address', apply: 'Apply', scanProfile: 'Scan connection QR',
    wrongAgain: 'Wrong — Again', next: 'Next', confirmAgain: 'Confirm Again', favorite: 'Favorite', unfavorite: 'Remove favorite',
    markMastered: 'Mark mastered', syncHelp: 'Uploads all offline actions first, refreshes the PC snapshot, then downloads missing media.',
    pcLearningLanguage: 'PC learning language', phoneLearningLanguage: 'Phone learning language', followPc: 'Follow PC ({language})',
    downloadingLibrary: 'Downloading the PC library', downloadingLibraryHelp: 'Review and learning-language selection unlock after the first complete snapshot.',
    retrySync: 'Retry sync', snapshotReady: 'PC library is ready.', connectionUpdated: 'Connection profile updated.', never: 'Never',
    syncSummary: 'Revision {revision} · ↑{uploaded} · ↓{downloaded}', unknownError: 'An unexpected error occurred.', technicalDetails: 'Technical details', errors: enErrors,
  },
  中文: {
    app: '语境词汇本', offline: '离线复习', pairTitle: '与电脑配对', pairHelp: '扫描电脑设置页中的二维码，或粘贴配对文本。',
    scan: '扫描二维码', pair: '配对设备', waiting: '等待电脑确认…', lan: '局域网', tailscale: 'Tailscale', sync: '立即同步', syncing: '正在同步…',
    lastSync: '上次同步', unpair: '解除配对', noDue: '当前没有到期卡片。', again: '重来', good: '记住了', connection: '连接方式',
    preparing: '正在准备加密离线存储…', updateConnection: '更新连接资料', save: '保存', interfaceLanguage: '界面语言',
    videoUnavailable: '视频尚未下载，请在连接电脑后再次同步。', progress: '今日进度', pending: '待上传', lanAddress: '局域网 HTTPS 地址', apply: '应用',
    scanProfile: '扫描连接二维码', wrongAgain: '答错了，改为重来', next: '下一张', confirmAgain: '确认重来', favorite: '收藏', unfavorite: '取消收藏',
    markMastered: '标记熟记', syncHelp: '先上传所有离线操作，再刷新电脑词库快照，最后下载缺少的媒体。', pcLearningLanguage: '电脑学习语言',
    phoneLearningLanguage: '手机当前学习语言', followPc: '跟随电脑（{language}）', downloadingLibrary: '正在下载电脑词库',
    downloadingLibraryHelp: '首个完整快照下载成功后，才能开始复习和选择学习语言。', retrySync: '重新同步', snapshotReady: '电脑词库已就绪。',
    connectionUpdated: '连接资料已更新。', never: '从未', syncSummary: '修订 {revision} · 上传 {uploaded} · 下载 {downloaded}',
    unknownError: '发生了未知错误。', technicalDetails: '技术详情', errors: {
      unknown: '发生了未知错误。', database_unavailable: '加密离线存储不可用。', snapshot_invalid: '电脑词库快照无效。', snapshot_protocol: '电脑快照协议不兼容。',
      review_state_missing: '这张卡片缺少调度状态。', card_unavailable: '这张卡片已不可用。', scanner_unsupported: '此设备不支持二维码扫描，请改为粘贴配对文本。',
      scanner_installing: '正在安装二维码扫描组件，请稍后重试或粘贴配对文本。', qr_not_read: '没有识别到二维码。', pairing_code_invalid: '这不是受支持的配对码。',
      pairing_transport_missing: '配对码不包含所选连接方式。', pairing_denied: '电脑拒绝了配对。', pairing_expired: '配对会话已过期。',
      lan_not_configured: '尚未配置局域网连接。', tailscale_not_configured: '尚未配置 Tailscale 连接。', https_required: '同步地址必须使用 HTTPS。',
      server_mismatch: '连接的电脑身份或同步协议不匹配。', upgrade_required: '需要 Android {minimum} 或更高版本；当前为 {current}。',
      profile_wrong_pc: '此连接资料不属于已配对电脑。', profile_signature_invalid: '连接资料签名无效。', pc_identity_changed: '电脑身份已改变，请重新配对。',
      not_paired: '请先与电脑配对。', http_error: '同步请求失败（HTTP {status}）。',
    },
  },
  日语: {
    app: 'コンテキスト単語帳', offline: 'オフライン復習', pairTitle: 'PCとペアリング', pairHelp: 'PC設定のQRコードを読み取るか、ペアリング文字列を貼り付けてください。',
    scan: 'QRコードをスキャン', pair: '端末をペアリング', waiting: 'PCの承認を待っています…', lan: 'ローカルネットワーク', tailscale: 'Tailscale', sync: '今すぐ同期', syncing: '同期中…',
    lastSync: '最終同期', unpair: 'ペアリング解除', noDue: '復習期限のカードはありません。', again: 'もう一度', good: '覚えた', connection: '接続',
    preparing: '暗号化オフラインストレージを準備中…', updateConnection: '接続プロファイルを更新', save: '保存', interfaceLanguage: '表示言語',
    videoUnavailable: '動画はまだダウンロードされていません。接続後に再同期してください。', progress: '今日', pending: '未送信', lanAddress: 'LAN HTTPSアドレス', apply: '適用',
    scanProfile: '接続QRをスキャン', wrongAgain: '間違い—もう一度', next: '次へ', confirmAgain: '「もう一度」を確定', favorite: 'お気に入り', unfavorite: 'お気に入り解除',
    markMastered: '習得済みにする', syncHelp: 'オフライン操作を先に送信し、PCスナップショットを更新して不足メディアを取得します。', pcLearningLanguage: 'PCの学習言語',
    phoneLearningLanguage: 'スマホの学習言語', followPc: 'PCに従う（{language}）', downloadingLibrary: 'PC単語帳をダウンロード中',
    downloadingLibraryHelp: '最初の完全なスナップショット後に復習と言語選択が使えます。', retrySync: '同期を再試行', snapshotReady: 'PC単語帳の準備ができました。',
    connectionUpdated: '接続プロファイルを更新しました。', never: '未同期', syncSummary: 'リビジョン {revision}・送信 {uploaded}・取得 {downloaded}', unknownError: '予期しないエラーが発生しました。', technicalDetails: '技術情報',
    errors: localizedErrors('ja'),
  },
  韩语: {
    app: '문맥 단어장', offline: '오프라인 복습', pairTitle: 'PC와 페어링', pairHelp: 'PC 설정의 QR 코드를 스캔하거나 페어링 텍스트를 붙여 넣으세요.',
    scan: 'QR 코드 스캔', pair: '기기 페어링', waiting: 'PC 승인을 기다리는 중…', lan: '로컬 네트워크', tailscale: 'Tailscale', sync: '지금 동기화', syncing: '동기화 중…',
    lastSync: '마지막 동기화', unpair: '페어링 해제', noDue: '복습할 카드가 없습니다.', again: '다시', good: '기억함', connection: '연결',
    preparing: '암호화된 오프라인 저장소 준비 중…', updateConnection: '연결 프로필 업데이트', save: '저장', interfaceLanguage: '인터페이스 언어',
    videoUnavailable: '동영상이 아직 다운로드되지 않았습니다. 연결 후 다시 동기화하세요.', progress: '오늘', pending: '업로드 대기', lanAddress: 'LAN HTTPS 주소', apply: '적용',
    scanProfile: '연결 QR 스캔', wrongAgain: '틀림—다시', next: '다음', confirmAgain: '다시 확인', favorite: '즐겨찾기', unfavorite: '즐겨찾기 해제',
    markMastered: '완전 암기로 표시', syncHelp: '모든 오프라인 작업을 먼저 업로드한 뒤 PC 스냅샷과 미디어를 갱신합니다.', pcLearningLanguage: 'PC 학습 언어',
    phoneLearningLanguage: '휴대폰 학습 언어', followPc: 'PC 따르기({language})', downloadingLibrary: 'PC 단어장 다운로드 중',
    downloadingLibraryHelp: '첫 전체 스냅샷이 완료되면 복습과 언어 선택을 사용할 수 있습니다.', retrySync: '동기화 재시도', snapshotReady: 'PC 단어장이 준비되었습니다.',
    connectionUpdated: '연결 프로필이 업데이트되었습니다.', never: '없음', syncSummary: '리비전 {revision} · 업로드 {uploaded} · 다운로드 {downloaded}', unknownError: '예기치 않은 오류가 발생했습니다.', technicalDetails: '기술 세부 정보',
    errors: localizedErrors('ko'),
  },
  法语: {
    app: 'Carnet de vocabulaire contextuel', offline: 'Révision hors ligne', pairTitle: 'Associer au PC', pairHelp: 'Scannez le QR code des réglages PC ou collez le texte d’association.',
    scan: 'Scanner le QR code', pair: 'Associer l’appareil', waiting: 'En attente de validation sur le PC…', lan: 'Réseau local', tailscale: 'Tailscale', sync: 'Synchroniser', syncing: 'Synchronisation…',
    lastSync: 'Dernière synchro', unpair: 'Dissocier', noDue: 'Aucune carte à réviser.', again: 'À revoir', good: 'Correct', connection: 'Connexion',
    preparing: 'Préparation du stockage chiffré…', updateConnection: 'Mettre à jour le profil de connexion', save: 'Enregistrer', interfaceLanguage: 'Langue de l’interface',
    videoUnavailable: 'La vidéo n’est pas encore téléchargée. Resynchronisez une fois connecté.', progress: 'Aujourd’hui', pending: 'En attente d’envoi', lanAddress: 'Adresse HTTPS du réseau local', apply: 'Appliquer',
    scanProfile: 'Scanner le QR de connexion', wrongAgain: 'Faux — À revoir', next: 'Suivante', confirmAgain: 'Confirmer À revoir', favorite: 'Favori', unfavorite: 'Retirer des favoris',
    markMastered: 'Marquer comme maîtrisé', syncHelp: 'Envoie d’abord toutes les actions hors ligne, actualise le PC, puis télécharge les médias manquants.', pcLearningLanguage: 'Langue d’apprentissage du PC',
    phoneLearningLanguage: 'Langue d’apprentissage du téléphone', followPc: 'Suivre le PC ({language})', downloadingLibrary: 'Téléchargement de la bibliothèque du PC',
    downloadingLibraryHelp: 'La révision et le choix de langue seront disponibles après le premier instantané complet.', retrySync: 'Réessayer la synchro', snapshotReady: 'La bibliothèque du PC est prête.',
    connectionUpdated: 'Profil de connexion mis à jour.', never: 'Jamais', syncSummary: 'Révision {revision} · envoi {uploaded} · téléchargement {downloaded}', unknownError: 'Une erreur inattendue est survenue.', technicalDetails: 'Détails techniques',
    errors: localizedErrors('fr'),
  },
  德语: {
    app: 'Kontext-Vokabelheft', offline: 'Offline-Wiederholung', pairTitle: 'Mit PC koppeln', pairHelp: 'QR-Code in den PC-Einstellungen scannen oder Kopplungstext einfügen.',
    scan: 'QR-Code scannen', pair: 'Gerät koppeln', waiting: 'Warte auf Bestätigung am PC…', lan: 'Lokales Netzwerk', tailscale: 'Tailscale', sync: 'Jetzt synchronisieren', syncing: 'Synchronisiere…',
    lastSync: 'Letzte Synchronisierung', unpair: 'Entkoppeln', noDue: 'Keine Karten fällig.', again: 'Nochmal', good: 'Gewusst', connection: 'Verbindung',
    preparing: 'Verschlüsselter Offline-Speicher wird vorbereitet…', updateConnection: 'Verbindungsprofil aktualisieren', save: 'Speichern', interfaceLanguage: 'Oberflächensprache',
    videoUnavailable: 'Video noch nicht heruntergeladen. Nach dem Verbinden erneut synchronisieren.', progress: 'Heute', pending: 'Ausstehender Upload', lanAddress: 'LAN-HTTPS-Adresse', apply: 'Übernehmen',
    scanProfile: 'Verbindungs-QR scannen', wrongAgain: 'Falsch — Nochmal', next: 'Weiter', confirmAgain: 'Nochmal bestätigen', favorite: 'Favorit', unfavorite: 'Favorit entfernen',
    markMastered: 'Als sicher markieren', syncHelp: 'Lädt zuerst alle Offline-Aktionen hoch, aktualisiert den PC-Stand und lädt fehlende Medien.', pcLearningLanguage: 'Lernsprache am PC',
    phoneLearningLanguage: 'Lernsprache am Handy', followPc: 'PC folgen ({language})', downloadingLibrary: 'PC-Wortschatz wird geladen',
    downloadingLibraryHelp: 'Wiederholung und Sprachauswahl werden nach dem ersten vollständigen Stand freigeschaltet.', retrySync: 'Erneut synchronisieren', snapshotReady: 'PC-Wortschatz ist bereit.',
    connectionUpdated: 'Verbindungsprofil aktualisiert.', never: 'Nie', syncSummary: 'Revision {revision} · hoch {uploaded} · herunter {downloaded}', unknownError: 'Ein unerwarteter Fehler ist aufgetreten.', technicalDetails: 'Technische Details',
    errors: localizedErrors('de'),
  },
  西班牙语: {
    app: 'Cuaderno de vocabulario contextual', offline: 'Repaso sin conexión', pairTitle: 'Vincular con el PC', pairHelp: 'Escanea el QR de Ajustes del PC o pega el texto de vinculación.',
    scan: 'Escanear código QR', pair: 'Vincular dispositivo', waiting: 'Esperando aprobación en el PC…', lan: 'Red local', tailscale: 'Tailscale', sync: 'Sincronizar ahora', syncing: 'Sincronizando…',
    lastSync: 'Última sincronización', unpair: 'Desvincular', noDue: 'No hay tarjetas pendientes.', again: 'Otra vez', good: 'Bien', connection: 'Conexión',
    preparing: 'Preparando almacenamiento cifrado…', updateConnection: 'Actualizar perfil de conexión', save: 'Guardar', interfaceLanguage: 'Idioma de la interfaz',
    videoUnavailable: 'El vídeo aún no se ha descargado. Sincroniza de nuevo al conectarte.', progress: 'Hoy', pending: 'Pendiente de subir', lanAddress: 'Dirección HTTPS de la red local', apply: 'Aplicar',
    scanProfile: 'Escanear QR de conexión', wrongAgain: 'Incorrecto — Otra vez', next: 'Siguiente', confirmAgain: 'Confirmar Otra vez', favorite: 'Favorito', unfavorite: 'Quitar favorito',
    markMastered: 'Marcar como dominada', syncHelp: 'Primero sube todas las acciones sin conexión, actualiza el PC y descarga los medios que faltan.', pcLearningLanguage: 'Idioma de estudio del PC',
    phoneLearningLanguage: 'Idioma de estudio del móvil', followPc: 'Seguir al PC ({language})', downloadingLibrary: 'Descargando la biblioteca del PC',
    downloadingLibraryHelp: 'El repaso y la selección de idioma se activan tras la primera copia completa.', retrySync: 'Reintentar sincronización', snapshotReady: 'La biblioteca del PC está lista.',
    connectionUpdated: 'Perfil de conexión actualizado.', never: 'Nunca', syncSummary: 'Revisión {revision} · subidas {uploaded} · descargas {downloaded}', unknownError: 'Se produjo un error inesperado.', technicalDetails: 'Detalles técnicos',
    errors: localizedErrors('es'),
  },
  俄语: {
    app: 'Контекстный словарь', offline: 'Повторение офлайн', pairTitle: 'Связать с ПК', pairHelp: 'Отсканируйте QR-код в настройках ПК или вставьте текст сопряжения.',
    scan: 'Сканировать QR-код', pair: 'Связать устройство', waiting: 'Ожидание подтверждения на ПК…', lan: 'Локальная сеть', tailscale: 'Tailscale', sync: 'Синхронизировать', syncing: 'Синхронизация…',
    lastSync: 'Последняя синхронизация', unpair: 'Отвязать', noDue: 'Нет карточек для повторения.', again: 'Снова', good: 'Помню', connection: 'Подключение',
    preparing: 'Подготовка зашифрованного хранилища…', updateConnection: 'Обновить профиль подключения', save: 'Сохранить', interfaceLanguage: 'Язык интерфейса',
    videoUnavailable: 'Видео ещё не загружено. Повторите синхронизацию после подключения.', progress: 'Сегодня', pending: 'Ожидает отправки', lanAddress: 'HTTPS-адрес локальной сети', apply: 'Применить',
    scanProfile: 'Сканировать QR подключения', wrongAgain: 'Ошибка — Снова', next: 'Далее', confirmAgain: 'Подтвердить «Снова»', favorite: 'Избранное', unfavorite: 'Убрать из избранного',
    markMastered: 'Отметить выученным', syncHelp: 'Сначала отправляет все офлайн-действия, обновляет снимок ПК и загружает недостающие медиа.', pcLearningLanguage: 'Язык обучения на ПК',
    phoneLearningLanguage: 'Язык обучения на телефоне', followPc: 'Как на ПК ({language})', downloadingLibrary: 'Загрузка словаря с ПК',
    downloadingLibraryHelp: 'Повторение и выбор языка станут доступны после первого полного снимка.', retrySync: 'Повторить синхронизацию', snapshotReady: 'Словарь с ПК готов.',
    connectionUpdated: 'Профиль подключения обновлён.', never: 'Никогда', syncSummary: 'Ревизия {revision} · отправлено {uploaded} · загружено {downloaded}', unknownError: 'Произошла непредвиденная ошибка.', technicalDetails: 'Технические сведения',
    errors: localizedErrors('ru'),
  },
};

function localizedErrors(locale: 'ja' | 'ko' | 'fr' | 'de' | 'es' | 'ru'): Record<MobileErrorCode, string> {
  const common = {
    ja: ['予期しないエラーが発生しました。','暗号化ストレージを使用できません。','PCの単語帳データが無効です。','PCの同期方式に対応していません。','カードの学習状態がありません。','このカードは利用できません。','QRスキャナーに対応していません。文字列を貼り付けてください。','QRスキャナーをインストール中です。しばらくして再試行してください。','QRコードを読み取れませんでした。','対応していないペアリングコードです。','選択した接続先がコードにありません。','PCでペアリングが拒否されました。','ペアリングの有効期限が切れました。','ローカル接続が設定されていません。','Tailscale接続が設定されていません。','同期にはHTTPSが必要です。','PCの識別情報または方式が一致しません。','Android {minimum}以降が必要です。現在: {current}。','別のPCの接続プロファイルです。','接続プロファイルの署名が無効です。','PCの識別情報が変わりました。再ペアリングしてください。','先にPCとペアリングしてください。','同期に失敗しました（HTTP {status}）。'],
    ko: ['예기치 않은 오류가 발생했습니다.','암호화 저장소를 사용할 수 없습니다.','PC 단어장 스냅샷이 올바르지 않습니다.','PC 스냅샷 프로토콜이 호환되지 않습니다.','카드 일정 상태가 없습니다.','이 카드는 더 이상 사용할 수 없습니다.','지원되는 QR 스캐너가 없습니다. 페어링 텍스트를 붙여 넣으세요.','QR 스캐너 설치 중입니다. 잠시 후 다시 시도하세요.','QR 코드를 읽지 못했습니다.','지원되지 않는 페어링 코드입니다.','선택한 연결 방식이 코드에 없습니다.','PC에서 페어링을 거부했습니다.','페어링 세션이 만료되었습니다.','로컬 네트워크 연결이 설정되지 않았습니다.','Tailscale 연결이 설정되지 않았습니다.','동기화 주소는 HTTPS여야 합니다.','PC 신원 또는 프로토콜이 일치하지 않습니다.','Android {minimum} 이상이 필요합니다. 현재: {current}.','다른 PC의 연결 프로필입니다.','연결 프로필 서명이 올바르지 않습니다.','PC 신원이 바뀌었습니다. 다시 페어링하세요.','먼저 PC와 페어링하세요.','동기화 요청 실패(HTTP {status}).'],
    fr: ['Une erreur inattendue est survenue.','Le stockage chiffré est indisponible.','L’instantané du PC est invalide.','Le protocole du PC est incompatible.','Cette carte n’a pas d’état de planification.','Cette carte n’est plus disponible.','Aucun scanner QR compatible. Collez le texte d’association.','Installation du scanner QR. Réessayez bientôt.','Aucun QR code détecté.','Code d’association non pris en charge.','Le mode de connexion choisi manque dans le code.','Association refusée sur le PC.','La session d’association a expiré.','Connexion locale non configurée.','Connexion Tailscale non configurée.','Seules les adresses HTTPS sont autorisées.','L’identité ou le protocole du PC ne correspond pas.','Android {minimum} ou plus récent est requis. Version installée : {current}.','Ce profil appartient à un autre PC.','La signature du profil est invalide.','L’identité du PC a changé. Recommencez l’association.','Associez d’abord un PC.','Échec de la synchronisation (HTTP {status}).'],
    de: ['Ein unerwarteter Fehler ist aufgetreten.','Der verschlüsselte Speicher ist nicht verfügbar.','Der PC-Datenstand ist ungültig.','Das PC-Protokoll ist nicht kompatibel.','Der Karte fehlt der Lernzustand.','Diese Karte ist nicht mehr verfügbar.','Kein unterstützter QR-Scanner. Kopplungstext einfügen.','QR-Scanner wird installiert. Bitte gleich erneut versuchen.','Kein QR-Code gelesen.','Nicht unterstützter Kopplungscode.','Die gewählte Verbindung fehlt im Code.','Kopplung am PC abgelehnt.','Kopplungssitzung abgelaufen.','Lokale Verbindung nicht eingerichtet.','Tailscale-Verbindung nicht eingerichtet.','Nur HTTPS-Adressen sind zulässig.','PC-Identität oder Protokoll stimmt nicht überein.','Android {minimum} oder neuer ist erforderlich. Installiert: {current}.','Dieses Profil gehört zu einem anderen PC.','Die Profilsignatur ist ungültig.','Die PC-Identität hat sich geändert. Erneut koppeln.','Zuerst mit einem PC koppeln.','Synchronisierung fehlgeschlagen (HTTP {status}).'],
    es: ['Se produjo un error inesperado.','El almacenamiento cifrado no está disponible.','La copia del PC no es válida.','El protocolo del PC no es compatible.','La tarjeta no tiene estado de programación.','Esta tarjeta ya no está disponible.','No hay escáner QR compatible. Pega el texto de vinculación.','Instalando el escáner QR. Inténtalo de nuevo en breve.','No se leyó ningún QR.','Código de vinculación no compatible.','El código no contiene la conexión elegida.','El PC rechazó la vinculación.','La sesión de vinculación caducó.','La conexión local no está configurada.','La conexión Tailscale no está configurada.','Solo se permiten direcciones HTTPS.','La identidad o el protocolo del PC no coincide.','Se requiere Android {minimum} o posterior. Instalado: {current}.','Este perfil pertenece a otro PC.','La firma del perfil no es válida.','Cambió la identidad del PC. Vuelve a vincularlo.','Primero vincula un PC.','Falló la sincronización (HTTP {status}).'],
    ru: ['Произошла непредвиденная ошибка.','Зашифрованное хранилище недоступно.','Снимок словаря ПК повреждён.','Протокол ПК несовместим.','У карточки нет состояния расписания.','Карточка больше недоступна.','QR-сканер не поддерживается. Вставьте текст сопряжения.','QR-сканер устанавливается. Повторите позже.','QR-код не распознан.','Неподдерживаемый код сопряжения.','В коде нет выбранного подключения.','Сопряжение отклонено на ПК.','Сеанс сопряжения истёк.','Локальное подключение не настроено.','Tailscale не настроен.','Разрешены только HTTPS-адреса.','Идентификатор или протокол ПК не совпадает.','Требуется Android {minimum} или новее. Установлена: {current}.','Профиль принадлежит другому ПК.','Подпись профиля неверна.','Идентификатор ПК изменился. Выполните сопряжение снова.','Сначала свяжите приложение с ПК.','Ошибка синхронизации (HTTP {status}).'],
  }[locale];
  const keys = Object.keys(enErrors) as MobileErrorCode[];
  return Object.fromEntries(keys.map((key, index) => [key, common[index]!])) as Record<MobileErrorCode, string>;
}

export function formatMobileText(template: string, values: Record<string, string | number> = {}): string {
  return template.replace(/\{([^}]+)\}/gu, (_match, key: string) => String(values[key] ?? `{${key}}`));
}

export function formatMobileError(error: MobileError, strings: MobileStrings): string {
  const message = formatMobileText(strings.errors[error.code] ?? strings.unknownError, error.values);
  return error.detail && error.detail !== error.code ? `${message}\n${strings.technicalDetails}: ${error.detail}` : message;
}

export function mobileLocale(language: SupportedLanguage): string {
  const code = LANGUAGE_ISO_639_1_CODES[language];
  return ({ zh: 'zh-CN', en: 'en-US', ja: 'ja-JP', ko: 'ko-KR', fr: 'fr-FR', de: 'de-DE', es: 'es-ES', ru: 'ru-RU' } as Record<string, string>)[code] ?? 'en-US';
}
