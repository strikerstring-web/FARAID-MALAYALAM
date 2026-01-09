
import React, { useState, useMemo } from 'react';
import { AppStep, Heir, HeirType, CalculationResult, HEIR_METADATA, EstateData } from './types';
import { calculateShares } from './logic/faraidEngine';

/** 
 * Screen Wrapper to handle consistent layout across multiple screens 
 */
interface ScreenWrapperProps {
  children: React.ReactNode;
  nextStep?: AppStep;
  prevStep?: AppStep;
  setStep: (step: AppStep) => void;
  nextLabel?: string;
  disabled?: boolean;
}

const ScreenWrapper: React.FC<ScreenWrapperProps> = ({ 
  children, 
  nextStep, 
  prevStep, 
  setStep, 
  nextLabel = "അടുത്തത്", 
  disabled = false 
}) => (
  <div className="h-full flex flex-col relative overflow-hidden bg-[#F7FAF7]">
    <main className="flex-1 flex flex-col items-center justify-center max-w-md mx-auto w-full px-5 py-6 relative z-10 overflow-hidden">
      {children}
    </main>
    <div className="p-4 glass border-t border-slate-100 flex justify-center gap-3 shrink-0">
      {prevStep && (
        <button 
          onClick={() => setStep(prevStep)} 
          className="flex-1 max-w-[100px] h-12 rounded-xl font-bold text-[#1E2E4F] bg-white border border-slate-200 active:scale-95 transition-all malayalam text-sm"
        >
          പുറകോട്ട്
        </button>
      )}
      {nextStep && (
        <button 
          disabled={disabled} 
          onClick={() => setStep(nextStep)} 
          className="flex-1 max-w-xs h-12 bg-[#006B46] text-white rounded-xl font-bold text-base transition-all active:scale-95 shadow-lg shadow-[#006B46]/20 malayalam"
        >
          {nextLabel}
        </button>
      )}
    </div>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [deceasedGender, setDeceasedGender] = useState<'Male' | 'Female' | null>(null);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [estate, setEstate] = useState<EstateData>({ totalAssets: 0, debts: 0, funeral: 0, will: 0 });
  const [result, setResult] = useState<CalculationResult | null>(null);

  const heirCategories = useMemo(() => {
    const cats: Record<string, HeirType[]> = {};
    Object.entries(HEIR_METADATA).forEach(([type, meta]) => {
      if (!cats[meta.category]) cats[meta.category] = [];
      cats[meta.category].push(type as HeirType);
    });
    return cats;
  }, []);

  const updateHeirCount = (type: HeirType, delta: number) => {
    const meta = HEIR_METADATA[type];
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
    if (deceasedGender) {
      setResult(calculateShares(heirs, deceasedGender, estate));
      setStep(AppStep.RESULT);
    }
  };

  const reset = () => {
    setHeirs([]);
    setDeceasedGender(null);
    setEstate({ totalAssets: 0, debts: 0, funeral: 0, will: 0 });
    setResult(null);
    setStep(AppStep.WELCOME);
  };

  // --- Screens ---

  // Screen 1: Welcome
  if (step === AppStep.WELCOME) {
    return (
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-6 text-white relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#006B46]/20 rounded-full -mr-32 -mt-32 blur-3xl"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-[#D89F37]/10 rounded-full -ml-32 -mb-32 blur-3xl"></div>
        
        <div className="relative z-10 flex flex-col items-center text-center animate-slide-up w-full max-w-xs">
          <div className="w-24 h-24 bg-[#006B46] rounded-[2.2rem] flex items-center justify-center mb-10 shadow-2xl shadow-[#000000]/20 border border-white/10">
            <svg className="w-12 h-12 text-[#D89F37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold mb-3 malayalam tracking-tight text-[#F7FAF7]">ഫറാഇദ് കാൽക്കുലേറ്റർ</h1>
          <p className="text-[#F7FAF7]/60 mb-12 text-base malayalam leading-relaxed px-4 italic">
            ഇസ്‌ലാമിക അനന്തരാവകാശ നിയമപ്രകാരമുള്ള സ്വത്തുവിഹിതം കൃത്യമായി കണക്കാക്കാം
          </p>
          <button 
            onClick={() => setStep(AppStep.DESCRIPTION)} 
            className="w-full bg-[#006B46] hover:bg-[#008a5a] text-white py-4 rounded-2xl font-bold text-lg active:scale-95 shadow-xl shadow-black/20 malayalam transition-all"
          >
            തുടരുക
          </button>
        </div>
      </div>
    );
  }

  // Screen 2: Description
  if (step === AppStep.DESCRIPTION) {
    return (
      <ScreenWrapper nextStep={AppStep.HADITH} prevStep={AppStep.WELCOME} setStep={setStep}>
        <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-8 border border-slate-50 w-full flex flex-col gap-6 animate-slide-up bg-soft-gradient">
          <div className="w-16 h-1 bg-[#D89F37] rounded-full mx-auto opacity-50 mb-2"></div>
          <h2 className="text-2xl font-bold text-[#1E2E4F] malayalam leading-tight text-center">ഫറാഇദ് നിയമങ്ങൾ</h2>
          <p className="text-[14px] text-slate-600 leading-relaxed malayalam text-center">
            ഇസ്‌ലാമിക നിയമപ്രകാരം ഒരാൾ മരണപ്പെട്ടാൽ അയാളുടെ സ്വത്ത് വിഭജിക്കുന്നത് ഖുർആൻ നിശ്ചയിച്ച കൃത്യമായ അവകാശികൾക്കിടയിലാണ്. ഷാഫിഈ മദ്ഹബ് പ്രകാരമുള്ള നിയമങ്ങളാണ് ഈ കാൽക്കുലേറ്ററിൽ ഉപയോഗിച്ചിരിക്കുന്നത്.
          </p>
          <div className="bg-[#F7FAF7] p-5 rounded-2xl border border-slate-100">
            <h4 className="font-bold text-[#006B46] text-sm malayalam mb-2">പ്രത്യേകതകൾ:</h4>
            <ul className="space-y-3">
              <li className="flex items-start gap-3 text-[12px] text-slate-600 malayalam">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#D89F37] shrink-0"></div>
                ഷാഫിഈ ഫിഖ്ഹ് അടിസ്ഥാനമാക്കിയുള്ള കണക്കുകൂട്ടൽ.
              </li>
              <li className="flex items-start gap-3 text-[12px] text-slate-600 malayalam">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-[#D89F37] shrink-0"></div>
                കടങ്ങളും വസീയ്യത്തും കുറച്ച ശേഷമുള്ള കൃത്യമായ വിതരണം.
              </li>
            </ul>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // Screen 3: Hadith Screen
  if (step === AppStep.HADITH) {
    return (
      <ScreenWrapper nextStep={AppStep.AYAH} prevStep={AppStep.DESCRIPTION} setStep={setStep}>
        <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-8 border border-slate-50 w-full flex flex-col items-center gap-8 animate-slide-up">
          <div className="flex items-center gap-4 w-full">
            <div className="h-px flex-1 bg-[#D89F37] opacity-30"></div>
            <div className="w-2 h-2 rounded-full bg-[#D89F37]"></div>
            <div className="h-px flex-1 bg-[#D89F37] opacity-30"></div>
          </div>
          
          <div className="arabic text-[26px] text-[#1E2E4F] font-semibold leading-relaxed">
            أَلْحِقُوا الْفَرَائِضَ بِأَهْلِهَا فَمَا بَقِيَ فَهُوَ لِأَوْلَى رَجُلٍ ذَكَرٍ
          </div>
          
          <div className="h-px w-12 bg-slate-100"></div>

          <p className="text-lg text-[#006B46] font-bold malayalam text-center leading-relaxed">
            "അവകാശവിഹിതങ്ങൾ അർഹരായവർക്ക് എത്തിക്കുക. ബാക്കി വരുന്നത് ഏറ്റവും അടുത്ത പുരുഷ ബന്ധുവിനുള്ളതാണ്."
          </p>
          
          <span className="px-4 py-1.5 bg-[#F7FAF7] text-[#D89F37] rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-[#D89F37]/20">
            സ്വഹീഹുൽ ബുഖാരി
          </span>
        </div>
      </ScreenWrapper>
    );
  }

  // Screen 4: Ayah Screen
  if (step === AppStep.AYAH) {
    return (
      <ScreenWrapper nextStep={AppStep.ASSETS} prevStep={AppStep.HADITH} setStep={setStep}>
        <div className="bg-white rounded-[2rem] shadow-[0_10px_40px_rgba(0,0,0,0.04)] p-8 border border-slate-50 w-full flex flex-col items-center gap-8 animate-slide-up bg-soft-gradient">
           <div className="w-12 h-12 rounded-full bg-[#006B46]/10 flex items-center justify-center text-[#006B46]">
             <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
           </div>
          
          <div className="arabic text-[22px] text-[#1E2E4F] font-semibold leading-[1.8]">
            يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنْثَيَيْنِ
          </div>

          <div className="w-full flex justify-center gap-1.5">
            <div className="w-1.5 h-1.5 rounded-full bg-[#D89F37]"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#D89F37] opacity-50"></div>
            <div className="w-1.5 h-1.5 rounded-full bg-[#D89F37] opacity-25"></div>
          </div>

          <p className="text-base text-[#1E2E4F] font-bold malayalam text-center leading-relaxed px-4">
            "നിങ്ങളുടെ മക്കളുടെ കാര്യത്തിൽ അല്ലാഹു കൽപ്പിക്കുന്നു; ആണിന് രണ്ട് പെണ്ണിന്റെ വിഹിതത്തിന് തുല്യമായതുണ്ട്."
          </p>
          
          <span className="px-4 py-1.5 bg-[#1E2E4F] text-white rounded-xl text-[10px] font-bold tracking-wider">
            സൂറത്ത് അന്നിസാഅ് 4:11
          </span>
        </div>
      </ScreenWrapper>
    );
  }

  // Screen 5: Assets Input
  if (step === AppStep.ASSETS) {
    return (
      <div className="h-full bg-[#F7FAF7] flex flex-col p-5 animate-slide-up overflow-hidden">
        <header className="mb-6 mt-4 text-center shrink-0">
          <h2 className="text-xl font-black text-[#1E2E4F] mb-1 malayalam">സ്വത്ത് വിവരങ്ങൾ</h2>
          <p className="text-slate-400 text-[12px] malayalam">കൈമാറുന്നതിന് മുൻപുള്ള വിവരങ്ങൾ നൽകുക</p>
        </header>

        <div className="space-y-3 max-w-sm mx-auto w-full flex-1 overflow-y-auto pr-1">
          {[
            { label: 'ആസ്തി (മൊത്തം സ്വത്ത്):', key: 'totalAssets', color: 'bg-emerald-50 text-emerald-900 border-emerald-100' },
            { label: 'കടം (ബാധ്യതകൾ):', key: 'debts', color: 'bg-rose-50 text-rose-900 border-rose-100' },
            { label: 'മരണാനന്തര കർമ്മങ്ങൾ:', key: 'funeral', color: 'bg-slate-50 text-slate-900 border-slate-100' },
            { label: 'വസീയ്യത്ത് (പരമാവധി 1/3):', key: 'will', color: 'bg-amber-50 text-amber-900 border-amber-100' }
          ].map(field => (
            <div key={field.key} className={`p-4 rounded-[1.5rem] border shadow-sm space-y-2 ${field.color}`}>
              <label className="text-[11px] font-bold malayalam uppercase tracking-wide opacity-80">{field.label}</label>
              <div className="relative">
                <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-lg opacity-30">₹</span>
                <input 
                  type="number" 
                  value={(estate as any)[field.key] || ''} 
                  onChange={e => setEstate({...estate, [field.key]: Math.max(0, Number(e.target.value))})} 
                  className="w-full bg-white/50 border-none rounded-xl py-2.5 pl-10 pr-4 outline-none font-bold text-lg" 
                  placeholder="0" 
                />
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 glass border-t border-slate-100 flex justify-center gap-3 shrink-0 mt-4">
          <button onClick={() => setStep(AppStep.AYAH)} className="flex-1 max-w-[90px] h-12 border border-slate-200 bg-white text-slate-500 rounded-xl font-bold active:scale-95 malayalam text-sm">പുറകോട്ട്</button>
          <button onClick={() => setStep(AppStep.GENDER)} className="flex-1 max-w-xs h-12 bg-[#006B46] text-white rounded-xl font-bold text-base shadow-xl malayalam">അടുത്തത്</button>
        </div>
      </div>
    );
  }

  // Screen 6: Gender Selection
  if (step === AppStep.GENDER) {
    return (
      <ScreenWrapper nextStep={deceasedGender ? AppStep.SELECTION : undefined} prevStep={AppStep.ASSETS} setStep={setStep} disabled={!deceasedGender}>
        <div className="text-center space-y-10 w-full flex flex-col justify-center h-full">
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-[#1E2E4F] malayalam">മരണപ്പെട്ട വ്യക്തി</h2>
            <p className="text-slate-400 text-sm malayalam">ആരുടെ സ്വത്താണ് വിഭജിക്കേണ്ടത്?</p>
          </div>
          
          <div className="grid grid-cols-1 gap-4 w-full">
            {[
              { id: 'Male', label: 'പുരുഷൻ', sub: 'Male' },
              { id: 'Female', label: 'സ്ത്രീ', sub: 'Female' }
            ].map((opt) => (
              <button 
                key={opt.id} 
                onClick={() => setDeceasedGender(opt.id as any)} 
                className={`w-full py-8 rounded-[2rem] font-bold transition-all malayalam border-2 flex flex-col items-center gap-1 ${deceasedGender === opt.id ? 'bg-[#1E2E4F] border-[#1E2E4F] text-white shadow-2xl' : 'bg-white border-slate-100 text-slate-600'}`}
              >
                <span className="text-xl">{opt.label}</span>
                <span className={`text-[10px] font-bold uppercase tracking-widest opacity-40`}>{opt.sub}</span>
              </button>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  // Screen 7: Relatives Selection
  if (step === AppStep.SELECTION) {
    return (
      <div className="h-full bg-[#F7FAF7] flex flex-col p-5 animate-slide-up overflow-hidden">
        <header className="mb-4 mt-4 text-center shrink-0">
          <h2 className="text-xl font-black text-[#1E2E4F] mb-1 malayalam">ബന്ധുക്കൾ</h2>
          <p className="text-slate-400 text-[11px] malayalam">നിലവിലുള്ള ഓരോ അവകാശികളെയും ചേർക്കുക</p>
        </header>

        <div className="flex-1 overflow-y-auto pb-4 space-y-5 max-w-sm mx-auto w-full pr-1">
          {(Object.entries(heirCategories) as [string, HeirType[]][]).map(([category, types]) => {
            const filtered = types.filter(t => (t === 'Husband' ? deceasedGender === 'Female' : t === 'Wife' ? deceasedGender === 'Male' : true));
            if (filtered.length === 0) return null;
            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-3 px-1">
                   <h4 className="text-[10px] font-bold text-[#D89F37] uppercase tracking-widest malayalam whitespace-nowrap">{category}</h4>
                   <div className="h-px w-full bg-[#D89F37] opacity-20"></div>
                </div>
                <div className="grid grid-cols-1 gap-2.5">
                  {filtered.map(type => {
                    const count = getHeirCount(type);
                    const meta = HEIR_METADATA[type];
                    return (
                      <div key={type} className={`p-4 rounded-[1.5rem] border flex items-center justify-between transition-all duration-300 ${count > 0 ? 'bg-[#006B46] border-[#006B46] text-white shadow-md' : 'bg-white border-slate-100 shadow-sm'}`}>
                        <div className="flex flex-col">
                          <span className="font-bold malayalam text-[14px] leading-tight">{meta.ml}</span>
                          <span className={`text-[9px] font-bold uppercase tracking-wider ${count > 0 ? 'opacity-50' : 'text-slate-300'}`}>{type}</span>
                        </div>
                        <div className={`flex items-center gap-2 p-1 rounded-xl ${count > 0 ? 'bg-black/10' : 'bg-slate-50'}`}>
                          <button 
                            onClick={() => updateHeirCount(type, -1)} 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${count > 0 ? 'bg-white/20 text-white' : 'bg-white text-slate-300 border border-slate-100'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                          </button>
                          <span className="w-5 text-center font-bold text-[14px]">{count}</span>
                          <button 
                            disabled={meta.max ? count >= meta.max : false} 
                            onClick={() => updateHeirCount(type, 1)} 
                            className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${count > 0 ? 'bg-white/20 text-white' : 'bg-white text-[#006B46] border border-slate-100'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-4 glass border-t border-slate-100 flex justify-center gap-3 shrink-0 mt-4">
          <button onClick={() => setStep(AppStep.GENDER)} className="flex-1 max-w-[90px] h-12 border border-slate-200 bg-white text-slate-500 rounded-xl font-bold active:scale-95 malayalam text-sm">പുറകോട്ട്</button>
          <button disabled={heirs.length === 0} onClick={handleCalculate} className="flex-1 max-w-xs h-12 bg-[#006B46] text-white rounded-xl font-black text-base shadow-xl malayalam">കണക്കാക്കുക</button>
        </div>
      </div>
    );
  }

  // Screen 8: Results
  if (step === AppStep.RESULT && result) {
    return (
      <div className="h-full bg-[#F7FAF7] flex flex-col p-5 py-6 animate-slide-up overflow-hidden">
        <header className="mb-8 text-center shrink-0">
          <h2 className="text-2xl font-black text-[#1E2E4F] malayalam">അവകാശ വിഹിതങ്ങൾ</h2>
          <div className="bg-[#1E2E4F] text-white px-10 py-5 rounded-[2.2rem] inline-block mt-4 shadow-xl border border-white/10">
             <p className="text-[10px] uppercase font-bold tracking-[0.2em] mb-1 opacity-50">വിതരണത്തിനുള്ള തുക</p>
             <p className="text-2xl font-black text-[#D89F37]">₹{result.netEstate.toLocaleString()}</p>
          </div>
        </header>

        <div className="max-w-md mx-auto w-full flex-1 flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {result.warnings.map((w, i) => (
              <div key={i} className="bg-rose-50 text-rose-800 p-4 rounded-2xl border border-rose-100 text-[12px] font-bold flex gap-3 malayalam shrink-0 shadow-sm">
                <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                {w}
              </div>
            ))}
            
            <div className="space-y-3">
              {result.shares.map((share, i) => (
                <div key={i} className="bg-white rounded-[1.8rem] shadow-[0_4px_20px_rgba(0,0,0,0.03)] border border-slate-50 flex items-center justify-between p-5 group transition-all hover:bg-emerald-50/20">
                  <div className="space-y-1">
                    <p className="font-bold text-[#1E2E4F] text-[16px] malayalam leading-tight">{share.label}</p>
                    <p className="text-[10px] text-slate-400 font-bold tracking-wider uppercase">{share.percentage}</p>
                  </div>
                  <div className="text-right flex flex-col items-end gap-1.5">
                    <div className="bg-[#F7FAF7] text-[#006B46] px-4 py-1.5 rounded-xl font-black text-[15px] border border-emerald-50">{share.fraction}</div>
                    {share.amount !== undefined && <p className="text-[11px] font-bold text-[#D89F37]">₹{share.amount.toLocaleString()}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 mt-8 max-w-sm mx-auto w-full shrink-0">
          <button 
            onClick={() => setStep(AppStep.SELECTION)} 
            className="w-full bg-[#1E2E4F] text-white h-14 rounded-2xl font-bold text-base malayalam py-3 shadow-lg active:scale-95 transition-transform"
          >
            മാറ്റങ്ങൾ വരുത്തുക
          </button>
          <button 
            onClick={reset} 
            className="w-full text-slate-400 font-bold text-[13px] malayalam py-2 hover:text-[#006B46] transition-colors"
          >
            പുതിയ കണക്ക് തുടങ്ങുക
          </button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
