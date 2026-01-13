export enum AppStep {
  LANGUAGE_SELECT = 'LANGUAGE_SELECT',
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

export type Language = 'en' | 'ml' | 'ta' | 'ar';

export const HEIR_ORDER: string[] = [
  'Husband', 'Wives', 'Sons', 'Daughters', 'Grandsons', 'Granddaughters',
  'Father', 'Mother', 'Grandfather', 'Paternal Grandmother', 'Maternal Grandmother',
  'Full Brothers', 'Full Sisters', 'Paternal Brothers', 'Paternal Sisters',
  'Maternal Brothers', 'Maternal Sisters', 'Full Nephews', 'Paternal Nephews',
  'Full Nephew’s Sons', 'Paternal Nephew’s Sons', 'Full Paternal Uncles',
  'Paternal Paternal Uncles', 'Full Cousins', 'Paternal Cousins',
  'Full Cousin’s Sons', 'Paternal Cousin’s Sons', 'Full Cousin’s Grandsons',
  'Paternal Cousin’s Grandsons'
];

export const HEIR_METADATA: Record<string, { en: string, ml: string, ta: string, ar: string, max?: number }> = {
  'Husband': { en: 'Husband', ml: 'ഭർത്താവ്', ta: 'கணவர்', ar: 'الزوج', max: 1 },
  'Wives': { en: 'Wives', ml: 'ഭാര്യമാർ', ta: 'மனைவிகள்', ar: 'الزوجات', max: 4 },
  'Sons': { en: 'Sons', ml: 'പുത്രന്മാർ', ta: 'மகன்கள்', ar: 'الأبناء' },
  'Daughters': { en: 'Daughters', ml: 'പുത്രിമാർ', ta: 'மகள்கள்', ar: 'البنات' },
  'Grandsons': { en: 'Grandsons', ml: 'പുത്ര പുത്രന്മാർ', ta: 'பேரன்கள்', ar: 'أبناء الابن' },
  'Granddaughters': { en: 'Granddaughters', ml: 'പുത്ര പുത്രിമാർ', ta: 'பேத்திகள்', ar: 'بنات الابن' },
  'Father': { en: 'Father', ml: 'പിതാവ്', ta: 'தந்தை', ar: 'الأب', max: 1 },
  'Mother': { en: 'Mother', ml: 'മാതാവ്', ta: 'தாய்', ar: 'الأم', max: 1 },
  'Grandfather': { en: 'Grandfather', ml: 'പിതാമഹൻ', ta: 'தாத்தா', ar: 'الجد', max: 1 },
  'Paternal Grandmother': { en: 'Paternal Grandmother', ml: 'പിതാമഹി', ta: 'தந்தை வழி பாட்டி', ar: 'الجدة لأب', max: 1 },
  'Maternal Grandmother': { en: 'Maternal Grandmother', ml: 'മാതാമഹി', ta: 'தாய் வழி பாட்டி', ar: 'الجدة لأم', max: 1 },
  'Full Brothers': { en: 'Full Brothers', ml: 'പൂർണ്ണ സഹോദരങ്ങൾ', ta: 'உடன் பிறந்த சகோதரர்கள்', ar: 'الإخوة الأشقاء' },
  'Full Sisters': { en: 'Full Sisters', ml: 'പൂർണ്ണ സഹോദരിമാർ', ta: 'உடன் பிறந்த சகோதரிகள்', ar: 'الأخوات الشقيقات' },
  'Paternal Brothers': { en: 'Paternal Brothers', ml: 'പിതൃവംശ സഹോദരങ്ങൾ', ta: 'தந்தை வழி சகோதரர்கள்', ar: 'الإخوة لأب' },
  'Paternal Sisters': { en: 'Paternal Sisters', ml: 'പിതൃവംശ സഹോദരിമാർ', ta: 'தந்தை வழி சகோதரிகள்', ar: 'الأخوات لأب' },
  'Maternal Brothers': { en: 'Maternal Brothers', ml: 'മാതൃവംശ സഹോദരങ്ങൾ', ta: 'தாய் வழி சகோதரர்கள்', ar: 'الإخوة لأم' },
  'Maternal Sisters': { en: 'Maternal Sisters', ml: 'മാതൃവംശ സഹോദരിമാർ', ta: 'தாய் வழி சகோதரிகள்', ar: 'الأخوات لأم' },
  'Full Nephews': { en: 'Full Nephews', ml: 'പൂർണ്ണ സഹോദരന്റെ പുത്രൻ', ta: 'அண்ணன்/தம்பி மகன்', ar: 'أبناء الأخ الشقيق' },
  'Paternal Nephews': { en: 'Paternal Nephews', ml: 'പിതൃവംശ സഹോദരന്റെ പുത്രൻ', ta: 'தந்தை வழி சகோதரர் மகன்', ar: 'أبناء الأخ لأب' },
  'Full Nephew’s Sons': { en: 'Full Nephew’s Sons', ml: 'പൂർണ്ണ സഹോദരന്റെ പുത്രന്റെ പുത്രൻ', ta: 'பேரன் (சகோதரர் வழி)', ar: 'أبناء ابن الأخ الشقيق' },
  'Paternal Nephew’s Sons': { en: 'Paternal Nephew’s Sons', ml: 'പിതൃവംശ സഹോദരന്റെ പുത്രന്റെ പുത്രൻ', ta: 'தந்தை வழி சகோதரர் பேரன்', ar: 'أبناء ابن الأخ لأب' },
  'Full Paternal Uncles': { en: 'Full Paternal Uncles', ml: 'പിതാവിന്റെ പൂർണ്ണ സഹോദരൻ', ta: 'பெரியப்பா/சித்தப்பா', ar: 'الأعمام الأشقاء' },
  'Paternal Paternal Uncles': { en: 'Paternal Paternal Uncles', ml: 'പിതാവിന്റെ പിതൃവംശ സഹോദരൻ', ta: 'தந்தை வழி மாமாக்கள்', ar: 'الأعمام لأب' },
  'Full Cousins': { en: 'Full Cousins', ml: 'പിതാവിന്റെ പൂർണ്ണ സഹോദരന്റെ പുത്രൻ', ta: 'பெரியப்பா/சித்தப்பா மகன்', ar: 'أبناء العم الشقيق' },
  'Paternal Cousins': { en: 'Paternal Cousins', ml: 'പിതാവിന്റെ പിതൃവംശ സഹോദരന്റെ പുത്രൻ', ta: 'தந்தை வழி உறவினர் மகன்', ar: 'أبناء العم لأب' },
  'Full Cousin’s Sons': { en: 'Full Cousin’s Sons', ml: 'പിതാവിന്റെ പൂർണ്ണ സഹോദരന്റെ പുത്രന്റെ പുത്രൻ', ta: 'உறவினர் பேரன்', ar: 'أبناء ابن العم الشقيق' },
  'Paternal Cousin’s Sons': { en: 'Paternal Cousin’s Sons', ml: 'പിതാവിന്റെ പിതൃവംശ സഹോദരന്റെ പുത്രന്റെ പുത്രൻ', ta: 'தந்தை வழி உறவினர் பேரன்', ar: 'أبناء ابن العم لأب' },
  'Full Cousin’s Grandsons': { en: 'Full Cousin’s Grandsons', ml: 'പിതാവിന്റെ പൂർണ്ണ സഹോദരന്റെ പുത്രന്റെ പുത്രന്റെ പുത്രൻ', ta: 'உறவினர் கொள்ளுப்பேரன்', ar: 'أبناء ابن ابن العم الشقيق' },
  'Paternal Cousin’s Grandsons': { en: 'Paternal Cousin’s Grandsons', ml: 'പിതാവിന്റെ പിതൃവംശ സഹോദരന്റെ പുത്രന്റെ പുത്രന്റെ പുത്രൻ', ta: 'தந்தை വഴി உறவினர் கொள்ளுப்பேரன்', ar: 'أبناء ابن ابن العم لأب' }
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
  shares: Array<{ 
    label: string, 
    type: string, 
    symbol: string, 
    fraction: string, 
    percentage: string, 
    amount: number, 
    count: number,
    amountEach: number 
  }>;
  netEstate: number;
  summary: {
    fixedTotal: number;
    residueTotal: number;
    aulApplied: boolean;
    raddApplied: boolean;
  };
  warnings: string[];
}
