
import React, { useState, useMemo } from 'react';
import { AppStep, Heir, HeirType, CalculationResult, HEIR_METADATA, EstateData } from './types';
import { calculateShares } from './logic/faraidEngine';

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
  <div className="min-h-screen flex flex-col relative overflow-hidden bg-[#fdfdfb]">
    <div className="absolute inset-0 islamic-pattern pointer-events-none"></div>
    
    <main className="flex-1 flex flex-col items-center justify-start max-w-lg mx-auto w-full px-6 py-12 relative z-10 animate-slide-up">
      {children}
    </main>

    <div className="sticky bottom-0 left-0 right-0 p-6 glass border-t border-emerald-100/50 flex justify-center gap-4 z-50">
      {prevStep && (
        <button 
          onClick={() => setStep(prevStep)}
          className="flex-1 max-w-[120px] h-14 rounded-2xl font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 active:scale-95 transition-all malayalam flex items-center justify-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
          പുറകോട്ട്
        </button>
      )}
      {nextStep && (
        <button 
          disabled={disabled}
          onClick={() => setStep(nextStep)}
          className="flex-1 max-w-xs h-14 bg-emerald-900 hover:bg-emerald-800 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl font-bold text-lg transition-all active:scale-95 shadow-xl shadow-emerald-900/10 malayalam flex items-center justify-center gap-2 group"
        >
          <span>{nextLabel}</span>
          {!disabled && <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>}
        </button>
      )}
    </div>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [deceasedGender, setDeceasedGender] = useState<'Male' | 'Female' | null>(null);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [estate, setEstate] = useState<EstateData>({
    totalAssets: 0,
    debts: 0,
    funeral: 0,
    will: 0
  });
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
        let newCount = existing.count + delta;
        if (meta.max) newCount = Math.min(newCount, meta.max);
        newCount = Math.max(0, newCount);
        if (newCount === 0) return prev.filter(h => h.type !== type);
        return prev.map(h => h.type === type ? { ...h, count: newCount } : h);
      } else if (delta > 0) {
        return [...prev, { type, count: 1 }];
      }
      return prev;
    });
  };

  const getHeirCount = (type: HeirType) => heirs.find(h => h.type === type)?.count || 0;

  const handleCalculate = () => {
    if (deceasedGender) {
      const calcResult = calculateShares(heirs, deceasedGender, estate);
      setResult(calcResult);
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

  if (step === AppStep.WELCOME) {
    return (
      <div className="min-h-screen bg-emerald-950 flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
        <div className="absolute inset-0 opacity-10 islamic-pattern"></div>
        <div className="relative z-10 flex flex-col items-center text-center animate-slide-up">
          <div className="w-32 h-32 bg-emerald-600 rounded-[3rem] flex items-center justify-center mb-10 shadow-3xl shadow-emerald-500/20 rotate-6 hover:rotate-0 transition-transform duration-500">
            <svg className="w-16 h-16 text-emerald-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold mb-4 malayalam tracking-tight">ഫറാഇദ് കാൽക്കുലേറ്റർ</h1>
          <p className="text-emerald-300 max-w-sm mb-16 text-lg malayalam leading-relaxed opacity-80">
            ഇസ്ലാമിക അവകാശവിഹിതം ലളിതമായി കണക്കാക്കാം
          </p>
          <button 
            onClick={() => setStep(AppStep.DESCRIPTION)}
            className="w-full max-w-xs bg-emerald-500 hover:bg-emerald-400 text-emerald-950 py-5 rounded-2xl font-bold text-xl transition-all active:scale-95 shadow-2xl shadow-emerald-500/30 malayalam"
          >
            തുടരുക
          </button>
        </div>
      </div>
    );
  }

  if (step === AppStep.DESCRIPTION) {
    return (
      <ScreenWrapper nextStep={AppStep.HADITH} prevStep={AppStep.WELCOME} setStep={setStep}>
        <div className="text-center space-y-8">
          <div className="w-24 h-24 bg-emerald-50 text-emerald-700 rounded-full flex items-center justify-center mx-auto mb-4 border border-emerald-100">
             <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
          </div>
          <h3 className="text-2xl font-bold text-emerald-900 malayalam">വിവരണം</h3>
          <p className="malayalam text-slate-600 leading-relaxed text-xl font-medium px-4">
            ഖുര്‍ആനും സുന്നത്തും അടിസ്ഥാനമാക്കി മരണപ്പെട്ട വ്യക്തിയുടെ സ്വത്ത് ന്യായമായ വിധത്തിൽ ആരെല്ലാമാണ് ലഭിക്കേണ്ടത് എന്ന് കണക്കാക്കാനുള്ള ഉപകരണം ആണ് ഫറാഇദ് കാൽക്കുലേറ്റർ.
          </p>
          <p className="malayalam text-slate-500 leading-relaxed text-base px-6">
            കേരളത്തിലെ മുസ്ലിം ഉപയോക്താക്കൾക്ക് ലളിതമായ രീതിയിൽ വിവരങ്ങൾ ലഭ്യമാക്കാൻ ഇത് സഹായിക്കുന്നു.
          </p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.HADITH) {
    return (
      <ScreenWrapper nextStep={AppStep.AYAH} prevStep={AppStep.DESCRIPTION} setStep={setStep}>
        <div className="w-full space-y-10">
          <div className="bg-white p-10 rounded-[3rem] border border-emerald-100 shadow-xl shadow-emerald-900/5 text-center relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-50 rounded-bl-full -mr-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
            <header className="mb-8">
              <span className="text-[11px] text-emerald-600 font-extrabold tracking-[0.3em] uppercase">Hadith</span>
              <div className="w-10 h-1 bg-emerald-200 mx-auto mt-2 rounded-full"></div>
            </header>
            <p className="arabic text-4xl mb-8 text-emerald-950 font-bold leading-relaxed">"تَعَلَّمُوا الْفَرَائِضَ وَعَلِّمُوهَا النَّاسَ"</p>
            <p className="malayalam text-emerald-900 leading-relaxed font-bold text-xl">"ഫറാഇദ് (ഇസ്ലാമിക അവകാശവിഭാഗം) പഠിക്കൂ, അത് ആളുകളെ പഠിപ്പിക്കൂ."</p>
          </div>
          <p className="malayalam text-slate-500 text-center text-lg italic px-4">ഫറാഇദ് പഠിക്കുന്നത് സമൂഹത്തിലെ അവകാശവിതരണത്തിൽ നീതി ഉറപ്പാക്കുന്നു.</p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.AYAH) {
    return (
      <ScreenWrapper nextStep={AppStep.RULES} prevStep={AppStep.HADITH} setStep={setStep}>
        <div className="w-full space-y-10">
          <div className="bg-white p-10 rounded-[3rem] border border-amber-100 shadow-xl shadow-amber-900/5 text-center relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-32 h-32 bg-amber-50 rounded-br-full -ml-16 -mt-16 opacity-50 group-hover:scale-110 transition-transform"></div>
            <header className="mb-8">
              <span className="text-[11px] text-amber-600 font-extrabold tracking-[0.3em] uppercase">Quran 4:11</span>
              <div className="w-10 h-1 bg-amber-200 mx-auto mt-2 rounded-full"></div>
            </header>
            <p className="arabic text-3xl mb-8 text-amber-950 font-bold leading-[2]">"يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ മִثْلُ حَظِّ الْأُنْثَيَيْنِ"</p>
            <p className="malayalam text-amber-900 leading-relaxed font-bold text-lg">"നിങ്ങളുടെ മക്കളെ സംബന്ധിച്ച് അല്ലാഹു നിങ്ങളെ ഉപദേശിക്കുന്നു; ആൺകുട്ടിക്ക് രണ്ട് പെൺകുട്ടികളുടെ ഓഹരിക്ക് തുല്യമായിരിക്കും."</p>
          </div>
          <p className="malayalam text-slate-500 text-center text-lg italic px-4">ഖുര്‍ആനിൽ സുതാര്യമായി അവകാശവിതരണ നിയമങ്ങൾ നിർദ്ദേശിച്ചിട്ടുണ്ട്.</p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.RULES) {
    return (
      <ScreenWrapper nextStep={AppStep.ASSETS} prevStep={AppStep.AYAH} setStep={setStep}>
        <div className="w-full text-left space-y-6 overflow-y-auto max-h-[70vh] px-2 custom-scrollbar malayalam">
          <h2 className="text-2xl font-black text-emerald-900 border-b-2 border-emerald-100 pb-2">ഷാഫിഈ ഫിഖ്ഹ് - ഹജ്ബ് (തടയൽ) നിയമങ്ങൾ</h2>
          
          <section className="space-y-2">
            <h3 className="font-bold text-emerald-700 text-lg underline">നിർവ്വചനം</h3>
            <p className="text-slate-700 leading-relaxed">അർഹനായ ഒരാൾക്ക് മറ്റ് ചില ബന്ധുക്കളുടെ സാന്നിധ്യം കാരണം അവകാശവിഹിതം ലഭിക്കാതിരിക്കുകയോ കുറയുകയോ ചെയ്യുന്നതിനെയാണ് <b>ഹജ്ബ്</b> എന്ന് പറയുന്നത്.</p>
            <ul className="list-disc ml-5 space-y-1 text-slate-600">
              <li><b>ഹജ്ബ് ഹിർമാൻ:</b> അവകാശം പൂർണ്ണമായും തടയപ്പെടുന്നത്.</li>
              <li><b>ഹജ്ബ് നുഖ്സാൻ:</b> ഓഹരിയുടെ അളവ് കുറയുന്നത്.</li>
            </ul>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-emerald-700 text-lg underline">പൂർണ്ണമായ തടയൽ (Hijb Hirman)</h3>
            <p className="text-slate-700">ചിലർ മറ്റുള്ളവരെ പൂർണ്ണമായും ഒഴിവാക്കും:</p>
            <div className="bg-white p-4 rounded-xl border border-emerald-50 space-y-2 text-sm shadow-sm">
              <p>• <b>മകൻ:</b> പേരമക്കൾ, സഹോദരങ്ങൾ, പിതൃസഹോദരങ്ങൾ എന്നിവരെ തടയുന്നു.</p>
              <p>• <b>മകന്റെ മകൻ:</b> താഴോട്ടുള്ള പേരമക്കൾ, സഹോദരങ്ങൾ എന്നിവരെ തടയുന്നു.</p>
              <p>• <b>പിതാവ്:</b> പിതാമഹനെ (Grandfather) തടയുന്നു.</p>
              <p>• <b>മാതാവ്:</b> മാതാമഹിയെയും (Grandmother) പിതാമഹിയെയും തടയുന്നു.</p>
              <p>• <b>സഹോദരൻ (Full):</b> പിതൃസഹോദരങ്ങളെയും അവരുടെ മക്കളെയും തടയുന്നു.</p>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-emerald-700 text-lg underline">ഒരിക്കലും പൂർണ്ണമായി തടയപ്പെടാത്തവർ</h3>
            <p className="text-slate-700">താഴെ പറയുന്നവർക്ക് ആര് വന്നാലും ഓഹരി ലഭിക്കും:</p>
            <div className="flex flex-wrap gap-2">
              {['പിതാവ്', 'മാതാവ്', 'ഭർത്താവ്', 'ഭാര്യ', 'മകൻ', 'മകൾ'].map(p => (
                <span key={p} className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-xs font-bold">{p}</span>
              ))}
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-emerald-700 text-lg underline">ഭാഗികമായ തടയൽ (Hijb Nuqsan)</h3>
            <div className="space-y-3 text-slate-700">
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-bold mb-1">മക്കൾ ഉണ്ടെങ്കിൽ:</p>
                <p className="text-sm">• ഭർത്താവിന്റെ വിഹിതം 1/2-ൽ നിന്ന് 1/4 ആയി കുറയും.</p>
                <p className="text-sm">• ഭാര്യയുടെ വിഹിതം 1/4-ൽ നിന്ന് 1/8 ആയി കുറയും.</p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg">
                <p className="font-bold mb-1">രണ്ട് സഹോദരങ്ങൾ ഉണ്ടെങ്കിൽ:</p>
                <p className="text-sm">• മാതാവിന്റെ വിഹിതം 1/3-ൽ നിന്ന് 1/6 ആയി കുറയും.</p>
              </div>
            </div>
          </section>

          <section className="space-y-2">
            <h3 className="font-bold text-emerald-700 text-lg underline">ക്രമം (Priority Hierarchy)</h3>
            <p className="text-xs text-slate-500 mb-2 italic">ഏറ്റവും ശക്തരായ അവകാശികൾ ക്രമത്തിൽ:</p>
            <ol className="list-decimal ml-5 text-sm space-y-1 text-slate-700">
              <li>മക്കൾ (പുത്രന്മാർ)</li>
              <li>മകന്റെ മക്കൾ (താഴോട്ട്)</li>
              <li>പിതാവ്</li>
              <li>പിതാമഹൻ</li>
              <li>സഹോദരങ്ങൾ (Full)</li>
              <li>പിതൃ സഹോദരന്മാർ</li>
            </ol>
          </section>

          <section className="space-y-2 bg-emerald-900 text-emerald-50 p-6 rounded-[2rem]">
            <h3 className="font-bold text-lg mb-3">ഓർമ്മിക്കാൻ എളുപ്പവഴികൾ</h3>
            <ul className="space-y-2 text-sm">
              <li>• “മക്കൾ വന്നാൽ സഹോദരനില്ല”</li>
              <li>• “അച്ഛൻ വന്നാൽ പിതാമഹനില്ല”</li>
              <li>• “അമ്മ വന്നാൽ അമ്മമ്മ ഇല്ല”</li>
              <li>• “കുട്ടികൾ വന്നാൽ ഭർത്താവിനും ഭാര്യക്കും ഓഹരി കുറയും”</li>
              <li>• “രണ്ട് സഹോദരന്മാർ വന്നാൽ അമ്മയുടെ 1/3 എന്നത് 1/6 ആകും”</li>
            </ul>
          </section>

          <p className="text-[11px] text-slate-400 text-center italic mt-4 pb-4">ഷാഫിഈ മദ്ഹബ് പ്രകാരം നീതിപൂർണ്ണമായ വിതരണം ഉറപ്പാക്കാൻ ഈ നിയമങ്ങൾ പാലിക്കേണ്ടതുണ്ട്.</p>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.ASSETS) {
    return (
      <div className="min-h-screen bg-[#fdfdfb] flex flex-col p-6 animate-slide-up pb-28 islamic-pattern">
        <header className="mb-10 mt-8 text-center max-w-md mx-auto">
          <h2 className="text-3xl font-black text-emerald-950 mb-3 malayalam">സ്വത്ത് വിവരങ്ങൾ</h2>
          <p className="text-slate-500 text-sm malayalam leading-relaxed">ലഭ്യമായ ആസ്തിയും ബാധ്യതകളും ഇവിടെ നൽകുക.</p>
        </header>

        <div className="space-y-4 max-w-md mx-auto w-full">
          {[
            { label: 'ആസ്തി (മൊത്തം സ്വത്ത്):', key: 'totalAssets' },
            { label: 'കടം (കരുതേണ്ട കുടിശ്ശിക):', key: 'debts' },
            { label: 'പരിച്ഛേദ ചെലവ് (Funeral ചെലവ്):', key: 'funeral' },
            { label: 'വസീയ്യത്ത് (Will):', key: 'will' }
          ].map(field => (
            <div key={field.key} className="bg-white p-5 rounded-3xl border border-emerald-100/50 shadow-sm space-y-3">
              <label className="text-sm font-bold text-emerald-900 malayalam">{field.label}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-emerald-300 font-bold text-xl">₹</span>
                <input 
                  type="number" 
                  value={(estate as any)[field.key] || ''}
                  onChange={e => setEstate({...estate, [field.key]: Math.max(0, Number(e.target.value))})}
                  className="w-full bg-emerald-50/30 border-2 border-transparent focus:border-emerald-500 focus:bg-white rounded-2xl py-4 pl-12 pr-4 outline-none transition-all font-bold text-xl text-emerald-950 placeholder-emerald-200"
                  placeholder="0"
                />
              </div>
            </div>
          ))}
        </div>

        <div className="fixed bottom-0 left-0 right-0 p-6 glass border-t border-emerald-100 flex justify-center gap-4 z-50">
          <button onClick={() => setStep(AppStep.RULES)} className="flex-1 max-w-[120px] h-14 border-2 border-emerald-100 bg-emerald-50/50 text-emerald-800 rounded-2xl font-bold active:scale-95 malayalam">പുറകോട്ട്</button>
          <button onClick={() => setStep(AppStep.GENDER)} className="flex-1 max-w-xs h-14 bg-emerald-900 text-white rounded-2xl font-bold text-lg shadow-xl shadow-emerald-900/10 malayalam">അടുത്തത്</button>
        </div>
      </div>
    );
  }

  if (step === AppStep.GENDER) {
    return (
      <ScreenWrapper nextStep={deceasedGender ? AppStep.SELECTION : undefined} prevStep={AppStep.ASSETS} setStep={setStep} disabled={!deceasedGender}>
        <div className="text-center space-y-12 w-full">
          <header>
            <h2 className="text-3xl font-black text-emerald-950 malayalam mb-2">മരണപ്പെട്ട വ്യക്തി ആരാണ്?</h2>
          </header>
          
          <div className="grid grid-cols-1 gap-5 w-full">
            {[
              { id: 'Male', label: 'പുരുഷൻ' },
              { id: 'Female', label: 'സ്ത്രീ' }
            ].map((opt) => (
              <button 
                key={opt.id}
                onClick={() => setDeceasedGender(opt.id as any)}
                className={`w-full py-10 rounded-[2.5rem] font-black text-2xl transition-all malayalam border-4 ${deceasedGender === opt.id ? 'bg-emerald-900 border-emerald-500 text-white shadow-2xl' : 'bg-white border-emerald-50 text-emerald-800 hover:border-emerald-200'}`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.SELECTION) {
    return (
      <div className="min-h-screen bg-[#fdfdfb] flex flex-col p-6 pb-32 animate-slide-up islamic-pattern">
        <header className="mb-6 mt-4 text-center max-w-md mx-auto">
          <h2 className="text-2xl font-black text-emerald-950 mb-1 malayalam">ബന്ധുക്കളെ തിരഞ്ഞെടുക്കുക</h2>
          <p className="text-slate-500 text-sm malayalam leading-relaxed">അർഹരായ ഓരോ ബന്ധുക്കളെയും തിരഞ്ഞെടുക്കുക.</p>
        </header>

        <div className="space-y-6 max-w-md mx-auto w-full overflow-y-auto pb-4 custom-scrollbar">
          {(Object.entries(heirCategories) as [string, HeirType[]][]).map(([category, types]) => {
            const filteredTypes = types.filter(t => {
              if (t === 'Husband' && deceasedGender === 'Male') return false;
              if (t === 'Wife' && deceasedGender === 'Female') return false;
              return true;
            });
            if (filteredTypes.length === 0) return null;

            return (
              <div key={category} className="space-y-3">
                <div className="flex items-center gap-3 px-2">
                  <div className="h-px flex-1 bg-emerald-100"></div>
                  <h4 className="text-[10px] font-extrabold text-emerald-700/60 uppercase tracking-[0.3em] malayalam whitespace-nowrap">{category}</h4>
                  <div className="h-px flex-1 bg-emerald-100"></div>
                </div>
                <div className="grid grid-cols-1 gap-3">
                  {filteredTypes.map(type => {
                    const count = getHeirCount(type);
                    const meta = HEIR_METADATA[type];
                    return (
                      <div 
                        key={type} 
                        className={`p-4 rounded-2xl border transition-all duration-300 flex items-center justify-between ${count > 0 ? 'bg-emerald-900 border-emerald-700 shadow-md ring-2 ring-emerald-900/10' : 'bg-white border-emerald-50 shadow-sm'}`}
                      >
                        <div className="flex flex-col flex-1 pr-4">
                          <span className={`font-bold malayalam leading-snug text-base ${count > 0 ? 'text-white' : 'text-emerald-950'}`}>
                            {meta.ml}
                          </span>
                        </div>
                        <div className={`flex items-center gap-2 p-1 rounded-xl shrink-0 ${count > 0 ? 'bg-emerald-800' : 'bg-emerald-50'}`}>
                          <button 
                            onClick={() => updateHeirCount(type, -1)}
                            className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center transition-all active:scale-90 ${count > 0 ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-400'}`}
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                          </button>
                          <span className={`w-6 text-center font-black text-lg ${count > 0 ? 'text-white' : 'text-emerald-950'}`}>
                            {count}
                          </span>
                          <button 
                            disabled={meta.max ? count >= meta.max : false}
                            onClick={() => updateHeirCount(type, 1)}
                            className={`w-9 h-9 rounded-lg shadow-sm flex items-center justify-center transition-all active:scale-90 disabled:opacity-30 ${count > 0 ? 'bg-emerald-700 text-white' : 'bg-white text-emerald-800'}`}
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

        <div className="fixed bottom-0 left-0 right-0 p-6 glass border-t border-emerald-100 flex justify-center gap-4 z-50">
          <button onClick={() => setStep(AppStep.GENDER)} className="flex-1 max-w-[110px] h-14 border-2 border-emerald-100 bg-emerald-50/50 text-emerald-800 rounded-2xl font-bold active:scale-95 malayalam">പുറകോട്ട്</button>
          <button 
            disabled={heirs.length === 0}
            onClick={handleCalculate} 
            className="flex-1 max-w-xs h-14 bg-emerald-900 text-white rounded-2xl font-black text-lg shadow-xl shadow-emerald-900/20 malayalam flex items-center justify-center gap-2"
          >
            <span>കണക്കാക്കുക</span>
          </button>
        </div>
      </div>
    );
  }

  if (step === AppStep.RESULT && result) {
    return (
      <div className="min-h-screen bg-[#fdfdfb] flex flex-col p-6 py-14 animate-slide-up islamic-pattern">
        <header className="mb-12 text-center space-y-5 max-w-md mx-auto">
          <h2 className="text-3xl font-black text-emerald-950 malayalam">അവകാശ വിഹിതങ്ങൾ</h2>
          <div className="bg-emerald-900 text-white px-10 py-6 rounded-[2.5rem] inline-block shadow-2xl relative overflow-hidden">
             <p className="text-[10px] uppercase font-black tracking-[0.3em] mb-2 opacity-60">Net Estate</p>
             <p className="text-3xl font-black">₹{result.netEstate.toLocaleString()}</p>
          </div>
        </header>

        <div className="max-w-xl mx-auto w-full space-y-8 flex-1">
          {result.warnings.map((w, i) => (
            <div key={i} className="bg-rose-50 text-rose-800 p-6 rounded-[2.5rem] border border-rose-100 text-sm font-bold flex gap-4 items-start shadow-sm">
              <span className="malayalam leading-relaxed">{w}</span>
            </div>
          ))}

          {result.complex && (
            <div className="bg-amber-50 text-amber-900 p-8 rounded-[3rem] border-2 border-amber-100 text-center shadow-xl malayalam space-y-2">
              <p className="font-black text-xl">സങ്കീർണ്ണമായ കേസ്</p>
              <p className="text-sm opacity-80 leading-relaxed">കൃത്യതയ്ക്കായി ഒരു പണ്ഡിതനെ സമീപിക്കാൻ താൽപ്പര്യപ്പെടുന്നു.</p>
            </div>
          )}

          <div className="bg-white p-4 rounded-[3.5rem] shadow-2xl border border-emerald-50 overflow-hidden divide-y divide-emerald-50/50">
            {result.shares.map((share, i) => (
              <div key={i} className="group flex items-center justify-between p-7 transition-all hover:bg-emerald-50/30">
                <div className="space-y-2">
                  <p className="font-black text-emerald-950 text-2xl malayalam leading-tight">{share.label}</p>
                  <p className="text-[10px] text-emerald-800/40 font-extrabold uppercase tracking-widest">{share.percentage}</p>
                </div>
                <div className="text-right flex flex-col items-end gap-1">
                  <div className="bg-emerald-50 text-emerald-900 px-6 py-2.5 rounded-2xl font-black text-xl">{share.fraction}</div>
                  {share.amount !== undefined && <p className="text-xs font-bold text-emerald-800/30">₹{share.amount.toLocaleString()}</p>}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-4 mt-16 max-w-md mx-auto w-full mb-12">
          <button onClick={() => setStep(AppStep.SELECTION)} className="w-full bg-emerald-950 text-white h-16 rounded-2xl font-black text-lg transition-all active:scale-95 shadow-2xl malayalam flex items-center justify-center gap-2">വിവരങ്ങൾ മാറ്റുക</button>
          <button onClick={reset} className="w-full border-2 border-emerald-100 bg-white text-emerald-800 h-16 rounded-2xl font-black text-lg transition-all active:scale-95 malayalam">പുതിയ കണക്ക് തുടങ്ങുക</button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
