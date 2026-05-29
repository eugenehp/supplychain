<script>
  import CompanyLogo from './CompanyLogo.svelte';
  import LoadingSpinner from './LoadingSpinner.svelte';
  import { buildSectionDisplay, applyHighlightToBlocks, resolveHighlightRange, documentOffsetForRagChunk, findSectionForRag } from './filing-format.js';
  import { brandFor } from './company-brands.js';
  import { loadFilingProgressive, peekFilingBundle } from './filing-cache.js';
  import * as Dialog from '$lib/components/ui/dialog/index.js';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
  import ChevronLeftIcon from '@lucide/svelte/icons/chevron-left';
  import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
  import { untrack, tick } from 'svelte';
  import { cn } from '$lib/utils.js';

  /** @type {{
   *   open?: boolean,
   *   ticker: string | null,
   *   highlightOffset?: number | null,
   *   highlightExcerpt?: string | null,
   *   highlightVendor?: string | null,
   *   highlightSectionId?: string | null,
   *   onclose?: () => void
   * }} */
  let {
    open = $bindable(false),
    ticker = null,
    highlightOffset = null,
    highlightExcerpt = null,
    highlightVendor = null,
    highlightSectionId = null,
    onclose,
  } = $props();

  let loadingShell = $state(false);
  let loadingText = $state(false);
  let error = $state('');
  let meta = $state(null);
  let sections = $state([]);
  let text = $state('');
  let evidence = $state([]);
  /** @type {{ version?: number, sectionBlocks?: Record<string, { blocks: object[] }> } | null} */
  let display = $state(null);
  let activeSectionId = $state(null);
  let activeHighlight = $state({ offset: null, excerpt: null, vendor: null });
  let loadGeneration = 0;

  /** Non-reactive guards — must not be $state or effects loop on read/write. */
  let lastAppliedHighlightKey = '';
  let lastLoadedTicker = '';
  let scrollAfterHighlight = $state(false);

  const EVIDENCE_SIDEBAR_LIMIT = 48;
  const BLOCKS_PAGE = 80;
  let blocksLimit = $state(BLOCKS_PAGE);

  let contentEl = $state(null);

  const brand = $derived(brandFor(ticker));
  const hasDisplay = $derived(Boolean(display?.sectionBlocks));
  const isLoading = $derived(loadingShell || (loadingText && !hasDisplay));

  const highlightRange = $derived.by(() => {
    if (activeHighlight.excerpt || activeHighlight.offset != null) {
      const fromEvidence = evidence.find(
        (e) =>
          e.excerpt === activeHighlight.excerpt &&
          (activeHighlight.offset == null || e.charOffset === activeHighlight.offset),
      );
      if (fromEvidence?.range) return fromEvidence.range;

      if (!text) return null;
      return resolveHighlightRange(text, {
        offset: activeHighlight.offset,
        excerpt: activeHighlight.excerpt,
        vendor: activeHighlight.vendor,
      });
    }
    return null;
  });

  const effectiveHighlightRange = $derived.by(() => {
    if (!activeHighlight.excerpt && activeHighlight.offset == null) return null;
    if (highlightRange) return highlightRange;
    if (!text || !activeHighlight.excerpt) return null;
    return resolveHighlightRange(text, {
      offset: activeHighlight.offset,
      excerpt: activeHighlight.excerpt,
      vendor: activeHighlight.vendor,
    });
  });

  const activeSectionIndex = $derived(sections.findIndex((s) => s.id === activeSectionId));

  const activeSectionView = $derived.by(() => {
    if (!sections.length) return null;

    const range = effectiveHighlightRange;
    const sectionFromHighlight =
      range && sections.find((s) => range.start >= s.charStart && range.start < s.charEnd);

    const section =
      sectionFromHighlight ??
      sections.find((s) => s.id === activeSectionId) ??
      sections[0];
    if (!section) return null;

    const precomputed = display?.sectionBlocks?.[section.id]?.blocks;
    const blocks = text
      ? buildSectionDisplay(section, text, range)
      : precomputed
        ? applyHighlightToBlocks(precomputed, range, activeHighlight)
        : [];

    return { ...section, blocks };
  });

  const visibleBlocks = $derived(activeSectionView?.blocks.slice(0, blocksLimit) ?? []);
  const hiddenBlockCount = $derived(
    Math.max(0, (activeSectionView?.blocks.length ?? 0) - visibleBlocks.length),
  );

  const sidebarEvidence = $derived.by(() => {
    if (!evidence.length) return [];
    const list = [...evidence];
    const activeIdx = list.findIndex(
      (e) => e.excerpt === activeHighlight.excerpt && e.charOffset === activeHighlight.offset,
    );
    if (activeIdx > 0) {
      const [item] = list.splice(activeIdx, 1);
      list.unshift(item);
    }
    return list.slice(0, EVIDENCE_SIDEBAR_LIMIT);
  });

  const hiddenEvidenceCount = $derived(Math.max(0, evidence.length - sidebarEvidence.length));

  function propsHighlightKey() {
    return `${highlightOffset ?? ''}|${highlightExcerpt ?? ''}|${highlightVendor ?? ''}|${highlightSectionId ?? ''}`;
  }

  function needsHighlightTarget() {
    return Boolean(highlightExcerpt || highlightOffset != null || highlightVendor);
  }

  function bundleReady(bundle) {
    return Boolean(bundle?.display?.sectionBlocks || bundle?.text);
  }

  function resetBlocksLimit() {
    blocksLimit = BLOCKS_PAGE;
  }

  function ensureBlocksIncludeHighlight(blocks) {
    const idx = blocks.findIndex((b) => b.hasHighlight || b.parts?.some((p) => p.type === 'mark'));
    if (idx >= 0 && idx >= blocksLimit) {
      blocksLimit = Math.ceil((idx + 1) / BLOCKS_PAGE) * BLOCKS_PAGE;
    }
  }

  function scheduleScrollToHighlight() {
    scrollAfterHighlight = true;
  }

  async function scrollToHighlight() {
    await tick();
    for (let attempt = 0; attempt < 12; attempt++) {
      const mark = contentEl?.querySelector('mark.evidence-highlight');
      if (mark) {
        mark.scrollIntoView({ behavior: 'instant', block: 'center' });
        scrollAfterHighlight = false;
        return;
      }
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
    scrollAfterHighlight = false;
  }

  function resolveHighlightFromEntry(entry) {
    if (entry?.range) return entry.range;
    if (!text) return null;
    return resolveHighlightRange(text, {
      offset: entry?.charOffset ?? null,
      excerpt: entry?.excerpt ?? null,
      vendor: entry?.vendor ?? null,
    });
  }

  function resolvePropsHighlightRange(propsHighlight, sectionId = highlightSectionId) {
    const fromEvidence = evidence.find(
      (e) =>
        e.excerpt === propsHighlight.excerpt &&
        (propsHighlight.offset == null || e.charOffset === propsHighlight.offset),
    );
    if (fromEvidence?.range) return fromEvidence.range;

    if (!text) return null;
    const resolvedSectionId = resolveSectionIdFromRag(sections, sectionId, propsHighlight.offset);
    const resolvedOffset = resolveOffsetFromSection(sections, resolvedSectionId, propsHighlight.offset);
    return resolveHighlightRange(text, { ...propsHighlight, offset: resolvedOffset });
  }

  function syncHighlightFromProps(shouldScroll = false) {
    if (!sections.length) return;
    if (!text && !hasDisplay) return;

    const propsHighlight = highlightFromProps();
    const resolvedSectionId = resolveSectionIdFromRag(sections, highlightSectionId, propsHighlight.offset);
    const resolvedOffset = resolveOffsetFromSection(sections, resolvedSectionId, propsHighlight.offset);
    setActiveHighlight({ ...propsHighlight, offset: resolvedOffset });

    const range = resolvePropsHighlightRange({ ...propsHighlight, offset: resolvedOffset }, resolvedSectionId);
    const nextSectionId =
      (resolvedSectionId && sections.find((s) => s.id === resolvedSectionId)?.id) ??
      (range ? sections.find((s) => range.start >= s.charStart && range.start < s.charEnd)?.id : null) ??
      null;

    if (nextSectionId && nextSectionId !== activeSectionId) {
      activeSectionId = nextSectionId;
      resetBlocksLimit();
    }

    lastAppliedHighlightKey = propsHighlightKey();
    if (shouldScroll) scheduleScrollToHighlight();
  }

  function highlightFromProps() {
    return {
      offset: highlightOffset,
      excerpt: highlightExcerpt,
      vendor: highlightVendor,
    };
  }

  function highlightsEqual(a, b) {
    return a.offset === b.offset && a.excerpt === b.excerpt && a.vendor === b.vendor;
  }

  function resolveOffsetFromSection(sectionList, sectionId, offset) {
    return documentOffsetForRagChunk(sectionList, sectionId, offset);
  }

  function resolveSectionIdFromRag(sectionList, sectionId, offset) {
    const matched = findSectionForRag(sectionList, sectionId);
    if (matched) return matched.id;
    if (offset == null || !sectionList?.length) return sectionId;

    const absolute = documentOffsetForRagChunk(sectionList, sectionId, offset);
    if (absolute == null) return sectionId;
    const byRange = sectionList.find((s) => absolute >= s.charStart && absolute < s.charEnd);
    return byRange?.id ?? sectionId;
  }

  function setActiveHighlight(next) {
    if (highlightsEqual(activeHighlight, next)) return;
    activeHighlight = next;
  }

  function applyShell(bundle, propsHighlight, sectionId, { scroll = false } = {}) {
    meta = bundle.meta;
    sections = bundle.sections;
    evidence = bundle.evidence;
    display = bundle.display ?? null;

    if (!bundle.text && !display?.sectionBlocks) {
      text = '';
      activeSectionId =
        (sectionId && sections.find((s) => s.id === sectionId)?.id) ?? sections[0]?.id ?? null;
      return;
    }

    if (bundle.text) {
      applyText(bundle.text, propsHighlight, sectionId, { scroll });
    } else {
      applyDisplayShell(propsHighlight, sectionId, { scroll });
    }
  }

  function applyDisplayShell(propsHighlight, sectionId, { scroll = false } = {}) {
    const resolvedSectionId = resolveSectionIdFromRag(sections, sectionId, propsHighlight.offset);
    const resolvedOffset = resolveOffsetFromSection(sections, resolvedSectionId, propsHighlight.offset);
    const withOffset = { ...propsHighlight, offset: resolvedOffset };

    if (withOffset.excerpt || withOffset.offset != null) {
      setActiveHighlight(withOffset);
    } else if (evidence.length) {
      const first = evidence.find((e) => e.vendor) ?? evidence[0];
      setActiveHighlight({
        offset: first.charOffset ?? null,
        excerpt: first.excerpt ?? null,
        vendor: first.vendor ?? null,
      });
    } else {
      setActiveHighlight(withOffset);
    }

    const range = resolvePropsHighlightRange(withOffset, resolvedSectionId);
    const nextSectionId =
      (resolvedSectionId && sections.find((s) => s.id === resolvedSectionId)?.id) ??
      (range ? sections.find((s) => range.start >= s.charStart && range.start < s.charEnd)?.id : null) ??
      sections[0]?.id ??
      null;

    if (nextSectionId !== activeSectionId) {
      activeSectionId = nextSectionId;
      resetBlocksLimit();
    }

    lastAppliedHighlightKey = propsHighlightKey();
    if (scroll) scheduleScrollToHighlight();
  }

  function applyText(filingText, propsHighlight, sectionId, { scroll = false } = {}) {
    text = filingText;

    const resolvedSectionId = resolveSectionIdFromRag(sections, sectionId, propsHighlight.offset);
    const resolvedOffset = resolveOffsetFromSection(sections, resolvedSectionId, propsHighlight.offset);
    const withOffset = { ...propsHighlight, offset: resolvedOffset };

    if (withOffset.excerpt || withOffset.offset != null) {
      setActiveHighlight(withOffset);
    } else if (evidence.length) {
      const first = evidence.find((e) => e.vendor) ?? evidence[0];
      setActiveHighlight({
        offset: first.charOffset ?? null,
        excerpt: first.excerpt ?? null,
        vendor: first.vendor ?? null,
      });
    } else {
      setActiveHighlight(withOffset);
    }

    const range = resolveHighlightRange(text, withOffset);
    const nextSectionId =
      (resolvedSectionId && sections.find((s) => s.id === resolvedSectionId)?.id) ??
      (range ? sections.find((s) => range.start >= s.charStart && range.start < s.charEnd)?.id : null) ??
      sections[0]?.id ??
      null;

    if (nextSectionId !== activeSectionId) {
      activeSectionId = nextSectionId;
      resetBlocksLimit();
    }

    lastAppliedHighlightKey = propsHighlightKey();
    if (scroll) scheduleScrollToHighlight();
  }

  async function ensureFilingLoaded(t) {
    const generation = ++loadGeneration;
    error = '';
    const wantsText = needsHighlightTarget();

    const cached = peekFilingBundle(t);
    if (cached && bundleReady(cached) && (!wantsText || cached.text)) {
      loadingShell = false;
      loadingText = false;
      applyShell(cached, highlightFromProps(), highlightSectionId, { scroll: true });
      lastLoadedTicker = t;
      return;
    }

    loadingShell = true;
    loadingText = wantsText || !cached?.text;

    try {
      const propsHighlight = highlightFromProps();
      if (cached && !wantsText) {
        applyShell(cached, propsHighlight, highlightSectionId);
        loadingShell = false;
      }

      const bundle = await loadFilingProgressive(t, {
        requireText: wantsText,
        onText: (filingText) => {
          if (generation !== loadGeneration || !open || ticker !== t) return;
          applyText(filingText, highlightFromProps(), highlightSectionId, { scroll: true });
          loadingText = false;
        },
      });

      if (generation !== loadGeneration || !open || ticker !== t) return;

      if (!cached) {
        applyShell(bundle, propsHighlight, highlightSectionId, { scroll: true });
      } else if ((bundle.text && !text) || (bundle.display?.sectionBlocks && !display)) {
        applyShell(bundle, propsHighlight, highlightSectionId, { scroll: true });
      }

      lastLoadedTicker = t;
    } catch (e) {
      if (generation !== loadGeneration || !open || ticker !== t) return;
      error = e.message ?? 'Failed to load filing';
      meta = null;
      sections = [];
      text = '';
      evidence = [];
      display = null;
    } finally {
      if (generation === loadGeneration && open && ticker === t) {
        loadingShell = false;
        loadingText = false;
      }
    }
  }

  $effect(() => {
    const isOpen = open;
    const t = ticker;
    if (!isOpen || !t) {
      lastLoadedTicker = '';
      return;
    }
    if (t === lastLoadedTicker) return;
    untrack(() => {
      void ensureFilingLoaded(t);
    });
  });

  $effect(() => {
    if (!open || !ticker) return;

    highlightOffset;
    highlightExcerpt;
    highlightVendor;
    highlightSectionId;
    const textReady = (text.length > 0 || hasDisplay) && sections.length > 0;
    if (!textReady) return;

    const key = propsHighlightKey();
    if (key === lastAppliedHighlightKey) return;

    untrack(() => {
      syncHighlightFromProps(true);
    });
  });

  function handleOpenChange(v) {
    if (v === open) return;
    open = v;
    if (!v) {
      loadGeneration += 1;
      lastAppliedHighlightKey = '';
      lastLoadedTicker = '';
      scrollAfterHighlight = false;
      onclose?.();
    }
  }

  function jumpToSection(section) {
    activeSectionId = section.id;
    resetBlocksLimit();
    setActiveHighlight({ offset: null, excerpt: null, vendor: null });
    requestAnimationFrame(() => {
      contentEl?.scrollTo({ top: 0, behavior: 'instant' });
    });
  }

  function goToAdjacentSection(delta) {
    const idx = sections.findIndex((s) => s.id === activeSectionId);
    const next = sections[idx + delta];
    if (next) jumpToSection(next);
  }

  function jumpToEvidence(entry) {
    setActiveHighlight({
      offset: entry.charOffset ?? null,
      excerpt: entry.excerpt ?? null,
      vendor: entry.vendor ?? null,
    });

    const range = resolveHighlightFromEntry(entry);
    if (range) {
      const section = sections.find((s) => range.start >= s.charStart && range.start < s.charEnd);
      if (section && section.id !== activeSectionId) {
        activeSectionId = section.id;
        resetBlocksLimit();
      }
    }
    scheduleScrollToHighlight();
  }

  $effect(() => {
    if (!open || !scrollAfterHighlight) return;
    const blocks = activeSectionView?.blocks ?? [];
    const section = activeSectionView;
    if (!blocks.length || !section) return;

    if (
      section.id !== activeSectionId &&
      blocks.some((b) => b.hasHighlight || b.parts?.some((p) => p.type === 'mark'))
    ) {
      untrack(() => {
        activeSectionId = section.id;
      });
    }

    ensureBlocksIncludeHighlight(blocks);
    if (!blocks.some((b) => b.hasHighlight || b.parts?.some((p) => p.type === 'mark'))) return;

    untrack(() => {
      void scrollToHighlight();
    });
  });
</script>

<Dialog.Root bind:open onOpenChange={handleOpenChange}>
  {#if open}
  <Dialog.Content
    class="filing-dialog flex h-[min(96vh,900px)] max-h-[96vh] w-[min(1280px,calc(100vw-2rem))] max-w-[min(1280px,calc(100vw-2rem))]! flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(1280px,calc(100vw-2rem))]"
    aria-label={meta?.name ? `${meta.name} SEC filing` : 'SEC filing viewer'}
  >
    <header class="bg-muted/40 flex shrink-0 items-center justify-between gap-4 border-b px-5 py-4">
      <div class="flex items-center gap-3">
        <CompanyLogo ticker={ticker} size={44} filing={meta} />
        <div>
          <Dialog.Title class="text-lg">{brand.name}</Dialog.Title>
          <Dialog.Description class="text-muted-foreground text-sm">
            {ticker}
            {#if meta?.filing}
              · {meta.filing.form} · filed {meta.filing.filingDate}
            {/if}
            {#if meta?.filingUrl}
              · <a href={meta.filingUrl} target="_blank" rel="noreferrer" class="text-primary hover:underline">EDGAR</a>
            {/if}
          </Dialog.Description>
        </div>
      </div>
    </header>

    {#if error}
      <Alert variant="destructive" class="m-6">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    {:else if loadingShell && !sections.length}
      <div class="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-3 p-12">
        <LoadingSpinner />
        <p class="text-sm">Loading {ticker} filing…</p>
      </div>
    {:else}
      <div class="grid min-h-0 flex-1 grid-cols-1 md:grid-cols-[260px_1fr]">
        <aside class="ui-card-scroll ui-card-scroll-sm max-h-[220px] border-b md:max-h-none md:border-r md:border-b-0">
          <div class="space-y-4 p-3">
            <section>
              <h3 class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Document sections
              </h3>
              <ul class="space-y-0.5">
                {#each sections as section}
                  <li>
                    <button
                      type="button"
                      class={cn(
                        'hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors',
                        activeSectionId === section.id && 'bg-muted',
                      )}
                      onclick={() => jumpToSection(section)}
                    >
                      <span class="text-muted-foreground block text-[0.72rem] font-semibold">
                        {section.item ? `Item ${section.item}` : section.title}
                      </span>
                      <span class="block leading-snug">{section.title}</span>
                    </button>
                  </li>
                {/each}
              </ul>
            </section>

            <section>
              <h3 class="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                Evidence ({evidence.length})
              </h3>
              <ul class="space-y-0.5">
                {#each sidebarEvidence as entry}
                  <li>
                    <button
                      type="button"
                      class={cn(
                        'hover:bg-muted w-full rounded-md px-2 py-1.5 text-left text-xs transition-colors disabled:opacity-50',
                        activeHighlight.excerpt === entry.excerpt &&
                          activeHighlight.offset === entry.charOffset &&
                          'bg-muted',
                      )}
                      onclick={() => jumpToEvidence(entry)}
                      disabled={loadingText}
                    >
                      {#if entry.vendor}
                        <strong class="text-primary mb-0.5 block text-[0.72rem]">{entry.vendor}</strong>
                      {/if}
                      <span class="text-muted-foreground line-clamp-2">{entry.excerpt?.slice(0, 90)}…</span>
                    </button>
                  </li>
                {/each}
              </ul>
              {#if hiddenEvidenceCount}
                <p class="text-muted-foreground mt-2 text-[0.7rem]">
                  +{hiddenEvidenceCount} more in the evidence panel below
                </p>
              {/if}
            </section>
          </div>
        </aside>

        <div class="flex min-h-0 flex-1 flex-col">
          {#if sections.length > 1}
            <div class="bg-muted/20 flex shrink-0 items-center justify-between gap-3 border-b px-4 py-2">
              <Button
                variant="outline"
                size="sm"
                disabled={activeSectionIndex <= 0 || loadingText}
                onclick={() => goToAdjacentSection(-1)}
              >
                <ChevronLeftIcon class="size-4" />
                Previous
              </Button>
              <span class="text-muted-foreground text-xs">
                Section {Math.max(activeSectionIndex + 1, 1)} of {sections.length}
                {#if loadingText}
                  · loading text…
                {/if}
              </span>
              <Button
                variant="outline"
                size="sm"
                disabled={activeSectionIndex >= sections.length - 1 || loadingText}
                onclick={() => goToAdjacentSection(1)}
              >
                Next
                <ChevronRightIcon class="size-4" />
              </Button>
            </div>
          {/if}

          <div class="ui-card-scroll min-h-0 flex-1" style="max-height: none;" bind:this={contentEl}>
            {#if loadingText && !activeSectionView && !hasDisplay}
              <div class="text-muted-foreground flex h-full min-h-[16rem] flex-col items-center justify-center gap-3 p-12">
                <LoadingSpinner />
                <p class="text-sm">Loading filing text…</p>
              </div>
            {:else if activeSectionView}
              {@const section = activeSectionView}
              {@const hasInlineHighlight = visibleBlocks.some(
                (b) => b.hasHighlight || b.parts?.some((p) => p.type === 'mark'),
              )}
              {@const hasHighlight =
                hasInlineHighlight ||
                (effectiveHighlightRange &&
                  effectiveHighlightRange.start >= section.charStart &&
                  effectiveHighlightRange.start < section.charEnd)}
              <article class="document mx-auto max-w-[820px] px-6 py-6 pb-12 md:px-8">
                <div class="mb-8 flex items-center gap-4 border-b-2 pb-6">
                  <CompanyLogo ticker={ticker} size={56} filing={meta} />
                  <div>
                    <h1 class="text-foreground m-0 text-2xl font-bold tracking-tight">{meta?.name ?? brand.name}</h1>
                    <p class="text-muted-foreground mt-1 text-sm">
                      {meta?.filing?.form ?? 'SEC Filing'}
                      {#if meta?.filing?.reportDate}
                        · fiscal year ended {meta.filing.reportDate}
                      {/if}
                    </p>
                  </div>
                </div>

                <section
                  id="section-{section.id}"
                  class="doc-section mb-10 scroll-mt-4"
                  class:active={activeSectionId === section.id}
                  class:has-highlight={hasHighlight}
                >
                  <header class="section-header mb-5 border-l-3 pl-4">
                    <span class="text-primary mb-1 block text-xs font-semibold tracking-wide uppercase">
                      {section.item ? `Item ${section.item}` : section.title}
                    </span>
                    <h2 class="text-foreground m-0 text-xl font-bold">{section.title}</h2>
                  </header>

                  <div class="section-body">
                    {#each visibleBlocks as block}
                      {#if block.type === 'subheader'}
                        <h3 class="subheader">{block.text}</h3>
                      {:else}
                        <p class:highlight-para={block.hasHighlight}>
                          {#each block.parts as part}
                            {#if part.type === 'mark'}
                              <mark class="evidence-highlight">{part.text}</mark>
                            {:else}
                              {part.text}
                            {/if}
                          {/each}
                        </p>
                      {/if}
                    {/each}
                    {#if hiddenBlockCount}
                      <Button
                        variant="outline"
                        size="sm"
                        class="mt-4"
                        onclick={() => { blocksLimit += BLOCKS_PAGE; }}
                      >
                        Show more ({hiddenBlockCount} paragraphs remaining)
                      </Button>
                    {/if}
                  </div>
                </section>
              </article>
            {/if}
          </div>
        </div>
      </div>
    {/if}
  </Dialog.Content>
  {/if}
</Dialog.Root>

<style>
  :global([data-slot='dialog-overlay']) {
    animation-duration: 0ms !important;
  }

  :global(.filing-dialog) {
    animation-duration: 0ms !important;
  }

  .section-header {
    border-left-color: var(--border);
  }

  .doc-section.active .section-header,
  .doc-section.has-highlight .section-header {
    border-left-color: var(--accent);
  }

  .section-body {
    font-family: Georgia, 'Times New Roman', serif;
    font-size: 0.95rem;
    line-height: 1.75;
    color: var(--muted-foreground);
  }

  .section-body p {
    margin: 0 0 1rem;
    text-align: justify;
    hyphens: auto;
    content-visibility: auto;
    contain-intrinsic-size: auto 2.5rem;
  }

  .subheader {
    font-family: system-ui, sans-serif;
    font-size: 0.82rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.04em;
    color: var(--foreground);
    margin: 1.75rem 0 0.75rem;
    padding-top: 0.5rem;
    border-top: 1px solid var(--border);
  }

  .highlight-para {
    background: rgba(118, 185, 0, 0.1);
    border-radius: 6px;
    padding: 0.5rem 0.65rem;
    margin-left: -0.65rem;
    margin-right: -0.65rem;
    border-left: 3px solid var(--accent);
  }

  mark.evidence-highlight {
    background: rgba(118, 185, 0, 0.55);
    color: var(--foreground);
    padding: 0.12em 0.08em;
    border-radius: 3px;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
    font-weight: 600;
  }
</style>
