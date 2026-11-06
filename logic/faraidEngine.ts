import { Heir, CalculationResult, HeirType, EstateData, HEIR_METADATA, HEIR_ORDER, Language, MetalUnit, LandUnit, ShareResultItem } from '../types';

export const calculateShares = (
  heirs: Heir[], 
  deceasedGender: 'Male' | 'Female', 
  estate: EstateData, 
  lang: Language = 'en'
): CalculationResult => {
  const isDetailed = !!estate.detailed?.enabled;

  const rawLand = isDetailed ? Math.max(0, Number(estate.detailed!.land.area) || 0) : 0;
  const landUnit: LandUnit = (isDetailed ? estate.detailed!.land.unit : 'cent') || 'cent';
  const landValuePerUnit = isDetailed ? Math.max(0, Number(estate.detailed!.land.valuePerUnit) || 0) : 0;
  const landVal = rawLand * landValuePerUnit;

  const rawGold = isDetailed ? Math.max(0, Number(estate.detailed!.gold.weight) || 0) : 0;
  const goldUnit: MetalUnit = (isDetailed ? estate.detailed!.gold.unit : 'gram') || 'gram';
  const goldRatePerUnit = isDetailed ? Math.max(0, Number(estate.detailed!.gold.ratePerUnit) || 0) : 0;
  const goldVal = rawGold * goldRatePerUnit;

  const rawSilver = isDetailed ? Math.max(0, Number(estate.detailed!.silver.weight) || 0) : 0;
  const silverUnit: MetalUnit = (isDetailed ? estate.detailed!.silver.unit : 'gram') || 'gram';
  const silverRatePerUnit = isDetailed ? Math.max(0, Number(estate.detailed!.silver.ratePerUnit) || 0) : 0;
  const silverVal = rawSilver * silverRatePerUnit;

  const rawCash = isDetailed ? Math.max(0, Number(estate.detailed!.otherCash) || 0) : Math.max(0, Number(estate.totalAssets) || 0);
  const cashVal = rawCash;

  const totalGrossValue = cashVal + landVal + goldVal + silverVal;
  const totalLiabilities = Math.max(0, Number(estate.debts) || 0) + Math.max(0, Number(estate.funeral) || 0);

  const warnings: string[] = [];

  // Liabilities check
  if (totalLiabilities >= totalGrossValue && totalGrossValue > 0) {
    warnings.push('error_liabilities_exceed_assets');
  }

  // Step 1: Pay liabilities (Debts + Funeral)
  // In Islamic jurisprudence, debts & funeral are currency liabilities and paid from liquid cash first.
  let netCash = cashVal;
  let netLand = rawLand;
  let netGold = rawGold;
  let netSilver = rawSilver;

  if (totalLiabilities > 0) {
    if (netCash >= totalLiabilities) {
      netCash -= totalLiabilities;
    } else {
      const deficit = totalLiabilities - netCash;
      netCash = 0;
      const nonCashValue = landVal + goldVal + silverVal;
      if (nonCashValue > 0) {
        const deficitRatio = Math.min(1, deficit / nonCashValue);
        netLand = Math.max(0, rawLand * (1 - deficitRatio));
        netGold = Math.max(0, rawGold * (1 - deficitRatio));
        netSilver = Math.max(0, rawSilver * (1 - deficitRatio));
      }
    }
  }

  const netNetValueBeforeWill = (netCash) + 
    (netLand * landValuePerUnit) + 
    (netGold * goldRatePerUnit) + 
    (netSilver * silverRatePerUnit);

  const maxWasiyyahAllowedValue = netNetValueBeforeWill / 3;

  // Step 2: Wasiyyah (Will)
  let willCash = 0;
  let willLand = 0;
  let willGold = 0;
  let willSilver = 0;

  if (isDetailed && estate.detailedWill) {
    willCash = Math.max(0, Number(estate.detailedWill.cash) || 0);
    willLand = Math.max(0, Number(estate.detailedWill.landArea) || 0);
    willGold = Math.max(0, Number(estate.detailedWill.goldWeight) || 0);
    willSilver = Math.max(0, Number(estate.detailedWill.silverWeight) || 0);
  } else {
    willCash = Math.max(0, Number(estate.will) || 0);
  }

  const proposedWillValue = (willCash) + 
    (willLand * landValuePerUnit) + 
    (willGold * goldRatePerUnit) + 
    (willSilver * silverRatePerUnit);

  let willScalingFactor = 1;
  if (proposedWillValue > maxWasiyyahAllowedValue && proposedWillValue > 0) {
    willScalingFactor = maxWasiyyahAllowedValue / proposedWillValue;
    warnings.push('error_will_limit');
  }

  const finalWillCash = willCash * willScalingFactor;
  const finalWillLand = willLand * willScalingFactor;
  const finalWillGold = willGold * willScalingFactor;
  const finalWillSilver = willSilver * willScalingFactor;

  // Deduct wasiyyah from assets
  let distributableCash = Math.max(0, netCash - finalWillCash);
  let distributableLand = Math.max(0, netLand - finalWillLand);
  let distributableGold = Math.max(0, netGold - finalWillGold);
  let distributableSilver = Math.max(0, netSilver - finalWillSilver);

  // If cash bequest exceeded net cash, absorb unpaid cash bequest from non-cash assets
  if (finalWillCash > netCash) {
    const unfulfilledCashWill = finalWillCash - netCash;
    const remainingNonCashVal = (distributableLand * landValuePerUnit) + 
      (distributableGold * goldRatePerUnit) + 
      (distributableSilver * silverRatePerUnit);
    if (remainingNonCashVal > 0) {
      const willDeficitRatio = Math.min(1, unfulfilledCashWill / remainingNonCashVal);
      distributableLand = Math.max(0, distributableLand * (1 - willDeficitRatio));
      distributableGold = Math.max(0, distributableGold * (1 - willDeficitRatio));
      distributableSilver = Math.max(0, distributableSilver * (1 - willDeficitRatio));
    }
  }

  const totalLandValue = distributableLand * landValuePerUnit;
  const totalGoldValue = distributableGold * goldRatePerUnit;
  const totalSilverValue = distributableSilver * silverRatePerUnit;
  const grandNetEstateValue = distributableCash + totalLandValue + totalGoldValue + totalSilverValue;

  // Step 3: Heirs mapping & blocking
  const hMap = heirs.reduce((acc, h) => { acc[h.type] = h.count; return acc; }, {} as Record<string, number>);
  const getCount = (t: string) => hMap[t] || 0;

  const blocked = new Set<string>();

  const husband = deceasedGender === 'Female' ? getCount('Husband') : 0;
  const wives = deceasedGender === 'Male' ? getCount('Wives') : 0;
  const sons = getCount('Sons');
  const daughters = getCount('Daughters');
  const gsons = getCount('Grandsons');
  const gdaughters = getCount('Granddaughters');
  const father = getCount('Father');
  const mother = getCount('Mother');
  const gfather = getCount('Grandfather');
  const patGmother = getCount('Paternal Grandmother');
  const matGmother = getCount('Maternal Grandmother');

  const fullBrothers = getCount('Full Brothers');
  const fullSisters = getCount('Full Sisters');
  const patBrothers = getCount('Paternal Brothers');
  const patSisters = getCount('Paternal Sisters');
  const matBrothers = getCount('Maternal Brothers');
  const matSisters = getCount('Maternal Sisters');

  const hasDescendant = sons > 0 || daughters > 0 || gsons > 0 || gdaughters > 0;
  const hasMaleDescendant = sons > 0 || gsons > 0;
  const hasFemaleDescendantOnly = (daughters > 0 || gdaughters > 0) && !hasMaleDescendant;

  // Blocking Rules (حجب الحرمان)
  // Father blocks: Grandfather, Paternal Grandmother, and all siblings
  if (father > 0) {
    ['Grandfather', 'Paternal Grandmother', 'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters'].forEach(t => blocked.add(t));
  }
  // Mother blocks all grandmothers
  if (mother > 0) {
    ['Paternal Grandmother', 'Maternal Grandmother'].forEach(t => blocked.add(t));
  }
  // Sons block: Grandsons, Granddaughters, all siblings, and all further agnates
  if (sons > 0) {
    [
      'Grandsons', 'Granddaughters', 
      'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters', 
      'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 
      'Full Paternal Uncles', 'Paternal Paternal Uncles', 
      'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'
    ].forEach(t => blocked.add(t));
  }
  // Grandsons block further grandchildren, siblings, nephews, uncles, cousins
  if (gsons > 0) {
    [
      'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters', 'Maternal Brothers', 'Maternal Sisters', 
      'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 
      'Full Paternal Uncles', 'Paternal Paternal Uncles', 
      'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'
    ].forEach(t => blocked.add(t));
  }
  // Any descendant or male ascendant blocks maternal siblings
  if (hasDescendant || father > 0 || (gfather > 0 && !blocked.has('Grandfather'))) {
    ['Maternal Brothers', 'Maternal Sisters'].forEach(t => blocked.add(t));
  }
  // 2 or more daughters block granddaughters UNLESS accompanied by a grandson (who makes them asabah)
  if (daughters >= 2 && gsons === 0) {
    blocked.add('Granddaughters');
  }
  // Full brother blocks paternal siblings, nephews, uncles, cousins
  if (fullBrothers > 0) {
    [
      'Paternal Brothers', 'Paternal Sisters', 
      'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 
      'Full Paternal Uncles', 'Paternal Paternal Uncles', 
      'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'
    ].forEach(t => blocked.add(t));
  }
  // 2 or more full sisters block paternal sisters UNLESS accompanied by a paternal brother
  if (fullSisters >= 2 && patBrothers === 0) {
    blocked.add('Paternal Sisters');
  }

  // Full sisters as Asabah with daughters/granddaughters block paternal siblings and further agnates
  const fullSisterAsabahWithDaughter = (daughters > 0 || gdaughters > 0) && fullSisters > 0 && fullBrothers === 0 && !hasMaleDescendant && father === 0 && gfather === 0;
  if (fullSisterAsabahWithDaughter) {
    [
      'Paternal Brothers', 'Paternal Sisters', 
      'Full Nephews', 'Paternal Nephews', 'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 
      'Full Paternal Uncles', 'Paternal Paternal Uncles', 
      'Full Cousins', 'Paternal Cousins', 'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'
    ].forEach(t => blocked.add(t));
  }

  // Step 4: Fixed Sharers (أصحاب الفروض)
  interface SharerDef {
    heirKey: HeirType;
    num: number;
    den: number;
    symbol: string;
    count: number;
  }

  const sharers: SharerDef[] = [];

  // Husband
  if (husband > 0) {
    sharers.push({ heirKey: 'Husband', num: 1, den: hasDescendant ? 4 : 2, symbol: hasDescendant ? '1/4' : '1/2', count: 1 });
  }

  // Wives (share equally in 1/8 or 1/4)
  if (wives > 0) {
    sharers.push({ heirKey: 'Wives', num: 1, den: hasDescendant ? 8 : 4, symbol: hasDescendant ? '1/8' : '1/4', count: wives });
  }

  // Mother
  if (mother > 0) {
    const totalSiblings = fullBrothers + fullSisters + patBrothers + patSisters + matBrothers + matSisters;
    const motherFraction = (hasDescendant || totalSiblings >= 2) ? 6 : 3;
    sharers.push({ heirKey: 'Mother', num: 1, den: motherFraction, symbol: motherFraction === 6 ? '1/6' : '1/3', count: 1 });
  }

  // Father (Fixed share 1/6 when descendants exist)
  if (father > 0 && hasDescendant) {
    sharers.push({ heirKey: 'Father', num: 1, den: 6, symbol: '1/6', count: 1 });
  }

  // Grandfather (Fixed share 1/6 when descendants exist and father absent)
  if (gfather > 0 && !blocked.has('Grandfather') && hasDescendant) {
    sharers.push({ heirKey: 'Grandfather', num: 1, den: 6, symbol: '1/6', count: 1 });
  }

  // Grandmothers (share 1/6 equally)
  const eligiblePaternalGmother = patGmother > 0 && !blocked.has('Paternal Grandmother');
  const eligibleMaternalGmother = matGmother > 0 && !blocked.has('Maternal Grandmother');
  if (eligiblePaternalGmother && eligibleMaternalGmother) {
    sharers.push({ heirKey: 'Paternal Grandmother', num: 1, den: 12, symbol: '1/12', count: 1 });
    sharers.push({ heirKey: 'Maternal Grandmother', num: 1, den: 12, symbol: '1/12', count: 1 });
  } else if (eligiblePaternalGmother) {
    sharers.push({ heirKey: 'Paternal Grandmother', num: 1, den: 6, symbol: '1/6', count: 1 });
  } else if (eligibleMaternalGmother) {
    sharers.push({ heirKey: 'Maternal Grandmother', num: 1, den: 6, symbol: '1/6', count: 1 });
  }

  // Daughters (when NO sons)
  if (daughters > 0 && sons === 0) {
    if (daughters === 1) {
      sharers.push({ heirKey: 'Daughters', num: 1, den: 2, symbol: '1/2', count: 1 });
    } else {
      sharers.push({ heirKey: 'Daughters', num: 2, den: 3, symbol: '2/3', count: daughters });
    }
  }

  // Granddaughters (when NO sons and NO grandsons)
  if (gdaughters > 0 && sons === 0 && gsons === 0 && !blocked.has('Granddaughters')) {
    if (daughters === 0) {
      if (gdaughters === 1) {
        sharers.push({ heirKey: 'Granddaughters', num: 1, den: 2, symbol: '1/2', count: 1 });
      } else {
        sharers.push({ heirKey: 'Granddaughters', num: 2, den: 3, symbol: '2/3', count: gdaughters });
      }
    } else if (daughters === 1) {
      // Completing the 2/3 (تكملة الثلثين)
      sharers.push({ heirKey: 'Granddaughters', num: 1, den: 6, symbol: '1/6', count: gdaughters });
    }
  }

  // Full Sisters (when NO descendants, NO father, NO grandfather, NO full brothers)
  if (fullSisters > 0 && !hasDescendant && father === 0 && gfather === 0 && fullBrothers === 0 && !blocked.has('Full Sisters')) {
    if (fullSisters === 1) {
      sharers.push({ heirKey: 'Full Sisters', num: 1, den: 2, symbol: '1/2', count: 1 });
    } else {
      sharers.push({ heirKey: 'Full Sisters', num: 2, den: 3, symbol: '2/3', count: fullSisters });
    }
  }

  // Paternal Sisters (when NO descendants, NO father, NO grandfather, NO brothers, NO full sisters)
  if (patSisters > 0 && !hasDescendant && father === 0 && gfather === 0 && fullBrothers === 0 && patBrothers === 0 && !blocked.has('Paternal Sisters')) {
    if (fullSisters === 0) {
      if (patSisters === 1) {
        sharers.push({ heirKey: 'Paternal Sisters', num: 1, den: 2, symbol: '1/2', count: 1 });
      } else {
        sharers.push({ heirKey: 'Paternal Sisters', num: 2, den: 3, symbol: '2/3', count: patSisters });
      }
    } else if (fullSisters === 1) {
      // Completing the 2/3
      sharers.push({ heirKey: 'Paternal Sisters', num: 1, den: 6, symbol: '1/6', count: patSisters });
    }
  }

  // Maternal Siblings (when no descendants and no male ascendants, share 1/6 or 1/3 equally)
  const totalMatSiblings = (blocked.has('Maternal Brothers') ? 0 : matBrothers) + (blocked.has('Maternal Sisters') ? 0 : matSisters);
  if (totalMatSiblings === 1) {
    if (matBrothers === 1) sharers.push({ heirKey: 'Maternal Brothers', num: 1, den: 6, symbol: '1/6', count: 1 });
    if (matSisters === 1) sharers.push({ heirKey: 'Maternal Sisters', num: 1, den: 6, symbol: '1/6', count: 1 });
  } else if (totalMatSiblings >= 2) {
    if (matBrothers > 0) {
      sharers.push({ heirKey: 'Maternal Brothers', num: matBrothers, den: totalMatSiblings * 3, symbol: `${matBrothers}/${totalMatSiblings * 3}`, count: matBrothers });
    }
    if (matSisters > 0) {
      sharers.push({ heirKey: 'Maternal Sisters', num: matSisters, den: totalMatSiblings * 3, symbol: `${matSisters}/${totalMatSiblings * 3}`, count: matSisters });
    }
  }

  // Step 5: Common Denominator and Aul (العول)
  const gcd = (a: number, b: number): number => b === 0 ? a : gcd(b, a % b);
  const lcm = (a: number, b: number): number => (a === 0 || b === 0) ? 0 : Math.round((a * b) / gcd(a, b));

  const commonDenom = sharers.length > 0 ? sharers.reduce((acc, s) => lcm(acc, s.den), 1) : 1;
  const totalNum = sharers.reduce((acc, s) => acc + (s.num * (commonDenom / s.den)), 0);

  const aulApplied = totalNum > commonDenom;
  const finalDenom = aulApplied ? totalNum : commonDenom;

  const result: CalculationResult = {
    shares: [],
    netEstate: grandNetEstateValue,
    distributableCash,
    totalLand: distributableLand,
    totalGold: distributableGold,
    totalSilver: distributableSilver,
    totalLandValue,
    totalGoldValue,
    totalSilverValue,
    summary: { fixedTotal: 0, residueTotal: 0, aulApplied, raddApplied: false },
    warnings
  };

  // Build fixed shares
  sharers.forEach(s => {
    const ratio = (s.num * (commonDenom / s.den)) / finalDenom;
    result.shares.push(createShareItem(
      s.heirKey,
      'Fixed',
      s.symbol,
      ratio,
      distributableCash,
      distributableLand,
      distributableGold,
      distributableSilver,
      s.count,
      lang,
      landUnit,
      goldUnit,
      silverUnit,
      landValuePerUnit,
      goldRatePerUnit,
      silverRatePerUnit
    ));
    result.summary.fixedTotal += ratio;
  });

  // Step 6: Residue (العصبات) and Radd (الرد)
  let resRatio = Math.max(0, 1 - result.summary.fixedTotal);

  if (resRatio > 0.000001) {
    let asabahHandled = false;

    // 1. Sons (+ Daughters, 2:1)
    if (sons > 0) {
      const units = (sons * 2) + daughters;
      const sonRatio = resRatio * (sons * 2 / units);
      result.shares.push(createShareItem('Sons', 'Asabah', '2:1', sonRatio, distributableCash, distributableLand, distributableGold, distributableSilver, sons, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      if (daughters > 0) {
        const daughterRatio = resRatio * (daughters / units);
        result.shares.push(createShareItem('Daughters', 'Asabah', '2:1', daughterRatio, distributableCash, distributableLand, distributableGold, distributableSilver, daughters, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      }
      asabahHandled = true;
    }
    // 2. Grandsons (+ Granddaughters, 2:1)
    else if (gsons > 0) {
      const units = (gsons * 2) + gdaughters;
      const gsonRatio = resRatio * (gsons * 2 / units);
      result.shares.push(createShareItem('Grandsons', 'Asabah', '2:1', gsonRatio, distributableCash, distributableLand, distributableGold, distributableSilver, gsons, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      if (gdaughters > 0) {
        const gdaughterRatio = resRatio * (gdaughters / units);
        result.shares.push(createShareItem('Granddaughters', 'Asabah', '2:1', gdaughterRatio, distributableCash, distributableLand, distributableGold, distributableSilver, gdaughters, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      }
      asabahHandled = true;
    }
    // 3. Father (Residue when no male descendants)
    else if (father > 0) {
      const existingFatherIndex = result.shares.findIndex(s => s.heirKey === 'Father');
      if (existingFatherIndex >= 0) {
        // Merge fixed 1/6 + Asabah into single clear card
        const existing = result.shares[existingFatherIndex];
        const combinedRatio = existing.ratio + resRatio;
        result.shares[existingFatherIndex] = createShareItem(
          'Father',
          'Fixed + Asabah',
          '1/6 + Asabah',
          combinedRatio,
          distributableCash,
          distributableLand,
          distributableGold,
          distributableSilver,
          1,
          lang,
          landUnit,
          goldUnit,
          silverUnit,
          landValuePerUnit,
          goldRatePerUnit,
          silverRatePerUnit
        );
      } else {
        result.shares.push(createShareItem('Father', 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, 1, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      }
      asabahHandled = true;
    }
    // 4. Grandfather (Residue when no father and no male descendants)
    else if (gfather > 0 && !blocked.has('Grandfather')) {
      const existingGfIndex = result.shares.findIndex(s => s.heirKey === 'Grandfather');
      if (existingGfIndex >= 0) {
        const existing = result.shares[existingGfIndex];
        const combinedRatio = existing.ratio + resRatio;
        result.shares[existingGfIndex] = createShareItem(
          'Grandfather',
          'Fixed + Asabah',
          '1/6 + Asabah',
          combinedRatio,
          distributableCash,
          distributableLand,
          distributableGold,
          distributableSilver,
          1,
          lang,
          landUnit,
          goldUnit,
          silverUnit,
          landValuePerUnit,
          goldRatePerUnit,
          silverRatePerUnit
        );
      } else {
        result.shares.push(createShareItem('Grandfather', 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, 1, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      }
      asabahHandled = true;
    }
    // 5. Full Brothers (+ Full Sisters, 2:1)
    else if (fullBrothers > 0) {
      const units = (fullBrothers * 2) + fullSisters;
      const fbRatio = resRatio * (fullBrothers * 2 / units);
      result.shares.push(createShareItem('Full Brothers', 'Asabah', '2:1', fbRatio, distributableCash, distributableLand, distributableGold, distributableSilver, fullBrothers, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      if (fullSisters > 0) {
        const fsRatio = resRatio * (fullSisters / units);
        result.shares.push(createShareItem('Full Sisters', 'Asabah', '2:1', fsRatio, distributableCash, distributableLand, distributableGold, distributableSilver, fullSisters, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      }
      asabahHandled = true;
    }
    // 6. Full Sisters as Asabah ma'a al-ghayr with daughters/granddaughters
    else if (fullSisters > 0 && (daughters > 0 || gdaughters > 0) && !hasMaleDescendant && father === 0 && gfather === 0) {
      result.shares.push(createShareItem('Full Sisters', 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, fullSisters, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      asabahHandled = true;
    }
    // 7. Paternal Brothers (+ Paternal Sisters, 2:1)
    else if (patBrothers > 0 && !blocked.has('Paternal Brothers')) {
      const units = (patBrothers * 2) + patSisters;
      const pbRatio = resRatio * (patBrothers * 2 / units);
      result.shares.push(createShareItem('Paternal Brothers', 'Asabah', '2:1', pbRatio, distributableCash, distributableLand, distributableGold, distributableSilver, patBrothers, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      if (patSisters > 0) {
        const psRatio = resRatio * (patSisters / units);
        result.shares.push(createShareItem('Paternal Sisters', 'Asabah', '2:1', psRatio, distributableCash, distributableLand, distributableGold, distributableSilver, patSisters, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      }
      asabahHandled = true;
    }
    // 8. Paternal Sisters as Asabah with daughters
    else if (patSisters > 0 && (daughters > 0 || gdaughters > 0) && !hasMaleDescendant && father === 0 && gfather === 0 && fullSisters === 0 && !blocked.has('Paternal Sisters')) {
      result.shares.push(createShareItem('Paternal Sisters', 'Asabah', 'Asabah', resRatio, distributableCash, distributableLand, distributableGold, distributableSilver, patSisters, lang, landUnit, goldUnit, silverUnit, landValuePerUnit, goldRatePerUnit, silverRatePerUnit));
      asabahHandled = true;
    }
    // 9. Further male agnates in exact Sharia order
    else {
      const furtherAgnates: HeirType[] = [
        'Full Nephews', 'Paternal Nephews', 
        'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 
        'Full Paternal Uncles', 'Paternal Paternal Uncles', 
        'Full Cousins', 'Paternal Cousins', 
        'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 
        'Full Cousin’s Grandsons', 'Paternal Cousin’s Grandsons'
      ];

      for (const agnate of furtherAgnates) {
        const count = getCount(agnate);
        if (count > 0 && !blocked.has(agnate)) {
          result.shares.push(createShareItem(
            agnate, 
            'Asabah', 
            'Asabah', 
            resRatio, 
            distributableCash, 
            distributableLand, 
            distributableGold, 
            distributableSilver, 
            count, 
            lang, 
            landUnit, 
            goldUnit, 
            silverUnit, 
            landValuePerUnit, 
            goldRatePerUnit, 
            silverRatePerUnit
          ));
          asabahHandled = true;
          break;
        }
      }
    }

    if (asabahHandled) {
      result.summary.residueTotal = resRatio;
    } else {
      // Step 7: Apply RADD (الرد)
      // When sum of shares < 1 and no Asabah exists:
      // Return residue proportionally to all sharers EXCEPT spouses (Husband & Wife).
      const sharersForRadd = result.shares.filter(s => s.heirKey !== 'Husband' && s.heirKey !== 'Wives');
      
      if (sharersForRadd.length > 0) {
        result.summary.raddApplied = true;
        
        // Sum of non-spouse shares
        const sumNonSpouseRatio = sharersForRadd.reduce((sum, s) => sum + s.ratio, 0);

        // Spouse ratio (if any)
        const spouseShare = result.shares.find(s => s.heirKey === 'Husband' || s.heirKey === 'Wives');
        const spouseRatio = spouseShare ? spouseShare.ratio : 0;
        const availableForRadd = 1 - spouseRatio;

        if (sumNonSpouseRatio > 0) {
          result.shares.forEach((s, idx) => {
            if (s.heirKey !== 'Husband' && s.heirKey !== 'Wives') {
              const newRatio = (s.ratio / sumNonSpouseRatio) * availableForRadd;
              result.shares[idx] = createShareItem(
                s.heirKey,
                'Fixed + Radd',
                ratioToFraction(newRatio),
                newRatio,
                distributableCash,
                distributableLand,
                distributableGold,
                distributableSilver,
                s.count,
                lang,
                landUnit,
                goldUnit,
                silverUnit,
                landValuePerUnit,
                goldRatePerUnit,
                silverRatePerUnit
              );
            }
          });
        }
      }
    }
  }

  // Step 8: Add Excluded (محجوب) heirs so the user has complete visibility
  HEIR_ORDER.forEach(t => {
    const count = getCount(t);
    const heirTypeKey = t as HeirType;
    if (count > 0 && !result.shares.some(s => s.heirKey === heirTypeKey)) {
      result.shares.push({
        label: HEIR_METADATA[t] ? HEIR_METADATA[t][lang] : t,
        heirKey: heirTypeKey,
        type: 'Excluded',
        symbol: '—',
        fraction: '0',
        percentage: '0.00%',
        ratio: 0,
        amount: 0,
        cashAmount: 0,
        landAmount: 0,
        goldAmount: 0,
        silverAmount: 0,
        count,
        amountEach: 0,
        cashEach: 0,
        landEach: 0,
        goldEach: 0,
        silverEach: 0,
        landValueEach: 0,
        goldValueEach: 0,
        silverValueEach: 0,
        goldUnit,
        silverUnit,
        landUnit
      });
    }
  });

  return result;
};

const createShareItem = (
  type: HeirType,
  sType: string,
  sym: string,
  ratio: number,
  cash: number,
  land: number,
  gold: number,
  silver: number,
  count: number,
  lang: Language,
  landUnit: LandUnit,
  goldUnit: MetalUnit,
  silverUnit: MetalUnit,
  landValuePerUnit: number,
  goldRatePerUnit: number,
  silverRatePerUnit: number
): ShareResultItem => {
  const safeCount = Math.max(1, count);
  const totalLandVal = land * landValuePerUnit;
  const totalGoldVal = gold * goldRatePerUnit;
  const totalSilverVal = silver * silverRatePerUnit;
  const grandTotalEstate = cash + totalLandVal + totalGoldVal + totalSilverVal;

  const totalShareAmount = grandTotalEstate * ratio;
  const shareCash = cash * ratio;
  const shareLand = land * ratio;
  const shareGold = gold * ratio;
  const shareSilver = silver * ratio;

  const landValEach = (shareLand * landValuePerUnit) / safeCount;
  const goldValEach = (shareGold * goldRatePerUnit) / safeCount;
  const silverValEach = (shareSilver * silverRatePerUnit) / safeCount;
  const cashEach = shareCash / safeCount;
  const amountEach = totalShareAmount / safeCount;

  return {
    label: HEIR_METADATA[type] ? HEIR_METADATA[type][lang] : type,
    heirKey: type,
    type: sType,
    symbol: sym,
    fraction: ratioToFraction(ratio),
    percentage: `${(ratio * 100).toFixed(2)}%`,
    ratio,
    amount: totalShareAmount,
    cashAmount: shareCash,
    landAmount: shareLand,
    goldAmount: shareGold,
    silverAmount: shareSilver,
    count: safeCount,
    amountEach,
    cashEach,
    landEach: shareLand / safeCount,
    goldEach: shareGold / safeCount,
    silverEach: shareSilver / safeCount,
    landValueEach: landValEach,
    goldValueEach: goldValEach,
    silverValueEach: silverValEach,
    goldUnit,
    silverUnit,
    landUnit
  };
};

const ratioToFraction = (r: number): string => {
  if (r <= 0.000001) return '0';
  if (Math.abs(r - 1) < 0.0001) return '1';
  
  const tol = 1.0e-5;
  let h1 = 1, h2 = 0, k1 = 0, k2 = 1, b = r;
  do {
    const a = Math.floor(b);
    let aux = h1; h1 = a * h1 + h2; h2 = aux;
    aux = k1; k1 = a * k1 + k2; k2 = aux;
    if (Math.abs(b - a) < tol) break;
    b = 1 / (b - a);
  } while (Math.abs(r - h1 / k1) > r * tol && k1 < 10000);

  return `${h1}/${k1}`;
};