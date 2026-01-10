
import React, { useState, useMemo } from 'react';
import { AppStep, Heir, HeirType, CalculationResult, HEIR_METADATA, EstateData } from './types';
import { calculateShares } from './logic/faraidEngine';

/** 
 * Enhanced Screen Wrapper with fixed Header/Footer and independent content scrolling
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
}

const stepsOrder = [
  AppStep.DESCRIPTION,
  AppStep.HADITH,
  AppStep.AYAH,
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
  nextLabel = "അടുത്തത്", 
  disabled = false,
  hideFooter = false
}) => {
  const stepIndex = stepsOrder.indexOf(currentStep);
  
  return (
    <div className="h-full flex flex-col relative overflow-hidden bg-transparent">
      {/* Progress Bar */}
      {stepIndex >= 0 && (
        <div className="fixed top-0 left-0 right-0 h-1 bg-slate-900/5 z-[70]">
          <div 
            className="h-full bg-[#D89F37] transition-all duration-700 ease-out shadow-[0_0_12px_rgba(216,159,55,0.6)]" 
            style={{ width: `${((stepIndex + 1) / stepsOrder.length) * 100}%` }}
          />
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 min-h-0 relative z-10 flex flex-col max-w-md mx-auto w-full px-4 pt-6">
        {children}
      </main>

      {/* Persistent Glass Footer */}
      {!hideFooter && (
        <div className="px-4 pt-5 pb-6 glass flex justify-center gap-3 shrink-0 rounded-t-[24px] shadow-[0_-12px_40px_rgba(0,0,0,0.08)] mb-[env(safe-area-inset-bottom)]">
          {prevStep && (
            <button 
              onClick={() => setStep(prevStep)} 
              className="flex-1 max-w-[100px] h-14 rounded-[20px] font-bold text-[#1E2E4F] bg-white/40 border border-white/60 active-press transition-all malayalam text-sm shadow-sm backdrop-blur-md"
            >
              പുറകോട്ട്
            </button>
          )}
          {nextStep && (
            <button 
              disabled={disabled} 
              onClick={() => setStep(nextStep)} 
              className="flex-1 max-w-xs h-14 bg-[#006B46]/85 text-white rounded-[20px] font-bold text-base transition-all active-press shadow-xl shadow-[#006B46]/20 malayalam disabled:opacity-40 disabled:grayscale backdrop-blur-lg border border-white/10"
            >
              {nextLabel}
            </button>
          )}
        </div>
      )}
    </div>
  );
};

