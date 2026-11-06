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

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ children, currentStep, nextStep, prevStep, setStep, nextLabel, disabled = false, hideFooter = false, lang }) => {
  const stepIndex = stepsOrder.indexOf(currentStep);
  const t = (key: string) => (translations[lang] as any)?.[key] || key;
  const isRtl = lang === 'ar';
  const langClass = lang === 'ar' ? 'arabic' : lang === 'ml' ? 'malayalam' : lang === 'ta' ? 'tamil' : '';

  return (
    <div className={`h-full flex flex-col relative overflow-hidden bg-transparent pt-safe ${langClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="shrink-0 z-[70]">
        {stepIndex >= 1 && (
          <div className="h-1.5 bg-slate-200/50 w-full relative">
            <div 
              className="h-full bg-[#D89F37] transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(216,159,55,0.4)]" 
              style={{ 
                width: `${((stepIndex) / (stepsOrder.length - 1)) * 100}%`, 
                [isRtl ? 'right' : 'left']: 0,
                position: 'absolute'
              }} 
            />
          </div>
        )}
      </div>
      <main className="flex-1 min-h-0 relative z-10 flex flex-col max-w-md mx-auto w-full px-5 overflow-hidden">{children}</main>
      {!hideFooter && (
        <div className="px-6 py-5 glass flex justify-center gap-4 shrink-0 rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-safe">
          {prevStep && (
            <button 
              onClick={() => setStep(prevStep)} 
              aria-label={t('back')}
              className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-[#1E2E4F] active-press transition-all shadow-sm shrink-0"
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
    // Synchronize HTML element language and direction
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
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-8 space-y-10 overflow-hidden text-center">
        <div className="space-y-3">
          <h1 className="text-3xl font-black text-white tracking-tight">Select Language</h1>
          <h1 className="text-2xl font-black text-white/80 malayalam">ഭാഷ തിരഞ്ഞെടുക്കുക</h1>
          <h1 className="text-2xl font-black text-white/80 tamil">மொழியைத் தேர்ந்தெடுக்கவும்</h1>
          <h1 className="text-2xl font-black text-white/90 arabic" dir="rtl">اختر لغة التطبيق</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
          {[
            { id: 'en', l: 'English', c: '' }, 
            { id: 'ml', l: 'മലയാളം', c: 'malayalam' }, 
            { id: 'ta', l: 'தமிழ்', c: 'tamil' }, 
            { id: 'ar', l: 'العربية', c: 'arabic' }
          ].map(x => (
            <button 
              key={x.id} 
              onClick={() => handleLangSelect(x.id as Language)} 
              className={`glass-card p-6 flex flex-col items-center justify-center gap-2 border-white/20 hover:bg-white/20 transition-all active-press ${x.c}`}
            >
              <span className="text-white font-bold text-xl">{x.l}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest">{x.id}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // STEP 1: WELCOME
  if (step === AppStep.WELCOME) {
    return (
      <div className={`h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-10 text-white text-center relative overflow-hidden ${langClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#006B46]/20 rounded-full -mr-32 -mt-32 blur-3xl pointer-events-none" />
        <div className="relative z-10 animate-in space-y-10 w-full">
          <div className="w-28 h-28 bg-white/10 backdrop-blur-xl rounded-[36px] flex items-center justify-center mx-auto shadow-2xl border border-white/20">
            <svg className="w-14 h-14 text-[#D89F37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div className="space-y-4">
            <h1 className={`text-4xl font-extrabold tracking-tight text-white drop-shadow-md ${isAr ? 'text-4xl' : ''}`}>{t('app_title')}</h1>
            <p className="text-slate-300 text-base sm:text-lg opacity-85 font-medium leading-relaxed max-w-sm mx-auto">{t('app_subtitle')}</p>
          </div>
          <div className="flex flex-col gap-4 max-w-xs mx-auto w-full pt-2">
            <button 
              onClick={() => setStep(AppStep.DESCRIPTION)} 
              className="w-full bg-[#006B46] text-white py-4 rounded-2xl font-bold text-xl active-press shadow-2xl hover:bg-[#007a50] transition-colors"
            >
              {t('start')}
            </button>
            <button 
              onClick={() => setStep(AppStep.LANGUAGE_SELECT)} 
              className="text-white/50 hover:text-white/80 text-xs font-bold uppercase tracking-widest underline transition-colors"
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
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar py-8 space-y-6 animate-in">
          <h2 className={`text-3xl font-black text-[#1E2E4F] text-center ${isAr ? 'text-3xl' : ''}`}>{t('what_is_faraid')}</h2>
          <div className="glass-card p-7 space-y-6 text-slate-700 text-base sm:text-lg leading-relaxed shadow-lg">
            <p>{t('faraid_desc_1')}</p>
            <div className="h-px bg-slate-200/60" />
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
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar py-6 flex flex-col justify-center animate-in space-y-6">
          <div className="glass-card p-6 sm:p-8 w-full shadow-xl space-y-6 border border-emerald-900/10">
            <div className="text-center">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#006B46] bg-emerald-50 px-3 py-1 rounded-full border border-emerald-100">
                {t(isHadith ? 'hadith_title' : 'ayah_title')}
              </span>
            </div>
            
            {/* Arabic display text with complete tashkeel and responsive typography */}
            <div className="arabic-display" dir="rtl">
              {t(isHadith ? 'hadith_arabic' : 'ayah_arabic')}
            </div>

            <div className="h-px bg-slate-200/60 w-3/4 mx-auto" />

            <p className="text-center text-[#1E2E4F] font-bold text-base sm:text-lg leading-relaxed px-2">
              {t(isHadith ? 'hadith_translation' : 'ayah_translation')}
            </p>

            <p className="text-center text-slate-400 font-extrabold text-xs tracking-widest uppercase">
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
          <h2 className="text-3xl font-black text-[#1E2E4F]">{t('rules_title')}</h2>
          <p className="text-xs text-slate-500 font-medium">{t('rules_subtitle')}</p>
        </header>
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-4 pb-6">
          {['fixed_shares', 'asabah', 'hijb'].map(k => (
            <div key={k} className="glass-card p-5 space-y-2 shadow-md border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#006B46]">
              <h3 className="font-black text-[#1E2E4F] text-lg">{t(`${k}_title`)}</h3>
              <p className="text-slate-600 text-sm leading-relaxed">{t(`${k}_desc`)}</p>
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
        <header className="shrink-0 py-4 text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E2E4F]">{t('estate_info')}</h2>
          <div className="flex justify-center gap-2">
            <button 
              type="button"
              onClick={() => setDetailedAssets({...detailedAssets, enabled: false})} 
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${!detailedAssets.enabled ? 'bg-[#1E2E4F] text-white shadow-md' : 'bg-slate-200/80 text-slate-600'}`}
            >
              {t('simple_assets')}
            </button>
            <button 
              type="button"
              onClick={() => setDetailedAssets({...detailedAssets, enabled: true})} 
              className={`px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider transition-all ${detailedAssets.enabled ? 'bg-[#006B46] text-white shadow-md' : 'bg-slate-200/80 text-slate-600'}`}
            >
              {t('advanced_assets')}
            </button>
          </div>

          {/* Live Total Gross Value Banner */}
          <div className="glass-navy p-3 text-white rounded-2xl flex items-center justify-between px-4 shadow-sm">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider">{t('total_gross_assets')}</span>
            <span className="text-lg font-black text-[#D89F37] bdi-num">₹{Math.round(currentGrossTotal).toLocaleString()}</span>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-4 pb-8">
          {!detailedAssets.enabled ? (
            <div className="glass-card p-5 space-y-2 shadow-md">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">{t('total_assets')}</label>
              <div className="relative flex items-center">
                <span className={`absolute ${isRtl ? 'right-0 mr-1' : 'left-0 ml-1'} text-2xl font-black text-slate-400 pointer-events-none`}>₹</span>
                <input 
                  type="number" 
                  inputMode="numeric" 
                  value={estate.totalAssets || ''} 
                  onChange={e => setEstate({...estate, totalAssets: Math.max(0, Number(e.target.value))})} 
                  placeholder="0"
                  className={`w-full bg-transparent border-b-2 border-slate-200 py-3 ${isRtl ? 'pr-8 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#1E2E4F] outline-none focus:border-[#006B46] transition-colors`} 
                />
              </div>
            </div>
          ) : (
            <>
              {/* Land Section */}
              <div className="glass-card p-5 space-y-3 shadow-md bg-white/70 border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#006B46]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#006B46] tracking-wider flex items-center gap-1.5">
                    <span>🏘️</span> {t('land_details')}
                  </h3>
                  <select 
                    value={detailedAssets.land.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, land: { ...detailedAssets.land, unit: e.target.value as LandUnit } })}
                    className="bg-slate-100 text-[#1E2E4F] text-xs font-black px-2.5 py-1 rounded-lg outline-none border border-slate-200 cursor-pointer"
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
                      className="w-full bg-slate-50 p-2.5 text-lg font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-[#006B46] outline-none" 
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
                      className="w-full bg-slate-50 p-2.5 text-lg font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-[#006B46] outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-slate-400 font-medium">{t('value')}:</span>
                  <span className="font-black text-[#006B46] bdi-num">₹{Math.round((detailedAssets.land.area || 0) * (detailedAssets.land.valuePerUnit || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Gold Section */}
              <div className="glass-card p-5 space-y-3 bg-white/70 shadow-md border-l-4 rtl:border-l-0 rtl:border-r-4 border-[#D89F37]">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-[#D89F37] tracking-wider flex items-center gap-1.5">
                    <span>🥇</span> {t('gold_details')}
                  </h3>
                  <select 
                    value={detailedAssets.gold.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, gold: { ...detailedAssets.gold, unit: e.target.value as MetalUnit } })}
                    className="bg-amber-50 text-[#D89F37] text-xs font-black px-2.5 py-1 rounded-lg outline-none border border-amber-200 cursor-pointer"
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
                      className="w-full bg-slate-50 p-2.5 text-lg font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-[#D89F37] outline-none" 
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
                      className="w-full bg-slate-50 p-2.5 text-lg font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-[#D89F37] outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-slate-400 font-medium">{t('value')}:</span>
                  <span className="font-black text-[#D89F37] bdi-num">₹{Math.round((detailedAssets.gold.weight || 0) * (detailedAssets.gold.ratePerUnit || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Silver Section */}
              <div className="glass-card p-5 space-y-3 bg-white/70 shadow-md border-l-4 rtl:border-l-0 rtl:border-r-4 border-slate-400">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-black uppercase text-slate-600 tracking-wider flex items-center gap-1.5">
                    <span>🥈</span> {t('silver_details')}
                  </h3>
                  <select 
                    value={detailedAssets.silver.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, silver: { ...detailedAssets.silver, unit: e.target.value as MetalUnit } })}
                    className="bg-slate-100 text-slate-600 text-xs font-black px-2.5 py-1 rounded-lg outline-none border border-slate-200 cursor-pointer"
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
                      className="w-full bg-slate-50 p-2.5 text-lg font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-slate-400 outline-none" 
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
                      className="w-full bg-slate-50 p-2.5 text-lg font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-slate-400 outline-none" 
                    />
                  </div>
                </div>
                <div className="flex justify-between items-center pt-1 text-xs">
                  <span className="text-slate-400 font-medium">{t('value')}:</span>
                  <span className="font-black text-slate-600 bdi-num">₹{Math.round((detailedAssets.silver.weight || 0) * (detailedAssets.silver.ratePerUnit || 0)).toLocaleString()}</span>
                </div>
              </div>

              {/* Other Cash / Bank */}
              <div className="glass-card p-5 space-y-2 bg-white/70 shadow-md border-l-4 rtl:border-l-0 rtl:border-r-4 border-blue-500">
                <h3 className="text-xs font-black uppercase text-blue-600 tracking-wider flex items-center gap-1.5">
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
                    className={`w-full bg-slate-50 p-2.5 ${isRtl ? 'pr-7 text-right' : 'pl-7 text-left'} text-xl font-black text-[#1E2E4F] rounded-lg border border-slate-200 focus:border-blue-500 outline-none`} 
                  />
                </div>
              </div>

              {/* Wasiyyah (Will) Section for Detailed Assets */}
              <div className="pt-2">
                <div className="glass-card p-5 space-y-3 bg-[#D89F37]/5 border border-[#D89F37]/30 shadow-md">
                  <h3 className="text-xs font-black uppercase text-[#D89F37] tracking-wider flex items-center gap-1.5">
                    <span>📜</span> {t('will_wasiyyah')}
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-500 uppercase block">{t('wasiyyah_cash')} (₹)</label>
                      <input 
                        type="number" 
                        inputMode="numeric" 
                        placeholder="0"
                        value={detailedWill.cash || ''} 
                        onChange={e => setDetailedWill({...detailedWill, cash: Math.max(0, Number(e.target.value))})} 
                        className="w-full bg-white p-2 text-base font-black text-[#1E2E4F] rounded-lg border border-slate-200 outline-none focus:border-[#D89F37]" 
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
                        className="w-full bg-white p-2 text-base font-black text-[#1E2E4F] rounded-lg border border-slate-200 outline-none focus:border-[#D89F37]" 
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
                        className="w-full bg-white p-2 text-base font-black text-[#1E2E4F] rounded-lg border border-slate-200 outline-none focus:border-[#D89F37]" 
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
                        className="w-full bg-white p-2 text-base font-black text-[#1E2E4F] rounded-lg border border-slate-200 outline-none focus:border-[#D89F37]" 
                      />
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* Liabilities Section: Debts & Funeral Expenses (and Simple Wasiyyah) */}
          {[
            { l: t('debts'), k: 'debts', i: '📉' },
            { l: t('funeral_expenses'), k: 'funeral', i: '🕯️' },
            ...(!detailedAssets.enabled ? [{ l: t('will_wasiyyah'), k: 'will', i: '📜' }] : [])
          ].map(f => (
            <div key={f.k} className="glass-card p-5 space-y-2 shadow-md">
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
                  className={`w-full bg-transparent border-b-2 border-slate-200 py-3 ${isRtl ? 'pr-8 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#1E2E4F] outline-none focus:border-[#006B46] transition-colors`} 
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
        <div className="flex-1 flex flex-col items-center justify-center py-8 space-y-8 animate-in text-center">
          <div className="space-y-2">
            <h2 className="text-3xl font-black text-[#1E2E4F]">{t('deceased_person')}</h2>
            <p className="text-sm text-slate-500">{t('select_gender')}</p>
          </div>
          <div className="grid grid-cols-1 gap-5 w-full max-w-xs">
            {['Male', 'Female'].map(g => (
              <button 
                key={g} 
                onClick={() => setDeceasedGender(g as any)} 
                className={`p-8 rounded-[32px] font-black text-2xl sm:text-3xl transition-all border-4 shadow-lg active-press flex items-center justify-center gap-3 ${deceasedGender === g ? 'bg-[#1E2E4F] text-white border-[#D89F37]' : 'bg-white text-slate-500 border-white hover:border-slate-200'}`}
              >
                <span>{g === 'Male' ? '👨' : '👩'}</span>
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
        <header className="shrink-0 pt-5 pb-3 text-center space-y-1">
          <h2 className="text-2xl font-black text-[#1E2E4F]">{t('heirs')}</h2>
          <p className="text-xs text-slate-500">{t('enter_count')}</p>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-3 mb-3">
          <div className="glass-card overflow-hidden shadow-lg border border-slate-100">
            {HEIR_ORDER.map(type => {
              const meta = HEIR_METADATA[type];
              if ((type === 'Husband' && deceasedGender !== 'Female') || (type === 'Wives' && deceasedGender !== 'Male')) {
                return null;
              }
              const count = getHeirCount(type as HeirType);
              return (
                <div key={type} className="flex items-center justify-between border-b border-slate-100 last:border-0 p-4 transition-colors hover:bg-slate-50/50">
                  <div className="pr-2">
                    <p className="font-bold text-[#1E2E4F] text-base leading-snug">{meta[lang]}</p>
                    {meta.max && <span className="text-[10px] text-slate-400 font-medium">max: {meta.max}</span>}
                  </div>
                  <div className="flex items-center gap-2.5 bg-slate-100/70 p-1.5 rounded-2xl shrink-0">
                    <button 
                      type="button"
                      aria-label="Decrease count"
                      onClick={() => updateHeirCount(type as HeirType, -1)} 
                      className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${count > 0 ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-300'}`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                    </button>
                    <span className={`w-7 text-center font-black text-lg bdi-num ${count > 0 ? 'text-[#006B46]' : 'text-slate-300'}`}>
                      {count}
                    </span>
                    <button 
                      type="button"
                      aria-label="Increase count"
                      disabled={meta.max ? count >= meta.max : false} 
                      onClick={() => updateHeirCount(type as HeirType, 1)} 
                      className="w-9 h-9 rounded-xl bg-white text-[#006B46] shadow-sm flex items-center justify-center transition-all active-press disabled:opacity-30"
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {uiError && (
          <div className="mb-3 p-3.5 bg-rose-50 text-rose-700 rounded-2xl text-xs sm:text-sm font-bold flex items-center gap-2 border border-rose-200 animate-in">
            <span className="shrink-0 text-base">⚠️</span> 
            <span>{uiError}</span>
          </div>
        )}

        <div className="shrink-0 pb-6 flex flex-col gap-2.5">
          <button 
            onClick={handleCalculate} 
            className="w-full bg-[#006B46] text-white py-4 rounded-2xl font-black text-xl active-press shadow-2xl hover:bg-[#007a50] transition-colors"
          >
            {t('calculate')}
          </button>
          <button 
            onClick={() => setStep(AppStep.GENDER)} 
            className="w-full h-12 rounded-2xl font-bold text-[#1E2E4F] bg-white/70 border border-slate-200 active-press hover:bg-white transition-colors"
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
        <header className="px-5 pt-4 pb-3 text-center space-y-3 shrink-0 relative">
          <h2 className="text-2xl sm:text-3xl font-black text-[#1E2E4F] tracking-tight">{t('distribution_result')}</h2>
          
          {/* Main Grand Net Estate Banner */}
          <div className="glass-navy p-5 text-white space-y-1 shadow-2xl text-center rounded-[24px]">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-60">{t('net_estate')}</p>
            <p className="text-3xl sm:text-4xl font-black text-[#D89F37] tracking-tight bdi-num">
              ₹{Math.round(result.netEstate).toLocaleString()}
            </p>
          </div>

          {/* Distributable Assets Breakdown Cards */}
          {(detailedAssets.enabled || result.totalLand > 0 || result.totalGold > 0 || result.totalSilver > 0) && (
            <div className="grid grid-cols-2 gap-2 text-left rtl:text-right">
              {/* Cash Available */}
              <div className="glass-card p-3 border-blue-100 shadow-sm flex flex-col justify-between">
                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('cash_available')}</span>
                <span className="text-base font-black text-blue-600 bdi-num">₹{Math.round(result.distributableCash).toLocaleString()}</span>
              </div>

              {/* Land Available */}
              {result.totalLand > 0 && (
                <div className="glass-card p-3 border-emerald-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('land_available')}</span>
                  <div>
                    <span className="text-sm font-black text-[#006B46] bdi-num">
                      {result.totalLand.toFixed(2)} {t(detailedAssets.land.unit)}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 bdi-num">
                      ≈ ₹{Math.round(result.totalLandValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Gold Available */}
              {result.totalGold > 0 && (
                <div className="glass-card p-3 border-amber-100 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('gold_available')}</span>
                  <div>
                    <span className="text-sm font-black text-[#D89F37] bdi-num">
                      {result.totalGold.toFixed(3)} {t(detailedAssets.gold.unit)}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 bdi-num">
                      ≈ ₹{Math.round(result.totalGoldValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}

              {/* Silver Available */}
              {result.totalSilver > 0 && (
                <div className="glass-card p-3 border-slate-200 shadow-sm flex flex-col justify-between">
                  <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">{t('silver_available')}</span>
                  <div>
                    <span className="text-sm font-black text-slate-600 bdi-num">
                      {result.totalSilver.toFixed(3)} {t(detailedAssets.silver.unit)}
                    </span>
                    <span className="block text-[10px] font-bold text-slate-400 bdi-num">
                      ≈ ₹{Math.round(result.totalSilverValue).toLocaleString()}
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}
        </header>

        {/* Scrollable Shares List */}
        <div className="flex-1 min-h-0 overflow-y-auto scroll-container hide-scrollbar px-5 py-2 space-y-4">
          {/* Summary Shares Percentages Banner */}
          <div className="bg-emerald-50/70 border border-emerald-100 p-4 rounded-2xl shadow-sm backdrop-blur-md">
            <div className="grid grid-cols-2 gap-3">
              <div className={`space-y-0.5 ${isRtl ? 'border-l pl-2' : 'border-r pr-2'} border-emerald-100 text-center`}>
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('fixed_shares')}</p>
                <p className="text-lg font-black text-[#1E2E4F] bdi-num">{(result.summary.fixedTotal * 100).toFixed(1)}%</p>
              </div>
              <div className="space-y-0.5 text-center">
                <p className="text-[9px] text-slate-500 font-bold uppercase tracking-wider">{t('residue_shares')}</p>
                <p className="text-lg font-black text-[#1E2E4F] bdi-num">{(result.summary.residueTotal * 100).toFixed(1)}%</p>
              </div>
            </div>
          </div>

          {/* Special Sharia Notices: Aul or Radd */}
          {result.summary.aulApplied && (
            <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-2.5">
              <span className="shrink-0 text-base">⚖️</span> 
              <span>{t('aul_warning')}</span>
            </div>
          )}

          {result.summary.raddApplied && (
            <div className="p-3.5 rounded-2xl bg-teal-50 text-teal-900 text-xs font-bold border border-teal-200 flex items-center gap-2.5">
              <span className="shrink-0 text-base">🔄</span> 
              <span>{t('radd_warning')}</span>
            </div>
          )}

          {result.warnings.map((w, i) => (
            <div key={i} className="p-3.5 rounded-2xl bg-amber-50 text-amber-900 text-xs font-bold border border-amber-200 flex items-center gap-2.5">
              <span className="shrink-0 text-base">⚠️</span> 
              <span>{t(w)}</span>
            </div>
          ))}

          {/* Individual Shares List */}
          <div className="space-y-3 pb-6">
            <h3 className="px-1 font-black text-[#1E2E4F] text-[11px] uppercase tracking-wider opacity-60">
              {t('individual_shares')}
            </h3>

            {result.shares.map((s, i) => {
              const isExcluded = s.type === 'Excluded';
              return (
                <div 
                  key={i} 
                  className={`glass-card p-5 flex flex-col gap-3 shadow-md border-l-4 rtl:border-l-0 rtl:border-r-4 transition-transform ${isExcluded ? 'border-slate-300 opacity-60' : 'border-[#006B46]'}`}
                >
                  {/* Card Header: Heir Name & Badges */}
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-black text-[#1E2E4F] text-lg sm:text-xl leading-tight">{s.label}</p>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-0.5">
                        {isExcluded ? t('excluded') : `${s.type} • ${s.symbol}`}
                      </p>
                    </div>
                    <div className="bg-white/80 px-3 py-1.5 rounded-xl text-xs font-black text-slate-600 border border-slate-200 shrink-0">
                      <span className="bdi-num">{s.count}</span> {s.count === 1 ? t('person') : t('persons')}
                    </div>
                  </div>

                  <div className="h-px bg-slate-100" />

                  {/* Share Ratio and Total Monetary Share Value */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{t('ratio')}</span>
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-black text-[#1E2E4F] bg-slate-100 px-2 py-0.5 rounded-md bdi-num">{s.fraction}</span>
                        <span className="text-[10px] font-bold text-slate-400 bdi-num">({s.percentage})</span>
                      </div>
                    </div>

                    {!isExcluded && (
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-xs font-black text-slate-500 uppercase tracking-wider">{t('total_value_each')}</span>
                        <span className="text-xl sm:text-2xl font-black text-[#006B46] tracking-tight bdi-num">
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
                    <div className="pt-2 border-t border-slate-100 space-y-1.5 text-xs">
                      {/* Cash Portion */}
                      {result.distributableCash > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-500 flex items-center gap-1">
                            <span>💵</span> {t('cash_each')}
                          </span>
                          <span className="font-black text-blue-600 bdi-num">
                            ₹{Math.round(s.cashEach).toLocaleString()}
                          </span>
                        </div>
                      )}

                      {/* Land Portion */}
                      {result.totalLand > 0 && s.landEach > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-500 flex items-center gap-1">
                            <span>🏘️</span> {t('land_each')}
                          </span>
                          <div className="text-right rtl:text-left">
                            <span className="font-black text-[#006B46] bdi-num">
                              {s.landEach.toFixed(3)} {t(detailedAssets.land.unit)}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-bold bdi-num">
                              (₹{Math.round(s.landValueEach).toLocaleString()})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Gold Portion */}
                      {result.totalGold > 0 && s.goldEach > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-500 flex items-center gap-1">
                            <span>🥇</span> {t('gold_each')}
                          </span>
                          <div className="text-right rtl:text-left">
                            <span className="font-black text-[#D89F37] bdi-num">
                              {s.goldEach.toFixed(3)} {t(detailedAssets.gold.unit)}
                            </span>
                            <span className="block text-[9px] text-slate-400 font-bold bdi-num">
                              (₹{Math.round(s.goldValueEach).toLocaleString()})
                            </span>
                          </div>
                        </div>
                      )}

                      {/* Silver Portion */}
                      {result.totalSilver > 0 && s.silverEach > 0 && (
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-500 flex items-center gap-1">
                            <span>🥈</span> {t('silver_each')}
                          </span>
                          <div className="text-right rtl:text-left">
                            <span className="font-black text-slate-600 bdi-num">
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

        {/* Footer Button: Start New Calculation */}
        <div className="px-6 py-5 glass rounded-t-[32px] shadow-2xl shrink-0 pb-safe">
          <button 
            onClick={reset} 
            className="w-full bg-[#1E2E4F] text-white py-4 rounded-2xl font-black text-lg active-press shadow-xl hover:bg-[#25375d] transition-colors"
          >
            {t('new_calculation')}
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;