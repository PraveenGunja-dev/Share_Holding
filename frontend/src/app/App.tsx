import { useState, useEffect, useRef } from 'react';
import { useAuth } from './context/AuthContext';
import { LoginPage } from './components/LoginPage';
import { LandingPage } from './components/LandingPage';
import { DashboardHeader } from './components/DashboardHeader';
import { Sidebar } from './components/Sidebar';
import { CategoryMovement } from './components/CategoryMovement';
import { InstitutionalHolders } from './components/InstitutionalHolders';
import { TopBuyers } from './components/TopBuyers';
import { TopSellers } from './components/TopSellers';
import { NewEntriesExits } from './components/NewEntriesExits';
import { TopFIIs } from './components/TopFIIs';
import { TopMutualFunds } from './components/TopMutualFunds';
import { TopInsurancePFs } from './components/TopInsurancePFs';
import { TopAIFs } from './components/TopAIFs';
import { SharePriceMovement } from './components/SharePriceMovement';
import { BondYieldMovement } from './components/BondYieldMovement';
import { DashboardFooter } from './components/DashboardFooter';
import { ScrollArea } from './components/ui/scroll-area';
import { ReportsPage } from './components/ReportsPage';
import './table-overrides.css';
// Note: keep this component focused on routing/state; do not auto-recover dashboard data on refresh.

type AppScreen = 'login' | 'landing' | 'dashboard' | 'reports';

const sectionIds = ['institutional', 'buyers', 'sellers', 'entries', 'fiis', 'mutualfunds', 'insurance', 'aifs'];

