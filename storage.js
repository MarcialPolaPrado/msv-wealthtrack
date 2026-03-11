const STORAGE_KEY = 'premium_portfolio_data';
const SAVINGS_KEY = 'msv_savings_v1';
const PRIVACY_KEY = 'msv_privacy_v1';
const NOMINA_KEY = 'msv_nomina_v1';

window.saveStocks = (stocks) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(stocks));
};

window.loadStocks = () => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
};

window.saveSavings = (drawers) => {
    localStorage.setItem(SAVINGS_KEY, JSON.stringify(drawers));
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
};

window.loadNomina = () => {
    const data = localStorage.getItem(NOMINA_KEY);
    return data ? JSON.parse(data) : null;
};

const COUNTDOWNS_KEY = 'msv_countdowns_v1';
window.saveCountdowns = (data) => {
    localStorage.setItem(COUNTDOWNS_KEY, JSON.stringify(data));
};

window.loadCountdowns = () => {
    const data = localStorage.getItem(COUNTDOWNS_KEY);
    return data ? JSON.parse(data) : [];
};

const MANUAL_PRICES_KEY = 'msv_manual_prices_v1';
window.saveManualPrices = (data) => {
    localStorage.setItem(MANUAL_PRICES_KEY, JSON.stringify(data));
};

window.loadManualPrices = () => {
    const data = localStorage.getItem(MANUAL_PRICES_KEY);
    return data ? JSON.parse(data) : {};
};
