
export enum AppStep {
  WELCOME = 'WELCOME',
  DESCRIPTION = 'DESCRIPTION',
  HADITH = 'HADITH',
  AYAH = 'AYAH',
  RULES = 'RULES',
  ASSETS = 'ASSETS',
  GENDER = 'GENDER',
  SELECTION = 'SELECTION',
  RESULT = 'RESULT'
}

export const HEIR_METADATA: Record<string, { ml: string, category: string, max?: number }> = {
  'Husband': { ml: 'ഭർത്താവ്', category: 'പ്രാഥമിക കുടുംബം', max: 1 },
  'Wife': { ml: 'ഭാര്യമാർ', category: 'പ്രാഥമിക കുടുംബം', max: 4 },
  'Son': { ml: 'പുത്രന്മാർ', category: 'പ്രാഥമിക കുടുംബം' },
  'Daughter': { ml: 'പുത്രിമാർ', category: 'പ്രാഥമിക കുടുംബം' },
  'Father': { ml: 'പിതാവ്', category: 'മാതാപിതാക്കൾ', max: 1 },
  'Mother': { ml: 'മാതാവ്', category: 'മാതാപിതാക്കൾ', max: 1 },
  'Paternal Grandfather': { ml: 'പിതാമഹൻ (പിതാവിന്റെ പിതാവ്)', category: 'മാതാപിതാക്കൾ', max: 1 },
  'Paternal Grandmother': { ml: 'പിതാമഹി (പിതാവിന്റെ മാതാവ്)', category: 'മാതാപിതാക്കൾ', max: 1 },
  'Maternal Grandmother': { ml: 'മാതാമഹി (മാതാവിന്റെ മാതാവ്)', category: 'മാതാപിതാക്കൾ', max: 1 },
  'Full Brother': { ml: 'സഹോദരന്മാർ (Full)', category: 'സഹോദരങ്ങൾ' },
  'Full Sister': { ml: 'സഹോദരിമാർ (Full)', category: 'സഹോദരങ്ങൾ' },
  'Paternal Brother': { ml: 'പിതൃ സഹോദരന്മാർ', category: 'സഹോദരങ്ങൾ' },
  'Paternal Sister': { ml: 'പിതൃ സഹോദരിമാർ', category: 'സഹോദരങ്ങൾ' },
  'Maternal Brother': { ml: 'മാതൃ സഹോദരന്മാർ', category: 'സഹോദരങ്ങൾ' },
  'Maternal Sister': { ml: 'മാതൃ സഹോദരിമാർ', category: 'സഹോദരങ്ങൾ' },
  'Full Paternal Uncle': { ml: 'പിതൃച്ഛന്മാർ (Full Paternal Uncles)', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Paternal Paternal Uncle': { ml: 'പിതൃ പിതൃച്ഛന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Full Nephew': { ml: 'അനുജന്മാർ (Brother’s sons)', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Paternal Nephew': { ml: 'പിതൃ അനുജന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Full Nephew Son': { ml: 'അനുജപുത്രന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Paternal Nephew Son': { ml: 'പിതൃ അനുജപുത്രന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Full Cousin': { ml: 'കുസിന്‍സ് (Full Cousins)', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Paternal Cousin': { ml: 'പിതൃ കുസിന്‍സ്', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Full Cousin Son': { ml: 'കുസിന്‍സ് പുത്രന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Paternal Cousin Son': { ml: 'പിതൃ കുസിന്‍സ് പുത്രന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Full Cousin Grandson': { ml: 'കുസിന്‍സ് പുത്രപുത്രന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' },
  'Paternal Cousin Grandson': { ml: 'പിതൃ കുസിന്‍സ് പുത്രപുത്രന്മാർ', category: 'മറ്റു ബന്ധുക്കൾ' }
};

export type HeirType = keyof typeof HEIR_METADATA;

export interface Heir {
  type: HeirType;
  count: number;
}

export interface EstateData {
  totalAssets: number;
  debts: number;
  funeral: number;
  will: number;
}

export interface CalculationResult {
  shares: Array<{ label: string, fraction: string, percentage: string, amount?: number }>;
  netEstate: number;
  complex: boolean;
  warnings: string[];
}
