import { Heir, CalculationResult, HeirType, EstateData, HEIR_METADATA, HEIR_ORDER, Language } from '../types';

/**
 * Shāfiʿī Faraid Engine
 * Strictly follows Shāfiʿī rules for Zawil Furud, Asabah, Hijb, Aul, and Radd.
 */
export const calculateShares = (heirs: Heir[], deceasedGender: 'Male' | 'Female', estate: EstateData, lang: Language = 'en'): CalculationResult => {
  // Validate basic estate data
  const totalLiabilitiesBeforeWill = estate.debts + estate.funeral;
  const remainingAfterBasicLiabilities = Math.max(0, estate.totalAssets - totalLiabilitiesBeforeWill);
  
  // Wasiyyah (Will) rule: Cannot exceed 1/3 of the remaining estate after debts and funeral expenses
  const maxWillAllowed = remainingAfterBasicLiabilities / 3;
  const actualWill = Math.min(estate.will, maxWillAllowed);
  
  const netEstate = Math.max(0, remainingAfterBasicLiabilities - actualWill);
  
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
  
  // Rule 1: Father blocks Grandfather, Paternal Grandmother
  if (father > 0) {
    blocked.add('Grandfather');
    blocked.add('Paternal Grandmother');
    blocked.add('Full Brothers');
    blocked.add('Full Sisters');
    blocked.add('Paternal Brothers');
    blocked.add('Paternal Sisters');
    blocked.add('Maternal Brothers');
    blocked.add('Maternal Sisters');
  }

  // Rule 2: Mother blocks all Grandmothers
  if (mother > 0) {
    blocked.add('Paternal Grandmother');
    blocked.add('Maternal Grandmother');
  }

  // Rule 3: Sons block GSons, GDaughters, Siblings, Nephews, Uncles, Cousins
  if (sons > 0) {
    blocked.add('Grandsons');
    blocked.add('Granddaughters');
    blocked.add('Full Brothers');
    blocked.add('Full Sisters');
    blocked.add('Paternal Brothers');
    blocked.add('Paternal Sisters');
    blocked.add('Maternal Brothers');
    blocked.add('Maternal Sisters');
    blocked.add('Full Nephews');
    blocked.add('Paternal Nephews');
    blocked.add('Full Nephew’s Sons');
    blocked.add('Paternal Nephew’s Sons');
    blocked.add('Full Paternal Uncles');
    blocked.add('Paternal Paternal Uncles');
    blocked.add('Full Cousins');
    blocked.add('Paternal Cousins');
    blocked.add('Full Cousin’s Sons');
    blocked.add('Paternal Cousin’s Sons');
    blocked.add('Full Cousin’s Grandsons');
    blocked.add('Paternal Cousin’s Grandsons');
  }

  if (hasDescendant) {
    blocked.add('Maternal Brothers');
    blocked.add('Maternal Sisters');
  }

  if (gsons > 0) {
    blocked.add('Full Brothers');
    blocked.add('Full Sisters');
    blocked.add('Paternal Brothers');
    blocked.add('Paternal Sisters');
    blocked.add('Full Nephews');
    blocked.add('Paternal Nephews');
  }

  // --- 2. FIXED SHARES (Zawil Furud) ---
  const sharers: Array<{ type: string, num: number, den: number, symbol: string }> = [];

  if (deceasedGender === 'Female' && getCount('Husband') > 0) {
    sharers.push({ type: 'Husband', num: 1, den: hasDescendant ? 4 : 2, symbol: '1/4 | 1/2' });
  }
  if (deceasedGender === 'Male' && getCount('Wives') > 0) {
    sharers.push({ type: 'Wives', num: 1, den: hasDescendant ? 8 : 4, symbol: '1/8 | 1/4' });
  }
  if (mother > 0) {
    const sibCount = (getCount('Full Brothers') + getCount('Full Sisters') + getCount('Paternal Brothers') + getCount('Paternal Sisters') + getCount('Maternal Brothers') + getCount('Maternal Sisters'));
    sharers.push({ type: 'Mother', num: 1, den: (hasDescendant || sibCount >= 2) ? 6 : 3, symbol: '1/6 | 1/3' });
  }
  if (father > 0 && hasDescendant) {
    sharers.push({ type: 'Father', num: 1, den: 6, symbol: '1/6' });
  }
  if (gfather > 0 && !blocked.has('Grandfather') && hasDescendant) {
    sharers.push({ type: 'Grandfather', num: 1, den: 6, symbol: '1/6' });
  }
  if (daughters > 0 && sons === 0) {
    sharers.push({ type: 'Daughters', num: (daughters === 1 ? 1 : 2), den: (daughters === 1 ? 2 : 3), symbol: '1/2 | 2/3' });
  }
  if (gdaughters > 0 && sons === 0 && daughters < 2 && !blocked.has('Granddaughters')) {
     if (daughters === 0) {
        sharers.push({ type: 'Granddaughters', num: (gdaughters === 1 ? 1 : 2), den: (gdaughters === 1 ? 2 : 3), symbol: '1/2 | 2/3' });
     } else {
        sharers.push({ type: 'Granddaughters', num: 1, den: 6, symbol: '1/6' });
     }
  }
  const hasGm = (getCount('Paternal Grandmother') > 0 && !blocked.has('Paternal Grandmother')) || (getCount('Maternal Grandmother') > 0 && !blocked.has('Maternal Grandmother'));
  if (hasGm) {
    sharers.push({ type: 'Grandmothers_Combined', num: 1, den: 6, symbol: '1/6' });
  }
  const matSibCount = getCount('Maternal Brothers') + getCount('Maternal Sisters');
  if (matSibCount > 0 && !blocked.has('Maternal Brothers')) {
    sharers.push({ type: 'Maternal_Siblings_Combined', num: (matSibCount === 1 ? 1 : 1), den: (matSibCount === 1 ? 6 : 3), symbol: '1/6 | 1/3' });
  }

  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const lcm = (a: number, b: number): number => (a * b) / gcd(a, b);
  
  const commonDenom = sharers.length > 0 ? sharers.reduce((acc, s) => lcm(acc, s.den), 1) : 1;
  let totalNum = sharers.reduce((acc, s) => acc + (s.num * (commonDenom / s.den)), 0);

  const aulApplied = totalNum > commonDenom;
  const finalDenom = aulApplied ? totalNum : commonDenom;

  const result: CalculationResult = {
    shares: [],
    netEstate,
    summary: { fixedTotal: 0, residueTotal: 0, aulApplied, raddApplied: false },
    warnings: []
  };

  // Warning for Will reduction
  if (estate.will > maxWillAllowed) {
    result.warnings.push('error_will_limit');
  }

  sharers.forEach(s => {
    let actualCount = 1;
    if (s.type === 'Grandmothers_Combined') {
        const pgm = getCount('Paternal Grandmother');
        const mgm = getCount('Maternal Grandmother');
        actualCount = (pgm > 0 ? 1 : 0) + (mgm > 0 ? 1 : 0);
    } else if (s.type === 'Maternal_Siblings_Combined') {
        actualCount = matSibCount;
    } else {
        actualCount = getCount(s.type);
    }

    const shareTotal = (s.num * (commonDenom / s.den)) / finalDenom;
    const amount = netEstate * shareTotal;
    
    if (s.type === 'Grandmothers_Combined') {
        if (getCount('Maternal Grandmother') > 0) result.shares.push(createShareObj('Maternal Grandmother', 'Fixed', s.symbol, amount/actualCount, 1, shareTotal/actualCount, lang));
        if (getCount('Paternal Grandmother') > 0 && !blocked.has('Paternal Grandmother')) result.shares.push(createShareObj('Paternal Grandmother', 'Fixed', s.symbol, amount/actualCount, 1, shareTotal/actualCount, lang));
    } else if (s.type === 'Maternal_Siblings_Combined') {
        if (getCount('Maternal Brothers') > 0) result.shares.push(createShareObj('Maternal Brothers', 'Fixed', s.symbol, (amount/actualCount) * getCount('Maternal Brothers'), getCount('Maternal Brothers'), (shareTotal/actualCount) * getCount('Maternal Brothers'), lang));
        if (getCount('Maternal Sisters') > 0) result.shares.push(createShareObj('Maternal Sisters', 'Fixed', s.symbol, (amount/actualCount) * getCount('Maternal Sisters'), getCount('Maternal Sisters'), (shareTotal/actualCount) * getCount('Maternal Sisters'), lang));
    } else {
        result.shares.push(createShareObj(s.type, 'Fixed', s.symbol, amount, actualCount, shareTotal, lang));
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
      result.shares.push(createShareObj('Sons', 'Asabah', 'Asaba (2:1)', netEstate * sonPart * sons, sons, sonPart * sons, lang));
      if (daughters > 0) result.shares.push(createShareObj('Daughters', 'Asabah', 'Asaba (2:1)', netEstate * daughterPart * daughters, daughters, daughterPart * daughters, lang));
      asabaAssigned = true;
    } else if (gsons > 0) {
      const units = (gsons * 2) + gdaughters;
      const gsonPart = (residueRatio * (2 / units));
      const gdaughterPart = (residueRatio * (1 / units));
      result.shares.push(createShareObj('Grandsons', 'Asabah', 'Asaba (2:1)', netEstate * gsonPart * gsons, gsons, gsonPart * gsons, lang));
      if (gdaughters > 0) result.shares.push(createShareObj('Granddaughters', 'Asabah', 'Asaba (2:1)', netEstate * gdaughterPart * gdaughters, gdaughters, gdaughterPart * gdaughters, lang));
      asabaAssigned = true;
    } else if (father > 0) {
      result.shares.push(createShareObj('Father', 'Asabah', 'Asaba (F)', netEstate * residueRatio, 1, residueRatio, lang));
      asabaAssigned = true;
    } else if (gfather > 0 && !blocked.has('Grandfather')) {
        result.shares.push(createShareObj('Grandfather', 'Asabah', 'Asaba (F)', netEstate * residueRatio, 1, residueRatio, lang));
        asabaAssigned = true;
    } else if (getCount('Full Brothers') > 0) {
        const b = getCount('Full Brothers');
        const s = getCount('Full Sisters');
        const units = (b * 2) + s;
        const bPart = (residueRatio * (2 / units));
        const sPart = (residueRatio * (1 / units));
        result.shares.push(createShareObj('Full Brothers', 'Asabah', 'Asaba (2:1)', netEstate * bPart * b, b, bPart * b, lang));
        if (s > 0) result.shares.push(createShareObj('Full Sisters', 'Asabah', 'Asaba (2:1)', netEstate * sPart * s, s, sPart * s, lang));
        asabaAssigned = true;
    } else {
        const otherAsabaOrder = [
            'Paternal Brothers', 'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 
            'Paternal Nephew’s Sons', 'Full Paternal Uncles', 'Paternal Paternal Uncles', 
            'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons',
            'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'
        ];
        for (const type of otherAsabaOrder) {
            if (getCount(type) > 0 && !blocked.has(type)) {
                result.shares.push(createShareObj(type, 'Asabah', 'Asaba', netEstate * residueRatio, getCount(type), residueRatio, lang));
                asabaAssigned = true;
                break;
            }
        }
    }

    if (asabaAssigned) {
        result.summary.residueTotal = residueRatio;
    } else {
        const nonSpouseSharers = result.shares.filter(s => {
          const m = Object.values(HEIR_METADATA).find(x => x[lang] === s.label);
          const isHusband = m === HEIR_METADATA['Husband'];
          const isWife = m === HEIR_METADATA['Wives'];
          return !isHusband && !isWife && s.amount > 0;
        });
        if (nonSpouseSharers.length > 0) {
            result.summary.raddApplied = true;
            const totalSharerRatio = nonSpouseSharers.reduce((acc, s) => acc + (s.amount / netEstate), 0);
            nonSpouseSharers.forEach(s => {
                const added = (s.amount / (netEstate * totalSharerRatio)) * residueRatio;
                s.amount += netEstate * added;
                s.amountEach = s.amount / s.count;
                s.percentage = `${((s.amount / netEstate) * 100).toFixed(2)}%`;
            });
        }
    }
  }

  HEIR_ORDER.forEach(type => {
      if (getCount(type) > 0 && !result.shares.some(s => s.label === HEIR_METADATA[type][lang])) {
          result.shares.push({
              label: HEIR_METADATA[type][lang],
              type: 'Excluded',
              symbol: 'U',
              fraction: '0',
              percentage: '0%',
              amount: 0,
              count: getCount(type),
              amountEach: 0
          });
      }
  });

  return result;
};

const createShareObj = (type: string, sType: string, symbol: string, totalAmount: number, count: number, ratio: number, lang: Language) => {
    return {
        label: HEIR_METADATA[type] ? HEIR_METADATA[type][lang] : type,
        type: sType,
        symbol,
        fraction: ratioToFraction(ratio),
        percentage: `${(ratio * 100).toFixed(2)}%`,
        amount: totalAmount,
        count: count,
        amountEach: totalAmount / count
    };
};

const ratioToFraction = (r: number): string => {
    if (r === 0) return '0';
    const tolerance = 1.0e-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1;
    let b = r;
    do {
        let a = Math.floor(b);
        let aux = h1; h1 = a * h1 + h2; h2 = aux;
        aux = k1; k1 = a * k1 + k2; k2 = aux;
        b = 1 / (b - a);
    } while (Math.abs(r - h1 / k1) > r * tolerance);
    return `${h1}/${k1}`;
};