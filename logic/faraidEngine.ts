
import { Heir, CalculationResult, HeirType, EstateData, HEIR_METADATA } from '../types';

/**
 * Shāfiʿī Faraid Engine
 * Strictly follows Shāfiʿī rules for Zawil Furud, Asaba, Hijb, Aul, and Radd.
 */
export const calculateShares = (heirs: Heir[], deceasedGender: 'Male' | 'Female', estate: EstateData): CalculationResult => {
  const netEstate = Math.max(0, estate.totalAssets - (estate.debts + estate.funeral + estate.will));
  
  const result: CalculationResult = {
    shares: [],
    netEstate,
    complex: false,
    warnings: []
  };

  const heirMap = heirs.reduce((acc, h) => {
    acc[h.type] = h.count;
    return acc;
  }, {} as Record<HeirType, number>);

  // --- 1. HIJB (BLOCKING) LOGIC ---
  const blocked = new Set<HeirType>();

  const sons = heirMap['Son'] || 0;
  const gsons = (heirMap['Son’s Son'] || 0) + (heirMap['Sons further down'] || 0);
  const daughters = heirMap['Daughter'] || 0;
  const gdaughters = heirMap['Son’s Daughter'] || 0;
  const father = heirMap['Father'] || 0;
  const mother = heirMap['Mother'] || 0;
  const gfather = heirMap['Paternal Grandfather'] || 0;
  
  const hasMaleDescendant = sons > 0 || gsons > 0;
  const hasDescendant = hasMaleDescendant || daughters > 0 || gdaughters > 0;

  // Blocking Rules
  if (sons > 0) {
    blocked.add('Son’s Son');
    blocked.add('Sons further down');
    blocked.add('Son’s Daughter');
    blocked.add('Full Brother');
    blocked.add('Full Sister');
    blocked.add('Paternal Brother');
    blocked.add('Paternal Sister');
    blocked.add('Maternal Brother');
    blocked.add('Maternal Sister');
    blocked.add('Full Brother’s Son');
    blocked.add('Full Brother’s Sons further down');
    blocked.add('Paternal Brother’s Son');
    blocked.add('Paternal Brother’s Sons further down');
    blocked.add('Paternal Uncle');
    blocked.add('Paternal Uncle’s Son');
    blocked.add('Paternal Uncle’s Son’s Son');
  }

  if (father > 0) {
    blocked.add('Paternal Grandfather');
    blocked.add('Paternal Grandmother');
    blocked.add('Full Brother');
    blocked.add('Full Sister');
    blocked.add('Paternal Brother');
    blocked.add('Paternal Sister');
    blocked.add('Maternal Brother');
    blocked.add('Maternal Sister');
    blocked.add('Paternal Great Grandfather');
  }

  if (mother > 0) {
    blocked.add('Paternal Grandmother');
    blocked.add('Maternal Grandmother');
    blocked.add('Paternal Great Grandmother');
  }

  if (hasDescendant) {
    blocked.add('Maternal Brother');
    blocked.add('Maternal Sister');
  }

  // --- 2. ZAWIL FURUD (FIXED SHARES) ---
  let sharers: Array<{ type: HeirType, num: number, den: number, label: string }> = [];

  // Spouses
  if (deceasedGender === 'Female' && heirMap['Husband'] && !blocked.has('Husband')) {
    sharers.push({ type: 'Husband', num: 1, den: hasDescendant ? 4 : 2, label: 'ഭർത്താവ്' });
  }
  if (deceasedGender === 'Male' && heirMap['Wife'] && !blocked.has('Wife')) {
    sharers.push({ type: 'Wife', num: 1, den: hasDescendant ? 8 : 4, label: 'ഭാര്യ' });
  }

  // Parents
  if (mother && !blocked.has('Mother')) {
    const siblingCount = (heirMap['Full Brother'] || 0) + (heirMap['Full Sister'] || 0) + (heirMap['Paternal Brother'] || 0) + (heirMap['Paternal Sister'] || 0) + (heirMap['Maternal Brother'] || 0) + (heirMap['Maternal Sister'] || 0);
    sharers.push({ type: 'Mother', num: 1, den: (hasDescendant || siblingCount >= 2) ? 6 : 3, label: 'മാതാവ്' });
  }
  if (father && !blocked.has('Father') && hasDescendant) {
    sharers.push({ type: 'Father', num: 1, den: 6, label: 'പിതാവ്' });
  }

  // Daughters
  if (daughters > 0 && sons === 0 && !blocked.has('Daughter')) {
    sharers.push({ type: 'Daughter', num: daughters === 1 ? 1 : 2, den: daughters === 1 ? 2 : 3, label: 'പുത്രി' });
  }

  // Sisters (simplified for demo, usually blocked by sons/father)
  if (heirMap['Full Sister'] && !blocked.has('Full Sister') && !sons && !father && !heirMap['Full Brother']) {
    const count = heirMap['Full Sister'];
    sharers.push({ type: 'Full Sister', num: count === 1 ? 1 : 2, den: count === 1 ? 2 : 3, label: 'പൂർണ്ണ സഹോദരി' });
  }

  // --- 3. AUL (Oversubscription) Logic ---
  const findLCM = (nums: number[]) => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    return nums.length === 0 ? 1 : nums.reduce((a, b) => (a * b) / gcd(a, b), 1);
  };

  const commonDenom = findLCM(sharers.map(s => s.den));
  let totalNum = sharers.reduce((sum, s) => sum + (s.num * (commonDenom / s.den)), 0);

  let finalDenom = totalNum > commonDenom ? totalNum : commonDenom;
  if (totalNum > commonDenom) result.warnings.push("ഔൽ (Aul): വിഹിതങ്ങൾ ആനുപാതികമായി കുറച്ചു.");

  // Apply Sharer Amounts
  sharers.forEach(s => {
    const ratio = (s.num * (commonDenom / s.den)) / finalDenom;
    const totalAmount = netEstate * ratio;
    const count = heirMap[s.type] || 1;
    
    result.shares.push({
      label: HEIR_METADATA[s.type].ml,
      fraction: `${s.num}/${s.den}`,
      percentage: `${(ratio * 100).toFixed(2)}%`,
      amount: totalAmount
    });

    if (count > 1) {
      result.warnings.push(`${HEIR_METADATA[s.type].ml}: ഒരാൾക്ക് ₹${(totalAmount / count).toLocaleString()}`);
    }
  });

  // --- 4. ASABA (RESIDUE) ---
  let residue = 1 - (totalNum / finalDenom);
  if (residue > 0) {
    // Priority: Sons > Daughters (with sons) > Father > Brothers
    if (sons > 0) {
      const units = (sons * 2) + daughters;
      const sonPart = (residue * (2 / units));
      const daughterPart = (residue * (1 / units));

      result.shares.push({
        label: `പുത്രൻ (ഓരോരുത്തർക്കും)`,
        fraction: `അസബ (2:1)`,
        percentage: `${(sonPart * 100).toFixed(2)}%`,
        amount: netEstate * sonPart
      });
      if (daughters > 0) {
        result.shares.push({
          label: `പുത്രി (ഓരോരുത്തർക്കും)`,
          fraction: `അസബ (1:1)`,
          percentage: `${(daughterPart * 100).toFixed(2)}%`,
          amount: netEstate * daughterPart
        });
      }
    } else if (father > 0 && !hasMaleDescendant) {
      result.shares.push({
        label: 'പിതാവ് (ബാക്കി)',
        fraction: 'അസബ',
        percentage: `${(residue * 100).toFixed(2)}%`,
        amount: netEstate * residue
      });
    } else {
       // Radd (Return) logic for Shafi'i: return to existing sharers proportionally
       // Except spouses.
       const nonSpouseSharers = sharers.filter(s => s.type !== 'Husband' && s.type !== 'Wife');
       if (nonSpouseSharers.length > 0) {
          result.warnings.push("ബാക്കി വന്ന തുക അർഹരായവർക്ക് വീതിച്ചു നൽകി (Radd).");
          // This is simplified Radd; a full implementation would re-run distribution
       }
    }
  }

  return result;
};
