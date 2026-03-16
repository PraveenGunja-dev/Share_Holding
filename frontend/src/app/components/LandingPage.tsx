import { useState, useEffect } from 'react';
import { Button } from './ui/button';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './ui/select';
import logoImage from '../../../public/assets/logo.webp';
import { getBusinessUnits } from '../services/api';

interface BusinessUnit {
  bu_id: number;
  bu_name: string;
}

interface LandingPageProps {
  onSubmit: (buId: number, buName: string) => void;
}

export function LandingPage({ onSubmit }: LandingPageProps) {
  const [selectedBU, setSelectedBU] = useState<string>('');
  const [businessUnits, setBusinessUnits] = useState<BusinessUnit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchBUs() {
      try {
        const data = await getBusinessUnits();
        if (Array.isArray(data)) {
          setBusinessUnits(data);
        }
      } catch (e) {
        console.error('Failed to fetch business units:', e);
      } finally {
        setLoading(false);
      }
    }
    fetchBUs();
  }, []);

  const handleSubmit = () => {
    if (selectedBU) {
      const buId = parseInt(selectedBU);
      const bu = businessUnits.find(b => b.bu_id === buId);
      onSubmit(buId, bu?.bu_name || '');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-50 dark:bg-slate-950">
      {/* Main content card */}
      <div className="relative w-full max-w-lg">
        {/* Glassmorphism card */}
        <div className="relative bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          {/* Top gradient border */}
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-[#00205B] via-[#00A3E0] to-[#00205B]" />
          
          <div className="p-10 md:p-14">
            {/* Logo and Header Section */}
            <div className="flex flex-col items-center mb-10">
              {/* Logo with subtle shadow */}
              <div className="relative mb-6">
                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-lg border border-slate-100 dark:border-slate-700">
                  <img src={logoImage} alt="Adani Renewables" className="h-12 object-contain" />
                </div>
              </div>
              
              {/* App Name */}
              <h1 className="text-3xl md:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-[#00205B] to-[#00A3E0] dark:from-sky-400 dark:to-cyan-300 tracking-tight text-center">
                Shareholding Pattern
              </h1>
            </div>

            {/* Form Section */}
            <div className="space-y-6">
              {/* Business Unit Selection */}
              <div className="space-y-3">
                <Select value={selectedBU} onValueChange={setSelectedBU}>
                  <SelectTrigger
                    className="w-full h-14 bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-2xl px-6 text-base font-bold text-primary dark:text-foreground focus:ring-2 focus:ring-[#00A3E0]/30 focus:border-[#00A3E0] transition-all duration-300 hover:border-[#00A3E0]/50"
                  >
                    <SelectValue 
                      placeholder={
                        loading ? (
                          <span className="flex items-center gap-2">
                            <span className="w-2 h-2 bg-[#00A3E0] rounded-full animate-pulse" />
                            Loading...
                          </span>
                        ) : (
                          "Select Business Unit"
                        )
                      } 
                    />
                  </SelectTrigger>
                  <SelectContent 
                    position="popper" 
                    side="bottom"
                    sideOffset={8}
                    avoidCollisions={true}
                    className="max-h-[300px] overflow-hidden rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-200 dark:border-slate-700 shadow-xl animate-in fade-in slide-in-from-top-2 duration-300 z-[100]"
                  >
                    <div className="p-3 overflow-y-auto custom-scrollbar max-h-[300px] scroll-smooth">
                      <SelectGroup>
                        {businessUnits
                          .sort((a, b) => a.bu_id - b.bu_id)
                          .map((bu) => (
                            <SelectItem
                              key={bu.bu_id}
                              value={String(bu.bu_id)}
                              className="py-3 px-4 mb-1 font-bold text-base text-[#00205B] dark:text-sky-300 focus:bg-[#00A3E0]/10 focus:text-[#00205B] dark:focus:bg-sky-500/15 dark:focus:text-sky-200 cursor-pointer rounded-xl transition-all duration-200"
                            >
                              {bu.bu_name}
                            </SelectItem>
                          ))}
                      </SelectGroup>
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Submit Button */}
              <Button
                onClick={handleSubmit}
                disabled={!selectedBU || loading}
                className="w-full h-14 bg-gradient-to-r from-[#00205B] to-[#00A3E0] hover:from-[#00205B]/90 hover:to-[#00A3E0]/90 text-white font-black text-base uppercase tracking-widest rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
              >
                Access Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}