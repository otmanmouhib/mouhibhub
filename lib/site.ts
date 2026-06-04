import { getDb } from './mongodb';

export const supportedSites = ['atlanticdunes', 'adrobiofarm'] as const;
export type SiteName = (typeof supportedSites)[number];

export function isSupportedSite(site: string): site is SiteName {
  return supportedSites.includes(site as SiteName);
}

export async function getSiteDb(site: string) {
  if (!isSupportedSite(site)) {
    throw new Error(`Unsupported site: ${site}`);
  }

  return getDb(site);
}
