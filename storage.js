const STORAGE_KEY = 'premium_portfolio_data';
const SAVINGS_KEY = 'msv_savings_v1';
const PRIVACY_KEY = 'msv_privacy_v1';
const NOMINA_KEY = 'msv_nomina_v1';
const LIVE_PRICES_KEY = 'msv_live_prices_v1';
const LIVE_DATES_KEY = 'msv_live_dates_v1';
const LIVE_SOURCES_KEY = 'msv_live_sources_v1';
const RECURRING_SAVINGS_KEY = 'msv_recurring_savings_v1';

window.saveStocks = (stocks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
    if (window.updateStorageStatus) window.updateStorageStatus();
};

window.loadStocks = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

window.saveSavings = (drawers) => {
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(drawers));
    if (window.updateStorageStatus) window.updateStorageStatus();
};

window.loadSavings = () => {
    const data = localStorage.getItem(SAVINGS_KEY);
    return data ? JSON.parse(data) : null;
};

window.savePrivacy = (active) => {
    localStorage.setItem(PRIVACY_KEY, JSON.stringify(active));
};

window.loadPrivacy = () => {
    const data = localStorage.getItem(PRIVACY_KEY);
    // Default to true (hidden) if not set
    return data !== null ? JSON.parse(data) : true;
};

window.saveNomina = (data) => {
    localStorage.setItem(NOMINA_KEY, JSON.stringify(data));
    if (window.updateStorageStatus) window.updateStorageStatus();
};

window.loadNomina = () => {
    const data = localStorage.getItem(NOMINA_KEY);
    return data ? JSON.parse(data) : null;
};

const COUNTDOWNS_KEY = 'msv_countdowns_v1';
window.saveCountdowns = (data) => {
    localStorage.setItem(COUNTDOWNS_KEY, JSON.stringify(data));
    if (window.updateStorageStatus) window.updateStorageStatus();
};

window.loadCountdowns = () => {
    const data = localStorage.getItem(COUNTDOWNS_KEY);
    return data ? JSON.parse(data) : [];
};

const MANUAL_PRICES_KEY = 'msv_manual_prices_v1';
window.saveManualPrices = (data) => {
    localStorage.setItem(MANUAL_PRICES_KEY, JSON.stringify(data));
    if (window.updateStorageStatus) window.updateStorageStatus();
};

window.loadManualPrices = () => {
    const data = localStorage.getItem(MANUAL_PRICES_KEY);
    return data ? JSON.parse(data) : {};
};

const DATA_SOURCE_MODE_KEY = 'msv_data_source_mode_v1';
window.saveDataSourceMode = (mode) => {
    localStorage.setItem(DATA_SOURCE_MODE_KEY, mode);
};

window.loadDataSourceMode = () => {
    const mode = localStorage.getItem(DATA_SOURCE_MODE_KEY);
    return mode || 'hybrid'; // Default: finnhub + yahoo fallback
};

const FX_RATE_KEY = 'msv_fx_rate_v1';
window.saveFXRate = (rate) => {
    localStorage.setItem(FX_RATE_KEY, rate);
};

window.loadFXRate = () => {
    const rate = localStorage.getItem(FX_RATE_KEY);
    return rate ? parseFloat(rate) : null;
};

const FX_DATE_KEY = 'msv_fx_date_v1';
window.saveFXDate = (date) => {
    localStorage.setItem(FX_DATE_KEY, date);
};

window.loadFXDate = () => {
    const date = localStorage.getItem(FX_DATE_KEY);
    return date || '';
};

window.saveLivePrices = (data) => {
    localStorage.setItem(LIVE_PRICES_KEY, JSON.stringify(data));
};

window.loadLivePrices = () => {
    const data = localStorage.getItem(LIVE_PRICES_KEY);
    return data ? JSON.parse(data) : {};
};

window.saveLiveDates = (data) => {
    localStorage.setItem(LIVE_DATES_KEY, JSON.stringify(data));
};

window.loadLiveDates = () => {
    const data = localStorage.getItem(LIVE_DATES_KEY);
    return data ? JSON.parse(data) : {};
};

window.saveLiveSources = (data) => {
    localStorage.setItem(LIVE_SOURCES_KEY, JSON.stringify(data));
};

window.loadLiveSources = () => {
    const data = localStorage.getItem(LIVE_SOURCES_KEY);
    return data ? JSON.parse(data) : {};
};

window.saveRecurringSavings = (data) => {
    localStorage.setItem(RECURRING_SAVINGS_KEY, JSON.stringify(data));
};

window.loadRecurringSavings = () => {
    const data = localStorage.getItem(RECURRING_SAVINGS_KEY);
    return data ? JSON.parse(data) : [];
};
