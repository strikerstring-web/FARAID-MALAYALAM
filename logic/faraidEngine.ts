
import { Heir, CalculationResult, HeirType, HEIR_METADATA, EstateData } from '../types';

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

  const hasChildren = (heirMap['Son'] || 0) > 0 || (heirMap['Daughter'] || 0) > 0;
  const siblingCount = (heirMap['Full Brother'] || 0) + (heirMap['Full Sister'] || 0) + 
                       (heirMap['Paternal Brother'] || 0) + (heirMap['Paternal Sister'] || 0) + 
                       (heirMap['Maternal Brother'] || 0) + (heirMap['Maternal Sister'] || 0);
  const hasMultipleSiblings = siblingCount >= 2;

  let totalFixedFraction = 0;

  // 1. Husband
  if (deceasedGender === 'Female' && heirMap['Husband']) {
    const fraction = hasChildren ? 0.25 : 0.5;
    totalFixedFraction += fraction;
    result.shares.push({
      label: 'ഭർത്താവ്',
      fraction: hasChildren ? '1/4' : '1/2',
      percentage: hasChildren ? '25%' : '50%',
      amount: netEstate * fraction
    });
  }

  // 2. Wife
  if (deceasedGender === 'Male' && heirMap['Wife']) {
    const fraction = hasChildren ? 0.125 : 0.25;
    totalFixedFraction += fraction;
    result.shares.push({
      label: heirMap['Wife'] > 1 ? 'ഭാര്യമാർ' : 'ഭാര്യ',
      fraction: hasChildren ? '1/8 (കൂട്ടായി)' : '1/4 (കൂട്ടായി)',
      percentage: hasChildren ? '12.5%' : '25%',
      amount: netEstate * fraction
    });
  }

  // 3. Father
  if (heirMap['Father']) {
    if (hasChildren) {
      const fraction = 1/6;
      totalFixedFraction += fraction;
      result.shares.push({
        label: 'പിതാവ്',
        fraction: '1/6',
        percentage: '16.66%',
        amount: netEstate * fraction
      });
    }
    // If no children, Father acts as Asaba (calculated later)
  }

  // 4. Mother
  if (heirMap['Mother']) {
    let fraction = 1/3;
    let fracLabel = '1/3';
    let percLabel = '33.33%';

    if (hasChildren || hasMultipleSiblings) {
      fraction = 1/6;
      fracLabel = '1/6';
      percLabel = '16.66%';
    } else if (
      (heirMap['Husband'] || heirMap['Wife']) && 
      heirMap['Father'] && 
      !hasChildren && 
      !hasMultipleSiblings
    ) {
      // Special Umariyyatan case
      const spouseShare = deceasedGender === 'Female' ? 0.5 : 0.25;
      fraction = (1 - spouseShare) / 3;
      fracLabel = 'ബാക്കിയുള്ളതിന്റെ 1/3';
      percLabel = `${(fraction * 100).toFixed(2)}%`;
    }

    totalFixedFraction += fraction;
    result.shares.push({
      label: 'മാതാവ്',
      fraction: fracLabel,
      percentage: percLabel,
      amount: netEstate * fraction
    });
  }

  // 5. Daughters (if no sons)
  if (heirMap['Daughter'] > 0 && !heirMap['Son']) {
    if (heirMap['Daughter'] === 1) {
      const fraction = 0.5;
      totalFixedFraction += fraction;
      result.shares.push({
        label: 'പുത്രി',
        fraction: '1/2',
        percentage: '50%',
        amount: netEstate * fraction
      });
    } else {
      const fraction = 2/3;
      totalFixedFraction += fraction;
      result.shares.push({
        label: 'പുത്രിമാർ',
        fraction: '2/3 (കൂട്ടായി)',
        percentage: '66.66%',
        amount: netEstate * fraction
      });
    }
  }

  // 6. Maternal Siblings
  const maternalCount = (heirMap['Maternal Brother'] || 0) + (heirMap['Maternal Sister'] || 0);
  if (maternalCount > 0 && !hasChildren && !heirMap['Father'] && !heirMap['Paternal Grandfather']) {
    if (maternalCount === 1) {
      const fraction = 1/6;
      totalFixedFraction += fraction;
      result.shares.push({
        label: 'മാതൃ സഹോദരൻ/സഹോദരി',
        fraction: '1/6',
        percentage: '16.66%',
        amount: netEstate * fraction
      });
    } else {
      const fraction = 1/3;
      totalFixedFraction += fraction;
      result.shares.push({
        label: 'മാതൃ സഹോദരങ്ങൾ',
        fraction: '1/3 (കൂട്ടായി)',
        percentage: '33.33%',
        amount: netEstate * fraction
      });
    }
  }

  // Residue (Asaba)
  let residue = Math.max(0, 1 - totalFixedFraction);

  if (residue > 0) {
    if (heirMap['Son']) {
      const sons = heirMap['Son'];
      const daughters = heirMap['Daughter'] || 0;
      const units = (sons * 2) + daughters;
      
      result.shares.push({
        label: sons > 1 ? 'പുത്രന്മാർ' : 'പുത്രൻ',
        fraction: 'ബാക്കി (2:1 അനുപാതത്തിൽ)',
        percentage: `${((residue * (sons * 2 / units)) * 100).toFixed(2)}%`,
        amount: netEstate * residue * (sons * 2 / units)
      });
      
      if (daughters > 0) {
        result.shares.push({
          label: daughters > 1 ? 'പുത്രിമാർ' : 'പുത്രി',
          fraction: 'ബാക്കി (2:1 അനുപാതത്തിൽ)',
          percentage: `${((residue * (daughters / units)) * 100).toFixed(2)}%`,
          amount: netEstate * residue * (daughters / units)
        });
      }
      residue = 0;
    } else if (heirMap['Father'] && !hasChildren) {
      result.shares.push({
        label: 'പിതാവ്',
        fraction: 'ബാക്കി മുഴുവൻ',
        percentage: `${(residue * 100).toFixed(2)}%`,
        amount: netEstate * residue
      });
      residue = 0;
    } else if (heirMap['Full Brother'] || heirMap['Full Sister']) {
      const brothers = heirMap['Full Brother'] || 0;
      const sisters = heirMap['Full Sister'] || 0;
      const units = (brothers * 2) + sisters;
      
      if (units > 0) {
        result.shares.push({
          label: 'സഹോദരങ്ങൾ (Full)',
          fraction: 'ബാക്കി (2:1 ratio)',
          percentage: `${(residue * 100).toFixed(2)}%`,
          amount: netEstate * residue
        });
        residue = 0;
      }
    }
  }

  // Detect Aul (Oversubscription)
  if (totalFixedFraction > 1) {
    result.complex = true;
    result.warnings.push("സ്വത്ത് ഓഹരികൾ ഒത്തുപോകാത്ത സങ്കീർണ്ണമായ സാഹചര്യം (Aul). കൃത്യമായ വിവരങ്ങൾക്കായി ഒരു പണ്ഡിതനെ സമീപിക്കുക.");
  }

  // Complex Triggers
  if (heirs.length > 5 || result.complex) {
    result.complex = true;
  }

  return result;
};
