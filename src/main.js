import { mount } from 'svelte';
import './app.css';
import { initTheme } from './lib/theme.js';
import { preloadRagInBackground } from './lib/rag-client.js';
import { runWhenIdle } from './lib/performance.js';
import App from './App.svelte';

initTheme();

if (typeof window !== 'undefined') {
  runWhenIdle(() => {
    preloadRagInBackground();
  }, { timeout: 5000 });
}

const app = mount(App, {
  target: document.getElementById('app'),
});

export default app;
