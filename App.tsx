import React, { useState, useEffect, useRef, useMemo } from 'react';
import Layout from './components/Layout';
import { sendFaraidMessage, testConnection, calculateInheritance } from './services/geminiService';
import { Message, ConnectionStatus, EstateInfo, Heir, AppStep, HeirType, ViewMode } from './types';

interface CalculationResult {
  eligible_heirs: string[];
  excluded_heirs: string[];
  shares: Record<string, string>;
  fraction_math: string;
  distribution_notes: string;
  validation: 'valid' | 'invalid';
  reason?: string;
}

const HEIR_CATEGORIES: Record<string, HeirType[]> = {
  'Immediate Family': ['Husband', 'Wife', 'Son', 'Daughter', 'Father', 'Mother'],
  'Descendants': ['Grandson', 'Granddaughter'],
  'Grandparents': ['PaternalGrandfather', 'PaternalGrandmother', 'MaternalGrandmother'],
  'Siblings': ['FullBrother', 'FullSister', 'ConsanguineBrother', 'ConsanguineSister', 'UterineBrother', 'UterineSister'],
  'Extended Relatives': ['Nephew', 'PaternalUncle']
};

const CATEGORY_COLORS: Record<string, string> = {
  'Immediate Family': 'from-blue-500 to-indigo-600',
  'Descendants': 'from-emerald-500 to-teal-600',
  'Grandparents': 'from-purple-500 to-fuchsia-600',
  'Siblings': 'from-cyan-500 to-blue-600',
  'Extended Relatives': 'from-slate-500 to-slate-700'
};

