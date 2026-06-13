import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { RecognitionSetupCard } from '../../src/client/components/RecognitionSetupCard';
import { I18nProvider } from '../../src/client/i18n/I18nProvider';

function jsonResponse(body: unknown): Response {
  return new Response(JSON.stringify(body), { status: 200, headers: { 'Content-Type': 'application/json' } });
}

function settingsResponse(interfaceLanguage = '中文') {
  return jsonResponse({
    id: 1,
    interface_language: interfaceLanguage,
    default_target_language: '英语',
    default_definition_language: '中文',
    daily_review_limit: 20,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  });
}

function readiness() {
  return {
    ffmpeg: { ready: true, message: 'ffmpeg is ready' },
    stt: {
      provider: 'whisper.cpp' as const,
      ready: true,
      executablePath: 'whisper-cli',
      modelPath: '/models/ggml-base.en.bin',
      language: 'ja',
      message: 'ready',
      modelWarning: 'English-only Whisper model is not recommended for 日语.',
    },
    ocr: {
      provider: 'tesseract' as const,
      ready: false,
      executablePath: 'tesseract',
      language: 'jpn',
      requiredLanguage: 'jpn',
      installedLanguages: ['eng'],
      languageReady: false,
      languageMessage: 'Tesseract language data jpn is missing.',
      message: 'Tesseract language data jpn is missing.',
    },
  };
}

