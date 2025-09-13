import { expandContractorTagsToTukang } from './crosswalk';

export function canonicalSlug(s: string) {
  return s.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
}

export function buildSearchIndex(params: {
  vendorKind: 'tukang'|'kontraktor';
  skills: string[];
  subskills: string[];
  contractorTags?: string[];
}) {
  const base = new Set<string>();
  params.skills.forEach(s => base.add(canonicalSlug(s)));
  params.subskills.forEach(s => base.add(canonicalSlug(s)));

  if (params.vendorKind === 'kontraktor' && params.contractorTags?.length) {
    expandContractorTagsToTukang(
      params.contractorTags.map(canonicalSlug)
    ).forEach(t => base.add(t));
  }
  return [...base];
}
