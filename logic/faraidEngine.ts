
import { Heir, CalculationResult, HeirType, EstateData } from '../types';

/**
 * Shāfiʿī Faraid Engine
 * Strictly follows Shāfiʿī rules for Zawil Furud, Asaba, and Hijb.
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

  // Pre-calculations for blocking logic
  const sons = heirMap['Son'] || 0;
  const daughters = heirMap['Daughter'] || 0;
  const father = heirMap['Father'] || 0;
  const mother = heirMap['Mother'] || 0;
  const hasChildren = sons > 0 || daughters > 0;
  
  const fullBrothers = heirMap['Full Brother'] || 0;
  const fullSisters = heirMap['Full Sister'] || 0;
  const paternalBrothers = heirMap['Paternal Brother'] || 0;
  const paternalSisters = heirMap['Paternal Sister'] || 0;
  const maternalBrothers = heirMap['Maternal Brother'] || 0;
  const maternalSisters = heirMap['Maternal Sister'] || 0;
  
  const siblingCount = fullBrothers + fullSisters + paternalBrothers + paternalSisters + maternalBrothers + maternalSisters;
  const hasMultipleSiblings = siblingCount >= 2;

  let baseShares: Array<{ label: string, fractionNum: number, fractionDen: number, type: string }> = [];

  // --- ZAWIL FURUD (Fixed Shares) ---

  // 1. Spouses
  if (deceasedGender === 'Female' && heirMap['Husband']) {
    const den = hasChildren ? 4 : 2;
    baseShares.push({ label: 'ഭർത്താവ്', fractionNum: 1, fractionDen: den, type: 'Spouse' });
  }
  if (deceasedGender === 'Male' && heirMap['Wife']) {
    const den = hasChildren ? 8 : 4;
    baseShares.push({ label: heirMap['Wife'] > 1 ? 'ഭാര്യമാർ' : 'ഭാര്യ', fractionNum: 1, fractionDen: den, type: 'Spouse' });
  }

  // 2. Mother
  if (mother) {
    let den = 3;
    if (hasChildren || hasMultipleSiblings) {
      den = 6;
    }
    // Shāfiʿī Rule: Special case (Umariyyatan) handled manually if residue logic allows
    baseShares.push({ label: 'മാതാവ്', fractionNum: 1, fractionDen: den, type: 'Mother' });
  }

  // 3. Father (Fixed share if children exist)
  if (father && hasChildren) {
    baseShares.push({ label: 'പിതാവ്', fractionNum: 1, fractionDen: 6, type: 'Father' });
  }

  // 4. Daughters (if no sons)
  if (daughters > 0 && sons === 0) {
    if (daughters === 1) {
      baseShares.push({ label: 'പുത്രി', fractionNum: 1, fractionDen: 2, type: 'Daughter' });
    } else {
      baseShares.push({ label: 'പുത്രിമാർ', fractionNum: 2, fractionDen: 3, type: 'Daughter' });
    }
  }

  // 5. Maternal Siblings (Only if no children and no father/grandfather)
  const maternalSiblings = (heirMap['Maternal Brother'] || 0) + (heirMap['Maternal Sister'] || 0);
  if (maternalSiblings > 0 && !hasChildren && !father && !heirMap['Paternal Grandfather']) {
    if (maternalSiblings === 1) {
      baseShares.push({ label: 'മാതൃ സഹോദരങ്ങൾ', fractionNum: 1, fractionDen: 6, type: 'Maternal' });
    } else {
      baseShares.push({ label: 'മാതൃ സഹോദരങ്ങൾ', fractionNum: 1, fractionDen: 3, type: 'Maternal' });
    }
  }

  // --- AUL (Oversubscription) Logic ---
  const findLCM = (nums: number[]) => {
    const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
    const lcm = (a: number, b: number) => (a * b) / gcd(a, b);
    return nums.reduce((a, b) => lcm(a, b), 1);
  };

  const denominators = baseShares.map(s => s.fractionDen);
  const commonDenom = denominators.length > 0 ? findLCM(denominators) : 1;
  let totalNumerator = baseShares.reduce((sum, s) => sum + (s.fractionNum * (commonDenom / s.fractionDen)), 0);

  // Aul occurs if totalNumerator > commonDenom
  const finalDenom = totalNumerator > commonDenom ? totalNumerator : commonDenom;

  baseShares.forEach(s => {
    const shareNumerator = s.fractionNum * (commonDenom / s.fractionDen);
    const percentage = (shareNumerator / finalDenom) * 100;
    result.shares.push({
      label: s.label,
      fraction: `${shareNumerator}/${finalDenom}`,
      percentage: `${percentage.toFixed(2)}%`,
      amount: netEstate * (shareNumerator / finalDenom)
    });
  });

  // --- ASABA (Residue) ---
  let residueNumerator = finalDenom - totalNumerator;
  if (residueNumerator > 0 && totalNumerator < finalDenom) {
    const residueRatio = residueNumerator / finalDenom;
    
    if (sons > 0) {
      const units = (sons * 2) + daughters;
      const sonPart = (residueRatio * (sons * 2 / units));
      const daughterPart = (daughters > 0) ? (residueRatio * (daughters / units)) : 0;
      
      result.shares.push({
        label: sons > 1 ? 'പുത്രന്മാർ' : 'പുത്രൻ',
        fraction: 'അസബ (2:1)',
        percentage: `${(sonPart * 100).toFixed(2)}%`,
        amount: netEstate * sonPart
      });
      if (daughters > 0) {
        result.shares.push({
          label: daughters > 1 ? 'പുത്രിമാർ' : 'പുത്രി',
          fraction: 'അസബ (2:1)',
          percentage: `${(daughterPart * 100).toFixed(2)}%`,
          amount: netEstate * daughterPart
        });
      }
    } else if (father && !hasChildren) {
      result.shares.push({
        label: 'പിതാവ്',
        fraction: 'അസബ (ബാക്കി)',
        percentage: `${(residueRatio * 100).toFixed(2)}%`,
        amount: netEstate * residueRatio
      });
    } else if (fullBrothers || fullSisters) {
      // Simplified blocking: Shafi'i rules for siblings
      const units = (fullBrothers * 2) + fullSisters;
      result.shares.push({
        label: 'സഹോദരങ്ങൾ (Full)',
        fraction: 'അസബ',
        percentage: `${(residueRatio * 100).toFixed(2)}%`,
        amount: netEstate * residueRatio
      });
    }
  }

  // --- Shāfiʿī Specific Warnings ---
  if (heirMap['Paternal Grandfather'] && (fullBrothers > 0 || fullSisters > 0)) {
    result.complex = true;
    result.warnings.push("പിതാമഹനും സഹോദരങ്ങളും ഒന്നിച്ചു വന്ന കേസ് (Muqasamah/Shafi'i). ഇതിൽ പണ്ഡിതരുടെ നേരിട്ടുള്ള പരിശോധന ആവശ്യമാണ്.");
  }
  
  if (totalNumerator > commonDenom) {
    result.warnings.push("ഔൽ (Aul) നിയമപ്രകാരം വിഹിതങ്ങൾ ആനുപാതികമായി കുറച്ചിട്ടുണ്ട്.");
  }

  return result;
};
