const releaseBase = 'https://github.com/jaypeea/perloy/releases/latest/download/';

export const installerUrls = Object.freeze({
  windows: import.meta.env.VITE_WINDOWS_INSTALLER_URL || releaseBase + 'Perloy-Setup.exe',
  macos: import.meta.env.VITE_MAC_INSTALLER_URL || releaseBase + 'Perloy.dmg',
  android: import.meta.env.VITE_ANDROID_APK_URL || releaseBase + 'Perloy.apk'
});
