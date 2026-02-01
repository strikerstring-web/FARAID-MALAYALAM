import { Heir, CalculationResult, HeirType, EstateData, HEIR_METADATA, HEIR_ORDER, Language } from '../types';

/**
 * Shāfiʿī Faraid Engine
 * Strictly follows Shāfiʿī rules for Zawil Furud, Asabah, Hijb, Aul, and Radd.
 */
export const calculateShares = (
  heirs: Heir[], 
  deceasedGender: 'Male' | 'Female', 
  estate: EstateData, 
  lang: Language = 'en'
): CalculationResult => {
  // Determine asset quantities
  const rawLand = estate.detailed?.enabled ? estate.detailed.land.area : 0;
  const rawGold = estate.detailed?.enabled ? estate.detailed.gold.weight : 0;
  const rawSilver = estate.detailed?.enabled ? estate.detailed.silver.weight : 0;
  const rawCash = estate.detailed?.enabled ? estate.detailed.otherCash : estate.totalAssets;

  // Determine market values for 1/3 rule verification
  const landVal = estate.detailed?.enabled ? (rawLand * estate.detailed.land.valuePerUnit) : 0;
  const goldVal = estate.detailed?.enabled ? (rawGold * estate.detailed.gold.ratePerGram) : 0;
  const silverVal = estate.detailed?.enabled ? (rawSilver * estate.detailed.silver.ratePerGram) : 0;
  const cashVal = rawCash;

  const totalGrossValue = cashVal + landVal + goldVal + silverVal;
  const totalLiabilitiesVal = estate.debts + estate.funeral;
  const netValueBeforeWill = Math.max(0, totalGrossValue - totalLiabilitiesVal);
  const maxWasiyyahAllowedValue = netValueBeforeWill / 3;

  // Complex Wasiyyah Deductions
  let willCash = estate.detailedWill?.cash || 0;
  let willLand = estate.detailedWill?.landArea || 0;
  let willGold = estate.detailedWill?.goldWeight || 0;
  let willSilver = estate.detailedWill?.silverWeight || 0;

  // If "Simple" entry was used, simple `estate.will` applies to cash
  if (!estate.detailed?.enabled) {
    willCash = estate.will;
    willLand = 0;
    willGold = 0;
    willSilver = 0;
  }

  // Calculate total proposed Wasiyyah value
  const proposedWillValue = (willCash) + 
                            (willLand * (estate.detailed?.land.valuePerUnit || 0)) + 
                            (willGold * (estate.detailed?.gold.ratePerGram || 0)) + 
                            (willSilver * (estate.detailed?.silver.ratePerGram || 0));

  // Scale down Wasiyyah if it exceeds 1/3 of net estate
  let willWarning = false;
  let scalingFactor = 1;
  if (proposedWillValue > maxWasiyyahAllowedValue && proposedWillValue > 0) {
    scalingFactor = maxWasiyyahAllowedValue / proposedWillValue;
    willWarning = true;
  }

  const finalWillCash = willCash * scalingFactor;
  const finalWillLand = willLand * scalingFactor;
  const finalWillGold = willGold * scalingFactor;
  const finalWillSilver = willSilver * scalingFactor;

  // Deduction Factor for general liabilities (Debts/Funeral)
  // These are typically deducted from the total value pool. 
  // We apply the ratio to each asset type to keep them "independent" yet responsible.
  const liabilitiesRatio = totalGrossValue > 0 ? (totalGrossValue - totalLiabilitiesVal) / totalGrossValue : 0;

  const distributableCash = (rawCash * liabilitiesRatio) - finalWillCash;
  const distributableLand = (rawLand * liabilitiesRatio) - finalWillLand;
  const distributableGold = (rawGold * liabilitiesRatio) - finalWillGold;
  const distributableSilver = (rawSilver * liabilitiesRatio) - finalWillSilver;

  const hMap = heirs.reduce((acc, h) => {
    acc[h.type] = h.count;
    return acc;
  }, {} as Record<string, number>);

  const getCount = (t: string) => hMap[t] || 0;

  // --- 1. HIJB (BLOCKING) ---
  const blocked = new Set<string>();
  const sons = getCount('Sons');
  const daughters = getCount('Daughters');
  const gsons = getCount('Grandsons');
  const gdaughters = getCount('Granddaughters');
  const father = getCount('Father');
  const mother = getCount('Mother');
  const gfather = getCount('Grandfather');
  const hasDescendant = sons > 0 || daughters > 0 || gsons > 0 || gdaughters > 0;
  
  if (father > 0) {
    ['Grandfather', 'Paternal Grandmother', 'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters'].forEach(t => blocked.add(t));
  }
  if (mother > 0) {
    ['Paternal Grandmother', 'Maternal Grandmother'].forEach(t => blocked.add(t));
  }
  if (sons > 0) {
    ['Grandsons', 'Granddaughters', 'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters', 'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 'Full Paternal Uncles', 'Paternal Paternal Uncles', 'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'].forEach(t => blocked.add(t));
  }
  if (hasDescendant) {
    ['Maternal Brothers', 'Maternal Sisters'].forEach(t => blocked.add(t));
  }
  if (gsons > 0) {
    ['Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Full Nephews', 'Paternal Nephews'].forEach(t => blocked.add(t));
  }

  // --- 2. FIXED SHARES (Zawil Furud) ---
  const sharers: Array<{ type: string, num: number, den: number, symbol: string }> = [];

  if (deceasedGender === 'Female' && getCount('Husband') > 0) sharers.push({ type: 'Husband', num: 1, den: hasDescendant ? 4 : 2, symbol: '1/4 | 1/2' });
  if (deceasedGender === 'Male' && getCount('Wives') > 0) sharers.push({ type: 'Wives', num: 1, den: hasDescendant ? 8 : 4, symbol: '1/8 | 1/4' });
  if (mother > 0) {
    const sibCount = (getCount('Full Brothers') + getCount('Full Sisters') + getCount('Paternal Brothers') + getCount('Paternal Sisters') + getCount('Maternal Brothers') + getCount('Maternal Sisters'));
    sharers.push({ type: 'Mother', num: 1, den: (hasDescendant || sibCount >= 2) ? 6 : 3, symbol: '1/6 | 1/3' });
  }
  if (father > 0 && hasDescendant) sharers.push({ type: 'Father', num: 1, den: 6, symbol: '1/6' });
  if (gfather > 0 && !blocked.has('Grandfather') && hasDescendant) sharers.push({ type: 'Grandfather', num: 1, den: 6, symbol: '1/6' });
  if (daughters > 0 && sons === 0) sharers.push({ type: 'Daughters', num: (daughters === 1 ? 1 : 2), den: (daughters === 1 ? 2 : 3), symbol: '1/2 | 2/3' });
  if (gdaughters > 0 && sons === 0 && daughters < 2 && !blocked.has('Granddaughters')) {
     if (daughters === 0) sharers.push({ type: 'Granddaughters', num: (gdaughters === 1 ? 1 : 2), den: (gdaughters === 1 ? 2 : 3), symbol: '1/2 | 2/3' });
     else sharers.push({ type: 'Granddaughters', num: 1, den: 6, symbol: '1/6' });
  }
  if ((getCount('Paternal Grandmother') > 0 && !blocked.has('Paternal Grandmother')) || (getCount('Maternal Grandmother') > 0 && !blocked.has('Maternal Grandmother'))) {
    sharers.push({ type: 'Grandmothers_Combined', num: 1, den: 6, symbol: '1/6' });
  }
  const matSibCount = getCount('Maternal Brothers') + getCount('Maternal Sisters');
  if (matSibCount > 0 && !blocked.has('Maternal Brothers')) sharers.push({ type: 'Maternal_Siblings_Combined', num: 1, den: (matSibCount === 1 ? 6 : 3), symbol: '1/6 | 1/3' });

  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const lcm = (a: number, b: number): number => (a * b) / (gcd(a, b) || 1);
  const commonDenom = sharers.length > 0 ? sharers.reduce((acc, s) => lcm(acc, s.den), 1) : 1;
  let totalNum = sharers.reduce((acc, s) => acc + (s.num * (commonDenom / s.den)), 0);
  const aulApplied = totalNum > commonDenom;
  const finalDenom = aulApplied ? totalNum : commonDenom;

  const result: CalculationResult = {
    shares: [],
    netEstate: Math.max(0, distributableCash),
    totalLand: Math.max(0, distributableLand),
    totalGold: Math.max(0, distributableGold),
    totalSilver: Math.max(0, distributableSilver),
    summary: { fixedTotal: 0, residueTotal: 0, aulApplied, raddApplied: false },
    warnings: []
  };

  if (willWarning) result.warnings.push('error_will_limit');

  sharers.forEach(s => {
    let actualCount = 1;
    if (s.type === 'Grandmothers_Combined') actualCount = (getCount('Paternal Grandmother') > 0 ? 1 : 0) + (getCount('Maternal Grandmother') > 0 ? 1 : 0);
    else if (s.type === 'Maternal_Siblings_Combined') actualCount = matSibCount;
    else actualCount = getCount(s.type);

    const shareTotal = (s.num * (commonDenom / s.den)) / finalDenom;
    
    if (s.type === 'Grandmothers_Combined') {
        if (getCount('Maternal Grandmother') > 0) result.shares.push(createShareObj('Maternal Grandmother', 'Fixed', s.symbol, shareTotal/actualCount, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, 1, lang));
        if (getCount('Paternal Grandmother') > 0 && !blocked.has('Paternal Grandmother')) result.shares.push(createShareObj('Paternal Grandmother', 'Fixed', s.symbol, shareTotal/actualCount, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, 1, lang));
    } else if (s.type === 'Maternal_Siblings_Combined') {
        if (getCount('Maternal Brothers') > 0) result.shares.push(createShareObj('Maternal Brothers', 'Fixed', s.symbol, (shareTotal/actualCount) * getCount('Maternal Brothers'), result.netEstate, result.totalLand, result.totalGold, result.totalSilver, getCount('Maternal Brothers'), lang));
        if (getCount('Maternal Sisters') > 0) result.shares.push(createShareObj('Maternal Sisters', 'Fixed', s.symbol, (shareTotal/actualCount) * getCount('Maternal Sisters'), result.netEstate, result.totalLand, result.totalGold, result.totalSilver, getCount('Maternal Sisters'), lang));
    } else {
        result.shares.push(createShareObj(s.type, 'Fixed', s.symbol, shareTotal, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, actualCount, lang));
    }
    result.summary.fixedTotal += shareTotal;
  });

  let residueRatio = 1 - result.summary.fixedTotal;
  if (residueRatio > 0.000001) {
    let asabaAssigned = false;
    if (sons > 0) {
      const units = (sons * 2) + daughters;
      const sonPart = (residueRatio * (2 / units));
      const daughterPart = (residueRatio * (1 / units));
      result.shares.push(createShareObj('Sons', 'Asabah', 'Asaba (2:1)', sonPart * sons, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, sons, lang));
      if (daughters > 0) result.shares.push(createShareObj('Daughters', 'Asabah', 'Asaba (2:1)', daughterPart * daughters, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, daughters, lang));
      asabaAssigned = true;
    } else if (gsons > 0) {
      const units = (gsons * 2) + gdaughters;
      const gsonPart = (residueRatio * (2 / units));
      const gdaughterPart = (residueRatio * (1 / units));
      result.shares.push(createShareObj('Grandsons', 'Asabah', 'Asaba (2:1)', gsonPart * gsons, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, gsons, lang));
      if (gdaughters > 0) result.shares.push(createShareObj('Granddaughters', 'Asabah', 'Asaba (2:1)', gdaughterPart * gdaughters, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, gdaughters, lang));
      asabaAssigned = true;
    } else if (father > 0) {
      result.shares.push(createShareObj('Father', 'Asabah', 'Asaba (F)', residueRatio, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, 1, lang));
      asabaAssigned = true;
    } else if (gfather > 0 && !blocked.has('Grandfather')) {
        result.shares.push(createShareObj('Grandfather', 'Asabah', 'Asaba (F)', residueRatio, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, 1, lang));
        asabaAssigned = true;
    } else if (getCount('Full Brothers') > 0) {
        const b = getCount('Full Brothers'), s = getCount('Full Sisters'), units = (b * 2) + s;
        const bPart = (residueRatio * (2 / units)), sPart = (residueRatio * (1 / units));
        result.shares.push(createShareObj('Full Brothers', 'Asabah', 'Asaba (2:1)', bPart * b, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, b, lang));
        if (s > 0) result.shares.push(createShareObj('Full Sisters', 'Asabah', 'Asaba (2:1)', sPart * s, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, s, lang));
        asabaAssigned = true;
    } else {
        const otherAsabaOrder = ['Paternal Brothers', 'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 'Full Paternal Uncles', 'Paternal Paternal Uncles', 'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'];
        for (const type of otherAsabaOrder) {
            if (getCount(type) > 0 && !blocked.has(type)) {
                result.shares.push(createShareObj(type, 'Asabah', 'Asaba', residueRatio, result.netEstate, result.totalLand, result.totalGold, result.totalSilver, getCount(type), lang));
                asabaAssigned = true;
                break;
            }
        }
    }
    if (asabaAssigned) result.summary.residueTotal = residueRatio;
    else {
        const nonSpouseSharers = result.shares.filter(s => {
          const m = Object.values(HEIR_METADATA).find(x => x[lang] === s.label);
          return m !== HEIR_METADATA['Husband'] && m !== HEIR_METADATA['Wives'] && (s.amount > 0 || s.landAmount > 0);
        });
        if (nonSpouseSharers.length > 0) {
            result.summary.raddApplied = true;
            const totalSharerRatio = nonSpouseSharers.reduce((acc, s) => acc + (s.amount / (result.netEstate || 1)), 0);
            nonSpouseSharers.forEach(s => {
                const added = (s.amount / ((result.netEstate || 1) * (totalSharerRatio || 1))) * residueRatio;
                const newRatio = (s.amount / (result.netEstate || 1)) + added;
                s.amount = result.netEstate * newRatio;
                s.landAmount = result.totalLand * newRatio;
                s.goldAmount = result.totalGold * newRatio;
                s.silverAmount = result.totalSilver * newRatio;
                s.amountEach = s.amount / s.count;
                s.landEach = s.landAmount / s.count;
                s.goldEach = s.goldAmount / s.count;
                s.silverEach = s.silverAmount / s.count;
                s.percentage = `${(newRatio * 100).toFixed(2)}%`;
                s.fraction = ratioToFraction(newRatio);
            });
        }
    }
  }

  HEIR_ORDER.forEach(type => {
      if (getCount(type) > 0 && !result.shares.some(s => s.label === HEIR_METADATA[type][lang])) {
          result.shares.push({
              label: HEIR_METADATA[type][lang], type: 'Excluded', symbol: 'U', fraction: '0', percentage: '0%', 
              amount: 0, landAmount: 0, goldAmount: 0, silverAmount: 0, count: getCount(type), 
              amountEach: 0, landEach: 0, goldEach: 0, silverEach: 0
          });
      }
  });
  return result;
};

const createShareObj = (type: string, sType: string, symbol: string, ratio: number, netCash: number, netLand: number, netGold: number, netSilver: number, count: number, lang: Language) => {
    return {
        label: HEIR_METADATA[type] ? HEIR_METADATA[type][lang] : type,
        type: sType,
        symbol,
        fraction: ratioToFraction(ratio),
        percentage: `${(ratio * 100).toFixed(2)}%`,
        amount: netCash * ratio,
        landAmount: netLand * ratio,
        goldAmount: netGold * ratio,
        silverAmount: netSilver * ratio,
        count: count,
        amountEach: (netCash * ratio) / count,
        landEach: (netLand * ratio) / count,
        goldEach: (netGold * ratio) / count,
        silverEach: (netSilver * ratio) / count
    };
};

const ratioToFraction = (r: number): string => {
    if (r === 0) return '0';
    const tolerance = 1.0e-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = r;
    do {
        let a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        if (Math.abs(b - a) < tolerance) break;
        b = 1 / (b - a);
    } while (Math.abs(r - h1 / k1) > r * tolerance && k1 < 10000);
    return `${h1}/${k1}`;
};