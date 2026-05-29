import { inject } from '@vercel/analytics';
import { mount } from 'svelte';
import './app.css';
import { initTheme } from './lib/theme.js';
import App from './App.svelte';

if (import.meta.env.PROD) {
  inject();
}

initTheme();

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
