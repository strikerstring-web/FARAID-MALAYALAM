import React, { useState, useEffect } from 'react';
import { AppStep, Heir, HeirType, CalculationResult, HEIR_METADATA, HEIR_ORDER, EstateData, Language, DetailedAssets, LandUnit, DetailedWasiyyah } from './types';
import { calculateShares } from './logic/faraidEngine';
import { translations } from './translations';
import { QRCodeCanvas } from 'qrcode.react';

/** 
 * ScreenWrapper provides a strict layout grid to prevent UI intersections
 */
interface ScreenWrapperProps {
  children: React.ReactNode;
  currentStep: AppStep;
  nextStep?: AppStep;
  prevStep?: AppStep;
  setStep: (step: AppStep) => void;
  nextLabel?: string;
  disabled?: boolean;
  hideFooter?: boolean;
  lang: Language;
}

const stepsOrder = [
  AppStep.LANGUAGE_SELECT,
  AppStep.WELCOME,
  AppStep.DESCRIPTION,
  AppStep.HADITH,
  AppStep.AYAH,
  AppStep.RULES,
  AppStep.ASSETS,
  AppStep.GENDER,
  AppStep.SELECTION,
  AppStep.RESULT
];

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
  children, 
  currentStep,
  nextStep, 
  prevStep, 
  setStep, 
  nextLabel, 
  disabled = false,
  hideFooter = false,
  lang
}) => {
  const stepIndex = stepsOrder.indexOf(currentStep);
  const t = (key: string) => (translations[lang] as any)[key] || key;
  const isRtl = lang === 'ar';

  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-transparent pt-safe" dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Fixed Progress Header */}
      <div className="shrink-0 z-[70]">
        {stepIndex >= 1 && (
          <div className="h-1.5 bg-slate-200/50 w-full">
            <div 
              className="h-full bg-[#D89F37] transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(216,159,55,0.4)]" 
              style={{ 
                width: `${((stepIndex) / (stepsOrder.length - 1)) * 100}%`,
                [isRtl ? 'right' : 'left']: 0 
              }}
            />
          </div>
        )}
      </div>

      {/* Main Content Area - Strictly non-overlapping */}
      <main className="flex-1 min-h-0 relative z-10 flex flex-col max-w-md mx-auto w-full px-5 overflow-hidden">
        {children}
      </main>

      {/* Persistent Glass Footer */}
      {!hideFooter && (
        <div className="px-6 py-6 glass flex justify-center gap-4 shrink-0 rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-safe">
          {prevStep && (
            <button 
              onClick={() => setStep(prevStep)} 
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-[#1E2E4F] active-press transition-all shadow-sm"
            >
              <svg className={`w-6 h-6 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {nextStep && (
            <button 
              disabled={disabled} 
              onClick={() => setStep(nextStep)} 
              className="flex-1 h-14 bg-[#006B46] text-white rounded-2xl font-bold text-lg transition-all active-press shadow-lg shadow-[#006B46]/20 disabled:opacity-40"
            >
              {nextLabel || t('continue')}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.LANGUAGE_SELECT);
  const [lang, setLang] = useState<Language>('en');
  const [deceasedGender, setDeceasedGender] = useState<'Male' | 'Female' | null>(null);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [estate, setEstate] = useState<EstateData>({ totalAssets: 0, debts: 0, funeral: 0, will: 0 });
  const [detailedAssets, setDetailedAssets] = useState<DetailedAssets>({
    enabled: false,
    land: { area: 0, unit: 'cent', valuePerUnit: 0 },
    gold: { weight: 0, ratePerGram: 0 },
    silver: { weight: 0, ratePerGram: 0 },
    otherCash: 0
  });
  const [detailedWill, setDetailedWill] = useState<DetailedWasiyyah>({
    cash: 0,
    landArea: 0,
    goldWeight: 0,
    silverWeight: 0
  });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showQR, setShowQR] = useState(false);
  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && Object.keys(translations).includes(savedLang)) {
      setLang(savedLang);
      setStep(AppStep.WELCOME);
    }
  }, []);

  const handleLangSelect = (l: Language) => {
    setLang(l);
    localStorage.setItem('appLanguage', l);
    setStep(AppStep.WELCOME);
  };

  const t = (key: string) => (translations[lang] as any)[key] || key;

  const updateHeirCount = (type: HeirType, delta: number) => {
    const meta = HEIR_METADATA[type as string];
    setHeirs(prev => {
      const existing = prev.find(h => h.type === type);
      if (existing) {
        let newCount = Math.max(0, existing.count + delta);
        if (meta.max) newCount = Math.min(newCount, meta.max);
        if (newCount === 0) return prev.filter(h => h.type !== type);
        return prev.map(h => h.type === type ? { ...h, count: newCount } : h);
      } else if (delta > 0) return [...prev, { type, count: 1 }];
      return prev;
    });
  };

  const getHeirCount = (type: HeirType) => heirs.find(h => h.type === type)?.count || 0;

  const handleCalculate = () => {
    setUiError(null);

    const landValue = detailedAssets.enabled ? (detailedAssets.land.area * detailedAssets.land.valuePerUnit) : 0;
    const goldValue = detailedAssets.enabled ? (detailedAssets.gold.weight * detailedAssets.gold.ratePerGram) : 0;
    const silverValue = detailedAssets.enabled ? (detailedAssets.silver.weight * detailedAssets.silver.ratePerGram) : 0;
    const cashValue = detailedAssets.enabled ? detailedAssets.otherCash : estate.totalAssets;
    
    const finalTotalValue = cashValue + landValue + goldValue + silverValue;

    if (heirs.length === 0) {
      setUiError(t('error_no_heirs'));
      return;
    }

    if (finalTotalValue <= (estate.debts + estate.funeral)) {
      setUiError(t('error_liabilities_exceed_assets'));
      return;
    }

    if (finalTotalValue <= 0) {
      setUiError(t('error_invalid_assets'));
      return;
    }

    try {
      if (deceasedGender) {
        const res = calculateShares(heirs, deceasedGender, { ...estate, totalAssets: cashValue, detailed: detailedAssets, detailedWill }, lang);
        setResult(res);
        setStep(AppStep.RESULT);
      }
    } catch (e) {
      console.error(e);
      setUiError(t('error_general'));
    }
  };

  const reset = () => {
    setHeirs([]);
    setDeceasedGender(null);
    setEstate({ totalAssets: 0, debts: 0, funeral: 0, will: 0 });
    setDetailedAssets({
      enabled: false,
      land: { area: 0, unit: 'cent', valuePerUnit: 0 },
      gold: { weight: 0, ratePerGram: 0 },
      silver: { weight: 0, ratePerGram: 0 },
      otherCash: 0
    });
    setDetailedWill({
      cash: 0,
      landArea: 0,
      goldWeight: 0,
      silverWeight: 0
    });
    setResult(null);
    setShowQR(false);
    setUiError(null);
    setStep(AppStep.WELCOME);
  };

  const getShareSummary = () => {
    if (!result) return "";
    let summary = `*${t('distribution_result')}*\n\n`;
    result.shares.forEach(s => {
      if (s.amountEach > 0 || s.landEach > 0) {
        summary += `• ${s.label} (${s.count}):\n`;
        if (s.amountEach > 0) summary += `  - Cash: ₹${Math.floor(s.amountEach).toLocaleString()}\n`;
        if (s.landEach > 0) summary += `  - Land: ${s.landEach.toFixed(3)} ${detailedAssets.land.unit}\n`;
        summary += `\n`;
      }
    });
    return summary;
  };

  if (step === AppStep.LANGUAGE_SELECT) {
    return (
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-8 space-y-12 overflow-hidden text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-white">Select Language</h1>
          <h1 className="text-2xl font-black text-white/80 malayalam">ഭാഷ തിരഞ്ഞെടുക്കുക</h1>
          <h1 className="text-2xl font-black text-white/70 arabic" dir="rtl">اختر اللغة</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 w-full max-sm:px-4 max-w-sm mx-auto">
          {[
            { id: 'en', label: 'English' },
            { id: 'ml', label: 'മലയാളം' },
            { id: 'ta', label: 'தமிழ்' },
            { id: 'ar', label: 'العربية' }
          ].map(l => (
            <button 
              key={l.id} 
              onClick={() => handleLangSelect(l.id as Language)}
              className="glass-card p-6 flex flex-col items-center justify-center gap-2 border-white/20 hover:bg-white/20 transition-all active-press"
            >
              <span className="text-white font-bold text-lg">{l.label}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest">{l.id}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === AppStep.WELCOME) {
    return (
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-10 text-white text-center relative overflow-hidden" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#006B46]/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D89F37]/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10 animate-in space-y-12 w-full">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-[40px] flex items-center justify-center mx-auto shadow-2xl border border-white/20">
            <svg className="w-16 h-16 text-[#D89F37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          
          <div className="space-y-4">
            <h1 className="text-4xl font-extrabold tracking-tight text-white drop-shadow-md">{t('app_title')}</h1>
            <p className="text-slate-300 text-lg opacity-80 font-medium">{t('app_subtitle')}</p>
          </div>

          <div className="flex flex-col gap-4 max-w-xs mx-auto w-full">
            <button 
              onClick={() => setStep(AppStep.DESCRIPTION)} 
              className="w-full bg-[#006B46] text-white py-5 rounded-2xl font-bold text-xl active-press shadow-2xl"
            >
              {t('start')}
            </button>
            <button 
              onClick={() => setStep(AppStep.LANGUAGE_SELECT)} 
              className="text-white/40 text-xs font-bold uppercase tracking-widest underline decoration-white/10"
            >
              Change Language
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === AppStep.DESCRIPTION) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.HADITH} prevStep={AppStep.WELCOME} setStep={setStep}>
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar py-8 space-y-8 animate-in text-center">
          <h2 className="text-3xl font-black text-[#1E2E4F]">{t('what_is_faraid')}</h2>
          <div className="glass-card p-8 space-y-6 text-slate-700 text-lg leading-relaxed shadow-lg">
            <p>{t('faraid_desc_1')}</p>
            <p>{t('faraid_desc_2')}</p>
            <div className="pt-4 flex justify-center">
              <div className="w-16 h-1.5 bg-[#D89F37]/30 rounded-full"></div>
            </div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.HADITH) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.AYAH} prevStep={AppStep.DESCRIPTION} setStep={setStep}>
        <div className="flex-1 flex flex-col justify-center py-8 animate-in space-y-8">
          <div className="w-16 h-16 bg-[#006B46]/10 rounded-full flex items-center justify-center text-[#006B46] mx-auto">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
          </div>
          <div className="glass-card p-10 w-full relative overflow-hidden shadow-xl">
            <div className="absolute top-0 right-0 p-4 opacity-5">
              <svg className="w-32 h-32" fill="currentColor" viewBox="0 0 24 24"><path d="M13 14.725c0-5.141 3.892-10.519 10-10.519l.716 2.185c-3.136 1.054-5.136 3.054-5.136 5.484 0 1.656.804 2.185 1.512 2.185 1.275 0 2.374 1.108 2.374 2.538 0 1.532-1.22 2.538-2.625 2.538-2.146 0-6.841-1.603-6.841-6.411zm-13 0c0-5.141 3.892-10.519 10-10.519l.716 2.185c-3.136 1.054-5.136 3.054-5.136 5.484 0 1.656.804 2.185 1.512 2.185 1.275 0 2.374 1.108 2.374 2.538 0 1.532-1.22 2.538-2.625 2.538-2.146 0-6.841-1.603-6.841-6.411z"/></svg>
            </div>
            <div className="arabic-display mb-8 text-center" dir="rtl">{t('hadith_arabic')}</div>
            <p className="text-center text-[#1E2E4F] font-bold text-lg leading-relaxed">
              {t('hadith_translation')}
            </p>
            <p className="mt-8 text-center text-slate-400 font-bold text-sm tracking-widest uppercase">{t('hadith_ref')}</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.AYAH) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.RULES} prevStep={AppStep.HADITH} setStep={setStep}>
        <div className="flex-1 flex flex-col justify-center py-8 animate-in space-y-8">
          <div className="w-16 h-16 bg-[#D89F37]/10 rounded-full flex items-center justify-center text-[#D89F37] mx-auto">
             <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
          </div>
          <div className="glass-card p-10 w-full shadow-xl">
            <div className="arabic-display mb-8 text-center" dir="rtl">{t('ayah_arabic')}</div>
            <p className="text-center text-[#1E2E4F] font-bold text-lg leading-relaxed">
              {t('ayah_translation')}
            </p>
            <p className="mt-8 text-center text-slate-400 font-bold text-sm tracking-widest uppercase">{t('ayah_ref')}</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.RULES) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.ASSETS} prevStep={AppStep.AYAH} setStep={setStep}>
        <header className="shrink-0 py-6 text-center space-y-2">
          <h2 className="text-3xl font-black text-[#1E2E4F]">{t('rules_title')}</h2>
          <p className="text-slate-500 font-bold">{t('rules_subtitle')}</p>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-5 pb-8">
          <div className="glass-card p-6 space-y-3 shadow-md border-l-4 border-[#006B46]">
            <h3 className="font-black text-[#1E2E4F] text-lg">{t('fixed_shares_title')}</h3>
            <p className="text-slate-600 leading-relaxed text-sm">{t('fixed_shares_desc')}</p>
          </div>
          
          <div className="glass-card p-6 space-y-3 shadow-md border-l-4 border-[#D89F37]">
            <h3 className="font-black text-[#1E2E4F] text-lg">{t('asabah_title')}</h3>
            <p className="text-slate-600 leading-relaxed text-sm">{t('asabah_desc')}</p>
          </div>

          <div className="glass-card p-6 space-y-3 shadow-md border-l-4 border-rose-800">
            <h3 className="font-black text-[#1E2E4F] text-lg">{t('hijb_title')}</h3>
            <p className="text-slate-600 leading-relaxed text-sm">{t('hijb_desc')}</p>
          </div>
          
          <div className="p-4 text-center opacity-40">
            <div className="w-12 h-1 bg-slate-300 mx-auto rounded-full mb-2"></div>
            <p className="text-[10px] uppercase font-black tracking-widest">Al-Shafi'i Jurisprudence</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.ASSETS) {
    const isRtl = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.GENDER} prevStep={AppStep.RULES} setStep={setStep}>
        <header className="shrink-0 py-6 text-center space-y-2">
          <h2 className="text-3xl font-black text-[#1E2E4F]">{t('estate_info')}</h2>
          <div className="flex justify-center gap-2">
            <button 
              onClick={() => setDetailedAssets({...detailedAssets, enabled: false})}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${!detailedAssets.enabled ? 'bg-[#1E2E4F] text-white' : 'bg-slate-200 text-slate-500'}`}
            >
              {t('simple_assets')}
            </button>
            <button 
              onClick={() => setDetailedAssets({...detailedAssets, enabled: true})}
              className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${detailedAssets.enabled ? 'bg-[#006B46] text-white' : 'bg-slate-200 text-slate-500'}`}
            >
              {t('advanced_assets')}
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-5 pb-8">
          {!detailedAssets.enabled ? (
            <div className="glass-card p-6 space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-xl">💰</span>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{t('total_assets')}</label>
              </div>
              <div className="relative">
                <span className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 ${isRtl ? 'mr-1' : 'ml-1'}`}>₹</span>
                <input 
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={estate.totalAssets || ''}
                  onChange={e => setEstate({...estate, totalAssets: Math.max(0, Number(e.target.value))})}
                  className={`w-full bg-transparent border-b-2 border-slate-100 py-3 ${isRtl ? 'pr-8 pl-0 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#1E2E4F] outline-none focus:border-[#006B46] transition-colors`}
                />
              </div>
            </div>
          ) : (
            <>
              {/* ASSETS SECTION */}
              <div className="glass-card p-6 space-y-4 shadow-md bg-white/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#006B46]">{t('land_details')}</h3>
                  <div className="flex gap-1">
                    {(['acre', 'cent', 'sqft', 'sqm'] as LandUnit[]).map(u => (
                      <button 
                        key={u} 
                        onClick={() => setDetailedAssets({ ...detailedAssets, land: { ...detailedAssets.land, unit: u } })}
                        className={`px-2 py-1 rounded text-[8px] font-bold uppercase ${detailedAssets.land.unit === u ? 'bg-[#006B46] text-white' : 'bg-slate-100 text-slate-400'}`}
                      >
                        {t(u)}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('land_area')}</label>
                    <input type="number" value={detailedAssets.land.area || ''} onChange={e => setDetailedAssets({...detailedAssets, land: {...detailedAssets.land, area: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 border-b-2 border-transparent focus:border-[#006B46] p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg" />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('value_per_unit')}</label>
                    <input type="number" value={detailedAssets.land.valuePerUnit || ''} onChange={e => setDetailedAssets({...detailedAssets, land: {...detailedAssets.land, valuePerUnit: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 border-b-2 border-transparent focus:border-[#006B46] p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg" />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="glass-card p-6 space-y-4 shadow-md bg-white/40">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-[#D89F37]">{t('gold_details')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Weight (g)</label>
                      <input type="number" value={detailedAssets.gold.weight || ''} onChange={e => setDetailedAssets({...detailedAssets, gold: {...detailedAssets.gold, weight: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rate (₹)</label>
                      <input type="number" value={detailedAssets.gold.ratePerGram || ''} onChange={e => setDetailedAssets({...detailedAssets, gold: {...detailedAssets.gold, ratePerGram: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg" />
                    </div>
                  </div>
                </div>
                <div className="glass-card p-6 space-y-4 shadow-md bg-white/40">
                  <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-500">{t('silver_details')}</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Weight (g)</label>
                      <input type="number" value={detailedAssets.silver.weight || ''} onChange={e => setDetailedAssets({...detailedAssets, silver: {...detailedAssets.silver, weight: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rate (₹)</label>
                      <input type="number" value={detailedAssets.silver.ratePerGram || ''} onChange={e => setDetailedAssets({...detailedAssets, silver: {...detailedAssets.silver, ratePerGram: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="glass-card p-6 space-y-4 shadow-md bg-white/40">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-blue-600">{t('other_cash')}</h3>
                <input type="number" value={detailedAssets.otherCash || ''} onChange={e => setDetailedAssets({...detailedAssets, otherCash: Math.max(0, Number(e.target.value))})} className="w-full bg-slate-50 p-3 text-2xl font-black text-[#1E2E4F] outline-none rounded-xl" />
              </div>

              {/* WASIYYAH (WILL) ADVANCED SECTION */}
              <div className="pt-6 pb-2">
                <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-[#D89F37] px-2">{t('will_wasiyyah')}</h3>
              </div>

              <div className="glass-card p-6 space-y-5 shadow-md bg-[#D89F37]/5 border-[#D89F37]/20">
                 <div className="grid grid-cols-1 gap-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('wasiyyah_cash')} (₹)</label>
                      <input type="number" value={detailedWill.cash || ''} onChange={e => setDetailedWill({...detailedWill, cash: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg border border-slate-100" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('wasiyyah_land')} ({t(detailedAssets.land.unit)})</label>
                      <input type="number" value={detailedWill.landArea || ''} onChange={e => setDetailedWill({...detailedWill, landArea: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg border border-slate-100" />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('wasiyyah_gold')} (g)</label>
                        <input type="number" value={detailedWill.goldWeight || ''} onChange={e => setDetailedWill({...detailedWill, goldWeight: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg border border-slate-100" />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{t('wasiyyah_silver')} (g)</label>
                        <input type="number" value={detailedWill.silverWeight || ''} onChange={e => setDetailedWill({...detailedWill, silverWeight: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] outline-none rounded-lg border border-slate-100" />
                      </div>
                    </div>
                 </div>
              </div>
            </>
          )}

          {[
            { label: t('debts'), key: 'debts', icon: '📉' },
            { label: t('funeral_expenses'), key: 'funeral', icon: '🕯️' },
            ...(!detailedAssets.enabled ? [{ label: t('will_wasiyyah'), key: 'will', icon: '📜' }] : [])
          ].map(f => (
            <div key={f.key} className="glass-card p-6 space-y-3 shadow-md">
              <div className="flex items-center gap-3">
                <span className="text-xl">{f.icon}</span>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest">{f.label}</label>
              </div>
              <div className="relative">
                <span className={`absolute ${isRtl ? 'right-0' : 'left-0'} top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300 ${isRtl ? 'mr-1' : 'ml-1'}`}>₹</span>
                <input 
                  type="number"
                  inputMode="numeric"
                  placeholder="0"
                  value={(estate as any)[f.key] || ''}
                  onChange={e => setEstate({...estate, [f.key]: Math.max(0, Number(e.target.value))})}
                  className={`w-full bg-transparent border-b-2 border-slate-100 py-3 ${isRtl ? 'pr-8 pl-0 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#1E2E4F] outline-none focus:border-[#006B46] transition-colors`}
                />
              </div>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.GENDER) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={deceasedGender ? AppStep.SELECTION : undefined} prevStep={AppStep.ASSETS} setStep={setStep} disabled={!deceasedGender}>
        <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-12 animate-in">
          <header className="text-center space-y-4">
            <h2 className="text-4xl font-black text-[#1E2E4F]">{t('deceased_person')}</h2>
            <p className="text-slate-500 font-bold text-lg opacity-60">{t('select_gender')}</p>
          </header>

          <div className="grid grid-cols-1 gap-6 w-full max-w-xs">
            {['Male', 'Female'].map(g => (
              <button 
                key={g}
                onClick={() => setDeceasedGender(g as any)}
                className={`p-10 rounded-[40px] font-black text-3xl transition-all active-press border-4 flex flex-col items-center gap-4 ${deceasedGender === g ? 'bg-[#1E2E4F] text-white border-[#D89F37] shadow-2xl scale-105' : 'bg-white text-slate-400 border-white shadow-lg'}`}
              >
                <span>{g === 'Male' ? t('male') : t('female')}</span>
                <span className="text-xs tracking-widest uppercase opacity-40">{g}</span>
              </button>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.SELECTION) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} setStep={setStep} hideFooter={true}>
        <header className="shrink-0 pt-6 pb-4 text-center">
          <h2 className="text-2xl font-black text-[#1E2E4F]">{t('heirs')}</h2>
          <p className="text-slate-500 font-bold text-sm opacity-50">{t('enter_count')}</p>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-container hide-scrollbar space-y-4 mb-4">
          <div className="glass-card overflow-hidden shadow-xl border border-white/60">
            {HEIR_ORDER.map((type, idx) => {
              const meta = HEIR_METADATA[type];
              if (type === 'Husband' && deceasedGender !== 'Female') return null;
              if (type === 'Wives' && deceasedGender !== 'Male') return null;

              const count = getHeirCount(type as HeirType);
              
              return (
                <div key={type} className="flex flex-col">
                  <div className="flex items-center justify-between p-5 h-[80px]">
                    <div className="flex flex-col gap-0.5">
                      <span className={`font-bold text-[#1E2E4F] tracking-tight ${lang === 'ar' ? 'arabic text-lg' : ''}`}>
                        {meta[lang]}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 bg-slate-100/50 p-1.5 rounded-2xl shadow-inner border border-white/20">
                      <button 
                        onClick={() => updateHeirCount(type as HeirType, -1)} 
                        className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all active-press ${count > 0 ? 'bg-white text-rose-500 shadow-sm border border-slate-200' : 'text-slate-300'}`}
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                      </button>
                      <span className={`w-6 text-center font-black text-lg ${count > 0 ? 'text-[#006B46]' : 'text-slate-300'}`}>{count}</span>
                      <button 
                        disabled={meta.max ? count >= meta.max : false}
                        onClick={() => updateHeirCount(type as HeirType, 1)} 
                        className="w-10 h-10 rounded-xl bg-white text-[#006B46] flex items-center justify-center shadow-sm border border-slate-200 transition-all active-press disabled:opacity-20"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                      </button>
                    </div>
                  </div>
                  {idx < HEIR_ORDER.length - 1 && <div className="h-px bg-slate-100/60 mx-5" />}
                </div>
              );
            })}
          </div>
        </div>

        {uiError && (
          <div className={`mb-4 p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold animate-in flex items-center gap-3 border border-rose-100 ${lang === 'ar' ? 'arabic text-base' : lang === 'ml' ? 'malayalam' : ''}`}>
            <span className="text-lg">⚠️</span> {uiError}
          </div>
        )}

        <div className="shrink-0 pb-8 flex flex-col gap-3">
          <button 
            onClick={handleCalculate} 
            className="w-full bg-[#006B46] text-white py-5 rounded-2xl font-black text-xl active-press shadow-2xl flex items-center justify-center gap-3 shadow-[#006B46]/20"
          >
            {t('calculate')}
            <svg className={`w-6 h-6 ${lang === 'ar' ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 5l7 7-7 7M5 5l7 7-7 7" /></svg>
          </button>
          <button 
            onClick={() => setStep(AppStep.GENDER)} 
            className="w-full h-14 rounded-2xl font-bold text-[#1E2E4F] bg-white/60 border border-slate-200 active-press text-base shadow-sm backdrop-blur-md"
          >
            {t('back')}
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.RESULT && result) {
    const isRtl = lang === 'ar';
    return (
      <div className="h-full flex flex-col overflow-hidden bg-transparent pt-safe" dir={isRtl ? 'rtl' : 'ltr'}>
        <header className="px-6 py-6 text-center space-y-6 shrink-0 relative">
          <div className={`absolute top-6 ${isRtl ? 'left-6' : 'right-6'} z-50`}>
            <button 
              onClick={() => setShowQR(true)}
              className="w-12 h-12 bg-white rounded-full shadow-lg flex items-center justify-center text-[#1E2E4F] active-press border border-slate-100"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" /></svg>
            </button>
          </div>
          <h2 className="text-3xl font-black text-[#1E2E4F] tracking-tight">{t('distribution_result')}</h2>
          <div className="space-y-4">
            {/* Cash Available Display */}
            <div className="glass-navy p-6 text-white space-y-1 shadow-2xl">
              <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40">{t('net_estate')}</p>
              <p className="text-3xl font-black text-[#D89F37]">
                {result.netEstate > 0 ? `₹${Math.floor(result.netEstate).toLocaleString()}` : '₹0'}
              </p>
            </div>
            
            {/* Land Available Display - Separated with Reference Value */}
            {detailedAssets.enabled && result.totalLand > 0 && (
              <div className="glass-card p-6 border-emerald-100 border-2 shadow-xl space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex flex-col text-left">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('land_available')}</p>
                    <p className="text-2xl font-black text-[#006B46]">{result.totalLand.toFixed(2)} {t(detailedAssets.land.unit)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t('ref_value')}</p>
                    <p className="text-lg font-bold text-slate-500 italic">₹{(result.totalLand * detailedAssets.land.valuePerUnit).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto scroll-container hide-scrollbar px-6 py-4 space-y-6">
          <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[28px] space-y-4 shadow-sm backdrop-blur-md">
              <h3 className="font-bold text-[#006B46] text-xs uppercase tracking-widest opacity-60">{t('summary')}</h3>
              <div className="grid grid-cols-2 gap-4">
                  <div className={`space-y-1 ${isRtl ? 'border-l pl-2' : 'border-r pr-2'} border-emerald-100`}>
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t('fixed_shares')}</p>
                      <p className="text-xl font-black text-[#1E2E4F]">{ (result.summary.fixedTotal * 100).toFixed(1) }%</p>
                  </div>
                  <div className="space-y-1">
                      <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">{t('residue_shares')}</p>
                      <p className="text-xl font-black text-[#1E2E4F]">{ (result.summary.residueTotal * 100).toFixed(1) }%</p>
                  </div>
              </div>
          </div>

          {result.warnings.length > 0 && result.warnings.map((w, i) => (
             <div key={i} className={`p-5 rounded-2xl text-[13px] font-bold flex gap-3 shadow-sm animate-in backdrop-blur-sm bg-amber-50/70 border border-amber-100 text-amber-800 ${isRtl ? 'arabic text-base' : ''}`}>
               <span className="text-lg">⚠️</span> {t(w)}
             </div>
          ))}
          
          <div className="space-y-4 pb-12">
            <h3 className="px-2 font-black text-[#1E2E4F] text-[13px] uppercase tracking-widest opacity-40">{t('individual_shares')}</h3>
            {result.shares.map((s, i) => (
              <div key={i} className={`glass-card p-6 flex flex-col gap-4 border-${isRtl ? 'r' : 'l'}-8 border-${isRtl ? 'r' : 'l'}-[#006B46] animate-in shadow-md hover:scale-[1.01] transition-all`}>
                <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                        <p className={`font-black text-[#1E2E4F] text-lg leading-tight ${isRtl ? 'arabic' : ''}`}>{s.label}</p>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{s.type === 'Excluded' ? t('excluded') : s.type} • {s.symbol}</p>
                    </div>
                    <div className="bg-white/60 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 border border-slate-100">{s.count} {t('each')}</div>
                </div>
                
                <div className="h-px bg-slate-100/50 w-full" />

                <div className="flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Ratio</p>
                            <p className="text-sm font-black text-[#1E2E4F]">{s.fraction} <span className="text-[10px] opacity-40">({s.percentage})</span></p>
                        </div>
                    </div>

                    <div className="space-y-3">
                        {/* Cash Share */}
                        {(result.netEstate > 0 || !detailedAssets.enabled) && (
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Cash (each)</span>
                            <span className="text-xl font-black text-[#006B46]">₹{Math.floor(s.amountEach).toLocaleString()}</span>
                          </div>
                        )}

                        {/* Land Share - Separate independent calculation display */}
                        {detailedAssets.enabled && result.totalLand > 0 && (
                          <div className="flex items-center justify-between pt-2 border-t border-slate-50">
                            <div className="flex items-center gap-1.5">
                              <span className="text-sm">📍</span>
                              <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Land (each)</span>
                            </div>
                            <span className="text-lg font-black text-[#006B46]">{s.landEach.toFixed(3)} {t(detailedAssets.land.unit)}</span>
                          </div>
                        )}

                        {/* Gold/Silver Independent Shares */}
                        {detailedAssets.enabled && (result.totalGold > 0 || result.totalSilver > 0) && (
                          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-50">
                             {result.totalGold > 0 && (
                               <div className="flex flex-col">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Gold (each)</span>
                                  <span className="text-sm font-black text-[#D89F37]">{s.goldEach.toFixed(3)}g</span>
                               </div>
                             )}
                             {result.totalSilver > 0 && (
                               <div className="flex flex-col text-right">
                                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Silver (each)</span>
                                  <span className="text-sm font-black text-slate-500">{s.silverEach.toFixed(3)}g</span>
                               </div>
                             )}
                          </div>
                        )}
                    </div>
                </div>
              </div>
            ))}
            
            {detailedAssets.enabled && (
               <div className="px-2 mt-4">
                  <p className="text-[9px] text-slate-400 italic text-center font-medium leading-relaxed">
                    {t('note_value_based')}
                  </p>
               </div>
            )}
          </div>
        </div>

        <