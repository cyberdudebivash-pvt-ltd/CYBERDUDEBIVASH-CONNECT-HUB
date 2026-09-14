// @ts-check
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';
import mdx from '@astrojs/mdx';
import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://connect.cyberdudebivash.com',
  vite: {
    plugins: [tailwindcss()]
  },
  integrations: [mdx()],
  adapter: cloudflare()
});