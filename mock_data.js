/**
 * Deterministic helper to generate mock OHLC data based on a ticker seed
 */
window.generateHistory = function (startPrice, count, interval, ticker = 'stock') {
    // Simple LCG (Linear Congruential Generator) for deterministic results
    let seed = 0;
    const key = ticker + interval;
    for (let i = 0; i < key.length; i++) {
        seed = ((seed << 5) - seed) + key.charCodeAt(i);
        seed |= 0;
    }

    function random() {
        seed = (seed * 1664525 + 1013904223) % 4294967296;
        return seed / 4294967296;
    }

    // console.log('Generating history for:', startPrice, count, interval, ticker);
    let history = [];
    let currPrice = startPrice;
    let currDate = new Date();
    // Start history from "Yesterday" (last trading day approximation)
    // If today is Saturday (6), start from Friday (sub 1)
    // If today is Sunday (0), start from Friday (sub 2)
    const day = currDate.getDay();
    if (day === 0) currDate.setDate(currDate.getDate() - 2); // Sunday -> Friday
    else if (day === 6) currDate.setDate(currDate.getDate() - 1); // Saturday -> Friday
    else currDate.setDate(currDate.getDate() - 1); // Monday-Friday -> Yesterday

    // Use startPrice as the pivot for the most recent data
    currPrice = startPrice;

    // Go back in time
    for (let i = 0; i < count; i++) {
        let open, close;

        if (i === 0) {
            // Ensure the most recent bar closes EXACTLY at startPrice
            close = startPrice;
            open = close * (1 - (random() - 0.5) * 0.01);
        } else {
            open = currPrice + (random() - 0.5) * (startPrice * 0.02);
            // Ensure price doesn't go below a reasonable floor
            if (open < startPrice * 0.1) open = startPrice * 0.1 + (random() * startPrice * 0.05);

            close = open + (random() - 0.5) * (startPrice * 0.015);
            if (close < startPrice * 0.1) close = startPrice * 0.1 + (random() * startPrice * 0.05);
        }

        let high = Math.max(open, close) + random() * (startPrice * 0.01);
        let low = Math.min(open, close) - random() * (startPrice * 0.01);
        if (low < startPrice * 0.05) low = startPrice * 0.05;

        // Format date consistently with lightweight charts requirements
        let dateKey;
        if (interval === 'D') {
            dateKey = currDate.toISOString().split('T')[0];
            currDate.setDate(currDate.getDate() - 1);
        } else if (interval === 'W') {
            dateKey = currDate.toISOString().split('T')[0];
            currDate.setDate(currDate.getDate() - 7);
        } else if (interval === 'M') {
            dateKey = currDate.toISOString().split('T')[0];
            currDate.setMonth(currDate.getMonth() - 1);
        } else { // 'Y'
            dateKey = currDate.toISOString().split('T')[0];
            currDate.setFullYear(currDate.getFullYear() - 1);
        }

        history.unshift({ time: dateKey, open, high, low, close });
        currPrice = open;
    }
    return history;
}

