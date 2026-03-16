export const CATEGORY_COLORS: Record<string, string> = {
    'Promoter': '#00205B',        // Adani Navy
    'FII': '#007FB1',             // Adani Cyan
    'FPI': '#005072',             // Deep Ocean Blue
    'DII-MF': '#A1005B',          // Adani Burgundy/Plum
    'DII-Insurance': '#00827F',   // Adani Teal/Green
    'DII-IF': '#7B2E76',          // Royal Purple
    'DII-AIF': '#B11B58',         // Vibrant Berry
    'FI': '#B7912B',              // Corporate Gold
    'DII-PMS': '#3E617A',         // Slate Professional
    'SWF': '#00A1E4',             // Bright Sky Blue
    'DII-PF': '#442E5D',          // Deep Corporate Violet
    'Non-Institution': '#2D2926', // Charcoal Gray
    'Others': '#6B6D70'           // Muted Corporate Gray
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
