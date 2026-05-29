import { brandThemeTokens, DEFAULT_BRAND_COLOR } from './brand-theme.js';

/** Light-theme tokens for the off-screen PDF export staging node only. */
export const PDF_EXPORT_BACKGROUND = 'transparent';

const EXPORT_SANDBOX_BASE = `
  color-scheme: light;
  --bg: #ffffff;
  --surface: #ffffff;
  --surface-2: #eef1f6;
  --surface-3: #e4e8ef;
  --surface-solid: #ffffff;
  --surface-elevated: #f8f9fb;
  --border: rgba(0, 0, 0, 0.1);
  --text: #1a1f2e;
  --text-muted: #5c6578;
  --text-subtle: #8892a4;
  --link: #2563eb;
  --error: #dc2626;
  --chart-bg: transparent;
  --node-label: #1a1f2e;
  --tier-label: #8892a4;
  --popover: #ffffff;
  --popover-foreground: #1a1f2e;
  --card: #ffffff;
  --background: #ffffff;
  --foreground: #1a1f2e;
  --border-ui: oklch(0.922 0 0);
  --muted-foreground: #8892a4;
  --map-graticule: rgba(0, 0, 0, 0.08);
  --map-land: rgba(0, 0, 0, 0.04);
  --map-border: rgba(0, 0, 0, 0.12);
  --map-marker-text: #1a1f2e;
  background: transparent;
  color: #1a1f2e;
  font-family: 'IBM Plex Sans', system-ui, sans-serif;
`;

/** @param {string} [brandColor] */
export function buildExportSandboxThemeCss(brandColor = DEFAULT_BRAND_COLOR) {
  const tokens = brandThemeTokens({ color: brandColor }, { dark: false });
  const brandVars = tokens
    ? Object.entries(tokens)
        .map(([key, value]) => `  ${key}: ${value};`)
        .join('\n')
    : '';

  return `.pdf-export-sandbox {\n${EXPORT_SANDBOX_BASE}\n${brandVars}\n}`;
}

/** @deprecated use buildExportSandboxThemeCss(readBrandColor()) */
export const EXPORT_SANDBOX_THEME_CSS = buildExportSandboxThemeCss();