window.MOCK_DATA = {
    // NASDAQ (USD)
    'AAPL': {
        price: 182.50, currency: 'USD', name: 'Apple Inc.',
        financials: { lastDiv: 0.24, nextDiv: 0.25, exDiv: '2026-02-12', payDiv: '2026-03-15', yield: 0.52, pe: 28.4, pb: 38.2, ps: 7.1, eps: 6.42 },
        news: [
            { date: '2026-02-18', title: 'Apple anuncia avances en su chip M5', summary: 'Nuevos reportes indican que la producción masiva empezará en breve.' },
            { date: '2026-02-15', title: 'Expansión de servicios en Europa', summary: 'Apple Pay se integra con nuevos bancos locales para mejorar la experiencia.' }
        ],
        historical: {
            'D': generateHistory(182.50, 60, 'D'),
            'W': generateHistory(182.50, 52, 'W'),
            'M': generateHistory(182.50, 24, 'M')
        }
    },
    'STAG': {
        price: 36.50, currency: 'USD', name: 'STAG Industrial, Inc.',
        financials: { lastDiv: 0.12, nextDiv: 0.12, yield: 4.1, pe: 18.5, eps: 1.98 }
    },
    'LTC': {
        price: 34.20, currency: 'USD', name: 'LTC Properties, Inc.',
        financials: { lastDiv: 0.19, nextDiv: 0.19, yield: 6.6, pe: 12.4, eps: 2.75 }
    },
    'EPR': {
        price: 45.80, currency: 'USD', name: 'EPR Properties',
        financials: { lastDiv: 0.28, nextDiv: 0.28, yield: 7.3, pe: 15.2, eps: 3.01 }
    },
    'KO': {
        price: 60.15, currency: 'USD', name: 'The Coca-Cola Company',
        financials: { lastDiv: 0.48, nextDiv: 0.50, yield: 3.2, pe: 24.5, eps: 2.45 }
    },
    'PEP': {
        price: 172.40, currency: 'USD', name: 'PepsiCo, Inc.',
        financials: { lastDiv: 1.26, nextDiv: 1.26, yield: 2.9, pe: 21.8, eps: 7.91 }
    },
    'O': {
        price: 54.30, currency: 'USD', name: 'Realty Income Corp',
        financials: { lastDiv: 0.25, nextDiv: 0.26, yield: 5.7, pe: 42.1, eps: 1.29 }
    },
    'PFE': {
        price: 27.50, currency: 'USD', name: 'Pfizer Inc.',
        financials: { lastDiv: 0.42, nextDiv: 0.42, yield: 6.1, pe: 12.2, eps: 2.25 }
    },
    'JNJ': {
        price: 158.40, currency: 'USD', name: 'Johnson & Johnson',
        financials: { lastDiv: 1.19, nextDiv: 1.19, yield: 3.0, pe: 14.5, eps: 10.92 }
    },
    'MCD': {
        price: 295.10, currency: 'USD', name: "McDonald's Corp",
        financials: { lastDiv: 1.67, nextDiv: 1.67, yield: 2.3, pe: 25.8, eps: 11.43 }
    },
    'V': {
        price: 280.40, currency: 'USD', name: 'Visa Inc.',
        financials: { lastDiv: 0.52, nextDiv: 0.52, yield: 0.7, pe: 32.1, eps: 8.73 }
    },
    'MA': {
        price: 460.20, currency: 'USD', name: 'Mastercard Inc.',
        financials: { lastDiv: 0.66, nextDiv: 0.66, yield: 0.6, pe: 38.5, eps: 11.95 }
    },
    'PG': {
        price: 162.80, currency: 'USD', name: 'Procter & Gamble Co.',
        financials: { lastDiv: 0.94, nextDiv: 0.94, yield: 2.3, pe: 26.1, eps: 6.24 }
    },
    'SPY': {
        price: 500.20, currency: 'USD', name: 'SPDR S&P 500 ETF Trust'
    },
    'MSFT': {
        price: 405.20, currency: 'USD', name: 'Microsoft Corp.',
        financials: { lastDiv: 0.75, nextDiv: 0.75, exDiv: '2026-02-21', payDiv: '2026-03-10', yield: 0.74, pe: 36.8, pb: 12.5, ps: 13.2, eps: 11.01 },
        news: [
            { date: '2026-02-17', title: 'Copilot Pro se actualiza con GPT-5', summary: 'La IA de Microsoft da un salto generacional en capacidades de razonamiento.' },
            { date: '2026-02-10', title: 'Resultados récord en Azure Cloud', summary: 'El crecimiento de la nube impulsa los beneficios por encima de las expectativas.' }
        ],
        historical: {
            'D': generateHistory(405.20, 60, 'D'),
            'W': generateHistory(405.20, 52, 'W'),
            'M': generateHistory(405.20, 24, 'M')
        }
    },
    'GOOGL': {
        price: 145.10, currency: 'USD', name: 'Alphabet Inc.',
        financials: { lastDiv: 0.00, nextDiv: 0.20, exDiv: '2026-03-10', yield: 0.0, pe: 25.1, pb: 6.8, ps: 6.2, eps: 5.8 }
    },
    'AMZN': { price: 168.30, currency: 'USD', name: 'Amazon.com Inc.', financials: { yield: 0, pe: 60.5, pb: 8.9, ps: 3.1, eps: 2.78 } },
    'TSLA': { price: 195.45, currency: 'USD', name: 'Tesla Inc.', financials: { yield: 0, pe: 45.2, pb: 9.5, ps: 6.8, eps: 4.3 } },
    'NVDA': {
        price: 725.60, currency: 'USD', name: 'NVIDIA Corp.',
        financials: { lastDiv: 0.04, nextDiv: 0.04, exDiv: '2026-03-05', yield: 0.02, pe: 95.4, pb: 45.1, ps: 35.2, eps: 7.6 }
    },
    'PYPL': { price: 58.40, currency: 'USD', name: 'PayPal Holdings' },
    'NFLX': { price: 585.10, currency: 'USD', name: 'Netflix Inc.' },
    'AMD': { price: 175.20, currency: 'USD', name: 'Advanced Micro Devices' },
    'INTC': { price: 43.50, currency: 'USD', name: 'Intel Corp.' },
    'META': {
        price: 470.10, currency: 'USD', name: 'Meta Platforms Inc.',
        financials: { lastDiv: 0.50, nextDiv: 0.50, exDiv: '2026-02-22', yield: 0.42, pe: 32.5, pb: 7.4, ps: 9.1, eps: 14.45 }
    },

    // SP500 (USD)
    'JPM': { price: 185.30, currency: 'USD', name: 'JPMorgan Chase & Co.', financials: { lastDiv: 1.05, nextDiv: 1.15, exDiv: '2026-04-05', yield: 2.3, pe: 11.5, pb: 1.7, ps: 3.2, eps: 16.1 } },
    'V': { price: 278.10, currency: 'USD', name: 'Visa Inc.', financials: { lastDiv: 0.52, nextDiv: 0.52, exDiv: '2026-02-28', yield: 0.75, pe: 31.2, pb: 15.1, ps: 16.5, eps: 8.9 } },
    'JNJ': { price: 158.40, currency: 'USD', name: 'Johnson & Johnson', financials: { lastDiv: 1.19, nextDiv: 1.24, exDiv: '2026-03-20', yield: 3.01, pe: 14.5, pb: 5.4, ps: 4.1, eps: 10.9 } },
    'PG': { price: 158.20, currency: 'USD', name: 'Procter & Gamble Co.', financials: { lastDiv: 0.94, nextDiv: 1.00, exDiv: '2026-04-18', yield: 2.4, pe: 26.1, pb: 8.1, ps: 4.8, eps: 6.05 } },
    'KO': { price: 59.80, currency: 'USD', name: 'Coca-Cola Co.', financials: { lastDiv: 0.46, nextDiv: 0.48, exDiv: '2026-03-14', yield: 3.1, pe: 24.5, pb: 10.2, ps: 5.6, eps: 2.44 } },
    'VZ': { price: 48.90, currency: 'USD', name: 'Verizon Communications', financials: { lastDiv: 0.66, nextDiv: 0.66, exDiv: '2026-03-09', yield: 6.5, pe: 15.2, pb: 2.1, ps: 1.2, eps: 3.2 } },
    'O': { price: 65.38, currency: 'USD', name: 'Realty Income Corp.', financials: { lastDiv: 0.25, nextDiv: 0.25, exDiv: '2026-04-01', yield: 5.8, pe: 42.1, pb: 1.3, ps: 12.5, eps: 1.55 } },
    'AGNC': { price: 11.30, currency: 'USD', name: 'AGNC Investment Corp.', financials: { lastDiv: 0.12, nextDiv: 0.12, exDiv: '2026-03-30', yield: 14.2, pe: 8.5, pb: 0.9, ps: 5.1, eps: 1.33 } },
    'ARCC': { price: 19.35, currency: 'USD', name: 'Ares Capital Corp.', financials: { lastDiv: 0.48, nextDiv: 0.48, exDiv: '2026-03-14', yield: 9.8, pe: 9.2, pb: 1.1, ps: 4.5, eps: 2.1 } },
    'MAIN': { price: 59.20, currency: 'USD', name: 'Main Street Capital', financials: { lastDiv: 0.24, nextDiv: 0.24, exDiv: '2026-03-07', yield: 6.1, pe: 13.5, pb: 1.6, ps: 10.2, eps: 4.38 } },
    'PFE': { price: 27.50, currency: 'USD', name: 'Pfizer Inc.', financials: { lastDiv: 0.42, nextDiv: 0.42, exDiv: '2026-03-09', yield: 5.9, pe: 12.1, pb: 1.5, ps: 2.2, eps: 2.27 } },
    'XOM': { price: 104.10, currency: 'USD', name: 'Exxon Mobil Corp.', financials: { lastDiv: 0.95, nextDiv: 0.95, exDiv: '2026-03-14', yield: 3.6, pe: 12.5, pb: 2.1, ps: 1.1, eps: 8.3 } },
    'DX': { price: 12.50, currency: 'USD', name: 'Dynex Capital, Inc.', financials: { lastDiv: 0.13, nextDiv: 0.13, exDiv: '2026-03-31', yield: 12.5, pe: 10.1, pb: 0.8, ps: 4.2, eps: 1.25 } },

    // IBEX 35 (EUR)
    'SAN.MC': {
        price: 4.92, currency: 'EUR', name: 'Banco Santander',
        financials: { lastDiv: 0.10, nextDiv: 0.10, exDiv: '2026-05-02', payDiv: '2026-05-15', yield: 3.8, pe: 6.2, pb: 0.6, ps: 1.2, eps: 1.73 },
        news: [
            { date: '2026-02-19', title: 'Santander refuerza su banca digital', summary: 'La entidad anuncia una inversión millonaria en su plataforma Openbank.' }
        ],
        historical: {
            'D': generateHistory(4.92, 60, 'D'),
            'W': generateHistory(4.92, 52, 'W'),
            'M': generateHistory(4.92, 24, 'M')
        }
    },
    'ITX.MC': {
        price: 53.40, currency: 'EUR', name: 'Inditex',
        financials: { lastDiv: 0.77, nextDiv: 0.77, exDiv: '2026-05-02', payDiv: '2026-06-01', yield: 2.8, pe: 25.4, pb: 8.1, ps: 4.5, eps: 2.27 },
        news: [
            { date: '2026-02-14', title: 'Inditex supera previsiones de ventas', summary: 'La estrategia omnicanal sigue dando resultados positivos a nivel global.' }
        ],
        historical: {
            'D': generateHistory(53.40, 60, 'D'),
            'W': generateHistory(53.40, 52, 'W'),
            'M': generateHistory(53.40, 24, 'M')
        }
    },
    'BBVA.MC': {
        price: 9.85, currency: 'EUR', name: 'BBVA',
        financials: { lastDiv: 0.39, nextDiv: 0.39, exDiv: '2026-04-10', payDiv: '2026-04-30', yield: 5.2, pe: 6.8, pb: 0.8, ps: 1.5, eps: 2.94 },
        news: [
            { date: '2026-02-12', title: 'BBVA eleva su previsión de dividendos', summary: 'Los excelentes resultados en México impulsan la retribución al accionista.' }
        ],
        historical: {
            'D': generateHistory(9.85, 60, 'D'),
            'W': generateHistory(9.85, 52, 'W'),
            'M': generateHistory(9.85, 24, 'M')
        }
    },
    'TEF.MC': {
        price: 4.25, currency: 'EUR', name: 'Telefónica',
        historical: {
            'D': generateHistory(4.25, 60, 'D'),
            'W': generateHistory(4.25, 52, 'W'),
            'M': generateHistory(4.25, 24, 'M')
        }
    },
    'IBE.MC': {
        price: 13.40, currency: 'EUR', name: 'Iberdrola',
        financials: { lastDiv: 0.35, nextDiv: 0.35, exDiv: '2026-03-31', yield: 4.2, pe: 15.1, pb: 1.4, ps: 2.2, eps: 1.33 },
        historical: {
            'D': generateHistory(13.40, 60, 'D'),
            'W': generateHistory(13.40, 52, 'W'),
            'M': generateHistory(13.40, 24, 'M')
        }
    },
    'REP.MC': {
        price: 15.10, currency: 'EUR', name: 'Repsol',
        financials: { lastDiv: 0.40, nextDiv: 0.40, exDiv: '2026-03-11', yield: 6.1, pe: 4.8, pb: 0.6, ps: 0.3, eps: 3.14 },
        historical: {
            'D': generateHistory(15.10, 60, 'D'),
            'W': generateHistory(15.10, 52, 'W'),
            'M': generateHistory(15.10, 24, 'M')
        }
    },
    'CABK.MC': { price: 4.35, currency: 'EUR', name: 'CaixaBank' },
    'NTGY.MC': { price: 25.04, currency: 'EUR', name: 'Naturgy Energy Group' },
    'ENG.MC': { price: 15.20, currency: 'EUR', name: 'Enagás' },
    'FER.MC': { price: 35.10, currency: 'EUR', name: 'Ferrovial' },
    'AMS.MC': { price: 65.50, currency: 'EUR', name: 'Amadeus' },
    'RED.MC': { price: 16.03, currency: 'EUR', name: 'Redeia (REE)' },
    'SAB.MC': { price: 3.28, currency: 'EUR', name: 'Banco Sabadell' },
    'TUB.MC': { price: 3.39, currency: 'EUR', name: 'Tubacex' },
    'IAG.MC': { price: 1.85, currency: 'EUR', name: 'IAG' },
    'GRLS.MC': { price: 12.40, currency: 'EUR', name: 'Grifols' },
    'BKT.MC': { price: 6.20, currency: 'EUR', name: 'Bankinter' },
    'IDR.MC': { price: 14.50, currency: 'EUR', name: 'Indra' },

    // Aliases .ES (same data as .MC, used by some brokers)
    'NTGY.ES': { price: 25.04, currency: 'EUR', name: 'Naturgy Energy Group' },
    'RED.ES': { price: 16.03, currency: 'EUR', name: 'Redeia (REE)' },
    'SAB.ES': { price: 3.28, currency: 'EUR', name: 'Banco Sabadell' },
    'TUB.ES': { price: 3.39, currency: 'EUR', name: 'Tubacex' },

    // XETRA / Frankfurt (EUR)
    'PRG.DE': { price: 130.00, currency: 'EUR', name: 'Patrizia SE' },
    'DYT1.DE': { price: 12.50, currency: 'USD', name: 'Dynex Capital Inc.' },
    'PHMMF': { price: 75.00, currency: 'USD', name: 'PHX Minerals' },
};

