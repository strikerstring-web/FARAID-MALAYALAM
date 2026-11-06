import React, { useState, useEffect } from 'react';
import { AppStep, Heir, HeirType, CalculationResult, HEIR_METADATA, HEIR_ORDER, EstateData, Language, DetailedAssets, LandUnit, MetalUnit, DetailedWasiyyah } from './types';
import { calculateShares } from './logic/faraidEngine';
import { translations } from './translations';

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
  const t = (key: string) => (translations[lang] as any)?.[key] || key;
  const isRtl = lang === 'ar';
  const isAr = lang === 'ar';
  const langClass = isAr ? 'arabic' : lang === 'ml' ? 'malayalam' : lang === 'ta' ? 'tamil' : '';

  return (
    <div className={`h-full flex flex-col relative overflow-hidden bg-transparent pt-safe ${langClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
      {/* Top Heritage Progress Bar */}
      <div className="shrink-0 z-[70]">
        {stepIndex >= 1 && (
          <div className="h-1 bg-emerald-950/10 w-full relative overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-[#0A6A4C] via-[#1AA073] to-[#C89B3C] transition-all duration-700 ease-out shadow-[0_0_10px_rgba(200,155,60,0.4)]" 
              style={{ 
                width: `${((stepIndex) / (stepsOrder.length - 1)) * 100}%`, 
                [isRtl ? 'right' : 'left']: 0,
                position: 'absolute'
              }} 
            />
          </div>
        )}
      </div>

      <main className="flex-1 min-h-0 relative z-10 flex flex-col max-w-lg md:max-w-xl mx-auto w-full px-5 overflow-hidden">
        {children}
      </main>

      {!hideFooter && (
        <div className="px-6 py-4 glass-nav flex justify-center items-center gap-3 shrink-0 rounded-t-[32px] pb-safe z-50">
          {prevStep && (
            <button 
              onClick={() => setStep(prevStep)} 
              aria-label={t('back')}
              className="w-13 h-13 rounded-2xl flex items-center justify-center bg-white border border-[#0A6A4C]/15 text-[#0A1C18] hover:bg-[#0A6A4C]/5 active-press transition-all shadow-sm shrink-0"
            >
              <svg className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
          )}
          {nextStep && (
            <button 
              disabled={disabled} 
              onClick={() => setStep(nextStep)} 
              className="flex-1 h-13 bg-gradient-to-r from-[#0A6A4C] to-[#08583E] text-white rounded-2xl font-bold text-base sm:text-lg transition-all active-press shadow-lg shadow-[#0A6A4C]/25 hover:shadow-xl hover:shadow-[#0A6A4C]/35 disabled:opacity-40 border border-[#C89B3C]/30 flex items-center justify-center gap-2"
            >
              <span>{nextLabel || t('continue')}</span>
              <svg className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
              </svg>
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
    gold: { weight: 0, unit: 'gram', ratePerUnit: 0 }, 
    silver: { weight: 0, unit: 'gram', ratePerUnit: 0 }, 
    otherCash: 0 
  });
  const [detailedWill, setDetailedWill] = useState<DetailedWasiyyah>({ cash: 0, landArea: 0, goldWeight: 0, silverWeight: 0 });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [uiError, setUiError] = useState<string | null>(null);

  useEffect(() => {
    const savedLang = localStorage.getItem('appLanguage') as Language;
    if (savedLang && Object.keys(translations).includes(savedLang)) { 
      setLang(savedLang); 
      setStep(AppStep.WELCOME); 
    }
  }, []);

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  const handleLangSelect = (l: Language) => { 
    setLang(l); 
    localStorage.setItem('appLanguage', l); 
    setStep(AppStep.WELCOME); 
  };

  const t = (key: string) => (translations[lang] as any)?.[key] || key;
  const isRtl = lang === 'ar';
  const isAr = lang === 'ar';
  const langClass = isAr ? 'arabic' : lang === 'ml' ? 'malayalam' : lang === 'ta' ? 'tamil' : '';

  const updateHeirCount = (type: HeirType, delta: number) => {
    const meta = HEIR_METADATA[type as string];
    setHeirs(prev => {
      const existing = prev.find(h => h.type === type);
      if (existing) {
        let newCount = Math.max(0, existing.count + delta);
        if (meta?.max) newCount = Math.min(newCount, meta.max);
        if (newCount === 0) return prev.filter(h => h.type !== type);
        return prev.map(h => h.type === type ? { ...h, count: newCount } : h);
      } else if (delta > 0) {
        return [...prev, { type, count: 1 }];
      }
      return prev;
    });
  };

  const getHeirCount = (type: HeirType) => heirs.find(h => h.type === type)?.count || 0;

  // Real-time calculation of gross assets
  const currentCashVal = detailedAssets.enabled ? (detailedAssets.otherCash || 0) : (estate.totalAssets || 0);
  const currentLandVal = detailedAssets.enabled ? ((detailedAssets.land.area || 0) * (detailedAssets.land.valuePerUnit || 0)) : 0;
  const currentGoldVal = detailedAssets.enabled ? ((detailedAssets.gold.weight || 0) * (detailedAssets.gold.ratePerUnit || 0)) : 0;
  const currentSilverVal = detailedAssets.enabled ? ((detailedAssets.silver.weight || 0) * (detailedAssets.silver.ratePerUnit || 0)) : 0;
  const currentGrossTotal = currentCashVal + currentLandVal + currentGoldVal + currentSilverVal;
  const currentLiabilitiesTotal = (estate.debts || 0) + (estate.funeral || 0);

  const handleCalculate = () => {
    setUiError(null);
    if (heirs.length === 0) { 
      setUiError(t('error_no_heirs')); 
      return; 
    }
    
    if (currentGrossTotal <= 0) { 
      setUiError(t('error_invalid_assets')); 
      return; 
    }

    if (currentLiabilitiesTotal >= currentGrossTotal) {
      setUiError(t('error_liabilities_exceed_assets'));
      return;
    }

    try {
      if (deceasedGender) {
        const res = calculateShares(
          heirs, 
          deceasedGender, 
          { 
            ...estate, 
            totalAssets: currentCashVal, 
            detailed: detailedAssets, 
            detailedWill 
          }, 
          lang
        );
        setResult(res);
        setStep(AppStep.RESULT);
      }
    } catch (e) { 
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
      gold: { weight: 0, unit: 'gram', ratePerUnit: 0 }, 
      silver: { weight: 0, unit: 'gram', ratePerUnit: 0 }, 
      otherCash: 0 
    });
    setDetailedWill({ cash: 0, landArea: 0, goldWeight: 0, silverWeight: 0 });
    setResult(null); 
    setUiError(null); 
    setStep(AppStep.WELCOME);
  };

  // STEP 0: LANGUAGE SELECTION
  if (step === AppStep.LANGUAGE_SELECT) {
    return (
      <div className="h-full bg-gradient-to-b from-[#091B17] via-[#0D2420] to-[#061411] flex flex-col items-center justify-center p-8 space-y-9 overflow-hidden text-center relative">
        {/* Decorative Golden Ambient Glows */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-80 h-80 bg-[#C89B3C]/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-10 right-10 w-64 h-64 bg-[#0A6A4C]/15 rounded-full blur-3xl pointer-events-none" />

        {/* Central Archival Medallion */}
        <div className="relative z-10 space-y-3">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#C89B3C]/20 to-[#0A6A4C]/30 border border-[#C89B3C]/40 flex items-center justify-center mx-auto shadow-[0_0_24px_rgba(200,155,60,0.2)]">
            <svg className="w-8 h-8 text-[#D4AF37]" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight font-serif">Select Language</h1>
            <p className="text-sm font-medium text-[#C89B3C] arabic" dir="rtl">اختر لغة التطبيق الشرعي</p>
          </div>
        </div>

        {/* Language Options Grid */}
        <div className="grid grid-cols-2 gap-3.5 w-full max-w-sm mx-auto relative z-10">
          {[
            { id: 'en', l: 'English', sub: 'Latin', c: '' }, 
            { id: 'ml', l: 'മലയാളം', sub: 'Malayalam', c: 'malayalam' }, 
            { id: 'ta', l: 'தமிழ்', sub: 'Tamil', c: 'tamil' }, 
            { id: 'ar', l: 'العربية', sub: 'Arabic', c: 'arabic' }
          ].map(x => (
            <button 
              key={x.id} 
              onClick={() => handleLangSelect(x.id as Language)} 
              className={`p-5 rounded-2xl flex flex-col items-center justify-center gap-1.5 bg-white/[0.06] hover:bg-white/[0.12] border border-white/10 hover:border-[#C89B3C]/60 transition-all active-press shadow-lg backdrop-blur-md group ${x.c}`}
            >
              <span className="text-white font-bold text-lg group-hover:text-[#F4D37A] transition-colors">{x.l}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest">{x.sub}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // STEP 1: WELCOME SCREEN
  if (step === AppStep.WELCOME) {
    return (
      <div className={`h-full bg-gradient-to-b from-[#091B17] via-[#0D2420] to-[#071411] flex flex-col items-center justify-center p-8 sm:p-10 text-white text-center relative overflow-hidden ${langClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
        {/* Soft Ambient Radiance */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-[#0A6A4C]/20 rounded-full blur-[90px] pointer-events-none" />
        <div className="absolute top-10 right-0 w-64 h-64 bg-[#C89B3C]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 animate-elevate space-y-8 w-full max-w-sm">
          {/* Ornate Islamic Seal Medallion */}
          <div className="relative mx-auto w-28 h-28 flex items-center justify-center">
            <div className="absolute inset-0 rounded-3xl bg-gradient-to-tr from-[#0A6A4C] to-[#C89B3C] opacity-30 blur-xl animate-pulse" />
            <div className="relative w-24 h-24 rounded-3xl bg-gradient-to-b from-white/10 to-white/[0.02] backdrop-blur-2xl border border-[#C89B3C]/40 flex items-center justify-center shadow-2xl">
              <svg className="w-12 h-12 text-[#D4AF37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>

          {/* Titles */}
          <div className="space-y-3">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-white drop-shadow-md">
              {t('app_title')}
            </h1>
            <p className="text-slate-300 text-sm sm:text-base font-normal leading-relaxed opacity-90 max-w-xs mx-auto">
              {t('app_subtitle')}
            </p>
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3.5 pt-2">
            <button 
              onClick={() => setStep(AppStep.DESCRIPTION)} 
              className="w-full bg-gradient-to-r from-[#0A6A4C] to-[#0C7A58] hover:from-[#0C7A58] hover:to-[#0A6A4C] text-white py-4 rounded-2xl font-bold text-lg active-press shadow-xl shadow-[#0A6A4C]/30 border border-[#C89B3C]/40 transition-all flex items-center justify-center gap-2"
            >
              <span>{t('start')}</span>
              <svg className={`w-5 h-5 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M14 5l7 7-7 7M3 12h18" />
              </svg>
            </button>
            <button 
              onClick={() => setStep(AppStep.LANGUAGE_SELECT)} 
              className="text-[#C89B3C] hover:text-[#F4D37A] text-xs font-semibold uppercase tracking-widest transition-colors py-1"
            >
              {t('change_language')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // STEP 2: WHAT IS FARAID
  if (step === AppStep.DESCRIPTION) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.HADITH} prevStep={AppStep.WELCOME} setStep={setStep}>
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar py-7 space-y-6 animate-elevate">
          <div className="text-center space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A6A4C]">{t('rules_subtitle')}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1D19]">{t('what_is_faraid')}</h2>
          </div>
          <div className="silk-card p-6 sm:p-7 space-y-5 text-slate-700 text-sm sm:text-base leading-relaxed">
            <p>{t('faraid_desc_1')}</p>
            <div className="h-px bg-[#0A6A4C]/10" />
            <p>{t('faraid_desc_2')}</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // STEP 3 & 4: HADITH AND AYAH
  if (step === AppStep.HADITH || step === AppStep.AYAH) {
    const isHadith = step === AppStep.HADITH;
    return (
      <ScreenWrapper 
        lang={lang} 
        currentStep={step} 
        nextStep={isHadith ? AppStep.AYAH : AppStep.RULES} 
        prevStep={isHadith ? AppStep.DESCRIPTION : AppStep.HADITH} 
        setStep={setStep}
      >
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar py-6 flex flex-col justify-center animate-elevate space-y-6">
          <div className="silk-card p-6 sm:p-8 w-full space-y-6 border border-[#C89B3C]/25 shadow-lg relative overflow-hidden">
            {/* Corner Ornamental Flourish */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-bl from-[#C89B3C]/10 to-transparent pointer-events-none" />

            <div className="text-center">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-[#0A6A4C] bg-emerald-50 px-3.5 py-1 rounded-full border border-[#0A6A4C]/15">
                {t(isHadith ? 'hadith_title' : 'ayah_title')}
              </span>
            </div>
            
            {/* Calligraphic Quranic / Hadith Text with Tashkeel */}
            <div className="arabic-display" dir="rtl">
              {t(isHadith ? 'hadith_arabic' : 'ayah_arabic')}
            </div>

            <div className="h-px bg-[#C89B3C]/20 w-2/3 mx-auto" />

            <p className="text-center text-[#0B1D19] font-medium text-sm sm:text-base leading-relaxed px-2">
              {t(isHadith ? 'hadith_translation' : 'ayah_translation')}
            </p>

            <p className="text-center text-[#C89B3C] font-black text-xs tracking-widest uppercase">
              {t(isHadith ? 'hadith_ref' : 'ayah_ref')}
            </p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // STEP 5: RULES
  if (step === AppStep.RULES) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.ASSETS} prevStep={AppStep.AYAH} setStep={setStep}>
        <header className="shrink-0 py-5 text-center space-y-1">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1D19]">{t('rules_title')}</h2>
          <p className="text-xs text-slate-500 font-medium">{t('rules_subtitle')}</p>
        </header>
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-3.5 pb-6">
          {[
            { k: 'fixed_shares', num: '01' },
            { k: 'asabah', num: '02' },
            { k: 'hijb', num: '03' }
          ].map(item => (
            <div key={item.k} className="silk-card p-5 space-y-2 border border-[#0A6A4C]/15">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-black text-[#C89B3C] bg-amber-50 px-2 py-0.5 rounded-md border border-[#C89B3C]/20 bdi-num">
                  {item.num}
                </span>
                <h3 className="font-bold text-[#0B1D19] text-base">{t(`${item.k}_title`)}</h3>
              </div>
              <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">{t(`${item.k}_desc`)}</p>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  // STEP 6: ASSETS & LIABILITIES
  if (step === AppStep.ASSETS) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.GENDER} prevStep={AppStep.RULES} setStep={setStep}>
        <header className="shrink-0 py-3 text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1D19]">{t('estate_info')}</h2>
          
          {/* Segmented Mode Switcher */}
          <div className="inline-flex p-1 rounded-2xl bg-slate-200/70 border border-slate-300/40">
            <button 
              type="button"
              onClick={() => setDetailedAssets({...detailedAssets, enabled: false})} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${!detailedAssets.enabled ? 'bg-white text-[#0A6A4C] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t('simple_assets')}
            </button>
            <button 
              type="button"
              onClick={() => setDetailedAssets({...detailedAssets, enabled: true})} 
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${detailedAssets.enabled ? 'bg-white text-[#0A6A4C] shadow-sm' : 'text-slate-600 hover:text-slate-900'}`}
            >
              {t('advanced_assets')}
            </button>
          </div>

          {/* Real-time Asset Valuation Banner */}
          <div className="royal-card p-3.5 text-white flex items-center justify-between px-4">
            <div className="text-left rtl:text-right">
              <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider block">{t('total_gross_assets')}</span>
              <span className="text-xs text-slate-400">Total Asset</span>
            </div>
            <span className="text-xl sm:text-2xl font-black text-[#D4AF37] bdi-num">
              ₹{Math.round(currentGrossTotal).toLocaleString()}
            </span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-3.5 pb-8">
          {!detailedAssets.enabled ? (
            <div className="silk-card p-5 space-y-2">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t('total_assets')}</label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? 'right-0 mr-1' : 'left-0 ml-1'} text-2xl font-black text-slate-400 pointer-events-none`}>₹</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  value={estate.totalAssets || ''} 
                  onChange={e => setEstate({...estate, totalAssets: Math.max(0, Number(e.target.value))})} 
                  placeholder="0"
                  className={`w-full bg-transparent border-b-2 border-slate-200 py-3 ${isRtl ? 'pr-8 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#0B1D19] outline-none focus:border-[#0A6A4C] transition-colors`} 
                />
              </div>
            </div>
          ) : (
            <>
              {/* Land Section */}
              <div className="silk-card p-4 sm:p-5 space-y-3 border-emerald-900/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#0A6A4C] tracking-wider flex items-center gap-1.5">
                    <span>🏘️</span> {t('land_details')}
                  </h3>
                  <select 
                    value={detailedAssets.land.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, land: { ...detailedAssets.land, unit: e.target.value as LandUnit } })}
                    className="bg-emerald-50 text-[#0A6A4C] text-xs font-bold px-2.5 py-1 rounded-lg outline-none border border-emerald-200/60 cursor-pointer"
                  >
                    {(['acre', 'cent', 'sqft', 'sqm'] as LandUnit[]).map(u => <option key={u} value={u}>{t(u)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('land_area')} ({t(detailedAssets.land.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="any"
                      placeholder="0"
                      value={detailedAssets.land.area || ''} 
                      onChange={e => setDetailedAssets({...detailedAssets, land: {...detailedAssets.land, area: Math.max(0, Number(e.target.value))}})} 
                      className="w-full bg-slate-50/80 p-2 text-base font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-[#0A6A4C] outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('value_per_unit')} (₹)</label>
                    <input 
                      type="number" 
                      inputMode="numeric" 
                      placeholder="0"
                      value={detailedAssets.land.valuePerUnit || ''} 
                      onChange={e => setDetailedAssets({...detailedAssets, land: {...detailedAssets.land, valuePerUnit: Math.max(0, Number(e.target.value))}})} 
                      className="w-full bg-slate-50/80 p-2 text-base font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-[#0A6A4C] outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs text-slate-500 border-t border-slate-100">
                  <span>{t('value')}:</span>
                  <span className="font-black text-[#0A6A4C] bdi-num">₹{Math.round((detailedAssets.land.area || 0) * (detailedAssets.land.valuePerUnit || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Gold Section */}
              <div className="silk-card p-4 sm:p-5 space-y-3 border-amber-900/10">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#C89B3C] tracking-wider flex items-center gap-1.5">
                    <span>🥇</span> {t('gold_details')}
                  </h3>
                  <select 
                    value={detailedAssets.gold.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, gold: { ...detailedAssets.gold, unit: e.target.value as MetalUnit } })}
                    className="bg-amber-50 text-[#C89B3C] text-xs font-bold px-2.5 py-1 rounded-lg outline-none border border-amber-200 cursor-pointer"
                  >
                    {(['gram', 'tola'] as MetalUnit[]).map(u => <option key={u} value={u}>{t(u)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('quantity')} ({t(detailedAssets.gold.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="any"
                      placeholder="0"
                      value={detailedAssets.gold.weight || ''} 
                      onChange={e => setDetailedAssets({...detailedAssets, gold: {...detailedAssets.gold, weight: Math.max(0, Number(e.target.value))}})} 
                      className="w-full bg-slate-50/80 p-2 text-base font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-[#C89B3C] outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('gold_rate')} (₹/{t(detailedAssets.gold.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="numeric" 
                      placeholder="0"
                      value={detailedAssets.gold.ratePerUnit || ''} 
                      onChange={e => setDetailedAssets({...detailedAssets, gold: {...detailedAssets.gold, ratePerUnit: Math.max(0, Number(e.target.value))}})} 
                      className="w-full bg-slate-50/80 p-2 text-base font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-[#C89B3C] outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs text-slate-500 border-t border-slate-100">
                  <span>{t('value')}:</span>
                  <span className="font-black text-[#C89B3C] bdi-num">₹{Math.round((detailedAssets.gold.weight || 0) * (detailedAssets.gold.ratePerUnit || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Silver Section */}
              <div className="silk-card p-4 sm:p-5 space-y-3 border-slate-300/40">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                    <span>🥈</span> {t('silver_details')}
                  </h3>
                  <select 
                    value={detailedAssets.silver.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, silver: { ...detailedAssets.silver, unit: e.target.value as MetalUnit } })}
                    className="bg-slate-100 text-slate-600 text-xs font-bold px-2.5 py-1 rounded-lg outline-none border border-slate-200 cursor-pointer"
                  >
                    {(['gram', 'tola'] as MetalUnit[]).map(u => <option key={u} value={u}>{t(u)}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('quantity')} ({t(detailedAssets.silver.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="any"
                      placeholder="0"
                      value={detailedAssets.silver.weight || ''} 
                      onChange={e => setDetailedAssets({...detailedAssets, silver: {...detailedAssets.silver, weight: Math.max(0, Number(e.target.value))}})} 
                      className="w-full bg-slate-50/80 p-2 text-base font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-slate-400 outline-none" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('silver_rate')} (₹/{t(detailedAssets.silver.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="numeric" 
                      placeholder="0"
                      value={detailedAssets.silver.ratePerUnit || ''} 
                      onChange={e => setDetailedAssets({...detailedAssets, silver: {...detailedAssets.silver, ratePerUnit: Math.max(0, Number(e.target.value))}})} 
                      className="w-full bg-slate-50/80 p-2 text-base font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-slate-400 outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs text-slate-500 border-t border-slate-100">
                  <span>{t('value')}:</span>
                  <span className="font-black text-slate-600 bdi-num">₹{Math.round((detailedAssets.silver.weight || 0) * (detailedAssets.silver.ratePerUnit || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Other Cash / Bank */}
              <div className="silk-card p-4 sm:p-5 space-y-2 border-teal-900/10">
                <h3 className="text-xs font-black uppercase text-teal-700 tracking-wider flex items-center gap-1.5">
                  <span>💵</span> {t('other_cash')}
                </h3>
                <div className="relative flex items-center">
                  <span className={`absolute ${isRtl ? 'right-0 mr-1' : 'left-0 ml-1'} text-xl font-black text-slate-400 pointer-events-none`}>₹</span>
                  <input 
                    type="number" 
                    inputMode="numeric" 
                    placeholder="0"
                    value={detailedAssets.otherCash || ''} 
                    onChange={e => setDetailedAssets({...detailedAssets, otherCash: Math.max(0, Number(e.target.value))})} 
                    className={`w-full bg-slate-50/80 p-2.5 ${isRtl ? 'pr-7 text-right' : 'pl-7 text-left'} text-xl font-black text-[#0B1D19] rounded-lg border border-slate-200 focus:border-teal-600 outline-none`} 
                  />
                </div>
              </div>

              {/* Wasiyyah (Will) Section for Detailed Assets */}
              <div className="silk-card p-4 sm:p-5 space-y-3 bg-[#C89B3C]/5 border border-[#C89B3C]/30">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#C89B3C] tracking-wider flex items-center gap-1.5">
                    <span>📜</span> {t('will_wasiyyah')}
                  </h3>
                  <span className="text-[10px] text-slate-400 font-medium">Max 1/3</span>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('wasiyyah_cash')} (₹)</label>
                    <input 
                      type="number" 
                      inputMode="numeric" 
                      placeholder="0"
                      value={detailedWill.cash || ''} 
                      onChange={e => setDetailedWill({...detailedWill, cash: Math.max(0, Number(e.target.value))})} 
                      className="w-full bg-white p-2 text-sm font-black text-[#0B1D19] rounded-lg border border-slate-200 outline-none focus:border-[#C89B3C]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('wasiyyah_land')} ({t(detailedAssets.land.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="any"
                      placeholder="0"
                      value={detailedWill.landArea || ''} 
                      onChange={e => setDetailedWill({...detailedWill, landArea: Math.max(0, Number(e.target.value))})} 
                      className="w-full bg-white p-2 text-sm font-black text-[#0B1D19] rounded-lg border border-slate-200 outline-none focus:border-[#C89B3C]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('wasiyyah_gold')} ({t(detailedAssets.gold.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="any"
                      placeholder="0"
                      value={detailedWill.goldWeight || ''} 
                      onChange={e => setDetailedWill({...detailedWill, goldWeight: Math.max(0, Number(e.target.value))})} 
                      className="w-full bg-white p-2 text-sm font-black text-[#0B1D19] rounded-lg border border-slate-200 outline-none focus:border-[#C89B3C]" 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('wasiyyah_silver')} ({t(detailedAssets.silver.unit)})</label>
                    <input 
                      type="number" 
                      inputMode="decimal" 
                      step="any"
                      placeholder="0"
                      value={detailedWill.silverWeight || ''} 
                      onChange={e => setDetailedWill({...detailedWill, silverWeight: Math.max(0, Number(e.target.value))})} 
                      className="w-full bg-white p-2 text-sm font-black text-[#0B1D19] rounded-lg border border-slate-200 outline-none focus:border-[#C89B3C]" 
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Liabilities Section: Debts & Funeral Expenses */}
          {[
            { l: t('debts'), k: 'debts', i: '📉' },
            { l: t('funeral_expenses'), k: 'funeral', i: '🕯️' },
            ...(!detailedAssets.enabled ? [{ l: t('will_wasiyyah'), k: 'will', i: '📜' }] : [])
          ].map(f => (
            <div key={f.k} className="silk-card p-4 sm:p-5 space-y-2 border-slate-200">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block flex items-center gap-1.5">
                <span>{f.i}</span> {f.l}
              </label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? 'right-0 mr-1' : 'left-0 ml-1'} text-2xl font-black text-slate-400 pointer-events-none`}>₹</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  placeholder="0"
                  value={(estate as any)[f.k] || ''} 
                  onChange={e => setEstate({...estate, [f.k]: Math.max(0, Number(e.target.value))})} 
                  className={`w-full bg-transparent border-b-2 border-slate-200 py-2.5 ${isRtl ? 'pr-8 text-right' : 'pl-8 text-left'} text-xl sm:text-2xl font-black text-[#0B1D19] outline-none focus:border-[#0A6A4C] transition-colors`} 
                />
              </div>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  // STEP 7: DECEASED GENDER
  if (step === AppStep.GENDER) {
    return (
      <ScreenWrapper 
        lang={lang} 
        currentStep={step} 
        nextStep={deceasedGender ? AppStep.SELECTION : undefined} 
        prevStep={AppStep.ASSETS} 
        setStep={setStep} 
        disabled={!deceasedGender}
      >
        <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-8 animate-elevate text-center">
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A6A4C]">{t('select_gender')}</span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-[#0B1D19]">{t('deceased_person')}</h2>
          </div>
          <div className="grid grid-cols-1 gap-4 w-full max-w-xs">
            {['Male', 'Female'].map(g => (
              <button 
                key={g} 
                onClick={() => setDeceasedGender(g as any)} 
                className={`p-6 rounded-[28px] font-black text-xl sm:text-2xl transition-all border-2 active-press flex items-center justify-center gap-3.5 ${deceasedGender === g ? 'bg-gradient-to-r from-[#0A6A4C] to-[#08583E] text-white border-[#C89B3C] shadow-xl shadow-[#0A6A4C]/25' : 'bg-white text-slate-600 border-slate-200 hover:border-[#0A6A4C]/40 shadow-sm'}`}
              >
                <span className="text-3xl">{g === 'Male' ? '👨' : '👩'}</span>
                <span>{g === 'Male' ? t('male') : t('female')}</span>
              </button>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // STEP 8: HEIRS SELECTION
  if (step === AppStep.SELECTION) {
    return (
      <ScreenWrapper lang={lang} currentStep={step} setStep={setStep} hideFooter={true}>
        <header className="shrink-0 pt-4 pb-2 text-center space-y-0.5">
          <h2 className="text-2xl font-extrabold text-[#0B1D19]">{t('heirs')}</h2>
          <p className="text-xs text-slate-500">{t('enter_count')}</p>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-2.5 mb-3">
          <div className="silk-card overflow-hidden divide-y divide-slate-100">
            {HEIR_ORDER.map(type => {
              const meta = HEIR_METADATA[type];
              if ((type === 'Husband' && deceasedGender !== 'Female') || (type === 'Wives' && deceasedGender !== 'Male')) {
                return null;
              }
              const count = getHeirCount(type as HeirType);
              return (
                <div key={type} className="flex items-center justify-between p-3.5 transition-colors hover:bg-slate-50/50">
                  <div className="pr-2">
                    <p className="font-bold text-[#0B1D19] text-base leading-snug">{meta[lang]}</p>
                    {meta.max && <span className="text-[10px] text-[#C89B3C] font-semibold">max: {meta.max}</span>}
                  </div>
                  <div className="flex items-center gap-2 bg-slate-100/70 p-1.5 rounded-xl shrink-0">
                    <button 
                      type="button"
                      aria-label="Decrease count"
                      onClick={() => updateHeirCount(type as HeirType, -1)} 
                      className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${count > 0 ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-300'}`}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                    </button>
                    <span className={`w-6 text-center font-black text-base bdi-num ${count > 0 ? 'text-[#0A6A4C]' : 'text-slate-300'}`}>
                      {count}
                    </span>
                    <button 
                      type="button"
                      aria-label="Increase count"
                      disabled={meta.max ? count >= meta.max : false} 
                      onClick={() => updateHeirCount(type as HeirType, 1)} 
                      className="w-8 h-8 rounded-lg bg-white text-[#0A6A4C] shadow-sm flex items-center justify-center transition-all active-press disabled:opacity-30"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {uiError && (
          <div className="mb-3 p-3 bg-rose-50 text-rose-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-rose-200 animate-elevate">
            <span className="shrink-0 text-sm">⚠️</span> 
            <span>{uiError}</span>
          </div>
        )}

        <div className="shrink-0 pb-5 flex flex-col gap-2">
          <button 
            onClick={handleCalculate} 
            className="w-full bg-gradient-to-r from-[#0A6A4C] to-[#08583E] text-white py-3.5 rounded-2xl font-extrabold text-lg active-press shadow-xl shadow-[#0A6A4C]/25 hover:shadow-2xl hover:shadow-[#0A6A4C]/35 border border-[#C89B3C]/30 transition-all flex items-center justify-center gap-2"
          >
            <span>{t('calculate')}</span>
            <svg className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
            </svg>
          </button>
          <button 
            onClick={() => setStep(AppStep.GENDER)} 
            className="w-full h-11 rounded-xl font-bold text-[#0B1D19] bg-white border border-slate-200 active-press hover:bg-slate-50 text-sm transition-colors"
          >
            {t('back')}
          </button>
        </div>
      </ScreenWrapper>
    );
  }

  // STEP 9: RESULT SCREEN
  if (step === AppStep.RESULT && result) {
    return (
      <div className={`h-full flex flex-col overflow-hidden bg-transparent pt-safe ${langClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <header className="px-5 pt-3 pb-2 text-center space-y-2.5 shrink-0 relative">
          <div className="space-y-0.5">
            <span className="text-[10px] font-bold uppercase tracking-widest text-[#0A6A4C]">{t('distribution_result')}</span>
            <h2 className="text-xl sm:text-2xl font-extrabold text-[#0B1D19] tracking-tight">{t('app_title')}</h2>
          </div>
          
          {/* Imperial Grand Net Estate Hero Card */}
          <div className="royal-card p-4 sm:p-5 text-white space-y-1 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#C89B3C]/10 rounded-full blur-2xl pointer-events-none" />
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-[#C89B3C]">{t('net_estate')}</p>
            <p className="text-3xl sm:text-4xl font-extrabold text-[#F4D37A] tracking-tight bdi-num drop-shadow-sm">
              ₹{Math.round(result.netEstate).toLocaleString()}
            </p>
          </div>

          {/* Distributable Assets 4-Quadrant Matrix */}
          {(detailedAssets.enabled || result.totalLand > 0 || result.totalGold > 0 || result.totalSilver > 0) && (
            <div className="grid grid-cols-2 gap-2 text-left rtl:text-right">
              {/* Cash Available */}
              <div className="silk-card p-2.5 border-teal-900/15 flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('cash_available')}</span>
                <span className="text-sm sm:text-base font-extrabold text-teal-700 bdi-num">₹{Math.round(result.distributableCash).toLocaleString()}</span>
              </div>

              {/* Land Available */}
              {result.totalLand > 0 && (
                <div className="silk-card p-2.5 border-emerald-900/15 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('land_available')}</span>
                  <div>
                    <span className="text-sm font-extrabold text-[#0A6A4C] bdi-num">
                      {result.totalLand.toFixed(2)} {t(detailedAssets.land.unit)}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 bdi-num">
                      ≈ ₹{Math.round(result.totalLandValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Gold Available */}
              {result.totalGold > 0 && (
                <div className="silk-card p-2.5 border-amber-900/15 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('gold_available')}</span>
                  <div>
                    <span className="text-sm font-extrabold text-[#C89B3C] bdi-num">
                      {result.totalGold.toFixed(3)} {t(detailedAssets.gold.unit)}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 bdi-num">
                      ≈ ₹{Math.round(result.totalGoldValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Silver Available */}
              {result.totalSilver > 0 && (
                <div className="silk-card p-2.5 border-slate-300 flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">{t('silver_available')}</span>
                  <div>
                    <span className="text-sm font-extrabold text-slate-600 bdi-num">
                      {result.totalSilver.toFixed(3)} {t(detailedAssets.silver.unit)}
                    </span>
                    <span className="block text-[9px] font-bold text-slate-400 bdi-num">
                      ≈ ₹{Math.round(result.totalSilverValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Scrollable Individual Shares */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-container hide-scrollbar px-5 py-2 space-y-3">
          {/* Proportion Summary Dial */}
          <div className="silk-card p-3.5 border-emerald-900/10">
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className={`${isRtl ? 'border-l pl-2' : 'border-r pr-2'} border-slate-200`}>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('fixed_shares')}</p>
                <p className="text-base font-black text-[#0B1D19] bdi-num">{(result.summary.fixedTotal * 100).toFixed(1)}%</p>
              </div>
              <div>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('residue_shares')}</p>
                <p className="text-base font-black text-[#0A6A4C] bdi-num">{(result.summary.residueTotal * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Sharia Rule Decrees: Aul or Radd */}
          {result.summary.aulApplied && (
            <div className="p-3 rounded-2xl bg-amber-50/90 text-amber-900 text-xs font-bold border border-amber-300/60 flex items-center gap-2">
              <span className="shrink-0 text-base">⚖️</span> 
              <span>{t('aul_warning')}</span>
            </div>
          )}

          {result.summary.raddApplied && (
            <div className="p-3 rounded-2xl bg-teal-50/90 text-teal-900 text-xs font-bold border border-teal-300/60 flex items-center gap-2">
              <span className="shrink-0 text-base">🔄</span> 
              <span>{t('radd_warning')}</span>
            </div>
          )}

          {result.warnings.map((w, i) => (
            <div key={i} className="p-3 rounded-2xl bg-amber-50/90 text-amber-900 text-xs font-bold border border-amber-300/60 flex items-center gap-2">
              <span className="shrink-0 text-base">⚠️</span> 
              <span>{t(w)}</span>
            </div>
          ))}

          {/* Heir Cards Feed */}
          <div className="space-y-3 pb-6">
            <h3 className="px-1 font-extrabold text-[#0B1D19] text-[11px] uppercase tracking-wider opacity-60">
              {t('individual_shares')}
            </h3>

            {result.shares.map((s, i) => {
              const isExcluded = s.type === 'Excluded';
              return (
                <div 
                  key={i} 
                  className={`silk-card p-4 sm:p-5 flex flex-col gap-3 transition-transform ${isExcluded ? 'border-slate-200 bg-slate-50/50 opacity-60' : 'border-[#0A6A4C]/20'}`}
                >
                  {/* Card Header */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-extrabold text-[#0B1D19] text-lg leading-tight">{s.label}</p>
                      <p className="text-[10px] font-bold text-[#0A6A4C] uppercase tracking-wider mt-0.5">
                        {isExcluded ? t('excluded') : `${s.type} • ${s.symbol}`}
                      </p>
                    </div>
                    <div className="bg-slate-100/80 px-2.5 py-1 rounded-lg text-xs font-bold text-slate-700 border border-slate-200 shrink-0">
                      <span className="bdi-num">{s.count}</span> {s.count === 1 ? t('person') : t('persons')}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* Share Fraction & Primary Value Highlight */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ratio')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#0B1D19] bg-slate-100 px-2 py-0.5 rounded-md bdi-num">{s.fraction}</span>
                        <span className="text-[10px] font-bold text-slate-400 bdi-num">({s.percentage})</span>
                      </div>
                    </div>

                    {!isExcluded && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{t('total_value_each')}</span>
                        <span className="text-xl font-extrabold text-[#0A6A4C] tracking-tight bdi-num">
                          ₹{Math.round(s.amountEach).toLocaleString()}
                        </span>
                      </div>
                    )}

                    {!isExcluded && s.count > 1 && (
                      <div className="flex justify-between items-center text-[10px] font-bold text-slate-400">
                        <span>{t('total_group_value')}:</span>
                        <span className="bdi-num">₹{Math.round(s.amount).toLocaleString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Detailed Asset Breakdown per Individual */}
                  {!isExcluded && (
                    <div className="pt-2 border-t border-slate-100 space-y-1 text-xs">
                      {result.distributableCash > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <span>💵</span> {t('cash_each')}
                          </span>
                          <span className="font-bold text-teal-700 bdi-num">
                            ₹{Math.round(s.cashEach).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {result.totalLand > 0 && s.landEach > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <span>🏘️</span> {t('land_each')}
                          </span>
                          <div className="text-right rtl:text-left">
                            <span className="font-bold text-[#0A6A4C] bdi-num">
                              {s.landEach.toFixed(3)} {t(detailedAssets.land.unit)}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-bold bdi-num">
                              (₹{Math.round(s.landValueEach).toLocaleString()})
                            </span>
                          </div>
                        </div>
                      )}

                      {result.totalGold > 0 && s.goldEach > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <span>🥇</span> {t('gold_each')}
                          </span>
                          <div className="text-right rtl:text-left">
                            <span className="font-bold text-[#C89B3C] bdi-num">
                              {s.goldEach.toFixed(3)} {t(detailedAssets.gold.unit)}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-bold bdi-num">
                              (₹{Math.round(s.goldValueEach).toLocaleString()})
                            </span>
                          </div>
                        </div>
                      )}

                      {result.totalSilver > 0 && s.silverEach > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-slate-500 flex items-center gap-1">
                            <span>🥈</span> {t('silver_each')}
                          </span>
                          <div className="text-right rtl:text-left">
                            <span className="font-bold text-slate-600 bdi-num">
                              {s.silverEach.toFixed(3)} {t(detailedAssets.silver.unit)}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-bold bdi-num">
                              (₹{Math.round(s.silverValueEach).toLocaleString()})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer: Start New Calculation Button */}
        <div className="px-6 py-4 glass-nav rounded-t-[32px] shadow-2xl shrink-0 pb-safe">
          <button 
            onClick={reset} 
            className="w-full bg-[#0A1C18] hover:bg-[#142F29] text-white py-4 rounded-2xl font-bold text-base active-press shadow-xl border border-[#C89B3C]/30 transition-colors flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5 text-[#C89B3C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span>{t('new_calculation')}</span>
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;