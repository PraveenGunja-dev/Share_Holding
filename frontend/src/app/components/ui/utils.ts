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
  return name
    .split(' ')
    .map((word) => {
      // Keep things like (P-Note), (incl. etc if they have leading punctuation by just lowercasing the word, but we usually upper the first letter
      if (word.length === 0) return '';
      // Let's grab the first alpha character to capitalize it and lower the rest
      const match = word.match(/[a-zA-Z]/);
      if (match && match.index !== undefined) {
         const idx = match.index;
         return word.substring(0, idx) + word[idx].toUpperCase() + word.substring(idx + 1).toLowerCase();
      }
      return word.toLowerCase();
    })
    .join(' ')
    .trim();
}