// --- New: Automatically populate historical data for all stocks if missing ---
try {
    console.log("Populating historical data for all stocks...");
    Object.keys(window.MOCK_DATA).forEach(ticker => {
        const stock = window.MOCK_DATA[ticker];
        if (!stock.historical && stock.price) {
            try {
                stock.historical = {
                    'D': window.generateHistory(stock.price, 200, 'D', ticker), // 200 to ensure we have enough for SMA 180 + buffer
                    'W': window.generateHistory(stock.price, 52, 'W', ticker),
                    'M': window.generateHistory(stock.price, 24, 'M', ticker),
                    'Y': window.generateHistory(stock.price, 10, 'Y', ticker)
                };
            } catch (innerErr) {
                console.error(`Failed to generate history for ${ticker}:`, innerErr);
            }
        }
    });
    console.log("Historical data population complete.");
} catch (err) {
    console.error("Critical error in historical data generation:", err);
}

// Flatten data for search suggestions
window.SEARCH_DATA = Object.keys(window.MOCK_DATA).map(ticker => ({
    ticker: ticker,
    name: window.MOCK_DATA[ticker].name
}));

window.FX_RATE = 0.8467; // 1 USD = 0.8467 EUR (Adjusted to match real-time observed value)

// --- Real-time API Configuration ---
// Get your free key at https://finnhub.io/
window.FINNHUB_API_KEY = 'd6b00s1r01qnr27j4hqgd6b00s1r01qnr27j4hr0';