const RulesContent: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-[#1E2E4F]/30 backdrop-blur-lg animate-fade-in">
    <div className="bg-white/80 backdrop-blur-3xl w-full max-w-sm max-h-[85vh] rounded-[24px] shadow-2xl flex flex-col overflow-hidden animate-in border border-white/40">
      <header className="px-6 py-6 border-b border-white/20 flex justify-between items-center shrink-0">
        <h2 className="text-lg font-black text-[#1E2E4F] malayalam">വിശദമായ നിയമങ്ങൾ</h2>
        <button onClick={onClose} className="p-2 bg-white/30 hover:bg-white/50 rounded-full transition-colors active-press backdrop-blur-md border border-white/40">
          <svg className="w-5 h-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
        </button>
      </header>
      <div className="flex-1 overflow-y-auto scroll-container hide-scrollbar p-6 space-y-6 malayalam text-left">
          <section className="space-y-3">
            <h3 className="font-bold text-[#006B46] text-[11px] uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#006B46]"></span>
              തഴയപ്പെടാത്തവർ
            </h3>
            <div className="grid grid-cols-2 gap-2.5">
              {['ഭർത്താവ്', 'ഭാര്യ', 'പിതാവ്', 'മാതാവ്', 'മകൻ', 'മകൾ'].map((name) => (
                <div key={name} className="bg-white/40 backdrop-blur-sm p-3.5 rounded-[20px] border border-white/60 text-center font-bold text-[13px] text-emerald-950 shadow-sm">
                  {name}
                </div>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <h3 className="font-bold text-[#D89F37] text-[11px] uppercase tracking-[0.15em] flex items-center gap-2">
              <span className="w-1.5 h-1.5 rounded-full bg-[#D89F37]"></span>
              പ്രധാന വിഹിതങ്ങൾ
            </h3>
            <div className="space-y-2.5">
              {[
                { label: 'ഭർത്താവ്', cond: 'മക്കളില്ലെങ്കിൽ', share: '1/2' },
                { label: 'ഭാര്യ', cond: 'മക്കളില്ലെങ്കിൽ', share: '1/4' },
                { label: 'മാതാവ്', cond: 'മക്കളില്ലെങ്കിൽ', share: '1/3' }
              ].map((item, idx) => (
                <div key={idx} className="bg-white/40 backdrop-blur-md p-4 rounded-[20px] border border-white/60 flex justify-between items-center shadow-sm">
                  <div className="flex flex-col">
                    <span className="text-[14px] font-bold text-[#1E2E4F]">{item.label}</span>
                    <span className="text-[10px] text-slate-500 font-medium">{item.cond}</span>
                  </div>
                  <span className="bg-[#1E2E4F]/85 text-white px-3 py-1.5 rounded-xl font-black text-xs border border-white/10">{item.share}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="glass-navy p-7 rounded-[24px] text-center shadow-2xl">
            <div className="w-12 h-12 bg-[#006B46]/80 rounded-2xl flex items-center justify-center mx-auto mb-4 border border-white/20 shadow-lg backdrop-blur-md">
              <svg className="w-6 h-6 text-[#D89F37]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3" /></svg>
            </div>
            <p className="text-[13px] text-white/95 leading-relaxed malayalam word-ready-text px-1">
              ഈ വിതരണം ഷാഫിഈ ഫിഖ്ഹ് അടിസ്ഥാനമാക്കി ലളിതമാക്കിയതാണ്. സങ്കീർണ്ണമായ വിഷയങ്ങളിൽ പണ്ഡിതരുമായി ആലോചിക്കുക.
            </p>
          </section>
      </div>
      <footer className="p-6 bg-white/20 backdrop-blur-xl border-t border-white/10">
         <button onClick={onClose} className="w-full bg-[#1E2E4F] text-white py-4 rounded-[20px] font-bold text-base malayalam active-press shadow-xl">മനസ്സിലായി</button>
      </footer>
    </div>
  </div>
);

const App: React.FC = () => {
  const [step, setStep] = useState<AppStep>(AppStep.WELCOME);
  const [deceasedGender, setDeceasedGender] = useState<'Male' | 'Female' | null>(null);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  const [estate, setEstate] = useState<EstateData>({ totalAssets: 0, debts: 0, funeral: 0, will: 0 });
  const [result, setResult] = useState<CalculationResult | null>(null);
  const [showRules, setShowRules] = useState(false);

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

  if (step === AppStep.WELCOME) {
    return (
      <div className="h-full bg-[#1E2E4F] flex flex-col items-center justify-center p-8 text-white relative overflow-hidden">
        {showRules && <RulesContent onClose={() => setShowRules(false)} />}
        
        <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-[#006B46]/30 via-transparent to-[#D89F37]/20 opacity-70 blur-[100px] pointer-events-none"></div>

        <div className="relative z-10 flex flex-col items-center text-center animate-in w-full max-w-sm">
          <div className="relative mb-12">
            <div className="absolute inset-0 bg-[#006B46] blur-3xl opacity-40"></div>
            <div className="w-32 h-32 bg-white/10 backdrop-blur-2xl rounded-[20px] flex items-center justify-center shadow-3xl border border-white/20 relative z-10 scale-110">
              <svg className="w-16 h-16 text-[#D89F37]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          </div>

          <h1 className="text-4xl font-black mb-5 malayalam tracking-tight leading-tight text-white drop-shadow-2xl">ഫറാഇദ്<br/>കാൽക്കുലേറ്റർ</h1>
          <p className="text-[#F7FAF7]/80 mb-16 text-lg malayalam leading-relaxed px-6 font-medium">
            ഇസ്‌ലാമിക അനന്തരാവകാശ വിഹിതം കൃത്യമായും ലളിതമായും കണ്ടെത്താം.
          </p>
          
          <div className="flex flex-col gap-4 w-full px-4">
            <button 
              onClick={() => setStep(AppStep.DESCRIPTION)} 
              className="w-full bg-[#006B46]/90 text-white py-5 rounded-[20px] font-black text-xl active-press shadow-2xl shadow-black/30 malayalam transition-all backdrop-blur-md border border-white/10"
            >
              തുടരുക
            </button>
            <button 
              onClick={() => setShowRules(true)} 
              className="w-full bg-white/5 border border-white/20 text-white py-4 rounded-[20px] font-bold text-lg active-press malayalam transition-all backdrop-blur-xl hover:bg-white/10"
            >
              നിയമങ്ങൾ കാണുക
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === AppStep.DESCRIPTION) {
    return (
      <ScreenWrapper currentStep={step} nextStep={AppStep.HADITH} prevStep={AppStep.WELCOME} setStep={setStep}>
        <div className="flex flex-col w-full flex-1 min-h-0 overflow-y-auto hide-scrollbar space-y-5 px-1 pb-10">
          <div className="w-12 h-1 bg-[#D89F37]/40 rounded-full mx-auto shrink-0"></div>
          <h2 className="text-3xl font-black text-[#1E2E4F] malayalam text-center tracking-tight mb-[10px] shrink-0">ഫറാഇദ്</h2>
          <p className="text-[16px] text-slate-700 leading-relaxed malayalam text-center font-medium px-1 word-ready-text mb-[16px] shrink-0">
            ഒരാൾ മരണപ്പെട്ടാൽ അയാളുടെ സ്വത്ത് വിഭജിക്കുന്നത് ഖുർആൻ നിശ്ചയിച്ച കൃത്യമായ അവകാശികൾക്കിടയിലാണ്. ഷാഫിഈ മദ്‌ഹബ് പ്രകാരമുള്ള നിയമങ്ങളാണ് ഈ ആപ്പിൽ നൽകിയിരിക്കുന്നത്.
          </p>
          <div className="bg-emerald-50/40 backdrop-blur-md p-6 rounded-[24px] border border-emerald-100/40 space-y-5 shadow-inner animate-in mb-8">
            {[
              "ഷാഫിഈ ഫിഖ്ഹ് അടിസ്ഥാനമാക്കിയുള്ള കണക്കുകൂട്ടൽ.",
              "കടബാധ്യതകളും വസീയ്യത്തും വിതരണത്തിന് മുൻപ് തീർക്കുന്നു."
            ].map((text, i) => (
              <div key={i} className="flex items-start gap-4 text-[14px] text-[#1E2E4F] malayalam font-bold leading-relaxed">
                <div className="mt-1.5 w-2.5 h-2.5 rounded-full bg-[#D89F37] shrink-0 shadow-lg shadow-amber-500/30"></div>
                {text}
              </div>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.HADITH) {
    return (
      <ScreenWrapper currentStep={step} nextStep={AppStep.AYAH} prevStep={AppStep.DESCRIPTION} setStep={setStep}>
        <div className="flex flex-col items-center justify-center flex-1 py-4">
          <div className="glass-card p-8 w-full flex flex-col items-center animate-in relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-[#D89F37]/15 rounded-full -mr-16 -mt-16 blur-2xl"></div>
            
            <div className="flex items-center justify-center text-[#D89F37] mb-5">
              <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.247 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
            </div>
            
            <div className="arabic mb-6">
              أَلْحِقُوا الْفَرَائِضَ بِأَهْلِهَا فَمَا بَقِيَ فَهُوَ لِأَوْلَى رَجُلٍ ذَكَرٍ
            </div>
            
            <div className="flex items-center gap-5 w-full opacity-40 px-4 mb-5">
              <div className="h-px flex-1 bg-[#D89F37]"></div>
              <div className="w-3 h-3 rotate-45 border-2 border-[#D89F37] bg-white"></div>
              <div className="h-px flex-1 bg-[#D89F37]"></div>
            </div>
            
            <p className="malayalam-translation text-[#006B46] font-bold px-2 mb-6">
              "അവകാശവിഹിതങ്ങൾ അർഹരായവർക്ക് എത്തിക്കുക. ബാക്കി വരുന്നത് ഏറ്റവും അടുത്ത പുരുഷ ബന്ധുവിനുള്ളതാണ്."
            </p>
            
            <div className="flex justify-center">
              <span className="ref-chip">
                സ്വഹീഹുൽ ബുഖാരി
              </span>
            </div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.AYAH) {
    return (
      <ScreenWrapper currentStep={step} nextStep={AppStep.ASSETS} prevStep={AppStep.HADITH} setStep={setStep}>
        <div className="flex flex-col items-center justify-center flex-1 py-4">
          <div className="glass-card p-8 w-full flex flex-col items-center animate-in relative overflow-hidden">
             <div className="w-16 h-16 rounded-[20px] bg-[#006B46]/10 flex items-center justify-center text-[#006B46] shadow-inner border border-[#006B46]/10 backdrop-blur-md mb-5">
               <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L4.5 20.29l.71.71L12 18l6.79 3 .71-.71L12 2z"/></svg>
             </div>
            
            <div className="arabic mb-6">
              يُوصِيكُمُ اللَّهُ فِي أَوْلَادِكُمْ لِلذَّكَرِ مِثْلُ حَظِّ الْأُنْثَيَيْنِ
            </div>

            <div className="w-full flex justify-center gap-2.5 opacity-40 mb-5">
              <div className="w-2.5 h-2.5 rounded-full bg-[#D89F37]"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#D89F37] opacity-60"></div>
              <div className="w-2.5 h-2.5 rounded-full bg-[#D89F37] opacity-30"></div>
            </div>

            <p className="malayalam-translation text-[#1E2E4F] font-bold px-2 mb-6">
              "നിങ്ങളുടെ മക്കളുടെ കാര്യത്തിൽ അല്ലാഹു കൽപ്പിക്കുന്നു; ആണിന് രണ്ട് പെണ്ണിന്റെ വിഹിതത്തിന് തുല്യമായതുണ്ട്."
            </p>

            <div className="flex justify-center">
                <span className="ref-chip">
                  സൂറത്ത് അന്നിസാഅ് 4:11
                </span>
            </div>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.ASSETS) {
    return (
      <ScreenWrapper currentStep={step} nextStep={AppStep.GENDER} prevStep={AppStep.AYAH} setStep={setStep}>
        <header className="py-8 text-center shrink-0">
          <h2 className="text-3xl font-black text-[#1E2E4F] malayalam tracking-tight leading-tight">സ്വത്ത് വിവരങ്ങൾ</h2>
          <p className="text-slate-500 text-[14px] malayalam font-bold mt-1.5 opacity-60">വിതരണത്തിനുള്ള തുക കണ്ടെത്താം</p>
        </header>

        <div className="flex-1 min-h-0 scroll-container hide-scrollbar pb-10 space-y-5">
          {[
            { label: 'ആസ്തി (മൊത്തം സ്വത്ത്):', key: 'totalAssets', color: 'bg-emerald-50/40 text-emerald-950 border-emerald-100/50' },
            { label: 'കടം (ബാധ്യതകൾ):', key: 'debts', color: 'bg-rose-50/40 text-rose-950 border-rose-100/50' },
            { label: 'മരണാനന്തര കർമ്മങ്ങൾ:', key: 'funeral', color: 'bg-slate-50/40 text-slate-950 border-slate-100/50' },
            { label: 'വസീയ്യത്ത് (പരമാവധി 1/3):', key: 'will', color: 'bg-amber-50/40 text-amber-950 border-amber-100/50' }
          ].map(field => (
            <div key={field.key} className={`p-6 rounded-[24px] border backdrop-blur-md shadow-premium space-y-4 transition-all duration-300 hover:scale-[1.01] ${field.color}`}>
              <label className="text-[11px] font-black malayalam uppercase tracking-[0.2em] opacity-80">{field.label}</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-2xl opacity-20">₹</span>
                <input 
                  type="number" 
                  inputMode="numeric"
                  value={(estate as any)[field.key] || ''} 
                  onChange={e => setEstate({...estate, [field.key]: Math.max(0, Number(e.target.value))})} 
                  className="w-full bg-white/40 border-none rounded-2xl py-4.5 pl-12 pr-5 outline-none font-black text-2xl text-[#1E2E4F] shadow-inner focus:bg-white/60 transition-colors" 
                  placeholder="0" 
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
      <ScreenWrapper currentStep={step} nextStep={deceasedGender ? AppStep.SELECTION : undefined} prevStep={AppStep.ASSETS} setStep={setStep} disabled={!deceasedGender}>
        <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-16">
          <div className="text-center space-y-4">
            <h2 className="text-4xl font-black text-[#1E2E4F] malayalam leading-tight tracking-tight">മരണപ്പെട്ട<br/>വ്യക്തി</h2>
            <p className="text-slate-500 text-lg malayalam font-bold opacity-50">ലിംഗഭേദം തിരഞ്ഞെടുക്കുക</p>
          </div>
          
          <div className="grid grid-cols-1 gap-6 w-full max-w-xs">
            {[
              { id: 'Male', label: 'പുരുഷൻ', sub: 'MALE' },
              { id: 'Female', label: 'സ്ത്രീ', sub: 'FEMALE' }
            ].map((opt) => (
              <button 
                key={opt.id} 
                onClick={() => setDeceasedGender(opt.id as any)} 
                className={`w-full py-12 rounded-[24px] font-bold transition-all malayalam border-2 flex flex-col items-center gap-3 active-press relative overflow-hidden backdrop-blur-xl shadow-premium ${deceasedGender === opt.id ? 'bg-[#1E2E4F]/85 border-[#1E2E4F]/40 text-white shadow-[0_24px_64px_-12px_rgba(30,46,79,0.4)] scale-105' : 'bg-white/50 border-white/70 text-slate-600'}`}
              >
                <span className="text-3xl font-black tracking-tight">{opt.label}</span>
                <span className={`text-[12px] font-black uppercase tracking-[0.35em] ${deceasedGender === opt.id ? 'text-[#D89F37]' : 'opacity-30'}`}>{opt.sub}</span>
                {deceasedGender === opt.id && (
                  <div className="absolute top-6 right-6 text-[#D89F37] animate-in scale-110">
                    <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.SELECTION) {
    const categories = ['നിശ്ചിത വിഹിതക്കാർ (Sharers)', 'അസാബ (Residuaries)', 'ദൂൽ അർഹാം (Dhul-Arham)'];

    return (
      <ScreenWrapper currentStep={step} setStep={setStep} hideFooter={true}>
        <header className="py-8 text-center shrink-0">
          <h2 className="text-3xl font-black text-[#1E2E4F] malayalam tracking-tight leading-tight">അവകാശികൾ (Heirs List)</h2>
          <p className="text-slate-500 text-[13px] malayalam font-bold mt-1.5 opacity-50">ബന്ധുക്കളുടെ എണ്ണം ചേർക്കുക</p>
        </header>

        <div className="flex-1 min-h-0 scroll-container hide-scrollbar pb-6 space-y-6">
          {categories.map((cat) => {
            const heirsInCategory = Object.entries(HEIR_METADATA)
              .filter(([type, meta]) => 
                meta.category === cat && 
                (type === 'Husband' ? deceasedGender === 'Female' : type === 'Wife' ? deceasedGender === 'Male' : true)
              );

            if (heirsInCategory.length === 0) return null;

            return (
              <div key={cat} className="space-y-3">
                <h3 className="px-2 font-black text-[#006B46] malayalam text-[14px] uppercase tracking-wide opacity-80">{cat}</h3>
                <div className="glass-card overflow-hidden shadow-[0px_10px_24px_rgba(0,0,0,0.08)] bg-white/70 border border-white/60">
                  {heirsInCategory.map(([type, meta], idx) => {
                    const count = getHeirCount(type as HeirType);
                    return (
                      <div key={type} className="flex flex-col">
                        <div className="flex items-center justify-between h-[64px] px-4 py-3">
                          <div className="flex flex-col gap-0.5">
                            <span className="font-black malayalam text-[15px] leading-tight tracking-tight text-[#1E2E4F]">{meta.ml}</span>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">{type}</span>
                          </div>
                          
                          <div className="flex items-center gap-3 p-1.5 rounded-full bg-slate-100/50 shadow-inner border border-white/30">
                            <button 
                              onClick={() => updateHeirCount(type as HeirType, -1)} 
                              className={`w-8 h-8 rounded-full flex items-center justify-center transition-all active-press ${count > 0 ? 'bg-white text-[#1E2E4F] shadow-sm border border-slate-200' : 'bg-transparent text-slate-300 pointer-events-none'}`}
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M20 12H4" /></svg>
                            </button>
                            <span className={`w-4 text-center font-black text-[14px] ${count > 0 ? 'text-[#006B46]' : 'text-slate-400'}`}>{count}</span>
                            <button 
                              disabled={meta.max ? count >= meta.max : false} 
                              onClick={() => updateHeirCount(type as HeirType, 1)} 
                              className="w-8 h-8 rounded-full bg-white text-[#006B46] shadow-sm border border-slate-200 flex items-center justify-center transition-all active-press disabled:opacity-30"
                            >
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                            </button>
                          </div>
                        </div>
                        {idx < heirsInCategory.length - 1 && <div className="h-px bg-slate-200/40 w-full" />}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}

          <div className="mt-5 space-y-3 pb-8">
            <button 
                disabled={heirs.length === 0} 
                onClick={handleCalculate} 
                className="w-full bg-[#006B46]/90 text-white h-16 rounded-[24px] font-black text-xl malayalam py-4 shadow-2xl shadow-[#006B46]/30 active-press transition-all disabled:opacity-30 flex items-center justify-center gap-3 backdrop-blur-lg border border-white/10"
            >
                കണക്കാക്കുക (Calculate)
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 5l7 7-7 7" /></svg>
            </button>
            <button 
              onClick={() => setStep(AppStep.GENDER)} 
              className="w-full h-14 rounded-[20px] font-bold text-[#1E2E4F] bg-white/40 border border-white/60 active-press transition-all malayalam text-base shadow-sm backdrop-blur-md"
            >
              പുറകോട്ട്
            </button>
          </div>
        </div>
      </ScreenWrapper>
    );
  }

  if (step === AppStep.RESULT && result) {
    return (
      <div className="h-full flex flex-col overflow-hidden bg-transparent pt-6 px-1">
        
        <header className="pb-8 text-center shrink-0 px-6">
          <h2 className="text-4xl font-black text-[#1E2E4F] malayalam leading-tight tracking-tight mb-6">വിതരണം</h2>
          
          <div className="glass-navy text-white p-10 rounded-[24px] inline-block shadow-[0_24px_64px_-16px_rgba(0,0,0,0.3)] border border-white/15 relative overflow-hidden w-full max-w-xs">
             <div className="absolute top-0 right-0 w-28 h-28 bg-[#006B46]/50 rounded-full blur-[45px] -mr-12 -mt-12 opacity-90"></div>
             <p className="text-[11px] uppercase font-black tracking-[0.3em] mb-2.5 opacity-40 relative z-10">വിതരണത്തിന് തയ്യാറുള്ള തുക</p>
             <p className="text-4xl font-black text-[#D89F37] relative z-10 drop-shadow-2xl">₹{result.netEstate.toLocaleString()}</p>
          </div>
        </header>

        <div className="flex-1 min-h-0 scroll-container hide-scrollbar px-5 pb-8 space-y-6">
          {result.warnings.length > 0 && (
            <div className="space-y-3">
              {result.warnings.map((w, i) => (
                <div key={i} className="bg-amber-50/40 backdrop-blur-md text-amber-950 p-6 rounded-[24px] border border-amber-100/50 text-[13px] font-bold flex gap-4 malayalam leading-relaxed shadow-sm">
                  <div className="bg-amber-100/70 p-2.5 h-fit rounded-full text-amber-600 shadow-inner backdrop-blur-sm border border-amber-200/50">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                  </div>
                  <span className="flex-1">{w}</span>
                </div>
              ))}
            </div>
          )}
          
          <div className="space-y-4 pb-12">
            <h3 className="px-2 font-black text-[#006B46] malayalam text-[14px] uppercase tracking-wide opacity-80">അവകാശികൾക്കും വിഹിതവും</h3>
            {result.shares.map((share, i) => (
              <div key={i} className="glass-card flex items-center justify-between p-7 transition-all duration-500 hover:bg-emerald-50/20 group border-white/70">
                <div className="space-y-1.5">
                  <p className="font-black text-[#1E2E4F] text-[18px] malayalam leading-tight tracking-tight group-hover:text-[#006B46] transition-colors">{share.label}</p>
                  <p className="text-[11px] text-slate-400 font-black tracking-[0.2em] uppercase">{share.fraction} ({share.percentage})</p>
                </div>
                <div className="text-right flex flex-col items-end gap-2">
                  <div className="bg-white/60 text-[#006B46] px-6 py-2 rounded-2xl font-black text-[17px] border border-emerald-100/60 shadow-inner backdrop-blur-md">₹{share.amount?.toLocaleString()}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="px-5 pb-8 pt-5 glass rounded-t-[24px] space-y-4 shadow-[0_-16px_40px_rgba(0,0,0,0.1)]">
          <button 
            onClick={reset} 
            className="w-full bg-[#1E2E4F]/90 backdrop-blur-lg text-white h-16 rounded-[20px] font-black text-lg malayalam active-press shadow-2xl border border-white/10"
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
