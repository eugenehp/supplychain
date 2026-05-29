<script>
  import {
    logoMetaForTopic,
    logoMetaForNode,
    logoMetaForSlug,
    logoSlugForTopic,
    logoSlugForNode,
  } from './logo-resolver.js';

  /**
   * @type {{
   *   slug?: string | null,
   *   ticker?: string | null,
   *   topicMeta?: object | null,
   *   vendor?: string | null,
   *   size?: number,
   *   showName?: boolean,
   *   alt?: string | null,
   * }}
   */
  let {
    slug = null,
    ticker = null,
    topicMeta = null,
    vendor = null,
    size = 24,
    showName = false,
    alt = null,
  } = $props();

  const meta = $derived.by(() => {
    if (topicMeta) return logoMetaForTopic(topicMeta);
    if (ticker) return logoMetaForSlug(ticker);
    if (slug) return logoMetaForSlug(slug);
    if (vendor) return logoMetaForNode(vendor);
    return null;
  });

  const resolvedSlug = $derived(
    ticker?.toUpperCase() ??
      slug?.toUpperCase() ??
      logoSlugForTopic(topicMeta) ??
      logoSlugForNode(vendor),
  );

  let stage = $state(/** @type {'primary' | 'fallback' | 'initials'} */ ('primary'));

  $effect(() => {
    resolvedSlug;
    topicMeta;
    ticker;
    vendor;
    slug;
    stage = 'primary';
  });

  const src = $derived(
    meta?.type === 'image' && stage !== 'initials'
      ? stage === 'fallback'
        ? meta.fallback
        : meta.primary
      : null,
  );

  function onError() {
    if (stage === 'primary' && meta?.fallback && meta.fallback !== meta.primary) {
      stage = 'fallback';
    } else {
      stage = 'initials';
    }
  }

  const label = $derived(alt ?? meta?.name ?? resolvedSlug ?? 'Company');
</script>

<div class="brand-logo-wrap" style:--logo-size="{size}px">
  {#if src && meta?.type === 'image' && stage !== 'initials'}
    <img
      class="brand-logo"
      class:png={src.endsWith('.png')}
      {src}
      alt="{label} logo"
      width={size}
      height={size}
      loading="lazy"
      decoding="async"
      onerror={onError}
    />
  {:else if meta}
    <span class="fallback" style:background={meta.bg} style:color={meta.color}>
      {meta.initials}
    </span>
  {/if}
  {#if showName && meta?.name}
    <span class="name">{meta.name}</span>
  {/if}
</div>

<style>
  .brand-logo-wrap {
    display: inline-flex;
    flex-shrink: 0;
    align-items: center;
    gap: 0.5rem;
  }

  .brand-logo,
  .fallback {
    width: var(--logo-size);
    height: var(--logo-size);
    border-radius: 8px;
    object-fit: contain;
    background: transparent;
    box-sizing: border-box;
  }

  .brand-logo.png {
    mix-blend-mode: multiply;
  }

  :global(.dark) .brand-logo {
    background: #fff;
    padding: 2px;
  }

  :global(.dark) .brand-logo.png {
    mix-blend-mode: normal;
    filter: none;
  }

  .fallback {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: calc(var(--logo-size) * 0.36);
    font-weight: 700;
    letter-spacing: -0.02em;
  }

  .name {
    font-size: 0.85rem;
    color: var(--text-subtle);
  }
</style>