window.LIVE_PRICES = {}; // Cache for live data
window.LIVE_DATES = {}; // Cache for update times
window.MANUAL_PRICES = {}; // User-entered manual prices

// Helper to format date as dd/mm/aaaa
function formatDate(dateObj) {
    if (!dateObj || isNaN(dateObj.getTime())) return '';
    const d = String(dateObj.getDate()).padStart(2, '0');
    const m = String(dateObj.getMonth() + 1).padStart(2, '0');
    const y = dateObj.getFullYear();
    return `${d}/${m}/${y}`;
}

// Helper to get price and currency
window.getStockInfo = function (ticker) {
    const key = ticker.toUpperCase();

    // 1. Check if we have a real-time price from the API
    if (window.LIVE_PRICES[key]) {
        return {
            price: window.LIVE_PRICES[key],
            currency: window.MOCK_DATA[key]?.currency || (key.endsWith('.MC') ? 'EUR' : 'USD'),
            isLive: true,
            isManual: false,
            date: window.LIVE_DATES[key] || ''
        };
    }

    // 1.5 Check if we have a manual override
    if (window.MANUAL_PRICES && window.MANUAL_PRICES[key]) {
        return {
            price: window.MANUAL_PRICES[key].price,
            currency: window.MOCK_DATA[key]?.currency || (key.endsWith('.MC') ? 'EUR' : 'USD'),
            isLive: false,
            isManual: true,
            isSimulated: false,
            date: window.MANUAL_PRICES[key].date || ''
        };
    }

    // 2. Fallback: If not live, try to get the closing price from MOCK_DATA
    let data = window.MOCK_DATA[key];
    if (data) {
        let syncPrice = data.price;
        let priceDate = '';
        if (data.historical && data.historical['D'] && data.historical['D'].length > 0) {
            const lastEntry = data.historical['D'][data.historical['D'].length - 1];
            syncPrice = lastEntry.close;
            priceDate = formatDate(new Date(lastEntry.time));
        }
        return {
            price: syncPrice,
            currency: data.currency,
            isLive: false,
            isSimulated: true,
            date: priceDate
        };
    }

    // 3. Last fallback: Return null if absolutely unknown
    return {
        price: null,
        currency: (key.endsWith('.MC') ? 'EUR' : 'USD'),
        isLive: false,
        isSimulated: false,
        date: ''
    };
}

