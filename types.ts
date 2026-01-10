
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
  // A) നിശ്ചിത വിഹിതക്കാർ (Qur’anic Sharers – 12)
  'Husband': { ml: 'ഭർത്താവ്', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 1 },
  'Wife': { ml: 'ഭാര്യ', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 4 },
  'Father': { ml: 'പിതാവ്', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 1 },
  'Mother': { ml: 'മാതാവ്', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 1 },
  'Paternal Grandfather': { ml: 'പിതാമഹൻ', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 1 },
  'Paternal Grandmother': { ml: 'പിതാമാഹി', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 1 },
  'Maternal Grandmother': { ml: 'മാതാമാഹി', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)', max: 1 },
  'Daughter': { ml: 'മകൾ', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)' },
  'Son’s Daughter': { ml: 'പുത്രന്റെ മകൾ (പൗത്രി)', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)' },
  'Full Sister': { ml: 'പൂർണ്ണ സഹോദരി', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)' },
  'Paternal Sister': { ml: 'പിതൃ സഹോദരി', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)' },
  'Maternal Sister': { ml: 'മാതൃ സഹോദരി', category: 'നിശ്ചിത വിഹിതക്കാർ (Sharers)' },

  // B) അസാബ (Residuaries – 16)
  'Son': { ml: 'പുത്രൻ', category: 'അസാബ (Residuaries)' },
  'Son’s Son': { ml: 'പുത്രന്റെ പുത്രൻ', category: 'അസാബ (Residuaries)' },
  'Sons further down': { ml: 'പുത്രന്റെ പുത്രൻ്റെ പുത്രൻ (താഴേക്ക്)', category: 'അസാബ (Residuaries)' },
  'Full Brother': { ml: 'പൂർണ്ണ സഹോദരൻ', category: 'അസാബ (Residuaries)' },
  'Full Brother’s Son': { ml: 'പൂർണ്ണ സഹോദരൻ്റെ പുത്രൻ', category: 'അസാബ (Residuaries)' },
  'Full Brother’s Sons further down': { ml: 'പൂർണ്ണ സഹോദരൻ്റെ പുത്രന്റെ പുത്രൻ (താഴേക്ക്)', category: 'അസാബ (Residuaries)' },
  'Paternal Brother': { ml: 'പിതൃ സഹോദരൻ', category: 'അസാബ (Residuaries)' },
  'Paternal Brother’s Son': { ml: 'പിതൃ സഹോദരൻ്റെ പുത്രൻ', category: 'അസാബ (Residuaries)' },
  'Paternal Brother’s Sons further down': { ml: 'പിതൃ സഹോദരൻ്റെ പുത്രന്റെ പുത്രൻ (താഴേക്ക്)', category: 'അസാബ (Residuaries)' },
  'Paternal Uncle': { ml: 'പിതൃ മാമൻ', category: 'അസാബ (Residuaries)' },
  'Paternal Uncle’s Son': { ml: 'പിതൃ മാമന്റെ പുത്രൻ', category: 'അസാബ (Residuaries)' },
  'Paternal Uncle’s Son’s Son': { ml: 'പിതൃ മാമന്റെ പുത്രന്റെ പുത്രൻ', category: 'അസാബ (Residuaries)' },
  'Paternal Great Grandfather': { ml: 'പിതൃ പിതാമഹൻ', category: 'അസാബ (Residuaries)', max: 1 },
  'Paternal Great Grandmother': { ml: 'പിതൃ പിതാമാഹി', category: 'അസാബ (Residuaries)', max: 1 },
  'Senior agnatic male': { ml: 'അൽ അംഅം അലാ', category: 'അസാബ (Residuaries)' },
  'Extended male line': { ml: 'അൽ ബാ’ദു', category: 'അസാബ (Residuaries)' },

  // C) ദൂൽ അർഹാം (Dhul-Arham – 2)
  'Maternal Brother': { ml: 'മാതൃ സഹോദരൻ', category: 'ദൂൽ അർഹാം (Dhul-Arham)' },
  'Maternal Uncle': { ml: 'മാതൃ മാമൻ', category: 'ദൂൽ അർഹാം (Dhul-Arham)' }
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
