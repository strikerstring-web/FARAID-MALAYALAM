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
  const t = (key: string) => (translations[lang] as any)[key] || key;
  const isRtl = lang === 'ar';

  const langClass = lang === 'ar' ? 'arabic' : lang === 'ml' ? 'malayalam' : lang === 'ta' ? 'tamil' : '';

  return (
    <div className={`h-full flex flex-col relative overflow-hidden bg-transparent pt-safe ${langClass}`} dir={isRtl ? 'rtl' : 'ltr'}>
      <div className="shrink-0 z-[70]">
        {stepIndex >= 1 && (
          <div className="h-1.5 bg-slate-200/50 w-full">
            <div className="h-full bg-[#D89F37] transition-all duration-700 ease-in-out shadow-[0_0_8px_rgba(216,159,55,0.4)]" style={{ width: `${((stepIndex) / (stepsOrder.length - 1)) * 100}%`, [isRtl ? 'right' : 'left']: 0 }} />
          </div>
        )}
      </div>
      <main className="flex-1 min-h-0 relative z-10 flex flex-col max-w-md mx-auto w-full px-5 overflow-hidden">{children}</main>
      {!hideFooter && (
        <div className="px-6 py-6 glass flex justify-center gap-4 shrink-0 rounded-t-[32px] shadow-[0_-8px_30px_rgba(0,0,0,0.05)] pb-safe">
          {prevStep && (
            <button onClick={() => setStep(prevStep)} className="w-14 h-14 rounded-2xl flex items-center justify-center bg-white border border-slate-200 text-[#1E2E4F] active-press transition-all shadow-sm">
              <svg className={`w-6 h-6 ${isRtl ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
            </button>
          )}
          {nextStep && (
            <button disabled={disabled} onClick={() => setStep(nextStep)} className="flex-1 h-14 bg-[#006B46] text-white rounded-2xl font-bold text-lg transition-all active-press shadow-lg shadow-[#006B46]/20 disabled:opacity-40">
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
    if (savedLang && Object.keys(translations).includes(savedLang)) { setLang(savedLang); setStep(AppStep.WELCOME); }
  }, []);

  const handleLangSelect = (l: Language) => { setLang(l); localStorage.setItem('appLanguage', l); setStep(AppStep.WELCOME); };
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
    const cashValue = detailedAssets.enabled ? detailedAssets.otherCash : estate.totalAssets;
    if (heirs.length === 0) { setUiError(t('error_no_heirs')); return; }
    if (cashValue <= 0 && !detailedAssets.enabled) { setUiError(t('error_invalid_assets')); return; }

    try {
      if (deceasedGender) {
        const res = calculateShares(heirs, deceasedGender, { ...estate, totalAssets: cashValue, detailed: detailedAssets, detailedWill }, lang);
        setResult(res);
        setStep(AppStep.RESULT);
      }
    } catch (e) { setUiError(t('error_general')); }
  };

  const reset = () => {
    setHeirs([]); setDeceasedGender(null); setEstate({ totalAssets: 0, debts: 0, funeral: 0, will: 0 });
    setDetailedAssets({ 
      enabled: false, 
      land: { area: 0, unit: 'cent', valuePerUnit: 0 }, 
      gold: { weight: 0, unit: 'gram', ratePerUnit: 0 }, 
      silver: { weight: 0, unit: 'gram', ratePerUnit: 0 }, 
      otherCash: 0 
    });
    setDetailedWill({ cash: 0, landArea: 0, goldWeight: 0, silverWeight: 0 });
    setResult(null); setUiError(null); setStep(AppStep.WELCOME);
  };

  if (step === AppStep.LANGUAGE_SELECT) {
    return (
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-8 space-y-12 overflow-hidden text-center">
        <div className="space-y-4">
          <h1 className="text-3xl font-black text-white tracking-tight">Select Language</h1>
          <h1 className="text-2xl font-black text-white/80 malayalam">ഭാഷ തിരഞ്ഞെടുക്കുക</h1>
          <h1 className="text-2xl font-black text-white/70 arabic" dir="rtl">اختر اللغة</h1>
        </div>
        <div className="grid grid-cols-2 gap-4 w-full max-w-sm mx-auto">
          {[{ id: 'en', l: 'English', c: '' }, { id: 'ml', l: 'മലയാളം', c: 'malayalam' }, { id: 'ta', l: 'தமிழ்', c: 'tamil' }, { id: 'ar', l: 'العربية', c: 'arabic' }].map(x => (
            <button key={x.id} onClick={() => handleLangSelect(x.id as Language)} className={`glass-card p-6 flex flex-col items-center justify-center gap-2 border-white/20 hover:bg-white/20 transition-all active-press ${x.c}`}>
              <span className="text-white font-bold text-lg">{x.l}</span>
              <span className="text-white/40 text-[10px] uppercase tracking-widest">{x.id}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  if (step === AppStep.WELCOME) {
    const isAr = lang === 'ar';
    return (
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-10 text-white text-center relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#006B46]/20 rounded-full -mr-32 -mt-32 blur-3xl" />
        <div className="relative z-10 animate-in space-y-12 w-full">
          <div className="w-32 h-32 bg-white/10 backdrop-blur-xl rounded-[40px] flex items-center justify-center mx-auto shadow-2xl border border-white/20">
            <svg className="w-16 h-16 text-[#D89F37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
          </div>
          <div className="space-y-4">
            <h1 className={`text-4xl font-extrabold tracking-tight text-white drop-shadow-md ${isAr ? 'arabic text-5xl leading-tight' : ''}`}>{t('app_title')}</h1>
            <p className={`text-slate-300 text-lg opacity-80 font-medium ${isAr ? 'arabic' : ''}`}>{t('app_subtitle')}</p>
          </div>
          <div className="flex flex-col gap-4 max-w-xs mx-auto w-full">
            <button onClick={() => setStep(AppStep.DESCRIPTION)} className={`w-full bg-[#006B46] text-white py-5 rounded-2xl font-bold text-xl active-press shadow-2xl ${isAr ? 'arabic text-2xl' : ''}`}>{t('start')}</button>
            <button onClick={() => setStep(AppStep.LANGUAGE_SELECT)} className="text-white/40 text-xs font-bold uppercase tracking-widest underline">Change Language</button>
          </div>
        </div>
      </div>
    );
  }

  if (step === AppStep.DESCRIPTION) {
    const isAr = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.HADITH} prevStep={AppStep.WELCOME} setStep={setStep}>
        <div className="flex-1 overflow-y-auto scroll-container py-8 space-y-8 animate-in text-center">
          <h2 className={`text-3xl font-black text-[#1E2E4F] ${isAr ? 'arabic text-4xl' : ''}`}>{t('what_is_faraid')}</h2>
          <div className="glass-card p-8 space-y-6 text-slate-700 text-lg shadow-lg">
            <p className={isAr ? 'arabic' : ''}>{t('faraid_desc_1')}</p>
            <p className={isAr ? 'arabic' : ''}>{t('faraid_desc_2')}</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.HADITH || step === AppStep.AYAH) {
    const isHadith = step === AppStep.HADITH;
    const isAr = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={isHadith ? AppStep.AYAH : AppStep.RULES} prevStep={isHadith ? AppStep.DESCRIPTION : AppStep.HADITH} setStep={setStep}>
        <div className="flex-1 flex flex-col justify-center py-8 animate-in space-y-8">
          <div className="glass-card p-10 w-full shadow-xl">
            <div className="arabic-display mb-10" dir="rtl">{t(isHadith ? 'hadith_arabic' : 'ayah_arabic')}</div>
            <p className={`text-center text-[#1E2E4F] font-bold text-xl leading-relaxed ${isAr ? 'arabic' : ''}`}>{t(isHadith ? 'hadith_translation' : 'ayah_translation')}</p>
            <p className={`mt-10 text-center text-slate-400 font-black text-sm tracking-widest uppercase ${isAr ? 'arabic opacity-60' : ''}`}>{t(isHadith ? 'hadith_ref' : 'ayah_ref')}</p>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.RULES) {
    const isAr = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.ASSETS} prevStep={AppStep.AYAH} setStep={setStep}>
        <header className="shrink-0 py-6 text-center"><h2 className={`text-3xl font-black text-[#1E2E4F] ${isAr ? 'arabic text-4xl' : ''}`}>{t('rules_title')}</h2></header>
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-5 pb-8">
          {['fixed_shares', 'asabah', 'hijb'].map(k => (
            <div key={k} className="glass-card p-6 space-y-3 shadow-md border-l-4 border-[#006B46]">
              <h3 className={`font-black text-[#1E2E4F] text-xl ${isAr ? 'arabic text-right' : ''}`}>{t(`${k}_title`)}</h3>
              <p className={`text-slate-600 text-sm leading-relaxed ${isAr ? 'arabic text-right' : ''}`}>{t(`${k}_desc`)}</p>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.ASSETS) {
    const isRtl = lang === 'ar';
    const isAr = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={AppStep.GENDER} prevStep={AppStep.RULES} setStep={setStep}>
        <header className="shrink-0 py-6 text-center space-y-2">
          <h2 className={`text-3xl font-black text-[#1E2E4F] ${isAr ? 'arabic text-4xl' : ''}`}>{t('estate_info')}</h2>
          <div className="flex justify-center gap-2">
            <button onClick={() => setDetailedAssets({...detailedAssets, enabled: false})} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${!detailedAssets.enabled ? 'bg-[#1E2E4F] text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>{t('simple_assets')}</button>
            <button onClick={() => setDetailedAssets({...detailedAssets, enabled: true})} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${detailedAssets.enabled ? 'bg-[#006B46] text-white shadow-md' : 'bg-slate-200 text-slate-500'}`}>{t('advanced_assets')}</button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-5 pb-8">
          {!detailedAssets.enabled ? (
            <div className="glass-card p-6 space-y-3 shadow-md">
              <label className={`text-xs font-bold text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{t('total_assets')}</label>
              <div className="relative">
                <span className={`absolute ${isRtl ? 'right-0 mr-1' : 'left-0 ml-1'} top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300`}>₹</span>
                <input type="number" inputMode="numeric" value={estate.totalAssets || ''} onChange={e => setEstate({...estate, totalAssets: Math.max(0, Number(e.target.value))})} className={`w-full bg-transparent border-b-2 border-slate-100 py-3 ${isRtl ? 'pr-8 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#1E2E4F] outline-none focus:border-[#006B46] transition-colors`} />
              </div>
            </div>
          ) : (
            <>
              {/* Land Section */}
              <div className="glass-card p-6 space-y-4 shadow-md bg-white/40 border-l-4 border-[#006B46]">
                <div className="flex items-center justify-between">
                  <h3 className={`text-[10px] font-black uppercase text-[#006B46] tracking-widest ${isAr ? 'arabic' : ''}`}>🏘️ {t('land_details')}</h3>
                  <select 
                    value={detailedAssets.land.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, land: { ...detailedAssets.land, unit: e.target.value as LandUnit } })}
                    className="bg-slate-100 text-[#1E2E4F] text-[10px] font-black px-2 py-1 rounded-lg outline-none border border-slate-200"
                  >
                    {(['acre', 'cent', 'sqft', 'sqm'] as LandUnit[]).map(u => <option key={u} value={u}>{t(u).toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold text-slate-400 uppercase ${isAr ? 'arabic' : ''}`}>{t('land_area')}</label>
                    <input type="number" inputMode="decimal" value={detailedAssets.land.area || ''} onChange={e => setDetailedAssets({...detailedAssets, land: {...detailedAssets.land, area: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] rounded-lg border border-transparent focus:border-[#006B46] outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold text-slate-400 uppercase ${isAr ? 'arabic' : ''}`}>{t('value_per_unit')}</label>
                    <input type="number" inputMode="numeric" value={detailedAssets.land.valuePerUnit || ''} onChange={e => setDetailedAssets({...detailedAssets, land: {...detailedAssets.land, valuePerUnit: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] rounded-lg border border-transparent focus:border-[#006B46] outline-none" />
                  </div>
                </div>
              </div>

              {/* Gold Section */}
              <div className="glass-card p-6 space-y-4 bg-white/40 shadow-md border-l-4 border-[#D89F37]">
                <div className="flex items-center justify-between">
                  <h3 className={`text-[10px] font-black uppercase text-[#D89F37] tracking-widest ${isAr ? 'arabic' : ''}`}>🥇 {t('gold_details')}</h3>
                  <select 
                    value={detailedAssets.gold.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, gold: { ...detailedAssets.gold, unit: e.target.value as MetalUnit } })}
                    className="bg-amber-50 text-[#D89F37] text-[10px] font-black px-2 py-1 rounded-lg outline-none border border-amber-100"
                  >
                    {(['gram', 'tola'] as MetalUnit[]).map(u => <option key={u} value={u}>{t(u).toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold text-slate-400 ${isAr ? 'arabic' : ''}`}>{t('quantity')}</label>
                    <input type="number" inputMode="decimal" value={detailedAssets.gold.weight || ''} onChange={e => setDetailedAssets({...detailedAssets, gold: {...detailedAssets.gold, weight: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold text-slate-400 ${isAr ? 'arabic' : ''}`}>{t('gold_rate')} (/{t(detailedAssets.gold.unit)})</label>
                    <input type="number" inputMode="numeric" value={detailedAssets.gold.ratePerUnit || ''} onChange={e => setDetailedAssets({...detailedAssets, gold: {...detailedAssets.gold, ratePerUnit: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" />
                  </div>
                </div>
                <div className="pt-1 text-right">
                  <span className="text-[10px] font-bold text-[#D89F37] opacity-60 uppercase tracking-widest">Total: ₹{Math.floor(detailedAssets.gold.weight * detailedAssets.gold.ratePerUnit).toLocaleString()}</span>
                </div>
              </div>

              {/* Silver Section */}
              <div className="glass-card p-6 space-y-4 bg-white/40 shadow-md border-l-4 border-slate-400">
                <div className="flex items-center justify-between">
                  <h3 className={`text-[10px] font-black uppercase text-slate-500 tracking-widest ${isAr ? 'arabic' : ''}`}>🥈 {t('silver_details')}</h3>
                  <select 
                    value={detailedAssets.silver.unit} 
                    onChange={e => setDetailedAssets({ ...detailedAssets, silver: { ...detailedAssets.silver, unit: e.target.value as MetalUnit } })}
                    className="bg-slate-100 text-slate-500 text-[10px] font-black px-2 py-1 rounded-lg outline-none border border-slate-200"
                  >
                    {(['gram', 'tola'] as MetalUnit[]).map(u => <option key={u} value={u}>{t(u).toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold text-slate-400 ${isAr ? 'arabic' : ''}`}>{t('quantity')}</label>
                    <input type="number" inputMode="decimal" value={detailedAssets.silver.weight || ''} onChange={e => setDetailedAssets({...detailedAssets, silver: {...detailedAssets.silver, weight: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" />
                  </div>
                  <div className="space-y-1">
                    <label className={`text-[9px] font-bold text-slate-400 ${isAr ? 'arabic' : ''}`}>{t('silver_rate')} (/{t(detailedAssets.silver.unit)})</label>
                    <input type="number" inputMode="numeric" value={detailedAssets.silver.ratePerUnit || ''} onChange={e => setDetailedAssets({...detailedAssets, silver: {...detailedAssets.silver, ratePerUnit: Math.max(0, Number(e.target.value))}})} className="w-full bg-slate-50 p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" />
                  </div>
                </div>
                <div className="pt-1 text-right">
                  <span className="text-[10px] font-bold text-slate-500 opacity-60 uppercase tracking-widest">Total: ₹{Math.floor(detailedAssets.silver.weight * detailedAssets.silver.ratePerUnit).toLocaleString()}</span>
                </div>
              </div>

              <div className="glass-card p-6 space-y-4 bg-white/40 shadow-md border-l-4 border-blue-500">
                <h3 className={`text-[10px] font-black uppercase text-blue-600 tracking-widest ${isAr ? 'arabic' : ''}`}>💵 {t('other_cash')}</h3>
                <input type="number" inputMode="numeric" value={detailedAssets.otherCash || ''} onChange={e => setDetailedAssets({...detailedAssets, otherCash: Math.max(0, Number(e.target.value))})} className="w-full bg-slate-50 p-3 text-2xl font-black text-[#1E2E4F] rounded-xl outline-none border border-transparent focus:border-blue-500" />
              </div>

              <div className="pt-6 pb-2"><h3 className={`text-[11px] font-black uppercase text-[#D89F37] px-2 tracking-widest ${isAr ? 'arabic text-right' : ''}`}>{t('will_wasiyyah')}</h3></div>
              <div className="glass-card p-6 space-y-5 bg-[#D89F37]/5 border-[#D89F37]/20 shadow-md">
                <div className="space-y-4">
                  <div className="space-y-1"><label className={`text-[9px] font-bold text-slate-400 uppercase ${isAr ? 'arabic' : ''}`}>{t('wasiyyah_cash')} (₹)</label><input type="number" inputMode="numeric" value={detailedWill.cash || ''} onChange={e => setDetailedWill({...detailedWill, cash: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" /></div>
                  <div className="space-y-1"><label className={`text-[9px] font-bold text-slate-400 uppercase ${isAr ? 'arabic' : ''}`}>{t('wasiyyah_land')} ({t(detailedAssets.land.unit)})</label><input type="number" inputMode="decimal" value={detailedWill.landArea || ''} onChange={e => setDetailedWill({...detailedWill, landArea: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" /></div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1"><label className={`text-[9px] font-bold text-slate-400 uppercase ${isAr ? 'arabic' : ''}`}>Gold ({t(detailedAssets.gold.unit)})</label><input type="number" inputMode="decimal" value={detailedWill.goldWeight || ''} onChange={e => setDetailedWill({...detailedWill, goldWeight: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" /></div>
                    <div className="space-y-1"><label className={`text-[9px] font-bold text-slate-400 uppercase ${isAr ? 'arabic' : ''}`}>Silver ({t(detailedAssets.silver.unit)})</label><input type="number" inputMode="decimal" value={detailedWill.silverWeight || ''} onChange={e => setDetailedWill({...detailedWill, silverWeight: Math.max(0, Number(e.target.value))})} className="w-full bg-white p-2 text-lg font-black text-[#1E2E4F] rounded-lg outline-none" /></div>
                  </div>
                </div>
              </div>
            </>
          )}
          {[{l: t('debts'), k: 'debts', i: '📉'}, {l: t('funeral_expenses'), k: 'funeral', i: '🕯️'}, ...(!detailedAssets.enabled ? [{l: t('will_wasiyyah'), k: 'will', i: '📜'}] : [])].map(f => (
            <div key={f.k} className="glass-card p-6 space-y-3 shadow-md">
              <label className={`text-xs font-bold text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{f.l}</label>
              <div className="relative"><span className={`absolute ${isRtl ? 'right-0 mr-1' : 'left-0 ml-1'} top-1/2 -translate-y-1/2 text-2xl font-black text-slate-300`}>₹</span>
              <input type="number" inputMode="numeric" value={(estate as any)[f.k] || ''} onChange={e => setEstate({...estate, [f.k]: Math.max(0, Number(e.target.value))})} className={`w-full bg-transparent border-b-2 border-slate-100 py-3 ${isRtl ? 'pr-8 text-right' : 'pl-8 text-left'} text-2xl font-black text-[#1E2E4F] outline-none focus:border-[#006B46]`} /></div>
            </div>
          ))}
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.GENDER) {
    const isAr = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} nextStep={deceasedGender ? AppStep.SELECTION : undefined} prevStep={AppStep.ASSETS} setStep={setStep} disabled={!deceasedGender}>
        <div className="flex-1 flex flex-col items-center justify-center py-10 space-y-12 animate-in text-center">
          <h2 className={`text-4xl font-black text-[#1E2E4F] ${isAr ? 'arabic text-5xl' : ''}`}>{t('deceased_person')}</h2>
          <div className="grid grid-cols-1 gap-6 w-full max-w-xs">
            {['Male', 'Female'].map(g => (
              <button key={g} onClick={() => setDeceasedGender(g as any)} className={`p-10 rounded-[40px] font-black text-3xl transition-all border-4 shadow-lg active-press ${deceasedGender === g ? 'bg-[#1E2E4F] text-white border-[#D89F37]' : 'bg-white text-slate-400 border-white shadow-lg'}`}>
                <span className={isAr ? 'arabic' : ''}>{g === 'Male' ? t('male') : t('female')}</span>
              </button>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.SELECTION) {
    const isAr = lang === 'ar';
    return (
      <ScreenWrapper lang={lang} currentStep={step} setStep={setStep} hideFooter={true}>
        <header className="shrink-0 pt-6 pb-4 text-center"><h2 className={`text-2xl font-black text-[#1E2E4F] ${isAr ? 'arabic text-3xl' : ''}`}>{t('heirs')}</h2></header>
        <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar space-y-4 mb-4">
          <div className="glass-card overflow-hidden shadow-xl">
            {HEIR_ORDER.map((type, idx) => {
              const meta = HEIR_METADATA[type];
              if ((type === 'Husband' && deceasedGender !== 'Female') || (type === 'Wives' && deceasedGender !== 'Male')) return null;
              const count = getHeirCount(type as HeirType);
              return (
                <div key={type} className="flex flex-col border-b border-slate-100 last:border-0 p-5">
                  <div className="flex items-center justify-between">
                    <span className={`font-bold text-[#1E2E4F] text-lg ${isAr ? 'arabic text-xl' : ''}`}>{meta[lang]}</span>
                    <div className="flex items-center gap-3 bg-slate-100/50 p-1.5 rounded-2xl">
                      <button onClick={() => updateHeirCount(type as HeirType, -1)} className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${count > 0 ? 'bg-white text-rose-500 shadow-sm' : 'text-slate-300'}`}><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg></button>
                      <span className={`w-6 text-center font-black text-lg ${count > 0 ? 'text-[#006B46]' : 'text-slate-300'}`}>{count}</span>
                      <button disabled={meta.max ? count >= meta.max : false} onClick={() => updateHeirCount(type as HeirType, 1)} className="w-10 h-10 rounded-xl bg-white text-[#006B46] shadow-sm flex items-center justify-center transition-all active-press disabled:opacity-20"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {uiError && <div className={`mb-4 p-4 bg-rose-50 text-rose-700 rounded-2xl text-sm font-bold flex items-center gap-3 border border-rose-100 animate-in ${isAr ? 'arabic' : ''}`}><span>⚠️</span> {uiError}</div>}
        <div className="shrink-0 pb-8 flex flex-col gap-3">
          <button onClick={handleCalculate} className={`w-full bg-[#006B46] text-white py-5 rounded-2xl font-black text-xl active-press shadow-2xl ${isAr ? 'arabic text-2xl' : ''}`}>{t('calculate')}</button>
          <button onClick={() => setStep(AppStep.GENDER)} className={`w-full h-14 rounded-2xl font-bold text-[#1E2E4F] bg-white/60 border border-slate-200 active-press ${isAr ? 'arabic' : ''}`}>{t('back')}</button>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.RESULT && result) {
    const isRtl = lang === 'ar';
    const isAr = lang === 'ar';
    return (
      <div className="h-full flex flex-col overflow-hidden bg-transparent pt-safe" dir={isRtl ? 'rtl' : 'ltr'}>
        <header className="px-6 py-6 text-center space-y-6 shrink-0 relative">
          <h2 className={`text-3xl font-black text-[#1E2E4F] tracking-tight ${isAr ? 'arabic text-4xl' : ''}`}>{t('distribution_result')}</h2>
          <div className="space-y-4">
            <div className="glass-navy p-6 text-white space-y-1 shadow-2xl text-center"><p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40 ${isAr ? 'arabic' : ''}`}>{t('net_estate')}</p><p className="text-3xl font-black text-[#D89F37] tracking-tight">₹{Math.floor(result.netEstate).toLocaleString()}</p></div>
            {detailedAssets.enabled && (
               <div className="grid grid-cols-1 gap-3">
                  {result.totalLand > 0 && (
                    <div className="glass-card p-5 border-emerald-100 border shadow-md flex justify-between items-center">
                      <div className={isRtl ? 'text-right' : 'text-left'}><p className={`text-[9px] font-black text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{t('land_available')}</p><p className="text-xl font-black text-[#006B46]">{result.totalLand.toFixed(2)} {t(detailedAssets.land.unit)}</p></div>
                      <p className="text-sm font-bold text-slate-400 italic">₹{(result.totalLand * detailedAssets.land.valuePerUnit).toLocaleString()}</p>
                    </div>
                  )}
                  {result.totalGold > 0 && (
                    <div className="glass-card p-5 border-amber-100 border shadow-md flex justify-between items-center">
                      <div className={isRtl ? 'text-right' : 'text-left'}><p className={`text-[9px] font-black text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{t('gold_details')}</p><p className="text-xl font-black text-[#D89F37]">{result.totalGold.toFixed(3)} {t(detailedAssets.gold.unit)}</p></div>
                    </div>
                  )}
                  {result.totalSilver > 0 && (
                    <div className="glass-card p-5 border-slate-200 border shadow-md flex justify-between items-center">
                      <div className={isRtl ? 'text-right' : 'text-left'}><p className={`text-[9px] font-black text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{t('silver_details')}</p><p className="text-xl font-black text-slate-500">{result.totalSilver.toFixed(3)} {t(detailedAssets.silver.unit)}</p></div>
                    </div>
                  )}
               </div>
            )}
          </div>
        </header>
        <div className="flex-1 min-h-0 overflow-y-auto scroll-container hide-scrollbar px-6 py-4 space-y-6">
          <div className="bg-emerald-50/50 border border-emerald-100 p-6 rounded-[28px] space-y-4 shadow-sm backdrop-blur-md">
            <div className="grid grid-cols-2 gap-4">
              <div className={`space-y-1 ${isRtl ? 'border-l' : 'border-r'} border-emerald-100 text-center`}><p className={`text-[9px] text-slate-400 font-bold uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{t('fixed_shares')}</p><p className="text-xl font-black text-[#1E2E4F]">{(result.summary.fixedTotal * 100).toFixed(1)}%</p></div>
              <div className="space-y-1 text-center"><p className={`text-[9px] text-slate-400 font-bold uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{t('residue_shares')}</p><p className="text-xl font-black text-[#1E2E4F]">{(result.summary.residueTotal * 100).toFixed(1)}%</p></div>
            </div>
          </div>
          {result.warnings.map((w, i) => <div key={i} className={`p-5 rounded-2xl bg-amber-50 text-amber-800 text-[13px] font-bold border border-amber-100 flex items-center gap-3 ${isAr ? 'arabic' : ''}`}><span>⚠️</span> {t(w)}</div>)}
          <div className="space-y-4 pb-12">
            <h3 className={`px-2 font-black text-[#1E2E4F] text-[11px] uppercase tracking-widest opacity-40 ${isAr ? 'arabic text-right' : ''}`}>{t('individual_shares')}</h3>
            {result.shares.map((s, i) => (
              <div key={i} className="glass-card p-6 flex flex-col gap-4 border-l-8 border-[#006B46] shadow-md hover:scale-[1.01] transition-transform">
                <div className="flex items-center justify-between"><div><p className={`font-black text-[#1E2E4F] text-xl leading-tight ${isAr ? 'arabic text-2xl' : ''}`}>{s.label}</p><p className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>{s.type} • {s.symbol}</p></div><div className={`bg-white/60 px-3 py-1.5 rounded-xl text-[10px] font-black text-slate-500 border border-slate-100 ${isAr ? 'arabic' : ''}`}>{s.count} {t('each')}</div></div>
                <div className="h-px bg-slate-100/50" />
                <div className="space-y-4">
                  <div className="flex items-center justify-between"><span className={`text-[10px] font-bold text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>Ratio</span><span className="text-sm font-black text-[#1E2E4F] bg-slate-100 px-2 py-0.5 rounded-md">{s.fraction} <span className="opacity-40 text-[10px]">({s.percentage})</span></span></div>
                  {s.amountEach > 0 && <div className="flex items-center justify-between"><span className={`text-[11px] font-black text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>Cash (each)</span><span className="text-2xl font-black text-[#006B46] tracking-tight">₹{Math.floor(s.amountEach).toLocaleString()}</span></div>}
                  {s.landEach > 0 && <div className="flex items-center justify-between pt-2 border-t border-slate-50"><div className={`flex items-center gap-1.5 ${isAr ? 'arabic' : ''}`}>📍 <span className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Land (each)</span></div><span className="text-xl font-black text-[#006B46]">{s.landEach.toFixed(3)} {t(detailedAssets.land.unit)}</span></div>}
                  {s.goldEach > 0 && <div className="flex items-center justify-between pt-2 border-t border-slate-50"><span className={`text-[10px] font-black text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>Gold (each)</span><span className="text-lg font-black text-[#D89F37]">{s.goldEach.toFixed(3)} {t(s.goldUnit || 'gram')}</span></div>}
                  {s.silverEach > 0 && <div className="flex items-center justify-between pt-2 border-t border-slate-50"><span className={`text-[10px] font-black text-slate-400 uppercase tracking-widest ${isAr ? 'arabic' : ''}`}>Silver (each)</span><span className="text-lg font-black text-slate-500">{s.silverEach.toFixed(3)} {t(s.silverUnit || 'gram')}</span></div>}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="px-6 py-8 glass rounded-t-[40px] shadow-2xl shrink-0 pb-safe"><button onClick={reset} className={`w-full bg-[#1E2E4F] text-white py-5 rounded-2xl font-black text-xl active-press shadow-xl ${isAr ? 'arabic text-2xl' : ''}`}>{t('new_calculation')}</button></div>
      </div>
    );
  }
  return null;
};
export default App;