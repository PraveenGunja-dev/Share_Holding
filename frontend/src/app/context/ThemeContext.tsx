import React, { createContext, useContext, useEffect, useState } from 'react';

type Theme = 'light' | 'dark';

interface ThemeContextType {
    theme: Theme;
    toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
    const [theme, setTheme] = useState<Theme>(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem('theme') as Theme;
            if (saved) return saved;
            return 'dark';
        }
        return 'dark';
    });

    useEffect(() => {
        const root = window.document.documentElement;
        root.classList.remove('light', 'dark');
        root.classList.add(theme);
        localStorage.setItem('theme', theme);
      // #region agent log
      fetch('http://127.0.0.1:7530/ingest/52f209d2-7edd-4cf5-b122-cb80a387b1cb',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'8302a7'},body:JSON.stringify({sessionId:'8302a7',location:'ThemeContext.tsx:22',message:'theme class applied',data:{theme,htmlClass:root.className,hasDark:root.classList.contains('dark')},timestamp:Date.now()} )}).catch(()=>{});
      // #endregion
    }, [theme]);

    const toggleTheme = () => {
        setTheme(prev => (prev === 'light' ? 'dark' : 'light'));
    };

    return (
        <ThemeContext.Provider value={{ theme, toggleTheme }}>
            {children}
        </ThemeContext.Provider>
    );
}

export function useTheme() {
    const context = useContext(ThemeContext);
    if (context === undefined) {
        throw new Error('useTheme must be used within a ThemeProvider');
    }
    return context;
}
