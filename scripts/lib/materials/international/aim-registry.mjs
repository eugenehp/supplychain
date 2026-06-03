/** AIM / LSE and other non-ASX international REE issuers. */

/** @type {import('./registry.mjs').InternationalMiner[]} */
export const AIM_LSE_MINERS = [
  {
    id: 'PRE',
    name: 'Pensana',
    localTicker: 'PRE.L',
    listingRegime: 'AIM',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    role: 'developer',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb'],
    flagshipSites: ['Longonjo, Angola', 'Saltend, UK'],
    secCounterpart: '20-F',
    homeFormLabel: 'Annual Report (UK)',
    filingSources: [
      {
        type: 'pdf',
        url: 'https://pensana.co.uk/wp-content/uploads/2024/10/Pensana_Integrated-Annual-Report-2024.pdf',
        label: 'FY2024 Integrated Annual Report',
        referer: 'https://pensana.co.uk/',
      },
    ],
  },
  {
    id: 'RBW',
    name: 'Rainbow Rare Earths',
    localTicker: 'RBW.L',
    listingRegime: 'AIM',
    countryCode: 'GB',
    countryName: 'United Kingdom',
    flag: '🇬🇧',
    role: 'developer',
    primaryElements: ['Nd', 'Pr', 'Dy', 'Tb'],
    flagshipSites: ['Phalaborwa, South Africa', 'Burundi Gakara'],
    secCounterpart: '20-F',
    homeFormLabel: 'Annual Report (UK)',
    filingSources: [
      {
        type: 'pdf',
        url: 'https://www.rainbowrareearths.com/wp-content/uploads/2024/10/RRE-2024-Annual-Report_Final-1.pdf',
        label: 'FY2024 Annual Report',
        referer: 'https://www.rainbowrareearths.com/',
      },
    ],
  },
];
