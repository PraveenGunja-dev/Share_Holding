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
import { getDateRanges } from './services/api';

type AppScreen = 'login' | 'landing' | 'dashboard' | 'reports';

const sectionIds = ['institutional', 'buyers', 'sellers', 'entries', 'fiis', 'mutualfunds', 'insurance', 'aifs'];

export default function App() {
  const { isLoggedIn } = useAuth();

  // Always skip login page and go straight to landing
  const [screen, setScreen] = useState<AppScreen>('landing');
  const [selectedBU, setSelectedBU] = useState('');
  const [selectedBUId, setSelectedBUId] = useState<number | undefined>(undefined);
  const [availableCategories, setAvailableCategories] = useState<string[]>([]);

  // Dashboard state
  const [activeSection, setActiveSection] = useState('institutional');
  const [dateRange, setDateRange] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [topN, setTopN] = useState(15);
  const [metricView, setMetricView] = useState('all');
  const [mfView, setMfView] = useState('all');
  const isScrollingRef = useRef(false);

  const handleBUSubmit = (buId: number, buName: string) => {
    setSelectedBU(buName);
    setSelectedBUId(buId);
    setSelectedCategories([]); // This means "All" by default
    setDateRange(''); // Header will set latest available
    setAvailableCategories([]);
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

        <ScrollArea className="flex-1 bg-background transition-colors duration-300">
          {/* Subtle background overlay */}
          <div className="absolute inset-0 opacity-[0.4] dark:opacity-[0.1] pointer-events-none"
            style={{ backgroundImage: 'radial-gradient(var(--foreground) 0.5px, transparent 0.5px)', backgroundSize: '32px 32px' }} />

          <main className={`relative z-10 w-full overflow-x-clip ${screen === 'reports' ? '' : 'p-3 md:p-4 lg:p-5 space-y-4 md:space-y-6 max-w-[1280px] xl:max-w-[1440px] 2xl:max-w-[1536px] mx-auto'}`}>
            {screen === 'dashboard' ? (
              <>
                {/* 1. Category Movement - Disabled for now as data is unavailable */}
                {/* <section id="category">
                  <CategoryMovement
                    selectedCategories={selectedCategories}
                    metricView={metricView}
                    dateRange={dateRange}
                  />
                </section> */}

                {/* 2. Institutional Holders */}
                <section id="institutional">
                  <InstitutionalHolders
                    selectedCategories={selectedCategories}
                    availableCategories={availableCategories}
                    topN={topN}
                    metricView={metricView}
                    dateRange={dateRange}
                    buId={selectedBUId}
                  />
                </section>

                {/* 3. Buyers */}
                <section id="buyers">
                  <TopBuyers
                    selectedCategories={selectedCategories}
                    topN={topN}
                    dateRange={dateRange}
                    buId={selectedBUId}
                  />
                </section>

                {/* 4. Sellers */}
                <section id="sellers">
                  <TopSellers
                    selectedCategories={selectedCategories}
                    topN={topN}
                    dateRange={dateRange}
                    buId={selectedBUId}
                  />
                </section>

                {/* 5. New Entries & Exits */}
                <section id="entries">
                  <NewEntriesExits
                    selectedCategories={selectedCategories}
                    dateRange={dateRange}
                    buId={selectedBUId}
                  />
                </section>

                {/* 6. FIIs & FPIs */}
                {(selectedCategories.length === 0 || selectedCategories.some(c => c.includes('FII') || c.includes('FPI'))) && (
                  <section id="fiis">
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
                  <section id="mutualfunds">
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
                {(selectedCategories.length === 0 || selectedCategories.some(c => c.includes('Insurance') || c.includes('PF') || c.includes('Provident'))) && (
                  <section id="insurance">
                    <TopInsurancePFs
                      topN={topN}
                      metricView={metricView}
                      dateRange={dateRange}
                      buId={selectedBUId}
                    />
                  </section>
                )}

                {/* 9. AIFs */}
                {(selectedCategories.length === 0 || selectedCategories.some(c => c.includes('AIF'))) && (
                  <section id="aifs">
                    <TopAIFs
                      topN={topN}
                      metricView={metricView}
                      dateRange={dateRange}
                      buId={selectedBUId}
                    />
                  </section>
                )}
              </>
            ) : (
              <ReportsPage dateRange={dateRange} buId={selectedBUId} />
            )}
          </main>
          <DashboardFooter />
        </ScrollArea>
      </div>
    </div>
  );
}