describe('RecognitionSetupCard', () => {
  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  it('shows readiness warnings and copyable commands for the selected language', () => {
    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="日语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    expect(screen.getByText('Local recognition setup · 日本語')).toBeInTheDocument();
    expect(screen.getByText(/English-only Whisper model/)).toBeInTheDocument();
    expect(screen.getAllByText(/jpn is missing/).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: 'View installation commands' }));
    fireEvent.click(screen.getByRole('button', { name: 'Linux / WSL' }));

    expect(screen.getByText(/sudo apt-get install -y ffmpeg tesseract-ocr tesseract-ocr-jpn/)).toBeInTheDocument();
    expect(screen.getByText(/cat >> \.env <<EOF/)).toBeInTheDocument();
    expect(screen.getByText(/CVN_WHISPER_CPP_PATH=\$WHISPER_ROOT\/build\/bin\/whisper-cli/)).toBeInTheDocument();
    expect(screen.getByText(/CVN_WHISPER_CPP_MODEL=\$APP_ROOT\/models\/ggml-small.bin/)).toBeInTheDocument();
    expect(screen.queryByText(/cat >> \.env <<'EOF'/)).not.toBeInTheDocument();
  });

  it('uses a native PowerShell command to write Windows whisper.cpp settings into .env', () => {
    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View installation commands' }));

    const windowsBlock = screen.getByText(/Add-Content -Encoding UTF8 \.env/).closest('.recognition-setup-command-block');

    expect(windowsBlock).not.toBeNull();
    expect(windowsBlock?.textContent).toContain('@"');
    expect(windowsBlock?.textContent).toContain('$WhisperExe');
    expect(windowsBlock?.textContent).toContain('$ModelPath');
    expect(windowsBlock?.textContent).not.toContain('cat >> .env');
    expect(windowsBlock?.textContent).not.toContain('C:\\tools\\whisper.cpp');
    expect(windowsBlock?.textContent).not.toContain('C:\\models\\ggml-small.bin');
  });

  it('uses the localized auto package fallback before Chinese readiness loads', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(settingsResponse('中文'));

    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={null} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    expect(await screen.findByText('本地识别配置 · English')).toBeInTheDocument();
    expect(screen.getByText('目标语言包：自动选择')).toBeInTheDocument();
  });

  it('uses Japanese setup copy when the interface language is Japanese', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(settingsResponse('日语'));

    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={null} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    expect(await screen.findByText('ローカル認識設定 · English')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'インストールコマンドを表示' })).toBeInTheDocument();
    expect(screen.getByText('対象言語パッケージ：自動選択')).toBeInTheDocument();
  });

  it.each([
    ['中文', '查看安装命令', 'Windows 构建 whisper.cpp 还需要 Visual Studio Build Tools / MSVC C++ 工具链。'],
    ['英语', 'View installation commands', 'Building whisper.cpp on Windows also requires Visual Studio Build Tools / the MSVC C++ toolchain.'],
    ['日语', 'インストールコマンドを表示', 'Windows で whisper.cpp をビルドするには Visual Studio Build Tools / MSVC C++ toolchain も必要です。'],
    ['韩语', '설치 명령 보기', 'Windows에서 whisper.cpp를 빌드하려면 Visual Studio Build Tools / MSVC C++ toolchain도 필요합니다.'],
    ['法语', 'Afficher les commandes d’installation', 'La compilation de whisper.cpp sous Windows nécessite aussi Visual Studio Build Tools / la chaîne C++ MSVC.'],
    ['德语', 'Installationsbefehle anzeigen', 'Zum Bauen von whisper.cpp unter Windows werden außerdem Visual Studio Build Tools / die MSVC-C++-Toolchain benötigt.'],
    ['西班牙语', 'Ver comandos de instalación', 'Compilar whisper.cpp en Windows también requiere Visual Studio Build Tools / la cadena de herramientas C++ de MSVC.'],
    ['俄语', 'Показать команды установки', 'Для сборки whisper.cpp в Windows также требуются Visual Studio Build Tools / цепочка инструментов C++ MSVC.'],
  ])('localizes the Windows Build Tools guide note for %s', async (language, showCommands, expectedSnippet) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(settingsResponse(language));

    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: showCommands }));

    expect(screen.getAllByText((content) => content.includes(expectedSnippet)).length).toBeGreaterThan(0);
    if (language !== '英语') {
      expect(screen.queryByText(/Building whisper\.cpp on Windows also requires/)).not.toBeInTheDocument();
    }
  });

  it('shows only the selected platform guide', () => {
    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="日语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View installation commands' }));

    expect(screen.getByRole('button', { name: 'Windows native PowerShell' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText('Step 1 · Install base tools')).toBeInTheDocument();
    expect(screen.getByText(/winget install --id Gyan\.FFmpeg/)).toBeInTheDocument();
    expect(screen.getByText(/Microsoft\.VisualStudio\.2022\.BuildTools/)).toBeInTheDocument();
    expect(screen.queryByText(/sudo apt-get install -y ffmpeg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/brew install ffmpeg tesseract git cmake/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Linux / WSL' }));

    expect(screen.getByRole('button', { name: 'Linux / WSL' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/sudo apt-get install -y ffmpeg/)).toBeInTheDocument();
    expect(screen.getAllByText(/APP_ROOT="\$\(pwd\)"/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/winget install --id Gyan\.FFmpeg/)).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'macOS' }));

    expect(screen.getByRole('button', { name: 'macOS' })).toHaveAttribute('aria-pressed', 'true');
    expect(screen.getByText(/brew install ffmpeg tesseract git cmake/)).toBeInTheDocument();
    expect(screen.getByText(/If 日本語 OCR still misses jpn, install the traineddata file/)).toBeInTheDocument();
    expect(screen.getAllByText(/WHISPER_ROOT="\$APP_ROOT\/tools\/whisper\.cpp"/).length).toBeGreaterThan(0);
    expect(screen.queryByText(/sudo apt-get install -y ffmpeg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/winget install --id Gyan\.FFmpeg/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Add-Content -Encoding UTF8 \.env/)).not.toBeInTheDocument();
  });

  it('uses project-local tools and models paths in Windows commands', () => {
    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'View installation commands' }));

    const windowsBlock = screen.getByText(/Add-Content -Encoding UTF8 \.env/).closest('.recognition-setup-command-block');

    expect(windowsBlock).not.toBeNull();
    expect(windowsBlock).toHaveTextContent(/\$AppRoot = \(Get-Location\)\.Path/);
    expect(windowsBlock).toHaveTextContent(/\$WhisperRoot = Join-Path \$AppRoot "tools\\whisper\.cpp"/);
    expect(windowsBlock).toHaveTextContent(/\$WhisperExe = Join-Path \$WhisperRoot "build\\bin\\Release\\whisper-cli\.exe"/);
    expect(windowsBlock).toHaveTextContent(/\$ModelPath = Join-Path \$AppRoot "models\\ggml-small\.bin"/);
    expect(windowsBlock).toHaveTextContent(/CVN_WHISPER_CPP_PATH=\$WhisperExe/);
    expect(windowsBlock).toHaveTextContent(/CVN_WHISPER_CPP_MODEL=\$ModelPath/);
    expect(windowsBlock).toHaveTextContent(/Add-Content -Encoding UTF8 \.env/);
    expect(windowsBlock).not.toHaveTextContent('C:\\tools\\whisper.cpp');
    expect(windowsBlock).not.toHaveTextContent('C:\\models\\ggml-small.bin');
    expect(windowsBlock).not.toHaveTextContent('/absolute/path/to/ggml-small.bin');
  });

  it.each([
    ['中文', '查看安装命令', '步骤 1 安装系统依赖，可以在任意目录运行。步骤 2–5 请先进入本 notebook 安装目录后再执行。'],
    ['英语', 'View installation commands', 'Step 1 installs system dependencies and can run from any folder. Run steps 2–5 from this notebook install directory first.'],
    ['日语', 'インストールコマンドを表示', 'ステップ 1 はシステム依存関係のインストールなので任意のフォルダーで実行できます。ステップ 2〜5 は先にこの notebook インストールディレクトリへ移動してから実行してください。'],
    ['韩语', '설치 명령 보기', '1단계는 시스템 의존성 설치이므로 어느 폴더에서나 실행할 수 있습니다. 2–5단계는 먼저 이 notebook 설치 디렉터리로 이동한 뒤 실행하세요.'],
    ['法语', 'Afficher les commandes d’installation', 'L’étape 1 installe des dépendances système et peut être exécutée depuis n’importe quel dossier. Exécutez les étapes 2 à 5 après être entré dans ce dossier d’installation du notebook.'],
    ['德语', 'Installationsbefehle anzeigen', 'Schritt 1 installiert Systemabhängigkeiten und kann in jedem Ordner ausgeführt werden. Für Schritt 2–5 zuerst in diesen Notebook-Installationsordner wechseln.'],
    ['西班牙语', 'Ver comandos de instalación', 'El paso 1 instala dependencias del sistema y puede ejecutarse desde cualquier carpeta. Ejecuta los pasos 2–5 después de entrar en este directorio de instalación del notebook.'],
    ['俄语', 'Показать команды установки', 'Шаг 1 устанавливает системные зависимости и может запускаться из любой папки. Шаги 2–5 выполняйте после перехода в каталог установки этого notebook.'],
  ])('localizes where each install step should run for %s', async (language, showCommands, expectedNote) => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(settingsResponse(language));

    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={readiness()} loading={false} error="" onRefresh={() => undefined} />
      </I18nProvider>,
    );

    fireEvent.click(await screen.findByRole('button', { name: showCommands }));

    expect(screen.getByText(expectedNote)).toBeInTheDocument();
    if (language !== '英语') {
      expect(screen.queryByText(/Step 1 installs system dependencies/)).not.toBeInTheDocument();
    }
  });

  it('calls refresh when the user asks to rerun checks', () => {
    const onRefresh = vi.fn();
    render(
      <I18nProvider>
        <RecognitionSetupCard targetLanguage="英语" readiness={readiness()} loading={false} error="" onRefresh={onRefresh} />
      </I18nProvider>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'I installed it, check again' }));

    expect(onRefresh).toHaveBeenCalledTimes(1);
  });
});
