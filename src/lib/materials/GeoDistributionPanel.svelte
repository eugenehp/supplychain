<script>
  import * as Card from '$lib/components/ui/card/index.js';
  import * as Tabs from '$lib/components/ui/tabs/index.js';
  import * as Select from '$lib/components/ui/select/index.js';
  import { Label } from '$lib/components/ui/label/index.js';

  /** @type {{ geography: object | null, productionGeography?: object | null, strategicProjects?: object | null, tradeGeography?: object | null, usgsHistorical?: object | null, chinaPolicy?: object | null, myanmarSupply?: object | null, selectedSymbol?: string | null, onElementSelect?: (sym: string) => void }} */
  let {
    geography = null,
    productionGeography = null,
    strategicProjects = null,
    tradeGeography = null,
    usgsHistorical = null,
    chinaPolicy = null,
    myanmarSupply = null,
    selectedSymbol = $bindable(null),
    onElementSelect,
  } = $props();

  let view = $state('by-element');
  let selectedCountry = $state(/** @type {string | null} */ (null));

  const byElement = $derived(geography?.byElement ?? []);
  const byCountry = $derived(geography?.byCountry ?? []);
  const matrix = $derived(geography?.matrix ?? null);

  const activeElement = $derived(
    byElement.find((e) => e.symbol === selectedSymbol) ?? byElement[0] ?? null,
  );

  let viewInitialized = false;

  $effect(() => {
    if (!selectedCountry && byCountry.length) selectedCountry = byCountry[0].code;
  });

  $effect(() => {
    if (viewInitialized) return;
    if (!hasSecGeo && hasProduction) view = 'production';
    else if (!hasSecGeo && !hasProduction && hasStrategic) view = 'strategic';
    if (hasSecGeo || hasProduction || hasStrategic) viewInitialized = true;
  });

  const activeCountry = $derived(byCountry.find((c) => c.code === selectedCountry) ?? byCountry[0] ?? null);

  const production = $derived(productionGeography?.byCountry ?? []);
  const strategicByCountry = $derived(strategicProjects?.byCountry ?? []);
  const tradeByReporter = $derived(tradeGeography?.byReporter ?? []);
  const tradeFlows = $derived(tradeGeography?.topFlows ?? []);
  const priceSeries = $derived(usgsHistorical?.prices ?? []);
  const productionSeries = $derived(usgsHistorical?.production ?? []);
  const hasProduction = $derived(production.length > 0);
  const hasStrategic = $derived(strategicByCountry.length > 0);
  const hasSecGeo = $derived(byElement.length > 0);
  const hasTrade = $derived(tradeByReporter.length > 0 || tradeFlows.length > 0);
  const hasPrices = $derived(priceSeries.length > 0);
  const hasPolicy = $derived((chinaPolicy?.events?.length ?? 0) > 0 || Boolean(myanmarSupply?.countryCode));
  const canCompare = $derived(hasSecGeo && hasProduction && byElement.length > 0);

  const maxCompareSec = $derived(
    Math.max(1, ...(activeElement?.countries?.map((c) => c.share) ?? [1])),
  );
  const maxCompareProd = $derived(Math.max(1, ...(production.map((c) => c.share ?? 0) ?? [1])));

  const maxMatrix = $derived(
    matrix?.values?.length
      ? Math.max(1, ...matrix.values.flat())
      : 1,
  );

  /** @param {number} value */
  function cellOpacity(value) {
    if (!value) return 0.06;
    return 0.12 + (value / maxMatrix) * 0.88;
  }
</script>

