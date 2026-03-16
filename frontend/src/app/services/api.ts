import axios from 'axios';

const API_BASE_URL = (import.meta.env.VITE_API_URL || '/shareholding-pattern/api').replace(/\/$/, '') + '/';

const api = axios.create({
    baseURL: API_BASE_URL,
});

// Response interceptor to ensure every response is always an array
api.interceptors.response.use(
    (response) => {
        // If the response is already an array, return it
        if (Array.isArray(response.data)) {
            return response;
        }
        return response;
    },
    (error) => {
        console.error('API Error:', error);
        // On error, return an empty array in the response data structure
        return Promise.resolve({ data: [] });
    }
);

// Helper to build query params with optional bu_id and date_range
const getParams = (buId?: number, dateRange?: string) => {
    const params = new URLSearchParams();
    if (buId !== undefined && buId !== null) params.append('bu_id', buId.toString());
    if (dateRange && dateRange !== 'latest' && dateRange !== '') {
        params.append('date_range', dateRange);
    }
    const qs = params.toString();
    return qs ? `?${qs}` : '';
};

// ─── NEW: Fetch all business units ──────────────────────────────────
export const getBusinessUnits = async () => {
    const response = await api.get('business-units');
    return response.data;
};

// ─── NEW: Fetch date ranges for a given BU ──────────────────────────
export const getDateRanges = async (buId: number) => {
    const response = await api.get(`/date-ranges?bu_id=${buId}`);
    return response.data;
};

export const getInstitutionalHolders = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/institutional${getParams(buId, dateRange)}`);
    return response.data;
};

export const getTopBuyers = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/buyers${getParams(buId, dateRange)}`);
    return response.data;
};

export const getTopSellers = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/sellers${getParams(buId, dateRange)}`);
    return response.data;
};

export const getFIIHolders = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/fii${getParams(buId, dateRange)}`);
    return response.data;
};

export const getActiveMFHolders = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/mf-active${getParams(buId, dateRange)}`);
    return response.data;
};

export const getPassiveMFHolders = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/mf-passive${getParams(buId, dateRange)}`);
    return response.data;
};

export const getInsurancePFHolders = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/insurance-pf${getParams(buId, dateRange)}`);
    return response.data;
};

export const getAIFHolders = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/aif${getParams(buId, dateRange)}`);
    return response.data;
};

export const getEntries = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/entries${getParams(buId, dateRange)}`);
    return response.data;
};

export const getExits = async (buId?: number, dateRange?: string) => {
    const response = await api.get(`holders/exits${getParams(buId, dateRange)}`);
    return response.data;
};

export const getDatabases = async () => {
    const response = await api.get('databases');
    return response.data;
};

export const getMetadata = async (buId?: number) => {
    const response = await api.get(`metadata${getParams(buId)}`);
    return response.data;
};

export default api;
