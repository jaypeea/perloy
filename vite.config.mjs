import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig(({ mode }) => {
  const nativeShell = mode === 'native' || mode === 'desktop';

  return {
    base: nativeShell ? './' : '/',
    plugins: nativeShell ? [] : [VitePWA({
      registerType: 'autoUpdate',
      manifest: false,
      workbox: {
        globPatterns: ['**/*.{css,html,ico,js,png,svg,webmanifest}'],
        navigateFallback: 'index.html'
      }
    })]
  };
});
