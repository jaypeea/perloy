import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => ({
  base: mode === 'native' || mode === 'desktop' ? './' : '/'
}));
