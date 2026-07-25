import { Heir, CalculationResult, HeirType, EstateData, HEIR_METADATA, HEIR_ORDER, Language, MetalUnit } from '../types';

export const calculateShares = (
  heirs: Heir[], 
  deceasedGender: 'Male' | 'Female', 
  estate: EstateData, 
  lang: Language = 'en'
): CalculationResult => {
  const rawLand = estate.detailed?.enabled ? estate.detailed.land.area : 0;
  const rawGold = estate.detailed?.enabled ? estate.detailed.gold.weight : 0;
  const rawSilver = estate.detailed?.enabled ? estate.detailed.silver.weight : 0;
  const rawCash = estate.detailed?.enabled ? estate.detailed.otherCash : estate.totalAssets;

  const landVal = estate.detailed?.enabled ? (rawLand * estate.detailed.land.valuePerUnit) : 0;
  const goldVal = estate.detailed?.enabled ? (rawGold * estate.detailed.gold.ratePerUnit) : 0;
  const silverVal = estate.detailed?.enabled ? (rawSilver * estate.detailed.silver.ratePerUnit) : 0;
  const cashVal = rawCash;

  const goldUnit: MetalUnit = estate.detailed?.gold.unit || 'gram';
  const silverUnit: MetalUnit = estate.detailed?.silver.unit || 'gram';

  const totalGrossValue = cashVal + landVal + goldVal + silverVal;
  const totalLiabilitiesVal = estate.debts + estate.funeral;
  const netValueBeforeWill = Math.max(0, totalGrossValue - totalLiabilitiesVal);
  const maxWasiyyahAllowedValue = netValueBeforeWill / 3;

  let willCash = estate.detailedWill?.cash || 0;
  let willLand = estate.detailedWill?.landArea || 0;
  let willGold = estate.detailedWill?.goldWeight || 0;
  let willSilver = estate.detailedWill?.silverWeight || 0;

  if (!estate.detailed?.enabled) {
    willCash = estate.will;
    willLand = 0;
    willGold = 0;
    willSilver = 0;
  }

  const proposedWillValue = (willCash) + 
                            (willLand * (estate.detailed?.land.valuePerUnit || 0)) + 
                            (willGold * (estate.detailed?.gold.ratePerUnit || 0)) + 
                            (willSilver * (estate.detailed?.silver.ratePerUnit || 0));

  let scalingFactor = 1;
  let willWarning = false;
  if (proposedWillValue > maxWasiyyahAllowedValue && proposedWillValue > 0) {
    scalingFactor = maxWasiyyahAllowedValue / proposedWillValue;
    willWarning = true;
  }

  const finalWillCash = willCash * scalingFactor;
  const finalWillLand = willLand * scalingFactor;
  const finalWillGold = willGold * scalingFactor;
  const finalWillSilver = willSilver * scalingFactor;

  const liabilitiesRatio = totalGrossValue > 0 ? Math.max(0, totalGrossValue - totalLiabilitiesVal) / totalGrossValue : 0;

  const distributableCash = Math.max(0, (rawCash * liabilitiesRatio) - finalWillCash);
  const distributableLand = Math.max(0, (rawLand * liabilitiesRatio) - finalWillLand);
  const distributableGold = Math.max(0, (rawGold * liabilitiesRatio) - finalWillGold);
  const distributableSilver = Math.max(0, (rawSilver * liabilitiesRatio) - finalWillSilver);

  const hMap = heirs.reduce((acc, h) => { acc[h.type] = h.count; return acc; }, {} as Record<string, number>);
  const getCount = (t: string) => hMap[t] || 0;

  const blocked = new Set<string>();
  const sons = getCount('Sons'), daughters = getCount('Daughters');
  const gsons = getCount('Grandsons'), gdaughters = getCount('Granddaughters');
  const father = getCount('Father'), mother = getCount('Mother'), gfather = getCount('Grandfather');
  const hasDescendant = sons > 0 || daughters > 0 || gsons > 0 || gdaughters > 0;
  
  if (father > 0) ['Grandfather', 'Paternal Grandmother', 'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters'].forEach(t => blocked.add(t));
  if (mother > 0) ['Paternal Grandmother', 'Maternal Grandmother'].forEach(t => blocked.add(t));
  if (sons > 0) ['Grandsons', 'Granddaughters', 'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters', 'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 'Full Paternal Uncles', 'Paternal Paternal Uncles', 'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'].forEach(t => blocked.add(t));
  if (hasDescendant) ['Maternal Brothers', 'Maternal Sisters'].forEach(t => blocked.add(t));
  if (gsons > 0) ['Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Full Nephews', 'Paternal Nephews'].forEach(t => blocked.add(t));

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
    netEstate: distributableCash, totalLand: distributableLand, totalGold: distributableGold, totalSilver: distributableSilver,
    summary: { fixedTotal: 0, residueTotal: 0, aulApplied, raddApplied: false },
    warnings: []
  };

  if (willWarning) result.warnings.push('error_will_limit');

  sharers.forEach(s => {
    let actualCount = 1;
    if (s.type === 'Grandmothers_Combined') actualCount = (getCount('Paternal Grandmother') > 0 ? 1 : 0) + (getCount('Maternal Grandmother') > 0 ? 1 : 0);
    else if (s.type === 'Maternal_Siblings_Combined') actualCount = matSibCount;
    else actualCount = getCount(s.type);

    const ratio = (s.num * (commonDenom / s.den)) / finalDenom;
    if (s.type === 'Grandmothers_Combined') {
        if (getCount('Maternal Grandmother') > 0) result.shares.push(createShareObj('Maternal Grandmother', 'Fixed', s.symbol, ratio/actualCount, distributableCash, distributableLand, distributableGold, distributableSilver, 1, lang, goldUnit, silverUnit));
        if (getCount('Paternal Grandmother') > 0 && !blocked.has('Paternal Grandmother')) result.shares.push(createShareObj('Paternal Grandmother', 'Fixed', s.symbol, ratio/actualCount, distributableCash, distributableLand, distributableGold, distributableSilver, 1, lang, goldUnit, silverUnit));
    } else if (s.type === 'Maternal_Siblings_Combined') {
        if (getCount('Maternal Brothers') > 0) result.shares.push(createShareObj('Maternal Brothers', 'Fixed', s.symbol, (ratio/actualCount) * getCount('Maternal Brothers'), distributableCash, distributableLand, distributableGold, distributableSilver, getCount('Maternal Brothers'), lang, goldUnit, silverUnit));
        if (getCount('Maternal Sisters') > 0) result.shares.push(createShareObj('Maternal Sisters', 'Fixed', s.symbol, (ratio/actualCount) * getCount('Maternal Sisters'), distributableCash, distributableLand, distributableGold, distributableSilver, getCount('Maternal Sisters'), lang, goldUnit, silverUnit));
    } else {
        result.shares.push(createShareObj(s.type, 'Fixed', s.symbol, ratio, distributableCash, distributableLand, distributableGold, distributableSilver, actualCount, lang, goldUnit, silverUnit));
    }
    result.summary.fixedTotal += ratio;
  });

  let resRatio = 1 - result.summary.fixedTotal;
  if (resRatio > 0.000001) {
    let assigned = false;
    if (sons > 0) {
      const u = (sons * 2) + daughters;
      result.shares.push(createShareObj('Sons', 'Asabah', '2:1', resRatio * (sons * 2 / u), distributableCash, distributableLand, distributableGold, distributableSilver, sons, lang, goldUnit, silverUnit));
      if (daughters > 0) result.shares.push(createShareObj('Daughters', 'Asabah', '2:1', resRatio * (daughters / u), distributableCash, distributableLand, distributableGold, distributableSilver, daughters, lang, goldUnit, silverUnit));
      assigned = true;
    } else if (gsons > 0) {
      const u = (gsons * 2) + gdaughters;
      result.shares.push(createShareObj('Grandsons', 'Asabah', '2:1', resRatio * (gsons * 2 / u), distributableCash, distributableLand, distributableGold, distributableSilver, gsons, lang, goldUnit, silverUnit));
      if (gdaughters > 0) result.shares.push(createShareObj('Granddaughters', 'Asabah', '2:1', resRatio * (gdaughters / u), distributableCash, distributableLand, distributableGold, distributableSilver, gdaughters, lang, goldUnit, silverUnit));
      assigned = true;
    } else if (father > 0) { result.shares.push(createShareObj('Father', 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, 1, lang, goldUnit, silverUnit)); assigned = true; }
    else if (gfather > 0 && !blocked.has('Grandfather')) { result.shares.push(createShareObj('Grandfather', 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, 1, lang, goldUnit, silverUnit)); assigned = true; }
    else if (getCount('Full Brothers') > 0) {
      const b = getCount('Full Brothers'), s = getCount('Full Sisters'), u = (b * 2) + s;
      result.shares.push(createShareObj('Full Brothers', 'Asabah', '2:1', resRatio * (b * 2 / u), distributableCash, distributableLand, distributableGold, distributableSilver, b, lang, goldUnit, silverUnit));
      if (s > 0) result.shares.push(createShareObj('Full Sisters', 'Asabah', '2:1', resRatio * (s / u), distributableCash, distributableLand, distributableGold, distributableSilver, s, lang, goldUnit, silverUnit));
      assigned = true;
    } else {
        const others = ['Paternal Brothers', 'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 'Full Paternal Uncles', 'Paternal Paternal Uncles', 'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'];
        for (const type of others) if (getCount(type) > 0 && !blocked.has(type)) { result.shares.push(createShareObj(type, 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, getCount(type), lang, goldUnit, silverUnit)); assigned = true; break; }
    }
    if (assigned) result.summary.residueTotal = resRatio;
    else {
      const sharersToRadd = result.shares.filter(s => HEIR_METADATA[s.type] && s.label !== HEIR_METADATA['Husband'][lang] && s.label !== HEIR_METADATA['Wives'][lang] && (s.amountEach > 0 || s.landEach > 0 || s.goldEach > 0 || s.silverEach > 0));
      if (sharersToRadd.length > 0) {
        result.summary.raddApplied = true;
        const currentSum = sharersToRadd.reduce((acc, s) => acc + (s.amount / (distributableCash || 1)), 0);
        sharersToRadd.forEach(s => {
          const baseRatio = (s.amount / (distributableCash || 1));
          const newR = baseRatio + (baseRatio / (currentSum || 1)) * resRatio;
          s.amount = distributableCash * newR; s.landAmount = distributableLand * newR; s.goldAmount = distributableGold * newR; s.silverAmount = distributableSilver * newR;
          s.amountEach = s.amount / s.count; s.landEach = s.landAmount / s.count; s.goldEach = s.goldAmount / s.count; s.silverEach = s.silverAmount / s.count;
          s.percentage = `${(newR * 100).toFixed(2)}%`; s.fraction = ratioToFraction(newR);
        });
      }
    }
  }

  HEIR_ORDER.forEach(t => {
    if (getCount(t) > 0 && !result.shares.some(s => s.label === HEIR_METADATA[t][lang])) 
      result.shares.push({ label: HEIR_METADATA[t][lang], type: 'Excluded', symbol: 'U', fraction: '0', percentage: '0%', amount: 0, landAmount: 0, goldAmount: 0, silverAmount: 0, count: getCount(t), amountEach: 0, landEach: 0, goldEach: 0, silverEach: 0 });
  });

  return result;
};

const createShareObj = (type: string, sType: string, sym: string, ratio: number, nc: number, nl: number, ng: number, ns: number, c: number, lang: Language, goldUnit: MetalUnit, silverUnit: MetalUnit) => ({
  label: HEIR_METADATA[type] ? HEIR_METADATA[type][lang] : type, 
  type: sType, symbol: sym, fraction: ratioToFraction(ratio), percentage: `${(ratio * 100).toFixed(2)}%`,
  amount: nc * ratio, landAmount: nl * ratio, goldAmount: ng * ratio, silverAmount: ns * ratio, 
  count: c, amountEach: (nc * ratio) / c, landEach: (nl * ratio) / c, goldEach: (ng * ratio) / c, silverEach: (ns * ratio) / c,
  goldUnit, silverUnit
});

const ratioToFraction = (r: number): string => {
    if (r === 0) return '0';
    const tol = 1.0e-6;
    let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = r;
    do { let a = Math.floor(b), aux = h1; h1 = a * h1 + h2; h2 = aux; aux = k1; k1 = a * k1 + k2; k2 = aux; if (Math.abs(b - a) < tol) break; b = 1 / (b - a); } while (Math.abs(r - h1 / k1) > r * tol && k1 < 10000);
    return `${h1}/${k1}`;
};