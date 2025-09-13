export const CROSSWALK_CONTRACTOR_TO_TUKANG: Record<string, string[]> = {
  kontraktor_pagar_bata_beton: ['tukang_batu', 'tukang_plester_aci'],
  kontraktor_pagar_besi: ['tukang_las'],
  kontraktor_canopy_baja: ['tukang_las', 'tukang_atap'],
  kontraktor_canopy_aluminium: ['tukang_aluminium'],
  kontraktor_atap_baja_ringan: ['tukang_atap', 'tukang_las'],
  kontraktor_atap_genteng: ['tukang_atap', 'tukang_batu'],
  kontraktor_kusen_aluminium: ['tukang_kaca_aluminium', 'tukang_aluminium'],
  kontraktor_kusen_kayu: ['tukang_kayu'],
  kontraktor_pintu_kayu: ['tukang_kayu'],
  kontraktor_keramik: ['tukang_keramik'],
  kontraktor_cat: ['tukang_cat'],
  kontraktor_paving_block: ['tukang_batu', 'tukang_landscape'],
  kontraktor_plafon_gypsum: ['tukang_gypsum_plafon'],
  kontraktor_plafon_pvc: ['tukang_gypsum_plafon'],
  kontraktor_landscape: ['tukang_landscape'],
  kontraktor_epoxy: ['tukang_waterproofing'],
};

export function expandContractorTagsToTukang(tags: string[]) {
  const s = new Set<string>(tags);
  tags.forEach(t => (CROSSWALK_CONTRACTOR_TO_TUKANG[t] || []).forEach(x => s.add(x)));
  return [...s];
}
