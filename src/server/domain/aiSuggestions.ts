import { lookup } from 'node:dns/promises';
import net from 'node:net';

import type { AiSuggestionRequestDto, AiSuggestionResponseDto } from '../../shared/types.js';
import type { AiConfigRow } from './aiConfigs.js';

interface OpenAiChatResponse {
  choices?: Array<{ message?: { content?: string } }>;
}

interface OpenAiModelsResponse {
  data?: Array<{ id?: unknown }>;
}

function none(message: string): AiSuggestionResponseDto {
  return { status: 'none', meaning_suggestion: '', usage_note: '', message };
}

function buildPrompt(input: AiSuggestionRequestDto): string {
  return [
    '你是语境单词本的制卡助手。',
    '只根据给定句子解释目标词在当前语境中的意思，不要给词典全义。',
    '输出严格 JSON，不要 Markdown，不要额外文字。',
    'JSON shape: {"meaning_suggestion":"一个中文词或很短中文释义","usage_note":"一句中文说明这个词在本句如何使用"}',
    `学习语言：${input.target_language ?? '英语'}`,
    `释义语言：${input.definition_language ?? '中文'}`,
    `目标词：${input.target_word}`,
    `句子：${input.sentence}`,
  ].join('\n');
}

function stripJsonCodeFence(content: string): string {
  const trimmed = content.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return fenced?.[1] ?? trimmed;
}

function parseSuggestionContent(content: string): AiSuggestionResponseDto {
  try {
    const parsed = JSON.parse(stripJsonCodeFence(content)) as { meaning_suggestion?: unknown; usage_note?: unknown };
    const meaning = typeof parsed.meaning_suggestion === 'string' ? parsed.meaning_suggestion.trim() : '';
    const note = typeof parsed.usage_note === 'string' ? parsed.usage_note.trim() : '';
    if (!meaning && !note) return none('AI suggestion empty');
    return { status: 'success', meaning_suggestion: meaning, usage_note: note };
  } catch {
    return none('AI suggestion unavailable');
  }
}

const AI_FETCH_TIMEOUT_MS = 15_000;

function stripIpv6Brackets(hostname: string): string {
  return hostname.startsWith('[') && hostname.endsWith(']') ? hostname.slice(1, -1) : hostname;
}

function ipv4MappedToIpv4(address: string): string | null {
  const lower = stripIpv6Brackets(address).toLowerCase();
  const dottedMatch = lower.match(/^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/);
  if (dottedMatch) return dottedMatch[1];

  const hexMatch = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/);
  if (!hexMatch) return null;

  const high = Number.parseInt(hexMatch[1], 16);
  const low = Number.parseInt(hexMatch[2], 16);
  if (!Number.isFinite(high) || !Number.isFinite(low) || high > 0xffff || low > 0xffff) return null;

  return [high >> 8, high & 0xff, low >> 8, low & 0xff].join('.');
}

function isMetadataAddress(address: string): boolean {
  const normalized = (ipv4MappedToIpv4(address) ?? stripIpv6Brackets(address)).toLowerCase();
  if (net.isIP(normalized) === 4) return normalized.startsWith('169.254.');
  return normalized === 'fd00:ec2::254';
}

async function isSafeAiBaseUrl(baseUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(baseUrl);
  } catch {
    return false;
  }

  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  const hostname = url.hostname.toLowerCase();
  const dnsName = hostname.endsWith('.') ? hostname.slice(0, -1) : hostname;
  if (dnsName === 'metadata.google.internal') return false;
  if (isMetadataAddress(hostname)) return false;

  if (net.isIP(stripIpv6Brackets(hostname)) !== 0) return true;

  try {
    const results = await lookup(dnsName, { all: true, verbatim: true });
    return !results.some((result) => isMetadataAddress(result.address));
  } catch {
    return false;
  }
}

export async function requestAiModelList(baseUrl: string, apiKey: string): Promise<string[]> {
  const normalizedBaseUrl = baseUrl.replace(/\/+$/, '');
  if (!(await isSafeAiBaseUrl(normalizedBaseUrl))) throw new Error('AI model list unavailable');

  const response = await fetch(`${normalizedBaseUrl}/models`, {
    method: 'GET',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    redirect: 'manual',
    signal: AbortSignal.timeout(AI_FETCH_TIMEOUT_MS),
  });
  if (!response.ok) throw new Error('AI model list unavailable');

  const data = await response.json() as OpenAiModelsResponse;
  const models = (data.data ?? [])
    .map((item) => (typeof item.id === 'string' ? item.id.trim() : ''))
    .filter((id) => id.length > 0);
  return Array.from(new Set(models)).sort((a, b) => a.localeCompare(b));
}

export async function requestAiSuggestion(
  config: AiConfigRow | undefined,
  input: AiSuggestionRequestDto,
): Promise<AiSuggestionResponseDto> {
  if (!config) return none('No active AI config');
  if (!(await isSafeAiBaseUrl(config.base_url))) return none('AI suggestion unavailable');

  try {
    const response = await fetch(`${config.base_url.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.api_key}`,
      },
      body: JSON.stringify({
        model: config.model,
        temperature: 0.2,
        messages: [
          { role: 'system', content: 'Return strict JSON only.' },
          { role: 'user', content: buildPrompt(input) },
        ],
      }),
      redirect: 'manual',
      signal: AbortSignal.timeout(AI_FETCH_TIMEOUT_MS),
    });

    if (!response.ok) return none('AI suggestion unavailable');
    const data = await response.json() as OpenAiChatResponse;
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string') return none('AI suggestion empty');
    return parseSuggestionContent(content);
  } catch {
    return none('AI suggestion unavailable');
  }
}