// Function to fetch real prices (to be called by app.js)
window.refreshLivePrices = async function (tickers) {
    if (!window.FINNHUB_API_KEY || tickers.length === 0) return;

    for (const ticker of tickers) {
        const key = ticker.toUpperCase();

        // Symbols to try for this ticker
        let symbolsToTry = [key];
        if (key.endsWith('.MC')) {
            symbolsToTry.push(key.replace('.MC', '.MA')); // Madrid
            symbolsToTry.push(key.replace('.MC', '.BME')); // Spanish BME format
            symbolsToTry.push(key.replace('.MC', ':MC')); // Some formats
            symbolsToTry.push(key.split('.')[0] + '.MC'); // redundant but safe
        } else if (key.endsWith('.ES')) {
            const base = key.split('.')[0];
            symbolsToTry.push(base + '.BME');  // Finnhub BME format
            symbolsToTry.push(base + '.MA');   // alternate
            symbolsToTry.push(base + '.MC');   // .MC variant
        } else if (key.endsWith('.DE')) {
            const base = key.split('.')[0];
            symbolsToTry.push(base + '.XETRA'); // Finnhub XETRA format
            symbolsToTry.push(base + '.F');     // Frankfurt
            symbolsToTry.push(base + '.DE');    // redundant but safe
        }

        let success = false;
        for (const symbol of symbolsToTry) {
            // Implement 3-second timeout to prevent app hanging on network issues
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 3000);

            try {
                const url = `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${window.FINNHUB_API_KEY}`;
                const resp = await fetch(url, { signal: controller.signal });
                const data = await resp.json();

                clearTimeout(timeoutId);
                window.NETWORK_OFFLINE = false; // Connection is back!

                if ((data.c && data.c !== 0) || (data.pc && data.pc !== 0)) {
                    const finalPrice = data.c !== 0 ? data.c : data.pc;
                    // Normalize to 2 decimal places to avoid 0.01 rounding discrepancies
                    window.LIVE_PRICES[key] = Math.round(finalPrice * 100) / 100;

                    // Store the date from the API (timestamp 't' is in seconds)
                    if (data.t) {
                        const apiDate = new Date(data.t * 1000);
                        window.LIVE_DATES[key] = formatDate(apiDate);
                    } else {
                        window.LIVE_DATES[key] = formatDate(new Date());
                    }

                    success = true;
                    // console.log(`Live price for ${key} found using symbol ${symbol}: ${finalPrice}`);
                    break;
                } else if (data.error) {
                    console.warn(`API Error for ${symbol}:`, data.error);
                }
            } catch (e) {
                clearTimeout(timeoutId);
                if (e.name === 'AbortError') {
                    // console.error(`Timeout error for ${symbol}: El servidor tardó demasiado en responder.`);
                    // Solo marcamos offline global si NO es una acción del IBEX, ya que estas suelen fallar en el free tier
                    if (!key.endsWith('.MC')) {
                        window.NETWORK_OFFLINE = true;
                    }
                } else {
                    // console.error(`Fetch error for ${symbol}:`, e);
                    window.NETWORK_OFFLINE = navigator.onLine === false;
                }
            }
        }

        if (!success && (key.endsWith('.MC') || key.endsWith('.ES'))) {
            // Fallback attempt with Yahoo Finance (No API key needed, but CORS might be an issue)
            try {
                const ticker = key.endsWith('.ES') ? key.replace('.ES', '.MC') : key;
                const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${ticker}`;
                // Note: This often fails in browsers due to CORS, but we try as a last resort
                const resp = await fetch(url);
                const data = await resp.json();
                if (data.quoteResponse && data.quoteResponse.result && data.quoteResponse.result[0]) {
                    const quote = data.quoteResponse.result[0];
                    window.LIVE_PRICES[key] = quote.regularMarketPrice;
                    window.LIVE_DATES[key] = formatDate(new Date());
                    success = true;
                    // console.log(`Live price for ${key} found using Yahoo Finance: ${quote.regularMarketPrice}`);
                }
            } catch (e) {
                // Silent fail for fallback
            }
        }

        if (!success && (key.endsWith('.MC') || key.endsWith('.ES'))) {
            // console.warn(`Could not fetch live price for IBEX stock ${key}. Note: Finnhub Free Tier may not support Spanish (BME) market.`);
        }
    }
}
