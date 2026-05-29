/** Site-wide metadata for footer, titles, exports, etc. */
export const SITE_AUTHOR = 'Eugene Hauptmann';

export const SITE_AUTHOR_LINKEDIN = 'https://www.linkedin.com/in/eugenehp/';

export const SITE_PRODUCT_NAME = 'Supply Chain Intelligence';

export const SITE_GITHUB_URL = 'https://github.com/eugenehp/supplychain';

export function copyrightYear(date = new Date()) {
  return date.getFullYear();
}
