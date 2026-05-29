<script>
  import { onMount } from 'svelte';
  import { exportChartToPdf, preloadPdfFontsForExport } from './chart-export.js';
  import { buildExportWatermark } from './watermark.ts';
  import { Button } from '$lib/components/ui/button/index.js';
  import { Alert, AlertDescription } from '$lib/components/ui/alert/index.js';
  import LoadingSpinner from './LoadingSpinner.svelte';

  /**
   * @type {{
   *   target?: HTMLElement | null,
   *   title?: string,
   *   viewLabel?: string,
   *   watermark?: import('./watermark.ts').WatermarkText,
   *   disabled?: boolean,
   * }}
   */
  let {
    target = null,
    title = 'Supply chain chart',
    viewLabel = 'Chart',
    watermark = undefined,
    disabled = false,
  } = $props();

  const watermarkText = $derived(watermark ?? buildExportWatermark(title));

  let exporting = $state(false);
  let error = $state('');

  onMount(() => {
    preloadPdfFontsForExport().catch(() => {});
  });

  async function handleExport() {
    if (exporting || disabled || !target) return;
    exporting = true;
    error = '';
    try {
      await exportChartToPdf(target, {
        title,
        viewLabel,
        watermark: watermarkText,
      });
    } catch (err) {
      error = err instanceof Error ? err.message : 'Export failed';
    } finally {
      exporting = false;
    }
  }
</script>

<div class="flex flex-col items-end gap-1">
  <Button
    variant="outline"
    size="sm"
    onclick={handleExport}
    disabled={disabled || exporting || !target}
    aria-busy={exporting}
    title="Download current chart as PDF with watermark"
  >
    {#if exporting}
      <LoadingSpinner />
    {/if}
    {exporting ? 'Exporting…' : 'Export PDF'}
  </Button>
  {#if error}
    <Alert variant="destructive" class="max-w-56 py-2">
      <AlertDescription class="text-xs">{error}</AlertDescription>
    </Alert>
  {/if}
</div>
