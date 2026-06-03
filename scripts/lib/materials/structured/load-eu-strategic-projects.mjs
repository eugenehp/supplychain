import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { PATHS } from '../../paths.mjs';
import { countryMeta } from '../geo-resolve.mjs';

const PROJECTS_PATH = join(PATHS.materialsStructured, 'eu-crma-strategic-projects.json');

export function loadEuStrategicProjects() {
  if (!existsSync(PROJECTS_PATH)) {
    return { projects: [], byCountry: [], summary: { projectCount: 0 } };
  }
  const raw = JSON.parse(readFileSync(PROJECTS_PATH, 'utf8'));
  const projects = (raw.projects ?? []).map((p) => ({
    ...p,
    ...countryMeta(p.countryCode),
    flag: countryMeta(p.countryCode).flag,
  }));

  const byCountryMap = new Map();
  for (const p of projects) {
    if (!byCountryMap.has(p.countryCode)) {
      byCountryMap.set(p.countryCode, {
        ...countryMeta(p.countryCode),
        projects: [],
        projectCount: 0,
      });
    }
    const bucket = byCountryMap.get(p.countryCode);
    bucket.projects.push({
      id: p.id,
      name: p.name,
      promoter: p.promoter,
      type: p.type,
      status: p.status,
      materials: p.materials,
      scope: p.scope,
    });
    bucket.projectCount += 1;
  }

  const byCountry = [...byCountryMap.values()].sort((a, b) => b.projectCount - a.projectCount);

  return {
    ...raw,
    projects,
    byCountry,
    summary: {
      projectCount: projects.length,
      countryCount: byCountry.length,
      euScope: projects.filter((p) => p.scope === 'EU').length,
      nonEuScope: projects.filter((p) => p.scope === 'non-EU').length,
      withCoordinates: projects.filter((p) => p.lat != null && p.lon != null).length,
    },
    methodology:
      'EU CRMA strategic projects (Commission decisions March–June 2025). Distinct from USGS production shares and SEC excerpt co-occurrence.',
  };
}

/** Map-ready sites from strategic projects with coordinates. */
export function strategicProjectsToMapSites(projectsPayload) {
  return (projectsPayload?.projects ?? [])
    .filter((p) => p.lat != null && p.lon != null)
    .map((p) => ({
      id: p.id,
      name: p.name,
      lat: p.lat,
      lon: p.lon,
      countryCode: p.countryCode,
      countryName: p.countryName,
      flag: p.flag,
      status: 'development',
      operators: [p.promoter],
      elements: p.materials ?? ['REE'],
      notes: `EU CRMA strategic project (${p.type}); ${p.notes ?? ''}`.trim(),
      source: 'EU-CRMA-strategic',
      secMentions: 0,
    }));
}
