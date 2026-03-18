import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDateRange(range: string) {
  if (!range) return '';
  if (range === 'WeeklyShareHolding_Update4') return '20-Feb-26 vs 27-Feb-26';

  // Handle the format: 12-19-2025-12-26-2025
  const parts = range.split('-');
  if (parts.length === 6) {
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const d1 = `${parts[1]}-${months[parseInt(parts[0]) - 1]}-${parts[2].slice(-2)}`;
    const d2 = `${parts[4]}-${months[parseInt(parts[3]) - 1]}-${parts[5].slice(-2)}`;
    return `${d1} vs ${d2}`;
  }
  return range;
}

export function formatName(name: string) {
  if (!name || name === '—' || name === 'Unknown') return name;
  
  // List of abbreviations that should ALWAYS remain uppercase
  const ABBREVIATIONS = new Set([
    'GQG', 'FII', 'FPI', 'SWF', 'MF', 'SBI', 'LIC', 'HSBC', 'SEBI', 'DII', 
    'AIF', 'PF', 'EPS', 'ETF', 'PLC', 'ADR', 'GDR', 'NSE', 'BSE', 'USA', 
    'UK', 'JP', 'FR', 'DE', 'EU', 'UCITS', 'SICAV', 'P-NOTE', 'P-NOTE', 'EM',
    'FTSE', 'MSC', 'MSCI', 'ETFS', 'UTI', 'HDFC', 'ICICI', 'ABSL', 'IDFC',
    'AUT', 'A/C', 'AIA', 'BP', 'CP', 'GP', 'LP', 'LLP', 'SPV'
  ]);

  return name
    .split(' ')
    .map((word) => {
      if (word.length === 0) return '';
      
      // Remove surrounding punctuation for abbreviation check (like brackets or quotes)
      const cleanWord = word.replace(/[^a-zA-Z0-9\-\/]/g, '').toUpperCase();
      
      if (ABBREVIATIONS.has(cleanWord)) {
        return word.toUpperCase();
      }

      // Special case: Starts with a bracket but has an alpha
      // Handle words like "(INCL." -> "(Incl." or "(GQG" -> "(GQG"
      const firstAlphaIndex = word.search(/[a-zA-Z]/);
      if (firstAlphaIndex !== -1) {
        const prefix = word.substring(0, firstAlphaIndex);
        const core = word.substring(firstAlphaIndex);
        
        // Check if the alpha part is an abbreviation
        const alphaClean = core.replace(/[^a-zA-Z0-9\-\/]/g, '').toUpperCase();
        if (ABBREVIATIONS.has(alphaClean)) {
           return prefix + core.toUpperCase();
        }

        return prefix + core.charAt(0).toUpperCase() + core.substring(1).toLowerCase();
      }

      return word.toLowerCase();
    })
    .join(' ')
    .trim();
}

