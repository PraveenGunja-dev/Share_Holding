export const CATEGORIES = [
    'Promoter',
    'FII/FPI',
    'MF',
    'Insurance',
    'PF',
    'AIF',
    'SWF',
    'Non-Institution'
];

export const CATEGORY_MAP: Record<string, string> = {
    'Promoters': 'Promoter',
    'Mutual Funds': 'MF',
    'Provident Fund': 'PF',
    'FII/FPI': 'FII/FPI',
    'Insurance': 'Insurance',
    'AIF': 'AIF',
    'SWF': 'SWF',
    'Non-Institution': 'Non-Institution'
};

export const REVERSE_CATEGORY_MAP: Record<string, string> = {
    'Promoter': 'Promoters',
    'MF': 'Mutual Funds',
    'PF': 'Provident Fund',
    'FII/FPI': 'FII/FPI',
    'Insurance': 'Insurance',
    'AIF': 'AIF',
    'SWF': 'SWF',
    'Non-Institution': 'Non-Institution'
};

// Initial empty states for real data injection
export const kpiData: any[] = [];
export const categoryMovementData: any[] = [];
export const shareholderData: any[] = [];
export const newEntries: any[] = [];
export const exits: any[] = [];
