<script>
  import { onMount } from 'svelte';
  import TopicSelector from './lib/TopicSelector.svelte';
  import TopicView from './lib/TopicView.svelte';
  import RareEarthView from './lib/materials/RareEarthView.svelte';
  import ResearchModeSelector from './lib/ResearchModeSelector.svelte';
  import { loadResearchMode, installResearchModeHashSync, saveResearchMode } from './lib/research-mode.js';
  import ThemeToggle from './lib/ThemeToggle.svelte';
  import SiteLogo from './lib/SiteLogo.svelte';
  import GithubIcon from './lib/GithubIcon.svelte';
  import { SITE_AUTHOR, SITE_AUTHOR_LINKEDIN, SITE_GITHUB_URL, copyrightYear } from './lib/site.js';
  import LoadingSpinner from './lib/LoadingSpinner.svelte';
  import { loadTopicData, getTopicMeta, loadTopicId, saveTopicId, installTopicHashSync, topicIdFromHash } from './lib/topics.js';
  import { installBrandThemeSync, applyBrandTheme, brandForTopicMeta } from './lib/brand-theme.js';

  const year = copyrightYear();

  let researchMode = $state(loadResearchMode());
  let topicId = $state(loadTopicId());
  let topicData = $state(/** @type {object | null} */ (null));
  let topicLoading = $state(true);

  const topicMeta = $derived(getTopicMeta(topicId));

  $effect(() => {
    if (researchMode !== 'accelerators') return;
    const id = topicId;
    topicLoading = true;
    loadTopicData(id).then((data) => {
      if (id === topicId && researchMode === 'accelerators') {
        topicData = data;
        topicLoading = false;
      }
    });
  });

  $effect(() => {
    if (typeof document === 'undefined') return;
    document.title =
      researchMode === 'materials'
        ? 'Rare Earth Elements — Supply Chain Research'
        : topicMeta?.label
          ? `${topicMeta.label} — Supply Chain Research`
          : 'Supply Chain Research';
  });

  /** @type {(() => void) | null} */
  let disposeBrandTheme = null;

  $effect(() => {
    if (typeof document === 'undefined') return;
    topicMeta?.id;
    applyBrandTheme(brandForTopicMeta(topicMeta));
  });

  /** @type {HTMLElement | undefined} */
  let headerEl = $state();
  /** @type {HTMLElement | undefined} */
  let footerEl = $state();

  onMount(() => {
    disposeBrandTheme = installBrandThemeSync(() => topicMeta);

    if (!topicIdFromHash(window.location.hash)) {
      saveTopicId(topicId, { hash: 'replace' });
    }

    const unhash = installTopicHashSync((id) => {
      researchMode = 'accelerators';
      topicId = id;
      saveTopicId(id, { hash: false });
    });

    const unMode = installResearchModeHashSync((mode) => {
      researchMode = mode;
    });

    if (window.location.hash.startsWith('#materials')) {
      researchMode = 'materials';
    }

    let disconnectResize = () => {};
    const observers = [];

    if (headerEl) {
      const syncHeaderHeight = () => {
        document.documentElement.style.setProperty('--app-header-height', `${headerEl.offsetHeight}px`);
      };
      syncHeaderHeight();
      const observer = new ResizeObserver(syncHeaderHeight);
      observer.observe(headerEl);
      observers.push(observer);
    }

    if (footerEl) {
      const syncFooterHeight = () => {
        document.documentElement.style.setProperty('--app-footer-height', `${footerEl.offsetHeight}px`);
      };
      syncFooterHeight();
      const observer = new ResizeObserver(syncFooterHeight);
      observer.observe(footerEl);
      observers.push(observer);
    }

    disconnectResize = () => observers.forEach((o) => o.disconnect());

    return () => {
      disconnectResize();
      unhash();
      unMode();
      disposeBrandTheme?.();
      disposeBrandTheme = null;
    };
  });
</script>

<header
  bind:this={headerEl}
  class="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-50 flex flex-wrap items-center justify-between gap-6 border-b px-[var(--page-gutter)] py-4 backdrop-blur-md"
>
  <div class="flex min-w-0 items-center gap-3.5">
    <SiteLogo size={44} />
    <div class="min-w-0">
      <div class="text-primary mb-0.5 text-xs font-semibold tracking-widest uppercase">Supply chain research</div>
      <p class="text-muted-foreground m-0 text-sm leading-snug">
        Reverse-traced vendor maps from SEC 10-K / 20-F filings
      </p>
    </div>
  </div>
  <div class="flex flex-wrap items-center gap-3">
    <ResearchModeSelector
      bind:mode={researchMode}
      onchange={(m) => {
        if (m === 'materials') saveResearchMode('materials');
      }}
    />
    {#if researchMode === 'accelerators'}
      <TopicSelector bind:topicId />
    {/if}
    <a
      href={SITE_GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      class="text-muted-foreground hover:text-foreground hover:bg-muted/80 inline-flex h-8 w-8 items-center justify-center rounded-lg border transition-colors"
      aria-label="View source on GitHub"
      title="View source on GitHub"
    >
      <GithubIcon />
    </a>
    <ThemeToggle />
  </div>
</header>

<main class="mx-auto max-w-[1400px] px-[var(--page-gutter)] py-4 pb-[var(--scroll-bottom-offset)] sm:py-6">
  {#if researchMode === 'materials'}
    <RareEarthView />
  {:else if topicLoading && !topicData}
    <div
      class="text-muted-foreground flex min-h-[40vh] flex-col items-center justify-center gap-3"
      aria-busy="true"
      aria-label="Loading research topic"
    >
      <LoadingSpinner />
      <span class="text-sm">Loading supply chain data…</span>
    </div>
  {:else}
    <TopicView data={topicData} {topicMeta} />
  {/if}
</main>

<footer
  bind:this={footerEl}
  class="bg-background/95 supports-[backdrop-filter]:bg-background/80 fixed right-0 bottom-0 left-0 z-50 border-t px-[var(--page-gutter)] py-4 backdrop-blur-md"
>
  <p class="text-muted-foreground mx-auto max-w-[1400px] text-center text-sm">
    © {year}
    <a
      href={SITE_AUTHOR_LINKEDIN}
      target="_blank"
      rel="noopener noreferrer"
      class="text-foreground hover:text-primary font-medium underline-offset-2 transition-colors hover:underline"
    >
      {SITE_AUTHOR}
    </a>
  </p>
</footer>

<style>
  :global(body) {
    padding-top: 0;
  }
</style>