export default function App() {
  const { isLoggedIn } = useAuth();

  // Always skip login page and go straight to landing
  const [screen, setScreen] = useState<AppScreen>(() => {
    const saved = localStorage.getItem('app_screen');
    return (saved as AppScreen) || 'landing';
  });
  const [selectedBU, setSelectedBU] = useState(() => {
    return localStorage.getItem('selected_bu') || '';
  });
  const [selectedBUId, setSelectedBUId] = useState<number | undefined>(() => {
    const saved = localStorage.getItem('selected_bu_id');
    if (!saved) return undefined;
    const parsed = parseInt(saved, 10);
    return Number.isFinite(parsed) ? parsed : undefined;
  });
  const isDashboardDataReady =
    typeof selectedBUId === "number" && Number.isFinite(selectedBUId);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Dashboard state
  const [activeSection, setActiveSection] = useState(() => {
    return localStorage.getItem('active_section') || 'institutional';
  });
  const [dateRange, setDateRange] = useState(() => {
    return localStorage.getItem('date_range') || '';
  });
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [topN, setTopN] = useState(() => {
    const saved = localStorage.getItem('top_n');
    return saved ? parseInt(saved, 10) : 15;
  });
  const [metricView, setMetricView] = useState(() => {
    return localStorage.getItem('metric_view') || 'all';
  });
  const [mfView, setMfView] = useState(() => {
    return localStorage.getItem('mf_view') || 'all';
  });
  /** Incremented each time user confirms a BU on the landing page — scroll dashboard to first section */
  const [buSessionKey, setBuSessionKey] = useState(0);
  const isScrollingRef = useRef(false);

  // Persist state to localStorage
  useEffect(() => {
    localStorage.setItem('app_screen', screen);
    localStorage.setItem('selected_bu', selectedBU);
    localStorage.setItem('active_section', activeSection);
    localStorage.setItem('date_range', dateRange);
    localStorage.setItem('top_n', topN.toString());
    localStorage.setItem('metric_view', metricView);
    localStorage.setItem('mf_view', mfView);
    if (typeof selectedBUId === 'number' && Number.isFinite(selectedBUId)) {
      localStorage.setItem('selected_bu_id', selectedBUId.toString());
    } else {
      localStorage.removeItem('selected_bu_id');
    }
  }, [screen, selectedBU, selectedBUId, activeSection, dateRange, topN, metricView, mfView]);

  // After choosing a BU on the landing page, scroll dashboard to the first section (viewport top + institutional)
  useEffect(() => {
    if (screen !== 'dashboard' || buSessionKey === 0) return;

    isScrollingRef.current = true;
    const raf = requestAnimationFrame(() => {
      const viewport = document.querySelector(
        '[data-slot="scroll-area-viewport"]',
      ) as HTMLElement | null;
      if (viewport) viewport.scrollTop = 0;
      document.getElementById('institutional')?.scrollIntoView({ behavior: 'auto', block: 'start' });
      window.setTimeout(() => {
        isScrollingRef.current = false;
      }, 900);
    });
    return () => cancelAnimationFrame(raf);
  }, [buSessionKey, screen]);

  // Restore scroll position after refresh or when switching back to dashboard (e.g. Reports)
  useEffect(() => {
    if (screen === 'dashboard' && activeSection) {
      const timer = setTimeout(() => {
        const element = document.getElementById(activeSection);
        if (element) {
          element.scrollIntoView({ behavior: 'auto', block: 'start' });
        }
      }, 800); // Give some time for components to load
      return () => clearTimeout(timer);
    }
  }, [screen]);

  const handleBUSubmit = (buId: number, buName: string) => {
    setSelectedBU(buName);
    setSelectedBUId(buId);
    setSelectedCategories([]); // This means "All" by default
    setDateRange(''); // Header will set latest available
    setAvailableCategories([]);
    setActiveSection('institutional'); // start from first dashboard section
    setBuSessionKey((k) => k + 1);
    setScreen('dashboard');
  };

  const scrollToSection = (sectionId: string) => {
    if (sectionId === 'reports') {
      setScreen('reports');
      setActiveSection('reports');
      return;
    }

    if (screen !== 'dashboard') {
      setScreen('dashboard');
    }

    isScrollingRef.current = true;
    setActiveSection(sectionId);
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
      // Allow observer to take over again after smooth scroll finishes
      setTimeout(() => { isScrollingRef.current = false; }, 1000);
    }
  };

  // Intersection Observer — track which section is in view
  useEffect(() => {
    if (screen !== 'dashboard') return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (isScrollingRef.current) return; // skip during programmatic scroll
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        }
      },
      {
        rootMargin: '-20% 0px -60% 0px', // trigger when section is in top 20-40% of viewport
        threshold: 0,
      }
    );

    // Small delay to let DOM render
    const timer = setTimeout(() => {
      sectionIds.forEach((id) => {
        const el = document.getElementById(id);
        if (el) observer.observe(el);
      });
    }, 500);

    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [screen]);

  // DashboardHeader handles fetching available categories and updating the state via onAvailableCategoriesChange
  // No need to fetch date ranges here and overwrite categories state erroneously.

  if (screen === 'login') {
    return (
      <LoginPage
        onLoginSuccess={() => setScreen('landing')}
        onSkip={() => setScreen('landing')}
      />
    );
  }

  if (screen === 'landing') {
    return <LandingPage onSubmit={handleBUSubmit} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      <DashboardHeader
        selectedBU={selectedBU}
        selectedBUId={selectedBUId}
        dateRange={dateRange}
        onDateRangeChange={setDateRange}
        selectedCategories={selectedCategories}
        onCategoriesChange={setSelectedCategories}
        availableCategories={availableCategories}
        onAvailableCategoriesChange={setAvailableCategories}
        topN={topN}
        onTopNChange={setTopN}
        metricView={metricView}
        onMetricViewChange={setMetricView}
        mfView={mfView}
        onMfViewChange={setMfView}
        onHomeClick={() => setScreen('landing')}
      />

      <div className="flex-1 flex overflow-hidden relative">
        <aside className="hidden lg:flex shrink-0">
          <Sidebar activeSection={activeSection} onSectionChange={scrollToSection} />
        </aside>

        <ScrollArea className="flex-1 bg-background transition-colors duration-300 min-w-0">
          <div className="flex flex-col min-h-[calc(100vh-80px)] relative min-w-0">
            {/* Subtle background overlay */}
            <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1] pointer-events-none"
              style={{ backgroundImage: 'radial-gradient(var(--foreground) 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

            <main className="flex-1 relative z-10 w-full overflow-x-auto p-3 md:p-4 lg:p-5 space-y-4 md:space-y-6 max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto">
              {screen === 'dashboard' ? (
                <>
                  {!isDashboardDataReady ? (
                    // On refresh, if BU id is not available, show an empty dashboard area.
                    // This prevents child components from mounting with incomplete params and showing loaders.
                    <div className="min-h-[400px]" />
                  ) : (
                    <div className="flex flex-col gap-8 md:gap-10">
                  {/* 1. Category Movement - Disabled for now as data is unavailable */}
                  {/* <section id="category">
                    <CategoryMovement
                      selectedCategories={selectedCategories}
                      metricView={metricView}
                      dateRange={dateRange}
                    />
                  </section> */}

                  {/* 2. Institutional Holders */}
                  {mfView === 'all' && (
                    <section id="institutional" className="scroll-mt-[140px]">
                      <InstitutionalHolders
                        selectedCategories={selectedCategories}
                        availableCategories={availableCategories}
                        topN={topN}
                        metricView={metricView}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 3. Buyers */}
                  {mfView === 'all' && (
                    <section id="buyers" className="scroll-mt-[140px]">
                      <TopBuyers
                        selectedCategories={selectedCategories}
                        topN={topN}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 4. Sellers */}
                  {mfView === 'all' && (
                    <section id="sellers" className="scroll-mt-[140px]">
                      <TopSellers
                        selectedCategories={selectedCategories}
                        topN={topN}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 5. New Entries & Exits */}
                  {mfView === 'all' && (
                    <section id="entries" className="scroll-mt-[140px]">
                      <NewEntriesExits
                        selectedCategories={selectedCategories}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 6. FIIs & FPIs */}
                  {mfView === 'all' && (selectedCategories.length === 0 || selectedCategories.some(c => c.includes('FII') || c.includes('FPI'))) && (
                    <section id="fiis" className="scroll-mt-[140px]">
                      <TopFIIs
                        topN={topN}
                        metricView={metricView}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 7. Mutual Funds */}
                  {(selectedCategories.length === 0 || selectedCategories.some(c => c.includes('Mutual Funds') || c.includes('MF'))) && (
                    <section id="mutualfunds" className="scroll-mt-[140px]">
                      <TopMutualFunds
                        topN={topN}
                        metricView={metricView}
                        mfView={mfView}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 8. Insurance & PFs */}
                  {mfView === 'all' && (selectedCategories.length === 0 || selectedCategories.some(c => c.includes('Insurance') || c.includes('PF') || c.includes('Provident'))) && (
                    <section id="insurance" className="scroll-mt-[140px]">
                      <TopInsurancePFs
                        topN={topN}
                        metricView={metricView}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}

                  {/* 9. AIFs */}
                  {mfView === 'all' && (selectedCategories.length === 0 || selectedCategories.some(c => c.includes('AIF'))) && (
                    <section id="aifs" className="scroll-mt-[140px]">
                      <TopAIFs
                        topN={topN}
                        metricView={metricView}
                        dateRange={dateRange}
                        buId={selectedBUId}
                      />
                    </section>
                  )}
                    </div>
                  )}
                </>
              ) : (
                <ReportsPage dateRange={dateRange} buId={selectedBUId} />
              )}
            </main>
            <DashboardFooter buName={selectedBU || undefined} />
          </div>
        </ScrollArea>
      </div>
    </div>
  );
}