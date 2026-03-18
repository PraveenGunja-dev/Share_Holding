export const CATEGORY_COLORS: Record<string, string> = {
    'Promoter': '#00205B',        // Adani Navy
    'FII': '#0088CC',             // Cerulean Blue
    'FPI': '#E91E63',             // Vibrant Magenta
    'DII-MF': '#00897B',          // Emerald Teal
    'DII-Insurance': '#F59E0B',   // Amber Gold
    'DII-IF': '#7B1FA2',          // Deep Purple
    'DII-AIF': '#EF5350',         // Coral Red
    'FI': '#FF6D00',              // Tangerine Orange
    'DII-PMS': '#0097A7',         // Bright Cyan
    'SWF': '#43A047',             // Fresh Green
    'DII-PF': '#C62828',          // Crimson
    'Non-Institution': '#5C6BC0', // Indigo
    'Others': '#78909C'           // Cool Steel
};

export const getCategoryColor = (category: string) => {
    // Exact match first
    if (CATEGORY_COLORS[category]) return CATEGORY_COLORS[category];

    // Fuzzy matching for different naming conventions in DB
    const cat = category.toUpperCase();
    if (cat.includes('PROMOTER')) return CATEGORY_COLORS['Promoter'];
    if (cat.includes('FII')) return CATEGORY_COLORS['FII'];
    if (cat.includes('FPI')) return CATEGORY_COLORS['FPI'];
    if (cat.includes('MF') || cat.includes('MUTUAL FUND')) return CATEGORY_COLORS['DII-MF'];
    if (cat.includes('INSURANCE')) return CATEGORY_COLORS['DII-Insurance'];
    if (cat.includes('AIF')) return CATEGORY_COLORS['DII-AIF'];
    if (cat.includes('PF') || cat.includes('PROVIDENT')) return CATEGORY_COLORS['DII-PF'];
    if (cat.includes('IF') && cat.includes('DII')) return CATEGORY_COLORS['DII-IF'];
    if (cat.includes('PMS')) return CATEGORY_COLORS['DII-PMS'];
    if (cat.includes('SWF') || cat.includes('SOVEREIGN')) return CATEGORY_COLORS['SWF'];
    if (cat.includes('FI') && !cat.includes('FII')) return CATEGORY_COLORS['FI'];
    if (cat.includes('NON-INSTITUTION')) return CATEGORY_COLORS['Non-Institution'];

    return CATEGORY_COLORS['Others'];
};
