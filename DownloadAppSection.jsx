import { useEffect, useState } from 'react';
import { Command, Monitor } from 'lucide-react';

export default function DownloadAppSection() {
  const [showDownloads, setShowDownloads] = useState(false);

  useEffect(() => {
    const isPakeDesktop = Boolean(window.__TAURI__ || window.__TAURI_IPC__);
    setShowDownloads(!isPakeDesktop);
  }, []);

  if (!showDownloads) return null;

  return (
    <details className="relative">
      <summary className="button button-quiet flex cursor-pointer list-none items-center gap-2">
        <Monitor aria-hidden="true" size={16} strokeWidth={1.8} />
        Download app
      </summary>
      <div className="absolute right-0 top-[calc(100%+8px)] z-30 grid w-64 gap-2 border border-gray-300 bg-white p-3 text-gray-950 shadow-lg">
        <a
          className="flex min-h-11 items-center gap-3 border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          href="/Perloy-Windows.msi"
          download="/Perloy-Windows.msi"
        >
          <Monitor aria-hidden="true" size={16} strokeWidth={1.8} />
          Download for Windows
        </a>
        <a
          className="flex min-h-11 items-center gap-3 border border-gray-300 bg-white px-3 py-2 text-sm font-semibold text-gray-950 transition-colors hover:bg-gray-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-black"
          href="/Perloy-macOS.dmg"
          download="/Perloy-macOS.dmg"
        >
          <Command aria-hidden="true" size={16} strokeWidth={1.8} />
          Download for macOS
        </a>
      </div>
    </details>
  );
}