{#if hasSecGeo || hasProduction || hasStrategic || hasTrade || hasPrices || hasPolicy}
  <section id="geo-distribution" class="ui-section" aria-label="Geography distribution">
    <h2 class="text-foreground mb-2 text-lg font-semibold">Geography distribution</h2>
    <p class="text-muted-foreground mb-4 max-w-[720px] text-sm leading-relaxed">
      {#if view === 'production' && productionGeography?.methodology}
        {productionGeography.methodology}
      {:else if view === 'strategic' && strategicProjects?.methodology}
        {strategicProjects.methodology}
      {:else if view === 'trade' && tradeGeography?.methodology}
        {tradeGeography.methodology}
      {:else if view === 'prices' && usgsHistorical?.source}
        {usgsHistorical.source} — {usgsHistorical.unit?.prices ?? 'USD/kg oxides'}.
      {:else if view === 'policy'}
        China MOFCOM/MIIT milestones and Myanmar heavy-REE supply context (curated from public commodity reports).
      {:else}
        {geography?.methodology ??
          'Country attribution from SEC excerpt co-occurrence — where each element and geography are named in the same filing passage. Not production share.'}
      {/if}
    </p>

    <div class="bg-muted/40 mb-4 grid gap-2 rounded-lg border p-3 text-xs sm:grid-cols-2 lg:grid-cols-4">
      <div>
        <span class="text-foreground font-semibold">SEC co-occurrence</span>
        <p class="text-muted-foreground m-0 mt-0.5 leading-snug">Where filers name an element and country in the same excerpt. Disclosure language, not mine output.</p>
      </div>
      <div>
        <span class="text-foreground font-semibold">USGS production</span>
        <p class="text-muted-foreground m-0 mt-0.5 leading-snug">Estimated mine production (t REO) by country from Mineral Commodity Summaries.</p>
      </div>
      <div>
        <span class="text-foreground font-semibold">Trade (Comtrade)</span>
        <p class="text-muted-foreground m-0 mt-0.5 leading-snug">Reported oxide/compound flows (HS codes) — midstream trade, not geology.</p>
      </div>
      <div>
        <span class="text-foreground font-semibold">EU strategic</span>
        <p class="text-muted-foreground m-0 mt-0.5 leading-snug">CRMA-designated projects — policy priority, not operating capacity.</p>
      </div>
    </div>

    <Tabs.Root bind:value={view}>
      <Tabs.List class="mb-4 flex-wrap">
        {#if canCompare}
          <Tabs.Trigger value="compare">Compare modes</Tabs.Trigger>
        {/if}
        {#if hasSecGeo}
          <Tabs.Trigger value="by-element">By element</Tabs.Trigger>
          <Tabs.Trigger value="by-country">By country</Tabs.Trigger>
          <Tabs.Trigger value="matrix">Matrix</Tabs.Trigger>
        {/if}
        {#if hasProduction}
          <Tabs.Trigger value="production">USGS production</Tabs.Trigger>
        {/if}
        {#if hasStrategic}
          <Tabs.Trigger value="strategic">EU strategic</Tabs.Trigger>
        {/if}
        {#if hasTrade}
          <Tabs.Trigger value="trade">Trade (Comtrade)</Tabs.Trigger>
        {/if}
        {#if hasPrices}
          <Tabs.Trigger value="prices">USGS prices</Tabs.Trigger>
        {/if}
        {#if hasPolicy}
          <Tabs.Trigger value="policy">Policy & Myanmar</Tabs.Trigger>
        {/if}
      </Tabs.List>

      <Tabs.Content value="compare" class="mt-0">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <Label for="compare-element" class="text-muted-foreground text-xs uppercase tracking-wide">Element</Label>
          <Select.Root
            type="single"
            value={selectedSymbol ?? activeElement?.symbol}
            onValueChange={(v) => {
              if (v) {
                selectedSymbol = v;
                onElementSelect?.(v);
              }
            }}
          >
            <Select.Trigger id="compare-element" class="min-w-[200px]">
              {activeElement ? `${activeElement.symbol} — ${activeElement.name}` : 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each byElement as el (el.symbol)}
                <Select.Item value={el.symbol} label="{el.symbol} — {el.name}">
                  {el.symbol} — {el.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        <div class="grid gap-4 lg:grid-cols-2">
          <div class="rounded-lg border p-4">
            <h3 class="text-foreground mb-1 text-sm font-semibold">SEC filing co-occurrence</h3>
            <p class="text-muted-foreground mb-3 text-[11px]">Top countries in excerpts mentioning {activeElement?.symbol ?? 'element'}</p>
            {#if activeElement?.countries?.length}
              <ul class="space-y-2">
                {#each activeElement.countries.slice(0, 8) as country (country.code)}
                  <li>
                    <div class="mb-1 flex justify-between text-xs">
                      <span>{country.flag} {country.name}</span>
                      <span class="tabular-nums">{country.share}%</span>
                    </div>
                    <div class="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div class="bg-primary h-full rounded-full" style:width="{(country.share / maxCompareSec) * 100}%"></div>
                    </div>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-muted-foreground text-sm">No SEC geography for this element.</p>
            {/if}
          </div>

          <div class="rounded-lg border p-4">
            <h3 class="text-foreground mb-1 text-sm font-semibold">USGS mine production (all REE)</h3>
            <p class="text-muted-foreground mb-3 text-[11px]">Country output shares — element-specific splits rarely disclosed</p>
            {#if production.length}
              <ul class="space-y-2">
                {#each production.slice(0, 8) as country (country.code)}
                  <li>
                    <div class="mb-1 flex justify-between text-xs">
                      <span>{country.flag} {country.name}</span>
                      <span class="tabular-nums">{country.share ?? 0}%</span>
                    </div>
                    <div class="bg-muted h-1.5 overflow-hidden rounded-full">
                      <div
                        class="h-full rounded-full"
                        style:width="{((country.share ?? 0) / maxCompareProd) * 100}%"
                        style:background="var(--map-flow, var(--primary))"
                      ></div>
                    </div>
                  </li>
                {/each}
              </ul>
            {:else}
              <p class="text-muted-foreground text-sm">Production data unavailable.</p>
            {/if}
          </div>
        </div>
        <p class="text-muted-foreground mt-3 text-[11px]">
          Large gaps between panels are normal: OEM filings over-index China risk language while USGS reflects physical mine output.
        </p>
      </Tabs.Content>

      <Tabs.Content value="by-element" class="mt-0">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <Label for="geo-element-select" class="text-muted-foreground text-xs uppercase tracking-wide">Element</Label>
          <Select.Root
            type="single"
            value={selectedSymbol ?? activeElement?.symbol}
            onValueChange={(v) => {
              if (v) {
                selectedSymbol = v;
                onElementSelect?.(v);
              }
            }}
          >
            <Select.Trigger id="geo-element-select" class="min-w-[200px]">
              {activeElement ? `${activeElement.symbol} — ${activeElement.name}` : 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each byElement as el (el.symbol)}
                <Select.Item value={el.symbol} label="{el.symbol} — {el.name}">
                  {el.symbol} — {el.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        {#if activeElement?.countries?.length}
          <ul class="space-y-3">
            {#each activeElement.countries as country (country.code)}
              <li>
                <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-foreground text-sm font-medium">
                    {country.flag} {country.name}
                    <span class="text-muted-foreground ml-1 font-normal">({country.code})</span>
                  </span>
                  <span class="text-muted-foreground text-xs tabular-nums">
                    {country.mentions} hits · {country.share}%
                  </span>
                </div>
                <div class="bg-muted h-2 overflow-hidden rounded-full" role="presentation">
                  <div
                    class="bg-primary h-full rounded-full transition-[width] duration-500"
                    style:width="{Math.min(100, country.share)}%"
                  ></div>
                </div>
                {#if country.tickers?.length}
                  <p class="text-muted-foreground mt-1 m-0 text-[10px]">Filers: {country.tickers.join(', ')}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-muted-foreground text-sm">No geography tokens co-occur with {activeElement?.name} in indexed excerpts.</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="by-country" class="mt-0">
        <div class="mb-4 flex flex-wrap items-center gap-3">
          <Label for="geo-country-select" class="text-muted-foreground text-xs uppercase tracking-wide">Country</Label>
          <Select.Root
            type="single"
            value={selectedCountry ?? activeCountry?.code}
            onValueChange={(v) => {
              if (v) selectedCountry = v;
            }}
          >
            <Select.Trigger id="geo-country-select" class="min-w-[220px]">
              {activeCountry ? `${activeCountry.flag} ${activeCountry.name}` : 'Select'}
            </Select.Trigger>
            <Select.Content>
              {#each byCountry as c (c.code)}
                <Select.Item value={c.code} label={c.name}>
                  {c.flag} {c.name}
                </Select.Item>
              {/each}
            </Select.Content>
          </Select.Root>
        </div>

        {#if activeCountry?.elements?.length}
          <p class="text-muted-foreground mb-3 text-xs">
            {activeCountry.geoHits} geography co-mentions · {activeCountry.elementCount} elements
          </p>
          <ul class="space-y-3">
            {#each activeCountry.elements as el (el.symbol)}
              <li>
                <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    class="text-foreground hover:text-primary text-sm font-medium underline-offset-2 hover:underline"
                    onclick={() => {
                      selectedSymbol = el.symbol;
                      onElementSelect?.(el.symbol);
                      view = 'by-element';
                    }}
                  >
                    <span class="font-mono">{el.symbol}</span> — {el.name}
                  </button>
                  <span class="text-muted-foreground text-xs tabular-nums">
                    {el.mentions} hits · {el.share}%
                  </span>
                </div>
                <div class="bg-muted h-2 overflow-hidden rounded-full" role="presentation">
                  <div
                    class="h-full rounded-full transition-[width] duration-500"
                    style:width="{Math.min(100, el.share)}%"
                    style:background="var(--map-flow, var(--primary))"
                  ></div>
                </div>
                {#if el.tickers?.length}
                  <p class="text-muted-foreground mt-1 m-0 text-[10px]">Filers: {el.tickers.join(', ')}</p>
                {/if}
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-muted-foreground text-sm">No element co-mentions for this country.</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="matrix" class="mt-0">
        {#if matrix?.elements?.length && matrix?.countries?.length}
          <div class="overflow-x-auto rounded-lg border">
            <table class="geo-matrix w-full min-w-[32rem] border-collapse text-xs">
              <thead>
                <tr>
                  <th class="bg-muted/60 text-muted-foreground sticky left-0 z-10 px-2 py-2 text-left font-semibold"
                    >Element</th
                  >
                  {#each matrix.countries as code}
                    {@const c = byCountry.find((x) => x.code === code)}
                    <th class="bg-muted/40 px-1 py-2 text-center font-medium" title={c?.name ?? code}>
                      <span class="block text-base leading-none">{c?.flag ?? ''}</span>
                      <span class="text-muted-foreground text-[9px]">{code}</span>
                    </th>
                  {/each}
                </tr>
              </thead>
              <tbody>
                {#each matrix.elements as sym, ri}
                  {@const row = matrix.values[ri]}
                  {@const elMeta = byElement.find((e) => e.symbol === sym)}
                  <tr>
                    <th
                      class="bg-background sticky left-0 z-10 border-t px-2 py-1.5 text-left font-mono font-semibold whitespace-nowrap"
                      title={elMeta?.name}
                    >
                      <button
                        type="button"
                        class="hover:text-primary"
                        onclick={() => {
                          selectedSymbol = sym;
                          onElementSelect?.(sym);
                        }}>{sym}</button
                      >
                    </th>
                    {#each row as val, ci}
                      {@const code = matrix.countries[ci]}
                      <td
                        class="border-t px-1 py-1.5 text-center tabular-nums"
                        title="{sym} × {code}: {val}"
                        style:background="color-mix(in srgb, var(--primary) {cellOpacity(val) * 100}%, transparent)"
                      >
                        {val > 0 ? val : '·'}
                      </td>
                    {/each}
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          <p class="text-muted-foreground mt-2 text-[10px]">Cell value = geography token hits in element excerpt windows</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="production" class="mt-0">
        {#if production.length}
          <p class="text-muted-foreground mb-3 text-xs">
            World mine production {productionGeography?.year ?? ''} (est.):
            {productionGeography?.worldTotalMt?.toLocaleString() ?? '—'} {productionGeography?.unit ?? 't REO'}
          </p>
          <ul class="space-y-3">
            {#each production as country (country.code)}
              <li>
                <div class="mb-1 flex flex-wrap items-center justify-between gap-2">
                  <span class="text-foreground text-sm font-medium">
                    {country.flag} {country.name}
                    <span class="text-muted-foreground ml-1 font-normal">({country.code})</span>
                  </span>
                  <span class="text-muted-foreground text-xs tabular-nums">
                    {country.productionMt?.toLocaleString() ?? '—'} t · {country.share ?? '—'}%
                    {#if country.reservesMt}
                      · {country.reservesMt.toLocaleString()} t reserves
                    {/if}
                  </span>
                </div>
                <div class="bg-muted h-2 overflow-hidden rounded-full" role="presentation">
                  <div
                    class="h-full rounded-full transition-[width] duration-500"
                    style:width="{Math.min(100, country.share ?? 0)}%"
                    style:background="var(--map-flow, var(--primary))"
                  ></div>
                </div>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-muted-foreground text-sm">USGS production data not available.</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="strategic" class="mt-0">
        {#if strategicByCountry.length}
          <p class="text-muted-foreground mb-3 text-xs">
            {strategicProjects?.summary?.projectCount ?? 0} EU CRMA strategic projects across
            {strategicProjects?.summary?.countryCount ?? 0} countries ({strategicProjects?.summary?.euScope ?? 0} EU-scope,
            {strategicProjects?.summary?.nonEuScope ?? 0} non-EU)
          </p>
          <ul class="space-y-4">
            {#each strategicByCountry as country (country.code)}
              <li>
                <h3 class="text-foreground mb-2 text-sm font-medium">
                  {country.flag} {country.name} — {country.projectCount} project{country.projectCount === 1 ? '' : 's'}
                </h3>
                <ul class="space-y-2 pl-1">
                  {#each country.projects as project (project.id)}
                    <li class="text-sm">
                      <span class="text-foreground font-medium">{project.name}</span>
                      <span class="text-muted-foreground"> · {project.promoter} · {project.type}</span>
                      {#if project.materials?.length}
                        <span class="text-muted-foreground text-xs"> · {project.materials.join(', ')}</span>
                      {/if}
                    </li>
                  {/each}
                </ul>
              </li>
            {/each}
          </ul>
        {:else}
          <p class="text-muted-foreground text-sm">EU strategic project data not available.</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="trade" class="mt-0">
        {#if tradeByReporter.length}
          <p class="text-muted-foreground mb-3 text-xs">
            UN Comtrade HS 280530 / 284610 / 284690 — {tradeGeography?.year ?? ''} ({tradeGeography?.unit ?? 'USD millions'})
          </p>
          <h3 class="text-foreground mb-2 text-sm font-medium">Top reporters</h3>
          <ul class="mb-4 space-y-2">
            {#each tradeByReporter as row (row.code)}
              <li class="text-sm">
                <span class="font-medium">{row.flag} {row.name}</span>
                <span class="text-muted-foreground"> — exports ${row.exportUsdM?.toLocaleString() ?? 0}M · imports ${row.importUsdM?.toLocaleString() ?? 0}M</span>
              </li>
            {/each}
          </ul>
        {/if}
        {#if tradeFlows.length}
          <h3 class="text-foreground mb-2 text-sm font-medium">Top bilateral flows</h3>
          <ul class="space-y-2">
            {#each tradeFlows as flow (`${flow.reporterCode}-${flow.partnerCode}-${flow.hsCode}`)}
              <li class="text-sm">
                <span class="font-medium">{flow.reporter}</span>
                <span class="text-muted-foreground"> → {flow.partner} · HS {flow.hsCode} · ${flow.valueUsdM}M</span>
              </li>
            {/each}
          </ul>
        {:else if !tradeByReporter.length}
          <p class="text-muted-foreground text-sm">Trade data not available — run npm run rag to load Comtrade seed.</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="prices" class="mt-0">
        {#if priceSeries.length}
          <div class="overflow-x-auto rounded-lg border">
            <table class="w-full min-w-[28rem] border-collapse text-xs">
              <thead>
                <tr class="bg-muted/50">
                  <th class="px-2 py-2 text-left">Year</th>
                  <th class="px-2 py-2 text-right">CeO₂ $/kg</th>
                  <th class="px-2 py-2 text-right">Nd₂O₃ $/kg</th>
                  <th class="px-2 py-2 text-right">Dy₂O₃ $/kg</th>
                  <th class="px-2 py-2 text-right">TbO₂ $/kg</th>
                </tr>
              </thead>
              <tbody>
                {#each priceSeries as row (row.year)}
                  <tr class="border-t">
                    <td class="px-2 py-1.5 font-mono">{row.year}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{row.CeO2UsdPerKg ?? '—'}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{row.Nd2O3UsdPerKg ?? '—'}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{row.Dy2O3UsdPerKg ?? '—'}</td>
                    <td class="px-2 py-1.5 text-right tabular-nums">{row.TbO2UsdPerKg ?? '—'}</td>
                  </tr>
                {/each}
              </tbody>
            </table>
          </div>
          {#if productionSeries.length}
            <p class="text-muted-foreground mt-3 text-xs">
              US production span {productionSeries[0]?.year}–{productionSeries[productionSeries.length - 1]?.year} from MCS salient CSV.
            </p>
          {/if}
        {:else}
          <p class="text-muted-foreground text-sm">USGS price series not available.</p>
        {/if}
      </Tabs.Content>

      <Tabs.Content value="policy" class="mt-0">
        {#if chinaPolicy?.events?.length}
          <h3 class="text-foreground mb-2 text-sm font-medium">China export quotas & controls</h3>
          <ul class="mb-4 space-y-3">
            {#each chinaPolicy.events as ev (ev.id)}
              <li class="text-sm">
                <span class="font-medium">{ev.year} · {ev.title}</span>
                <p class="text-muted-foreground mt-1 m-0 leading-snug">{ev.summary}</p>
              </li>
            {/each}
          </ul>
        {/if}
        {#if myanmarSupply}
          <h3 class="text-foreground mb-2 text-sm font-medium">{myanmarSupply.flag} {myanmarSupply.countryName} heavy REE</h3>
          <p class="text-muted-foreground text-sm leading-relaxed">{myanmarSupply.role}</p>
          <p class="text-muted-foreground mt-2 text-sm">{myanmarSupply.estimatedShareOfHeavyRee}</p>
          {#if myanmarSupply.elements?.length}
            <p class="text-foreground mt-2 text-xs">Elements: {myanmarSupply.elements.join(', ')}</p>
          {/if}
          {#if myanmarSupply.risks?.length}
            <ul class="text-muted-foreground mt-2 list-disc space-y-1 pl-5 text-xs">
              {#each myanmarSupply.risks as risk}
                <li>{risk}</li>
              {/each}
            </ul>
          {/if}
        {/if}
      </Tabs.Content>
    </Tabs.Root>
  </section>
{/if}

<style>
  .geo-matrix th,
  .geo-matrix td {
    border-color: color-mix(in srgb, var(--border) 80%, transparent);
  }
</style>
