import type { SupportedLanguage } from '../shared/constants.js';

export interface MobileStrings {
  app: string; offline: string; pairTitle: string; pairHelp: string; scan: string; pair: string;
  waiting: string; lan: string; tailscale: string; sync: string; syncing: string; lastSync: string;
  unpair: string; noDue: string; again: string; good: string; connection: string; error: string;
  preparing: string; updateConnection: string; save: string; language: string; videoUnavailable: string;
  progress: string; pending: string; lanAddress: string; apply: string; scanProfile: string;
}

const en: MobileStrings = {
  app: 'Context Vocabulary Notebook', offline: 'Offline review', pairTitle: 'Pair with your PC',
  pairHelp: 'Scan the QR code shown in PC Settings, or paste its JSON payload.', scan: 'Scan QR code', pair: 'Pair device',
  waiting: 'Waiting for approval on the PC…', lan: 'Local network', tailscale: 'Tailscale', sync: 'Sync now',
  syncing: 'Syncing…', lastSync: 'Last sync', unpair: 'Unpair', noDue: 'No cards are due.', again: 'Again', good: 'Good',
  connection: 'Connection', error: 'Error', preparing: 'Preparing encrypted offline storage…', updateConnection: 'Update connection profile',
  save: 'Save', language: 'Language', videoUnavailable: 'Video is not downloaded for offline review.',
  progress: 'Today', pending: 'Pending upload', lanAddress: 'LAN HTTPS address', apply: 'Apply', scanProfile: 'Scan connection QR',
};

export const mobileTranslations: Record<SupportedLanguage, MobileStrings> = {
  英语: en,
  中文: { ...en, offline: '离线复习', pairTitle: '与电脑配对', pairHelp: '扫描电脑设置页中的二维码，或粘贴二维码 JSON。', scan: '扫描二维码', pair: '配对设备', waiting: '等待电脑确认…', lan: '局域网', tailscale: 'Tailscale', sync: '立即同步', syncing: '正在同步…', lastSync: '上次同步', unpair: '解除配对', noDue: '当前没有到期卡片。', again: '重来', good: '记住了', connection: '连接方式', error: '错误', preparing: '正在准备加密离线存储…', updateConnection: '更新连接资料', save: '保存', language: '界面语言', videoUnavailable: '视频不会下载到离线复习。' },
  日语: { ...en, offline: 'オフライン復習', pairTitle: 'PCとペアリング', scan: 'QRコードをスキャン', pair: 'ペアリング', waiting: 'PCの承認を待っています…', lan: 'ローカルネットワーク', sync: '今すぐ同期', syncing: '同期中…', noDue: '期限のカードはありません。', again: 'もう一度', good: '覚えた', unpair: 'ペアリング解除', language: '言語' },
  韩语: { ...en, offline: '오프라인 복습', pairTitle: 'PC와 페어링', scan: 'QR 코드 스캔', pair: '기기 페어링', waiting: 'PC 승인을 기다리는 중…', lan: '로컬 네트워크', sync: '지금 동기화', syncing: '동기화 중…', noDue: '복습할 카드가 없습니다.', again: '다시', good: '알고 있음', unpair: '페어링 해제', language: '언어' },
  法语: { ...en, offline: 'Révision hors ligne', pairTitle: 'Associer au PC', scan: 'Scanner le QR code', pair: 'Associer', waiting: 'En attente de validation sur le PC…', lan: 'Réseau local', sync: 'Synchroniser', syncing: 'Synchronisation…', noDue: 'Aucune carte à réviser.', again: 'À revoir', good: 'Correct', unpair: 'Dissocier', language: 'Langue' },
  德语: { ...en, offline: 'Offline-Wiederholung', pairTitle: 'Mit PC koppeln', scan: 'QR-Code scannen', pair: 'Gerät koppeln', waiting: 'Warte auf Bestätigung am PC…', lan: 'Lokales Netzwerk', sync: 'Jetzt synchronisieren', syncing: 'Synchronisiere…', noDue: 'Keine Karten fällig.', again: 'Nochmal', good: 'Gewusst', unpair: 'Entkoppeln', language: 'Sprache' },
  西班牙语: { ...en, offline: 'Repaso sin conexión', pairTitle: 'Vincular con el PC', scan: 'Escanear código QR', pair: 'Vincular', waiting: 'Esperando aprobación en el PC…', lan: 'Red local', sync: 'Sincronizar ahora', syncing: 'Sincronizando…', noDue: 'No hay tarjetas pendientes.', again: 'Otra vez', good: 'Bien', unpair: 'Desvincular', language: 'Idioma' },
  俄语: { ...en, offline: 'Повторение офлайн', pairTitle: 'Связать с ПК', scan: 'Сканировать QR-код', pair: 'Связать устройство', waiting: 'Ожидание подтверждения на ПК…', lan: 'Локальная сеть', sync: 'Синхронизировать', syncing: 'Синхронизация…', noDue: 'Нет карточек для повторения.', again: 'Снова', good: 'Помню', unpair: 'Отвязать', language: 'Язык' },
};