const HEIR_THEMES: Record<HeirType, { bg: string, text: string, border: string, iconBg: string }> = {
  'Husband': { bg: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-100', iconBg: 'bg-blue-100' },
  'Wife': { bg: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-100', iconBg: 'bg-rose-100' },
  'Son': { bg: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
  'Daughter': { bg: 'bg-teal-50', text: 'text-teal-700', border: 'border-teal-100', iconBg: 'bg-teal-100' },
  'Father': { bg: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-100', iconBg: 'bg-amber-100' },
  'Mother': { bg: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-100', iconBg: 'bg-orange-100' },
  'Grandson': { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-100', iconBg: 'bg-emerald-100' },
  'Granddaughter': { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-100', iconBg: 'bg-teal-100' },
  'PaternalGrandfather': { bg: 'bg-purple-50', text: 'text-purple-700', border: 'border-purple-100', iconBg: 'bg-purple-100' },
  'PaternalGrandmother': { bg: 'bg-fuchsia-50', text: 'text-fuchsia-700', border: 'border-fuchsia-100', iconBg: 'bg-fuchsia-100' },
  'MaternalGrandmother': { bg: 'bg-pink-50', text: 'text-pink-700', border: 'border-pink-100', iconBg: 'bg-pink-100' },
  'FullBrother': { bg: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-100', iconBg: 'bg-cyan-100' },
  'FullSister': { bg: 'bg-sky-50', text: 'text-sky-700', border: 'border-sky-100', iconBg: 'bg-sky-100' },
  'ConsanguineBrother': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', iconBg: 'bg-slate-100' },
  'ConsanguineSister': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', iconBg: 'bg-slate-100' },
  'UterineBrother': { bg: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-100', iconBg: 'bg-indigo-100' },
  'UterineSister': { bg: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-100', iconBg: 'bg-violet-100' },
  'Nephew': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', iconBg: 'bg-slate-100' },
  'PaternalUncle': { bg: 'bg-slate-50', text: 'text-slate-700', border: 'border-slate-100', iconBg: 'bg-slate-100' }
};

const MAX_HEIRS: Partial<Record<HeirType, number>> = {
  'Husband': 1,
  'Father': 1,
  'Mother': 1,
  'Wife': 4,
  'PaternalGrandfather': 1,
  'PaternalGrandmother': 1,
  'MaternalGrandmother': 1
};

const App: React.FC = () => {
  const [hasStarted, setHasStarted] = useState(false);
  const [onboardingPage, setOnboardingPage] = useState(1);
  const [viewMode, setViewMode] = useState<ViewMode>('calculator');
  const [step, setStep] = useState<AppStep>(AppStep.ESTATE);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<ConnectionStatus>(ConnectionStatus.IDLE);
  const [isCalculating, setIsCalculating] = useState(false);
  const [calcResult, setCalcResult] = useState<CalculationResult | null>(null);
  const [showPercentage, setShowPercentage] = useState(false);
  const [isAddHeirModalOpen, setIsAddHeirModalOpen] = useState(false);
  const [heirSearchQuery, setHeirSearchQuery] = useState('');
  
  const [estate, setEstate] = useState<EstateInfo>({
    totalAssets: 0,
    funeralExpenses: 0,
    debts: 0,
    willAmount: 0,
  });
  const [deceasedGender, setDeceasedGender] = useState<'Male' | 'Female' | null>(null);
  const [heirs, setHeirs] = useState<Heir[]>([]);
  
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const init = async () => {
      setStatus(ConnectionStatus.CONNECTING);
      const isConnected = await testConnection();
      setStatus(isConnected ? ConnectionStatus.CONNECTED : ConnectionStatus.ERROR);
      
      const welcomeMsg: Message = {
        id: 'welcome',
        role: 'model',
        text: `Assalamu Alaikum wa Rahmatullah! 👋\n\nWelcome to the Islamic Inheritance Assistant (Faraid Malayalam).\nഇത് ഒരു ഇസ്ലാമിക് ശരീഅത്ത് അടിസ്ഥാനമാക്കിയുള്ള അവകാശവകാ സഹായിയാണ്.`,
        timestamp: new Date(),
      };
      setMessages([welcomeMsg]);
    };
    init();
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, viewMode, hasStarted]);

  const handleChat = async () => {
    if (!input.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: 'user', text: input, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');

    try {
      const context = `Current Step: ${step}. Estate: ${JSON.stringify(estate)}. Deceased: ${deceasedGender}. Heirs: ${JSON.stringify(heirs)}`;
      const response = await sendFaraidMessage(input, context);
      const modelMsg: Message = { id: (Date.now() + 1).toString(), role: 'model', text: response, timestamp: new Date() };
      setMessages(prev => [...prev, modelMsg]);
    } catch (err) {
      setMessages(prev => [...prev, { id: 'err', role: 'model', text: "Error connecting to AI.", timestamp: new Date() }]);
    }
  };

  const parseFraction = (fraction: string): number => {
    if (!fraction || typeof fraction !== 'string') return 0;
    const parts = fraction.split('/');
    if (parts.length === 2) {
      const num = parseFloat(parts[0]);
      const den = parseFloat(parts[1]);
      if (!isNaN(num) && !isNaN(den) && den !== 0) return num / den;
    }
    return 0;
  };

  const getNumericShare = (heirType: string, result: CalculationResult): number => {
    const shareStr = result.shares[heirType];
    if (!shareStr) return 0;
    
    if (shareStr.toLowerCase().includes('residuary')) {
      let totalFixed = 0;
      let residuaryCount = 0;
      
      Object.entries(result.shares).forEach(([type, value]) => {
        if (!value.toLowerCase().includes('residuary')) {
          totalFixed += parseFraction(value);
        } else {
          residuaryCount++;
        }
      });
      
      const totalResidue = Math.max(0, 1 - totalFixed);
      return residuaryCount > 0 ? totalResidue / residuaryCount : 0;
    }
    
    return parseFraction(shareStr);
  };

  const performCalculation = async () => {
    setIsCalculating(true);
    setCalcResult(null);

    const getCount = (type: HeirType) => heirs.find(h => h.type === type)?.count || 0;

    const engineInput = {
      gender: deceasedGender === 'Male' ? 'male' : 'female',
      husband: getCount('Husband') > 0 ? 1 : 0,
      wives: getCount('Wife'),
      sons: getCount('Son'),
      daughters: getCount('Daughter'),
      father: getCount('Father') > 0 ? 1 : 0,
      mother: getCount('Mother') > 0 ? 1 : 0,
      grandfather: getCount('PaternalGrandfather') > 0 ? 1 : 0,
      grandmother: (getCount('MaternalGrandmother') > 0 || getCount('PaternalGrandmother') > 0) ? 1 : 0,
      brothers: getCount('FullBrother'),
      sisters: getCount('FullSister'),
      maternal_brothers: getCount('UterineBrother'),
      maternal_sisters: getCount('UterineSister')
    };

    const result = await calculateInheritance(engineInput);
    setCalcResult(result);
    setIsCalculating(false);
  };

  const addHeir = (type: HeirType) => {
    const max = MAX_HEIRS[type];
    setHeirs(prev => {
      const existing = prev.find(h => h.type === type);
      if (existing) {
        if (max && existing.count >= max) return prev;
        return prev.map(h => h.type === type ? { ...h, count: h.count + 1 } : h);
      }
      return [...prev, { id: Date.now().toString(), type, count: 1 }];
    });
    if (max === 1) setIsAddHeirModalOpen(false);
  };

  const updateHeirCount = (id: string, delta: number) => {
    setHeirs(prev => prev.map(h => {
      if (h.id === id) {
        const max = MAX_HEIRS[h.type];
        const newCount = Math.max(1, h.count + delta);
        if (max && newCount > max) return h;
        return { ...h, count: newCount };
      }
      return h;
    }));
  };

  const removeHeir = (id: string) => {
    setHeirs(prev => prev.filter(h => h.id !== id));
  };

  const netEstate = estate.totalAssets - estate.funeralExpenses - estate.debts - estate.willAmount;
  const stepNumbers = { [AppStep.ESTATE]: '1', [AppStep.DECEASED_INFO]: '2', [AppStep.HEIRS]: '3', [AppStep.SUMMARY]: '4' };

  const availableHeirsForDeceased = useMemo(() => {
    const categories = { ...HEIR_CATEGORIES };
    if (deceasedGender === 'Male') {
      categories['Immediate Family'] = categories['Immediate Family'].filter(h => h !== 'Husband');
    } else if (deceasedGender === 'Female') {
      categories['Immediate Family'] = categories['Immediate Family'].filter(h => h !== 'Wife');
    }
    return categories;
  }, [deceasedGender]);

  if (!hasStarted) {
    const renderOnboardingPage = () => {
      switch (onboardingPage) {
        case 1:
          return (
            <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto h-full px-6">
              <div className="w-28 h-28 bg-gradient-to-br from-emerald-400 to-teal-600 rounded-[3rem] flex items-center justify-center border-4 border-white shadow-2xl mb-4 animate-bounce">
                <svg className="w-14 h-14 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                </svg>
              </div>
              <h1 className="text-5xl font-black bg-gradient-to-r from-amber-500 to-amber-700 bg-clip-text text-transparent malayalam pb-2">സ്വാഗതം</h1>
              <p className="text-xl text-slate-600 malayalam px-4 leading-relaxed font-medium">
                അസ്സലാമു അലൈക്കും. ഇസ്‌ലാമിക ശരീഅത്ത് നിയമപ്രകാരം അനന്തരാവകാശം എളുപ്പത്തിൽ കണക്കാക്കാൻ സഹായിക്കുന്ന ആപ്ലിക്കേഷനിലേക്ക് സ്വാഗതം.
              </p>
            </div>
          );
        case 2:
          return (
            <div className="flex flex-col items-center justify-center text-center space-y-8 max-w-lg mx-auto h-full px-6">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-400 to-indigo-600 rounded-full flex items-center justify-center border-4 border-white shadow-2xl mb-4 animate-pulse">
                <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
              </div>
              <h2 className="text-3xl font-bold text-amber-600 malayalam">അപ്ലിക്കേഷനെ കുറിച്ച്</h2>
              <p className="text-lg text-slate-600 malayalam px-6 leading-relaxed">
                മരണപ്പെട്ട വ്യക്തിയുടെ ആകെ ആസ്തി, കടങ്ങൾ എന്നിവ രേഖപ്പെടുത്താനും അവകാശികളെ തിരഞ്ഞെടുക്കാനും വിശ്വസ്തതയോടും സുതാര്യതയോടും കൂടി ഈ ടൂൾ സഹായിക്കുന്നു.
              </p>
            </div>
          );
        case 3:
          return (
            <div className="flex flex-col items-center justify-center text-center space-y-6 px-4 w-full max-w-md mx-auto h-full">
              <h2 className="text-3xl font-bold text-amber-600 malayalam mb-2">ഖുർആനിക തെളിവുകൾ</h2>
              <div className="w-full space-y-5">
                <div className="bg-gradient-to-br from-emerald-500 to-teal-700 p-8 rounded-[2.5rem] border-2 border-white shadow-xl transform hover:scale-105 transition-all overflow-hidden">
                  <p className="text-4xl arabic text-white text-right font-bold" dir="rtl">يُوصِيكُمُ ٱللَّهُ فِيٓ أَوْلَـٰدِكُمْ...</p>
                  <p className="text-white/90 text-sm malayalam leading-relaxed mt-4 font-medium italic">
                    "നിങ്ങളുടെ മക്കളുടെ കാര്യത്തിൽ അല്ലാഹു നിങ്ങൾക്ക് നിർദ്ദേശം നൽകുന്നു..." (സൂറത്തുന്നിസാ: 11)
                  </p>
                </div>
                <div className="bg-gradient-to-br from-amber-400 to-amber-600 p-8 rounded-[2.5rem] border-2 border-white shadow-xl transform hover:scale-105 transition-all overflow-hidden">
                  <p className="text-4xl arabic text-white text-right font-bold" dir="rtl">تِلْكَ حُدُودُ ٱللَّهِ</p>
                  <p className="text-white/90 text-sm malayalam leading-relaxed mt-4 font-medium italic">
                    "ഈ നിയമങ്ങൾ അല്ലാഹു നിശ്ചയിച്ച അതിരുകളാണ്." (സൂറത്തുന്നിസാ: 13)
                  </p>
                </div>
              </div>
            </div>
          );
        case 4:
          return (
            <div className="flex flex-col items-center justify-center text-center space-y-8 px-4 w-full max-w-md mx-auto h-full">
              <h2 className="text-3xl font-bold text-amber-600 malayalam mb-2">ഹദീസും പ്രാധാന്യവും</h2>
              <div className="bg-gradient-to-br from-indigo-500 to-purple-700 p-10 rounded-[3rem] border-4 border-white shadow-2xl w-full text-white transform rotate-2 overflow-hidden">
                <p className="text-4xl arabic text-white text-right font-bold mb-4" dir="rtl">إِنَّ اللهَ قَدْ أَعْطَى كُلَّ ذِي حَقٍّ حَقَّهُ</p>
                <p className="text-white/90 text-lg malayalam leading-relaxed font-semibold">
                  "നിശ്ചയമായും അല്ലാഹു ഓരോ അവകാശിക്കും അർഹമായ ഓഹരി നൽകിയിരിക്കുന്നു."
                </p>
              </div>
              <p className="text-xl text-slate-700 malayalam font-bold leading-relaxed mt-6">
                അല്ലാഹുവിന്റെ നിയമങ്ങൾ പാലിച്ച് തർക്കങ്ങൾ ഒഴിവാക്കുക എന്നത് പരലോക വിജയത്തിന് പ്രധാനമാണ്.
              </p>
            </div>
          );
        default:
          return null;
      }
    };

    return (
      <div className="fixed inset-0 bg-[#F8FAFC] z-50 flex flex-col h-screen overflow-hidden">
        <div className="flex-1 flex items-center justify-center px-6 overflow-hidden">
          {renderOnboardingPage()}
        </div>
        
        <div className="shrink-0 flex flex-col items-center pb-12 pt-4 bg-white/80 backdrop-blur-md border-t border-slate-200">
          <div className="w-full max-w-xs px-6">
            {onboardingPage < 4 ? (
              <button 
                onClick={() => setOnboardingPage(onboardingPage + 1)}
                className="w-full bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white text-xl py-5 rounded-2xl font-black transition-all shadow-xl shadow-emerald-200 flex items-center justify-center gap-3 active:scale-95"
              >
                <span>അടുത്തത്</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
              </button>
            ) : (
              <button 
                onClick={() => setHasStarted(true)}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-700 hover:from-amber-600 hover:to-amber-800 text-white text-xl py-5 rounded-2xl font-black transition-all shadow-xl shadow-amber-200 flex items-center justify-center gap-3 active:scale-95"
              >
                <span>തുടങ്ങാം</span>
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const sidebarContent = (
    <div className="space-y-8">
      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 malayalam">നിലവിലെ വിവരങ്ങൾ</h3>
        <div className="space-y-4">
          <div className="p-5 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-2xl shadow-lg shadow-emerald-100 border border-white/20">
            <p className="text-[10px] text-white/80 uppercase font-black tracking-widest mb-1">Net Estate</p>
            <p className="text-2xl font-black text-white">₹{netEstate.toLocaleString()}</p>
          </div>
          {deceasedGender && (
            <div className={`p-4 rounded-xl border-2 shadow-sm flex items-center gap-3 ${deceasedGender === 'Male' ? 'bg-blue-50 border-blue-100 text-blue-700' : 'bg-pink-50 border-pink-100 text-pink-700'}`}>
              <div className={`p-2 rounded-lg ${deceasedGender === 'Male' ? 'bg-blue-200' : 'bg-pink-200'}`}>
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/></svg>
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-70">Deceased</p>
                <p className="text-sm font-bold malayalam">{deceasedGender === 'Male' ? 'പുരുഷൻ' : 'സ്ത്രീ'}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-4 malayalam">അവകാശികൾ ({heirs.reduce((acc, h) => acc + h.count, 0)})</h3>
        <div className="space-y-2">
          {heirs.length === 0 ? (
            <div className="py-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-200">
              <p className="text-xs text-slate-400 font-bold italic malayalam">ലിസ്റ്റ് ശൂന്യമാണ്</p>
            </div>
          ) : (
            heirs.map(h => {
              const theme = HEIR_THEMES[h.type];
              return (
                <div key={h.id} className={`flex justify-between items-center p-3 ${theme.bg} rounded-xl border ${theme.border} group shadow-sm transition-all hover:scale-[1.02]`}>
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${theme.text.replace('text', 'bg')}`} />
                    <span className={`text-xs font-bold ${theme.text}`}>{h.type} <span className="opacity-60 ml-1">x{h.count}</span></span>
                  </div>
                  <button onClick={() => removeHeir(h.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1">
                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );

  return (
    <Layout sidebarContent={sidebarContent} currentStep={stepNumbers[step]} viewMode={viewMode} onViewModeChange={setViewMode}>
      <div className="space-y-10 animate-in fade-in duration-700">
        
        {viewMode === 'knowledge' ? (
          <div className="space-y-8 max-w-2xl mx-auto py-10">
            <div className="animate-in fade-in slide-in-from-right-4 duration-700 bg-white p-10 md:p-16 rounded-[3rem] shadow-2xl shadow-amber-100 border border-amber-100 overflow-hidden relative">
                <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full -mr-16 -mt-16 blur-3xl" />
                <h2 className="text-3xl font-black mb-8 malayalam border-b-4 border-amber-400 pb-4 text-amber-700 inline-block">ഫറായിദ് അറിവുകൾ</h2>
                <div className="space-y-6">
                  <div className="p-6 bg-emerald-50 rounded-3xl border border-emerald-100">
                    <h3 className="text-lg font-bold text-emerald-800 mb-3 malayalam">എന്താണ് ഫറായിദ്?</h3>
                    <p className="text-lg leading-relaxed text-slate-700 malayalam">ഇസ്‌ലാമിക ശരീഅത്ത് നിശ്ചയിച്ച അനന്തരാവകാശ നിയമങ്ങളെയാണ് 'ഫറായിദ്' എന്ന് വിളിക്കുന്നത്. ഇത് ഖുർആനിൽ അല്ലാഹു നേരിട്ട് നിശ്ചയിച്ച അതിരുകളാണ്.</p>
                  </div>
                  <p className="text-xl leading-relaxed text-slate-600 malayalam font-medium">ഏതെങ്കിലും ഘട്ടത്തിൽ സഹായം ആവശ്യമുണ്ടെങ്കിൽ താഴെ കാണുന്ന എഐ കൗൺസിലറോട് ചോദിക്കാവുന്നതാണ്. അവർ നിങ്ങളെ ശരിയായ രീതിയിൽ നയിക്കും.</p>
                </div>
                <div className="flex justify-start mt-12">
                  <button onClick={() => setViewMode('calculator')} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-10 py-4 rounded-2xl font-black transition-all shadow-xl shadow-emerald-200 malayalam flex items-center gap-2 active:scale-95">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 15l-3-3m0 0l3-3m-3 3h8M3 12a9 9 0 1118 0 9 9 0 01-18 0z" /></svg>
                    <span>തിരികെ പോകാം</span>
                  </button>
                </div>
              </div>
          </div>
        ) : (
          <div className="space-y-10">
            {step === AppStep.ESTATE && (
              <div className="space-y-8 animate-in fade-in slide-in-from-left-4 duration-500">
                <div className="border-l-8 border-amber-500 pl-6 py-2">
                  <h2 className="text-3xl font-black malayalam text-slate-800">Step 1: ആസ്തി വിവരങ്ങൾ</h2>
                  <p className="text-slate-500 font-bold tracking-tight">Financial profile of the deceased's estate</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                  {[
                    { label: 'മൊത്തം ആസ്തി', key: 'totalAssets', color: 'emerald' },
                    { label: 'സംസ്കാര ചിലവ്', key: 'funeralExpenses', color: 'blue' },
                    { label: 'കടങ്ങൾ', key: 'debts', color: 'rose' },
                    { label: 'വസിയത്ത് (Will)', key: 'willAmount', color: 'amber' }
                  ].map(field => (
                    <div key={field.key} className="space-y-3 group">
                      <label className={`text-xs font-black text-${field.color}-600 uppercase tracking-widest malayalam px-2 block group-hover:translate-x-1 transition-transform`}>{field.label}</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">₹</span>
                        <input 
                          type="number" 
                          value={(estate as any)[field.key] || ''} 
                          onChange={e => setEstate({...estate, [field.key]: Number(e.target.value)})}
                          className={`w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 pl-10 focus:border-${field.color}-500 focus:bg-white focus:ring-4 focus:ring-${field.color}-500/10 outline-none transition-all text-xl font-bold text-slate-800`}
                          placeholder="0"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <div className="flex justify-end pt-4">
                  <button onClick={() => setStep(AppStep.DECEASED_INFO)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-12 py-5 rounded-2xl font-black shadow-2xl shadow-emerald-200 transition-all active:scale-95 malayalam text-lg">അടുത്ത ഘട്ടം →</button>
                </div>
              </div>
            )}

            {step === AppStep.DECEASED_INFO && (
              <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                <div className="border-l-8 border-amber-500 pl-6 py-2">
                  <h2 className="text-3xl font-black malayalam text-slate-800">Step 2: മരണപ്പെട്ട വ്യക്തി</h2>
                  <p className="text-slate-500 font-bold tracking-tight">Identify the deceased's gender</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                  <button onClick={() => setDeceasedGender('Male')} className={`group p-10 rounded-[3rem] border-4 transition-all flex flex-col items-center gap-6 relative overflow-hidden ${deceasedGender === 'Male' ? 'bg-blue-600 border-blue-400 shadow-2xl shadow-blue-200 text-white' : 'bg-white border-slate-100 hover:border-blue-200 text-slate-400'}`}>
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${deceasedGender === 'Male' ? 'bg-white text-blue-600' : 'bg-blue-50 text-blue-500'}`}>
                      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                    </div>
                    <span className="text-2xl font-black malayalam">പുരുഷൻ (Male)</span>
                  </button>
                  <button onClick={() => setDeceasedGender('Female')} className={`group p-10 rounded-[3rem] border-4 transition-all flex flex-col items-center gap-6 relative overflow-hidden ${deceasedGender === 'Female' ? 'bg-rose-500 border-rose-300 shadow-2xl shadow-rose-200 text-white' : 'bg-white border-slate-100 hover:border-rose-200 text-slate-400'}`}>
                    <div className={`w-28 h-28 rounded-full flex items-center justify-center shadow-lg transition-transform group-hover:scale-110 ${deceasedGender === 'Female' ? 'bg-white text-rose-500' : 'bg-rose-50 text-rose-500'}`}>
                      <svg className="w-16 h-16" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08s5.97 1.09 6 3.08c-1.29 1.94-3.5 3.22-6 3.22z" /></svg>
                    </div>
                    <span className="text-2xl font-black malayalam">സ്ത്രീ (Female)</span>
                  </button>
                </div>
                <div className="flex justify-between items-center pt-6">
                   <button onClick={() => setStep(AppStep.ESTATE)} className="text-slate-400 font-black hover:text-slate-600 transition-colors malayalam px-4 py-2">← പുറകോട്ട്</button>
                   <button disabled={!deceasedGender} onClick={() => setStep(AppStep.HEIRS)} className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-12 py-5 rounded-2xl font-black shadow-2xl disabled:opacity-30 transition-all active:scale-95 malayalam text-lg">അടുത്ത ഘട്ടം →</button>
                </div>
              </div>
            )}

            {step === AppStep.HEIRS && (
              <div className="space-y-10 animate-in slide-in-from-right-4 duration-500">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-l-8 border-amber-500 pl-6 py-2">
                  <div>
                    <h2 className="text-3xl font-black malayalam text-slate-800">Step 3: അവകാശികൾ</h2>
                    <p className="text-slate-500 font-bold tracking-tight">List of immediate and extended relatives</p>
                  </div>
                  <button 
                    onClick={() => setIsAddHeirModalOpen(true)}
                    className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white px-8 py-4 rounded-2xl font-black hover:scale-105 transition-all flex items-center gap-3 shadow-xl shadow-blue-200 active:scale-95"
                  >
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" /></svg>
                    <span>Add Relative</span>
                  </button>
                </div>

                {heirs.length === 0 ? (
                  <div className="bg-white p-16 rounded-[4rem] border-4 border-dashed border-slate-100 text-center space-y-6">
                    <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-200 shadow-inner">
                      <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                    </div>
                    <div>
                      <p className="text-slate-400 font-black text-xl malayalam mb-2">ആരെയും ചേർത്തിട്ടില്ല</p>
                      <p className="text-slate-300 font-medium malayalam">തുടങ്ങാൻ 'Add Relative' ബട്ടൺ അമർത്തുക</p>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {heirs.map(h => {
                      const theme = HEIR_THEMES[h.type];
                      return (
                        <div key={h.id} className={`${theme.bg} p-6 rounded-[2.5rem] border-2 ${theme.border} shadow-lg flex items-center justify-between group transform transition-all hover:scale-105 hover:shadow-xl`}>
                          <div className="flex items-center gap-5">
                            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center shadow-md ${theme.iconBg} ${theme.text}`}>
                              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                              </svg>
                            </div>
                            <div>
                              <p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-60 ${theme.text}`}>{h.type}</p>
                              <h4 className={`text-xl font-black malayalam ${theme.text}`}>{h.type}</h4>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="bg-white/60 backdrop-blur p-2 rounded-2xl flex items-center gap-4 border border-white">
                              <button 
                                onClick={() => updateHeirCount(h.id, -1)} 
                                className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-md font-black text-slate-400 hover:text-rose-500 transition-all active:scale-90"
                              >
                                -
                              </button>
                              <span className={`w-8 text-center text-xl font-black ${theme.text}`}>{h.count}</span>
                              <button 
                                onClick={() => updateHeirCount(h.id, 1)} 
                                className="w-10 h-10 rounded-xl bg-white border border-slate-100 shadow-md font-black text-slate-400 hover:text-emerald-500 transition-all active:scale-90"
                              >
                                +
                              </button>
                            </div>
                            <button 
                              onClick={() => removeHeir(h.id)} 
                              className="p-3 text-slate-300 hover:text-rose-600 transition-all hover:rotate-12"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Heir Selection Modal - Very Colorful */}
                {isAddHeirModalOpen && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300">
                    <div className="bg-white w-full max-w-3xl max-h-[85vh] rounded-[3.5rem] shadow-[0_0_100px_rgba(0,0,0,0.2)] flex flex-col overflow-hidden animate-in zoom-in-95 duration-300 border-4 border-white">
                      <header className="p-10 border-b border-slate-100 flex items-center justify-between shrink-0 bg-gradient-to-r from-slate-50 to-white">
                        <div>
                          <h3 className="text-3xl font-black text-slate-800 malayalam">അവകാശിയെ ചേർക്കുക</h3>
                          <p className="text-slate-400 font-bold text-sm tracking-tight mt-1">Select a family member to include in Faraid</p>
                        </div>
                        <button onClick={() => setIsAddHeirModalOpen(false)} className="w-12 h-12 flex items-center justify-center hover:bg-rose-50 rounded-2xl text-slate-300 hover:text-rose-500 transition-all active:scale-90">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      </header>

                      <div className="p-10 shrink-0">
                        <div className="relative group">
                          <input 
                            type="text" 
                            placeholder="ബന്ധുവിനെ തിരയുക (Search)..." 
                            value={heirSearchQuery}
                            onChange={(e) => setHeirSearchQuery(e.target.value)}
                            className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl py-5 pl-14 pr-8 focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 focus:bg-white outline-none transition-all text-lg font-bold"
                          />
                          <svg className="w-6 h-6 absolute left-5 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-emerald-500 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                        </div>
                      </div>

                      <div className="flex-1 overflow-y-auto p-10 pt-0 space-y-10 custom-scrollbar">
                        {(Object.entries(availableHeirsForDeceased) as [string, HeirType[]][]).map(([category, types]) => {
                          const filteredTypes = types.filter(t => t.toLowerCase().includes(heirSearchQuery.toLowerCase()));
                          if (filteredTypes.length === 0) return null;
                          const gradient = CATEGORY_COLORS[category];
                          
                          return (
                            <div key={category} className="space-y-5">
                              <div className="flex items-center gap-4">
                                <h4 className={`text-xs font-black bg-gradient-to-r ${gradient} bg-clip-text text-transparent uppercase tracking-[0.25em] whitespace-nowrap`}>{category}</h4>
                                <div className={`flex-1 h-px bg-gradient-to-r ${gradient.replace('from', 'to').replace('to', 'transparent')} opacity-20`} />
                              </div>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                                {filteredTypes.map(type => {
                                  const alreadyAdded = heirs.find(h => h.type === type);
                                  const max = MAX_HEIRS[type];
                                  const isMaxed = max && alreadyAdded && alreadyAdded.count >= max;
                                  const theme = HEIR_THEMES[type];
                                  
                                  return (
                                    <button 
                                      key={type} 
                                      disabled={isMaxed}
                                      onClick={() => addHeir(type as HeirType)}
                                      className={`p-5 rounded-[2rem] border-2 transition-all text-center flex flex-col items-center gap-3 active:scale-95 group relative ${
                                        isMaxed ? 'bg-slate-50 border-slate-100 opacity-40 cursor-not-allowed' : 
                                        alreadyAdded ? `${theme.bg} ${theme.border} ${theme.text} shadow-lg shadow-${theme.text.split('-')[1]}-100` : 
                                        'bg-white border-slate-100 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 hover:shadow-xl hover:shadow-emerald-50 hover:-translate-y-1'
                                      }`}
                                    >
                                      <span className="text-sm font-black malayalam">{type}</span>
                                      {alreadyAdded && (
                                        <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white rounded-full border border-current opacity-80">
                                          <div className={`w-1.5 h-1.5 rounded-full ${theme.text.replace('text', 'bg')}`} />
                                          <span className="text-[10px] font-black">{alreadyAdded.count} added</span>
                                        </div>
                                      )}
                                      {!alreadyAdded && !isMaxed && (
                                        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                                          <svg className="w-5 h-5 text-emerald-500" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-11a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V7z" clipRule="evenodd" /></svg>
                                        </div>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex justify-between items-center pt-8">
                   <button onClick={() => setDeceasedGender(null)} className="text-slate-400 font-black hover:text-slate-600 transition-all malayalam flex items-center gap-2 group">
                     <svg className="w-5 h-5 group-hover:-translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M15 19l-7-7 7-7" /></svg>
                     <span>പുറകോട്ട്</span>
                   </button>
                   <button 
                    disabled={heirs.length === 0}
                    onClick={() => setStep(AppStep.SUMMARY)} 
                    className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white px-12 py-5 rounded-2xl font-black shadow-2xl disabled:opacity-30 transition-all active:scale-95 malayalam text-lg flex items-center gap-3"
                   >
                     <span>ഫിനിഷ് (Finish)</span>
                     <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                   </button>
                </div>
              </div>
            )}

            {step === AppStep.SUMMARY && (
               <div className="space-y-10 animate-in slide-in-from-bottom-4 duration-500">
                 <div className="bg-gradient-to-br from-emerald-600 to-teal-800 border-4 border-white p-10 rounded-[4rem] flex flex-col md:flex-row md:items-center justify-between gap-8 shadow-2xl shadow-emerald-200">
                    <div className="text-white">
                       <h3 className="text-3xl font-black malayalam mb-2">വിവരങ്ങൾ റെഡിയാണ്!</h3>
                       <p className="text-white/80 font-bold tracking-tight">Generate your finalized Faraid report now.</p>
                    </div>
                    <button onClick={() => performCalculation()} disabled={isCalculating} className="bg-white text-emerald-700 px-10 py-5 rounded-3xl font-black shadow-2xl flex items-center justify-center gap-3 transition-all active:scale-95 malayalam text-xl group overflow-hidden relative">
                      {isCalculating ? (
                        <>
                          <svg className="animate-spin h-7 w-7 text-emerald-600" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span>കണക്കാക്കുന്നു...</span>
                        </>
                      ) : (
                        <>
                          <span>കണക്ക് കാണുക</span>
                          <svg className="w-7 h-7 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                        </>
                      )}
                    </button>
                 </div>

                 {calcResult && (
                   <div className="bg-white border-2 border-slate-100 p-10 rounded-[4rem] shadow-2xl animate-in zoom-in duration-700 space-y-12">
                     <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b-4 border-slate-50 pb-8">
                       <div>
                         <h2 className="text-3xl font-black text-amber-600 malayalam">അനന്തരാവകാശ റിപ്പോർട്ട്</h2>
                         <p className="text-slate-400 font-bold tracking-tighter uppercase mt-1">Islamic Inheritance Calculation</p>
                       </div>
                       <div className="flex items-center gap-6">
                         <div className="flex items-center gap-3 bg-slate-50 px-5 py-2.5 rounded-2xl border border-slate-200">
                           <span className="text-xs font-black text-slate-500 uppercase tracking-widest">Percentage</span>
                           <button 
                             onClick={() => setShowPercentage(!showPercentage)}
                             className={`w-14 h-7 rounded-full relative transition-all duration-300 ${showPercentage ? 'bg-emerald-500 ring-4 ring-emerald-500/10' : 'bg-slate-300'}`}
                           >
                             <div className={`absolute top-1 w-5 h-5 bg-white rounded-full shadow-md transition-all duration-300 ${showPercentage ? 'left-8' : 'left-1'}`} />
                           </button>
                         </div>
                         <div className={`px-6 py-2.5 rounded-2xl text-sm font-black tracking-widest ${calcResult.validation === 'valid' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-100' : 'bg-rose-500 text-white shadow-lg shadow-rose-100'}`}>
                           {calcResult.validation.toUpperCase()}
                         </div>
                       </div>
                     </div>

                     {calcResult.validation === 'invalid' ? (
                       <div className="p-10 bg-rose-50 text-rose-600 rounded-[3rem] malayalam border-4 border-rose-100 flex items-center gap-6">
                         <div className="w-16 h-16 bg-rose-100 rounded-full flex items-center justify-center shrink-0">
                           <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                         </div>
                         <div>
                           <p className="text-xl font-black mb-1">പിശക് (Error)</p>
                           <p className="text-lg font-medium">{calcResult.reason}</p>
                         </div>
                       </div>
                     ) : (
                       <>
                         {calcResult.excluded_heirs && calcResult.excluded_heirs.length > 0 && (
                           <div className="p-8 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-rose-500/5 rounded-full -mr-8 -mt-8 blur-2xl" />
                             <h4 className="text-[10px] font-black text-rose-400 uppercase tracking-[0.3em] mb-4 malayalam">ഒഴിവാക്കപ്പെട്ടവർ (Blocked)</h4>
                             <div className="flex flex-wrap gap-3">
                               {calcResult.excluded_heirs.map(heir => (
                                 <span key={heir} className="px-5 py-2 bg-white text-rose-600 text-sm font-black rounded-2xl border-2 border-rose-100 shadow-sm">{heir}</span>
                               ))}
                             </div>
                           </div>
                         )}

                         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                           {Object.entries(calcResult.shares).map(([heir, share]) => {
                             const numericValue = getNumericShare(heir, calcResult);
                             const percentage = (numericValue * 100).toFixed(2);
                             const theme = (HEIR_THEMES as any)[heir] || HEIR_THEMES['Nephew'];
                             
                             return (
                               <div key={heir} className={`${theme.bg} p-8 rounded-[3.5rem] border-4 ${theme.border} flex flex-col justify-between group hover:scale-105 transition-all shadow-xl hover:shadow-2xl relative overflow-hidden`}>
                                 <div className="flex justify-between items-start mb-6">
                                   <div>
                                     <p className={`text-[10px] font-black uppercase tracking-[0.25em] mb-1 opacity-60 ${theme.text}`}>{heir}</p>
                                     <p className={`text-2xl font-black malayalam capitalize ${theme.text}`}>{heir}</p>
                                   </div>
                                   <div className={`p-3 rounded-2xl ${theme.iconBg} ${theme.text} shadow-inner`}>
                                     <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                   </div>
                                 </div>
                                 <div className="flex items-end justify-between border-t border-black/5 pt-6">
                                   <div className="space-y-1">
                                      <p className={`text-4xl font-serif font-black ${theme.text}`}>
                                        {showPercentage ? `${percentage}%` : String(share)}
                                      </p>
                                      {!showPercentage && (
                                        <p className="text-xs font-black opacity-40 uppercase tracking-widest">{percentage}% share</p>
                                      )}
                                   </div>
                                   {netEstate > 0 && (
                                     <div className="text-right">
                                       <p className={`text-[10px] font-black uppercase tracking-widest opacity-40 ${theme.text}`}>Amount</p>
                                       <p className={`text-xl font-black ${theme.text}`}>₹{(numericValue * netEstate).toLocaleString()}</p>
                                     </div>
                                   )}
                                 </div>
                               </div>
                             );
                           })}
                         </div>

                         <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                           <div className="p-10 bg-gradient-to-br from-amber-50 to-orange-50 rounded-[3.5rem] border-4 border-amber-100 shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 left-0 w-24 h-24 bg-amber-200/20 rounded-full -ml-12 -mt-12 blur-3xl" />
                             <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-lg shadow-amber-200">
                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 7h6m0 10v-3m-3 3h.01M9 17h.01M9 14h.01M12 14h.01M15 11h.01M12 11h.01M9 11h.01M7 21h10a2 2 0 002-2V5a2 2 0 00-2-2H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                </div>
                                <h4 className="text-xs font-black text-amber-700 uppercase tracking-[0.25em] malayalam">കണക്ക് വിവരങ്ങൾ (Math)</h4>
                             </div>
                             <p className="text-2xl font-serif text-amber-900 leading-loose whitespace-pre-line font-medium arabic" dir="rtl">{calcResult.fraction_math}</p>
                           </div>

                           <div className="p-10 bg-gradient-to-br from-slate-50 to-emerald-50 rounded-[3.5rem] border-4 border-emerald-100 shadow-xl relative overflow-hidden">
                             <div className="absolute top-0 right-0 w-24 h-24 bg-emerald-200/20 rounded-full -mr-12 -mt-12 blur-3xl" />
                             <div className="flex items-center gap-4 mb-6">
                                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-200">
                                  <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
                                </div>
                                <h4 className="text-xs font-black text-emerald-700 uppercase tracking-[0.25em] malayalam">വിശദീകരണം (Notes)</h4>
                             </div>
                             <p className="text-lg text-slate-700 leading-relaxed malayalam font-medium">{calcResult.distribution_notes}</p>
                           </div>
                         </div>
                       </>
                     )}
                   </div>
                 )}

                 <div className="bg-white border-2 border-slate-100 p-10 rounded-[4rem] space-y-8 shadow-2xl relative overflow-hidden">
                   <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-emerald-500 via-amber-500 to-rose-500" />
                   <div className="flex items-center justify-between">
                     <h4 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">AI Support Counselor</h4>
                     <div className="flex gap-2">
                        <div className="w-3 h-3 rounded-full bg-rose-400" />
                        <div className="w-3 h-3 rounded-full bg-amber-400" />
                        <div className="w-3 h-3 rounded-full bg-emerald-400" />
                     </div>
                   </div>
                   
                   <div ref={scrollRef} className="h-[400px] overflow-y-auto space-y-6 pr-4 custom-scrollbar">
                      {messages.map((msg, i) => (
                        <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                           <div className={`max-w-[85%] p-6 rounded-[2.5rem] shadow-md ${msg.role === 'user' ? 'bg-gradient-to-br from-emerald-500 to-teal-700 text-white rounded-tr-none' : 'bg-slate-50 text-slate-800 rounded-tl-none border border-slate-200'}`}>
                              <p className="text-lg malayalam whitespace-pre-wrap font-medium leading-relaxed">{msg.text}</p>
                              <p className={`text-[10px] mt-3 font-black uppercase tracking-tighter ${msg.role === 'user' ? 'text-white/50' : 'text-slate-400'}`}>
                                {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </p>
                           </div>
                        </div>
                      ))}
                   </div>
                   
                   <div className="relative group">
                      <div className="absolute -inset-1 bg-gradient-to-r from-emerald-500 to-teal-600 rounded-[2.5rem] blur opacity-25 group-focus-within:opacity-50 transition-opacity" />
                      <div className="relative flex items-center bg-white rounded-[2.5rem] border-2 border-slate-100 overflow-hidden shadow-inner">
                        <textarea 
                          value={input} 
                          onChange={e => setInput(e.target.value)} 
                          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleChat())} 
                          placeholder="ചോദിക്കൂ... (Ask anything about Faraid)" 
                          className="w-full bg-transparent py-6 pl-8 pr-20 focus:outline-none resize-none h-20 text-lg font-medium" 
                        />
                        <button 
                          onClick={handleChat} 
                          className="absolute right-4 top-1/2 -translate-y-1/2 w-14 h-14 bg-emerald-600 text-white rounded-2xl shadow-xl hover:bg-emerald-700 transition-all active:scale-90 flex items-center justify-center group/btn"
                        >
                          <svg className="w-8 h-8 group-hover/btn:rotate-12 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                        </button>
                      </div>
                   </div>
                 </div>
               </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
};

export default App;