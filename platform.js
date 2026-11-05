export function detectPlatform() {
  const userAgent = navigator.userAgent || '';
  const platformHint = navigator.userAgentData?.platform || navigator.platform || '';
  const touchMac = platformHint === 'MacIntel' && navigator.maxTouchPoints > 1;
  let os = 'other';
  if (/Android/i.test(userAgent) || /Android/i.test(platformHint)) os = 'android';
  else if (/iPhone|iPad|iPod/i.test(userAgent) || touchMac) os = 'ios';
  else if (/Windows/i.test(userAgent) || /Windows/i.test(platformHint)) os = 'windows';
  else if (/Macintosh|Mac OS X/i.test(userAgent) || /macOS|Mac/i.test(platformHint)) os = 'macos';
  const isMobile = Boolean(navigator.userAgentData?.mobile || os === 'android' || os === 'ios' || /Mobile/i.test(userAgent));
  const standalone = Boolean(
    window.matchMedia?.('(display-mode: standalone)').matches ||
    navigator.standalone === true ||
    /Electron/i.test(userAgent) ||
    window.process?.type === 'renderer'
  );
  return { os, isMobile, standalone };
}
