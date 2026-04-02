document.addEventListener('DOMContentLoaded', () => {

    // Nextcloud Initialization State
    let isInitialLoad = true;
    const startupLocalModified = NextcloudSync.getLocalModified();

    // State
    let stocks = (window.loadStocks) ? window.loadStocks() : [];

    // Migration: Normalize .ES tickers to .MC for API and Master Data compatibility
    let needsMigrationSave = false;
    stocks = stocks.map(s => {
        if (s.ticker && s.ticker.toUpperCase().endsWith('.ES')) {
            s.ticker = s.ticker.toUpperCase().replace('.ES', '.MC');
            needsMigrationSave = true;
        }
        return s;
    });
    if (needsMigrationSave && window.saveStocks) {
        window.saveStocks(stocks);
    }

    let currentFilter = 'all';
    const getSortConfig = (key, defaultObj) => {
        try {
            const saved = localStorage.getItem(key);
            return saved ? JSON.parse(saved) : defaultObj;
        } catch { return defaultObj; }
    };

    let sortConfig = getSortConfig('bolsaSortConfig', { key: null, direction: 'asc' });
    let expandedTickers = new Set(); // Track which positions are expanded to show details
    let expandedEstadoDrawers = new Set(); // Track which drawers are expanded in Estado view
    let selectedAhorroFiscalMonth = null;
    let ahorroViewMode = localStorage.getItem('ahorroViewMode') || 'cards'; // 'cards' or 'list'

    const _initialDate = new Date();
    const _initialMonthStr = `${_initialDate.getFullYear()}-${String(_initialDate.getMonth() + 1).padStart(2, '0')}`;

    let ahorroListMonth = _initialMonthStr;
    let ahorroSortConfig = getSortConfig('ahorroSortConfig', { key: 'name', direction: 'asc' });
    let analisisViewMode = 'list'; // 'list' or 'cards'
    let analisisSortConfig = getSortConfig('analisisSortConfig', { key: 'month', direction: 'asc' });
    let nominaViewMode = localStorage.getItem('nominaViewMode') || 'cards'; // 'cards' or 'list'
    let nominaListMonth = _initialMonthStr;
    let nominaSortConfig = getSortConfig('nominaSortConfig', { key: 'type', direction: 'asc' });
    let nominaListFilterMode = localStorage.getItem('nominaListFilterMode') || 'detail'; // 'detail' or 'totals'
    let ahorroFilterMode = localStorage.getItem('ahorroFilterMode') || 'month'; // 'month', 'year', 'all'
    let ahorroListFilterMode = localStorage.getItem('ahorroListFilterMode') || 'detail'; // 'detail', 'totals'
    let bolsaViewMode = localStorage.getItem('bolsaViewMode') || 'list';
    let bolsaTotalsMode = localStorage.getItem('bolsaTotalsMode') === 'true' || false;
    let bolsaSummaryVisible = localStorage.getItem('bolsaSummaryVisible') !== 'false'; // Default to true
    let ahorroSummaryVisible = localStorage.getItem('ahorroSummaryVisible') !== 'false';
    let bolsaHighlightsVisible = localStorage.getItem('bolsaHighlightsVisible') === 'true';
    let breakdownDrawerFilter = null;
    let breakdownContext = 'ahorro';
    let currentBreakdownMovements = {
        Intereses: [],
        Dividendos: [],
        Especulación: []
    };
    let currentActiveBreakdownCategory = null;

    let ahorroSummaryFilterMode = localStorage.getItem('ahorroSummaryFilterMode') || 'month'; // 'month', 'year', 'all'
    let isAhorroSummaryExpanded = localStorage.getItem('isAhorroSummaryExpanded') !== 'false';
    let isSavingsPieExpanded = localStorage.getItem('isSavingsPieExpanded') !== 'false';
    let isBolsaPieExpanded = localStorage.getItem('isBolsaPieExpanded') !== 'false';
    let isExpenseSummaryExpanded = localStorage.getItem('isExpenseSummaryExpanded') !== 'false';
    let isNominaIngresosExpanded = localStorage.getItem('isNominaIngresosExpanded') !== 'false';
    let isNominaAhorroExpanded = localStorage.getItem('isNominaAhorroExpanded') !== 'false';
    let isNominaGastosExpanded = localStorage.getItem('isNominaGastosExpanded') !== 'false';
    let isNominaEgresosExpanded = localStorage.getItem('isNominaEgresosExpanded') !== 'false';
    let isAhorroEstadoChartExpanded = localStorage.getItem('isAhorroEstadoChartExpanded') !== 'false';
    let expandedSummaryDrawers = new Set();
    let drawerDetailFilterMode = localStorage.getItem('drawerDetailFilterMode') || 'all';
    let activityListMonth = _initialMonthStr;
    let activitySortConfig = getSortConfig('activitySortConfig', { key: 'date', direction: 'desc' });
    let activityCellFilter = { column: null, value: null };
    let activityFilterMode = localStorage.getItem('activityFilterMode') || 'month'; // 'week', 'month', 'year' or 'all'
    let activityDrawerFilter = localStorage.getItem('activityDrawerFilter') || 'all';
    let activitySearchQuery = localStorage.getItem('activitySearchQuery') || '';
    let activityPageSize = 50;
    let activityCurrentLimit = 50;
    let bottomNavMode = localStorage.getItem('bottomNavMode') || 'nomina';

    let calendarDrawerId = null;
    let calendarViewDate = new Date(); // Month/Year currently shown in the calendar modal
    let globalAhorroCalendarViewDate = new Date(); // Global savings calendar view date
    let globalAhorroCalendarDrawerFilter = localStorage.getItem('globalAhorroCalendarDrawerFilter') || 'all';

    const DRAWER_COLORS = [
        { name: 'green', border: '#10b981', bg: '#064e3b', grad: 'rgba(16, 185, 129, 0.4)' },
        { name: 'blue', border: '#3b82f6', bg: '#1e3a8a', grad: 'rgba(59, 130, 246, 0.4)' },
        { name: 'indigo', border: '#6366f1', bg: '#312e81', grad: 'rgba(99, 102, 241, 0.4)' },
        { name: 'purple', border: '#8b5cf6', bg: '#4c1d95', grad: 'rgba(139, 92, 246, 0.4)' },
        { name: 'red', border: '#ef4444', bg: '#7f1d1d', grad: 'rgba(239, 68, 68, 0.4)' },
        { name: 'orange', border: '#f59e0b', bg: '#78350f', grad: 'rgba(245, 158, 11, 0.4)' },
        { name: 'yellow', border: '#eab308', bg: '#713f12', grad: 'rgba(234, 179, 8, 0.4)' }
    ];

    // Helper to normalize strings (remove accents and lower-case) for search
    const normalizeString = (str) => {
        if (!str) return '';
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    };



    // Dynamic Settings
    let fiscalDay = parseInt(localStorage.getItem('fiscalDay')) || 25;
    let incomeCategories = JSON.parse(localStorage.getItem('incomeCategories')) || ['Ahorro', 'Intereses', 'Dividendos', 'Especulación', 'Traspaso'];
    let expenseCategories = JSON.parse(localStorage.getItem('expenseCategories')) || ['Inversión', 'Gasto', 'Traspaso'];

    if (!incomeCategories.includes('Traspaso')) {
        incomeCategories.push('Traspaso');
        localStorage.setItem('incomeCategories', JSON.stringify(incomeCategories));
    }

    let incomeSubcategories = JSON.parse(localStorage.getItem('incomeSubcategories')) || [];
    let expenseSubcategories = JSON.parse(localStorage.getItem('expenseSubcategories')) || [];

    if (!expenseCategories.includes('Traspaso')) {
        expenseCategories.push('Traspaso');
        localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories));
    }
    let isPrivacyActive = localStorage.getItem('isPrivacyActive') === 'true' || false;
    let currentView = 'ahorro';
    let ahorroEstadoMonth = _initialDate.getMonth() + 1;
    let ahorroEstadoYear = _initialDate.getFullYear();
    let ahorroEstadoType = 'income'; // 'income' or 'expense'
    let lastSyncTimestamp = null;
    let currentTotalInvestedBolsa = 0;
    let currentPatrimonioTotal = 0;

    // Global Formatters
    const fmtEUR = (num, decimals = 2) => {
        if (isPrivacyActive) return '€ ****';
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('es-ES', {
            style: 'currency',
            currency: 'EUR',
            useGrouping: true,
            minimumFractionDigits: decimals,
            maximumFractionDigits: decimals
        }).format(Number(num));
    };
    const fmtNum = (num, decimals = 2) => {
        if (isPrivacyActive) return '****';
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true }).format(Number(num));
    };
    const fmtPct = (num) => {
        if (isPrivacyActive) return '****%';
        if (num === null || num === undefined) return '-';
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + '%';
    };

    // Savings State
    let savingsDrawers = (window.loadSavings) ? (window.loadSavings() || [
        { id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true, targetAmount: 0 }
    ]) : [
        { id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true, targetAmount: 0 }
    ];

    let recurringSavingsMovements = (window.loadRecurringSavings) ? window.loadRecurringSavings() : [];
    let recurringExecutionQueue = []; // New state for sequential execution

    let countdowns = (window.loadCountdowns) ? window.loadCountdowns() : [];

    let currentGoalDrawerId = null;

    function setDrawerTargetAmount(id) {
        const drawer = savingsDrawers.find(d => d.id == id);
        if (!drawer) return;

        currentGoalDrawerId = id;
        if (elements.goalModalDescription) {
            elements.goalModalDescription.textContent = `Establece el importe objetivo para "${drawer.name}". Introduce 0 para quitarlo.`;
        }
        if (elements.goalAmountInput) {
            elements.goalAmountInput.value = drawer.targetAmount || 0;
        }
        if (elements.goalModal) {
            elements.goalModal.classList.remove('hidden');
        }
    }

    function getBankIcon(name) {
        const n = name.toLowerCase();
        if (n.includes('bbva')) return '🏦';
        if (n.includes('b100')) return '🌿';
        if (n.includes('sabadell')) return '🏛️';
        if (n.includes('trade republic') || n.includes('traderepublic') || n.includes('trade')) return '📈';
        return null;
    }

    function getNominaIcon(name, type) {
        const n = name.toLowerCase();
        const bankIcon = getBankIcon(n);
        if (bankIcon) return bankIcon;

        if (n.includes('salario') || n.includes('nomina') || n.includes('nómina') || n.includes('sueldo')) return '💶';
        if (n.includes('alquiler') || n.includes('hipoteca') || n.includes('casa') || n.includes('vivienda')) return '🏠';
        if (n.includes('luz') || n.includes('electricidad') || n.includes('energia')) return '⚡';
        if (n.includes('agua')) return '💧';
        if (n.includes('gas')) return '🔥';
        if (n.includes('comida') || n.includes('super') || n.includes('mercado') || n.includes('alimentacion')) return '🛒';
        if (n.includes('internet') || n.includes('fibra') || n.includes('wifi')) return '🌐';
        if (n.includes('tel') || n.includes('movil') || n.includes('móvil')) return '📱';
        if (n.includes('ocio') || n.includes('cine') || n.includes('teatro') || n.includes('netflix')) return '🎬';
        if (n.includes('viaje') || n.includes('vuelo') || n.includes('hotel')) return '✈️';
        if (n.includes('coche') || n.includes('transporte') || n.includes('gasolina') || n.includes('parking')) return '🚗';
        if (n.includes('salud') || n.includes('farmacia') || n.includes('medico') || n.includes('médico')) return '🏥';
        if (n.includes('seguro')) return '🛡️';
        if (n.includes('gym') || n.includes('gimnasio') || n.includes('deporte')) return '💪';
        if (n.includes('bonus') || n.includes('extra') || n.includes('regalo')) return '🎁';
        if (n.includes('inversion') || n.includes('inversión') || n.includes('bolsa')) return '📈';

        if (type === 'saving') return '🏦';
        return type === 'income' ? '💰' : '💸';
    }

    function isProvision(m) {
        if (!m || (!m.description && !m.concept)) return false;
        const desc = (m.description || m.concept).toLowerCase();
        return desc.includes('saldo inicial') || desc.includes('provisión') || desc.includes('provision') || desc.includes('presupuesto') || desc.includes('asignado') || desc.includes('ahorro');
    }

    function parseAppDate(dStr) {
        if (!dStr) return new Date();
        if (dStr instanceof Date) return dStr;
        // ISO format check (YYYY-MM-DD or similar) - must be first for efficiency
        if (typeof dStr === 'string' && dStr.includes('-')) return new Date(dStr);
        // Spanish format check (DD/MM/YYYY)
        if (typeof dStr === 'string' && dStr.includes('/')) {
            const parts = dStr.split('/');
            if (parts.length === 3) {
                const [d, m, y] = parts.map(Number);
                return new Date(y, m - 1, d);
            }
        }
        return new Date(dStr);
    }

    function getFiscalMonth(dateInput = new Date()) {
        const d = new Date(dateInput);
        let year = d.getFullYear();
        let month = d.getMonth(); // 0-indexed

        if (d.getDate() >= fiscalDay) {
            month++;
            if (month > 11) {
                month = 0;
                year++;
            }
        }
        return `${year}-${String(month + 1).padStart(2, '0')}`;
    }

    function updateAhorroGastosMonthLabel() {
        try {
            const fiscalMonthStr = getFiscalMonth();
            const parts = fiscalMonthStr.split('-');
            const monthIdx = parseInt(parts[1], 10) - 1; // 0-indexed
            
            const monthNames = [
                'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
            ];
            const capitalizedMonth = monthNames[monthIdx] || 'Mes';
            
            // Use direct query to ensure findings
            const sidebarLabel = document.getElementById('ahorroGastosMonthName');
            const titleLabel = document.getElementById('ahorroGastosTitleMonth');
            
            if (sidebarLabel) sidebarLabel.textContent = capitalizedMonth;
            if (titleLabel) titleLabel.textContent = capitalizedMonth;
        } catch (e) {
            console.error("Error updating month label:", e);
        }
    }

    /**
     * returns {start: Date, end: Date} for the week containing refDateStr,
     * anchored to the fiscal month starting on fiscalDay.
     */
    function getAhorroWeekRange(refDateStr) {
        if (!refDateStr) return { start: new Date(), end: new Date() };
        const ref = refDateStr.length === 7 ? new Date(refDateStr + "-01") : new Date(refDateStr);
        if (isNaN(ref.getTime())) return { start: new Date(), end: new Date() };
        
        let fsY, fsM; 
        const rY = ref.getFullYear(), rM = ref.getMonth();
        if (ref.getDate() >= fiscalDay) { 
            fsY = rY; fsM = rM; 
        } else { 
            const p = new Date(rY, rM-1, 1); 
            fsY = p.getFullYear(); fsM = p.getMonth(); 
        }
        const fsT = new Date(fsY, fsM, fiscalDay).getTime();
        const daysDiff = Math.floor((ref.getTime() - fsT) / (24 * 60 * 60 * 1000));
        const weeksSince = Math.floor(daysDiff / 7);
        const s = new Date(fsT + (weeksSince * 7 * 24 * 60 * 60 * 1000)); 
        s.setHours(0,0,0,0);
        const e = new Date(s.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);
        return { start: s, end: e };
    }

    function isDateInAhorroWeek(dateInput, refDateStr) {
        if (!dateInput || !refDateStr) return false;
        const { start, end } = getAhorroWeekRange(refDateStr);
        const d = new Date(dateInput);
        if (isNaN(d.getTime()) || isNaN(start.getTime())) return false;
        return d >= start && d <= end;
    }

    function formatFiscalMonth(isoMonth, includeRange = true) {
        if (!isoMonth || typeof isoMonth !== 'string' || !isoMonth.includes('-')) return isoMonth || '---';
        const [year, month] = isoMonth.split('-').map(Number);
        const date = new Date(year, month - 1, 1);
        if (isNaN(date.getTime())) return isoMonth;
        
        const monthNameStr = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
        let result = monthNameStr.charAt(0).toUpperCase() + monthNameStr.slice(1);

        if (includeRange && fiscalDay > 1) {
            // Fiscal Month MM starts on day fiscalDay of month MM-1
            const start = new Date(year, month - 2, fiscalDay);
            const end = new Date(year, month - 1, fiscalDay - 1);
            if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
                const fmt = d => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                result += ` (${fmt(start)} - ${fmt(end)})`;
            }
        }
        return result;
    }

    // Nomina State
    function migrateNominaData(data) {
        return data.map(concept => {
            // Migration to movements structure
            if (concept.amount !== undefined && concept.movements === undefined) {
                concept = {
                    ...concept,
                    id: concept.id || Date.now() + Math.random(),
                    balance: Number(concept.amount),
                    movements: [{
                        id: Date.now() + Math.random(),
                        date: new Date().toISOString().split('T')[0],
                        amount: Number(concept.amount),
                        description: 'Saldo inicial',
                        concept: 'Saldo inicial',
                        paid: true,
                        activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
                    }]
                };
                delete concept.amount;
            }
            // Ensure icon exists
            // Ensure fiscalMonth exists for all movements and convert to activeMonths array
            if (concept.movements) {
                concept.movements = concept.movements.map(m => {
                    if (!m.activeMonths) {
                        if (m.fiscalMonth) {
                            const monthNum = parseInt(m.fiscalMonth.split('-')[1]);
                            m.activeMonths = [monthNum];
                        } else if (isProvision(m)) {
                            m.activeMonths = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
                        } else {
                            const d = new Date(m.date);
                            let monthNum = d.getMonth() + 1;
                            if (d.getDate() >= 25) monthNum = (monthNum % 12) + 1;
                            m.activeMonths = [monthNum];
                        }
                    }
                    if (!m.concept && m.description) m.concept = m.description;
                    if (!m.description && m.concept) m.description = m.concept;
                    if (!m.id) m.id = Date.now() + Math.random();
                    if (m.paid === undefined) m.paid = false;
                    return m;
                });
            }

            // Categorization fallback for older drawers or transition to correct types
            // Purge automatic drawer movements to ensure they are never persisted
            if (concept.isAutomatic) {
                concept.movements = [];
            } else {
                if (!concept.type) {
                    const isNominaName = concept.name?.toLowerCase().includes('nomina') || concept.name?.toLowerCase().includes('nómina');
                    const hasEverHadExpenses = (concept.movements || []).some(m => !isProvision(m) && m.amount < 0);
    
                    if (isNominaName) {
                        concept.type = 'income';
                    } else {
                        // Transition to 'saving' if it has no expenses
                        concept.type = hasEverHadExpenses ? 'expense' : 'saving';
                    }
                }
            }
            return concept;
        });
    }

    let rawNomina = (window.loadNomina) ? (window.loadNomina() || []) : [];
    if (!Array.isArray(rawNomina)) rawNomina = [];
    let nominaData = migrateNominaData(rawNomina);
    if (window.saveNomina) window.saveNomina(nominaData);

    // Helper for month navigation
    const changeMonthVal = (current, delta) => {
        let [y, m] = current.split('-').map(Number);
        m += delta;
        if (m > 12) { y++; m = 1; }
        else if (m < 1) { y--; m = 12; }
        return `${y}-${String(m).padStart(2, '0')}`;
    };

    // DOM Elements
    const stockTableBody = document.getElementById('stockTableBody');
    const emptyState = document.getElementById('emptyState');

    const elements = {
        totalInvested: document.getElementById('totalInvested'),
        totalValue: document.getElementById('totalValue'),
        totalPL: document.getElementById('totalPL'),
        totalTrend: document.getElementById('totalTrend'),
        addStockBtn: document.getElementById('addStockBtn'),
        bolsaAddStockBtn: document.getElementById('bolsaAddStockBtn'),
        bolsaDataSourceToggleBtn: document.getElementById('bolsaDataSourceToggleBtn'),
        dataSourceIcon: document.getElementById('dataSourceIcon'),
        dataSourceLabel: document.getElementById('dataSourceLabel'),
        bolsaManualPriceBtn: document.getElementById('bolsaManualPriceBtn'),
        manualPriceBadge: document.getElementById('manualPriceBadge'),
        manualPriceModal: document.getElementById('manualPriceModal'),
        manualPriceList: document.getElementById('manualPriceList'),
        saveManualPricesBtn: document.getElementById('saveManualPricesBtn'),
        clearManualPricesBtn: document.getElementById('clearManualPricesBtn'),
        closeManualPriceModal: document.getElementById('closeManualPriceModal'),
        addStockModal: document.getElementById('addStockModal'),
        closeModal: document.getElementById('closeAddStockModal'),
        addStockForm: document.getElementById('addStockForm'),
        tickerInput: document.getElementById('tickerInput'),
        marketSelect: document.getElementById('marketSelect'),
        dateInput: document.getElementById('dateInput'),
        qtyInput: document.getElementById('qtyInput'),
        priceInput: document.getElementById('priceInput'),
        fundSourceSelect: document.getElementById('fundSourceSelect'),
        filterTabs: document.querySelectorAll('.tab'),
        searchResults: document.getElementById('searchResults'),
        fxIndicator: document.getElementById('fxIndicator'),
        liveStatus: document.getElementById('liveStatus'),
        editId: document.getElementById('editId'),
        modalTitle: document.getElementById('modalTitle'),
        submitStockBtn: document.getElementById('submitStockBtn'),
        stockSourceInfoGroup: document.getElementById('stockSourceInfoGroup'),
        stockSourceInfoDisplay: document.getElementById('stockSourceInfoDisplay'),
        fundSourceGroup: document.getElementById('fundSourceGroup'),
        exportDataBtn: document.getElementById('exportDataBtn'),
        importDataBtn: document.getElementById('importDataBtn'),
        mobileAddStockBtn: document.getElementById('mobileAddStockBtn'),
        navItems: document.querySelectorAll('.nav-item'),
        // Export Logic Simplified to direct CSV
        closeExportModal: document.querySelector('.close-export-modal'), // Keep for safety if still used in CSS or other places

        // Financial Details Elements
        financialDetailsModal: document.getElementById('financialDetailsModal'),
        closeFinModal: document.getElementById('closeFinModal'),
        financialModalTitle: document.getElementById('financialModalTitle'),
        financialModalTicker: document.getElementById('financialModalTicker'),
        finLastDiv: document.getElementById('finLastDiv'),
        finNextDiv: document.getElementById('finNextDiv'),
        finExDiv: document.getElementById('finExDiv'),
        finYield: document.getElementById('finYield'),
        finPE: document.getElementById('finPE'),
        finPB: document.getElementById('finPB'),
        finPS: document.getElementById('finPS'),
        finEPS: document.getElementById('finEPS'),
        finPayDiv: document.getElementById('finPayDiv'),
        chartContainer: document.getElementById('chartContainer'),
        timeTabs: document.querySelectorAll('.time-tab'),

        // Auth Elements
        sidebarSyncInfo: document.getElementById('sidebarSyncInfo'),
        lastSyncTime: document.getElementById('lastSyncTime'),

        loginOverlay: document.getElementById('loginOverlay'),
        mainApp: document.getElementById('appMain'),
        loginForm: document.getElementById('loginForm'),
        usernameInput: document.getElementById('usernameInput'),
        passwordInput: document.getElementById('passwordInput'),
        loginError: document.getElementById('loginError'),

        // Technical Analysis Elements
        techTrend: document.getElementById('techTrend'),
        techSupport: document.getElementById('techSupport'),
        techResistance: document.getElementById('techResistance'),
        techBuyRange: document.getElementById('techBuyRange'),
        techStop: document.getElementById('techStop'),
        techVolatility: document.getElementById('techVolatility'),
        techMA: document.getElementById('techMA'),
        techPatterns: document.getElementById('techPatterns'),

        ahorroListMonthItem: document.getElementById('ahorroListMonthItem'),
        welcomeOverlay: document.getElementById('welcomeOverlay'),
        welcomeGreeting: document.getElementById('welcomeGreeting'),
        welcomeDateTime: document.getElementById('welcomeDateTime'),
        welcomeNextcloudGroup: document.getElementById('welcomeNextcloudGroup'),
        welcomeNextcloudTime: document.getElementById('welcomeNextcloudTime'),
        welcomeEnterBtn: document.getElementById('welcomeEnterBtn'),
        connStatusDot: document.getElementById('connStatusDot'),
        marketStatusIcon: document.getElementById('marketStatusIcon'),
        manualRefreshBtn: document.getElementById('manualRefreshBtn'),
        portfolioPieChart: document.getElementById('portfolioPieChart'),
        bolsaSummarySection: document.getElementById('bolsaSummarySection'),
        ahorroSummarySection: document.getElementById('ahorroSummarySection'),

        // Savings Elements
        navItems: document.querySelectorAll('.nav-item'),
        bolsaSection: document.getElementById('bolsaSection'),
        ahorroSection: document.getElementById('ahorroSection'),
        misCajonesTitle: document.getElementById('misCuentasTitle'),
        drawersGrid: document.getElementById('drawersGrid'),
        addDrawerBtn: document.getElementById('addAccountBtn'),
        exportSavingsBtn: document.getElementById('exportSavingsBtn'),

        // Savings Modal Elements
        savingsInputModal: document.getElementById('savingsInputModal'),
        addDrawerBtn: document.getElementById('addAccountBtn'),
        ahorroViewToggleBtn: document.getElementById('ahorroViewToggleBtn'),
        ahorroTableContainer: document.getElementById('ahorroTableContainer'),
        ahorroTableBody: document.getElementById('ahorroTableBody'),
        ahorroCurrentMonthLabel: document.getElementById('ahorroCurrentMonthLabel'),
        prevAhorroMonthBtn: document.getElementById('prevAhorroMonthBtn'),
        nextAhorroMonthBtn: document.getElementById('nextAhorroMonthBtn'),
        savingsModalTitle: document.getElementById('savingsModalTitle'),
        closeSavingsModal: document.getElementById('closeSavingsModal'),
        savingsTargetId: document.getElementById('savingsTargetId'),
        savingsActionType: document.getElementById('savingsActionType'),
        drawerNameInput: document.getElementById('drawerNameInput'),
        drawerNameGroup: document.getElementById('drawerNameGroup'),
        drawerGroupInput: document.getElementById('drawerGroupInput'),
        drawerGroupGroup: document.getElementById('drawerGroupGroup'),
        existingGroupsDatalist: document.getElementById('existingGroups'),
        movementAmountInput: document.getElementById('movementAmountInput'),
        movementConceptInput: document.getElementById('movementConceptInput'),
        movementConceptGroup: document.getElementById('movementConceptGroup'),
        transferTargetGroup: document.getElementById('transferTargetGroup'),
        transferTargetSelect: document.getElementById('transferTargetSelect'),
        mobileActionBar: document.getElementById('mobileActionBar'),
        privacyToggleBtn: document.getElementById('privacyToggleBtn'),
        mobilePrivacyToggleBtn: document.getElementById('mobilePrivacyToggleBtn'),
        savingsInputForm: document.getElementById('savingsInputForm'),

        // Ahorro Estado Elements
        ahorroEstadoSection: document.getElementById('ahorroEstadoSection'),
        ahorroEstadoMonthUp: document.getElementById('ahorroEstadoMonthUp'),
        ahorroEstadoMonthDown: document.getElementById('ahorroEstadoMonthDown'),
        ahorroEstadoMonthLabel: document.getElementById('ahorroEstadoMonthLabel'),
        ahorroEstadoYearUp: document.getElementById('ahorroEstadoYearUp'),
        ahorroEstadoYearDown: document.getElementById('ahorroEstadoYearDown'),
        ahorroEstadoYearLabel: document.getElementById('ahorroEstadoYearLabel'),
        ahorroEstadoChartHeader: document.getElementById('ahorroEstadoChartHeader'),
        ahorroEstadoChartToggleIcon: document.getElementById('ahorroEstadoChartToggleIcon'),
        ahorroEstadoChartContent: document.getElementById('ahorroEstadoChartContent'),
        ahorroEstadoShowIncome: document.getElementById('ahorroEstadoShowIncome'),
        ahorroEstadoShowExpenses: document.getElementById('ahorroEstadoShowExpenses'),
        ahorroEstadoPieChart: document.getElementById('ahorroEstadoPieChart'),
        ahorroEstadoTableBody: document.getElementById('ahorroEstadoTableBody'),
        ahorroEstadoChartTitle: document.getElementById('ahorroEstadoChartTitle'),

        // Savings Calendar Elements
        savingsCalendarModal: document.getElementById('savingsCalendarModal'),
        closeCalendarModal: document.getElementById('closeCalendarModal'),
        calendarGrid: document.getElementById('calendarGrid'),
        calendarCurrentMonth: document.getElementById('calendarCurrentMonth'),
        prevCalendarMonth: document.getElementById('prevCalendarMonth'),
        nextCalendarMonth: document.getElementById('nextCalendarMonth'),
        calendarModalTitle: document.getElementById('calendarModalTitle'),
        savingsMovementIndex: document.getElementById('savingsMovementIndex'),
        savingsMovementTypeContainer: document.getElementById('savingsMovementTypeContainer'),
        savingsMovementIncomeToggle: document.getElementById('savingsMovementIncomeToggle'),
        savingsMovementExpenseToggle: document.getElementById('savingsMovementExpenseToggle'),
        savingsMovementType: document.getElementById('savingsMovementType'),
        savingsMovementTypeHint: document.getElementById('savingsMovementTypeHint'),
        savingsDateInput: document.getElementById('savingsDateInput'),
        drawerInfoGroup: document.getElementById('drawerInfoGroup'),
        drawerInfoDisplay: document.getElementById('drawerInfoDisplay'),

        // Global Savings Calendar Elements
        ahorroCalendarBtn2: document.getElementById('ahorroCalendarBtn2'),
        ahorroCalendarSection: document.getElementById('ahorroCalendarSection'),
        ahorroGlobalCalendarMonthUp: document.getElementById('ahorroGlobalCalendarMonthUp'),
        ahorroGlobalCalendarMonthDown: document.getElementById('ahorroGlobalCalendarMonthDown'),
        ahorroGlobalCalendarMonthLabel: document.getElementById('ahorroGlobalCalendarMonthLabel'),
        ahorroGlobalCalendarYearUp: document.getElementById('ahorroGlobalCalendarYearUp'),
        ahorroGlobalCalendarYearDown: document.getElementById('ahorroGlobalCalendarYearDown'),
        ahorroGlobalCalendarYearLabel: document.getElementById('ahorroGlobalCalendarYearLabel'),
        ahorroGlobalCalendarGrid: document.getElementById('ahorroGlobalCalendarGrid'),
        ahorroGlobalCalendarDrawerFilter: document.getElementById('ahorroGlobalCalendarDrawerFilter'),
        ahorroGlobalCalendarTotalBalance: document.getElementById('ahorroGlobalCalendarTotalBalance'),

        // Ahorro Historico Elements
        ahorroHistoricoSection: document.getElementById('ahorroHistoricoSection'),
        ahorroHistoricoChart: document.getElementById('ahorroHistoricoChart'),
        ahorroHistoricoTableBody: document.getElementById('ahorroHistoricoTableBody'),
        ahorroHistoricoBtn2: document.getElementById('ahorroHistoricoBtn2'),
        historicoModeMonth: document.getElementById('historicoModeMonth'),
        historicoModeYear: document.getElementById('historicoModeYear'),

        // Nomina Elements
        nominaSection: document.getElementById('nominaSection'),
        nominaGrid: document.getElementById('nominaGrid'),
        nominaGridContainer: document.getElementById('nominaGridContainer'),
        nominaAnalisisViewBtn: document.getElementById('nominaAnalisisViewBtn'),
        nominaViewToggleBtn: document.getElementById('nominaViewToggleBtn'),
        nominaTableContainer: document.getElementById('nominaTableContainer'),
        nominaTableBody: document.getElementById('nominaTableBody'),
        nominaCurrentMonthLabel: document.getElementById('nominaCurrentMonthLabel'),
        prevNominaMonthBtn: document.getElementById('prevNominaMonthBtn'),
        nextNominaMonthBtn: document.getElementById('nextNominaMonthBtn'),
        totalNominaIncome: document.getElementById('totalNominaIncome'),
        incomeCard: document.getElementById('incomeCard'),
        totalNominaExpense: document.getElementById('totalNominaExpense'),
        totalNominaUndestined: document.getElementById('totalNominaUndestined'),
        paydayDate: document.getElementById('paydayDate'),
        paydayCountdown: document.getElementById('paydayCountdown'),
        currentFiscalMonthDisplay: document.getElementById('currentFiscalMonthDisplay'),
        totalNominaSaving: document.getElementById('totalNominaSaving'),
        totalNominaNetSaving: document.getElementById('totalNominaNetSaving'),
        netSavingCard: document.getElementById('netSavingCard'),
        nominaMonthsCheckboxes: document.getElementById('nominaMonthsCheckboxes'),
        selectAllMonths: document.getElementById('selectAllMonths'),
        addNominaBtn: document.getElementById('addNominaBtn'),
        nominaDrawerMonthsCheckboxes: document.getElementById('nominaDrawerMonthsCheckboxes'),
        selectAllDrawerMonths: document.getElementById('selectAllDrawerMonths'),
        exportNominaBtn: document.getElementById('exportNominaBtn'),
        fiscalCountdownBtn: document.getElementById('fiscalCountdownBtn'),
        fiscalDaysLeft: document.getElementById('fiscalDaysLeft'),
        fiscalCalendarModal: document.getElementById('fiscalCalendarModal'),
        fiscalCalendarContent: document.getElementById('fiscalCalendarContent'),
        closeFiscalCalendarModal: document.getElementById('closeFiscalCalendarModal'),
        // importNominaBtn and nominaCsvInput removed as per request

        // Nomina Modal Elements
        nominaModal: document.getElementById('nominaModal'),
        nominaForm: document.getElementById('nominaForm'),
        nominaLinkedAhorroSelect: document.getElementById('nominaLinkedAhorroSelect'),
        nominaModalTitle: document.getElementById('nominaModalTitle'),
        closeNominaModal: document.getElementById('closeNominaModal'),
        nominaEditId: document.getElementById('nominaEditId'),
        nominaNameInput: document.getElementById('nominaNameInput'),
        nominaAmountInput: document.getElementById('nominaAmountInput'),
        nominaTypeSelect: document.getElementById('nominaTypeSelect'),

        // Nomina Movement Elements
        nominaMovementModal: document.getElementById('nominaMovementModal'),

        // Analisis Elements
        analisisSection: document.getElementById('analisisSection'),
        totalYearlyIncome: document.getElementById('totalYearlyIncome'),
        totalYearlyExpense: document.getElementById('totalYearlyExpense'),
        totalYearlyNetSaving: document.getElementById('totalYearlyNetSaving'),
        analisisTableBody: document.getElementById('analisisTableBody'),
        analisisDeficitContainer: document.getElementById('analisisDeficitContainer'),
        analisisChart: document.getElementById('analisisChart'),
        analisisTableContainer: document.getElementById('analisisTableContainer'),
        analisisGrid: document.getElementById('analisisGrid'),
        analisisTableViewBtn: document.getElementById('analisisTableViewBtn'),
        analisisCardViewBtn: document.getElementById('analisisCardViewBtn'),
        analisisMobileTitle: document.getElementById('analisisMobileTitle'),
        totalYearlyIncome: document.getElementById('totalYearlyIncome'),
        totalYearlyExpense: document.getElementById('totalYearlyExpense'),
        totalYearlyNetSaving: document.getElementById('totalYearlyNetSaving'),
        nominaMovementForm: document.getElementById('nominaMovementForm'),
        nominaMovementModalTitle: document.getElementById('nominaMovementModalTitle'),
        closeNominaMovementModal: document.getElementById('closeNominaMovementModal'),
        nominaMovementTargetId: document.getElementById('nominaMovementTargetId'),
        nominaMovementEditIndex: document.getElementById('nominaMovementEditIndex'),
        nominaMovementAmountInput: document.getElementById('nominaMovementAmountInput'),
        nominaMovementConceptInput: document.getElementById('nominaMovementConceptInput'),
        nominaMovementTypeContainer: document.getElementById('nominaMovementTypeContainer'),
        nominaMovementIncomeToggle: document.getElementById('nominaMovementIncomeToggle'),
        nominaMovementExpenseToggle: document.getElementById('nominaMovementExpenseToggle'),
        nominaMovementType: document.getElementById('nominaMovementType'),
        nominaMovementTypeHint: document.getElementById('nominaMovementTypeHint'),

        // Nomina History Elements
        nominaHistoryModal: document.getElementById('nominaHistoryModal'),
        nominaHistoryTitle: document.getElementById('nominaHistoryTitle'),
        closeNominaHistoryModal: document.getElementById('closeNominaHistoryModal'),
        nominaMovementsList: document.getElementById('nominaMovementsList'),

        // Global Backup Elements
        globalExportBtn: document.getElementById('globalExportBtn'),
        globalImportBtn: document.getElementById('globalImportBtn'),
        globalJsonInput: document.getElementById('globalJsonInput'),

        // Month Detail Modal Elements
        monthDetailModal: document.getElementById('monthDetailModal'),
        monthDetailTitle: document.getElementById('monthDetailTitle'),
        closeMonthDetailModal: document.getElementById('closeMonthDetailModal'),
        monthDetailContent: document.getElementById('monthDetailContent'),
        bolsaGrid: document.getElementById('bolsaGrid'),
        bolsaViewToggleBtn: document.getElementById('bolsaViewToggleBtn'),
        bolsaBreakdownBtn: document.getElementById('bolsaBreakdownBtn'),
        bolsaHighlights: document.getElementById('bolsaHighlights'),
        bolsaHighlightsToggleBtn: document.getElementById('bolsaHighlightsToggleBtn'),

        stockTable: document.getElementById('stockTable'),
        savingsCategoryGroup: document.getElementById('savingsCategoryGroup'),
        savingsCategorySelect: document.getElementById('savingsCategorySelect'),
        savingsSubcategoryGroup: document.getElementById('savingsSubcategoryGroup'),
        savingsSubcategorySelect: document.getElementById('savingsSubcategorySelect'),
        ahorroFilterMode: document.getElementById('ahorroFilterMode'),
        ahorroListFilterMode: document.getElementById('ahorroListFilterMode'),

        nominaListFilterMode: document.getElementById('nominaListFilterMode'),

        // Settings Modal Elements
        settingsBtn: document.getElementById('settingsBtn'),
        mobileSettingsBtn: document.getElementById('mobileSettingsBtn'),
        settingsModal: document.getElementById('settingsModal'),
        closeSettingsModal: document.getElementById('closeSettingsModal'),
        settingsForm: document.getElementById('settingsForm'),
        fiscalDayInput: document.getElementById('fiscalDayInput'),
        defaultTransferSourceSelect: document.getElementById('defaultTransferSourceSelect'),
        forceUpdateBtn: document.getElementById('forceUpdateBtn'),

        // Categories Modal Elements
        sidebarCategoriesBtn: document.getElementById('sidebarCategoriesBtn'),
        categoriesModal: document.getElementById('categoriesModal'),
        closeCategoriesModal: document.getElementById('closeCategoriesModal'),
        incomeCategoriesContainer: document.getElementById('incomeCategoriesContainer'),
        expenseCategoriesContainer: document.getElementById('expenseCategoriesContainer'),
        addIncomeCategoryBtn: document.getElementById('addIncomeCategoryBtn'),
        addExpenseCategoryBtn: document.getElementById('addExpenseCategoryBtn'),
        saveCategoriesBtn: document.getElementById('saveCategoriesBtn'),
        transferToAhorroModal: document.getElementById('transferToAhorroModal'),
        closeTransferModal: document.getElementById('closeTransferModal'),
        transferToAhorroForm: document.getElementById('transferToAhorroForm'),
        transferSourceDrawerId: document.getElementById('transferSourceDrawerId'),
        transferSourceDrawerName: document.getElementById('transferSourceDrawerName'),
        transferTargetDrawerName: document.getElementById('transferTargetDrawerName'),
        transferAmountInput: document.getElementById('transferAmountInput'),
        transferDateInput: document.getElementById('transferDateInput'),
        transferCategorySelect: document.getElementById('transferCategorySelect'),
        transferSubcategorySelect: document.getElementById('transferSubcategorySelect'),
        cancelTransferBtn: document.getElementById('cancelTransferBtn'),

        // Subcategories Modal Elements
        sidebarSubcategoriesBtn: document.getElementById('sidebarSubcategoriesBtn'),
        subcategoriesModal: document.getElementById('subcategoriesModal'),
        closeSubcategoriesModal: document.getElementById('closeSubcategoriesModal'),
        incomeSubcategoriesContainer: document.getElementById('incomeSubcategoriesContainer'),
        expenseSubcategoriesContainer: document.getElementById('expenseSubcategoriesContainer'),
        addIncomeSubcategoryBtn: document.getElementById('addIncomeSubcategoryBtn'),
        addExpenseSubcategoryBtn: document.getElementById('addExpenseSubcategoryBtn'),
        saveSubcategoriesBtn: document.getElementById('saveSubcategoriesBtn'),

        // Goal Modal
        goalModal: document.getElementById('goalModal'),
        closeGoalModal: document.getElementById('closeGoalModal'),
        goalForm: document.getElementById('goalForm'),
        goalAmountInput: document.getElementById('goalAmountInput'),
        goalModalDescription: document.getElementById('goalModalDescription'),

        // Breakdown Modal
        ahorroBreakdownBtn: document.getElementById('ahorroBreakdownBtn'),
        ahorroBreakdownModal: document.getElementById('ahorroBreakdownModal'),
        closeBreakdownModal: document.getElementById('closeBreakdownModal'),
        breakdownFilterType: document.getElementById('breakdownFilterType'),
        breakdownMonthInput: document.getElementById('breakdownMonthInput'),
        breakdownYearInput: document.getElementById('breakdownYearInput'),
        breakdownIntereses: document.getElementById('breakdownIntereses'),
        breakdownDividendos: document.getElementById('breakdownDividendos'),
        breakdownEspeculacion: document.getElementById('breakdownEspeculacion'),
        breakdownTotal: document.getElementById('breakdownTotal'),
        breakdownModalTitle: document.getElementById('breakdownModalTitle'),
        breakdownDetailContainer: document.getElementById('breakdownDetailContainer'),
        breakdownDetailTitle: document.getElementById('breakdownDetailTitle'),
        breakdownDetailList: document.getElementById('breakdownDetailList'),
        breakdownMonthUp: document.getElementById('breakdownMonthUp'),
        breakdownMonthDown: document.getElementById('breakdownMonthDown'),
        breakdownYearUp: document.getElementById('breakdownYearUp'),
        breakdownYearDown: document.getElementById('breakdownYearDown'),
        breakdownMonthContainer: document.getElementById('breakdownMonthContainer'),
        breakdownYearContainer: document.getElementById('breakdownYearContainer'),
        breakdownBolsaPctContainer: document.getElementById('breakdownBolsaPctContainer'),
        breakdownBolsaPct: document.getElementById('breakdownBolsaPct'),
        breakdownBolsaInvested: document.getElementById('breakdownBolsaInvested'),

        // Global Activity Elements
        logoBtn: document.getElementById('logoBtn'),
        activitySection: document.getElementById('activitySection'),
        activityTable: document.getElementById('activityTable'),
        activityTableBody: document.getElementById('activityTableBody'),
        activityMonthLabel: document.getElementById('activityMonthLabel'),
        activityMonthUp: document.getElementById('activityMonthUp'),
        activityMonthDown: document.getElementById('activityMonthDown'),
        activityFilterMode: document.getElementById('activityFilterMode'),
        activitySearchInput: document.getElementById('activitySearchInput'),
        activityDrawerFilter: document.getElementById('activityDrawerFilter'),
        activityLoadMoreBtn: document.getElementById('activityLoadMoreBtn'),
        activityPaginationContainer: document.getElementById('activityPaginationContainer'),
        activityPaginationInfo: document.getElementById('activityPaginationInfo'),
        activityStockFilters: document.getElementById('activityStockFilters'),
        // New Nav Elements
        wealthSidebar: document.getElementById('wealthSidebar'),
        sidebarOverlay: document.getElementById('sidebarOverlay'),
        mobileMoreBtn: document.getElementById('mobileMoreBtn'),
        mobileMenuBtn: document.getElementById('mobileMenuBtn'),
        sidebarPrivacyToggleBtn: document.getElementById('sidebarPrivacyToggleBtn'),
        sidebarSettingsBtn: document.getElementById('sidebarSettingsBtn'),
        sidebarExportBtn: document.getElementById('sidebarExportBtn'),
        sidebarImportBtn: document.getElementById('sidebarImportBtn'),
        bottomNav: document.getElementById('bottomNavHub'),
        sidebarClockBtn: document.getElementById('sidebarClockBtn'),
        sidebarResetBtn: document.getElementById('sidebarResetBtn'),
        sidebarMigrateInversionsBtn: document.getElementById('sidebarMigrateInversionsBtn'),
        sidebarDeleteAllBtn: document.getElementById('sidebarDeleteAllBtn'),
        sidebarActivityBtn: document.getElementById('sidebarActivityBtn'),
        wealthNavItems: document.querySelectorAll('.wealth-nav-item, .submenu-item'),
        bottomNavItems: document.querySelectorAll('.bottom-nav-item'),
        // Google Drive Elements (removed)
        drawerIconGroup: document.getElementById('drawerIconGroup'),
        drawerIconInput: document.getElementById('drawerIconInput'),
        nominaIconGroup: document.getElementById('nominaIconGroup'),
        nominaIconInput: document.getElementById('nominaIconInput'),
        smartConceptToggle: document.getElementById('smartConceptToggle'),
        historicConceptsDatalist: document.getElementById('historicConcepts'),
        storageUsageBar: document.getElementById('storageUsageBar'),
        storageUsageText: document.getElementById('storageUsageText'),
        addNewCategoryBtn: document.getElementById('addNewCategoryBtn'),
        addNewSubcategoryBtn: document.getElementById('addNewSubcategoryBtn'),

        // Bolsa Calendar Elements
        bolsaCalendarBtn2: document.getElementById('bolsaCalendarBtn2'),
        bolsaCalendarModal: document.getElementById('bolsaCalendarModal'),
        closeBolsaCalendarModal: document.getElementById('closeBolsaCalendarModal'),
        bottomNavModeInput: document.getElementById('bottomNavModeInput'),
        fiscalDayInput: document.getElementById('fiscalDayInput'),
        bolsaCalendarGrid: document.getElementById('bolsaCalendarGrid'),
        bolsaCalendarCurrentMonth: document.getElementById('bolsaCalendarCurrentMonth'),
        prevBolsaCalendarMonth: document.getElementById('prevBolsaCalendarMonth'),
        nextBolsaCalendarMonth: document.getElementById('nextBolsaCalendarMonth'),

        // Ahorro Estado Elements
        ahorroEstadoSection: document.getElementById('ahorroEstadoSection'),
        ahorroEstadoMonthUp: document.getElementById('ahorroEstadoMonthUp'),
        ahorroEstadoMonthDown: document.getElementById('ahorroEstadoMonthDown'),
        ahorroEstadoYearUp: document.getElementById('ahorroEstadoYearUp'),
        ahorroEstadoYearDown: document.getElementById('ahorroEstadoYearDown'),
        ahorroEstadoMonthLabel: document.getElementById('ahorroEstadoMonthLabel'),
        ahorroEstadoYearLabel: document.getElementById('ahorroEstadoYearLabel'),
        ahorroEstadoTotalIncome: document.getElementById('ahorroEstadoTotalIncome'),
        ahorroEstadoTotalExpense: document.getElementById('ahorroEstadoTotalExpense'),
        ahorroEstadoShowIncome: document.getElementById('ahorroEstadoShowIncome'),
        ahorroEstadoShowExpenses: document.getElementById('ahorroEstadoShowExpenses'),
        ahorroEstadoChartTitle: document.getElementById('ahorroEstadoChartTitle'),
        ahorroEstadoPieChart: document.getElementById('ahorroEstadoPieChart'),
        ahorroEstadoTableBody: document.getElementById('ahorroEstadoTableBody'),
        recurringMovementsBtn: document.getElementById('recurringMovementsBtn2'),
        recurringMovementsModal: document.getElementById('recurringMovementsModal'),
        recurringMovementsList: document.getElementById('recurringMovementsList'),
        executeRecurringMovementsBtn: document.getElementById('executeRecurringMovementsBtn'),
        savingsRecurringInput: document.getElementById('savingsRecurringInput'),
        closeRecurringMovementsModal: document.getElementById('closeRecurringMovementsModal'),
        
        // Ahorro Gastos View
        ahorroGastosSection: document.getElementById('ahorroGastosSection'),
        ahorroGastosBtn2: document.getElementById('ahorroGastosBtn2'),
        ahorroGastosMonthName: document.getElementById('ahorroGastosMonthName'),
        ahorroGastosTitleMonth: document.getElementById('ahorroGastosTitleMonth'),
        totalRealizedExpenses: document.getElementById('totalRealizedExpenses'),
        totalPendingExpenses: document.getElementById('totalPendingExpenses'),
        estimatedFinalBalance: document.getElementById('estimatedFinalBalance'),
        ahorroGastosRealizedList: document.getElementById('ahorroGastosRealizedList'),
        ahorroGastosPendingList: document.getElementById('ahorroGastosPendingList')
    };

    const updateNominaMovementType = (type) => {
        if (!elements.nominaMovementType) return;
        elements.nominaMovementType.value = type;
        const isIncome = type === 'income';

        if (elements.nominaMovementIncomeToggle) {
            elements.nominaMovementIncomeToggle.style.background = isIncome ? 'var(--primary)' : 'rgba(59, 130, 246, 0.05)';
            elements.nominaMovementIncomeToggle.style.color = isIncome ? 'white' : 'inherit';
        }
        if (elements.nominaMovementExpenseToggle) {
            elements.nominaMovementExpenseToggle.style.background = !isIncome ? 'var(--primary)' : 'rgba(59, 130, 246, 0.05)';
            elements.nominaMovementExpenseToggle.style.color = !isIncome ? 'white' : 'inherit';
        }
        if (elements.nominaMovementTypeHint) {
            elements.nominaMovementTypeHint.textContent = `Este movimiento se contará como un ${isIncome ? 'ingreso (valor positivo)' : 'gasto (valor negativo)'}.`;
        }
    };

    const updateSavingsMovementType = (type) => {
        if (!elements.savingsMovementType) return;
        elements.savingsMovementType.value = type;
        const isIncome = type === 'income';

        if (elements.savingsMovementIncomeToggle) {
            elements.savingsMovementIncomeToggle.style.background = isIncome ? 'var(--primary)' : 'rgba(59, 130, 246, 0.05)';
            elements.savingsMovementIncomeToggle.style.color = isIncome ? 'white' : 'inherit';
        }
        if (elements.savingsMovementExpenseToggle) {
            elements.savingsMovementExpenseToggle.style.background = !isIncome ? 'var(--primary)' : 'rgba(59, 130, 246, 0.05)';
            elements.savingsMovementExpenseToggle.style.color = !isIncome ? 'white' : 'inherit';
        }
        if (elements.savingsMovementTypeHint) {
            elements.savingsMovementTypeHint.textContent = isIncome
                ? 'El importe se sumará al saldo.'
                : 'El importe se restará del saldo (se guardará como negativo).';
        }

        // Update Categories
        if (elements.savingsCategorySelect) {
            // Use dynamic categories defined in settings
            const cats = isIncome ? incomeCategories : expenseCategories;
            const subcats = isIncome ? incomeSubcategories : expenseSubcategories;

            elements.savingsCategorySelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');

            if (elements.savingsSubcategoryGroup) {
                elements.savingsSubcategoryGroup.classList.remove('hidden');
            }
            if (elements.savingsSubcategorySelect) {
                elements.savingsSubcategorySelect.innerHTML = '<option value="">-- Sin subcategoría --</option>' +
                    subcats.map(s => `<option value="${s}">${s}</option>`).join('');
            }
        }
    };

    let isSmartConceptActive = false;

    const populateHistoricConcepts = () => {
        if (!elements.historicConceptsDatalist) return;
        const conceptsMap = new Map();
        // Traverse all drawers and their movements
        savingsDrawers.forEach(drawer => {
            // Ignore Bolsa drawer
            if (drawer.id === 'bolsa') return;

            (drawer.movements || []).forEach(m => {
                const desc = (m.description || m.concept || '').trim();
                const descLower = desc.toLowerCase();
                const category = m.category || '';
                const catLower = category.toLowerCase();
                // Skip movements with Bolsa or Traspaso in category or description
                if (catLower.includes('bolsa') || catLower.includes('traspaso') || descLower.includes('traspaso')) return;

                if (desc && category) {
                    conceptsMap.set(desc.toLowerCase(), {
                        original: desc,
                        category: m.category,
                        amount: m.amount || 0,
                        drawerId: drawer.id,
                        drawerName: drawer.name
                    });
                }
            });
        });

        elements.historicConceptsDatalist.innerHTML = Array.from(conceptsMap.values())
            .map(v => `<option value="${v.original}">`)
            .join('');

        window.HISTORIC_CONCEPTS_MAP = conceptsMap;
    };

    elements.smartConceptToggle?.addEventListener('click', () => {
        isSmartConceptActive = !isSmartConceptActive;
        if (elements.smartConceptToggle) {
            elements.smartConceptToggle.style.filter = isSmartConceptActive ? 'none' : 'grayscale(1)';
            elements.smartConceptToggle.style.opacity = isSmartConceptActive ? '1' : '0.5';
            elements.smartConceptToggle.title = isSmartConceptActive ? '💡 Concepto Inteligente ACTIVADO' : 'Activar Concepto Inteligente';
        }
        if (isSmartConceptActive) {
            populateHistoricConcepts();
            showToast("Concepto Inteligente Activo: Se sugerirá Categoría y Subcategoría de otros movimientos.", "info");
        }
    });

    elements.movementConceptInput?.addEventListener('input', (e) => {
        if (!isSmartConceptActive) return;
        const val = e.target.value.trim().toLowerCase();
        const match = window.HISTORIC_CONCEPTS_MAP?.get(val);
        if (match) {
            const fullCategory = match.category; // e.g. "Compras:Visa"
            const parts = fullCategory.split(':');
            const mainCat = parts[0];
            const subCat = parts[1] || '';
            const type = (match.amount || 0) >= 0 ? 'income' : 'expense';

            // Switch type if needed
            if (elements.savingsMovementType.value !== type) {
                updateSavingsMovementType(type);
            }

            // Sync Drawer if match exists
            if (match.drawerId && elements.savingsTargetId) {
                elements.savingsTargetId.value = match.drawerId;

                // Update visible dropdown if present (global movement mode)
                const targetSelect = document.getElementById('targetDrawerSelect');
                if (targetSelect) {
                    targetSelect.value = match.drawerId;
                }

                if (elements.savingsModalTitle) {
                    elements.savingsModalTitle.textContent = `Movimiento: ${match.drawerName}`;
                }
            }

            // Sync values with a tiny delay to allow Category populate
            setTimeout(() => {
                if (elements.savingsCategorySelect) {
                    elements.savingsCategorySelect.value = mainCat;
                }
                if (elements.savingsSubcategorySelect) {
                    elements.savingsSubcategorySelect.value = subCat;
                }
            }, 50);
        }
    });

    elements.addNewCategoryBtn?.addEventListener('click', async () => {
        const type = elements.savingsMovementType?.value || 'income';
        const label = type === 'income' ? 'Nueva Categoría de Ingresos' : 'Nueva Categoría de Gastos';
        const newCat = await showCustomPrompt(label, 'Escribe el nombre...');

        if (newCat && newCat.trim()) {
            const name = newCat.trim();
            const cats = type === 'income' ? incomeCategories : expenseCategories;
            if (!cats.includes(name)) {
                cats.push(name);
                localStorage.setItem(type === 'income' ? 'incomeCategories' : 'expenseCategories', JSON.stringify(cats));
                updateSavingsMovementType(type); // Refresh labels
                if (elements.savingsCategorySelect) elements.savingsCategorySelect.value = name;
                showToast(`Categoría "${name}" añadida.`, 'success');
            } else {
                showToast(`La categoría "${name}" ya existe.`, 'warning');
                if (elements.savingsCategorySelect) elements.savingsCategorySelect.value = name;
            }
        }
    });

    elements.addNewSubcategoryBtn?.addEventListener('click', async () => {
        const type = elements.savingsMovementType?.value || 'income';
        const label = type === 'income' ? 'Nueva Subcategoría de Ingresos' : 'Nueva Subcategoría de Gastos';
        const newSub = await showCustomPrompt(label, 'Escribe el nombre...');

        if (newSub && newSub.trim()) {
            const name = newSub.trim();
            const subcats = type === 'income' ? incomeSubcategories : expenseSubcategories;
            if (!subcats.includes(name)) {
                subcats.push(name);
                localStorage.setItem(type === 'income' ? 'incomeSubcategories' : 'expenseSubcategories', JSON.stringify(subcats));
                updateSavingsMovementType(type); // Refresh
                if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = name;
                showToast(`Subcategoría "${name}" añadida.`, 'success');
            } else {
                showToast(`La subcategoría "${name}" ya existe.`, 'warning');
                if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = name;
            }
        }
    });

    // Fix the typo in elements object
    elements.savingsMovementExpenseToggle = document.getElementById('savingsMovementExpenseToggle');
    elements.savingsMovementIncomeToggle = document.getElementById('savingsMovementIncomeToggle');

    const updateStorageStatus = () => {
        if (!elements.storageUsageBar || !elements.storageUsageText) return;

        // Trigger Nextcloud auto-upload if not in initial load
        if (!isInitialLoad && typeof ncScheduleAutoUpload === 'function') {
            ncScheduleAutoUpload();
        }

        try {
            const data = getGlobalDataObject();
            const jsonString = JSON.stringify(data);
            const sizeBytes = new Blob([jsonString]).size;

            const limitBytes = 5 * 1024 * 1024;
            const limitDisplay = '5 MB';
            const percentage = Math.min((sizeBytes / limitBytes) * 100, 100);
            const sizeDisplay = sizeBytes > 1024 * 1024
                ? (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB'
                : (sizeBytes / 1024).toFixed(1) + ' KB';

            elements.storageUsageBar.style.width = percentage + '%';
            elements.storageUsageText.textContent = `${sizeDisplay} / ${limitDisplay}`;
            elements.storageUsageText.title = `Estás usando ${sizeDisplay} del límite de ${limitDisplay} (${percentage.toFixed(2)}%)`;

            if (percentage > 90) elements.storageUsageBar.style.background = 'var(--danger)';
            else if (percentage > 70) elements.storageUsageBar.style.background = 'var(--warning)';
            else elements.storageUsageBar.style.background = 'var(--primary)';
        } catch (e) {
            console.warn("Storage update skipped:", e);
        }
    };
    window.updateStorageStatus = updateStorageStatus;

    // Authentication removed as requested
    function showApp() {
        elements.loginOverlay.classList.add('hidden');
        elements.mainApp.classList.remove('hidden');
        updatePrivacyUI();
        initApp();
    }

    function togglePrivacy() {
        isPrivacyActive = !isPrivacyActive;
        localStorage.setItem('isPrivacyActive', isPrivacyActive);
        if (window.savePrivacy) window.savePrivacy(isPrivacyActive);
        updatePrivacyUI();
        render();
    }

    function updatePrivacyUI() {
        const btns = [elements.privacyToggleBtn, elements.mobilePrivacyToggleBtn];
        btns.forEach(btn => {
            if (btn) {
                btn.classList.toggle('active', isPrivacyActive);
                btn.innerHTML = isPrivacyActive ? '👁️' : '🕶️';
                btn.title = isPrivacyActive ? 'Mostrar Datos' : 'Ocultar Datos';
            }
        });

        // Update Sidebar Privacy Button with text status
        const sidebarPrivacyBtn = elements.sidebarPrivacyToggleBtn;
        if (sidebarPrivacyBtn) {
            const navText = sidebarPrivacyBtn.querySelector('.nav-text');
            if (navText) {
                navText.textContent = `Privacidad (${isPrivacyActive ? 'on' : 'off'})`;
            }
            sidebarPrivacyBtn.classList.toggle('active', isPrivacyActive);
        }
    }

    function updateSidebarTogglesUI() {
        const highlightSubmenu = (id, isActive) => {
            const btn = document.getElementById(id);
            if (btn) btn.classList.toggle('active', isActive);
        };

        const updateSubmenuBtn = (id, isActive, baseText) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const iconSpan = btn.querySelector('span:first-child');
            const icon = iconSpan ? iconSpan.outerHTML : '';
            btn.innerHTML = `${icon} ${baseText} (${isActive ? 'on' : 'off'})`;
        };

        updateSubmenuBtn('bolsaHighlightsToggleBtn2', bolsaHighlightsVisible, 'Highlights');

        // Highlighting for Bolsa submenu items
        highlightSubmenu('bolsaCardsBtn2', currentView === 'bolsa' && bolsaViewMode === 'cards');
        highlightSubmenu('bolsaListBtn2', currentView === 'bolsa' && bolsaViewMode === 'list');

        // Highlighting for Nomina submenu items
        highlightSubmenu('nominaCardsBtn2', (currentView === 'nomina' || currentView === 'analisis') && nominaViewMode === 'cards');
        highlightSubmenu('nominaListBtn2', (currentView === 'nomina' || currentView === 'analisis') && nominaViewMode === 'list');

        // Highlighting for Ahorro submenu items
        highlightSubmenu('ahorroAccountsBtn2', currentView === 'ahorro' && ahorroViewMode === 'cards');
        highlightSubmenu('ahorroListBtn2', currentView === 'ahorro' && ahorroViewMode === 'list');
        highlightSubmenu('ahorroEstadoBtn2', currentView === 'ahorroEstado');
        highlightSubmenu('ahorroCalendarBtn2', currentView === 'ahorroCalendar');
        highlightSubmenu('ahorroGastosBtn2', currentView === 'ahorroGastos');
    }

    // --- Logic ---

    function addStock(stock) {
        if (stock.id) {
            // Update existing
            const index = stocks.findIndex(s => s.id === stock.id);
            if (index !== -1) {
                stocks[index] = { ...stocks[index], ...stock };
            }
        } else {
            // Add new
            stocks.push({
                id: Date.now().toString(),
                name: stock.name || stock.ticker,
                ...stock
            });
        }
        if (window.saveStocks) window.saveStocks(stocks);
        render();
        toggleModal(false);
        elements.addStockForm.reset();
        elements.editId.value = '';
        elements.searchResults.classList.add('hidden');
        elements.dateInput.valueAsDate = new Date();
        updateStorageStatus();
    }

    function updateFundSourceSelect() {
        if (!elements.fundSourceSelect) return;
        elements.fundSourceSelect.innerHTML = '<option value="">-- Sin traspaso --</option>';
        const activeDrawers = savingsDrawers.filter(d => !d.isAuto && !d.name.toLowerCase().includes('nómina') && !d.name.toLowerCase().includes('nomina'));
        activeDrawers.forEach(d => {
            const opt = document.createElement('option');
            opt.value = d.id;
            opt.textContent = `${d.icon || ''} ${d.name} (${fmtEUR(d.balance)})`.trim();
            elements.fundSourceSelect.appendChild(opt);
        });
    }

    function editStock(id) {
        const stock = stocks.find(s => s.id === id);
        if (!stock) return;

        elements.editId.value = stock.id;
        elements.tickerInput.value = stock.ticker;
        elements.marketSelect.value = stock.market;
        elements.dateInput.value = stock.date;
        elements.qtyInput.value = stock.qty;
        elements.priceInput.value = (stock.price * stock.qty).toFixed(2);

        updateFundSourceSelect();
        if (stock.sourceDrawerId) {
            const srcDrawer = savingsDrawers.find(d => d.id === stock.sourceDrawerId);
            if (srcDrawer && elements.stockSourceInfoGroup && elements.stockSourceInfoDisplay) {
                elements.stockSourceInfoGroup.classList.remove('hidden');
                elements.stockSourceInfoDisplay.textContent = `${srcDrawer.icon || '📁'} ${srcDrawer.name}`;
                elements.fundSourceGroup?.classList.add('hidden');
            }
        } else {
            // Try to find if it was originally from a drawer by searching movements
            // This is a fallback for older entries
            let found = false;
            savingsDrawers.forEach(d => {
                const matchingMvmt = d.movements.find(m => m.concept === `Inversión en ${stock.name || stock.ticker}` && m.amount < 0 && m.date === stock.date);
                if (matchingMvmt && !found) {
                    if (elements.stockSourceInfoGroup && elements.stockSourceInfoDisplay) {
                        elements.stockSourceInfoGroup.classList.remove('hidden');
                        elements.stockSourceInfoDisplay.textContent = `${d.icon || '📁'} ${d.name}`;
                        elements.fundSourceGroup?.classList.add('hidden');
                        found = true;
                    }
                }
            });
            if (!found) {
                elements.stockSourceInfoGroup?.classList.add('hidden');
                elements.fundSourceGroup?.classList.remove('hidden');
            }
        }

        elements.modalTitle.textContent = "Editar Inversión";
        elements.submitStockBtn.textContent = "Guardar Cambios";
        toggleModal(true);
    }

    function addMoreFromStock(id) {
        const stock = stocks.find(s => s.id === id);
        if (!stock) return;

        elements.editId.value = ''; // Ensure it's a NEW stock
        elements.tickerInput.value = stock.ticker;
        const validOptions = Array.from(elements.marketSelect.options).map(o => o.value);
        elements.marketSelect.value = validOptions.includes(stock.market) ? stock.market : 'SP500';

        const today = new Date().toISOString().split('T')[0];
        if (elements.dateInput) elements.dateInput.value = today;

        elements.qtyInput.value = '';
        elements.priceInput.value = '';

        updateFundSourceSelect();
        const storedSource = localStorage.getItem('defaultTransferSource');
        if (storedSource) elements.fundSourceSelect.value = storedSource;

        elements.modalTitle.textContent = `Añadir más - ${stock.name || stock.ticker}`;
        elements.submitStockBtn.textContent = "Añadir Inversión";
        toggleModal(true);
    }

    function removeStock(id) {
        const stock = stocks.find(s => s.id === id);
        stocks = stocks.filter(s => s.id !== id);
        if (window.saveStocks) window.saveStocks(stocks);
        // Keep the group expanded if there are still entries for this ticker
        if (stock && stocks.some(s => s.ticker === stock.ticker)) {
            expandedTickers.add(stock.ticker);
        }
        render();
        updateStorageStatus();
    }

    // --- Rendering ---
    let isFirstUpdateDone = false;

    function renderAhorroGastos() {
        if (!elements.ahorroGastosSection) return;
        updateAhorroGastosMonthLabel();

        const currentFiscalMonthStr = getFiscalMonth();
        const currentMonthNum = parseInt(currentFiscalMonthStr.split('-')[1], 10);
        
        const container = document.getElementById('ahorroGastosAccountList');
        if (!container) return;
        container.innerHTML = '';
        const fragment = document.createDocumentFragment();

        // 0. Pre-assign each nomina concept to the drawer that matches it MOST specifically
        const drawerIdToConcepts = new Map();
        const drawerNameToConcepts = new Map();

        nominaData.forEach(concept => {
            const cNormalized = normalizeString(concept.name || '').trim();
            if (!cNormalized) return;

            // FIRST PRIORITY: Explicit link to a drawer ID
            if (concept.linkedSavingsDrawerId) {
                if (!drawerIdToConcepts.has(concept.linkedSavingsDrawerId)) drawerIdToConcepts.set(concept.linkedSavingsDrawerId, []);
                drawerIdToConcepts.get(concept.linkedSavingsDrawerId).push(concept);
                return; // Done
            }

            // FALLBACK: Name matching estricto
            let bestDrawer = null;

            savingsDrawers.forEach(drawer => {
                const dNorm = normalizeString(drawer.name || '').trim();
                
                // REGLA: Tienen que llamarse igual si no hay vínculo explícito
                if (cNormalized === dNorm) {
                    bestDrawer = drawer;
                }
            });

            if (bestDrawer) {
                const dNorm = normalizeString(bestDrawer.name || '').trim();
                if (!drawerNameToConcepts.has(dNorm)) drawerNameToConcepts.set(dNorm, []);
                drawerNameToConcepts.get(dNorm).push(concept);
            }
        });

        savingsDrawers.forEach(drawer => {
            const dNorm = normalizeString(drawer.name || '').trim();
            const realizedMovements = (drawer.movements || []).filter(m => {
                const mDate = new Date(m.date);
                if (isNaN(mDate.getTime()) || getFiscalMonth(mDate) !== currentFiscalMonthStr || m.amount >= 0) return false;
                const conc = normalizeString(m.concept || m.description || '');
                const cat = normalizeString(m.category || '');
                const isTransfer = cat.includes('traspaso') || conc.includes('traspaso') || cat.includes('inversion') || conc.includes('inversion');
                return !isTransfer;
            });

            // Agrupa conceptos por ID o por Nombre
            let matchingConcepts = drawerIdToConcepts.get(drawer.id) || [];
            if (drawerNameToConcepts.has(dNorm)) matchingConcepts = matchingConcepts.concat(drawerNameToConcepts.get(dNorm));

            let pendingMovements = [];
            matchingConcepts.forEach(concept => {
                const allPending = (concept.movements || []).filter(m => {
                    const isActive = (m.activeMonths || []).map(Number).includes(currentMonthNum);
                    return isActive && m.amount < 0 && !m.paid;
                });

                // Deduplicate: Solo elimina si es un pago exactamente igual en cantidad y parecido en nombre, o exacto en nombre
                const deduplicated = allPending.filter(pm => {
                    if (pm.isMaxTotal) return true; // Max Total movements override deduplication dynamically

                    const normStr = (s) => normalizeString(s).trim().replace(/\s+/g, ' ');
                    const pmSearch = normStr(pm.concept || pm.description || '');
                    if (!pmSearch) return true;
                    
                    const parseVal = (v) => Math.abs(parseFloat(String(v).replace(',', '.')) || 0);
                    const pmAmount = parseVal(pm.amount);

                    const alreadyRealized = realizedMovements.some(rm => {
                        const rmConcept = normStr(rm.concept || rm.description || '');
                        const rmAmount = parseVal(rm.amount);

                        const amountMatch = (Math.abs(rmAmount - pmAmount) < 0.05);
                        const nameIdentity = (rmConcept === pmSearch);
                        
                        // Deduplicate if the name EXACTLY matches, OR if amount matches and names share significant content
                        return nameIdentity || (amountMatch && (rmConcept.includes(pmSearch) || pmSearch.includes(rmConcept)));
                    });
                    
                    return !alreadyRealized;
                });
                pendingMovements = pendingMovements.concat(deduplicated);
            });

            // FINAL GUARD: Absolute exclusion for B100 Saving account
            // This prevents it from capturing NO movements (Nomina, Provisions, etc.)
            if (dNorm === 'b100') {
                pendingMovements = [];
            }

            // Calculations
            // Support for MaxTotal (Resting realized expenses)
            const sumRealized = realizedMovements.reduce((s, m) => s + m.amount, 0);
            
            pendingMovements = pendingMovements.map(pm => {
                const pmConceptStr = (pm.concept || pm.name || '').toLowerCase().trim();
                if (pm.isMaxTotal || pmConceptStr === 'total' || pmConceptStr === 'presupuesto restante') {
                    // Reduce max budget by the absolute sum realized. Negative means budget remaining.
                    const adjustedAmount = Math.min(0, Math.abs(sumRealized) - Math.abs(pm.amount));
                    return { ...pm, amount: adjustedAmount, concept: pm.concept || 'Presupuesto Restante' };
                }
                return pm;
            }).filter(pm => pm.amount < 0); // Hide if budget exhausted

            const sumPending = pendingMovements.reduce((s, m) => s + m.amount, 0);
            const currentBalance = drawer.balance || 0;
            const projectedBalance = currentBalance + sumPending; // sumPending is negative

            // Only show cards for accounts that have expenses (realized or pending)
            if (realizedMovements.length === 0 && pendingMovements.length === 0) return;

            const card = document.createElement('div');
            card.className = 'card glass-panel';
            card.style.padding = '1.5rem';
            card.style.display = 'flex';
            card.style.flexDirection = 'column';
            card.style.gap = '1.2rem';
            card.style.borderTop = '3px solid var(--primary)';

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid rgba(255,255,255,0.05); padding-bottom: 0.8rem;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span style="font-size: 1.5rem;">${drawer.icon || '📁'}</span>
                        <span style="font-weight: 800; font-size: 1.1rem; color: white;">${drawer.name}</span>
                    </div>
                        <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 1px;">
                            <div style="font-size: 0.85rem; font-weight: 700; opacity: 0.6; color: var(--text-muted);">${fmtEUR(currentBalance)}</div>
                            <div style="width: 15px; height: 1px; background: rgba(255,255,255,0.15); margin: 2px 0;"></div>
                            <div style="font-weight: 900; font-size: 1.15rem; color: ${projectedBalance < 0 ? 'var(--danger)' : 'var(--success)'}; line-height: 1.1;">${fmtEUR(projectedBalance)}</div>
                            <div style="font-size: 0.6rem; opacity: 0.4; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 2px;">Saldo Final</div>
                        </div>
                </div>

                <div style="display: flex; flex-direction: column; gap: 1rem;">
                    <!-- Realized Section -->
                    ${realizedMovements.length > 0 ? `
                        <div>
                            <div style="font-size: 0.65rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">Gastos Realizados (${fmtEUR(Math.abs(sumRealized))})</div>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${realizedMovements.map(m => `
                                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0;">
                                        <span style="opacity: 0.9; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 200px;">${m.concept || m.description || 'Gasto'}</span>
                                        <span style="font-weight: 700; color: var(--danger);">${fmtEUR(m.amount)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}

                    <!-- Pending Section -->
                    ${pendingMovements.length > 0 ? `
                        <div style="padding-top: 0.5rem; border-top: 1px dashed rgba(255,255,255,0.1);">
                            <div style="font-size: 0.65rem; color: #f59e0b; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.6rem;">Gastos Pendientes (${fmtEUR(Math.abs(sumPending))})</div>
                            <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                                ${pendingMovements.map(m => `
                                    <div style="display: flex; justify-content: space-between; font-size: 0.85rem; padding: 4px 0; color: rgba(245, 158, 11, 0.9);">
                                        <span style="font-style: italic;">${m.concept || m.description || 'Pte. Pago'}</span>
                                        <span style="font-weight: 800; border-bottom: 1px dotted currentColor;">${fmtEUR(m.amount)}</span>
                                    </div>
                                `).join('')}
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
            fragment.appendChild(card);
        });

        if (fragment.children.length === 0) {
            container.innerHTML = '<div style="grid-column: 1/-1; text-align: center; opacity: 0.5; padding: 4rem;">No hay gastos relevantes para este mes fiscal.</div>';
        } else {
            container.appendChild(fragment);
        }
    }

    function render() {
        updateAhorroGastosMonthLabel();
        try {
            updateSidebarTogglesUI();
        // Toggle Bolsa Summary Visibility
        if (elements.bolsaSummarySection) {
            elements.bolsaSummarySection.classList.toggle('hidden', !bolsaSummaryVisible);
        }

        // 1. Prepare Data and Calculate Totals 
        let totalInvestedEUR = 0;
        let totalCurrentValueEURValue = 0;
        let isAnyPriceMissing = false;

        const displayStocksData = stocks.map(stock => {
            let info = { price: 0, currency: 'EUR', isLive: false, isSimulated: false };
            if (window.getStockInfo) {
                info = window.getStockInfo(stock.ticker);
            }

            let currentPriceEUR = info.price;
            if (info.price !== null && info.currency === 'USD') {
                currentPriceEUR = info.price * window.FX_RATE;
            }

            const stockInvested = stock.price * stock.qty;
            const stockCurrentVal = currentPriceEUR !== null ? currentPriceEUR * stock.qty : null;
            const stockPL = stockCurrentVal !== null ? stockCurrentVal - stockInvested : null;
            const stockPLPercent = (stockInvested > 0 && stockPL !== null) ? (stockPL / stockInvested) * 100 : null;

            // Add to running totals
            totalInvestedEUR += stockInvested;
            if (stockCurrentVal !== null) {
                totalCurrentValueEURValue += stockCurrentVal;
            } else {
                isAnyPriceMissing = true;
            }

            return {
                ...stock,
                liveInfo: {
                    ...info,
                    currentPriceEUR,
                    stockInvested,
                    stockCurrentVal,
                    stockPL,
                    stockPLPercent
                }
            };
        });

        const totalInvestedAppCalc = totalInvestedEUR; // save original for return
        currentTotalInvestedBolsa = totalInvestedEUR;
        // ALWAYS show a total value if we have any data, don't hide it with "-" unless truly empty
        const totalCurrentValueEUR = totalCurrentValueEURValue;

        // 2. Update Totals UI (Badge for Manual Prices)
        const nonLiveCount = displayStocksData.filter(s => !s.liveInfo.isLive && !s.liveInfo.isManual).length;
        if (elements.manualPriceBadge) {
            elements.manualPriceBadge.textContent = nonLiveCount;
            elements.manualPriceBadge.classList.toggle('hidden', nonLiveCount === 0);
        }

        // 2. Update Totals UI
        const pl = totalCurrentValueEUR - totalInvestedEUR;
        const plPercent = totalInvestedEUR > 0 ? (pl / totalInvestedEUR) * 100 : 0;

        // Sync Savings Bolsa Drawer
        const bolsaDrawer = savingsDrawers.find(d => d.id === 'bolsa');
        if (bolsaDrawer) {
            bolsaDrawer.balance = totalCurrentValueEURValue;
            bolsaDrawer.pl = pl;
            if (currentView === 'ahorro') renderSavings();
        }

        if (elements.totalInvested) elements.totalInvested.textContent = fmtEUR(totalInvestedEUR);

        if (elements.totalValue) {
            if (!isFirstUpdateDone && stocks.length > 0) {
                elements.totalValue.textContent = "-";
            } else {
                elements.totalValue.textContent = totalCurrentValueEUR !== null ? fmtEUR(totalCurrentValueEUR) : "-";
            }
        }
        if (elements.fxIndicator) {
            elements.fxIndicator.innerHTML = `FX Rate: 1 USD = ${fmtNum(window.FX_RATE, 3)} EUR <span style="margin-left: 10px; font-size: 0.8em; opacity: 0.7;">(Lectura: ${window.FX_DATE || lastSyncTime})</span>`;
        }

        if (elements.liveStatus) {
            const isReallyLive = !window.NETWORK_OFFLINE && window.FINNHUB_API_KEY && Object.keys(window.LIVE_PRICES || {}).length > 0;
            if (elements.totalValue) {
                elements.totalValue.classList.toggle('amount--simulated', !isReallyLive);
            }
            if (elements.marketStatusIcon) {
                elements.marketStatusIcon.textContent = isReallyLive ? '🔓' : '🔒';
                elements.marketStatusIcon.title = isReallyLive ? 'Mercado Abierto / Conexión Activa' : 'Mercado Cerrado / Usando Datos Históricos';
            }
            if (window.NETWORK_OFFLINE) {
                elements.liveStatus.innerHTML = `<span class="source-dot simulated" style="background-color: var(--danger); box-shadow: 0 0 6px var(--danger);"></span> Modo: Sin conexión o Error de Red (usando datos locales)`;
                elements.liveStatus.style.color = "var(--danger)";
                if (elements.connStatusDot) elements.connStatusDot.className = 'status-dot offline';
            } else if (window.FINNHUB_API_KEY) {
                const liveCount = Object.keys(window.LIVE_PRICES || {}).length;
                if (liveCount > 0) {
                    elements.liveStatus.innerHTML = `<span class="source-dot live"></span> Modo: TIEMPO REAL (Finnhub) - ${liveCount} activos en vivo <span style="margin-left:8px; opacity:0.6; font-size:0.9em">(Sinc: ${lastSyncTime})</span>`;
                    elements.liveStatus.style.color = "var(--success)";
                    if (elements.connStatusDot) elements.connStatusDot.className = 'status-dot live';
                } else {
                    elements.liveStatus.innerHTML = `<span class="source-dot simulated"></span> Modo: TIEMPO REAL (Finnhub) - Esperando datos... <span style="margin-left:8px; opacity:0.6; font-size:0.9em">(Sinc: ${lastSyncTime})</span>`;
                    elements.liveStatus.style.color = "var(--primary)";
                    if (elements.connStatusDot) elements.connStatusDot.className = 'status-dot simulated';
                }
            } else {
                elements.liveStatus.textContent = "Modo: Simulado (añade API Key para tiempo real)";
                elements.liveStatus.style.color = "inherit";
                if (elements.connStatusDot) elements.connStatusDot.className = 'status-dot simulated';
            }
        }

        if (elements.totalPL) {
            if (!isFirstUpdateDone && stocks.length > 0) {
                elements.totalPL.textContent = "-";
                elements.totalPL.className = "amount";
                if (elements.totalTrend) elements.totalTrend.textContent = "";
            } else if (totalCurrentValueEUR === null) {
                elements.totalPL.textContent = "-";
                elements.totalPL.className = "amount";
                if (elements.totalTrend) elements.totalTrend.textContent = "";
            } else {
                elements.totalPL.textContent = (pl >= 0 ? '+' : '') + fmtEUR(pl);
                elements.totalPL.className = `amount ${pl >= 0 ? 'profit' : 'loss'}`;
                if (elements.totalTrend) {
                    elements.totalTrend.textContent = `${pl >= 0 ? '▲' : '▼'} ${fmtNum(Math.abs(plPercent))}%`;
                    elements.totalTrend.className = `trend ${pl >= 0 ? 'positive' : 'negative'}`;
                }
            }
        }

        // Toggle Table vs Cards
        if (elements.bolsaViewToggleBtn) {
            if (bolsaViewMode === 'cards') {
                elements.bolsaViewToggleBtn.innerHTML = '<span>📄</span>';
                elements.bolsaViewToggleBtn.title = 'Vista Lista Detallada';
            } else if (!bolsaTotalsMode) {
                elements.bolsaViewToggleBtn.innerHTML = '<span>📊</span>';
                elements.bolsaViewToggleBtn.title = 'Vista Totales';
            } else {
                elements.bolsaViewToggleBtn.innerHTML = '<span>🗂️</span>';
                elements.bolsaViewToggleBtn.title = 'Vista Tarjetas';
            }
        }



        if (bolsaViewMode === 'cards') {
            if (elements.stockTable) elements.stockTable.parentElement.classList.add('hidden');
            if (elements.bolsaGrid) {
                elements.bolsaGrid.classList.remove('hidden');
                renderBolsaCards(displayStocksData);
            }
        } else {
            if (elements.stockTable) elements.stockTable.parentElement.classList.remove('hidden');
            if (elements.bolsaGrid) elements.bolsaGrid.classList.add('hidden');
        }

        renderBolsaHighlights(displayStocksData);

        // 2.6 Group Data by Ticker
        const groupedData = {};
        displayStocksData.forEach(item => {
            const filterMatch = currentFilter === 'all' || item.market === currentFilter;
            if (!filterMatch) return;

            if (!groupedData[item.ticker]) {
                groupedData[item.ticker] = {
                    ticker: item.ticker,
                    name: item.name,
                    market: item.market,
                    totalQty: 0,
                    totalInvested: 0,
                    totalCurrentVal: 0,
                    items: [],
                    liveInfo: item.liveInfo // Take live info from first item (it's per ticker anyway)
                };
            }
            groupedData[item.ticker].totalQty += item.qty;
            groupedData[item.ticker].totalInvested += item.liveInfo.stockInvested;
            if (item.liveInfo.stockCurrentVal !== null) {
                groupedData[item.ticker].totalCurrentVal += item.liveInfo.stockCurrentVal;
            } else {
                groupedData[item.ticker].totalCurrentVal = null; // Mark as unknown
            }
            groupedData[item.ticker].items.push(item);
        });

        // 2.7 Apply Sorting (to groups)
        // Filter out positions that are fully sold (net qty <= 0)
        let displayGroups = Object.values(groupedData).filter(g => g.items.length > 0 && g.totalQty > 0);
        if (sortConfig.key) {
            displayGroups.sort((a, b) => {
                const getValue = (obj, path) => {
                    if (path === 'liveInfo.price') return obj.liveInfo.price;
                    if (path === 'liveInfo.stockInvested') return obj.totalInvested;
                    if (path === 'liveInfo.stockCurrentVal') return obj.totalCurrentVal;
                    if (path === 'liveInfo.stockPL') return obj.totalCurrentVal - obj.totalInvested;
                    if (path === 'liveInfo.stockPLPercent') {
                        const totalPL = obj.totalCurrentVal - obj.totalInvested;
                        return obj.totalInvested > 0 ? (totalPL / obj.totalInvested) * 100 : 0;
                    }
                    return obj[path];
                };

                let valA = getValue(a, sortConfig.key);
                let valB = getValue(b, sortConfig.key);

                if (typeof valA === 'string') valA = valA.toLowerCase();
                if (typeof valB === 'string') valB = valB.toLowerCase();

                if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 3. Render Table
        if (stockTableBody) {
            stockTableBody.innerHTML = '';
            const stockFrag = document.createDocumentFragment();

            if (displayGroups.length === 0) {
                emptyState?.classList.remove('hidden');
            } else {
                emptyState?.classList.add('hidden');
            }

            // --- Compact Totals Mode ---
            if (bolsaTotalsMode && bolsaViewMode !== 'cards') {
                // Mark table as compact mode for CSS targeting
                if (elements.stockTable) elements.stockTable.classList.add('bolsa-totals-compact');

                // Helper to render sort arrow
                const getArrow = (key) => {
                    if (sortConfig.key === key) return sortConfig.direction === 'asc' ? '▲' : '▼';
                    return '';
                };

                // Update thead for compact view
                const thead = elements.stockTable?.querySelector('thead');
                if (thead) {
                    thead.innerHTML = `
                        <tr>
                            <th data-sort="name" class="btc-siglas" style="text-align:left; padding:0.4rem 0.5rem; font-size:0.75rem; cursor:pointer;">Siglas <span class="sort-icon">${getArrow('name')}</span></th>
                            <th data-sort="liveInfo.stockInvested" class="btc-inv" style="text-align:right; padding:0.4rem 0.5rem; font-size:0.75rem; cursor:pointer;">Invertido <span class="sort-icon">${getArrow('liveInfo.stockInvested')}</span></th>
                            <th data-sort="liveInfo.stockCurrentVal" class="btc-val" style="text-align:right; padding:0.4rem 0.5rem; font-size:0.75rem; cursor:pointer;">Valor Act. <span class="sort-icon">${getArrow('liveInfo.stockCurrentVal')}</span></th>
                            <th data-sort="liveInfo.stockPL" class="btc-gp" style="text-align:right; padding:0.4rem 0.5rem; font-size:0.75rem; cursor:pointer;">G/P <span class="sort-icon">${getArrow('liveInfo.stockPL')}</span></th>
                        </tr>`;
                }

                displayGroups.forEach((group, idx) => {
                    const pl = group.totalCurrentVal !== null ? group.totalCurrentVal - group.totalInvested : null;
                    const plClass = pl === null ? '' : (pl >= 0 ? 'profit' : 'loss');
                    const isManual = group.liveInfo.isManual;
                    const rowBg = isManual ? 'background: rgba(245, 158, 11, 0.08);' : (idx % 2 === 0 ? 'background: rgba(255,255,255,0.04);' : 'background: rgba(139,92,246,0.08);');
                    const tr = document.createElement('tr');
                    tr.className = 'group-row' + (isManual ? ' manual-row' : '');
                    tr.style.cssText = `cursor: pointer; ${rowBg}`;
                    tr.innerHTML = `
                        <td class="btc-siglas" style="padding:0.35rem 0.5rem; font-weight:700; font-size:0.85rem; color:var(--primary);">${group.ticker} ${isManual ? '<span style="color:#f59e0b; font-size:0.6rem; vertical-align:middle;">[M]</span>' : ''}</td>
                        <td class="btc-inv" style="padding:0.35rem 0.5rem; text-align:right; font-size:0.8rem;">${fmtEUR(group.totalInvested)}</td>
                        <td class="btc-val" style="padding:0.35rem 0.5rem; text-align:right; font-weight:700; font-size:0.8rem;">${group.totalCurrentVal !== null ? fmtEUR(group.totalCurrentVal) : '-'}</td>
                        <td class="btc-gp ${plClass}" style="padding:0.35rem 0.5rem; text-align:right; font-weight:600; font-size:0.8rem;">${pl === null ? '-' : (pl >= 0 ? '+' : '') + fmtEUR(pl)}</td>
                    `;
                    stockFrag.appendChild(tr);
                });

                // Compact totals row
                const totalPL = totalCurrentValueEUR !== null ? totalCurrentValueEUR - totalInvestedEUR : null;
                const plClass = totalPL === null ? '' : (totalPL >= 0 ? 'profit' : 'loss');
                const trTotal = document.createElement('tr');
                trTotal.className = 'totals-row';
                trTotal.style.cssText = 'background:rgba(59,130,246,0.12); border-top:2px solid rgba(59,130,246,0.3); font-weight:800;';
                trTotal.innerHTML = `
                    <td class="btc-siglas" style="padding:0.5rem; font-size:0.8rem; text-align:left; letter-spacing:0.05em; opacity:0.9;">📊 TOTAL</td>
                    <td class="btc-inv" style="padding:0.5rem; text-align:right; font-size:0.8rem;">${fmtEUR(totalInvestedEUR)}</td>
                    <td class="btc-val" style="padding:0.5rem; text-align:right; font-size:0.8rem; background:rgba(59,130,246,0.08);">${totalCurrentValueEUR !== null ? fmtEUR(totalCurrentValueEUR) : '-'}</td>
                    <td class="btc-gp ${plClass}" style="padding:0.5rem; text-align:right; font-size:0.8rem;">${totalPL === null ? '-' : (totalPL >= 0 ? '+' : '') + fmtEUR(totalPL)}</td>
                `;
                stockFrag.appendChild(trTotal);
                stockTableBody.appendChild(stockFrag);

            } else {
                // --- Full Detail Table ---
                if (elements.stockTable) elements.stockTable.classList.remove('bolsa-totals-compact');

                // Restore full thead if we are not in compact mode or if headers are the wrong ones
                const thead = elements.stockTable?.querySelector('thead');
                if (thead && (!thead.querySelector('th[data-sort="market"]') || thead.innerHTML.includes('btc-siglas'))) {
                    thead.innerHTML = `
                    <tr>
                        <th data-sort="name">Asset <span class="sort-icon"></span></th>
                        <th data-sort="market">Mercado <span class="sort-icon"></span></th>
                        <th data-sort="liveInfo.price">Precio <span class="sort-icon"></span></th>
                        <th data-sort="totalQty">Cantidad <span class="sort-icon"></span></th>
                        <th data-sort="liveInfo.stockInvested">Invertido <span class="sort-icon"></span></th>
                        <th data-sort="liveInfo.stockCurrentVal">Valor Act. (€) <span class="sort-icon"></span></th>
                        <th data-sort="liveInfo.stockPL">G/P (€) <span class="sort-icon"></span></th>
                        <th data-sort="liveInfo.stockPLPercent">G/P (%) <span class="sort-icon"></span></th>
                        <th>Señales</th>
                        <th>Acción</th>
                    </tr>`;
                }


                displayGroups.forEach(group => {
                    const info = group.liveInfo;
                    const plGroup = group.totalCurrentVal - group.totalInvested;
                    const plPercentGroup = group.totalInvested > 0 ? (plGroup / group.totalInvested) * 100 : 0;
                    const isExpanded = expandedTickers.has(group.ticker);

                    // Calculate Signals
                    let signalsHtml = '<span style="color:var(--text-muted); font-size: 0.8rem;">-</span>';
                    const mockInfo = window.MOCK_DATA[group.ticker.toUpperCase()];
                    if (mockInfo && mockInfo.historical && mockInfo.historical['D']) {
                        const fx = mockInfo.currency === 'USD' ? window.FX_RATE : 1;
                        const analysis = calculateTechnicalAnalysis(group.ticker, mockInfo.historical['D'], fx);
                        if (analysis.patterns && analysis.patterns.length > 0) {
                            const signalDescriptions = {
                                'Martillo (Hammer)': 'Martillo: Indica un posible cambio de tendencia al alza (reversión alcista).',
                                'Martillo Invertido': 'Martillo Invertido: Sugiere un posible agotamiento de la tendencia bajista.',
                                'Doji': 'Doji: Indica indecisión en el mercado; el precio de apertura y cierre son casi iguales.',
                                'Envolvente Alcista': 'Envolvente: Una vela que envolvió a la anterior (cuerpo mayor), indicando un fuerte impulso alcista.'
                            };
                            signalsHtml = analysis.patterns.map(p => {
                                const desc = signalDescriptions[p] || 'Señal técnica detectada.';
                                if (p === 'Martillo (Hammer)') return `<span class="signal-badge hammer" title="${desc}">🔨 Martillo</span>`;
                                if (p === 'Martillo Invertido') return `<span class="signal-badge hammer-inv" title="${desc}">⚒️ Inv. Hammer</span>`;
                                if (p === 'Doji') return `<span class="signal-badge doji" title="${desc}">⚖️ Doji</span>`;
                                if (p === 'Envolvente Alcista') return `<span class="signal-badge engulfing" title="${desc}">🔥 Envolvente</span>`;
                                return `<span class="signal-badge" title="${desc}">${p}</span>`;
                            }).join(' ');
                        }
                    }

                    const statusIcon = info.isLive
                        ? '<span class="source-dot live" title="Conexión en Vivo"></span>'
                        : '<span class="source-dot simulated" title="Datos Históricos"></span>';

                    const sourceLabel = info.source === 'yahoo' ? 'YF' : (info.source === 'manual' ? 'Manual' : 'Live');
                    const badgeClass = info.isLive ? 'badge-live' : 'badge-simulated';

                    // Distinct Blue style for Yahoo Finance
                    const yahooStyle = info.source === 'yahoo' ? 'background:rgba(59, 130, 246, 0.2); color:#60a5fa; border:1px solid rgba(96, 165, 250, 0.3);' : '';
                    const sourceTitle = info.source === 'yahoo' ? 'Fuente: Yahoo Finance' : (info.source === 'finnhub' ? 'Fuente: Finnhub API' : 'Ajuste Manual');

                    const statusBadge = info.isLive
                        ? `<div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <span class="${badgeClass}" style="${yahooStyle}" title="${sourceTitle}">${sourceLabel}</span>
                            ${info.date ? `<span style="font-size:0.75em; color:var(--text-muted); opacity:0.8; margin-top:2px;">${info.date}</span>` : ''}
                          </div>`
                        : (info.isManual ? `
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <span class="badge-simulated" style="background: rgba(139, 92, 246, 0.1); color: #a78bfa; border: 1px solid rgba(139, 92, 246, 0.2);">Manual</span>
                            ${info.date ? `<span style="font-size:0.75em; color:var(--text-muted); opacity:0.8; margin-top:2px;">${info.date}</span>` : ''}
                        </div>` : (info.isSimulated ? `
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <span class="badge-simulated" style="background: rgba(245, 158, 11, 0.1); color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.2);">Cierre</span>
                            ${info.date ? `<span style="font-size:0.75em; color:var(--text-muted); opacity:0.8; margin-top:2px;">${info.date}</span>` : ''}
                        </div>` : (info.price === null ? '<span class="badge-simulated" style="background:rgba(239, 68, 68, 0.1); color:var(--danger);">S.D.</span>' : '')));

                    let priceDisplay = '<span style="color:var(--text-muted);">-</span>';
                    if (info.price !== null) {
                        priceDisplay = info.currency === 'EUR'
                            ? `<div style="display:flex; align-items:center; gap:0.5rem; font-weight:600">${statusIcon} ${fmtEUR(info.price)} ${statusBadge}</div>`
                            : `<div style="display:flex; align-items:center; gap:0.5rem; font-weight:600">${statusIcon} ${fmtNum(info.price)} ${info.currency} ${statusBadge}</div>
                           <div style="font-size:0.8em; color:var(--text-muted); margin-left: 1.3rem;">≈ ${fmtEUR(info.currentPriceEUR)}</div>`;
                    }

                    const performanceClass = (plPercentGroup === null) ? 'neutral' :
                        (plPercentGroup < 0 ? 'loss' :
                            (plPercentGroup > 10 ? 'profit' : 'neutral'));

                    const tr = document.createElement('tr');
                    tr.className = 'group-row';
                    tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap: 0.8rem;">
                            <button class="toggle-btn" data-ticker="${group.ticker}" style="background:none; border:none; color:var(--text-main); cursor:pointer; font-size:1.2rem; padding:0;">${isExpanded ? '▼' : '▶'}</button>
                            <div style="display:flex; align-items:center; gap: 0.6rem; flex-wrap: nowrap;">
                                <div style="white-space: nowrap;">
                                    <span style="font-weight:700"><a href="#" class="company-link ${performanceClass}" data-ticker="${group.ticker}">${group.name || group.ticker}</a></span>
                                    <span style="font-size:0.8em; color:var(--text-muted); margin-left: 0.3rem;">(${group.ticker})</span>
                                </div>
                            </div>
                        </div>
                    </td>
                    <td><span style="font-size:0.85em; background:rgba(255,255,255,0.1); padding:2px 6px; border-radius:4px">${group.market}</span></td>
                    <td>${priceDisplay}</td>
                    <td>${fmtNum(group.totalQty, 4)}</td>
                    <td><div style="font-weight:600">${fmtEUR(group.totalInvested)}</div></td>
                    <td style="font-weight:700; background: rgba(59, 130, 246, 0.05);">${group.totalCurrentVal !== null ? fmtEUR(group.totalCurrentVal) : '-'}</td>
                    <td class="${plGroup === null ? '' : (plGroup >= 0 ? 'profit' : 'loss')}" style="font-weight:600">
                        ${plGroup === null ? '-' : (plGroup >= 0 ? '+' : '') + fmtEUR(plGroup)}
                    </td>
                    <td class="${plGroup === null ? '' : (plGroup >= 0 ? 'profit' : 'loss')}" style="font-weight:600">
                        ${plPercentGroup === null ? '-' : fmtNum(plPercentGroup) + '%'}
                    </td>
                    <td><div style="display:flex; gap:0.3rem; flex-wrap:wrap;">${signalsHtml}</div></td>
                    <td>
                        <div style="display:flex; gap:0.4rem; align-items:center;">
                            <button class="btn-primary add-more-btn" data-ticker="${group.ticker}" title="Añadir Inversión" style="padding: 0.4rem 0.6rem; font-size: 1rem; box-shadow: none; background: var(--success); border-color: var(--success);">➕</button>
                            <button class="btn-primary details-btn" data-ticker="${group.ticker}" title="Ver Detalles" style="padding: 0.4rem 0.6rem; font-size: 1rem; box-shadow: none; background: var(--primary); border-color: var(--primary);">🔍</button>
                        </div>
                    </td>
                `;
                    stockTableBody.appendChild(tr);

                    // Detail Rows
                    if (isExpanded) {
                        group.items.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(item => {
                            const trDetail = document.createElement('tr');
                            trDetail.className = 'detail-row';
                            const itemPL = item.liveInfo.stockPL;
                            const itemPLPercent = item.liveInfo.stockPLPercent;

                            const isSale = item.qty < 0;
                            trDetail.innerHTML = `
                            <td style="padding-left: 2.5rem; opacity: 0.8;">
                                <div style="font-size: 0.85rem; color: ${isSale ? 'var(--danger)' : 'var(--success)'}; font-weight: 600;">${isSale ? '🔴 Venta' : '🟢 Compra'}: ${new Date(item.date).toLocaleDateString()}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">ID: ${item.id.slice(-6)}</div>
                            </td>
                            <td></td>
                             <td style="opacity: 0.8; font-size: 0.85rem;">${isSale ? 'Precio venta' : 'Coste'}: ${fmtEUR(item.price)}</td>
                            <td style="opacity: 0.8; font-size: 0.85rem; color: ${isSale ? 'var(--danger)' : 'inherit'}">${fmtNum(item.qty, 4)}</td>
                            <td style="opacity: 0.8; font-size: 0.85rem; color: ${isSale ? 'var(--danger)' : 'inherit'}">${isSale ? '−' : ''}${fmtEUR(Math.abs(item.liveInfo.stockInvested))}</td>
                            <td style="opacity: 0.8; font-size: 0.85rem;">${isSale ? '-' : fmtEUR(item.liveInfo.stockCurrentVal)}</td>
                            <td class="${itemPL >= 0 ? 'profit' : 'loss'}" style="font-size: 0.85rem; opacity: 0.9;">
                                ${isSale ? '-' : (itemPL >= 0 ? '+' : '') + fmtEUR(itemPL)}
                            </td>
                            <td class="${itemPL >= 0 ? 'profit' : 'loss'}" style="font-size: 0.85rem; opacity: 0.9;">
                                ${isSale ? '-' : fmtNum(itemPLPercent) + '%'}
                            </td>
                            <td>
                                <div style="display:flex; gap:0.3rem;">
                                    <button class="btn-primary edit-btn" data-id="${item.id}" title="Editar" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; box-shadow: none;">✏️</button>
                                    <button class="btn-danger delete-btn" data-id="${item.id}" title="Borrar" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">🗑️</button>
                                </div>
                            </td>
                        `;
                            stockFrag.appendChild(trDetail);
                        });
                    }
                });

                // Add Summary Row (Portfolio Totals)
                const trTotal = document.createElement('tr');
                trTotal.className = 'totals-row';
                trTotal.style.background = 'rgba(59, 130, 246, 0.12)';
                trTotal.style.borderTop = '2px solid rgba(59, 130, 246, 0.3)';
                trTotal.style.fontWeight = '800';

                const totalPLPortfolio = totalCurrentValueEUR !== null ? totalCurrentValueEUR - totalInvestedEUR : null;
                const totalPLPctPortfolio = (totalPLPortfolio !== null && totalInvestedEUR > 0) ? (totalPLPortfolio / totalInvestedEUR) * 100 : 0;
                const plClassPortfolio = totalPLPortfolio === null ? '' : (totalPLPortfolio >= 0 ? 'profit' : 'loss');

                trTotal.innerHTML = `
                <td colspan="4" style="padding: 1.2rem 1rem; text-align: left; vertical-align: middle;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.1rem;">📊</span>
                        <span style="text-transform: uppercase; letter-spacing: 0.1em; font-size: 0.85rem; opacity: 0.9;">TOTAL CARTERA</span>
                    </div>
                </td>
                <td style="padding: 1.2rem 1rem; vertical-align: middle;">${fmtEUR(totalInvestedEUR)}</td>
                <td style="padding: 1.2rem 1rem; vertical-align: middle; background: rgba(59, 130, 246, 0.08);">${totalCurrentValueEUR !== null ? fmtEUR(totalCurrentValueEUR) : '-'}</td>
                <td class="${plClassPortfolio}" style="padding: 1.2rem 1rem; vertical-align: middle;">
                    ${totalPLPortfolio === null ? '-' : (totalPLPortfolio >= 0 ? '+' : '') + fmtEUR(totalPLPortfolio)}
                </td>
                <td class="${plClassPortfolio}" style="padding: 1.2rem 1rem; vertical-align: middle;">
                    ${totalPLPortfolio === null ? '-' : fmtNum(totalPLPctPortfolio) + '%'}
                </td>
                <td colspan="2"></td>
            `;
                stockFrag.appendChild(trTotal);
                stockTableBody.appendChild(stockFrag);

                // Action handlers
                document.querySelectorAll('.delete-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => removeStock(e.target.dataset.id));
                });
                document.querySelectorAll('.edit-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => editStock(e.target.dataset.id));
                });
                document.querySelectorAll('.add-more-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const group = displayGroups.find(g => g.ticker === e.target.dataset.ticker);
                        if (group) addMoreFromStock(group.items[0].id);
                    });
                });
                document.querySelectorAll('.details-btn, .toggle-btn').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        const ticker = e.target.dataset.ticker || e.target.closest('button').dataset.ticker;
                        toggleDetails(ticker);
                    });
                });
                document.querySelectorAll('.company-link').forEach(link => {
                    link.addEventListener('click', (e) => {
                        e.preventDefault();
                        showFinancialDetails(link.dataset.ticker);
                    });
                });

                // Re-apply sorting UI after innerHTML changes
                if (elements.stockTable) {
                    elements.stockTable.querySelectorAll('th[data-sort]').forEach(th => {
                        th.classList.remove('active-sort');
                        const icon = th.querySelector('.sort-icon');
                        if (icon) icon.textContent = '';
                        if (th.dataset.sort === sortConfig.key) {
                            th.classList.add('active-sort');
                            if (icon) icon.textContent = sortConfig.direction === 'asc' ? '▲' : '▼';
                        }
                    });
                }
            }
        }

            // updatePortfolioCandle(totalInvestedEUR, totalCurrentValueEUR); // Removed

        // Section Toggling logic
        if (elements.activitySection) elements.activitySection.classList.add('hidden');
        if (elements.bolsaSection) elements.bolsaSection.classList.add('hidden');
        if (elements.ahorroSection) elements.ahorroSection.classList.add('hidden');
        if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
        if (elements.analisisSection) elements.analisisSection.classList.add('hidden');
        if (elements.ahorroCalendarSection) elements.ahorroCalendarSection.classList.add('hidden');
        if (elements.ahorroEstadoSection) elements.ahorroEstadoSection.classList.add('hidden');
        if (elements.ahorroGastosSection) elements.ahorroGastosSection.classList.add('hidden');
        if (elements.ahorroHistoricoSection) elements.ahorroHistoricoSection.classList.add('hidden');
        if (elements.mobileActionBar) elements.mobileActionBar.classList.add('hidden');

        if (currentView === 'activity') {
            if (elements.activitySection) elements.activitySection.classList.remove('hidden');
            renderActivity();
        } else if (currentView === 'bolsa') {
            if (elements.bolsaSection) elements.bolsaSection.classList.remove('hidden');
            if (elements.mobileActionBar) elements.mobileActionBar.classList.remove('hidden');
            renderPortfolioPieChart();
        } else if (currentView === 'ahorro') {
            if (elements.ahorroSection) elements.ahorroSection.classList.remove('hidden');
            renderSavings();
        } else if (currentView === 'ahorroCalendar') {
            if (elements.ahorroCalendarSection) elements.ahorroCalendarSection.classList.remove('hidden');
            renderGlobalAhorroCalendar();
        } else if (currentView === 'nomina') {
            if (elements.nominaSection) elements.nominaSection.classList.remove('hidden');
            renderNomina();
        } else if (currentView === 'analisis') {
            if (elements.analisisSection) elements.analisisSection.classList.remove('hidden');
            renderAnalisis();
        } else if (currentView === 'ahorroEstado') {
            if (elements.ahorroEstadoSection) elements.ahorroEstadoSection.classList.remove('hidden');
            renderAhorroEstado();
        } else if (currentView === 'ahorroGastos') {
            if (elements.ahorroGastosSection) elements.ahorroGastosSection.classList.remove('hidden');
            renderAhorroGastos();
        } else if (currentView === 'ahorroHistorico') {
            if (elements.ahorroHistoricoSection) elements.ahorroHistoricoSection.classList.remove('hidden');
            renderAhorroHistorico();
        }
        } catch (err) {
            console.error("CRITICAL RENDER ERROR:", err, err.stack);
            // Emergency fallback: unhide requested view anyway if possible
            const viewMap = {
                'activity': elements.activitySection,
                'bolsa': elements.bolsaSection,
                'ahorro': elements.ahorroSection,
                'ahorroCalendar': elements.ahorroCalendarSection,
                'nomina': elements.nominaSection,
                'analisis': elements.analisisSection,
                'ahorroEstado': elements.ahorroEstadoSection,
                'ahorroGastos': elements.ahorroGastosSection,
                'ahorroHistorico': elements.ahorroHistoricoSection
            };
            const target = viewMap[currentView];
            if (target) target.classList.remove('hidden');
            
            showToast(`⚠️ Error al visualizar datos: ${err.message}. Revisa la consola o limpia caché.`, "error");
        }
    }

    function renderActivity() {
        if (!elements.activityTableBody) return;

        // 1. Unify Movements
        let allMovements = [];

        // From Bolsa (Stocks)
        stocks.forEach(s => {
            allMovements.push({
                date: s.date || new Date().toISOString().split('T')[0],
                concept: `${s.qty < 0 ? 'Venta' : 'Compra'} ${s.ticker}`,
                category: `Bolsa: ${s.market || 'Mercado'}`,
                amount: ((s.qty || 0) * (s.price || 0)), // Mostramos inversión en positivo como pidió el usuario
                type: 'bolsa',
                drawerId: 'bolsa',
                id: s.id,
                qty: s.qty,
                price: s.price,
                ticker: s.ticker
            });
        });

        // From Ahorro (Drawers)
        savingsDrawers.forEach(drawer => {
            (drawer.movements || []).forEach((m, idx) => {
                allMovements.push({
                    date: m.date || new Date().toISOString().split('T')[0],
                    concept: m.description || m.concept || 'Movimiento',
                    category: m.category || drawer.name,
                    drawerName: `${drawer.icon || '📁'} ${drawer.name}`,
                    amount: m.amount || 0,
                    type: 'ahorro',
                    drawerId: drawer.id,
                    mvmtIndex: idx,
                    id: m.id || `${drawer.id}_${idx}`
                });
            });
        });

        // 2. Filter by Month/Year/All
        let filtered = [];
        if (activityFilterMode === 'month') {
            filtered = allMovements.filter(m => m.date && getFiscalMonth(m.date) === activityListMonth);
        } else if (activityFilterMode === 'year') {
            const year = activityListMonth.split('-')[0];
            filtered = allMovements.filter(m => m.date && getFiscalMonth(m.date).startsWith(year));
        } else if (activityFilterMode === 'week') {
            // Fiscal-aligned 7-day week (Option 2)
            const refDate = activityListMonth.length === 7 ? new Date(activityListMonth + "-01") : new Date(activityListMonth);
            
            // Find the fiscal start of the month containing refDate
            let fiscalStartYear, fiscalStartMonth;
            const refY = refDate.getFullYear();
            const refM = refDate.getMonth(); // 0-indexed
            
            if (refDate.getDate() >= fiscalDay) {
                fiscalStartYear = refY;
                fiscalStartMonth = refM;
            } else {
                const prevMonth = new Date(refY, refM - 1, 1);
                fiscalStartYear = prevMonth.getFullYear();
                fiscalStartMonth = prevMonth.getMonth();
            }
            const fiscalStartTime = new Date(fiscalStartYear, fiscalStartMonth, fiscalDay).getTime();
            const refTime = refDate.getTime();
            const daysDiff = Math.floor((refTime - fiscalStartTime) / (24 * 60 * 60 * 1000));
            const weeksSince = Math.floor(daysDiff / 7);
            
            const startOfWeek = new Date(fiscalStartTime + (weeksSince * 7 * 24 * 60 * 60 * 1000));
            startOfWeek.setHours(0,0,0,0);
            const endOfWeek = new Date(startOfWeek.getTime() + (7 * 24 * 60 * 60 * 1000) - 1);

            filtered = allMovements.filter(m => {
                if (!m.date) return false;
                const d = new Date(m.date);
                return d >= startOfWeek && d <= endOfWeek;
            });

            // Update label range based on these calculated dates
            if (elements.activityMonthLabel) {
                const fmt = d => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                elements.activityMonthLabel.textContent = `${fmt(startOfWeek)} - ${fmt(endOfWeek)}`;
            }
        } else {
            // mode === 'all'
            filtered = allMovements;
        }

        // 2a. Filter by Drawer
        if (activityDrawerFilter !== 'all') {
            filtered = filtered.filter(m => m.drawerId === activityDrawerFilter);
        }

        // Show navigation arrows unless mode is 'all'
        elements.activityMonthUp?.classList.toggle('hidden', activityFilterMode === 'all');
        elements.activityMonthDown?.classList.toggle('hidden', activityFilterMode === 'all');

        // 2b. Apply Cell Filter
        if (activityCellFilter.column && activityCellFilter.value !== null) {
            filtered = filtered.filter(m => {
                const dateStr = m.date ? new Date(m.date).toLocaleDateString() : '---';
                const amountStr = fmtEUR(m.amount, 2);

                if (activityCellFilter.column === 'date') return dateStr === activityCellFilter.value;
                if (activityCellFilter.column === 'amount') return amountStr === activityCellFilter.value;
                if (activityCellFilter.column === 'category' && activityCellFilter.value.startsWith('Bolsa')) {
                    return String(m.category).startsWith('Bolsa');
                }
                return String(m[activityCellFilter.column]) === activityCellFilter.value;
            });
        }

        // 2c. Apply Search Filter
        if (activitySearchQuery) {
            // Support OR (|) and AND (+) logic, and ignore accents
            const normalizedQuery = normalizeString(activitySearchQuery);
            const orGroups = normalizedQuery.split('|').map(g => g.trim()).filter(g => g);
            
            filtered = filtered.filter(m => {
                const text = normalizeString((m.concept || '') + " " + (m.category || ''));
                
                // Return true if ANY of the OR groups match
                return orGroups.some(group => {
                    const andTerms = group.split('+').map(t => t.trim()).filter(t => t);
                    // Match only if ALL terms in this group are present
                    return andTerms.every(term => text.includes(term));
                });
            });
        }
        // 3. Sort
        if (activitySortConfig.key) {
            filtered.sort((a, b) => {
                let valA = a[activitySortConfig.key];
                let valB = b[activitySortConfig.key];

                if (activitySortConfig.key === 'amount') {
                    valA = Number(valA);
                    valB = Number(valB);
                } else if (typeof valA === 'string') {
                    valA = valA.toLowerCase();
                    valB = valB.toLowerCase();
                }

                if (valA < valB) return activitySortConfig.direction === 'asc' ? -1 : 1;
                if (valA > valB) return activitySortConfig.direction === 'asc' ? 1 : -1;
                return 0;
            });
        }

        // 4. Update UI Header Label
        if (elements.activityMonthLabel) {
            if (activityFilterMode === 'year') {
                elements.activityMonthLabel.textContent = activityListMonth.split('-')[0];
            } else if (activityFilterMode === 'month') {
                elements.activityMonthLabel.textContent = formatFiscalMonth(activityListMonth);
            } else if (activityFilterMode === 'week') {
                // Label updated inside filtering logic for precision with current daysSince calculation
            } else {
                elements.activityMonthLabel.textContent = 'Historial Completo';
            }
        }

        if (elements.activityFilterMode) {
            elements.activityFilterMode.value = activityFilterMode;
        }
        if (elements.activitySearchInput) {
            elements.activitySearchInput.value = activitySearchQuery;
        }

        // 4b. Pagination Logic
        const totalFilteredCount = filtered.length;
        if (activityFilterMode === 'all') {
            elements.activityPaginationContainer?.classList.remove('hidden');
            if (elements.activityPaginationInfo) {
                elements.activityPaginationInfo.textContent = `Mostrando ${Math.min(activityCurrentLimit, totalFilteredCount)} de ${totalFilteredCount} movimientos`;
            }
            if (elements.activityLoadMoreBtn) {
                elements.activityLoadMoreBtn.classList.toggle('hidden', activityCurrentLimit >= totalFilteredCount);
            }
            // Slice the data
            filtered = filtered.slice(0, activityCurrentLimit);
        } else {
            elements.activityPaginationContainer?.classList.add('hidden');
        }

        // 5. Render Table
        elements.activityTableBody.innerHTML = '';
        let totalAmount = 0;
        filtered.forEach(m => {
            try {
                const conceptLower = (m.concept || m.description || '').toLowerCase();
                const isInversion = m.category === 'Inversión' || m.type === 'bolsa' || conceptLower.includes('invers') || conceptLower.includes('bolsa');
                const displayAmount = m.amount;
                totalAmount += m.amount;
                const tr = document.createElement('tr');

                const amountClass = displayAmount >= 0 ? 'profit' : 'loss';
                const dateStr = m.date ? new Date(m.date).toLocaleDateString() : '---';
                const amountStr = (isInversion && displayAmount > 0 ? '+' : '') + fmtEUR(displayAmount, 2);

                const isFiltered = (col, val) => {
                    if (activityCellFilter.column !== col) return false;
                    if (col === 'category' && val.startsWith('Bolsa') && activityCellFilter.value?.startsWith('Bolsa')) return true;
                    return activityCellFilter.value === val;
                };

                const filteredDateStyle = isFiltered('date', dateStr) ? 'background: var(--primary-glow); color: white;' : '';
                const filteredConceptStyle = isFiltered('concept', m.concept) ? 'background: var(--primary-glow); color: white;' : '';
                const filteredCategoryStyle = isFiltered('category', m.category) ? 'background: var(--primary-glow); color: white;' : '';
                const filteredAmountStyle = isFiltered('amount', amountStr) ? 'background: var(--primary-glow); color: white;' : '';

                tr.innerHTML = `
                    <td style="cursor: pointer; font-size: 0.88rem; ${filteredDateStyle}" data-col="date" data-val="${dateStr}">${dateStr}</td>
                    <td class="concept-cell" style="cursor: pointer; font-size: 0.88rem; font-weight: 500; ${filteredConceptStyle}" data-col="concept" data-val="${m.concept}">${m.concept}</td>
                    <td class="activity-category-cell" style="cursor: pointer; ${filteredCategoryStyle}" data-col="category" data-val="${m.category}">
                        <span class="category-badge">${m.category}</span>
                        ${m.type === 'ahorro' && m.drawerName ? `<div class="drawer-label">${m.drawerName}</div>` : ''}
                    </td>
                    <td style="text-align: right; font-size: 0.92rem; font-weight: 700; cursor: pointer; ${filteredAmountStyle}" class="${amountClass}" data-col="amount" data-val="${amountStr}">${amountStr}</td>
                    <td class="activity-actions-cell">
                        <div class="actions-wrap">
                            <button class="btn-icon activity-edit-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Editar" style="padding: 2px 6px;">✏️</button>
                            <button class="btn-icon activity-copy-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Copiar" style="padding: 2px 6px;">📑</button>
                            <button class="btn-icon activity-delete-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Eliminar" style="padding: 2px 6px; filter: contrast(0.5) opacity(0.8);">🗑️</button>
                        </div>
                        <button class="activity-menu-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Acciones">⋮</button>
                    </td>
                `;
                elements.activityTableBody.appendChild(tr);
            } catch (err) {
                console.error("[Activity] Error rendering movement row:", m, err);
            }
        });

        // 6. Add Totals Row
        if (filtered.length > 0) {
            const totalTr = document.createElement('tr');
            totalTr.style.background = 'rgba(255,255,255,0.05)';
            totalTr.style.fontWeight = '700';
            totalTr.style.borderTop = '2px solid rgba(255,255,255,0.1)';
            totalTr.innerHTML = `
                <td colspan="2" style="padding: 0.5rem 1rem; text-align: right; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">Balance Total</td>
                <td colspan="2" style="padding: 0.5rem 1rem; font-size: 1.05rem; text-align: right;" class="${totalAmount >= 0 ? 'profit' : 'loss'}">${fmtEUR(totalAmount, 2)}</td>
                <td></td>
            `;
            elements.activityTableBody.appendChild(totalTr);
        }

        // Add sorting icons & styles
        if (elements.activityTable) {
            elements.activityTable.querySelectorAll('th[data-sort]').forEach(th => {
                let icon = th.querySelector('.sort-icon');
                if (!icon) {
                    icon = document.createElement('span');
                    icon.className = 'sort-icon';
                    th.appendChild(icon);
                }
                if (th.dataset.sort === activitySortConfig.key) {
                    icon.textContent = activitySortConfig.direction === 'asc' ? ' ▲' : ' ▼';
                    th.style.color = 'var(--primary)';
                    th.style.fontWeight = '700';
                } else {
                    icon.textContent = '';
                    th.style.color = '';
                    th.style.fontWeight = '';
                }
            });
        }

        // Add event listener for cell clicks to filter
        elements.activityTableBody.querySelectorAll('td[data-col]').forEach(td => {
            td.onclick = (e) => {
                const col = e.currentTarget.dataset.col;
                const val = e.currentTarget.dataset.val;

                // Clear search when filtering by cell
                activitySearchQuery = '';
                if (elements.activitySearchInput) {
                    elements.activitySearchInput.value = '';
                }

                if (activityCellFilter.column === col && activityCellFilter.value === val) {
                    activityCellFilter = { column: null, value: null };
                } else {
                    activityCellFilter = { column: col, value: val };
                }
                renderActivity();
            };
        });

        // Add event listeners for action buttons
        elements.activityTableBody.querySelectorAll('.activity-edit-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const { type, id, drawer, index } = e.currentTarget.dataset;
                if (type === 'bolsa') {
                    editStock(id);
                } else {
                    showEditMovementModal(drawer, parseInt(index));
                }
            };
        });
        elements.activityTableBody.querySelectorAll('.activity-copy-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const { type, id, drawer, index } = e.currentTarget.dataset;
                if (type === 'bolsa') {
                    copyStock(id);
                } else {
                    copySavingsMovement(drawer, parseInt(index));
                }
            };
        });
        elements.activityTableBody.querySelectorAll('.activity-delete-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const { type, id, drawer, index } = e.currentTarget.dataset;
                if (type === 'bolsa') {
                    showCustomConfirm("¿Estás seguro de que quieres eliminar esta inversión?", () => {
                        removeStock(id);
                        renderActivity();
                    });
                } else {
                    deleteSavingsMovement(drawer, parseInt(index));
                    setTimeout(() => renderActivity(), 100);
                }
            };
        });

        // ── Action Sheet (móvil) ──────────────────────────────────────────
        // Crear el panel flotante una sola vez en el DOM
        let activityActionSheet = document.getElementById('activityActionSheet');
        if (!activityActionSheet) {
            activityActionSheet = document.createElement('div');
            activityActionSheet.id = 'activityActionSheet';
            activityActionSheet.className = 'activity-action-sheet';
            activityActionSheet.innerHTML = `
                <div class="sheet-header">Acciones</div>
                <button class="activity-sheet-item" id="sheetEditBtn">✏️ <span>Editar</span></button>
                <button class="activity-sheet-item" id="sheetCopyBtn">📑 <span>Copiar</span></button>
                <div class="sheet-divider"></div>
                <button class="activity-sheet-item danger" id="sheetDeleteBtn">🗑️ <span>Eliminar</span></button>
            `;
            document.body.appendChild(activityActionSheet);

            // Cerrar al tocar fuera
            document.addEventListener('click', (e) => {
                if (!activityActionSheet.contains(e.target) && !e.target.classList.contains('activity-menu-btn')) {
                    activityActionSheet.classList.remove('visible');
                }
            }, { capture: true });
        }

        // Wire up each ⋮ button
        elements.activityTableBody.querySelectorAll('.activity-menu-btn').forEach(btn => {
            btn.onclick = (e) => {
                e.stopPropagation();
                const { type, id, drawer, index } = btn.dataset;
                const sheet = document.getElementById('activityActionSheet');

                // Posicionar el sheet cerca del botón
                const rect = btn.getBoundingClientRect();
                const sheetW = 180;
                let top = rect.bottom + 6;
                let left = rect.right - sheetW;
                if (left < 8) left = 8;
                // Si no cabe abajo, mostrar encima
                if (top + 160 > window.innerHeight) top = rect.top - 166;

                sheet.style.top = top + 'px';
                sheet.style.left = left + 'px';
                sheet.style.right = 'auto';
                sheet.classList.add('visible');

                // Reasignar acciones cada vez
                document.getElementById('sheetEditBtn').onclick = (ev) => {
                    ev.stopPropagation();
                    sheet.classList.remove('visible');
                    if (type === 'bolsa') editStock(id);
                    else showEditMovementModal(drawer, parseInt(index));
                };
                document.getElementById('sheetCopyBtn').onclick = (ev) => {
                    ev.stopPropagation();
                    sheet.classList.remove('visible');
                    if (type === 'bolsa') copyStock(id);
                    else copySavingsMovement(drawer, parseInt(index));
                };
                document.getElementById('sheetDeleteBtn').onclick = (ev) => {
                    ev.stopPropagation();
                    sheet.classList.remove('visible');
                    if (type === 'bolsa') {
                        showCustomConfirm('¿Eliminar esta inversión?', () => {
                            removeStock(id);
                            renderActivity();
                        });
                    } else {
                        deleteSavingsMovement(drawer, parseInt(index));
                        setTimeout(() => renderActivity(), 100);
                    }
                };
            };
        });
    }

    function updateActivityDrawerFilterOptions() {
        if (!elements.activityDrawerFilter) return;
        const currentValue = activityDrawerFilter;
        let html = '<option value="all">📁 Todas las Cuentas</option>';
        savingsDrawers.forEach(drawer => {
            html += `<option value="${drawer.id}">${drawer.icon || '📁'} ${drawer.name}</option>`;
        });
        elements.activityDrawerFilter.innerHTML = html;
        elements.activityDrawerFilter.value = currentValue;
        if (elements.activityDrawerFilter.value !== currentValue) {
            activityDrawerFilter = 'all';
            elements.activityDrawerFilter.value = 'all';
            localStorage.setItem('activityDrawerFilter', 'all');
        }
    }

    function copyStock(id) {
        const stock = stocks.find(s => s.id === id);
        if (!stock) return;

        elements.editId.value = ""; // Clear ID for new entry
        elements.tickerInput.value = stock.ticker;
        elements.marketSelect.value = stock.market;
        elements.dateInput.value = new Date().toISOString().split('T')[0];
        elements.qtyInput.value = stock.qty;
        elements.priceInput.value = (stock.price * stock.qty).toFixed(2);

        elements.modalTitle.textContent = "Copiar Inversión";
        elements.submitStockBtn.textContent = "Añadir Inversión";
        toggleModal(true);
    }

    function copySavingsMovement(drawerId, mvmtIndex) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || !drawer.movements[mvmtIndex]) return;

        const m = drawer.movements[mvmtIndex];

        showAddMovementModal(drawerId);

        const conceptInput = document.getElementById('movementConceptInput');
        const amountInput = document.getElementById('movementAmountInput');

        if (conceptInput) conceptInput.value = m.concept || m.description || '';
        if (amountInput) amountInput.value = Math.abs(m.amount).toFixed(2);
        if (elements.savingsDateInput) elements.savingsDateInput.value = new Date().toISOString().split('T')[0];

        // Call updateSavingsMovementType FIRST because it rebuilds category options
        // Pre-fill categories and subcategories
        const catParts = (m.category || '').split(':');
        const mainCat = catParts[0];
        const subCat = catParts[1] || '';

        updateSavingsMovementType(m.amount >= 0 ? 'income' : 'expense');

        if (elements.savingsCategorySelect) elements.savingsCategorySelect.value = mainCat;
        if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = subCat;

        const title = document.getElementById('savingsModalTitle');
        if (title) title.textContent = `Copiar: ${drawer.name}`;
    }

    function renderAnalisis() {
        if (!elements.analisisTableBody) return;

        const monthlyData = Array.from({ length: 12 }, (_, i) => ({
            month: i + 1,
            income: 0,
            expenses: 0,
            netSaving: 0,
            totalAhorro: 0
        }));

        for (let mIdx = 0; mIdx < 12; mIdx++) {
            const monthNum = mIdx + 1;
            let mInc = 0;
            let mExp = 0;
            let mNetSaving = 0;
            let mTotalAhorro = 0;

            let totalPrimaryIncome = 0;
            let totalBudgetedProvisions = 0;

            nominaData.forEach(drawer => {
                const isIncomeType = drawer.type === 'income';
                const mvmts = (drawer.movements || []).filter(m => {
                    const active = (m.activeMonths || []).map(Number);
                    return active.includes(monthNum);
                });

                const hasEverHadExpenses = (drawer.movements || []).some(m => !isProvision(m) && m.amount < 0);

                mvmts.forEach(m => {
                    if (m.amount < 0) {
                        mExp += Math.abs(m.amount);
                    } else if (isIncomeType) {
                        mInc += m.amount;
                    }

                    // Global sums logic for Undestined calculation (per month)
                    if (m.amount > 0) {
                        if (isIncomeType) {
                            totalPrimaryIncome += m.amount;
                        } else if (isProvision(m) && !drawer.isAutomatic) {
                            totalBudgetedProvisions += m.amount;
                        }
                    } else if (m.amount < 0 && isIncomeType) {
                        totalPrimaryIncome += m.amount;
                    }

                    // Net Saving logic:
                    // 1. All positive movements in 'saving' drawers
                    // 2. Provisions in other drawers that have no expenses
                    const isSavingDrawerLocal = drawer.type === 'saving';
                    if (!isIncomeType && m.amount > 0 && !drawer.isAutomatic) {
                        if (isSavingDrawerLocal || (!hasEverHadExpenses && isProvision(m))) {
                            mNetSaving += m.amount;
                        }
                    }
                });

                // Ahorro Total per drawer
                if (!isIncomeType && !drawer.isAutomatic) {
                    const balance = mvmts.reduce((sum, m) => sum + m.amount, 0);
                    mTotalAhorro += balance;
                }
            });

            // Calculate monthly undestined and add to totals
            const mUndestined = totalPrimaryIncome - totalBudgetedProvisions;
            // mNetSaving stays as explicit budgeted provisions
            mTotalAhorro += mUndestined;

            monthlyData[mIdx].income = mInc;
            monthlyData[mIdx].expenses = mExp;
            monthlyData[mIdx].netSaving = mNetSaving;
        }

        const totalInc = monthlyData.reduce((s, d) => s + d.income, 0);
        const totalExp = monthlyData.reduce((s, d) => s + d.expenses, 0);
        const totalNetSaving = monthlyData.reduce((s, d) => s + d.netSaving, 0);

        // Update Yearly Totals
        if (elements.totalYearlyIncome) elements.totalYearlyIncome.textContent = fmtEUR(totalInc);
        if (elements.totalYearlyExpense) elements.totalYearlyExpense.textContent = fmtEUR(totalExp);
        if (elements.totalYearlyNetSaving) elements.totalYearlyNetSaving.textContent = fmtEUR(totalNetSaving);

        const currentFiscalMonthStr = getFiscalMonth();
        const currentMonthNum = parseInt(currentFiscalMonthStr.split('-')[1]);

        const monthNamesFull = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

        // Sort monthlyData for display
        const displayData = [...monthlyData];
        if (analisisSortConfig.key) {
            displayData.sort((a, b) => {
                let valA = a[analisisSortConfig.key];
                let valB = b[analisisSortConfig.key];
                if (analisisSortConfig.direction === 'asc') return valA - valB;
                return valB - valA;
            });
        }

        // Update Sort Icons in Table Headers
        elements.analisisSection?.querySelectorAll('th[data-sort]').forEach(th => {
            const icon = th.querySelector('.sort-icon');
            if (icon) {
                if (th.dataset.sort === analisisSortConfig.key) {
                    icon.textContent = analisisSortConfig.direction === 'asc' ? ' ↑' : ' ↓';
                    th.style.color = 'var(--primary)';
                } else {
                    icon.textContent = '';
                    th.style.color = 'inherit';
                }
            }
        });

        if (analisisViewMode === 'cards' && elements.analisisGrid && elements.analisisTableContainer) {
            elements.analisisTableContainer.classList.add('hidden');
            elements.analisisGrid.classList.remove('hidden');
            if (elements.analisisTableViewBtn) {
                elements.analisisTableViewBtn.classList.remove('active');
                elements.analisisTableViewBtn.style.background = 'transparent';
                elements.analisisTableViewBtn.style.color = 'var(--text-muted)';
            }
            if (elements.analisisCardViewBtn) {
                elements.analisisCardViewBtn.classList.add('active');
                elements.analisisCardViewBtn.style.background = 'var(--primary)';
                elements.analisisCardViewBtn.style.color = 'white';
            }

            elements.analisisGrid.innerHTML = displayData.map((d) => {
                const isCurrentMonth = d.month === currentMonthNum;
                const isInsufficient = (d.expenses + d.netSaving) > d.income;
                const savingPct = d.income > 0 ? (d.netSaving / d.income * 100).toFixed(1) : 0;

                return `
                    <div class="card drawer-card glass-panel ${isCurrentMonth ? 'current-month-card' : ''}" 
                         style="cursor: pointer; border: 1px solid ${isCurrentMonth ? 'var(--primary)' : 'rgba(255,255,255,0.1)'}; 
                                background: ${isCurrentMonth ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255,255,255,0.03)'};
                                padding: 1.2rem; display: flex; flex-direction: column; gap: 0.8rem;"
                         data-month="${d.month}" role="button" tabindex="0">
                        <div style="display: flex; justify-content: space-between; align-items: center; pointer-events: none;">
                            <h4 style="margin: 0; font-size: 1.1rem; color: var(--primary);">${monthNamesFull[d.month - 1]}</h4>
                            ${isCurrentMonth ? '<span class="badge-live">Actual</span>' : ''}
                        </div>
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; pointer-events: none;">
                            <div>
                                <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Ingresos</div>
                                <div style="font-weight: 700; color: var(--success);">${fmtEUR(d.income)}</div>
                            </div>
                            <div>
                                <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Gastos</div>
                                <div style="font-weight: 700; color: var(--danger);">${fmtEUR(d.expenses)}</div>
                            </div>
                            <div style="grid-column: span 2; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 0.5rem; display: flex; justify-content: space-between; align-items: center;">
                                <div>
                                    <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Ahorro Neto</div>
                                    <div style="font-weight: 700; color: #f59e0b; font-size: 1.1rem;">${fmtEUR(d.netSaving)}</div>
                                </div>
                                <div style="text-align: right;">
                                    <div style="font-size: 0.75rem; opacity: 0.6;">Tasa Ahorro</div>
                                    <div style="font-weight: 600; color: var(--text-main);">${savingPct}%</div>
                                </div>
                            </div>
                        </div>
                        ${isInsufficient ? `
                            <div style="margin-top: 0.2rem; font-size: 0.7rem; color: var(--danger); background: rgba(239, 68, 68, 0.1); padding: 4px 8px; border-radius: 4px; display: flex; align-items: center; gap: 4px; pointer-events: none;">
                                ⚠️ Saldo insuficiente (${fmtEUR(d.income - (d.expenses + d.netSaving))})
                            </div>
                        ` : ''}
                    </div>
                `;
            }).join('');
        } else if (elements.analisisTableContainer && elements.analisisGrid) {
            elements.analisisTableContainer.classList.remove('hidden');
            elements.analisisGrid.classList.add('hidden');
            if (elements.analisisTableViewBtn) {
                elements.analisisTableViewBtn.classList.add('active');
                elements.analisisTableViewBtn.style.background = 'var(--primary)';
                elements.analisisTableViewBtn.style.color = 'white';
            }
            if (elements.analisisCardViewBtn) {
                elements.analisisCardViewBtn.classList.remove('active');
                elements.analisisCardViewBtn.style.background = 'transparent';
                elements.analisisCardViewBtn.style.color = 'var(--text-muted)';
            }

            elements.analisisTableBody.innerHTML = displayData.map((d) => {
                const isCurrentMonth = d.month === currentMonthNum;
                const isInsufficient = (d.expenses + d.netSaving) > d.income;

                let rowClasses = [];
                if (isCurrentMonth) rowClasses.push('current-month-row');
                if (isInsufficient) rowClasses.push('insufficient-income-row');

                const classAttr = rowClasses.length > 0 ? ` class="${rowClasses.join(' ')}"` : '';

                return `<tr${classAttr} style="border-bottom: 1px solid rgba(255,255,255,0.05); cursor: pointer;" data-month="${d.month}">` +
                    '<td style="padding: 0.8rem 1rem; font-weight: 500;">' + monthNames[d.month - 1] + '</td>' +
                    '<td style="padding: 0.8rem 1rem; text-align: right; color: var(--success);">' + fmtEUR(d.income) + '</td>' +
                    '<td style="padding: 0.8rem 1rem; text-align: right; color: var(--danger); opacity: 0.8;">' + fmtEUR(d.expenses) + '</td>' +
                    '<td style="padding: 0.8rem 1rem; text-align: right; color: #f59e0b; font-weight: 600;">' + fmtEUR(d.netSaving) + '</td>' +
                    '</tr>';
            }).join('') +
                '<tr style="border-top: 2px solid var(--primary); background: rgba(255,255,255,0.03);">' +
                '<td style="padding: 0.8rem 1rem; font-weight: 700;">Total</td>' +
                '<td style="padding: 0.8rem 1rem; text-align: right; color: var(--success); font-weight: 700;">' + fmtEUR(totalInc) + '</td>' +
                '<td style="padding: 0.8rem 1rem; text-align: right; color: var(--danger); font-weight: 700;">' + fmtEUR(totalExp) + '</td>' +
                '<td style="padding: 0.8rem 1rem; text-align: right; color: #f59e0b; font-weight: 700;">' + fmtEUR(totalNetSaving) + '</td>' +
                '</tr>';
        }

        renderAnalisisChart(monthlyData);

        // Render Deficit Summary
        if (elements.analisisDeficitContainer) {
            const deficitMonths = monthlyData.filter(d => (d.expenses + d.netSaving) > d.income);
            if (deficitMonths.length > 0) {
                elements.analisisDeficitContainer.innerHTML = `
                    <div class="glass-panel" style="padding: 1.2rem; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.05);">
                        <h3 style="margin: 0 0 1rem 0; font-size: 1rem; color: var(--danger); display: flex; align-items: center; gap: 8px;">
                            <span>⚠️</span> Meses con saldo insuficiente
                        </h3>
                        <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                            ${deficitMonths.map(d => {
                    const diff = d.income - (d.expenses + d.netSaving);
                    return `
                                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.8rem; background: rgba(255,255,255,0.03); border-radius: 8px;">
                                        <span style="font-weight: 600;">${monthNames[d.month - 1]}</span>
                                        <div style="text-align: right;">
                                            <span style="color: var(--danger); font-weight: 700; font-size: 1.1rem;">${fmtEUR(diff)}</span>
                                            <div style="font-size: 0.75rem; opacity: 0.6;">Déficit respecto a gastos + ahorro</div>
                                        </div>
                                    </div>
                                `;
                }).join('')}
                        </div>
                    </div>
                `;
            } else {
                elements.analisisDeficitContainer.innerHTML = '';
            }
        }
    }

    window.showMonthDetailModal = showMonthDetailModal;
    function showMonthDetailModal(monthNum) {
        if (!elements.monthDetailModal || !elements.monthDetailContent) return;

        const monthNamesLong = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        if (elements.monthDetailTitle) {
            elements.monthDetailTitle.textContent = `Detalles de ${monthNamesLong[monthNum - 1]}`;
        }

        let mInc = 0;
        let mExp = 0;
        let mNetSaving = 0;
        let mTotalAhorro = 0;
        let mPaidExpenses = 0;
        let mPlannedExpenses = 0;
        const allMvmtDetails = [];

        let totalPrimaryIncome = 0;
        let totalBudgetedProvisions = 0;

        nominaData.forEach(drawer => {
            const isIncomeType = drawer.type === 'income';
            const mvmts = (drawer.movements || []).filter(m => {
                const active = (m.activeMonths || []).map(Number);
                return active.includes(monthNum);
            });

            const hasEverHadExpenses = (drawer.movements || []).some(m => !isProvision(m) && m.amount < 0);

            mvmts.forEach(m => {
                if (m.amount < 0) {
                    const absAmt = Math.abs(m.amount);
                    mExp += absAmt;
                    mPlannedExpenses += absAmt;
                    if (m.paid) mPaidExpenses += absAmt;

                    allMvmtDetails.push({
                        drawerName: drawer.name,
                        icon: drawer.icon || getNominaIcon(drawer.name, drawer.type),
                        concept: m.concept || m.description,
                        amount: m.amount,
                        paid: m.paid,
                        type: 'expense'
                    });
                } else if (isIncomeType) {
                    mInc += m.amount;
                    allMvmtDetails.push({
                        drawerName: drawer.name,
                        icon: drawer.icon || getNominaIcon(drawer.name, drawer.type),
                        concept: m.concept || m.description,
                        amount: m.amount,
                        type: 'income'
                    });
                }

                // Global sums logic for Undestined calculation
                if (m.amount > 0) {
                    if (isIncomeType) {
                        totalPrimaryIncome += m.amount;
                    } else if (isProvision(m) && !drawer.isAutomatic) {
                        totalBudgetedProvisions += m.amount;
                    }
                } else if (m.amount < 0 && isIncomeType) {
                    totalPrimaryIncome += m.amount;
                }

                // Net Saving logic:
                // 1. All positive movements in 'saving' drawers
                // 2. Provisions in other drawers that have no expenses
                const isSavingDrawerLocal = drawer.type === 'saving';
                if (!isIncomeType && m.amount > 0 && !drawer.isAutomatic) {
                    if (isSavingDrawerLocal || (!hasEverHadExpenses && isProvision(m))) {
                        mNetSaving += m.amount;
                    }
                }
            });

            // Ahorro Total per drawer
            if (!isIncomeType && !drawer.isAutomatic) {
                const balance = mvmts.reduce((sum, m) => sum + m.amount, 0);
                mTotalAhorro += balance;
            }
        });

        const mUndestined = totalPrimaryIncome - totalBudgetedProvisions;
        // mNetSaving stays as explicit budgeted provisions

        if (mUndestined !== 0) {
            allMvmtDetails.push({
                drawerName: 'Dinero No Destinado',
                icon: '💰',
                concept: 'Sobrante mensual',
                amount: mUndestined,
                type: mUndestined > 0 ? 'income' : 'expense'
            });
        }

        const summaryRows = [
            { label: '💰 Ingresos', value: fmtEUR(mInc), color: 'var(--success)' },
            { label: '💸 Gastos', value: fmtEUR(mPlannedExpenses), color: 'var(--danger)' },
            { label: '🏦 Ahorro Total', value: fmtEUR(mTotalAhorro), color: mTotalAhorro >= 0 ? 'var(--success)' : 'var(--danger)' },
            { label: '✨ Ahorro Neto', value: fmtEUR(mNetSaving), color: '#f59e0b' }
        ];

        let contentHtml = `
            <div class="table-container glass-panel" style="margin-bottom: 2rem; overflow-x: auto;">
                <table style="width: 100%; border-collapse: collapse;">
                    <tbody>
                        ${summaryRows.map(r => `
                            <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
                                <td style="padding: 0.7rem 1rem; opacity: 0.7; font-size: 0.9rem;">${r.label}</td>
                                <td style="padding: 0.7rem 1rem; text-align: right; font-weight: 700; color: ${r.color}; font-size: 0.95rem;">${r.value}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <h3 style="margin-bottom: 1rem; font-size: 1.1rem; border-bottom: 1px solid var(--border-color); padding-bottom: 0.5rem;">Movimientos del Mes</h3>
            <div style="display: flex; flex-direction: column; gap: 0.8rem;">
        `;

        // Group movements by drawer for better display in modal
        const grouped = allMvmtDetails.reduce((acc, mv) => {
            if (!acc[mv.drawerName]) acc[mv.drawerName] = { icon: mv.icon, items: [] };
            acc[mv.drawerName].items.push(mv);
            return acc;
        }, {});

        Object.entries(grouped).forEach(([name, data]) => {
            contentHtml += `
                <div style="background: rgba(255,255,255,0.03); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden;">
                    <div style="display: flex; align-items: center; gap: 10px; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.05);">
                        <span style="font-size: 1.1rem;">${data.icon}</span>
                        <span style="font-weight: 700; color: var(--primary); font-size: 0.9rem;">${name}</span>
                    </div>
                    <div style="display: flex; flex-direction: column;">
                        ${data.items.map((m, idx) => `
                            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0.8rem; ${idx < data.items.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.02);' : ''}">
                                <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                                    ${m.type === 'expense' ? `<span style="opacity: 0.7; font-size: 0.8rem;">${m.paid ? '✅' : '⏳'}</span>` : ''}
                                    <span style="font-size: 0.8rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${m.concept}">${m.concept}</span>
                                </div>
                                <span style="font-size: 0.85rem; font-weight: 600; color: var(--${m.amount >= 0 ? 'success' : 'danger'}); white-space: nowrap; margin-left: 8px;">${m.amount > 0 ? '+' : ''}${fmtEUR(m.amount)}</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        });

        contentHtml += `</div>`;
        elements.monthDetailContent.innerHTML = contentHtml;
        elements.monthDetailModal.classList.remove('hidden');
    }


    function renderAnalisisChart(data) {
        if (!elements.analisisChart) return;

        const container = elements.analisisChart;
        container.innerHTML = '';

        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses + d.netSaving)), 1000);
        const monthNames = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

        const chartHtml = `
            <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; gap: 4px; padding-top: 20px;">
                ${data.map((d, i) => {
            const incH = (d.income / maxVal) * 100;
            const combinedExpSavH = ((d.expenses + d.netSaving) / maxVal) * 100;
            const expH = (d.expenses / (d.expenses + d.netSaving || 1)) * 100;
            const savH = (d.netSaving / (d.expenses + d.netSaving || 1)) * 100;

            return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">
                            <div style="display: flex; align-items: flex-end; gap: 2px; flex-grow: 1; width: 100%; justify-content: center;">
                                <div title="Ingresos: ${fmtEUR(d.income)}" style="width: 40%; height: ${incH}%; background: var(--success); border-radius: 4px 4px 0 0; opacity: 0.8; min-height: 2px;"></div>
                                <div style="width: 40%; height: ${combinedExpSavH}%; display: flex; flex-direction: column-reverse; min-height: 2px;">
                                    <div title="Gastos: ${fmtEUR(d.expenses)}" style="width: 100%; height: ${expH}%; background: var(--danger); border-radius: 0 0 0 0; opacity: 0.8;"></div>
                                    <div title="Ahorro Neto: ${fmtEUR(d.netSaving)}" style="width: 100%; height: ${savH}%; background: #f59e0b; border-radius: 4px 4px 0 0; opacity: 0.9;"></div>
                                </div>
                            </div>
                            <div style="font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.7; font-weight: 600;">${monthNames[i]}</div>
                        </div>
                    `;
        }).join('')}
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem; justify-content: center; font-size: 0.8rem; flex-wrap: wrap;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <div style="width: 12px; height: 12px; background: var(--success); border-radius: 2px;"></div>
                    <span>Ingresos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <div style="width: 12px; height: 12px; background: var(--danger); border-radius: 2px;"></div>
                    <span>Gastos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <div style="width: 12px; height: 12px; background: #f59e0b; border-radius: 2px;"></div>
                    <span>Ahorro Neto</span>
                </div>
            </div>
        `;

        container.innerHTML = chartHtml;
    }

    function renderAhorroSummaryDrawer() {
        const container = document.getElementById('ahorroSummaryDrawer');
        if (!container) return;

        // Collect all months with data
        const allMonths = new Set();
        allMonths.add(getFiscalMonth()); // Always include current
        savingsDrawers.forEach(drawer => {
            (drawer.movements || []).forEach(m => {
                const d = new Date(m.date);
                if (!isNaN(d.getTime())) allMonths.add(getFiscalMonth(d));
            });
        });
        const sortedMonths = Array.from(allMonths).sort().reverse();

        if (!selectedAhorroFiscalMonth && sortedMonths.length > 0) {
            selectedAhorroFiscalMonth = sortedMonths[0];
        }

        // Calculate Category Totals using same filter as the list view
        const categoryTotals = {};
        savingsDrawers.forEach(drawer => {
            (drawer.movements || []).forEach(m => {
                const mDate = new Date(m.date);
                if (isNaN(mDate.getTime())) return;

                let match = false;
                if (ahorroFilterMode === 'month') {
                    match = (m.date && getFiscalMonth(mDate) === ahorroListMonth);
                } else if (ahorroFilterMode === 'week') {
                    match = isDateInAhorroWeek(m.date, ahorroListMonth);
                } else if (ahorroFilterMode === 'year') {
                    const year = ahorroListMonth.split('-')[0];
                    match = (m.date && m.date.startsWith(year));
                } else {
                    match = true; // All
                }

                if (match) {
                    const cat = m.category || (m.amount >= 0 ? 'Ahorro' : 'Gasto');
                    categoryTotals[cat] = (categoryTotals[cat] || 0) + m.amount;
                }
            });
        });

        const hasData = Object.keys(categoryTotals).length > 0;
        const sortedCats = Object.entries(categoryTotals).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));

        container.innerHTML = `
            <div class="card drawer-card glass-panel summary-drawer" style="border: 1px solid var(--primary); padding: 1rem; width: 100%;">
                <div class="drawer-header" id="ahorroSummaryHeader" style="cursor:pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="display:flex; align-items:center; gap: 10px; flex: 1;">
                        <span class="drawer-icon">📊</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">Distribución por Categoría <span class="toggle-arrow ${isAhorroSummaryExpanded ? 'expanded' : ''}">▼</span></h4>
                            <p style="font-size: 0.8rem; opacity: 0.7;">Resumen de movimientos por categoría</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 0.8rem; opacity: 0.6; background: rgba(255,255,255,0.05); padding: 4px 8px; border-radius: 6px;">${ahorroFilterMode === 'month' ? formatFiscalMonth(ahorroListMonth) :
                ahorroFilterMode === 'week' ? (()=>{
                    const {start, end} = getAhorroWeekRange(ahorroListMonth);
                    const f = d => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
                    return `${f(start)} - ${f(end)}`;
                })() :
                ahorroFilterMode === 'year' ? ahorroListMonth.split('-')[0] :
                    'Todos'
            }</span>
                    </div>
                </div>

                <div class="collapsible-content ${isAhorroSummaryExpanded ? 'expanded' : ''}" id="ahorroSummaryContent">
                    <!-- Global Wealth Summary -->
                    <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; border: 1px dashed var(--primary-light); padding: 1.2rem; border-radius: 16px; background: rgba(var(--primary-rgb), 0.05);">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Efectivo (Cuentas)</div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: white;">${fmtEUR(savingsDrawers.filter(d => d.id !== 'bolsa').reduce((s, d) => s + d.balance, 0))}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Inversiones (Bolsa)</div>
                            <div style="font-size: 1.2rem; font-weight: 700; color: var(--primary);">${fmtEUR((savingsDrawers.find(d => d.id === 'bolsa')?.balance || 0))}</div>
                        </div>
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Patrimonio Total</div>
                            <div style="font-size: 1.3rem; font-weight: 800; color: var(--success);">${fmtEUR(savingsDrawers.reduce((s, d) => s + d.balance, 0))}</div>
                        </div>
                    </div>

                    ${!hasData ? `
                        <div style="margin-top: 1rem; text-align: center; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                            <p style="opacity: 0.5; margin: 0;">No hay movimientos de flujo en este periodo.</p>
                        </div>
                    ` : `
                        <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem;">
                            ${sortedCats.map(([cat, total]) => {
                // Get drawers that contribute to this category
                const contributors = {};
                savingsDrawers.forEach(d => {
                    (d.movements || []).forEach(m => {
                        const mDate = new Date(m.date);
                        if (ahorroFilterMode === 'month') match = (getFiscalMonth(mDate) === ahorroListMonth);
                        else if (ahorroFilterMode === 'week') match = isDateInAhorroWeek(m.date, ahorroListMonth);
                        else if (ahorroFilterMode === 'year') match = (m.date && m.date.startsWith(ahorroListMonth.split('-')[0]));
                        else match = true;

                        if (match && (m.category || (m.amount >= 0 ? 'Ahorro' : 'Gasto')) === cat) {
                            contributors[d.name] = (contributors[d.name] || 0) + m.amount;
                        }
                    });
                });

                return `
                                <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                                        <div style="font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em;">${cat}</div>
                                        <div style="font-size: 1.1rem; font-weight: 700; color: ${total >= 0 ? 'var(--success)' : 'var(--danger)'};"> ${total > 0 ? '+' : ''}${fmtEUR(total)}</div>
                                    </div>
                                    <div style="margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 6px;">
                                        ${Object.entries(contributors).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1])).map(([dName, dAmt]) => `
                                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; opacity: 0.7; margin-bottom: 2px;">
                                                <span>${dName}</span>
                                                <span style="font-weight: 500;">${fmtEUR(dAmt)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>`;
            }).join('')}
                        </div>
                    `}
                </div>
            </div>
        `;

        const header = container.querySelector('#ahorroSummaryHeader');
        header.onclick = (e) => {
            if (e.target.closest('select')) return;
            isAhorroSummaryExpanded = !isAhorroSummaryExpanded;
            localStorage.setItem('isAhorroSummaryExpanded', isAhorroSummaryExpanded);
            renderAhorroSummaryDrawer();
        };
    }

    function renderSavingsList() {
        if (!elements.ahorroTableBody || !elements.ahorroCurrentMonthLabel) return;

        // Update Label
        if (ahorroFilterMode === 'month') {
            elements.ahorroCurrentMonthLabel.textContent = formatFiscalMonth(ahorroListMonth);
            elements.prevAhorroMonthBtn.style.visibility = 'visible';
            elements.nextAhorroMonthBtn.style.visibility = 'visible';
        } else if (ahorroFilterMode === 'week') {
            const { start, end } = getAhorroWeekRange(ahorroListMonth);
            const fmtDay = d => d.toLocaleDateString('es-ES', { day: '2-digit', month: 'short' });
            elements.ahorroCurrentMonthLabel.textContent = `${fmtDay(start)} - ${fmtDay(end)}`;
            elements.prevAhorroMonthBtn.style.visibility = 'visible';
            elements.nextAhorroMonthBtn.style.visibility = 'visible';
        } else if (ahorroFilterMode === 'year') {
            elements.ahorroCurrentMonthLabel.textContent = ahorroListMonth.split('-')[0];
            elements.prevAhorroMonthBtn.style.visibility = 'visible';
            elements.nextAhorroMonthBtn.style.visibility = 'visible';
        } else {
            elements.ahorroCurrentMonthLabel.textContent = 'Todos los registros';
            elements.prevAhorroMonthBtn.style.visibility = 'hidden';
            elements.nextAhorroMonthBtn.style.visibility = 'hidden';
        }
        // Sync filter dropdowns
        if (elements.ahorroFilterMode) {
            elements.ahorroFilterMode.value = ahorroFilterMode;
        }
        if (elements.ahorroListFilterMode) {
            elements.ahorroListFilterMode.classList.toggle('active', ahorroListFilterMode === 'totals');
        }

        elements.ahorroTableBody.innerHTML = '';

        if (savingsDrawers.length === 0) {
            elements.ahorroTableBody.innerHTML = '<tr><td colspan="4" style="padding:2rem; text-align:center; opacity:0.5;">No hay cuentas configuradas</td></tr>';
            return;
        }

        // Apply Sorting to Drawers
        const sortedDrawers = [...savingsDrawers].sort((a, b) => {
            let valA, valB;

            const getMvmts = (d) => {
                if (d.id === 'bolsa') {
                    const fx = window.FX_RATE || 1;
                    return stocks.map(s => ({
                        date: s.date || new Date().toISOString().split('T')[0],
                        category: `Bolsa: ${s.market || 'Acción'}`,
                        concept: `${(s.qty || 0) < 0 ? 'Venta' : 'Compra'} ${s.ticker} (${s.qty || 0} uds)`,
                        amount: (s.qty || 0) * (s.price || 0) * (s.currency === 'USD' ? fx : 1)
                    }));
                }
                return d.movements || [];
            };

            if (ahorroSortConfig.key === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (ahorroSortConfig.key === 'balance') {
                const getFilteredBalance = (d) => {
                    let mvmts = getMvmts(d);
                    if (ahorroFilterMode === 'month') {
                        mvmts = mvmts.filter(m => m.date && getFiscalMonth(m.date) === ahorroListMonth);
                    } else if (ahorroFilterMode === 'week') {
                        mvmts = mvmts.filter(m => isDateInAhorroWeek(m.date, ahorroListMonth));
                    } else if (ahorroFilterMode === 'year') {
                        const year = ahorroListMonth.split('-')[0];
                        mvmts = mvmts.filter(m => m.date && getFiscalMonth(m.date).startsWith(year));
                    }
                    return mvmts.reduce((s, m) => s + m.amount, 0);
                };
                valA = getFilteredBalance(a);
                valB = getFilteredBalance(b);
            } else if (ahorroSortConfig.key === 'concept') {
                const getLeadCategory = (drawer) => {
                    let mvmts = getMvmts(drawer).filter(m => {
                        if (ahorroFilterMode === 'month') return m.date && getFiscalMonth(m.date) === ahorroListMonth;
                        if (ahorroFilterMode === 'week') return isDateInAhorroWeek(m.date, ahorroListMonth);
                        if (ahorroFilterMode === 'year') return m.date && getFiscalMonth(m.date).startsWith(ahorroListMonth.split('-')[0]);
                        return true;
                    });
                    if (mvmts.length === 0) return '';
                    const sortedMvmts = [...mvmts].sort((m1, m2) => new Date(m2.date) - new Date(m1.date));
                    return (sortedMvmts[0].category || '').toLowerCase();
                };
                valA = getLeadCategory(a);
                valB = getLeadCategory(b);
            }

            if (valA < valB) return ahorroSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return ahorroSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Update Sort Icons in Headers
        const headerIcons = document.querySelectorAll('.sort-icon-ahorro');
        const headers = ['name', 'balance'];
        headerIcons.forEach((icon, idx) => {
            const key = headers[idx];
            if (ahorroSortConfig.key === key) {
                icon.textContent = ahorroSortConfig.direction === 'asc' ? '🔼' : '🔽';
                icon.style.opacity = '1';
            } else {
                icon.textContent = '↕️';
                icon.style.opacity = '0.3';
            }
        });

        let globalFilteredTotal = 0;
        const listFragment = document.createDocumentFragment();

        sortedDrawers.forEach(drawer => {
            // Filter movements for this drawer and selected mode
            let drawerMovements = [];
            if (drawer.id === 'bolsa') {
                const fx = window.FX_RATE || 1;
                drawerMovements = stocks.map(s => ({
                    date: s.date || new Date().toISOString().split('T')[0],
                    concept: `${(s.qty || 0) < 0 ? 'Venta' : 'Compra'} ${s.ticker} (${s.qty || 0} uds)`,
                    category: `Bolsa: ${s.market || 'Acción'}`,
                    amount: (s.qty || 0) * (s.price || 0) * (s.currency === 'USD' ? fx : 1)
                }));
            } else {
                drawerMovements = (drawer.movements || []);
            }

            if (ahorroFilterMode === 'month') {
                drawerMovements = drawerMovements.filter(m => m.date && getFiscalMonth(m.date) === ahorroListMonth);
            } else if (ahorroFilterMode === 'week') {
                drawerMovements = drawerMovements.filter(m => isDateInAhorroWeek(m.date, ahorroListMonth));
            } else if (ahorroFilterMode === 'year') {
                const year = ahorroListMonth.split('-')[0];
                drawerMovements = drawerMovements.filter(m => m.date && getFiscalMonth(m.date).startsWith(year));
            }

            if (drawerMovements.length === 0) return; // Don't show drawer if no movements in this view

            // Calculate balance from filtered movements only
            const filteredBalance = drawerMovements.reduce((sum, m) => sum + m.amount, 0);
            globalFilteredTotal += filteredBalance;

            // Calculate balance up to today if there are future movements in this period
            const today = new Date();
            today.setHours(23, 59, 59, 999);
            const balanceToday = drawerMovements.reduce((sum, m) => {
                const mDate = new Date(m.date + 'T00:00:00');
                return mDate <= today ? sum + m.amount : sum;
            }, 0);

            const hasFutureMovements = Math.abs(filteredBalance - balanceToday) > 0.01;
            const balanceTodayContent = hasFutureMovements 
                ? `<span style="font-size: 0.85em; opacity: 0.6; margin-left: 4px; font-weight: 400;">[${fmtEUR(balanceToday)}]</span>` 
                : '';

            // Drawer Header Row
            const headerTr = document.createElement('tr');
            headerTr.className = 'ahorro-list-header';
            headerTr.innerHTML = `
                <td colspan="2">
                    <div class="header-content">
                        <div style="display:flex; align-items:center; gap:8px;">
                            <span class="drawer-title-txt" style="cursor:pointer;" title="Expandir/Contraer todos">${drawer.icon} ${drawer.name}</span>
                            <span class="calendar-header-icon" style="cursor:pointer; font-size:0.9rem; opacity:0.8;" title="Ver Calendario">📅</span>
                        </div>
                        ${(!drawer.isAuto && ahorroListFilterMode === 'detail') ? `
                            <div class="list-actions">
                                <button class="add-mvmt-list-btn btn-primary" title="Añadir Movimiento">➕</button>
                                <button class="transfer-list-btn btn-secondary" title="Traspasar">⇆</button>
                                <button class="edit-drawer-list-btn btn-secondary" title="Editar Cuenta">✏️</button>
                                <button class="delete-drawer-list-btn btn-danger" title="Borrar Cuenta">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="balance">${fmtEUR(filteredBalance)}${balanceTodayContent}</td>
            `;

            // Add event listeners to list buttons
            if (!drawer.isAuto && ahorroListFilterMode === 'detail') {
                headerTr.querySelector('.add-mvmt-list-btn').onclick = (e) => { e.stopPropagation(); showAddMovementModal(drawer.id); };
                headerTr.querySelector('.transfer-list-btn').onclick = (e) => { e.stopPropagation(); showTransferModal(drawer.id); };
                headerTr.querySelector('.edit-drawer-list-btn').onclick = (e) => { e.stopPropagation(); showEditDrawerModal(drawer.id); };
                headerTr.querySelector('.delete-drawer-list-btn').onclick = (e) => { e.stopPropagation(); deleteSavingsDrawer(drawer.id); };
            }

            // Calendar icon listener
            const calIcon = headerTr.querySelector('.calendar-header-icon');
            if (calIcon) {
                calIcon.onclick = (e) => {
                    e.stopPropagation();
                    showSavingsCalendar(drawer.id);
                };
            }

            // Click on drawer name to expand/collapse all movements of this drawer
            const drawerTitleSpan = headerTr.querySelector('.drawer-title-txt');
            if (drawerTitleSpan) {
                drawerTitleSpan.style.cursor = 'pointer';
                drawerTitleSpan.title = 'Expandir/Contraer todos los movimientos';
                drawerTitleSpan.onclick = (e) => {
                    e.stopPropagation();
                    const drawerRows = elements.ahorroTableBody.querySelectorAll(`.mvmt-drawer-${drawer.id}`);
                    const anyCollapsed = Array.from(drawerRows).some(row => !row.classList.contains('expanded'));
                    drawerRows.forEach(row => {
                        if (anyCollapsed) row.classList.add('expanded');
                        else row.classList.remove('expanded');
                    });
                };
            }

            listFragment.appendChild(headerTr);

            // Sort by date descending
            drawerMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (ahorroListFilterMode !== 'totals') {
                drawerMovements.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.className = `ahorro-list-row mvmt-drawer-${drawer.id}`;

                    const conceptLower = (m.concept || m.description || '').toLowerCase();
                    const isInversion = m.category === 'Inversión' || conceptLower.includes('invers') || conceptLower.includes('bolsa');
                    const isIncome = m.amount > 0 && !isInversion;
                    const amountColor = isInversion ? 'var(--primary)' : (isIncome ? 'var(--success)' : 'var(--danger)');
                    const category = m.category || '-';
                    const concept = m.concept || m.description || '';

                    tr.innerHTML = `
                        <td class="date">${new Date(m.date).toLocaleDateString('es-ES')}</td>
                        <td class="concept">
                            <div class="category-tag">${category}</div>
                            ${concept && concept !== category ? `<div class="detail-text">${concept}</div>` : ''}
                        </td>
                        <td class="amount" style="color: ${amountColor}">${fmtEUR(m.amount)}</td>
                    `;

                    tr.onclick = () => {
                        tr.classList.toggle('expanded');
                    };

                    listFragment.appendChild(tr);
                });
            }
        });

        // Add summary row if in totals mode
        if (ahorroListFilterMode === 'totals' && sortedDrawers.length > 0 && globalFilteredTotal !== 0) {
            const totalTr = document.createElement('tr');
            totalTr.className = 'ahorro-list-header';
            totalTr.style.borderTop = '2px solid var(--primary)';
            totalTr.innerHTML = `
                <td colspan="2" style="font-weight: 800; text-align: right; padding: 1rem;">TOTAL:</td>
                <td class="balance" style="font-weight: 800; color: var(--primary); padding: 1rem;">${fmtEUR(globalFilteredTotal)}</td>
            `;
            listFragment.appendChild(totalTr);
        }

        if (listFragment.children.length === 0) {
            elements.ahorroTableBody.innerHTML = '<tr><td colspan="3" style="padding:2rem; text-align:center; opacity:0.5;">No hay movimientos en este periodo</td></tr>';
        } else {
            elements.ahorroTableBody.appendChild(listFragment);
        }
    }

    function renderAhorroEstado() {
        if (!elements.ahorroEstadoMonthLabel || !elements.ahorroEstadoYearLabel) return;

        const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        elements.ahorroEstadoMonthLabel.textContent = months[ahorroEstadoMonth - 1];
        elements.ahorroEstadoYearLabel.textContent = ahorroEstadoYear;

        const targetFiscalMonth = `${ahorroEstadoYear}-${String(ahorroEstadoMonth).padStart(2, '0')}`;

        let totalIncome = 0;
        let totalExpense = 0;
        const drawerData = {};

        savingsDrawers.forEach(drawer => {
            if (drawer.id === 'bolsa') return;
            
            let mvmts = drawer.movements || [];

            const filtered = mvmts.filter(m => {
                if (!m.date) return false;
                if (m.category === 'Traspaso' || m.category === 'Inversión' || m.category?.startsWith('Traspaso:')) return false;
                return getFiscalMonth(m.date) === targetFiscalMonth;
            });

            filtered.forEach(m => {
                const amount = Number(m.amount) || 0;
                if (amount > 0) totalIncome += amount;
                else if (amount < 0) totalExpense += Math.abs(amount);
            });

            const relevantMvmts = filtered.filter(m => ahorroEstadoType === 'income' ? m.amount > 0 : m.amount < 0);
            const sum = relevantMvmts.reduce((s, m) => s + Math.abs(m.amount), 0);
            
            if (sum > 0) {
                drawerData[drawer.id] = {
                    id: drawer.id,
                    name: drawer.name,
                    icon: drawer.icon,
                    amount: sum,
                    mvmts: relevantMvmts
                };
            }
        });

        // Render the difference between income and expenses
        const diffEl = document.getElementById('ahorroEstadoDifference');
        if (diffEl) {
            const difference = totalIncome - totalExpense;
            diffEl.textContent = fmtEUR(difference);
            diffEl.style.color = difference >= 0 ? 'var(--success)' : 'var(--danger)';
        }

        // Summary cards removed by user request


        if (elements.ahorroEstadoShowIncome) {
            elements.ahorroEstadoShowIncome.style.background = ahorroEstadoType === 'income' ? 'var(--primary)' : 'transparent';
            elements.ahorroEstadoShowIncome.style.color = ahorroEstadoType === 'income' ? 'white' : 'var(--text-muted)';
        }
        if (elements.ahorroEstadoShowExpenses) {
            elements.ahorroEstadoShowExpenses.style.background = ahorroEstadoType === 'expense' ? 'var(--primary)' : 'transparent';
            elements.ahorroEstadoShowExpenses.style.color = ahorroEstadoType === 'expense' ? 'white' : 'var(--text-muted)';
        }
        if (elements.ahorroEstadoChartTitle) elements.ahorroEstadoChartTitle.textContent = `Distribución de ${ahorroEstadoType === 'income' ? 'Ingresos' : 'Gastos'} por Cuenta`;

        const chartData = Object.values(drawerData).sort((a, b) => b.amount - a.amount);
        renderAhorroEstadoPieChart(chartData);

        if (elements.ahorroEstadoTableBody) {
            elements.ahorroEstadoTableBody.innerHTML = '';
            const totalForType = chartData.reduce((s, d) => s + d.amount, 0);

            if (chartData.length === 0) {
                elements.ahorroEstadoTableBody.innerHTML = `<tr><td colspan="3" style="padding:2rem; text-align:center; opacity:0.5;">No hay ${ahorroEstadoType === 'income' ? 'ingresos' : 'gastos'} en este periodo</td></tr>`;
            } else {
                chartData.forEach(d => {
                    const tr = document.createElement('tr');
                    tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
                    const pct = totalForType > 0 ? (d.amount / totalForType) * 100 : 0;
                    const isExpanded = expandedEstadoDrawers.has(d.id);
                    tr.innerHTML = `
                        <td style="padding: 0.75rem; text-align: left; display: flex; align-items: center; gap: 8px;">
                            <button class="toggle-estado-drawer" data-id="${d.id}" style="background:none; border:none; color:white; cursor:pointer; font-size:0.8rem; padding:0; width:12px;">${isExpanded ? '▼' : '▶'}</button>
                            <span>${d.icon} ${d.name}</span>
                        </td>
                        <td style="padding: 0.75rem; text-align: center; color: var(--text-muted);">${fmtNum(pct)}%</td>
                        <td style="padding: 0.75rem; text-align: right; font-weight: 600;">${fmtEUR(d.amount)}</td>
                    `;
                    elements.ahorroEstadoTableBody.appendChild(tr);

                    if (isExpanded) {
                        d.mvmts.sort((a, b) => new Date(b.date) - new Date(a.date)).forEach(m => {
                            const detailTr = document.createElement('tr');
                            detailTr.style.background = 'rgba(255,255,255,0.02)';
                            detailTr.style.fontSize = '0.75rem';
                            detailTr.innerHTML = `
                                <td style="padding: 0.5rem 0.75rem 0.5rem 2rem; opacity: 0.7;">
                                    ${new Date(m.date).toLocaleDateString()} - ${m.description || 'Sin concepto'}
                                </td>
                                <td style="text-align: center; opacity: 0.5;">
                                    ${m.category && m.category.includes(':') ? m.category.split(':')[1] : ''}
                                </td>
                                <td style="padding: 0.5rem 0.75rem; text-align: right; opacity: 0.7;">${fmtEUR(Math.abs(m.amount))}</td>
                            `;
                            elements.ahorroEstadoTableBody.appendChild(detailTr);
                        });
                    }
                });

                // Add TOTAL row
                const totalTr = document.createElement('tr');
                totalTr.style.background = 'rgba(59, 130, 246, 0.15)';
                totalTr.style.borderTop = '2px solid var(--primary)';
                totalTr.style.fontWeight = 'bold';
                totalTr.innerHTML = `
                    <td style="padding: 0.75rem; text-align: left; padding-left: 2rem;">TOTAL</td>
                    <td style="padding: 0.75rem; text-align: center;">100%</td>
                    <td style="padding: 0.75rem; text-align: right;">${fmtEUR(totalForType)}</td>
                `;
                elements.ahorroEstadoTableBody.appendChild(totalTr);

                // Add listeners to toggle buttons
                elements.ahorroEstadoTableBody.querySelectorAll('.toggle-estado-drawer').forEach(btn => {
                    btn.onclick = (e) => {
                        e.stopPropagation();
                        const id = btn.dataset.id;
                        if (expandedEstadoDrawers.has(id)) expandedEstadoDrawers.delete(id);
                        else expandedEstadoDrawers.add(id);
                        renderAhorroEstado();
                    };
                });
            }
        }
    }

    function renderAhorroEstadoPieChart(data) {
        const container = elements.ahorroEstadoPieChart;
        if (!container) return;

        if (data.length === 0) {
            container.innerHTML = '';
            return;
        }

        const total = data.reduce((s, d) => s + d.amount, 0);
        const COLORS = [
            '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899',
            '#14b8a6', '#f97316', '#8b5cf6', '#22c55e', '#06b6d4',
            '#e11d48', '#a855f7'
        ];

        const cx = 150;
        const cy = 150;
        const r = 120;
        const toRad = deg => (deg * Math.PI) / 180;

        let startAngle = -90;
        const slices = data.map((d, i) => {
            const pct = d.amount / total;
            const sweep = pct * 360;
            const sa = startAngle;
            startAngle += sweep;
            return { ...d, pct, sweep, sa, color: COLORS[i % COLORS.length] };
        });

        function arcPath(cx, cy, r, startDeg, endDeg) {
            if (endDeg - startDeg >= 359.99) {
                return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
            }
            const s = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
            const e = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) };
            const large = (endDeg - startDeg) > 180 ? 1 : 0;
            return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
        }

        const slicePaths = slices.map((s) => {
            const path = arcPath(cx, cy, r, s.sa, s.sa + s.sweep);
            const amtStr = fmtEUR(s.amount);
            const pctStr = (s.pct * 100).toFixed(1) + '%';
            return `<path d="${path}" fill="${s.color}" opacity="0.85" 
                        stroke="var(--bg-dark)" stroke-width="2"
                        style="transition: all 0.2s ease;">
                        <title>${s.icon} ${s.name}\n${amtStr} (${pctStr})</title>
                    </path>`;
        }).join('');

        container.innerHTML = `
            <div style="display: flex; flex-direction: column; align-items: center; gap: 1.5rem;">
                <svg viewBox="0 0 300 300" style="width: 100%; max-width: 250px; filter: drop-shadow(0 0 10px rgba(0,0,0,0.3));">
                    ${slicePaths}
                </svg>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(130px, 1fr)); gap: 0.75rem; width: 100%;">
                    ${slices.map(s => `
                        <div style="display: flex; align-items: center; gap: 8px; font-size: 0.75rem;">
                            <div style="width: 8px; height: 8px; border-radius: 2px; background: ${s.color}; flex-shrink: 0;"></div>
                            <span style="opacity: 0.8; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 80px;">${s.name}</span>
                            <span style="margin-left: auto; font-weight: 600; opacity: 0.9;">${(s.pct * 100).toFixed(0)}%</span>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    }

    // ── Patrimonio Histórico ─────────────────────────────────────────
    // State
    let historicoMode = 'month'; // 'month' | 'year'

    /**
     * Reconstruct savings cash balance + stock purchase cost as of a given date.
     * @param {Date} date - the upper bound date (inclusive)
     * @returns {{ cashTotal: number, stockCost: number, total: number }}
     */
    function calculatePatrimonioAt(date) {
        const ts = date.getTime();

        // Cash: replay all non-bolsa drawer movements up to date
        let cashTotal = 0;
        savingsDrawers.forEach(drawer => {
            if (drawer.id === 'bolsa') return;
            (drawer.movements || []).forEach(m => {
                if (!m.date) return;
                const mDate = new Date(m.date + 'T00:00:00');
                if (mDate.getTime() <= ts) {
                    cashTotal += Number(m.amount) || 0;
                }
            });
        });

        // Stock cost: sum qty*price for entries purchased on or before the date
        let stockCost = 0;
        stocks.forEach(s => {
            if (!s.date) return;
            const sDate = new Date(s.date + 'T00:00:00');
            if (sDate.getTime() <= ts) {
                stockCost += (parseFloat(s.qty) || 0) * (parseFloat(s.price) || 0);
            }
        });

        return { cashTotal, stockCost, total: cashTotal + stockCost };
    }

    function renderAhorroHistorico() {
        const tableBody = elements.ahorroHistoricoTableBody;
        const chartContainer = elements.ahorroHistoricoChart;
        if (!tableBody || !chartContainer) return;

        // Update mode button styles
        if (elements.historicoModeMonth) {
            elements.historicoModeMonth.style.background = historicoMode === 'month' ? 'var(--primary)' : 'transparent';
            elements.historicoModeMonth.style.color = historicoMode === 'month' ? 'white' : 'var(--text-muted)';
        }
        if (elements.historicoModeYear) {
            elements.historicoModeYear.style.background = historicoMode === 'year' ? 'var(--primary)' : 'transparent';
            elements.historicoModeYear.style.color = historicoMode === 'year' ? 'white' : 'var(--text-muted)';
        }

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        const now = new Date();
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

        // ── Find current fiscal period start ────────────────────────────
        // If today >= fiscalDay, the current fiscal period started THIS calendar month.
        // The fiscal period NAME is the FOLLOWING calendar month (e.g. starts Mar 25 → "Abr").
        let curStartMonth = today.getMonth(); // 0-indexed calendar month of the fiscal period start
        let curStartYear  = today.getFullYear();
        if (today.getDate() < fiscalDay) {
            // We haven't hit fiscalDay yet → fiscal period started the previous calendar month
            curStartMonth--;
            if (curStartMonth < 0) { curStartMonth = 11; curStartYear--; }
        }

        // ── Build period list ───────────────────────────────────────────
        const periods = [];
        const count = historicoMode === 'month' ? 12 : 6;

        for (let i = 0; i < count; i++) {
            let startMonth = curStartMonth - i;
            let startYear  = curStartYear;
            while (startMonth < 0) { startMonth += 12; startYear--; }

            // For the CURRENT fiscal period, show today's balance so it matches Vista Cuentas.
            // For past periods, show the balance on the day before the next fiscal period starts
            // (i.e., the day before THIS fiscal period's START = the end of the previous period).
            const fiscalStart = new Date(startYear, startMonth, fiscalDay);
            const endDate = i === 0 ? today : new Date(fiscalStart.getTime() - 86400000);

            // Skip truly future snapshots
            if (endDate > today) continue;

            if (historicoMode === 'month') {
                // Label = month AFTER startMonth (that is the fiscal period name)
                const labelMonth = (startMonth + 1) % 12;
                const labelYear  = startMonth === 11 ? startYear + 1 : startYear;
                const label = `${monthNames[labelMonth]} ${labelYear}${i === 0 ? ' (hoy)' : ''}`;
                periods.push({ label, endDate });
            } else {
                // For annual mode: use the start year as the label year.
                // The user expects Mar 2026 to be fiscal year 2026.
                const labelYear = startYear; 
                if (startMonth === 11) {
                    periods.push({ label: `Año ${labelYear}${i === 0 ? ' (hoy)' : ''}`, endDate });
                } else if (i === 0) {
                    periods.push({ label: `Año ${labelYear} (hoy)`, endDate });
                }
            }
        }

        // Calculate patrimonio for each period
        let data = periods.map(p => ({ ...p, ...calculatePatrimonioAt(p.endDate) }));

        // Filter out periods with no data at all
        data = data.filter(d => d.cashTotal !== 0 || d.stockCost !== 0);

        if (data.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" style="padding:2rem; text-align:center; opacity:0.5">No hay datos históricos disponibles</td></tr>';
            chartContainer.innerHTML = '';
            return;
        }

        // ── Render table ────────────────────────────────────────────────
        // Update header to include Δ column
        const thead = tableBody.closest('table').querySelector('thead tr');
        if (thead && thead.children.length < 5) {
            const thDelta = document.createElement('th');
            thDelta.style.cssText = 'padding:0.75rem; text-align:right;';
            thDelta.textContent = 'Δ Período';
            thead.appendChild(thDelta);
        }

        tableBody.innerHTML = '';
        data.forEach((row, i) => {
            const prev = data[i + 1]; // older period (array is newest-first)
            const delta = prev !== undefined ? row.total - prev.total : null;
            const deltaColor = delta === null ? '' : delta >= 0 ? 'var(--success)' : 'var(--danger)';
            const deltaStr = delta === null ? '—'
                : `${delta >= 0 ? '+' : ''}${fmtEUR(delta)}`;

            const tr = document.createElement('tr');
            tr.style.borderBottom = '1px solid rgba(255,255,255,0.05)';
            if (i === 0) tr.style.background = 'rgba(99,102,241,0.08)';
            tr.innerHTML = `
                <td style="padding:0.75rem; font-weight:${i === 0 ? '700' : '400'}">${row.label}</td>
                <td style="padding:0.75rem; text-align:right; color:var(--success)">${fmtEUR(row.cashTotal)}</td>
                <td style="padding:0.75rem; text-align:right; color:var(--primary)">${fmtEUR(row.stockCost)}</td>
                <td style="padding:0.75rem; text-align:right; font-weight:${i === 0 ? '700' : '400'}">${fmtEUR(row.total)}</td>
                <td style="padding:0.75rem; text-align:right; color:${deltaColor}; font-size:0.85rem">${deltaStr}</td>
            `;
            tableBody.appendChild(tr);
        });

        // ── Render bar chart ────────────────────────────────────────────
        const maxVal = Math.max(...data.map(d => d.total), 1);
        const barWidth = Math.floor(Math.min(48, (280 / data.length)));
        const chartH = 160;
        const svgW = data.length * (barWidth + 6) + 40;

        const bars = [...data].reverse().map((d, i) => {
            const x = 30 + i * (barWidth + 6);
            const barH = Math.max(2, (d.total / maxVal) * chartH);
            const y = chartH - barH + 8;
            const cashH = Math.max(1, (d.cashTotal / maxVal) * chartH);
            const cashY = chartH - cashH + 8;
            return `
                <rect x="${x}" y="${y}" width="${barWidth}" height="${barH}" rx="3"
                      fill="rgba(99,102,241,0.25)" />
                <rect x="${x}" y="${cashY}" width="${barWidth}" height="${cashH}" rx="3"
                      fill="#10b981" opacity="0.85">
                    <title>${d.label}\nAhorro: ${fmtEUR(d.cashTotal)}\nBolsa: ${fmtEUR(d.stockCost)}\nTotal: ${fmtEUR(d.total)}</title>
                </rect>
                <text x="${x + barWidth / 2}" y="${chartH + 22}" text-anchor="middle"
                      fill="rgba(255,255,255,0.5)" font-size="9">
                    ${d.label.slice(0, historicoMode === 'month' ? 3 : 6)}
                </text>
            `;
        }).join('');

        chartContainer.innerHTML = `
            <div style="width:100%; overflow-x:auto; -webkit-overflow-scrolling:touch; margin-bottom: 5px;">
                <svg width="${svgW}" height="${chartH + 30}" viewBox="0 0 ${svgW} ${chartH + 30}" style="display:block;">
                    ${bars}
                    <line x1="28" y1="8" x2="28" y2="${chartH + 8}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                    <line x1="28" y1="${chartH + 8}" x2="${svgW}" y2="${chartH + 8}" stroke="rgba(255,255,255,0.15)" stroke-width="1"/>
                </svg>
            </div>
            <div style="display:flex; gap:1rem; font-size:0.75rem; opacity:0.7; margin-top:0.5rem; flex-wrap:wrap;">
                <span><span style="display:inline-block;width:10px;height:10px;background:#10b981;border-radius:2px;margin-right:4px;"></span>Ahorro (acumulado)</span>
                <span><span style="display:inline-block;width:10px;height:10px;background:rgba(99,102,241,0.6);border-radius:2px;margin-right:4px;"></span>Coste Bolsa</span>
            </div>
        `;
    }

    function renderSavings() {
        if (!elements.drawersGrid) return;

        if (elements.ahorroSummarySection) {
            // Keep it hidden as requested by user - redundant totals removed
            elements.ahorroSummarySection.classList.add('hidden');
            
            // Still calculate the total for internal use if needed
            const patrimonyTotal = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
            currentPatrimonioTotal = patrimonyTotal;
        }

        // Calculate Global Total
        const total = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
        if (elements.misCajonesTitle) {
            elements.misCajonesTitle.textContent = `Mis Cuentas: ${fmtEUR(total)}`;
        }

        // Toggle visibility based on view mode
        updateAhorroToggleIcons();
        if (ahorroViewMode === 'list') {
            elements.drawersGrid?.classList.add('hidden');
            elements.ahorroTableContainer?.classList.remove('hidden');
            renderSavingsList();
        } else {
            // Cards or others
            elements.drawersGrid?.classList.remove('hidden');
            elements.ahorroTableContainer?.classList.add('hidden');
        }

        elements.drawersGrid.innerHTML = '';

        if (savingsDrawers.length === 0) return;

        // Group drawers
        const groups = new Map();
        const noGroupKey = 'Otros'; // Header for drawers without group

        savingsDrawers.forEach(drawer => {
            const g = (drawer.group && drawer.group.trim()) ? drawer.group.trim() : (drawer.id === 'bolsa' ? 'Inversiones' : noGroupKey);
            if (!groups.has(g)) groups.set(g, []);
            groups.get(g).push(drawer);
        });

        // Get sorted group names
        const sortedGroups = Array.from(groups.keys()).sort((a, b) => {
            if (a === 'Inversiones') return -1;
            if (b === 'Inversiones') return 1;
            if (a === noGroupKey) return 1;
            if (b === noGroupKey) return -1;
            return a.localeCompare(b);
        });

        sortedGroups.forEach(groupName => {
            const drawersInGroup = groups.get(groupName);
            const groupTotal = drawersInGroup.reduce((sum, d) => sum + d.balance, 0);

            // Add group header if there's more than one group or if the group has a name
            const showHeader = sortedGroups.length > 1 || groupName !== noGroupKey;
            const storageKey = `isAhorroGroupExpanded_${groupName}`;
            const isExpanded = localStorage.getItem(storageKey) !== 'false';

            const subGrid = document.createElement('div');
            // If showHeader, this becomes a collapsible "row" spanning all grid columns
            if (showHeader) {
                const header = document.createElement('div');
                header.className = 'drawer-group-title collapsible-section-head';
                header.style.cssText = 'grid-column: 1 / -1; display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; padding: 0.5rem; border-radius: 8px; transition: background 0.2s;';
                header.innerHTML = `
                    <span class="section-toggle-icon ${isExpanded ? 'expanded' : ''}" style="font-size:1.1rem; transition: transform 0.3s ease; display: inline-block;">▼</span>
                    <span>${groupName}</span> 
                    <span style="margin-left: auto; font-size: 1rem; opacity: 0.8; font-weight: 600;">${fmtEUR(groupTotal)}</span>
                `;
                elements.drawersGrid.appendChild(header);

                subGrid.className = `collapsible-content ${isExpanded ? 'expanded' : ''}`;
                subGrid.style.cssText = 'grid-column: 1 / -1; display:grid; grid-template-columns: repeat(auto-fill, minmax(260px, 1fr)); gap: 1.5rem;';

                header.onclick = () => {
                    const nowExpanded = !subGrid.classList.contains('expanded');
                    subGrid.classList.toggle('expanded', nowExpanded);
                    header.querySelector('.section-toggle-icon')?.classList.toggle('expanded', nowExpanded);
                    localStorage.setItem(storageKey, nowExpanded);
                };
                header.onmouseenter = () => { header.style.background = 'rgba(255,255,255,0.03)'; };
                header.onmouseleave = () => { header.style.background = 'transparent'; };
            } else {
                // Flat layout: use elements.drawersGrid context directly, cards will be immediate children
                // Or keep subGrid as a fragment-like container that doesn't restrict height but doesn't have a header.
                // For simplicity, if no header, we'll just skip subGrid and append to drawersGrid directly.
            }

            const targetGrid = showHeader ? subGrid : elements.drawersGrid;
            if (showHeader) elements.drawersGrid.appendChild(subGrid);

            drawersInGroup.forEach(drawer => {
                const card = document.createElement('div');
                card.className = `card drawer-card glass-panel income-drawer ${drawer.isAuto ? 'bolsa-drawer' : ''}`;

                const pct = total > 0 ? (drawer.balance / total * 100).toFixed(1) : 0;

                let theme;
                if (drawer.id === 'bolsa') {
                    const isProfit = (drawer.pl || 0) >= 0;
                    theme = isProfit ? DRAWER_COLORS[1] : DRAWER_COLORS[4];
                } else {
                    const colorIdx = drawer.colorIndex || 0;
                    theme = DRAWER_COLORS[colorIdx % DRAWER_COLORS.length];
                }

                card.style.setProperty('background', `rgba(${parseInt(theme.border.slice(1, 3), 16)}, ${parseInt(theme.border.slice(3, 5), 16)}, ${parseInt(theme.border.slice(5, 7), 16)}, 0.25)`, 'important');
                card.style.setProperty('background-color', theme.bg, 'important');
                card.style.setProperty('background-image', `linear-gradient(135deg, ${theme.grad} 0%, rgba(15, 23, 42, 0.8) 100%)`, 'important');
                card.style.setProperty('border', `2px solid ${theme.border}`, 'important');

                const targetAmount = drawer.targetAmount || 0;
                const diff = targetAmount > 0 ? targetAmount - drawer.balance : 0;
                const diffColor = diff <= 0 ? 'var(--success)' : 'var(--danger)';

                const today = new Date();
                today.setHours(23, 59, 59, 999);
                let balanceToday = 0;
                if (drawer.id === 'bolsa') {
                    balanceToday = drawer.balance;
                } else {
                    balanceToday = (drawer.movements || []).reduce((sum, m) => {
                        const mDate = new Date(m.date + 'T00:00:00');
                        return mDate <= today ? sum + m.amount : sum;
                    }, 0);
                }

                const balanceTodayDisplayHtml = (Math.abs(drawer.balance - balanceToday) > 0.01)
                    ? `<span style="font-size: 0.75em; opacity: 0.6; font-weight: 500; margin-left: 4px;">[${fmtEUR(balanceToday)}]</span>`
                    : '';

                card.innerHTML = `
                    <div class="drawer-color-btn" title="Cambiar Color" style="position: absolute; top: 0.5rem; right: 0.5rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: grayscale(1); opacity: 0.4; transition: all 0.2s;">🎨</div>
                    <div class="drawer-target-icon" title="Establecer Objetivo" style="right: 3rem !important; top: 0.5rem !important;">🎯</div>
                    <div class="drawer-calendar-icon" title="Ver Calendario" style="position: absolute; right: 5.5rem; top: 0.5rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.4; transition: all 0.2s; filter: grayscale(1);">📅</div>
                    <span class="drawer-icon">${drawer.icon}</span>
                    <span class="drawer-name" style="color: white !important; font-weight: 700;">${drawer.name}</span>
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; flex-direction: column;">
                            <div style="font-size: 0.65rem; opacity: 0.8; text-transform: uppercase; margin-bottom: 2px; font-weight: 700; color: white;">${drawer.id === 'bolsa' ? 'En Bolsa' : ''}</div>
                            <div style="display: flex; align-items: baseline; flex-wrap: wrap;">
                                <span class="drawer-amount" style="color: ${drawer.id === 'bolsa' ? 'white' : theme.border} !important; font-weight: 800; font-size: 1.2rem; display: block;">${fmtEUR(drawer.balance)}</span>
                                ${balanceTodayDisplayHtml}
                            </div>
                            ${targetAmount > 0 ? `
                                <div class="target-info" style="font-size: 0.75rem; color: rgba(255,255,255,0.7); margin-top: 4px;">
                                    <span>Obj: ${fmtEUR(targetAmount)}</span>
                                    <span style="color: ${diffColor}; font-weight: 600; margin-left: 5px;">(${diff >= 0 ? '+' : ''}${fmtEUR(diff)})</span>
                                </div>
                            ` : ''}
                        </div>
                        <span style="font-size: 1.2rem; font-weight: 800; color: ${drawer.id === 'bolsa' ? 'white' : theme.border}; opacity: 0.9;">${pct}%</span>
                    </div>
                    ${!drawer.isAuto ? `
                        <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:nowrap;">
                             <button class="add-mvmt-btn btn-primary" title="Añadir Movimiento" style="padding:0.5rem 0; font-size:1rem; flex:1; display:flex; justify-content:center; align-items:center;">➕</button>
                            <button class="transfer-btn btn-secondary" title="Traspasar" style="padding:0.5rem 0; font-size:1.2rem; font-weight:bold; flex:1; display:flex; justify-content:center; align-items:center;">⇆</button>
                            <button class="edit-drawer-btn btn-secondary" title="Editar Cuenta" style="padding:0.5rem 0; font-size:1rem; flex:1; display:flex; justify-content:center; align-items:center;">✏️</button>
                        </div>` : ''}
                `;

                card.onclick = (e) => {
                    const mvmtBtn = e.target.closest('.add-mvmt-btn');
                    const transBtn = e.target.closest('.transfer-btn');
                    const editBtn = e.target.closest('.edit-drawer-btn');
                    const targetBtn = e.target.closest('.drawer-target-icon');
                    const colorBtn = e.target.closest('.drawer-color-btn');

                    if (targetBtn) {
                        e.stopPropagation();
                        setDrawerTargetAmount(drawer.id);
                    } else if (colorBtn) {
                        e.stopPropagation();
                        cycleDrawerColor(drawer.id);
                    } else if (mvmtBtn) {
                        e.stopPropagation();
                        showAddMovementModal(drawer.id);
                    } else if (transBtn) {
                        e.stopPropagation();
                        showTransferModal(drawer.id);
                    } else if (editBtn) {
                        e.stopPropagation();
                        showEditDrawerModal(drawer.id);
                    } else if (e.target.closest('.drawer-calendar-icon')) {
                        e.stopPropagation();
                        showSavingsCalendar(drawer.id);
                    } else if (e.target.closest('.delete-drawer-btn')) {
                        e.stopPropagation();
                        deleteSavingsDrawer(drawer.id);
                    } else {
                        showDrawerDetails(drawer.id);
                    }
                };

                targetGrid.appendChild(card);
            });
        });

        renderSavingsPieChart();
        renderAhorroSummaryDrawer();
    }

    function renderRecurringMovements() {
        if (!elements.recurringMovementsList) return;
        elements.recurringMovementsList.innerHTML = '';

        if (recurringSavingsMovements.length === 0) {
            elements.recurringMovementsList.innerHTML = '<p style="text-align:center; opacity:0.5; padding:2rem;">No hay movimientos periódicos configurados.</p>';
            return;
        }

        recurringSavingsMovements.forEach((template) => {
            const item = document.createElement('div');
            item.className = 'glass-panel';
            item.style.padding = '0.6rem 0.8rem';
            item.style.display = 'flex';
            item.style.alignItems = 'center';
            item.style.gap = '8px';
            item.style.marginBottom = '0.4rem';

            let typeInfo = '';
            if (template.type === 'movement') {
                const drawer = savingsDrawers.find(d => d.id === template.drawerId);
                typeInfo = `<span style="color: ${template.isIncome ? 'var(--success)' : 'var(--danger)'}; font-size: 0.8rem;">[${template.isIncome ? 'Ingreso' : 'Gasto'}]</span> <b>${drawer ? drawer.name : 'Cuenta eliminada'}</b>`;
            } else {
                const from = savingsDrawers.find(d => d.id === template.fromDrawerId);
                const to = savingsDrawers.find(d => d.id === template.toDrawerId);
                typeInfo = `<span style="color: var(--primary); font-size: 0.8rem;">[Traspaso]</span> <b>${from ? from.name : '?'} ➔ ${to ? to.name : '?'}</b>`;
            }

            item.innerHTML = `
                <input type="checkbox" class="recurring-select-checkbox" data-id="${template.id}" style="width: 18px; height: 18px; cursor: pointer;">
                <div style="flex: 1; min-width: 0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                        <div style="display:flex; gap:6px; align-items:center; flex-wrap:wrap; min-width:0; flex:1;">
                            ${typeInfo}
                        </div>
                        <div style="font-weight:700; color:white; font-size:0.9rem; white-space:nowrap;">${fmtEUR(template.amount)}</div>
                    </div>
                    <div style="display:flex; justify-content:space-between; align-items:center; gap:10px; margin-top: 2px;">
                        <div style="font-size: 0.8rem; opacity: 0.8; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; flex:1;">${template.description}</div>
                        ${template.category ? `<div style="font-size: 0.7rem; opacity: 0.4; white-space:nowrap;">${template.category}</div>` : ''}
                    </div>
                </div>
                <button class="btn-icon delete-recurring-btn" data-id="${template.id}" title="Eliminar" style="color: var(--danger); opacity: 0.7;">🗑️</button>
            `;

            const deleteBtn = item.querySelector('.delete-recurring-btn');
            const checkbox = item.querySelector('.recurring-select-checkbox');

            item.style.cursor = 'pointer';
            item.onclick = (e) => {
                if (e.target !== checkbox && e.target !== deleteBtn && !deleteBtn.contains(e.target)) {
                    checkbox.checked = !checkbox.checked;
                }
            };

            deleteBtn.onclick = (e) => {
                e.stopPropagation();
                if (confirm('¿Estás seguro de que quieres eliminar este movimiento periódico?')) {
                    const deletedTemplate = template;
                    recurringSavingsMovements = recurringSavingsMovements.filter(t => t.id !== template.id);
                    
                    // Unmark all matching movements in the system
                    savingsDrawers.forEach(d => {
                        d.movements.forEach(m => {
                            let match = false;
                            const absAmount = Math.abs(m.amount);
                            const templateAmount = Math.abs(deletedTemplate.amount);

                            if (deletedTemplate.type === 'movement') {
                                match = (d.id == deletedTemplate.drawerId && templateAmount == absAmount && m.description == deletedTemplate.description);
                            } else if (deletedTemplate.type === 'transfer' && m.transferId) {
                                match = ((d.id == deletedTemplate.fromDrawerId || d.id == deletedTemplate.toDrawerId) && templateAmount == absAmount);
                            }
                            
                            if (match) m.isPeriodic = false;
                        });
                    });

                    if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
                    if (window.saveSavings) window.saveSavings(savingsDrawers);
                    renderRecurringMovements();
                    render(); // Refresh the main view to show unmarked movements
                }
            };

            elements.recurringMovementsList.appendChild(item);
        });
    }

    async function executeRecurringMovements() {
        if (recurringSavingsMovements.length === 0) return;

        const selectedCheckboxes = elements.recurringMovementsList.querySelectorAll('.recurring-select-checkbox:checked');
        const selectedIds = Array.from(selectedCheckboxes).map(cb => cb.dataset.id);

        if (selectedIds.length === 0) {
            showToast("Selecciona al menos un movimiento para ejecutar.", "warning");
            return;
        }

        recurringExecutionQueue = recurringSavingsMovements.filter(t => selectedIds.includes(t.id.toString()));
        
        showToast(`Iniciando ejecución de ${recurringExecutionQueue.length} movimientos...`, "info");
        elements.recurringMovementsModal?.classList.add('hidden');
        processNextRecurringInQueue();
    }

    function processNextRecurringInQueue() {
        if (recurringExecutionQueue.length === 0) {
            showToast("✅ Ejecución de movimientos periódicos completada.", "success");
            return;
        }

        const template = recurringExecutionQueue.shift();
        
        if (template.type === 'movement') {
            const drawer = savingsDrawers.find(d => d.id == template.drawerId);
            if (drawer) {
                showAddMovementModal(template.drawerId);
                // Pre-fill
                if (elements.movementAmountInput) elements.movementAmountInput.value = Math.abs(template.amount);
                if (elements.movementConceptInput) elements.movementConceptInput.value = template.description;
                if (elements.savingsMovementType) updateSavingsMovementType(template.isIncome ? 'income' : 'expense');
                if (elements.savingsCategorySelect) {
                    const catParts = (template.category || '').split(':');
                    elements.savingsCategorySelect.value = catParts[0];
                    updateSavingsSubcategories();
                    if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = catParts[1] || '';
                }
                // Uncheck the recurring checkbox so we don't create a recursive template unless desired
                if (elements.savingsRecurringInput) elements.savingsRecurringInput.checked = false;
            } else {
                processNextRecurringInQueue(); // Skip if drawer missing
            }
        } else if (template.type === 'transfer') {
            const fromDrawer = savingsDrawers.find(d => d.id == template.fromDrawerId);
            const toDrawer = savingsDrawers.find(d => d.id == template.toDrawerId);
            if (fromDrawer && toDrawer) {
                showTransferModal(template.fromDrawerId);
                // Pre-fill
                if (elements.movementAmountInput) elements.movementAmountInput.value = template.amount;
                if (elements.movementConceptInput) elements.movementConceptInput.value = template.description;
                if (elements.transferTargetSelect) elements.transferTargetSelect.value = template.toDrawerId;
                if (elements.savingsCategorySelect) {
                    const catParts = (template.category || '').split(':');
                    elements.savingsCategorySelect.value = catParts[0];
                    updateSavingsSubcategories();
                    if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = catParts[1] || '';
                }
                if (elements.savingsRecurringInput) elements.savingsRecurringInput.checked = false;
            } else {
                processNextRecurringInQueue();
            }
        }
    }

    function renderBolsaCards(displayStocksData) {
        if (!elements.bolsaGrid) return;
        elements.bolsaGrid.innerHTML = '';

        // Group by ticker
        const groupedData = {};
        displayStocksData.forEach(item => {
            if (currentFilter !== 'all' && item.market !== currentFilter) return;
            if (!groupedData[item.ticker]) {
                groupedData[item.ticker] = {
                    ticker: item.ticker,
                    name: item.name,
                    market: item.market,
                    totalQty: 0,
                    totalInvested: 0,
                    totalCurrentVal: 0,
                    items: [],
                    liveInfo: item.liveInfo
                };
            }
            groupedData[item.ticker].totalQty += item.qty;
            groupedData[item.ticker].totalInvested += item.liveInfo.stockInvested;
            if (item.liveInfo.stockCurrentVal !== null) {
                groupedData[item.ticker].totalCurrentVal += item.liveInfo.stockCurrentVal;
            } else {
                groupedData[item.ticker].totalCurrentVal = null;
            }
            groupedData[item.ticker].items.push(item);
        });

        const displayGroups = Object.values(groupedData).filter(g => g.totalQty > 0);

        if (displayGroups.length === 0) {
            elements.bolsaGrid.innerHTML = '<div class="empty-state"><p>No investments found.</p></div>';
            return;
        }

        displayGroups.forEach(group => {
            try {
                const info = group.liveInfo || { currentPriceEUR: null };
                const plGroup = (group.totalCurrentVal !== null) ? (group.totalCurrentVal - group.totalInvested) : 0;
                const plPercentGroup = (group.totalInvested > 0 && group.totalCurrentVal !== null) ? (plGroup / group.totalInvested) * 100 : 0;
                const isExpanded = expandedTickers.has(group.ticker);

                const card = document.createElement('div');
                const isProfit = plGroup >= 0;
                const theme = isProfit ? DRAWER_COLORS[1] : DRAWER_COLORS[4]; // Blue for profit, Red for loss
                const glowClass = isProfit ? 'profit-glow' : 'loss-glow';

                // Apply theme styles
                card.className = `card drawer-card glass-panel bolsa-drawer ${glowClass}`;
                card.style.setProperty('background', `rgba(${parseInt(theme.border.slice(1, 3), 16)}, ${parseInt(theme.border.slice(3, 5), 16)}, ${parseInt(theme.border.slice(5, 7), 16)}, 0.25)`, 'important');
                card.style.setProperty('background-color', theme.bg, 'important');
                card.style.setProperty('background-image', `linear-gradient(135deg, ${theme.grad} 0%, rgba(15, 23, 42, 0.8) 100%)`, 'important');
                card.style.setProperty('border', `2px solid ${theme.border}`, 'important');

                // Calculate Signals for the card
                let signalsHtml = '';
                const tickerKey = (group.ticker || '').toUpperCase();
                const mockInfo = (window.MOCK_DATA && tickerKey) ? window.MOCK_DATA[tickerKey] : null;

                if (mockInfo && mockInfo.historical && mockInfo.historical['D']) {
                    try {
                        const fx = mockInfo.currency === 'USD' ? (window.FX_RATE || 0.92) : 1;
                        const analysis = (typeof calculateTechnicalAnalysis === 'function') ? calculateTechnicalAnalysis(group.ticker, mockInfo.historical['D'], fx) : null;
                        if (analysis && analysis.patterns && analysis.patterns.length > 0) {
                            signalsHtml = analysis.patterns.map(p => {
                                const icon = p.includes('Hammer') ? '🔨' : (p.includes('Doji') ? '⚖️' : (p.includes('Envolvente') ? '🔥' : '✨'));
                                return `<span title="${p}" style="cursor:help; font-size: 0.9rem; filter: drop-shadow(0 0 5px white);">${icon}</span>`;
                            }).join(' ');
                        }
                    } catch (e) { console.warn("Signal err", e); }
                }

                const performanceClass = (plPercentGroup === null) ? 'neutral' : (plPercentGroup < 0 ? 'loss' : 'profit');
                const displayName = (group.name || group.ticker).length > 16 ? (group.name || group.ticker).substring(0, 14) + '..' : (group.name || group.ticker);

                card.innerHTML = `
                <div class="card-main-content">
                    <div class="shimmer-card" style="position: absolute; inset: 0; pointer-events: none; opacity: 0.3; border-radius: inherit;"></div>
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%; position: relative; z-index: 1;">
                        <div style="display: flex; align-items: center; gap: 10px; max-width: 65%;">
                            <span class="drawer-icon" style="margin-bottom:0; font-size: 1.8rem;">${isProfit && plPercentGroup > 10 ? '🚀' : '📈'}</span>
                            <div style="display: flex; flex-direction: column; overflow: hidden;">
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="drawer-name stock-web-link" title="Ver en Yahoo Finance" style="color: white !important; font-weight: 700; margin: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${displayName}</span>
                                    <div style="display: flex; gap: 4px; flex-shrink: 0;">${signalsHtml}</div>
                                </div>
                                <span style="font-size: 0.75rem; opacity: 0.7; font-weight: 500;">${group.ticker} • ${group.market}</span>
                            </div>
                        </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.6rem; opacity: 0.8; text-transform: uppercase; margin-bottom: 2px; font-weight: 800; color: white; letter-spacing: 0.05em;">En Bolsa</div>
                        <span class="drawer-amount" style="font-weight: 800; font-size: 1.2rem; display: block; color: white !important; text-shadow: 0 2px 10px rgba(0,0,0,0.3); white-space: nowrap;">${group.totalCurrentVal !== null ? fmtEUR(group.totalCurrentVal) : '-'}</span>
                        <span style="font-size: 0.8rem; font-weight: 700; color: white !important; opacity: 1; display: flex; align-items: center; justify-content: flex-end; gap: 4px; white-space: nowrap;">
                            ${plGroup !== null && plGroup !== 0 ? (plGroup >= 0 ? '▲' : '▼') : ''} ${plGroup !== null ? fmtEUR(Math.abs(plGroup)) : '-'} 
                            <span style="font-size: 0.65rem; opacity: 0.8; font-weight: 600;">(${fmtPct(plPercentGroup)})</span>
                        </span>
                    </div>
                </div>

                <div style="margin-top: 1rem; position: relative; z-index: 1;">
                </div>

                <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(0,0,0,0.2); border-radius: 12px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.08); display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem; position: relative; z-index: 1;">
                    <div>
                        <div style="opacity: 0.7; font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: white;">Invertido</div>
                        <div style="font-weight: 600; color: white; font-size: 0.95rem;">${fmtEUR(group.totalInvested)}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.7; font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: white;">Precio Actual</div>
                        <div style="font-weight: 600; color: white; font-size: 0.95rem;">${info.currentPriceEUR !== null ? fmtEUR(info.currentPriceEUR) : '-'}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.7; font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: white;">Cantidad</div>
                        <div style="font-weight: 600; color: white; font-size: 0.95rem;">${fmtNum(group.totalQty, 3)}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.7; font-size: 0.65rem; text-transform: uppercase; font-weight: 700; color: white;">Market</div>
                        <div style="font-weight: 600; color: white; font-size: 0.95rem;">${group.market}</div>
                    </div>
                </div>

                <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="add-mvmt-btn btn-primary" data-ticker="${group.ticker}" title="Añadir Movimiento" style="padding:0.4rem 0.8rem; font-size:0.8rem; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);">➕</button>
                    <button class="history-btn btn-secondary" data-ticker="${group.ticker}" title="Historial" style="padding:0.4rem 0.8rem; font-size:0.8rem; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);">🕒</button>
                    <button class="details-btn btn-secondary" data-ticker="${group.ticker}" title="Ver Detalles" style="padding:0.4rem 0.8rem; font-size:0.8rem; background: rgba(255,255,255,0.1); border-color: rgba(255,255,255,0.2);">🔍</button>
                </div>

                <div id="history-${group.ticker.replace(/[^a-zA-Z0-9]/g, '_')}" class="hidden" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${group.items.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
                    const itemPL = item.liveInfo ? item.liveInfo.stockPL : 0;
                    const isSale = item.qty < 0;
                    return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 8px; font-size: 0.8rem;">
                                    <div>
                                        <div style="font-weight: 600; color: ${isSale ? 'var(--danger)' : 'var(--success)'}">${isSale ? '🔴 Venta' : '🟢 Compra'}</div>
                                        <div style="opacity: 0.6; font-size: 0.7rem;">${new Date(item.date).toLocaleDateString()} • ${fmtNum(item.qty, 4)} @ ${fmtEUR(item.price)}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-weight: 600;">${fmtEUR(item.liveInfo ? (item.liveInfo.stockCurrentVal || 0) : 0)}</div>
                                        <div class="${(itemPL || 0) >= 0 ? 'profit' : 'loss'}" style="font-size: 0.75rem;">${itemPL !== null ? (itemPL >= 0 ? '+' : '') + fmtEUR(itemPL) : '-'}</div>
                                    </div>
                                    <div style="display: flex; gap: 5px; margin-left: 10px;">
                                        <button class="edit-btn-small" data-id="${item.id}" title="Editar" style="background:none; border:none; cursor:pointer; opacity:0.6;">✏️</button>
                                        <button class="delete-btn-small" data-id="${item.id}" title="Borrar" style="background:none; border:none; cursor:pointer; opacity:0.6;">🗑️</button>
                                    </div>
                                </div>
                            `;
                }).join('')}
                    </div>
                </div>
            </div>
            <div class="card-web-view hidden">
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 6px 10px; background: rgba(0,0,0,0.4); backdrop-filter: blur(5px); border-radius: 12px 12px 0 0;">
                        <span style="font-size: 0.7rem; font-weight: 700; color: #3b82f6;">Vista Técnica: ${group.ticker}</span>
                        <div style="display: flex; gap: 8px;">
                            <a href="https://finance.yahoo.com/quote/${group.ticker}" target="_blank" title="Abrir en Yahoo Finance" style="text-decoration: none; font-size: 0.75rem; background: #7b1fa2; padding: 2px 8px; border-radius: 4px; color: white; display: flex; align-items: center; gap: 4px; font-weight: 700;" onclick="event.stopPropagation()">Yahoo ↗</a>
                            <button class="close-web-view" title="Cerrar y volver" style="background: rgba(239, 68, 68, 0.2); border: none; color: #ef4444; border-radius: 50%; width: 24px; height: 24px; cursor: pointer; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem;">✕</button>
                        </div>
                    </div>
                    <div class="web-view-body" style="flex: 1; min-height: 250px; background: #0f172a; border-radius: 0 0 12px 12px; overflow: hidden;">
                        <!-- Widget injected on demand -->
                    </div>
                </div>
            `;

                card.addEventListener('click', (e) => {
                    const ticker = group.ticker;
                    const mainView = card.querySelector('.card-main-content');
                    const webView = card.querySelector('.card-web-view');

                    if (e.target.closest('.stock-web-link')) {
                        if (mainView && webView) {
                            card.classList.add('web-view-active');
                            mainView.classList.add('hidden');
                            webView.classList.remove('hidden');
                            const body = webView.querySelector('.web-view-body');

                            // Robust Ticker formatting for TradingView
                            let tvTicker = (group.ticker || '').toUpperCase();

                            // Mapping Yahoo/Common formats to TradingView Exchanges
                            const tickerMap = {
                                'SAN.MC': 'BME:SAN', 'BBVA.MC': 'BME:BBVA', 'TEF.MC': 'BME:TEF',
                                'ITX.MC': 'BME:ITX', 'IBE.MC': 'BME:IBE', 'REP.MC': 'BME:REP',
                                'CABK.MC': 'BME:CABK', 'SAB.MC': 'BME:SAB', 'ACS.MC': 'BME:ACS',
                                'FER.MC': 'BME:FER', 'AMS.MC': 'BME:AMS', 'MTS.MC': 'BME:MTS',
                                'AGNC': 'NASDAQ:AGNC', 'MAIN': 'NYSE:MAIN'
                            };

                            if (tickerMap[tvTicker]) {
                                tvTicker = tickerMap[tvTicker];
                            } else if (tvTicker.includes('.')) {
                                // Generic conversion: TKR.MC -> BME:TKR
                                const parts = tvTicker.split('.');
                                const suffix = parts[1];
                                let exchange = suffix;
                                if (suffix === 'MC') exchange = 'BME';
                                else if (suffix === 'L') exchange = 'LSE';
                                else if (suffix === 'DE') exchange = 'XETR';
                                else if (suffix === 'PA') exchange = 'EURONEXT';
                                else if (suffix === 'MI') exchange = 'MIL';

                                tvTicker = `${exchange}:${parts[0]}`;
                            } else {
                                // US Stocks normalization
                                let market = (group.market || '').toUpperCase();
                                let exchange = '';

                                if (market.includes('NASDAQ') || market.includes('NAS')) exchange = 'NASDAQ';
                                else if (market.includes('NYSE') || market.includes('NY')) exchange = 'NYSE';
                                else if (market.includes('AMEX')) exchange = 'AMEX';

                                if (exchange) {
                                    tvTicker = `${exchange}:${tvTicker}`;
                                } else {
                                    // Default fallback for bare tickers (usually works for US)
                                    tvTicker = tvTicker;
                                }
                            }

                            body.innerHTML = `
                            <div style="height:100%; width:100%; display:flex; align-items:center; justify-content:center; flex-direction:column; color:white; font-size:0.8rem; padding: 20px; text-align: center;">
                                <div class="spinner" style="margin-bottom:15px;"></div>
                                <div style="margin-bottom: 15px; font-weight: 600;">Cargando gráfico técnico...</div>
                                <div style="font-size: 0.7rem; opacity: 0.7; margin-bottom: 10px;">ID TradingView: ${tvTicker}</div>
                                <a href="https://finance.yahoo.com/quote/${group.ticker}" target="_blank" style="color: #3b82f6; text-decoration: underline; font-size: 0.75rem;" onclick="event.stopPropagation()">¿Problemas? Abre Yahoo Finance aquí</a>
                            </div>`;

                            setTimeout(() => {
                                body.innerHTML = `
                                <div class="tradingview-widget-container" style="height:100%;width:100%;position:relative;">
                                    <iframe scrolling="no" allowtransparency="true" frameborder="0" 
                                        src="https://s.tradingview.com/embed-widget/mini-symbol-overview/?locale=es&symbol=${tvTicker}&interval=D&width=100%25&height=100%25&gridLineColor=rgba(42,46,57,0)&fontColor=rgba(255,255,255,1)&underLineColor=rgba(33,150,243,0.3)&underLineBottomColor=rgba(33,150,243,0)&trendLineColor=rgba(33,150,243,1)&colorTheme=dark" 
                                        style="width:100%; height:100%; border:none;"></iframe>
                                    <div style="position:absolute; bottom:5px; left:0; width:100%; text-align:center; pointer-events:none;">
                                        <a href="https://es.tradingview.com/symbols/${tvTicker}" target="_blank" style="pointer-events:auto; color:rgba(255,255,255,0.3); font-size:0.5rem; text-decoration:none;">TradingView</a>
                                    </div>
                                </div>`;
                            }, 100);
                        }
                    } else if (e.target.closest('.close-web-view')) {
                        if (mainView && webView) {
                            card.classList.remove('web-view-active');
                            webView.classList.add('hidden');
                            mainView.classList.remove('hidden');
                            webView.querySelector('.web-view-body').innerHTML = '';
                        }
                    } else if (e.target.closest('.add-mvmt-btn')) {
                        addMoreFromStockByTicker(ticker);
                    } else if (e.target.closest('.history-btn')) {
                        const historyDiv = card.querySelector(`#history-${ticker.replace(/[^a-zA-Z0-9]/g, '_')}`);
                        if (historyDiv) historyDiv.classList.toggle('hidden');
                    } else if (e.target.closest('.details-btn')) {
                        showFinancialDetails(ticker);
                    } else if (e.target.closest('.edit-btn-small')) {
                        editStock(e.target.closest('.edit-btn-small').dataset.id);
                    } else if (e.target.closest('.delete-btn-small')) {
                        showCustomConfirm('¿Borrar esta operación?', () => {
                            removeStock(e.target.closest('.delete-btn-small').dataset.id);
                        });
                    }
                });

                elements.bolsaGrid.appendChild(card);
            } catch (err) {
                console.error("Card render error:", err);
            }
        });
    }

    function renderBolsaHighlights(displayStocksData) {
        if (!elements.bolsaHighlights) return;
        elements.bolsaHighlights.classList.toggle('hidden', !bolsaHighlightsVisible);
        if (elements.bolsaHighlightsToggleBtn) {
            elements.bolsaHighlightsToggleBtn.style.background = bolsaHighlightsVisible ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
        }
        if (!bolsaHighlightsVisible) return;

        const validStocks = displayStocksData.filter(s => s.liveInfo && s.liveInfo.stockPLPercent !== null);
        if (validStocks.length === 0) {
            elements.bolsaHighlights.innerHTML = '';
            return;
        }

        const best = [...validStocks].sort((a, b) => (b.liveInfo.stockPLPercent || 0) - (a.liveInfo.stockPLPercent || 0))[0];
        const worst = [...validStocks].sort((a, b) => (a.liveInfo.stockPLPercent || 0) - (b.liveInfo.stockPLPercent || 0))[0];

        const totalInvested = validStocks.reduce((sum, s) => sum + s.liveInfo.stockInvested, 0);
        const totalValue = validStocks.reduce((sum, s) => sum + (s.liveInfo.stockCurrentVal || 0), 0);
        const totalPL = totalValue - totalInvested;
        const totalPLPct = totalInvested > 0 ? (totalPL / totalInvested) * 100 : 0;

        const items = [
            { label: 'Cartera', value: fmtPct(totalPLPct), isProfit: totalPL >= 0 },
            { label: 'Top', ticker: best.ticker, value: fmtPct(best.liveInfo.stockPLPercent), isProfit: best.liveInfo.stockPLPercent >= 0 },
            { label: 'Low', ticker: worst.ticker, value: fmtPct(worst.liveInfo.stockPLPercent), isProfit: worst.liveInfo.stockPLPercent >= 0 }
        ];

        // Fill up for a nice scroll
        const tickerContent = [...items, ...items, ...items, ...items].map(h => `
            <div class="ticker-item">
                <span class="ticker-label">${h.label}${h.ticker ? ' ' + h.ticker : ''}:</span>
                <span class="ticker-value ${h.isProfit ? 'profit' : 'loss'}">${h.value}</span>
            </div>
        `).join('');

        elements.bolsaHighlights.innerHTML = `
            <div class="highlights-container">
                <div class="highlights-ticker">
                    ${tickerContent}
                </div>
            </div>
        `;
    }

    function addMoreFromStockByTicker(ticker) {
        const stock = stocks.find(s => s.ticker === ticker);
        if (stock) {
            addMoreFromStock(stock.id);
        } else {
            // If somehow we don't have it but it's in the group
            elements.addStockForm.reset();
            elements.editId.value = '';
            elements.tickerInput.value = ticker;
            elements.dateInput.valueAsDate = new Date();
            elements.modalTitle.textContent = `Añadir Inversión - ${ticker}`;
            toggleModal(true);
        }
    }

    function renderPortfolioPieChart() {
        const container = elements.portfolioPieChart;
        if (!container) return;

        // Ensure the section is visible if we have stocks
        const section = document.getElementById('portfolioChartSection');
        if (stocks.length === 0) {
            if (section) section.style.display = 'none';
            return;
        } else {
            if (section) section.style.display = 'block';
        }

        try {
            // Calculate current value per ticker
            const tickerData = stocks.reduce((acc, s) => {
                let info = { price: 0, currency: s.currency || 'EUR' };
                if (window.getStockInfo) {
                    const stockInfo = window.getStockInfo(s.ticker);
                    if (stockInfo && stockInfo.price !== null) {
                        info = stockInfo;
                    }
                }

                let currentPriceEUR = info.price;
                if (info.currency === 'USD') {
                    currentPriceEUR = info.price * (window.FX_RATE || 0.92);
                }

                // Fallback to purchase price if currentPriceEUR is null/0
                if (!currentPriceEUR) {
                    currentPriceEUR = s.price;
                }

                const qty = parseFloat(s.qty) || 0;
                const valueEUR = qty * (parseFloat(currentPriceEUR) || 0);
                const investedEUR = qty * (parseFloat(s.price) || 0);

                if (!acc[s.ticker]) {
                    acc[s.ticker] = { ticker: s.ticker, name: s.name || s.ticker, value: 0, invested: 0 };
                }
                acc[s.ticker].value += valueEUR;
                acc[s.ticker].invested += investedEUR;
                return acc;
            }, {});

            const validStocks = Object.values(tickerData).filter(s => s.value > 0);
            if (validStocks.length === 0) {
                container.innerHTML = '<p style="text-align:center; opacity:0.5; padding: 2rem;">Sin datos de valor para mostrar (revisa tus inversiones).</p>';
                return;
            }

            const total = validStocks.reduce((s, d) => s + d.value, 0);

            // Color palette (vibrant, premium)
            const COLORS = [
                '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899',
                '#14b8a6', '#f97316', '#8b5cf6', '#22c55e', '#06b6d4',
                '#e11d48', '#a855f7'
            ];

            const cx = 200;
            const cy = 200;
            const r = 160;
            const toRad = deg => (deg * Math.PI) / 180;

            let startAngle = -90;
            const slices = validStocks.sort((a, b) => b.value - a.value).map((s, i) => {
                const pct = s.value / total;
                const sweep = pct * 360;
                const sa = startAngle;
                startAngle += sweep;
                return {
                    ticker: s.ticker,
                    name: s.name,
                    value: s.value,
                    invested: s.invested,
                    pct,
                    sweep,
                    sa,
                    color: COLORS[i % COLORS.length]
                };
            });

            function arcPath(cx, cy, r, startDeg, endDeg) {
                const s = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
                const e = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) };
                const large = (endDeg - startDeg) > 180 ? 1 : 0;
                if (endDeg - startDeg >= 359.9) {
                    return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
                }
                return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
            }

            const slicePaths = slices.map((s) => {
                const path = arcPath(cx, cy, r, s.sa, s.sa + s.sweep);
                const amtStr = fmtEUR(s.value);
                const pctStr = (s.pct * 100).toFixed(1) + '%';
                const pl = s.value - s.invested;
                const plPct = s.invested > 0 ? (pl / s.invested) * 100 : 0;
                const plStr = `${pl >= 0 ? '+' : ''}${fmtEUR(pl)} (${plPct.toFixed(1)}%)`;

                return `<path d="${path}" fill="${s.color}" opacity="0.85"
                            stroke="#0f172a" stroke-width="2.5"
                            style="cursor:pointer; transition: opacity 0.2s, transform 0.2s;"
                            onmouseenter="this.setAttribute('opacity','1'); this.style.transform='scale(1.02)'; this.style.transformOrigin='center';"
                            onmouseleave="this.setAttribute('opacity','0.85'); this.style.transform='scale(1)';"
                            onclick="showFinancialDetails('${s.ticker}')">
                            <title>${s.name} (${s.ticker})\nValor: ${amtStr} (${pctStr})\nG/P: ${plStr}</title>
                        </path>`;
            }).join('');

            const legendHtml = slices.map(s => {
                const pl = s.value - s.invested;
                const plPct = s.invested > 0 ? (pl / s.invested) * 100 : 0;
                const plColor = pl >= 0 ? '#10b981' : '#ef4444';

                return `
                <div style="display:flex; align-items:center; gap:12px; font-size:0.9rem; padding: 0.6rem 0.8rem; background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); cursor:pointer; transition: background 0.2s;" onclick="showFinancialDetails('${s.ticker}')"
                     onmouseenter="this.style.background='rgba(255,255,255,0.08)'" onmouseleave="this.style.background='rgba(255,255,255,0.03)'">
                    <div style="width:14px; height:14px; border-radius:4px; background:${s.color}; flex-shrink:0; box-shadow: 0 0 8px ${s.color}66;"></div>
                    <div style="display: flex; flex-direction: column; flex: 1; overflow: hidden;">
                        <span style="font-weight:700; color: white; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${s.name}</span>
                        <span style="font-size:0.75rem; opacity:0.5;">${s.ticker}</span>
                    </div>
                    <div style="text-align: right; flex-shrink: 0;">
                        <div style="font-weight:700; color:white;">${fmtEUR(s.value)}</div>
                        <div style="font-size:0.75rem; color:${plColor}; font-weight: 600;">
                            ${pl >= 0 ? '+' : ''}${fmtEUR(pl)} (${plPct.toFixed(1)}%)
                        </div>
                    </div>
                </div>
            `;
            }).join('');

            container.style.cssText = '';  // Reset any previous inline styles

            container.innerHTML = `
                <div style="display:flex; flex-direction:column; gap:1rem; padding:1rem; width:100%; box-sizing:border-box; max-width: ${isBolsaPieExpanded ? '100%' : '400px'};">
                    <div class="drawer-header" id="bolsaPieHeader" style="cursor:pointer; width:100%;">
                        <div style="display:flex; align-items:center; gap:10px; flex:1;">
                            <span class="drawer-icon">📊</span>
                            <div class="drawer-info">
                                <h4 style="margin:0">Distribución de Cartera <span class="toggle-arrow ${isBolsaPieExpanded ? 'expanded' : ''}">▼</span></h4>
                                <p style="font-size:0.8rem; opacity:0.7;">Reparto de valor por activos</p>
                            </div>
                        </div>
                    </div>

                    <div class="collapsible-content ${isBolsaPieExpanded ? 'expanded' : ''}" style="width:100%;">
                        <div style="display:flex; flex-direction:column; align-items:center; gap:2.5rem; width:100%;">
                            <div style="width:100%; max-width:380px; position:relative; aspect-ratio:1/1;">
                                <svg viewBox="0 0 400 400" width="100%" height="100%" style="display:block; overflow:visible;">
                                    ${slicePaths}
                                    <circle cx="${cx}" cy="${cy}" r="65" fill="#0f172a" />
                                    <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-family="Outfit, sans-serif">Mi Cartera</text>
                                    <text x="${cx}" y="${cy + 16}" text-anchor="middle" fill="white" font-size="20" font-weight="800" font-family="Outfit, sans-serif">${fmtEUR(total)}</text>
                                </svg>
                            </div>
                            <div style="width:100%; display:grid; grid-template-columns:repeat(auto-fill, minmax(240px, 1fr)); gap:0.8rem;">
                                ${legendHtml}
                            </div>
                        </div>
                    </div>
                </div>`;

            const header = container.querySelector('#bolsaPieHeader');
            header.onclick = (e) => {
                e.stopPropagation();
                isBolsaPieExpanded = !isBolsaPieExpanded;
                localStorage.setItem('isBolsaPieExpanded', isBolsaPieExpanded);
                renderPortfolioPieChart();
            };
        } catch (err) {
            container.innerHTML = `<p style="color:var(--danger); font-size:0.8rem;">Error al renderizar gráfico: ${err.message}</p>`;
        }
    }

    function renderSavingsPieChart() {
        const container = document.getElementById('savingsPieChart');
        if (!container) return;

        // Filter to drawers with positive balance
        const validDrawers = savingsDrawers.filter(d => d.balance > 0);
        if (validDrawers.length === 0) {
            container.innerHTML = '<p style="text-align:center; opacity:0.5; padding: 2rem;">Sin datos para mostrar.</p>';
            return;
        }

        const total = validDrawers.reduce((s, d) => s + d.balance, 0);

        // Color palette (vibrant, harmonious)
        const COLORS = [
            '#6366f1', '#10b981', '#f59e0b', '#3b82f6', '#ec4899',
            '#14b8a6', '#f97316', '#8b5cf6', '#22c55e', '#06b6d4',
            '#e11d48', '#a855f7'
        ];

        const cx = 150;   // Original coordinate within 300x300 box
        const cy = 150;
        const r = 135;    // Large radius

        const toRad = deg => (deg * Math.PI) / 180;

        // Build slices
        let startAngle = -90;
        const slices = validDrawers.map((d, i) => {
            const pct = d.balance / total;
            const sweep = pct * 360;
            const sa = startAngle;
            startAngle += sweep;
            return { drawer: d, pct, sweep, sa, color: COLORS[i % COLORS.length] };
        });

        // SVG arc path helper
        function arcPath(cx, cy, r, startDeg, endDeg) {
            if (endDeg - startDeg >= 359.99) {
                return `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx} ${cy + r} A ${r} ${r} 0 1 1 ${cx} ${cy - r} Z`;
            }
            const s = { x: cx + r * Math.cos(toRad(startDeg)), y: cy + r * Math.sin(toRad(startDeg)) };
            const e = { x: cx + r * Math.cos(toRad(endDeg)), y: cy + r * Math.sin(toRad(endDeg)) };
            const large = (endDeg - startDeg) > 180 ? 1 : 0;
            return `M ${cx} ${cy} L ${s.x} ${s.y} A ${r} ${r} 0 ${large} 1 ${e.x} ${e.y} Z`;
        }

        // Build slice paths
        const slicePaths = slices.map((s) => {
            const path = arcPath(cx, cy, r, s.sa, s.sa + s.sweep);
            const amtStr = fmtEUR(s.drawer.balance);
            const pctStr = (s.pct * 100).toFixed(1) + '%';
            return `<path d="${path}" fill="${s.color}" opacity="0.85"
                        stroke="#0f172a" stroke-width="2"
                        style="cursor:pointer; transition: opacity 0.2s, transform 0.2s;"
                        onmouseenter="this.setAttribute('opacity','1'); this.style.transform='scale(1.02)'; this.style.transformOrigin='center';"
                        onmouseleave="this.setAttribute('opacity','0.85'); this.style.transform='scale(1)';"
                        onclick="showDrawerDetails('${s.drawer.id}')">
                        <title>${s.drawer.icon} ${s.drawer.name}\n${amtStr} (${pctStr})</title>
                    </path>`;
        }).join('');

        const legendHtml = slices.map(s => `
            <div style="display:flex; align-items:center; gap:8px; font-size:0.85rem; min-width:140px; cursor:pointer;" onclick="showDrawerDetails('${s.drawer.id}')">
                <div style="width:12px; height:12px; border-radius:3px; background:${s.color}; flex-shrink:0;"></div>
                <span style="opacity:0.8; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${s.drawer.icon} ${s.drawer.name}</span>
                <span style="font-weight:700; color:${s.color}; margin-left:auto;">${fmtEUR(s.drawer.balance)}</span>
            </div>
        `).join('');

        // Container structure updated with toggle header
        const parent = container.parentElement;
        const headerId = 'savingsPieHeader';
        if (!parent.querySelector(`#${headerId}`)) {
            const header = document.createElement('div');
            header.id = headerId;
            header.className = 'drawer-header';
            header.style.cursor = 'pointer';
            header.style.marginBottom = '1rem';
            header.innerHTML = `
                <div style="display:flex; align-items:center; gap: 10px;">
                    <span class="drawer-icon">🍰</span>
                    <div class="drawer-info">
                        <h4 style="margin:0">Distribución de Ahorros <span class="toggle-arrow ${isSavingsPieExpanded ? 'expanded' : ''}">▼</span></h4>
                        <p style="font-size: 0.8rem; opacity: 0.7;">Reparto total por cuentas de ahorro</p>
                    </div>
                </div>
            `;
            header.onclick = () => {
                isSavingsPieExpanded = !isSavingsPieExpanded;
                localStorage.setItem('isSavingsPieExpanded', isSavingsPieExpanded);
                renderSavingsPieChart();
            };
            parent.insertBefore(header, container);
        } else {
            const arrow = parent.querySelector(`#${headerId} .toggle-arrow`);
            if (arrow) {
                arrow.className = `toggle-arrow ${isSavingsPieExpanded ? 'expanded' : ''}`;
            }
        }

        container.style.display = 'flex';
        container.style.flexDirection = 'row';
        container.style.flexWrap = 'wrap';
        container.style.alignItems = 'center';
        container.style.justifyContent = 'center';
        container.style.gap = '2rem';
        container.style.padding = isSavingsPieExpanded ? '1rem' : '0';

        // Container takes full width
        const parentContainer = container.parentElement;
        if (parentContainer) {
            parentContainer.style.maxWidth = '100%';
            parentContainer.style.padding = isSavingsPieExpanded ? '1.5rem' : '0.8rem';
            const grandparent = parentContainer.parentElement;
            if (grandparent) {
                grandparent.style.maxWidth = '100%';
            }
        }

        container.innerHTML = isSavingsPieExpanded ? `
            <div style="width: 100%; display: flex; flex-direction: row; flex-wrap: wrap; align-items: center; justify-content: center; gap: 2rem; padding: 1rem;">
                <div style="flex: 1; min-width: 200px; max-width: 400px; position: relative;">
                    <svg viewBox="0 0 300 300" width="100%" height="100%" style="display:block; overflow:visible;">
                        ${slicePaths}
                        <circle cx="${cx}" cy="${cy}" r="60" fill="#0f172a" />
                        <text x="${cx}" y="${cy - 8}" text-anchor="middle" fill="rgba(255,255,255,0.5)" font-size="12" font-family="Outfit, sans-serif">Total</text>
                        <text x="${cx}" y="${cy + 12}" text-anchor="middle" fill="white" font-size="18" font-weight="700" font-family="Outfit, sans-serif">${fmtEUR(total)}</text>
                    </svg>
                </div>
                <div style="flex: 1.5; min-width: 250px; display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.8rem; align-content: center;">
                    ${legendHtml}
                </div>
            </div>` : '';
    }

    // Helper: build a labeled section with its own responsive sub-grid
    function buildSection(grid, title, icon, color, cards, totalAmount, storageKey) {
        if (cards.length === 0) return null;
        const section = document.createElement('div');
        section.style.marginBottom = '2rem';

        const isExpanded = storageKey ? localStorage.getItem(storageKey) !== 'false' : true;

        const header = document.createElement('div');
        header.className = storageKey ? 'collapsible-section-head' : '';
        header.setAttribute('role', storageKey ? 'button' : '');
        header.setAttribute('tabindex', storageKey ? '0' : '');
        header.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:1rem; padding-bottom:0.6rem; border-bottom:2px solid ' + color + '22; cursor: pointer; user-select: none; transition: background 0.2s; border-radius: 8px; padding: 0.5rem; touch-action: manipulation;';

        const totalStr = totalAmount !== undefined ? `<span style="margin-left:auto; font-weight:700; color:${color}; font-size:0.95rem;">${fmtEUR(totalAmount)}</span>` : '';
        header.innerHTML = `
            <span class="section-toggle-icon ${isExpanded ? 'expanded' : ''}" style="font-size:1.3rem; transition: transform 0.3s ease; display: inline-block;">${icon}</span>
            <h3 style="margin:0; font-size:1rem; color:${color}; font-weight:700; letter-spacing:0.02em;">
                ${title} (${cards.length})
            </h3>
            ${totalStr}
        `;

        const subGrid = document.createElement('div');
        subGrid.className = `drawer-subgrid collapsible-content ${isExpanded ? 'expanded' : ''}`;
        subGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1.2rem;';
        cards.forEach(c => subGrid.appendChild(c));

        if (storageKey) {
            const toggleHandler = (e) => {
                if (e.type === 'keydown' && e.key !== 'Enter' && e.key !== ' ') return;
                e.preventDefault();
                const nowExpanded = !subGrid.classList.contains('expanded');
                subGrid.classList.toggle('expanded', nowExpanded);
                header.querySelector('.section-toggle-icon')?.classList.toggle('expanded', nowExpanded);
                localStorage.setItem(storageKey, nowExpanded);

                // Update internal state if it matches one of the known keys
                if (storageKey === 'isNominaIngresosExpanded') isNominaIngresosExpanded = nowExpanded;
                if (storageKey === 'isNominaAhorroExpanded') isNominaAhorroExpanded = nowExpanded;
                if (storageKey === 'isNominaGastosExpanded') isNominaGastosExpanded = nowExpanded;
                if (storageKey === 'isNominaEgresosExpanded') isNominaEgresosExpanded = nowExpanded;
            };

            header.addEventListener('click', toggleHandler);
            header.addEventListener('keydown', toggleHandler);

            header.onmouseenter = () => { header.style.background = 'rgba(255,255,255,0.03)'; };
            header.onmouseleave = () => { header.style.background = 'transparent'; };
        }

        section.appendChild(header);
        section.appendChild(subGrid);
        grid.appendChild(section);
        return subGrid;
    }

    function renderNominaList() {
        if (!elements.nominaTableBody || !elements.nominaCurrentMonthLabel) return;

        // Update Label
        elements.nominaCurrentMonthLabel.textContent = formatFiscalMonth(nominaListMonth);

        // Sync select state
        if (elements.nominaListFilterMode) {
            elements.nominaListFilterMode.classList.toggle('active', nominaListFilterMode === 'totals');
        }
        elements.nominaTableBody.innerHTML = '';
        const nominaListFrag = document.createDocumentFragment();

        if (nominaData.length === 0) {
            elements.nominaTableBody.innerHTML = '<tr><td colspan="3" style="padding:2rem; text-align:center; opacity:0.5;">No hay conceptos configurados</td></tr>';
            return;
        }

        const currentMonthNum = parseInt(nominaListMonth.split('-')[1]);

        // Group drawers by type or apply sorting
        const effectiveSortKey = nominaListFilterMode === 'totals' ? 'type' : nominaSortConfig.key;
        const sortedDrawers = [...nominaData].sort((a, b) => {
            let valA, valB;
            if (effectiveSortKey === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (effectiveSortKey === 'balance') {
                const getBal = (d) => (d.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum)).reduce((s, m) => s + m.amount, 0);
                valA = getBal(a);
                valB = getBal(b);
            } else {
                // Default: Sort by type: income, then saving, then expense
                const typeOrder = { 'income': 1, 'saving': 2, 'expense': 3 };
                const orderA = typeOrder[a.type] || 4;
                const orderB = typeOrder[b.type] || 4;
                if (orderA !== orderB) return orderA - orderB;
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            }

            if (valA < valB) return nominaSortConfig.direction === 'asc' ? -1 : 1;
            if (valA > valB) return nominaSortConfig.direction === 'asc' ? 1 : -1;
            return 0;
        });

        // Update Sort Icons and Header names in Headers
        const headerIcons = document.querySelectorAll('.sort-icon-nomina');
        const headers = ['name', 'balance'];
        headerIcons.forEach((icon, idx) => {
            const key = headers[idx];
            if (nominaSortConfig.key === key) {
                icon.textContent = nominaSortConfig.direction === 'asc' ? '🔼' : '🔽';
                icon.style.opacity = '1';
            } else {
                icon.textContent = '↕️';
                icon.style.opacity = '0.3';
            }
        });

        // Update column header text based on mode
        const nominaTableHeaders = document.querySelectorAll('#nominaTableContainer th[data-sort]');
        nominaTableHeaders.forEach(th => {
            if (th.dataset.sort === 'balance') {
                const icon = th.querySelector('.sort-icon-nomina');
                const iconHtml = icon ? icon.outerHTML : '';
                th.innerHTML = (nominaListFilterMode === 'totals' ? 'Provisión ' : 'Importe ') + iconHtml;
            }
        });

        let lastType = null;
        const typeLabels = {
            'income': 'DISTRIBUCIÓN DE INGRESOS',
            'saving': 'DISTRIBUCIÓN DE AHORRO',
            'expense': 'DISTRIBUCIÓN DE GASTOS'
        };

        // Pre-calculate totals for headers (matching renderNomina summary logic)
        let totalPrimaryIncome = 0;
        let totalBudgetedProvisions = 0;

        nominaData.forEach(drawer => {
            const isIncomeType = drawer.type === 'income';
            const monthlyMovements = (drawer.movements || [])
                .filter(m => (m.activeMonths || []).map(Number).includes(currentMonthNum));

            monthlyMovements.forEach(m => {
                if (m.amount > 0) {
                    if (isIncomeType) totalPrimaryIncome += m.amount;
                    else if (isProvision(m) && !drawer.isAutomatic) totalBudgetedProvisions += m.amount;
                } else if (m.amount < 0 && isIncomeType) {
                    totalPrimaryIncome += m.amount;
                }
            });
        });

        const calculatedUndestined = totalPrimaryIncome - totalBudgetedProvisions;

        const categoryTotals = nominaData.reduce((acc, drawer) => {
            if (drawer.isAutomatic) return acc; // Skip automatic drawers
            const monthlyMovements = (drawer.movements || [])
                .filter(m => (m.activeMonths || []).map(Number).includes(currentMonthNum));

            if (drawer.type === 'income') {
                const monthlySum = monthlyMovements.reduce((s, m) => s + m.amount, 0);
                acc[drawer.type] = (acc[drawer.type] || 0) + monthlySum;
            } else if (drawer.type === 'saving') {
                const provisionMvmt = monthlyMovements.find(m => isProvision(m));
                const provision = provisionMvmt ? provisionMvmt.amount : 0;
                acc[drawer.type] = (acc[drawer.type] || 0) + provision;
            } else if (drawer.type === 'expense') {
                const provisionMvmt = monthlyMovements.find(m => isProvision(m));
                const provision = provisionMvmt ? provisionMvmt.amount : 0;
                acc[drawer.type] = (acc[drawer.type] || 0) + provision;
            }
            return acc;
        }, {});

        const egresosMap = new Map();
        nominaData.forEach(concept => {
            if (concept.type === 'saving' || concept.type === 'expense') {
                if (concept.isAutomatic) return;
                const monthlyMovements = (concept.movements || []).filter(m => (m.activeMonths || []).map(Number).includes(currentMonthNum));
                const isSavings = concept.type === 'saving';
                const provision = isSavings
                    ? monthlyMovements.filter(m => m.amount > 0).reduce((sum, m) => sum + m.amount, 0)
                    : (monthlyMovements.find(m => isProvision(m))?.amount || 0);

                if (!egresosMap.has(concept.name)) {
                    egresosMap.set(concept.name, {
                        name: concept.name,
                        amount: 0,
                        icon: concept.icon || getNominaIcon(concept.name, concept.type)
                    });
                }
                egresosMap.get(concept.name).amount += provision;
            }
        });

        let totalEgresos = 0;
        egresosMap.forEach(v => totalEgresos += v.amount);

        sortedDrawers.forEach(drawer => {
            // Check if drawer is active for this month
            const drawerMovements = (drawer.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));
            if (drawerMovements.length === 0 && !drawer.isAutomatic) return;

            // In totals mode, skip automatic drawers (Dinero no destinado)
            if (nominaListFilterMode === 'totals' && drawer.isAutomatic) return;

            // Type Header separator (show in totals mode always, or when sorting by type)
            if (effectiveSortKey === 'type' && drawer.type !== lastType) {
                const sepTr = document.createElement('tr');
                sepTr.className = 'list-section-header';
                sepTr.innerHTML = `
                    <td colspan="2">${typeLabels[drawer.type]}</td>
                    <td style="text-align: right; padding-right: 1rem;">${fmtEUR(categoryTotals[drawer.type] || 0)}</td>
                `;
                nominaListFrag.appendChild(sepTr);
                lastType = drawer.type;
            }

            // Drawer Header Row
            const headerTr = document.createElement('tr');
            headerTr.className = 'ahorro-list-header'; // Reusing consistency

            let monthlyBalance = drawerMovements.reduce((sum, m) => sum + m.amount, 0);
            if (drawer.isAutomatic) {
                monthlyBalance = calculatedUndestined;
            }

            // In totals mode, show provision (saldo inicial) instead of net balance
            let displayAmount = monthlyBalance;
            let displayAmountColor = '';
            if (nominaListFilterMode === 'totals' && !drawer.isAutomatic) {
                const provisionMvmt = drawerMovements.find(m => isProvision(m));
                const provision = provisionMvmt ? provisionMvmt.amount : 0;
                if (provision === 0) {
                    // No provision: show sum of expenses in red (not counted in section total)
                    const expensesSum = drawerMovements
                        .filter(m => m.amount < 0)
                        .reduce((s, m) => s + m.amount, 0);
                    displayAmount = expensesSum;
                    displayAmountColor = 'color: var(--danger);';
                } else {
                    displayAmount = provision;
                }
            }

            headerTr.innerHTML = `
                <td colspan="2">
                    <div class="header-content">
                        <span>${drawer.icon || getNominaIcon(drawer.name, drawer.type)} ${drawer.name}</span>
                        ${(!drawer.isAutomatic && nominaListFilterMode === 'detail') ? `
                            <div class="list-actions">
                                <button class="add-nomina-mvmt-list-btn btn-primary" title="Añadir Movimiento">➕</button>
                                ${drawer.linkedSavingsDrawerId ? `<button class="transfer-nomina-ahorro-list-btn btn-primary" style="background:var(--success); padding: 0.3rem 0.6rem;" title="Traspasar Ahorro">➡️</button>` : ''}
                                <button class="edit-nomina-drawer-list-btn btn-secondary" title="Editar Cuenta">✏️</button>
                                <button class="delete-nomina-drawer-list-btn btn-danger" title="Borrar Cuenta">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="balance" style="${displayAmountColor}">${fmtEUR(displayAmount)}</td>
            `;

            // Add event listeners (only in detail mode)
            if (!drawer.isAutomatic && nominaListFilterMode === 'detail') {
                headerTr.querySelector('.add-nomina-mvmt-list-btn').onclick = (e) => {
                    e.stopPropagation();
                    showAddNominaMovement(drawer.id);
                };
                if (headerTr.querySelector('.transfer-nomina-ahorro-list-btn')) {
                    headerTr.querySelector('.transfer-nomina-ahorro-list-btn').onclick = (e) => {
                        e.stopPropagation();
                        transferNominaToAhorro(drawer.id);
                    };
                }
                headerTr.querySelector('.edit-nomina-drawer-list-btn').onclick = (e) => {
                    e.stopPropagation();
                    showEditNominaDrawer(drawer.id);
                };
                headerTr.querySelector('.delete-nomina-drawer-list-btn').onclick = (e) => {
                    e.stopPropagation();
                    deleteNominaDrawer(drawer.id);
                };
            }

            nominaListFrag.appendChild(headerTr);

            // In totals mode, skip movement rows
            if (nominaListFilterMode === 'totals') return;

            if (drawerMovements.length === 0) {
                const emptyTr = document.createElement('tr');
                emptyTr.className = 'ahorro-list-empty-row';
                emptyTr.innerHTML = `<td colspan="3">Sin movimientos este mes</td>`;
                nominaListFrag.appendChild(emptyTr);
            } else {
                // Movements list
                drawerMovements.forEach((m) => {
                    const tr = document.createElement('tr');
                    tr.className = 'ahorro-list-row';

                    const isIncome = m.amount > 0;
                    const amountColor = isIncome ? 'var(--success)' : 'var(--danger)';
                    const concept = m.description || m.concept || '-';

                    tr.innerHTML = `
                        <td class="date" style="font-size: 0.75rem; opacity: 0.6;">${m.date ? new Date(m.date).toLocaleDateString('es-ES') : '--/--/--'}</td>
                        <td class="concept">${concept}</td>
                        <td class="amount" style="color: ${amountColor}">${fmtEUR(m.amount)}</td>
                    `;

                    // Detail/Edit on click
                    tr.onclick = () => {
                        const originalIndex = drawer.movements.indexOf(m);
                        if (originalIndex !== -1) {
                            showEditNominaMovement(drawer.id, originalIndex);
                        }
                    };

                    nominaListFrag.appendChild(tr);
                });
            }
        });

        // Add Egresos section at the end of the list
        if (egresosMap.size > 0) {
            const sepTr = document.createElement('tr');
            sepTr.className = 'list-section-header';
            sepTr.style.borderTop = '2px solid #a855f7';
            sepTr.innerHTML = `
                <td colspan="2">DISTRIBUCIÓN DE EGRESOS</td>
                <td style="text-align: right; padding-right: 1rem;">${fmtEUR(totalEgresos)}</td>
            `;
            nominaListFrag.appendChild(sepTr);

            egresosMap.forEach(egreso => {
                if (egreso.amount === 0) return;
                const tr = document.createElement('tr');
                tr.className = 'ahorro-list-header';
                const pct = totalPrimaryIncome > 0 ? (egreso.amount / totalPrimaryIncome) * 100 : 0;
                const pctStr = pct > 0 ? ` <span style="font-size: 0.8rem; opacity: 0.5;">(${fmtPct(pct)})</span>` : '';
                tr.innerHTML = `
                    <td colspan="2">
                        <div class="header-content">
                            <span>${egreso.icon} ${egreso.name}${pctStr}</span>
                        </div>
                    </td>
                    <td class="balance">${fmtEUR(egreso.amount)}</td>
                `;
                nominaListFrag.appendChild(tr);
            });
        }

        elements.nominaTableBody.appendChild(nominaListFrag);
    }

    function renderNomina() {
        if (!elements.nominaSection || currentView !== 'nomina') return;

        // Toggle visibility based on view mode
        if (nominaViewMode === 'list') {
            elements.nominaGridContainer?.classList.add('hidden');
            elements.nominaTableContainer?.classList.remove('hidden');

            if (elements.nominaViewToggleBtn) {
                elements.nominaViewToggleBtn.innerHTML = '<span>🗂️</span>';
                elements.nominaViewToggleBtn.title = 'Cambiar a Vista Tarjetas';
            }
        } else {
            elements.nominaGridContainer?.classList.remove('hidden');
            elements.nominaTableContainer?.classList.add('hidden');

            if (elements.nominaViewToggleBtn) {
                elements.nominaViewToggleBtn.innerHTML = '<span>📄</span>';
                elements.nominaViewToggleBtn.title = 'Cambiar a Vista Listado';
            }
        }

        // Helper to ensure the automatic drawer exists - DO THIS BEFORE RENDERING LIST
        if (!Array.isArray(nominaData)) {
            console.error('nominaData is not an array! Resetting to empty.');
            nominaData = [];
        }
        let autoDrawer = nominaData.find(d => d.isAutomatic);
        if (!autoDrawer) {
            autoDrawer = {
                id: 'auto_undestined',
                name: 'Dinero No Destinado',
                icon: '💰',
                type: 'expense',
                isAutomatic: true,
                movements: []
            };
            nominaData.push(autoDrawer);
        }

        if (nominaViewMode === 'list') {
            renderNominaList();
        }

        updateFiscalCountdown();

        const grid = elements.nominaGrid;
        if (!grid) return;
        grid.innerHTML = '';

        let totalPrimaryIncome = 0; // External income in income-type drawers (Salary)
        let totalExternalExtraIncome = 0; // External positive movements in expense-type drawers (Refunds)
        let totalBudgetedProvisions = 0; // Monies assigned from income to expense drawers (Saldo inicial)
        let totalCurrentExpenseBalanceManual = 0; // Sum of balances of manual expense drawers only
        let totalAhorroNetoManual = 0;
        let totalPaidExpensesManual = 0;
        let totalPlannedExpensesManual = 0;

        const fiscalMonthStr = getFiscalMonth(); // e.g., "2026-03"
        const currentMonthNum = parseInt(fiscalMonthStr.split('-')[1]);

        if (elements.currentFiscalMonthDisplay) {
            elements.currentFiscalMonthDisplay.textContent = formatFiscalMonth(fiscalMonthStr);
        }

        const allMonthlyExpenses = [];

        // Helper to ensure the automatic drawer exists (removed from here, moved up)

        // 1. First Pass: Calculate all global sums
        nominaData.forEach((concept) => {

            const isIncomeType = concept.type === 'income';
            const monthlyMovements = (concept.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));

            monthlyMovements.forEach(m => {
                const provision = isProvision(m);
                if (m.amount > 0) {
                    if (isIncomeType) {
                        totalPrimaryIncome += m.amount;
                    } else {
                        if (provision) {
                            if (!concept.isAutomatic) totalBudgetedProvisions += m.amount;
                        } else {
                            totalExternalExtraIncome += m.amount;
                        }
                    }
                } else if (m.amount < 0) {
                    // A negative movement in an income-type drawer should probably subtract from primary income
                    // instead of being counted as a "planned expense" of the expense drawers.
                    if (isIncomeType) {
                        totalPrimaryIncome += m.amount; // amount is negative, so it subtracts
                    } else {
                        const absAmt = Math.abs(m.amount);
                        totalPlannedExpensesManual += absAmt;
                        if (m.paid) totalPaidExpensesManual += absAmt;

                        allMonthlyExpenses.push({
                            ...m,
                            drawerId: concept.id,
                            drawerName: concept.name,
                            icon: concept.icon || getNominaIcon(concept.name, concept.type)
                        });
                    }
                }
            });
        });

        // 2. Synchronize residue (Undestined) - purely virtual, do not persist in movements
        const calculatedUndestined = totalPrimaryIncome - totalBudgetedProvisions;

        // 3. Second Pass: Start loop for rendering and local sums
        const incomeCards = [];
        const savingCards = [];
        const expenseCards = [];

        let autoCard = null;
        let savingsSecTotal = 0;

        nominaData.forEach((concept) => {
            const isIncomeType = concept.type === 'income';
            const monthlyMovements = (concept.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));
            const monthlyBalance = monthlyMovements.reduce((sum, m) => sum + m.amount, 0);

            const provisionMvmt = monthlyMovements.find(m => isProvision(m));
            const provision = provisionMvmt ? provisionMvmt.amount : 0;

            if (!isIncomeType && !concept.isAutomatic) {
                totalCurrentExpenseBalanceManual += monthlyBalance;

                const hasEverHadNegativeMovements = (concept.movements || []).some(m => !isProvision(m) && m.amount < 0);
                const isSavingDrawer = concept.type === 'saving';

                // Net Saving in Nomina: Sum all active positive movements for saving drawers, 
                // or just provisions for saving-like expense drawers.
                monthlyMovements.forEach(m => {
                    if (m.amount > 0) {
                        if (isSavingDrawer || (!hasEverHadNegativeMovements && isProvision(m))) {
                            totalAhorroNetoManual += m.amount;
                        }
                    }
                });
            }

            const isIncome = concept.type === 'income';

            const isSavings = concept.type === 'saving';

            const card = document.createElement('div');
            card.className = `card drawer-card glass-panel ${isIncome ? 'income-drawer' : ''} ${isSavings ? 'savings-drawer' : ''} ${concept.isAutomatic ? 'undestined-drawer' : ''}`;

            // Apply themes
            const colorIdx = concept.colorIndex !== undefined ? concept.colorIndex : (isIncome ? 0 : (isSavings ? 5 : 2));
            const theme = DRAWER_COLORS[colorIdx % DRAWER_COLORS.length];

            card.style.setProperty('background', `rgba(${parseInt(theme.border.slice(1, 3), 16)}, ${parseInt(theme.border.slice(3, 5), 16)}, ${parseInt(theme.border.slice(5, 7), 16)}, 0.25)`, 'important');
            card.style.setProperty('background-color', theme.bg, 'important');
            card.style.setProperty('background-image', `linear-gradient(135deg, ${theme.grad} 0%, rgba(15, 23, 42, 0.8) 100%)`, 'important');
            card.style.setProperty('border', `2px solid ${theme.border}`, 'important');

            if (isSavings) savingsSecTotal += provision;

            let balanceDisplay = '';
            if (!isIncome) {
                const monthlyExpensesSum = monthlyMovements
                    .filter(m => !isProvision(m) && m.amount < 0)
                    .reduce((sum, m) => sum + m.amount, 0);

                const monthlyOtherIncomesSum = monthlyMovements
                    .filter(m => !isProvision(m) && m.amount > 0)
                    .reduce((sum, m) => sum + m.amount, 0);

                // For saving drawers, the "Provision" is the sum of all positive movements
                const displayProvision = isSavings
                    ? monthlyMovements.filter(m => m.amount > 0).reduce((sum, m) => sum + m.amount, 0)
                    : provision;

                const yearlySavingSum = (concept.movements || [])
                    .filter(m => m.amount > 0)
                    .reduce((sum, m) => {
                        const monthsCount = (m.activeMonths || []).length;
                        return sum + (m.amount * monthsCount);
                    }, 0);

                const yearlyExpenseSum = (concept.movements || [])
                    .filter(m => m.amount < 0 && !isProvision(m))
                    .reduce((sum, m) => {
                        const monthsCount = (m.activeMonths || []).length;
                        return sum + (m.amount * monthsCount);
                    }, 0);

                balanceDisplay = `
                    <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 12px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">${isSavings ? 'Ahorro Mes' : 'Provisión'}:</span>
                            <span style="font-weight:600;">${fmtEUR(displayProvision)}</span>
                        </div>
                        ${isSavings ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Ahorro Año:</span>
                            <span style="font-weight:600; color:var(--success);">${fmtEUR(yearlySavingSum)}</span>
                        </div>` : ''}
                        ${(!isSavings && monthlyOtherIncomesSum > 0) ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Otros Ingresos:</span>
                            <span style="font-weight:600; color:var(--success);">+${fmtEUR(monthlyOtherIncomesSum)}</span>
                        </div>` : ''}
                        ${!isSavings ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Gastos Mes:</span>
                            <span style="font-weight:600; color:var(--danger);">${fmtEUR(monthlyExpensesSum)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Gastos Año:</span>
                            <span style="font-weight:600; color:var(--danger);">${fmtEUR(yearlyExpenseSum)}</span>
                        </div>` : ''}
                        ${!isSavings ? `
                        <div style="display:flex; justify-content:space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top:0.4rem; margin-top:0.2rem;">
                            <span style="opacity:0.6;">Sobrante:</span>
                            <span style="font-weight:700; color:${monthlyBalance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size: 1rem;">${fmtEUR(monthlyBalance)}</span>
                        </div>` : ''}
                    </div>
                `;
            } else {
                const yearlyIncomeSum = (concept.movements || []).reduce((sum, m) => {
                    const monthsCount = (m.activeMonths || []).length;
                    return sum + (m.amount * monthsCount);
                }, 0);
                balanceDisplay = `
                    <div class="drawer-balance" style="color: ${theme.border}; margin-top: 1rem; font-size: 1.25rem; font-weight: 700;">
                        ${fmtEUR(monthlyBalance)} 
                        <span style="font-size: 0.85rem; opacity: 0.6; font-weight: 400; color: var(--text-color); margin-left: 4px;">
                            de ${fmtEUR(yearlyIncomeSum)}
                        </span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="drawer-color-btn" title="Cambiar Color" data-id="${concept.id}" style="position: absolute; top: 0.4rem; right: 0.4rem; width: 20px; height: 20px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: grayscale(1); opacity: 0.3; transition: all 0.2s; font-size: 0.8rem; z-index: 10;">🎨</div>
                <div class="drawer-header">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <span class="drawer-icon">${concept.icon || getNominaIcon(concept.name, concept.type)}</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">
                                ${concept.name}
                                ${(() => {
                    if (concept.linkedSavingsDrawerId) {
                        const targetSavings = savingsDrawers.find(sd => sd.id == concept.linkedSavingsDrawerId);
                        if (targetSavings) {
                            return ` <span style="font-size: 0.8em; opacity: 0.7; font-weight: normal;">(${fmtEUR(targetSavings.balance)})</span>`;
                        }
                    }
                    return '';
                })()}
                            </h4>
                            <p style="font-size: 0.8rem; opacity: 0.7;">${monthlyMovements.length} mov. este mes</p>
                        </div>
                    </div>
                    ${concept.isAutomatic ? '' : `
                    <div class="drawer-actions">
                        <button class="btn-icon edit-nomina-drawer" data-id="${concept.id}" title="Editar Cuenta">✏️</button>
                        <button class="btn-icon delete-nomina-drawer" data-id="${concept.id}" title="Borrar Cuenta">🗑️</button>
                    </div>`}
                </div>
                ${balanceDisplay}
                <div class="drawer-footer" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                   <button class="btn-secondary btn-sm add-nomina-movement" data-id="${concept.id}" style="flex:1" title="Añadir Movimiento">➕</button>
                   <button class="btn-primary btn-sm view-nomina-details" data-id="${concept.id}" style="flex:1" title="Historial">🕒</button>
                   ${concept.linkedSavingsDrawerId ? `<button class="btn-primary btn-sm transfer-nomina-ahorro" data-id="${concept.id}" style="background:var(--success); padding: 0.5rem; flex: 0 0 auto;" title="Traspasar Ahorro">➡️</button>` : ''}
                </div>
            `;

            card.onclick = (e) => {
                const colorBtn = e.target.closest('.drawer-color-btn');
                if (colorBtn) {
                    e.stopPropagation();
                    cycleNominaDrawerColor(concept.id);
                }
            };

            // Route card to the right section
            if (isIncome) incomeCards.push(card);
            else if (isSavings) savingCards.push(card);
            else if (concept.isAutomatic) autoCard = card;
            else expenseCards.push(card);
        });

        // Calculate Egresos (Ahorro + Gastos summed by name)
        const egresosMap = new Map();
        nominaData.forEach(concept => {
            if (concept.type === 'saving' || concept.type === 'expense') {
                if (concept.isAutomatic) return;
                const monthlyMovements = (concept.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));
                const isSavings = concept.type === 'saving';
                const provision = isSavings
                    ? monthlyMovements.filter(m => m.amount > 0).reduce((sum, m) => sum + m.amount, 0)
                    : (monthlyMovements.find(m => isProvision(m))?.amount || 0);

                if (!egresosMap.has(concept.name)) {
                    egresosMap.set(concept.name, {
                        name: concept.name,
                        amount: 0,
                        icon: concept.icon || getNominaIcon(concept.name, concept.type),
                        colorIndex: concept.colorIndex
                    });
                }
                egresosMap.get(concept.name).amount += provision;
            }
        });

        const egresoCards = [];
        let totalEgresos = 0;
        egresosMap.forEach(egreso => {
            if (egreso.amount === 0) return;
            totalEgresos += egreso.amount;

            const card = document.createElement('div');
            card.className = 'card drawer-card glass-panel egreso-drawer';

            const colorIdx = egreso.colorIndex !== undefined ? egreso.colorIndex : 2;
            const theme = DRAWER_COLORS[colorIdx % DRAWER_COLORS.length];

            card.style.setProperty('background', `rgba(${parseInt(theme.border.slice(1, 3), 16)}, ${parseInt(theme.border.slice(3, 5), 16)}, ${parseInt(theme.border.slice(5, 7), 16)}, 0.25)`, 'important');
            card.style.setProperty('background-color', theme.bg, 'important');
            card.style.setProperty('background-image', `linear-gradient(135deg, ${theme.grad} 0%, rgba(15, 23, 42, 0.8) 100%)`, 'important');
            card.style.setProperty('border', `2px solid ${theme.border}`, 'important');

            const pct = totalPrimaryIncome > 0 ? (egreso.amount / totalPrimaryIncome) * 100 : 0;
            const pctStr = pct > 0 ? `<span style="font-size: 0.85rem; opacity: 0.6; font-weight: 400; color: var(--text-color); margin-left: 4px;">(${fmtPct(pct)})</span>` : '';

            card.innerHTML = `
                <div class="drawer-header">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <span class="drawer-icon">${egreso.icon}</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">${egreso.name}</h4>
                            <p style="font-size: 0.8rem; opacity: 0.7;">Total Egresos</p>
                        </div>
                    </div>
                </div>
                <div class="drawer-balance" style="color: ${theme.border}; margin-top: 1rem; font-size: 1.25rem; font-weight: 700;">
                    ${fmtEUR(egreso.amount)} ${pctStr}
                </div>
            `;
            egresoCards.push(card);
        });

        // Render the sections

        grid.style.display = 'block'; // sections handle their own grid
        const incomeSubGrid = buildSection(grid, 'Distrib. Ingresos', '📈', '#10b981', incomeCards, totalPrimaryIncome, 'isNominaIngresosExpanded');
        buildSection(grid, 'Distrib. Ahorro', '🏦', '#f59e0b', savingCards, savingsSecTotal, 'isNominaAhorroExpanded');
        buildSection(grid, 'Distrib. Gastos', '📉', '#ef4444', expenseCards, totalPlannedExpensesManual, 'isNominaGastosExpanded');
        buildSection(grid, 'Distrib. Egresos', '📤', '#a855f7', egresoCards, totalEgresos, 'isNominaEgresosExpanded');

        // Pie chart next to income drawers — same grid item, auto-placed to the right or below
        if (incomeSubGrid) {
            const totalIngresos = totalPrimaryIncome + totalExternalExtraIncome;
            const posibleAhorro = Math.max(0, totalBudgetedProvisions - totalAhorroNetoManual - totalPlannedExpensesManual);
            const pieSlices = [
                { label: 'Ahorro', color: '#f59e0b', value: totalAhorroNetoManual },
                { label: 'Gastos', color: '#ef4444', value: totalPlannedExpensesManual },
                { label: 'Posible Ahorro', color: '#06b6d4', value: posibleAhorro },
                { label: 'No destinado', color: '#8b5cf6', value: Math.max(0, calculatedUndestined) }
            ].filter(s => s.value > 0);

            const pieCard = document.createElement('div');
            pieCard.className = 'card glass-panel';
            pieCard.style.cssText = 'display:flex; flex-direction:column; align-items:center; justify-content:center; padding:1rem; min-height:160px;';

            if (pieSlices.length === 0) {
                pieCard.innerHTML = '<p style="opacity:0.4;font-size:0.85rem;text-align:center;">Sin distribución</p>';
            } else {
                const total = pieSlices.reduce((s, sl) => s + sl.value, 0);
                const toR = d => d * Math.PI / 180;
                const cx = 100, cy = 100, r = 90; // larger (was 72/58)
                let startAngle = -90;
                const slices = pieSlices.map(sl => {
                    const pct = sl.value / total;
                    const sweep = pct * 360;
                    const mid = startAngle + sweep / 2;
                    const sa = startAngle;
                    startAngle += sweep;
                    return { ...sl, pct, sweep, sa, mid };
                });

                const paths = slices.map(s => {
                    const sx = cx + r * Math.cos(toR(s.sa)), sy = cy + r * Math.sin(toR(s.sa));
                    const ex = cx + r * Math.cos(toR(s.sa + s.sweep)), ey = cy + r * Math.sin(toR(s.sa + s.sweep));
                    const large = s.sweep > 180 ? 1 : 0;
                    const amt = fmtEUR(s.value);
                    return `<path d="M${cx} ${cy} L${sx.toFixed(1)} ${sy.toFixed(1)} A${r} ${r} 0 ${large} 1 ${ex.toFixed(1)} ${ey.toFixed(1)}Z"
                        fill="${s.color}" opacity="0.85" stroke="#0f172a" stroke-width="1.5"
                        onmouseenter="this.setAttribute('opacity','1'); this.style.transform='scale(1.03)'; this.style.transformOrigin='center';" 
                        onmouseleave="this.setAttribute('opacity','0.85'); this.style.transform='scale(1)';" 
                        style="cursor:pointer;transition:opacity 0.2s, transform 0.2s">
                        <title>${s.label}: ${amt} (${(s.pct * 100).toFixed(1)}%)</title></path>`;
                }).join('');

                const totalStr = fmtEUR(total);
                const legendHtml = slices.map(s => `
                    <div style="display:flex; align-items:center; gap:6px; font-size:0.75rem;">
                        <div style="width:10px; height:10px; border-radius:2px; background:${s.color}; flex-shrink:0;"></div>
                        <span style="opacity:0.8; white-space:nowrap;">${s.label}</span>
                        <span style="font-weight:700; color:${s.color}; margin-left:auto; padding-left:4px;">${fmtEUR(s.value)}</span>
                    </div>
                `).join('');

                pieCard.style.flexDirection = 'row';
                pieCard.style.flexWrap = 'wrap';
                pieCard.style.gap = '1.2rem';
                pieCard.style.minHeight = '180px';
                pieCard.style.padding = '1.2rem';

                pieCard.innerHTML = `
                    <div style="display: flex; flex-direction: column; align-items: center; flex: 1; min-width: 140px;">
                        <div style="font-size:0.8rem; opacity:0.5; margin-bottom:0.8rem; text-align:center; font-weight:600;">Distribución del ingreso</div>
                        <svg viewBox="0 0 200 200" width="150" height="150" style="display:block; overflow:visible;">
                            ${paths}
                            <circle cx="${cx}" cy="${cy}" r="40" fill="#0f172a" />
                            <text x="${cx}" y="${cy - 4}" text-anchor="middle" fill="rgba(255,255,255,0.4)" font-size="9" font-family="Outfit,sans-serif">Total</text>
                            <text x="${cx}" y="${cy + 8}" text-anchor="middle" fill="white" font-size="10" font-weight="700" font-family="Outfit,sans-serif">${totalStr}</text>
                        </svg>
                    </div>
                    <div style="flex: 1.2; min-width: 160px; display: flex; flex-direction: column; gap: 6px; justify-content: center;">
                        ${legendHtml}
                    </div>`;
            }
            incomeSubGrid.appendChild(pieCard);
        }



        // Add Automatic Summary Drawer at the beginning
        if (allMonthlyExpenses.length > 0) {
            const summaryCard = document.createElement('div');
            summaryCard.className = 'card drawer-card glass-panel summary-drawer';
            summaryCard.style.gridColumn = '1 / -1'; // Span full width
            summaryCard.style.border = '1px solid var(--danger)';

            const totalSpent = allMonthlyExpenses.reduce((sum, m) => sum + m.amount, 0);

            // Calculate totals per drawer
            const totalsByDrawer = {};
            allMonthlyExpenses.forEach(m => {
                if (!totalsByDrawer[m.drawerId]) {
                    // Find provision for this drawer in this fiscal month
                    const concept = nominaData.find(c => c.id == m.drawerId);
                    const provisionMvmt = (concept?.movements || [])
                        .filter(cm => {
                            const months = cm.activeMonths || [];
                            return months.some(mo => parseInt(mo) === currentMonthNum);
                        })
                        .find(cm => isProvision(cm));
                    const provision = provisionMvmt ? provisionMvmt.amount : 0;

                    totalsByDrawer[m.drawerId] = {
                        name: m.drawerName,
                        spent: 0,
                        provision: provision,
                        icon: m.icon
                    };
                }
                totalsByDrawer[m.drawerId].spent += m.amount;
            });

            summaryCard.innerHTML = `
                <div class="drawer-header summary-header-toggle" id="expenseSummaryHeader">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <span class="drawer-icon">📉</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">Resumen de Gastos: ${formatFiscalMonth(fiscalMonthStr)} <span class="toggle-arrow ${isExpenseSummaryExpanded ? 'expanded' : ''}">▼</span></h4>
                            <p style="font-size: 0.8rem; opacity: 0.7;">${allMonthlyExpenses.length} gastos en ${Object.keys(totalsByDrawer).length} cuentas</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; opacity: 0.6;">Total Planeado</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--danger);">${fmtEUR(totalPlannedExpensesManual)}</div>
                    </div>
                </div>

                <div class="collapsible-content ${isExpenseSummaryExpanded ? 'expanded' : ''}" id="expenseSummaryContent">
                    <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
                        ${Object.entries(totalsByDrawer).map(([drawerId, data]) => {
                const isExpanded = expandedSummaryDrawers.has(drawerId);
                const drawerMovements = allMonthlyExpenses.filter(m => m.drawerId == drawerId);
                return `
                            <div class="summary-drawer-box" style="background: rgba(255,255,255,0.03); border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; cursor: pointer;" data-drawer-id="${drawerId}">
                                <div style="padding: 10px; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                    <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                        <span>${data.icon}</span>
                                        <span style="font-size: 0.85rem; opacity: 0.8;">${data.name}</span>
                                    </div>
                                    <div style="text-align: right; line-height: 1.1;">
                                        <div style="font-weight: 700; color: var(--danger); font-size: 0.9rem;">${fmtEUR(Math.abs(data.spent))}</div>
                                        <div style="font-size: 0.7rem; opacity: 0.6; color: var(--text-color);">de ${fmtEUR(data.provision)}</div>
                                    </div>
                                </div>
                                <div class="collapsible-content ${isExpanded ? 'expanded' : ''}" style="background: rgba(0,0,0,0.1);">
                                    <div style="padding: 0.8rem; display: flex; flex-direction: column; gap: 6px;">
                                        ${drawerMovements.sort((a, b) => parseAppDate(b.date) - parseAppDate(a.date)).map(m => `
                                            <div style="display: flex; justify-content: space-between; font-size: 0.75rem; border-bottom: 1px solid rgba(255,255,255,0.03); padding-bottom: 4px;">
                                                <span style="opacity: 0.7; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 120px;">${m.concept || m.description}</span>
                                                <span style="font-weight: 600; color: var(--danger);">${fmtEUR(m.amount)}</span>
                                            </div>
                                        `).join('')}
                                    </div>
                                </div>
                            </div>
                        `;
            }).join('')}
                    </div>

                </div>
            `;
            grid.appendChild(summaryCard);

            // Add toggle event listener
            const summaryHeader = summaryCard.querySelector('#expenseSummaryHeader');
            summaryHeader.addEventListener('click', (e) => {
                // Prevent toggle if clicking internal buttons if any (though currently none in header)
                isExpenseSummaryExpanded = !isExpenseSummaryExpanded;
                localStorage.setItem('isExpenseSummaryExpanded', isExpenseSummaryExpanded);
                renderNomina(); // Re-render to update classes and state
            });
        }

        // Build summary table at the bottom
        const summaryTable = document.getElementById('nominaSummaryTable');
        if (summaryTable) {
            const externalNetIncome = totalPrimaryIncome + totalExternalExtraIncome;
            const undestined = totalPrimaryIncome - totalBudgetedProvisions;

            // Payday countdown
            const now = new Date();
            let payday = new Date(now.getFullYear(), now.getMonth(), 25);
            if (now.getDate() >= 25) payday = new Date(now.getFullYear(), now.getMonth() + 1, 25);
            const diffDays = Math.ceil((payday - now) / (1000 * 60 * 60 * 24));
            const dayColor = diffDays <= 3 ? 'var(--danger)' : (diffDays <= 10 ? 'var(--primary)' : 'inherit');

            // Formatting Date 25/mm/aaaa
            const dd = 25;
            const mm = String(payday.getMonth() + 1).padStart(2, '0');
            const yyyy = payday.getFullYear();
            const paydayFormatted = `${dd}/${mm}/${yyyy}`;

            const rows = [
                { label: '📅 Mes en Curso', value: formatFiscalMonth(fiscalMonthStr) || '---', color: 'inherit' },
                { label: `⏳ Dias para el ${paydayFormatted}`, value: `${diffDays || 0} dias`, color: dayColor || 'inherit' },
                { label: '💰 Ingresos', value: fmtEUR(externalNetIncome || 0), color: 'var(--success)' },
                { label: '💸 Gastos', value: fmtEUR(totalPlannedExpensesManual || 0), color: 'var(--danger)' },
                { label: '✨ Ahorro Neto', value: fmtEUR(totalAhorroNetoManual || 0), color: '#f59e0b' },
                { label: '🟣 No Destinado', value: fmtEUR(undestined || 0), color: (undestined || 0) >= 0 ? 'var(--success)' : 'var(--danger)' }
            ];

            summaryTable.innerHTML = `
                <div class="table-container glass-panel" style="overflow-x:auto;">
                    <table style="width:100%; border-collapse:collapse;">
                        <tbody>
                            ${rows.map((r, i) => `
                            <tr style="border-bottom:1px solid rgba(255,255,255,0.05); ${i === rows.length - 1 ? 'border-bottom:none;' : ''}">
                                <td style="padding:0.5rem 0.3rem; opacity:0.7; font-size:0.75rem;">${r.label}</td>
                                <td style="padding:0.5rem 0.3rem; text-align:right; font-weight:700; color:${r.color}; font-size:0.8rem; white-space:nowrap;">${r.value}</td>
                            </tr>`).join('')}
                        </tbody>
                    </table>
                </div>`;
        }

        // Render the 3 pie charts
        // (removed — distribution shown as drawer sections, not pie charts)

        // Event delegation or direct listeners
        grid.onclick = (e) => {
            const btn = e.target.closest('button');
            const summaryDrawerBox = e.target.closest('.summary-drawer-box');

            if (summaryDrawerBox) {
                const drawerId = summaryDrawerBox.dataset.drawerId;
                if (expandedSummaryDrawers.has(drawerId)) {
                    expandedSummaryDrawers.delete(drawerId);
                } else {
                    expandedSummaryDrawers.add(drawerId);
                }
                renderNomina();
                return;
            }


            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.classList.contains('add-nomina-movement')) showAddNominaMovement(id);
            if (btn.classList.contains('view-nomina-details')) showNominaDrawerDetails(id);
            if (btn.classList.contains('transfer-nomina-ahorro')) transferNominaToAhorro(id);
            if (btn.classList.contains('edit-nomina-drawer')) showEditNominaDrawer(id);
            if (btn.classList.contains('delete-nomina-drawer')) {
                if (confirm('¿Estás seguro de que quieres eliminar esta cuenta de Nómina?')) {
                    deleteNominaDrawer(id);
                }
            }
        };
    }


    function switchView(view) {
        currentView = view;

        // Sync Sidebar Items
        elements.wealthNavItems?.forEach(item => {
            const isAh = ((item.dataset.view === 'ahorro' || item.dataset.view === 'ahorroGastos') && (view === 'ahorroCalendar' || view === 'ahorroEstado' || view === 'ahorroGastos'));
            const isNom = (item.dataset.view === 'nomina' && view === 'analisis');
            item.classList.toggle('active', item.dataset.view === view || isAh || isNom);
        });

        // Sync Bottom Bar Items
        elements.bottomNavItems?.forEach(item => {
            const isAh = (item.dataset.view === 'ahorro' && (view === 'ahorroCalendar' || view === 'ahorroEstado'));
            const isNom = (item.dataset.view === 'nomina' && view === 'analisis');
            const isAct = (item.dataset.view === 'activity' && view === 'activity');
            item.classList.toggle('active', item.dataset.view === view || isAh || isNom || isAct);
        });

        updateBottomNavLayout();

        // Update Mobile FAB (mobileMenuBtn) Icon/Label based on view context
        if (elements.mobileMenuBtn) {
            const iconSpan = elements.mobileMenuBtn.querySelector('span');
            if (iconSpan) {
                if (view === 'bolsa') {
                    iconSpan.textContent = '✨';
                    elements.mobileMenuBtn.title = 'Añadir Inversión';
                } else if (view === 'ahorro' || view === 'ahorroCalendar' || view === 'ahorroEstado' || view === 'ahorroHistorico') {
                    iconSpan.textContent = '💶';
                    elements.mobileMenuBtn.title = 'Nuevo Movimiento';
                } else if (view === 'nomina' || view === 'analisis') {
                    iconSpan.textContent = '➕';
                    elements.mobileMenuBtn.title = 'Añadir Concepto';
                } else {
                    iconSpan.textContent = '✨';
                    elements.mobileMenuBtn.title = 'Añadir';
                }
            }
        }

        // Manage Sidebar Submenus
        // ONLY force open if we are switching TO that specific view. 
        // If we are switching to something like "activity", we don't necessarily want to close others if they were manually opened.
        document.querySelectorAll('.nav-item-container').forEach(container => {
            const isAh = (view.startsWith('ahorro') && container.id === 'ahorroNavContainer');
            const isNom = ((view === 'nomina' || view === 'analisis') && container.id === 'nominaNavContainer');
            const isBolsa = (view === 'bolsa' && container.id === 'bolsaNavContainer');
            const isTarget = container.id === `${view}NavContainer` || isAh || isNom || isBolsa;

            if (isTarget) {
                container.classList.add('open');
            } else if (view !== 'activity' && view !== 'analisis' && view !== 'settings') {
                // If switching between main sections (Bolsa/Ahorro/Nomina), we close others. 
                // But for utility views like Activity, we leave them as they were.
                container.classList.remove('open');
            }
        });

        // Use generalized render to handle visibility and specific rendering
        if (view === 'activity') {
            updateActivityDrawerFilterOptions();
        }
        if (view === 'ahorroGastos') {
            updateAhorroGastosMonthLabel();
        }
        render();
    }

    function toggleSidebarCollapse() {
        const sidebar = elements.wealthSidebar;
        const btn = document.getElementById('sidebarCollapseBtn');
        if (!sidebar) return;

        const isCollapsed = sidebar.classList.toggle('collapsed');
        localStorage.setItem('sidebarCollapsed', isCollapsed);

        // Update main content padding
        const appMain = document.getElementById('appMain');
        if (appMain) {
            appMain.classList.toggle('sidebar-collapsed', isCollapsed);
        }

        // Toggle state icon/class on button
        if (btn) {
            btn.classList.toggle('sidebar-open', !isCollapsed);
            const icon = btn.querySelector('.collapse-icon');
            if (icon) {
                icon.textContent = isCollapsed ? '☰' : '◀';
            }
        }
    }

    function updateGroupDatalist() {
        if (!elements.existingGroupsDatalist) return;
        const groups = new Set();
        savingsDrawers.forEach(d => {
            if (d.group && d.group.trim()) groups.add(d.group.trim());
        });
        elements.existingGroupsDatalist.innerHTML = Array.from(groups)
            .sort()
            .map(g => `<option value="${g}">`)
            .join('');
    }

    function showAddDrawer() {
        // Resilient fetching
        const modal = document.getElementById('savingsInputModal');
        const form = document.getElementById('savingsInputForm');
        const typeInput = document.getElementById('savingsActionType');
        const title = document.getElementById('savingsModalTitle');
        const nameGroup = document.getElementById('drawerNameGroup');
        const amountInput = document.getElementById('movementAmountInput');
        const conceptGroup = document.getElementById('movementConceptGroup');
        const transferTargetGroup = document.getElementById('transferTargetGroup');

        if (!modal || !form || !typeInput) return;

        updateGroupDatalist();
        form.reset();
        typeInput.value = 'drawer';
        if (title) title.textContent = "Crear Nueva Cuenta";

        nameGroup?.classList.remove('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');
        if (amountInput) amountInput.placeholder = "Saldo Inicial (€)";
        conceptGroup?.classList.add('hidden');
        transferTargetGroup?.classList.add('hidden');
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');

        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.remove('hidden');
        if (elements.drawerIconInput) elements.drawerIconInput.value = '📁';

        elements.drawerGroupGroup?.classList.remove('hidden');
        if (elements.drawerGroupInput) elements.drawerGroupInput.value = '';

        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');

        // Default to today's date for new drawer
        if (elements.savingsDateInput) {
            elements.savingsDateInput.value = new Date().toISOString().split('T')[0];
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function showGlobalAddMovementModal() {
        const modal = document.getElementById('savingsInputModal');
        const form = document.getElementById('savingsInputForm');
        const typeInput = document.getElementById('savingsActionType');
        const targetIdInput = document.getElementById('savingsTargetId');
        const title = document.getElementById('savingsModalTitle');
        const nameGroup = document.getElementById('drawerNameGroup');
        const amountInput = document.getElementById('movementAmountInput');
        const conceptGroup = document.getElementById('movementConceptGroup');
        const transferTargetGroup = document.getElementById('transferTargetGroup');
        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        const targetDrawerSelect = document.getElementById('targetDrawerSelect');

        if (!modal || !form || !typeInput) return;

        form.reset();
        typeInput.value = 'global-movement';
        if (targetIdInput) targetIdInput.value = '';
        if (title) title.textContent = 'Nuevo Movimiento';

        nameGroup?.classList.add('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');
        if (amountInput) amountInput.placeholder = "0.00";
        conceptGroup?.classList.remove('hidden');
        const conceptInput = document.getElementById('movementConceptInput');
        if (conceptInput) {
            conceptInput.readOnly = false;
            conceptInput.style.opacity = '1';
        }
        transferTargetGroup?.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.add('hidden');

        targetDrawerSelectGroup?.classList.remove('hidden');
        if (targetDrawerSelect) {
            targetDrawerSelect.innerHTML = savingsDrawers
                .filter(d => !d.isAuto)
                .map(d => `<option value="${d.id}">${d.name} (${fmtEUR(d.balance)})</option>`)
                .join('');
            if (targetDrawerSelect.options.length === 0) {
                alert("Necesitas crear una cuenta primero.");
                return;
            }
        }

        // Show toggle for manual movements
        if (elements.savingsMovementTypeContainer) {
            elements.savingsMovementTypeContainer.classList.remove('hidden');
            updateSavingsMovementType('income');
        }

        if (elements.savingsCategoryGroup) {
            elements.savingsCategoryGroup.classList.remove('hidden');
        }

        // Default to today's date
        if (elements.savingsDateInput) {
            elements.savingsDateInput.value = new Date().toISOString().split('T')[0];
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function showAddMovementModal(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer) return;

        const modal = document.getElementById('savingsInputModal');
        const form = document.getElementById('savingsInputForm');
        const typeInput = document.getElementById('savingsActionType');
        const targetIdInput = document.getElementById('savingsTargetId');
        const title = document.getElementById('savingsModalTitle');
        const nameGroup = document.getElementById('drawerNameGroup');
        const amountInput = document.getElementById('movementAmountInput');
        const conceptGroup = document.getElementById('movementConceptGroup');
        const transferTargetGroup = document.getElementById('transferTargetGroup');

        if (!modal || !form || !typeInput) return;

        form.reset();
        typeInput.value = 'movement';
        if (targetIdInput) targetIdInput.value = drawerId;
        if (title) title.textContent = `Movimiento: ${drawer.name}`;

        nameGroup?.classList.add('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');
        if (amountInput) amountInput.placeholder = "0.00";
        conceptGroup?.classList.remove('hidden');
        const conceptInput = document.getElementById('movementConceptInput');
        if (conceptInput) {
            conceptInput.readOnly = false;
            conceptInput.style.opacity = '1';
        }
        transferTargetGroup?.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');
        
        const isMaxTotalCbBtnContainer = document.getElementById('maxTotalCheckboxContainer');
        const isMaxTotalCbInp = document.getElementById('movementIsMaxTotalInput');
        if (isMaxTotalCbBtnContainer && isMaxTotalCbInp) {
            if (drawer.group && drawer.group.toLowerCase() === 'nomina') {
                isMaxTotalCbBtnContainer.classList.remove('hidden');
                isMaxTotalCbInp.checked = false; // Reset to false for new movements
            } else {
                isMaxTotalCbBtnContainer.classList.add('hidden');
                isMaxTotalCbInp.checked = false;
            }
        }

        // Show toggle for manual movements
        if (elements.savingsMovementTypeContainer) {
            elements.savingsMovementTypeContainer.classList.remove('hidden');
            updateSavingsMovementType('income');
        }

        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.add('hidden');
        if (elements.drawerIconInput) elements.drawerIconInput.value = '📁';

        if (elements.savingsCategoryGroup) {
            elements.savingsCategoryGroup.classList.remove('hidden');
        }
        if (elements.savingsSubcategoryGroup) {
            elements.savingsSubcategoryGroup.classList.remove('hidden');
        }

        // Default to today's date
        if (elements.savingsDateInput) {
            elements.savingsDateInput.value = new Date().toISOString().split('T')[0];
        }

        if (isSmartConceptActive) {
            populateHistoricConcepts();
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function showTransferModal(drawerId) {
        const sourceDrawer = savingsDrawers.find(d => d.id === drawerId);
        if (!sourceDrawer) return;

        const modal = document.getElementById('savingsInputModal');
        const form = document.getElementById('savingsInputForm');
        const typeInput = document.getElementById('savingsActionType');
        const targetIdInput = document.getElementById('savingsTargetId');
        const title = document.getElementById('savingsModalTitle');
        const nameGroup = document.getElementById('drawerNameGroup');
        const amountInput = document.getElementById('movementAmountInput');
        const transferTargetGroup = document.getElementById('transferTargetGroup');
        const transferTargetSelect = document.getElementById('transferTargetSelect');
        const conceptGroup = document.getElementById('movementConceptGroup');

        if (!modal || !form || !typeInput || !transferTargetSelect) return;

        form.reset();
        typeInput.value = 'transfer';
        if (targetIdInput) targetIdInput.value = drawerId;
        if (title) title.textContent = `Traspasar desde: ${sourceDrawer.name}`;

        // Set default concept and date
        const conceptInput = document.getElementById('movementConceptInput');
        if (conceptInput) conceptInput.value = `Traspaso desde: ${sourceDrawer.name}`;
        
        if (elements.savingsDateInput) {
            elements.savingsDateInput.value = new Date().toISOString().split('T')[0];
        }

        nameGroup?.classList.add('hidden');
        transferTargetGroup?.classList.remove('hidden');
        conceptGroup?.classList.remove('hidden');
        if (amountInput) amountInput.placeholder = "Importe a traspasar";
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.add('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');
        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');

        // Populate target dropdown (exclude source and Bolsa)
        transferTargetSelect.innerHTML = savingsDrawers
            .filter(d => !d.isAuto && d.id !== drawerId)
            .map(d => `<option value="${d.id}">${d.name} (${fmtEUR(d.balance)})</option>`)
            .join('');

        if (elements.savingsCategoryGroup) {
            elements.savingsCategoryGroup.classList.remove('hidden');
        }
        if (elements.savingsCategorySelect) {
            elements.savingsCategorySelect.innerHTML = expenseCategories.map(c => `<option value="${c}">${c}</option>`).join('');
            elements.savingsCategorySelect.value = 'Traspaso';
        }
        if (elements.savingsSubcategoryGroup) {
            elements.savingsSubcategoryGroup.classList.remove('hidden');
        }
        if (elements.savingsSubcategorySelect) {
            elements.savingsSubcategorySelect.innerHTML = '<option value="">-- Sin subcategoría --</option>' +
                expenseSubcategories.map(s => `<option value="${s}">${s}</option>`).join('');
            elements.savingsSubcategorySelect.value = '';
        }

        if (transferTargetSelect.options.length === 0) {
            alert("Necesitas al menos otra cuenta manual para realizar un traspaso.");
            return;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';

        // Add listener for target selection to update concept
        if (transferTargetSelect) {
            const updateConceptOnTargetChange = () => {
                if (typeInput.value === 'transfer') {
                    const targetId = transferTargetSelect.value;
                    const targetDrawer = savingsDrawers.find(d => d.id == targetId);
                    if (targetDrawer && conceptInput) {
                        conceptInput.value = `Traspaso Hasta: ${targetDrawer.name}`;
                    }
                }
            };
            transferTargetSelect.onchange = updateConceptOnTargetChange;
            // Trigger once if there's already a selection
            if (transferTargetSelect.value) updateConceptOnTargetChange();
        }
    }

    function showEditDrawerModal(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || drawer.isAuto) return;

        const modal = document.getElementById('savingsInputModal');
        const form = document.getElementById('savingsInputForm');
        const typeInput = document.getElementById('savingsActionType');
        const targetIdInput = document.getElementById('savingsTargetId');
        const title = document.getElementById('savingsModalTitle');
        const nameGroup = document.getElementById('drawerNameGroup');
        const drawerNameInput = document.getElementById('drawerNameInput');
        const amountInput = document.getElementById('movementAmountInput');
        const conceptGroup = document.getElementById('movementConceptGroup');
        const transferTargetGroup = document.getElementById('transferTargetGroup');

        if (!modal || !form || !typeInput) return;

        updateGroupDatalist();
        form.reset();
        typeInput.value = 'edit-drawer';
        if (targetIdInput) targetIdInput.value = drawerId;
        if (title) title.textContent = `Editar Cuenta: ${drawer.name}`;

        if (drawerNameInput) drawerNameInput.value = drawer.name;
        if (elements.drawerGroupInput) elements.drawerGroupInput.value = drawer.group || '';
        nameGroup?.classList.remove('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');

        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.remove('hidden');
        if (elements.drawerIconInput) elements.drawerIconInput.value = drawer.icon || '📁';

        // Find initial balance movement with priority to "Saldo inicial" and older dates
        const allMovements = [...(drawer.movements || [])].sort((a, b) => parseAppDate(a.date) - parseAppDate(b.date));
        const initialMvmt = allMovements.find(m => (m.description || m.concept || "").toLowerCase().includes('saldo inicial'))
                          || allMovements.find(m => isProvision(m));

        if (amountInput) {
            amountInput.value = initialMvmt ? initialMvmt.amount : 0;
            amountInput.placeholder = "Saldo Inicial (€)";
        }

        // Set date to the identified initial movement's date, or the true oldest movement, or today
        let initialDate = initialMvmt ? initialMvmt.date : (allMovements.length > 0 ? allMovements[0].date : new Date().toISOString().split('T')[0]);
        
        // Ensure yyyy-mm-dd for input type="date"
        if (initialDate && initialDate.includes('/')) {
            const d = parseAppDate(initialDate);
            if (!isNaN(d.getTime())) {
                initialDate = d.toISOString().split('T')[0];
            }
        }
        if (elements.savingsDateInput) elements.savingsDateInput.value = initialDate;

        conceptGroup?.classList.add('hidden');
        transferTargetGroup?.classList.add('hidden');
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');
        if (elements.savingsCategoryGroup) elements.savingsCategoryGroup.classList.add('hidden');

        elements.drawerGroupGroup?.classList.remove('hidden');
        if (elements.drawerGroupInput) elements.drawerGroupInput.value = drawer.group || '';

        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function consolidateDrawerHistory(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || drawer.isAuto) return;

        // Calculate fiscal year start
        const now = new Date();
        const curFM = getFiscalMonth(now);
        const curFY = parseInt(curFM.split('-')[0]);
        // Date where current exercise started
        let exerciseStartDate;
        if (fiscalDay > 1) {
            exerciseStartDate = new Date(curFY - 1, 11, fiscalDay);
        } else {
            exerciseStartDate = new Date(curFY, 0, 1);
        }

        // Date for the end of previous exercise (one day before)
        const prevExerciseEndDate = new Date(exerciseStartDate);
        prevExerciseEndDate.setDate(prevExerciseEndDate.getDate() - 1);
        const endDateStr = prevExerciseEndDate.toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' });

        const modalId = 'consolidateOptionsOverlay';
        let overlay = document.getElementById(modalId);
        if (overlay) overlay.remove();

        overlay = document.createElement('div');
        overlay.id = modalId;
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 20000;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
            padding: 1rem;
        `;

        overlay.innerHTML = `
            <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 24px; padding: 2.5rem 2rem; width: min(450px, 95vw); text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <div style="font-size: 3rem; margin-bottom: 1rem; filter: drop-shadow(0 0 10px rgba(59, 130, 246, 0.4));">📁</div>
                <h3 style="margin-bottom: 1rem; font-weight: 700; color: white;">Consolidar Historial</h3>
                <p style="margin-bottom: 2rem; opacity: 0.8; color: white; line-height: 1.5;">Elige cómo quieres agrupar los movimientos de "<b>${drawer.name}</b>" para optimizar el espacio:</p>
                
                <div style="display: flex; flex-direction: column; gap: 0.8rem;">
                    <button id="consAnterior" class="btn-primary" style="padding: 1rem; border-radius: 14px; font-weight: 600; background: var(--primary); border: none; cursor: pointer;">
                        Ejercicio Anterior (Hasta ${endDateStr})
                        <div style="font-size: 0.7rem; opacity: 0.8; font-weight: 400; margin-top: 2px;">Mantiene movimientos del año actual</div>
                    </button>
                    
                    <button id="consTodo" class="btn-primary" style="padding: 1rem; border-radius: 14px; font-weight: 600; background: #6366f1; border: none; cursor: pointer;">
                        Todo el Historial
                        <div style="font-size: 0.7rem; opacity: 0.8; font-weight: 400; margin-top: 2px;">Limpieza total dejando solo el saldo actual</div>
                    </button>
                    
                    <button id="consCancel" class="btn-secondary" style="padding: 1rem; border-radius: 14px; margin-top: 0.5rem; cursor: pointer; opacity: 0.6;">Cancelar</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();

        document.getElementById('consCancel').onclick = close;

        const performConsolidation = (limitDate = null) => {
            close();
            const originalBalance = drawer.balance;

            if (!limitDate) {
                // Consolidate everything
                showCustomConfirm(`¿Confirmas consolidar TODO el historial de "${drawer.name}"? Solo quedará un movimiento con el saldo actual (${fmtEUR(originalBalance)}).`, () => {
                    let initialMvmt = (drawer.movements || []).find(m => isProvision(m));
                    if (initialMvmt) {
                        initialMvmt.amount = originalBalance;
                        initialMvmt.date = new Date().toISOString().split('T')[0];
                        drawer.movements = [initialMvmt];
                    } else {
                        drawer.movements = [{
                            id: Date.now() + Math.random(),
                            date: new Date().toISOString().split('T')[0],
                            amount: originalBalance,
                            description: 'Saldo inicial',
                            concept: 'Saldo inicial'
                        }];
                    }
                    if (window.saveSavings) window.saveSavings(savingsDrawers);
                    render();
                    showDrawerDetails(drawerId);
                });
            } else {
                // Consolidate up to limitDate (inclusive)
                showCustomConfirm(`¿Confirmas consolidar todos los movimientos anteriores al ${limitDate.toLocaleDateString()}?`, () => {
                    const toConsolidate = drawer.movements.filter(m => new Date(m.date) < limitDate);
                    const toKeep = drawer.movements.filter(m => new Date(m.date) >= limitDate);

                    if (toConsolidate.length === 0) {
                        showToast("No hay movimientos anteriores para consolidar", "info");
                        return;
                    }

                    const consolidatedSum = toConsolidate.reduce((sum, m) => sum + m.amount, 0);

                    // Update or create initial movement for the remaining set
                    let initialMvmt = toKeep.find(m => isProvision(m));
                    if (initialMvmt) {
                        initialMvmt.amount += consolidatedSum;
                    } else {
                        // Use the day before the limit as date for the consolidation entry
                        const entryDate = new Date(limitDate);
                        entryDate.setDate(entryDate.getDate() - 1);

                        toKeep.unshift({
                            id: Date.now() + Math.random(),
                            date: entryDate.toISOString().split('T')[0],
                            amount: consolidatedSum,
                            description: 'Saldo consolidado (Ex. Anterior)',
                            concept: 'Saldo consolidado'
                        });
                    }

                    drawer.movements = toKeep;
                    if (window.saveSavings) window.saveSavings(savingsDrawers);
                    render();
                    showDrawerDetails(drawerId);
                });
            }
        };

        document.getElementById('consTodo').onclick = () => performConsolidation(null);
        document.getElementById('consAnterior').onclick = () => performConsolidation(exerciseStartDate);
    }

    function deleteSavingsDrawer(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || drawer.isAuto) return;

        showCustomConfirm(`¿Estás seguro de que deseas borrar la cuenta "${drawer.name}"? Esta acción no se puede deshacer.`, () => {
            savingsDrawers = savingsDrawers.filter(d => d.id !== drawerId);
            if (window.saveSavings) window.saveSavings(savingsDrawers);
            render();
        });
    }

    function deleteSavingsMovement(drawerId, index) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || !drawer.movements[index]) return;

        const movement = drawer.movements[index];
        const tId = movement.transferId;

        if (tId) {
            showCustomConfirm(`Este movimiento forma parte de un traspaso. ¿Deseas borrar el traspaso completo? (Se eliminarán ambos movimientos)`, () => {
                savingsDrawers.forEach(d => {
                    d.movements = d.movements.filter(m => {
                        if (m.transferId === tId) {
                            d.balance -= m.amount;
                            return false;
                        }
                        return true;
                    });
                });
                if (window.saveSavings) window.saveSavings(savingsDrawers);
                render();
                showDrawerDetails(drawerId);
            });
            return;
        }

        showCustomConfirm(`¿Estás seguro de que deseas borrar este movimiento? Esta acción no se puede deshacer.`, () => {
            const amount = drawer.movements[index].amount;
            drawer.movements.splice(index, 1);
            drawer.balance -= amount;
            if (window.saveSavings) window.saveSavings(savingsDrawers);
            render();
            showDrawerDetails(drawerId);
        });
    }

    function toggleSavingsModal(show) {
        const modal = document.getElementById('savingsInputModal');
        if (modal) {
            modal.classList.toggle('hidden', !show);
            modal.style.display = show ? 'flex' : 'none';
        }
    }

    function showDrawerDetails(drawerId) {
        // Remove existing detail overlay if any
        const existingOverlay = document.getElementById('drawerDetailsOverlay');
        if (existingOverlay) existingOverlay.remove();

        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer) return;

        const currentFiscal = getFiscalMonth(new Date());

        // Filter movements based on drawerDetailFilterMode
        // We map to maintain the original index for editing/deleting
        const filteredMovementsWithIndex = (drawer.movements || []).map((m, idx) => ({ ...m, originalIndex: idx }));

        const displayedMovements = (!drawer.isAuto && drawerDetailFilterMode === 'month')
            ? filteredMovementsWithIndex.filter(m => getFiscalMonth(m.date) === currentFiscal)
            : filteredMovementsWithIndex;

        let movementsHtml = drawer.isAuto
            ? '<p style="opacity:0.7">Esta cuenta se sincroniza automáticamente con el valor de tu cartera de acciones.</p>'
            : displayedMovements.map((m) => `
                <div style="display:flex; justify-content:space-between; align-items:center; padding:0.8rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                    <div style="flex-grow:1;">
                        <div style="display: flex; align-items: center; gap: 8px;">
                            <div style="font-weight:600;">${m.description}</div>
                            ${m.category ? `<span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px; opacity: 0.7;">${m.category}</span>` : ''}
                        </div>
                        <div style="font-size:0.75rem; opacity:0.6;">${m.date}</div>
                    </div>
                    <div style="display:flex; align-items:center; gap:1rem;">
                        <div style="font-weight:700; color:${m.amount >= 0 ? 'var(--success)' : 'var(--danger)'};">
                            ${m.amount >= 0 ? '+' : ''}${fmtEUR(m.amount)}
                        </div>
                        <div style="display:flex; gap:0.5rem;">
                            <button class="edit-mvmt-entry-btn" data-index="${m.originalIndex}" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1rem; opacity:0.5; padding:0.2rem;" title="Editar Movimiento">✏️</button>
                            <button class="delete-mvmt-entry-btn" data-index="${m.originalIndex}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1rem; opacity:0.7; padding:0.2rem;" title="Borrar Movimiento">🗑️</button>
                        </div>
                    </div>
                </div>
            `).join('') || `<p style="opacity:0.5; padding:2rem; text-align:center;">${drawerDetailFilterMode === 'month' ? 'No hay movimientos en este mes fiscal.' : 'No hay movimientos aún.'}</p>`;

        const overlay = document.createElement('div');
        overlay.id = 'drawerDetailsOverlay';

        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.8); z-index: 10000;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(8px);
        `;
        overlay.innerHTML = `
            <div style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem; width: min(500px, 95vw); max-height: 85vh; overflow-y: auto;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                    <div>
                        <h2 style="margin:0">${drawer.icon} ${drawer.name}</h2>
                        <div style="font-size:1.5rem; font-weight:700; margin-top:0.5rem;">${fmtEUR(drawer.balance)}</div>
                    </div>
                    <div style="display:flex; gap:0.8rem; align-items:center;">
                        ${!drawer.isAuto ? `
                            <button id="editDrawerFromDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.2rem;" title="Editar Cuenta">✏️</button>
                            <button id="deleteDrawerFromDetails" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.2rem;" title="Borrar Cuenta">🗑️</button>
                        ` : ''}
                        <button id="closeDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.5rem;" title="Cerrar">✕</button>
                    </div>
                </div>
                <div style="margin-top:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--primary); padding-bottom: 3px; margin-bottom: 1rem;">
                        <h3 style="margin:0">Historial</h3>
                        <div style="display:flex; gap:0.5rem; align-items:center;">
                            ${!drawer.isAuto && (drawer.movements || []).length > 0 ? `
                                <button id="filterDrawerMvmtsBtn" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" title="${drawerDetailFilterMode === 'all' ? 'Ver Mes Fiscal Actual' : 'Ver Todo'}">
                                    ${drawerDetailFilterMode === 'all' ? '📅' : '♾️'}
                                </button>
                            ` : ''}
                            ${!drawer.isAuto && (drawer.movements || []).length > 1 ? `<button id="consolidateBtn" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;" title="Consolidar">📦</button>` : ''}
                        </div>
                    </div>
                    <div>${movementsHtml}</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('closeDetails').onclick = () => overlay.remove();

        const filterBtn = document.getElementById('filterDrawerMvmtsBtn');
        if (filterBtn) {
            filterBtn.onclick = () => {
                drawerDetailFilterMode = (drawerDetailFilterMode === 'all') ? 'month' : 'all';
                localStorage.setItem('drawerDetailFilterMode', drawerDetailFilterMode);
                showDrawerDetails(drawer.id); // Re-render to apply filter
            };
        }

        const editBtn = document.getElementById('editDrawerFromDetails');
        if (editBtn) {
            editBtn.onclick = () => {
                overlay.remove();
                showEditDrawerModal(drawer.id);
            };
        }
        const delBtn = document.getElementById('deleteDrawerFromDetails');
        if (delBtn) {
            delBtn.onclick = () => {
                overlay.remove();
                deleteSavingsDrawer(drawer.id);
            };
        }
        const consolidateBtn = document.getElementById('consolidateBtn');
        if (consolidateBtn) {
            consolidateBtn.onclick = () => {
                consolidateDrawerHistory(drawer.id);
                showDrawerDetails(drawer.id); // Refresh to see consolidated state
            };
        }
        overlay.querySelectorAll('.edit-mvmt-entry-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                overlay.remove();
                showEditMovementModal(drawer.id, index);
            };
        });
        overlay.querySelectorAll('.delete-mvmt-entry-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                overlay.remove();
                deleteSavingsMovement(drawer.id, index);
            };
        });
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
    }

    function showSavingsCalendar(drawerId) {
        calendarDrawerId = drawerId;
        calendarViewDate = new Date(); // Start with current month
        renderCalendar();
        if (elements.savingsCalendarModal) {
            elements.savingsCalendarModal.classList.remove('hidden');
            elements.savingsCalendarModal.style.display = 'flex';
        }
    }

    function renderCalendar() {
        if (!elements.calendarGrid || !calendarDrawerId) return;
        const drawer = savingsDrawers.find(d => d.id === calendarDrawerId);
        if (!drawer) return;

        const year = calendarViewDate.getFullYear();
        const month = calendarViewDate.getMonth();

        // Update title
        if (elements.calendarModalTitle) {
            elements.calendarModalTitle.textContent = `${drawer.icon} ${drawer.name}`;
        }
        if (elements.calendarCurrentMonth) {
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            elements.calendarCurrentMonth.textContent = `${monthNames[month]} ${year}`;
        }

        // Clear previous grid (except headers)
        const heads = elements.calendarGrid.querySelectorAll('.calendar-day-head');
        elements.calendarGrid.innerHTML = '';
        heads.forEach(h => elements.calendarGrid.appendChild(h));

        // Get first day of month (1 = Mon, ... 0 = Sun in my grid logic)
        // JS getDay() is 0=Sun, 1=Mon...
        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Adjust to Mon-start

        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Previous month days
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;
            elements.calendarGrid.appendChild(cell);
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            let mvmts = [];
            if (calendarDrawerId === 'bolsa') {
                const fx = window.FX_RATE || 1;
                mvmts = stocks.filter(s => s.date === dateStr).map(s => ({
                    date: s.date,
                    concept: `${(s.qty || 0) < 0 ? 'Venta' : 'Compra'} ${s.ticker}`,
                    category: `Bolsa: ${s.market || 'Acción'}`,
                    amount: (s.qty || 0) * (s.price || 0) * (s.currency === 'USD' ? fx : 1)
                }));
            } else {
                mvmts = (drawer.movements || []).filter(m => m.date === dateStr);
            }
            const totalOnDay = mvmts.reduce((sum, m) => sum + m.amount, 0);

            const cell = document.createElement('div');
            cell.className = `calendar-cell ${isToday ? 'today' : ''}`;

            let amountHtml = '';
            if (mvmts.length > 0) {
                const colorClass = totalOnDay > 0 ? 'income' : totalOnDay < 0 ? 'expense' : '';
                amountHtml = `<div class="calendar-cell-amount ${colorClass}">${fmtEUR(totalOnDay)}</div>`;
                if (mvmts.length > 1) {
                    amountHtml += `<div style="font-size:0.55rem; opacity:0.5; text-align:center;">${mvmts.length} ops</div>`;
                }
                cell.style.cursor = 'pointer';
                cell.onclick = () => showCalendarDayDetails(calendarDrawerId, dateStr);
            }

            cell.innerHTML = `
                <span class="calendar-cell-date">${d}</span>
                ${amountHtml}
            `;
            elements.calendarGrid.appendChild(cell);
        }

        // Next month days (fill until 42 cells or end of row)
        const totalCells = elements.calendarGrid.querySelectorAll('.calendar-cell').length;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let d = 1; d <= remaining; d++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;
            elements.calendarGrid.appendChild(cell);
        }
    }

    function showCalendarDayDetails(drawerId, dateStr) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer) return;

        let dayMovements = [];
        if (drawerId === 'bolsa') {
            const fx = window.FX_RATE || 1;
            dayMovements = stocks.filter(s => s.date === dateStr).map(s => ({
                date: s.date,
                description: `${(s.qty || 0) < 0 ? 'Venta' : 'Compra'} ${s.ticker}`,
                category: `Bolsa: ${s.market || 'Acción'}`,
                amount: (s.qty || 0) * (s.price || 0) * (s.currency === 'USD' ? fx : 1)
            }));
        } else {
            dayMovements = (drawer.movements || [])
                .map((m, idx) => ({ ...m, originalIndex: idx }))
                .filter(m => m.date === dateStr);
        }

        if (dayMovements.length === 0) return;

        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const movementsHtml = dayMovements.map(m => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:1.2rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="flex-grow:1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="font-weight:600;">${m.description}</div>
                        ${m.category ? `<span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px; opacity: 0.7;">${m.category}</span>` : ''}
                    </div>
                    <div style="display:flex; gap:1.2rem; margin-top:0.5rem; opacity:0.6;">
                        <button class="edit-day-mvmt-btn" data-index="${m.originalIndex}" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; gap:4px;" title="Editar">✏️ <small>Editar</small></button>
                        <button class="copy-day-mvmt-btn" data-index="${m.originalIndex}" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; gap:4px;" title="Copiar">📋 <small>Copiar</small></button>
                        <button class="delete-day-mvmt-btn" data-index="${m.originalIndex}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; gap:4px;" title="Borrar">🗑️ <small>Borrar</small></button>
                    </div>
                </div>
                <div style="font-weight:700; color:${m.amount >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size:1.1rem;">
                    ${m.amount >= 0 ? '+' : ''}${fmtEUR(m.amount)}
                </div>
            </div>
        `).join('');

        const overlay = document.createElement('div');
        overlay.id = 'dayDetailsOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10001;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
            padding: 1rem;
        `;
        overlay.innerHTML = `
            <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem; width: min(450px, 95vw); max-height: 80vh; overflow-y: auto;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
                    <div>
                        <h3 style="margin:0; opacity:0.6; font-size:0.8rem; text-transform:uppercase;">${drawer.icon} ${drawer.name}</h3>
                        <h2 style="margin:0.2rem 0 0 0; text-transform:capitalize; font-size:1.1rem;">${formattedDate}</h2>
                    </div>
                    <button id="closeDayDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.5rem;" title="Cerrar">✕</button>
                </div>
                <div>${movementsHtml}</div>
                <button id="backToCalendar" class="btn-secondary" style="width:100%; margin-top:1.5rem; padding:0.8rem; border-radius:12px; font-weight:600;">Volver al Calendario</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('closeDayDetails').onclick = close;
        document.getElementById('backToCalendar').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        // Action Buttons Listeners
        overlay.querySelectorAll('.edit-day-mvmt-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                close(); // Close details
                if (elements.savingsCalendarModal) elements.savingsCalendarModal.classList.add('hidden'); // Close calendar
                showEditMovementModal(drawer.id, index);
            };
        });
        overlay.querySelectorAll('.copy-day-mvmt-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                close();
                if (elements.savingsCalendarModal) elements.savingsCalendarModal.classList.add('hidden');
                copySavingsMovement(drawer.id, index);
            };
        });
        overlay.querySelectorAll('.delete-day-mvmt-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                deleteSavingsMovement(drawer.id, index);
                close();
                renderCalendar();
                // Re-open only if there are movements left
                const remaining = (drawer.movements || []).filter(mv => mv.date === dateStr);
                if (remaining.length > 0) {
                    showCalendarDayDetails(drawerId, dateStr);
                }
            };
        });
    }

    function updateGlobalAhorroCalendarDrawerFilterOptions() {
        if (!elements.ahorroGlobalCalendarDrawerFilter) return;
        const currentValue = globalAhorroCalendarDrawerFilter;
        let html = '<option value="all">📁 Todos</option>';
        savingsDrawers.forEach(drawer => {
            html += `<option value="${drawer.id}">${drawer.icon || '📁'} ${drawer.name}</option>`;
        });
        elements.ahorroGlobalCalendarDrawerFilter.innerHTML = html;
        elements.ahorroGlobalCalendarDrawerFilter.value = currentValue;
        if (elements.ahorroGlobalCalendarDrawerFilter.value !== currentValue) {
            globalAhorroCalendarDrawerFilter = 'all';
            elements.ahorroGlobalCalendarDrawerFilter.value = 'all';
            localStorage.setItem('globalAhorroCalendarDrawerFilter', 'all');
        }
    }

    function renderGlobalAhorroCalendar() {
        const grid = elements.ahorroGlobalCalendarGrid;
        if (!grid) return;

        updateGlobalAhorroCalendarDrawerFilterOptions();

        // Update Total Balance display
        if (elements.ahorroGlobalCalendarTotalBalance) {
            let totalBalance = 0;
            if (globalAhorroCalendarDrawerFilter === 'all') {
                totalBalance = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
            } else {
                const drawer = savingsDrawers.find(d => d.id === globalAhorroCalendarDrawerFilter);
                if (drawer) totalBalance = drawer.balance;
            }
            elements.ahorroGlobalCalendarTotalBalance.textContent = `Total: ${fmtEUR(totalBalance)}`;
        }

        const year = globalAhorroCalendarViewDate.getFullYear();
        const month = globalAhorroCalendarViewDate.getMonth();

        // Update labels
        if (elements.ahorroGlobalCalendarMonthLabel) {
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            elements.ahorroGlobalCalendarMonthLabel.textContent = monthNames[month];
        }
        if (elements.ahorroGlobalCalendarYearLabel) {
            elements.ahorroGlobalCalendarYearLabel.textContent = year;
        }

        // Update toggle button icon/text for "Next view" (Cards)
        updateAhorroToggleIcons();

        // Clear grid (keep day headers)
        const heads = grid.querySelectorAll('.calendar-day-head');
        grid.innerHTML = '';
        heads.forEach(h => grid.appendChild(h));

        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1; // Adjust to Mon-start
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Previous month days
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.style.height = 'auto'; cell.style.aspectRatio = 'unset'; cell.style.minHeight = '100px';
            cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;
            grid.appendChild(cell);
        }

        // Aggregated movements
        const fx = window.FX_RATE || 1;
        let allMovements = [];
        savingsDrawers.forEach(d => {
            let mvmts = [...(d.movements || [])];
            if (d.id === 'bolsa' && typeof stocks !== 'undefined') {
                const stockMvmts = stocks.map(s => ({
                    date: s.date,
                    amount: (s.qty || 0) * (s.price || 0) * (s.currency === 'USD' ? fx : 1),
                    description: `${(s.qty || 0) < 0 ? 'Venta' : 'Compra'} ${s.ticker}`,
                    category: `Bolsa: ${s.market || 'Acción'}`
                }));
                mvmts = [...mvmts, ...stockMvmts];
            }
            allMovements.push(...mvmts.map(m => ({ ...m, drawerName: d.name, drawerIcon: d.icon, drawerId: d.id })));
        });

        if (globalAhorroCalendarDrawerFilter !== 'all') {
            allMovements = allMovements.filter(m => m.drawerId === globalAhorroCalendarDrawerFilter);
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            const mvmts = allMovements.filter(m => m.date === dateStr);
            const totalOnDay = mvmts.reduce((sum, m) => sum + m.amount, 0);

            const isDesktop = window.innerWidth > 1024;
            const cell = document.createElement('div');
            cell.className = `calendar-cell ${isToday ? 'today' : ''}`;
            cell.style.height = 'auto';
            cell.style.aspectRatio = 'unset';
            cell.style.minHeight = isDesktop ? '140px' : '100px';

            let amountHtml = '';
            if (mvmts.length > 0) {
                const colorClass = totalOnDay > 0 ? 'income' : totalOnDay < 0 ? 'expense' : '';
                amountHtml = `<div class="calendar-cell-amount ${colorClass}" style="margin-top:2px;">${fmtEUR(totalOnDay)}</div>`;

                // Concepts (max 3 on mobile, 6 on desktop)
                const conceptLimit = isDesktop ? 6 : 3;
                const concepts = mvmts.slice(0, conceptLimit).map(m => {
                    const desc = m.description.length > 12 ? m.description.substring(0, 12).trim() + '...' : m.description;
                    return `
                    <div class="calendar-cell-concepts" style="font-size:0.55rem; opacity:0.6; line-height:1.1; display:flex; align-items:center; gap:3px; overflow:hidden;">
                        <span style="flex-shrink:0;">${m.drawerIcon}</span>
                        <span style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis; flex-grow:1; min-width:0;">${desc}</span>
                    </div>
                `;
                }).join('');

                amountHtml += `
                    <div style="margin-top:4px; display:flex; flex-direction:column; gap:1px; flex-grow:1; overflow:hidden; width:100%; min-width:0;">
                        ${concepts}
                        ${mvmts.length > conceptLimit ? `<div style="font-size:0.5rem; opacity:0.4; font-style:italic;">+ ${mvmts.length - conceptLimit} más</div>` : ''}
                    </div>
                `;

                // Operation count badge
                amountHtml += `<div style="font-size:0.55rem; opacity:0.5; text-align:right; margin-top:3px; font-weight:600;">${mvmts.length} ops</div>`;

                cell.style.cursor = 'pointer';
                cell.onclick = () => showGlobalCalendarDayDetails(dateStr);
            }

            cell.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <span class="calendar-cell-date">${d}</span>
                </div>
                ${amountHtml}
            `;
            grid.appendChild(cell);
        }

        // Fill remaining cells
        const totalCells = grid.querySelectorAll('.calendar-cell').length;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let d = 1; d <= remaining; d++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.style.height = 'auto'; cell.style.aspectRatio = 'unset'; cell.style.minHeight = '100px';
            cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;
            grid.appendChild(cell);
        }
    }

    function showGlobalCalendarDayDetails(dateStr) {
        const year = globalAhorroCalendarViewDate.getFullYear();
        const month = globalAhorroCalendarViewDate.getMonth();

        const fx = window.FX_RATE || 1;
        let allMovements = [];
        savingsDrawers.forEach(d => {
            let mvmts = [...(d.movements || [])];
            if (d.id === 'bolsa' && typeof stocks !== 'undefined') {
                const stockMvmts = stocks.map((s, sIdx) => ({
                    date: s.date,
                    amount: (s.qty || 0) * (s.price || 0) * (s.currency === 'USD' ? fx : 1),
                    description: `${(s.qty || 0) < 0 ? 'Venta' : 'Compra'} ${s.ticker}`,
                    category: `Bolsa: ${s.market || 'Acción'}`,
                    isStock: true,
                    stockIndex: sIdx
                }));
                mvmts = [...mvmts, ...stockMvmts];
            }
            allMovements.push(...mvmts.map((m, idx) => ({
                ...m,
                drawerName: d.name,
                drawerIcon: d.icon,
                drawerId: d.id,
                originalIndex: idx
            })));
        });

        const filteredMovements = allMovements.filter(m => {
            if (globalAhorroCalendarDrawerFilter === 'all') return true;
            return m.drawerId === globalAhorroCalendarDrawerFilter;
        });

        const dayMovements = filteredMovements.filter(m => m.date === dateStr);
        if (dayMovements.length === 0) return;

        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const movementsHtml = dayMovements.map(m => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:1.2rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="flex-grow:1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-size: 1.2rem;">${m.drawerIcon}</span>
                        <div style="font-weight:600;">${m.description}</div>
                        ${m.category ? `<span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px; opacity: 0.7;">${m.drawerName} • ${m.category}</span>` : ''}
                    </div>
                    <div style="display:flex; gap:1.2rem; margin-top:0.5rem; opacity:0.6;">
                        ${m.isStock ? '<small style="opacity:0.5; font-style:italic;">(Inversión en Bolsa)</small>' : `
                            <button class="edit-day-mvmt-btn" data-drawer="${m.drawerId}" data-index="${m.originalIndex}" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; gap:4px;" title="Editar">✏️ <small>Editar</small></button>
                            <button class="copy-day-mvmt-btn" data-drawer="${m.drawerId}" data-index="${m.originalIndex}" style="background:none; border:none; color:inherit; cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; gap:4px;" title="Copiar">📋 <small>Copiar</small></button>
                            <button class="delete-day-mvmt-btn" data-drawer="${m.drawerId}" data-index="${m.originalIndex}" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:0.9rem; padding:0; display:flex; align-items:center; gap:4px;" title="Borrar">🗑️ <small>Borrar</small></button>
                        `}
                    </div>
                </div>
                <div style="font-weight:700; color:${m.amount >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size:1.1rem;">
                    ${m.amount >= 0 ? '+' : ''}${fmtEUR(m.amount)}
                </div>
            </div>
        `).join('');

        const overlay = document.createElement('div');
        overlay.id = 'dayDetailsOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10001;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
            padding: 1rem;
        `;
        overlay.innerHTML = `
            <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem; width: min(450px, 95vw); max-height: 80vh; overflow-y: auto;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
                    <div>
                        <h3 style="margin:0; opacity:0.6; font-size:0.8rem; text-transform:uppercase;">Movimientos de Ahorro</h3>
                        <h2 style="margin:0.2rem 0 0 0; text-transform:capitalize; font-size:1.1rem;">${formattedDate}</h2>
                    </div>
                    <button id="closeDayDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.5rem;" title="Cerrar">✕</button>
                </div>
                <div>${movementsHtml}</div>
                <button id="backToCalendar" class="btn-secondary" style="width:100%; margin-top:1.5rem; padding:0.8rem; border-radius:12px; font-weight:600;">Volver al Calendario</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('closeDayDetails').onclick = close;
        document.getElementById('backToCalendar').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };

        // Action Buttons Listeners
        overlay.querySelectorAll('.edit-day-mvmt-btn').forEach(btn => {
            btn.onclick = () => {
                const drawerId = btn.dataset.drawer;
                const index = parseInt(btn.dataset.index);
                close();
                showEditMovementModal(drawerId, index);
            };
        });
        overlay.querySelectorAll('.copy-day-mvmt-btn').forEach(btn => {
            btn.onclick = () => {
                const drawerId = btn.dataset.drawer;
                const index = parseInt(btn.dataset.index);
                close();
                copySavingsMovement(drawerId, index);
            };
        });
        overlay.querySelectorAll('.delete-day-mvmt-btn').forEach(btn => {
            btn.onclick = () => {
                const drawerId = btn.dataset.drawer;
                const index = parseInt(btn.dataset.index);
                deleteSavingsMovement(drawerId, index);
                close();
                renderGlobalAhorroCalendar();
            };
        });
    }

    function showBolsaCalendar() {
        bolsaCalendarViewDate = new Date();
        renderBolsaCalendar();
        if (elements.bolsaCalendarModal) {
            elements.bolsaCalendarModal.classList.remove('hidden');
            elements.bolsaCalendarModal.style.display = 'flex';
        }
    }

    function renderBolsaCalendar() {
        const grid = elements.bolsaCalendarGrid;
        if (!grid) return;

        const year = bolsaCalendarViewDate.getFullYear();
        const month = bolsaCalendarViewDate.getMonth();

        // Update month label
        if (elements.bolsaCalendarCurrentMonth) {
            const monthNames = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            elements.bolsaCalendarCurrentMonth.textContent = `${monthNames[month]} ${year}`;
        }

        // Clear grid (keep day headers)
        const heads = grid.querySelectorAll('.calendar-day-head');
        grid.innerHTML = '';
        heads.forEach(h => grid.appendChild(h));

        const firstDay = new Date(year, month, 1).getDay();
        const startOffset = firstDay === 0 ? 6 : firstDay - 1;
        const daysInMonth = new Date(year, month + 1, 0).getDate();
        const daysInPrevMonth = new Date(year, month, 0).getDate();

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Previous month days
        for (let i = startOffset - 1; i >= 0; i--) {
            const d = daysInPrevMonth - i;
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;
            grid.appendChild(cell);
        }

        // Current month days
        for (let d = 1; d <= daysInMonth; d++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isToday = dateStr === todayStr;

            // Filter stocks by this date
            const dayStocks = stocks.filter(s => s.date === dateStr);
            const totalOnDay = dayStocks.reduce((sum, s) => sum + -((s.qty || 0) * (s.price || 0)), 0);

            const cell = document.createElement('div');
            cell.className = `calendar-cell ${isToday ? 'today' : ''}`;

            let amountHtml = '';
            if (dayStocks.length > 0) {
                const colorClass = totalOnDay > 0 ? 'income' : 'expense';
                amountHtml = `<div class="calendar-cell-amount ${colorClass}">${fmtEUR(totalOnDay)}</div>`;
                if (dayStocks.length > 1) {
                    amountHtml += `<div style="font-size:0.55rem; opacity:0.5; text-align:center;">${dayStocks.length} ops</div>`;
                }
                cell.style.cursor = 'pointer';
                cell.onclick = () => showBolsaCalendarDayDetails(dateStr);
            }

            cell.innerHTML = `
                <span class="calendar-cell-date">${d}</span>
                ${amountHtml}
            `;
            grid.appendChild(cell);
        }

        // Fill remaining cells to complete the row
        const totalCells = grid.querySelectorAll('.calendar-cell').length;
        const remaining = (7 - (totalCells % 7)) % 7;
        for (let d = 1; d <= remaining; d++) {
            const cell = document.createElement('div');
            cell.className = 'calendar-cell other-month';
            cell.innerHTML = `<span class="calendar-cell-date">${d}</span>`;
            grid.appendChild(cell);
        }
    }

    function showBolsaCalendarDayDetails(dateStr) {
        const dayStocks = stocks.filter(s => s.date === dateStr);
        if (dayStocks.length === 0) return;

        const dateObj = new Date(dateStr);
        const formattedDate = dateObj.toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

        const movementsHtml = dayStocks.map(s => {
            const invested = (s.qty || 0) * (s.price || 0);
            const isBuy = s.qty >= 0;
            return `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem 0; border-bottom:1px solid rgba(255,255,255,0.05);">
                <div style="flex-grow:1;">
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <div style="font-weight:700; font-size:1rem;">${isBuy ? '🟢' : '🔴'} ${s.ticker}</div>
                        <span style="font-size: 0.7rem; padding: 2px 6px; background: rgba(255,255,255,0.05); border-radius: 4px; opacity: 0.7;">${s.market || 'Mercado'}</span>
                    </div>
                    <div style="font-size:0.78rem; opacity:0.6; margin-top:4px;">
                        ${isBuy ? 'Compra' : 'Venta'} · ${fmtNum(Math.abs(s.qty), 6)} uds · ${fmtEUR(s.price)}/ud
                    </div>
                </div>
                <div style="font-weight:700; color:${isBuy ? 'var(--danger)' : 'var(--success)'}; font-size:1.05rem; text-align:right; min-width: 80px;">
                    ${isBuy ? '-' : '+'}${fmtEUR(invested)}
                </div>
            </div>
        `;
        }).join('');

        const totalInvested = dayStocks.reduce((sum, s) => sum + -((s.qty || 0) * (s.price || 0)), 0);

        const overlay = document.createElement('div');
        overlay.id = 'bolsaDayDetailsOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 10001;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
            padding: 1rem;
        `;
        overlay.innerHTML = `
            <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 20px; padding: 2rem; width: min(450px, 95vw); max-height: 80vh; overflow-y: auto;">
                <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:1.5rem;">
                    <div>
                        <h3 style="margin:0; opacity:0.6; font-size:0.8rem; text-transform:uppercase;">📈 Operaciones de Bolsa</h3>
                        <h2 style="margin:0.2rem 0 0 0; text-transform:capitalize; font-size:1.1rem;">${formattedDate}</h2>
                    </div>
                    <button id="closeBolsaDayDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.5rem;" title="Cerrar">✕</button>
                </div>
                <div>${movementsHtml}</div>
                <div style="display:flex; justify-content:space-between; align-items:center; padding:1rem 0 0.5rem; border-top:2px solid rgba(255,255,255,0.1); margin-top:0.5rem;">
                    <span style="font-size:0.75rem; text-transform:uppercase; letter-spacing:1px; color:var(--text-muted);">Total del día</span>
                    <span style="font-weight:700; font-size:1.15rem;" class="${totalInvested >= 0 ? 'profit' : 'loss'}">${fmtEUR(totalInvested)}</span>
                </div>
                <button id="backToBolsaCalendar" class="btn-secondary" style="width:100%; margin-top:1rem; padding:0.8rem; border-radius:12px; font-weight:600;">Volver al Calendario</button>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        document.getElementById('closeBolsaDayDetails').onclick = close;
        document.getElementById('backToBolsaCalendar').onclick = close;
        overlay.onclick = (e) => { if (e.target === overlay) close(); };
    }

    function showCustomConfirm(message, onConfirm, onCancel = null) {
        // Remove existing overlay if any (failsafe)
        const oldOverlay = document.getElementById('customConfirmOverlay');
        if (oldOverlay) oldOverlay.remove();

        const overlay = document.createElement('div');
        overlay.id = 'customConfirmOverlay';
        overlay.style.cssText = `
            position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 20000;
            display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
            padding: 1rem;
        `;
        overlay.innerHTML = `
            <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 24px; padding: 2.5rem 2rem; width: min(400px, 90vw); text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                <div style="font-size: 3.5rem; margin-bottom: 1.5rem; filter: drop-shadow(0 0 10px rgba(245, 158, 11, 0.4));">⚠️</div>
                <h3 style="margin-bottom: 2rem; line-height: 1.5; font-weight: 700; color: white; white-space: normal;">${message.replace(/\n/g, '<br>')}</h3>
                <div style="display: flex; gap: 1rem; justify-content: center;">
                    <button id="confirmCancel" class="btn-secondary" style="flex: 1; padding: 0.9rem; border-radius: 14px; font-weight: 600; font-size: 0.95rem; cursor: pointer; transition: all 0.2s;">Cancelar</button>
                    <button id="confirmYes" class="btn-primary" style="flex: 1; padding: 0.9rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; background: var(--danger); border: none; transition: all 0.2s; box-shadow: 0 4px 12px rgba(220, 38, 38, 0.3);">Confirmar</button>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);

        const close = () => {
            overlay.style.opacity = '0';
            overlay.style.transition = 'opacity 0.2s';
            setTimeout(() => overlay.remove(), 200);
        };

        const yesBtn = document.getElementById('confirmYes');
        const cancelBtn = document.getElementById('confirmCancel');

        yesBtn.onclick = () => {
            close();
            if (onConfirm) onConfirm();
        };

        cancelBtn.onclick = () => {
            close();
            if (onCancel) onCancel();
        };

        overlay.onclick = (e) => {
            if (e.target === overlay) {
                close();
                if (onCancel) onCancel();
            }
        };

        // Add hover effects for buttons
        yesBtn.onmouseenter = () => { yesBtn.style.transform = 'translateY(-2px) scale(1.02)'; yesBtn.style.filter = 'brightness(1.1)'; };
        yesBtn.onmouseleave = () => { yesBtn.style.transform = 'translateY(0) scale(1)'; yesBtn.style.filter = 'brightness(1)'; };
        cancelBtn.onmouseenter = () => { cancelBtn.style.transform = 'translateY(-2px) scale(1.02)'; cancelBtn.style.background = 'rgba(255,255,255,0.08)'; };
        cancelBtn.onmouseleave = () => { cancelBtn.style.transform = 'translateY(0) scale(1)'; cancelBtn.style.background = 'transparent'; };
    }
    window.showCustomConfirm = showCustomConfirm;

    async function showCustomPrompt(title, placeholder = "") {
        return new Promise((resolve) => {
            const oldOverlay = document.getElementById('customPromptOverlay');
            if (oldOverlay) oldOverlay.remove();

            const overlay = document.createElement('div');
            overlay.id = 'customPromptOverlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 22000;
                display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
                padding: 1rem;
            `;
            overlay.innerHTML = `
                <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 24px; padding: 2.5rem 2rem; width: min(400px, 90vw); text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                    <div style="font-size: 2.5rem; margin-bottom: 1rem;">✍️</div>
                    <h3 style="margin-bottom: 1.5rem; line-height: 1.5; font-weight: 700; color: white;">${title}</h3>
                    <input type="text" id="customPromptInput" placeholder="${placeholder}" 
                        style="width: 100%; padding: 1rem; border-radius: 14px; background: rgba(255,255,255,0.05); border: 1px solid var(--border-color); color: white; margin-bottom: 2rem; outline: none; transition: border 0.3s;"
                    >
                    <div style="display: flex; gap: 1rem; justify-content: center;">
                        <button id="promptCancel" class="btn-secondary" style="flex: 1; padding: 0.9rem; border-radius: 14px; font-weight: 600; font-size: 0.95rem; cursor: pointer;">Cancelar</button>
                        <button id="promptOk" class="btn-primary" style="flex: 1; padding: 0.9rem; border-radius: 14px; font-weight: 700; font-size: 0.95rem; cursor: pointer; background: var(--primary);">Aceptar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const input = document.getElementById('customPromptInput');
            const okBtn = document.getElementById('promptOk');
            const cancelBtn = document.getElementById('promptCancel');

            setTimeout(() => input.focus(), 50);

            const close = (val) => {
                overlay.style.opacity = '0';
                overlay.style.transition = 'opacity 0.2s';
                setTimeout(() => {
                    overlay.remove();
                    resolve(val);
                }, 200);
            };

            okBtn.onclick = () => close(input.value);
            cancelBtn.onclick = () => close(null);
            input.onkeydown = (e) => {
                if (e.key === 'Enter') close(input.value);
                if (e.key === 'Escape') close(null);
            };
            overlay.onclick = (e) => {
                if (e.target === overlay) close(null);
            };
        });
    }
    window.showCustomPrompt = showCustomPrompt;

    function cycleDrawerColor(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer) return;

        drawer.colorIndex = ((drawer.colorIndex || 0) + 1) % DRAWER_COLORS.length;
        if (window.saveSavings) window.saveSavings(savingsDrawers);
        renderSavings();
    }

    function cycleNominaDrawerColor(drawerId) {
        const drawer = nominaData.find(d => d.id == drawerId);
        if (!drawer) return;

        drawer.colorIndex = ((drawer.colorIndex || 0) + 1) % DRAWER_COLORS.length;
        if (window.saveNomina) window.saveNomina(nominaData);
        renderNomina();
    }

    function showEditMovementModal(drawerId, mvmtIndex) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || !drawer.movements[mvmtIndex]) return;

        const movement = drawer.movements[mvmtIndex];
        const modal = document.getElementById('savingsInputModal');
        const form = document.getElementById('savingsInputForm');
        const typeInput = document.getElementById('savingsActionType');
        const targetIdInput = document.getElementById('savingsTargetId');
        const indexInput = document.getElementById('savingsMovementIndex');
        const title = document.getElementById('savingsModalTitle');
        const nameGroup = document.getElementById('drawerNameGroup');
        const amountInput = document.getElementById('movementAmountInput');
        const conceptInput = document.getElementById('movementConceptInput');
        const conceptGroup = document.getElementById('movementConceptGroup');
        const transferTargetGroup = document.getElementById('transferTargetGroup');

        if (!modal || !form || !typeInput) return;

        form.reset();
        typeInput.value = 'edit-movement';
        if (targetIdInput) targetIdInput.value = drawerId;
        if (indexInput) indexInput.value = mvmtIndex;
        if (title) title.textContent = `Editar: ${movement.description}`;

        nameGroup?.classList.add('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');
        if (conceptInput) {
            const isInitial = (movement.description || movement.concept || "").toLowerCase().includes('saldo inicial');
            conceptInput.readOnly = isInitial;
            conceptInput.style.opacity = isInitial ? '0.6' : '1';
            conceptInput.value = movement.concept || movement.description;
        }
        conceptGroup?.classList.remove('hidden');
        transferTargetGroup?.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.add('hidden');
        
        const isMaxTotalCbBtnContainer = document.getElementById('maxTotalCheckboxContainer');
        const isMaxTotalCbInp = document.getElementById('movementIsMaxTotalInput');
        if (isMaxTotalCbBtnContainer && isMaxTotalCbInp) {
            // Unhide UI if drawer is from Nomina Group or Ahorro Group
            if (drawer.group && drawer.group.toLowerCase() === 'nomina') {
                isMaxTotalCbBtnContainer.classList.remove('hidden');
                isMaxTotalCbInp.checked = !!movement.isMaxTotal || (movement.concept && movement.concept.toLowerCase() === 'total');
            } else {
                isMaxTotalCbBtnContainer.classList.add('hidden');
                isMaxTotalCbInp.checked = false;
            }
        }

        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');

        if (elements.drawerInfoGroup && elements.drawerInfoDisplay) {
            elements.drawerInfoGroup.classList.remove('hidden');
            elements.drawerInfoDisplay.textContent = `${drawer.icon || '📁'} ${drawer.name}`;
        }

        if (elements.savingsMovementTypeContainer) {
            elements.savingsMovementTypeContainer.classList.remove('hidden');
            const catParts = (movement.category || '').split(':');
            const mainCat = catParts[0];
            const subCat = catParts[1] || '';

            updateSavingsMovementType(movement.amount >= 0 ? 'income' : 'expense');
            if (elements.savingsCategorySelect) elements.savingsCategorySelect.value = mainCat;
            
            // Dynamic check for periodic status
            if (elements.savingsRecurringInput) {
                const isPeriodic = recurringSavingsMovements.some(t => {
                    const absAmount = Math.abs(movement.amount);
                    if (t.type === 'movement') {
                        return t.drawerId == drawerId && Math.abs(t.amount) == absAmount && t.description == movement.description;
                    } else if (t.type === 'transfer' && movement.transferId) {
                        return (t.fromDrawerId == drawerId || t.toDrawerId == drawerId) && Math.abs(t.amount) == absAmount;
                    }
                    return false;
                });
                elements.savingsRecurringInput.checked = isPeriodic;
                movement.isPeriodic = isPeriodic; // Keep state in sync
            }

            if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = subCat;

            if (elements.savingsCategoryGroup) {
                elements.savingsCategoryGroup.classList.remove('hidden');
            }
            if (elements.savingsSubcategoryGroup) {
                elements.savingsSubcategoryGroup.classList.remove('hidden');
            }
        }

        if (amountInput) amountInput.value = movement.amount; // Use actual sign
        if (conceptInput) conceptInput.value = movement.description;
        if (elements.savingsDateInput && movement.date) {
            elements.savingsDateInput.value = movement.date;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    /**
     * Calculates and renders the aggregate portfolio candle for the previous day.
     */
    function updatePortfolioCandle(dashInvested = 0, dashClose = 0) {
        if (!elements.portfolioCandleGraphic) return;

        // Scale values for display (relative to H/L)
        const range = totalHigh - totalLow || 1;
        const scale = (val) => height - padding - ((val - totalLow) / range) * (height - 2 * padding);

        const yHigh = scale(totalHigh);
        const yLow = scale(totalLow);
        const yOpen = scale(totalOpen);
        const yClose = scale(totalClose);

        const rectY = Math.min(yOpen, yClose);
        const rectHeight = Math.max(Math.abs(yOpen - yClose), 2); // Min 2px for DOJI visibility

        elements.portfolioCandleGraphic.innerHTML = `
            <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                <!-- Wick -->
                <line x1="${width / 2}" y1="${yHigh}" x2="${width / 2}" y2="${yLow}" stroke="${color}" stroke-width="2" />
                <!-- Body -->
                <rect x="${width / 4}" y="${rectY}" width="${width / 2}" height="${rectHeight}" fill="${color}" stroke="${color}" stroke-width="1" />
            </svg>
        `;
    }

    /**
    * Formats a date string from yyyy-mm-dd to dd/mm/aaaa.
    */
    function formatDate(dateStr) {
        if (!dateStr || dateStr === '-') return '-';
        const parts = dateStr.split('-');
        if (parts.length !== 3) return dateStr;
        return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    let chart = null;
    let candlestickSeries = null;

    /**
    * Shows the financial details modal for a given ticker.
    */
    function showFinancialDetails(ticker) {
        if (!ticker) return;
        const tickerUpper = ticker.toUpperCase();

        // 1. Reset UI immediately to avoid "dragging" old data
        elements.financialModalTitle.textContent = 'Cargando...';
        elements.financialModalTicker.textContent = tickerUpper;

        // Clear financial items
        ['finLastDiv', 'finNextDiv', 'finExDiv', 'finPayDiv', 'finYield', 'finPE', 'finPB', 'finPS', 'finEPS'].forEach(id => {
            if (elements[id]) elements[id].textContent = '-';
        });

        // Clear technical items
        clearTechnicalAnalysis();

        // 2. Fetch/Prepare Data
        let mockInfo = window.MOCK_DATA ? window.MOCK_DATA[tickerUpper] : null;
        if (!mockInfo) {
            // Try to find by partial match if not found exactly (e.g. SAN vs SAN.MC)
            const foundKey = window.MOCK_DATA ? Object.keys(window.MOCK_DATA).find(k => k.startsWith(tickerUpper.split('.')[0])) : null;
            if (foundKey) {
                mockInfo = window.MOCK_DATA[foundKey];
            }
        }

        if (elements.financialModalIcon) {
            const icons = { 'Energy': '⚡', 'Technology': '💻', 'Financial': '🏦', 'Consumer': '🛒', 'Health': '🏥', 'Real Estate': '🏢' };
            elements.financialModalIcon.textContent = (mockInfo && mockInfo.sector) ? (icons[mockInfo.sector] || '🏢') : '🏢';
        }

        if (!mockInfo) {
            elements.financialModalTitle.textContent = `No hay datos: ${tickerUpper} `;
            elements.financialDetailsModal.classList.remove('hidden');
            if (chart) chart.remove();
            chart = null;
            elements.chartContainer.innerHTML = '<div style="color:var(--text-muted); padding:2rem; text-align:center;">No se encontraron datos financieros para este activo.</div>';
            return;
        }

        elements.financialModalTitle.textContent = (mockInfo && mockInfo.name) ? mockInfo.name : tickerUpper;
        elements.financialModalTicker.textContent = tickerUpper;

        const fin = (mockInfo && mockInfo.financials) ? mockInfo.financials : {};
        const fx = (mockInfo && mockInfo.currency === 'USD') ? window.FX_RATE : 1;

        // Helper for currency conversion and formatting
        const toEuro = (val) => {
            if (val === undefined || val === null) return '-';
            return fmtEUR(val * fx);
        };

        elements.financialModalTitle.textContent = mockInfo.name || tickerUpper;
        elements.financialModalTicker.textContent = tickerUpper;

        elements.finLastDiv.textContent = toEuro(fin.lastDiv);
        elements.finNextDiv.textContent = toEuro(fin.nextDiv);
        elements.finExDiv.textContent = formatDate(fin.exDiv);
        elements.finPayDiv.textContent = formatDate(fin.payDiv);
        elements.finYield.textContent = fin.yield !== undefined ? fmtNum(fin.yield) + ' %' : '-';
        elements.finPE.textContent = fin.pe !== undefined ? fmtNum(fin.pe, 1) : '-';
        elements.finPB.textContent = fin.pb !== undefined ? fmtNum(fin.pb, 1) : '-';
        elements.finPS.textContent = fin.ps !== undefined ? fmtNum(fin.ps, 1) : '-';
        elements.finEPS.textContent = toEuro(fin.eps);

        // 3. Populate Technical Analysis (Ensure we have data or generate it)
        let dailyData = mockInfo.historical ? (mockInfo.historical['D'] || []) : [];

        if (dailyData.length === 0 && window.generateHistory && mockInfo.price) {
            console.log("Generating history on-the-fly for technical analysis...");
            if (!mockInfo.historical) mockInfo.historical = {};
            mockInfo.historical['D'] = window.generateHistory(mockInfo.price, 60, 'D', tickerUpper);
            dailyData = mockInfo.historical['D'];
        }

        if (dailyData.length > 0) {
            const analysis = calculateTechnicalAnalysis(tickerUpper, dailyData, fx);
            renderTechnicalAnalysis(analysis);
        } else {
            // Explicitly clear or show "Not Available" if no data
            clearTechnicalAnalysis();
        }

        // Show modal
        elements.financialDetailsModal.classList.remove('hidden');

        // Allow layout to finalize before creating chart
        requestAnimationFrame(() => {
            setTimeout(() => {
                initChart(tickerUpper);
            }, 100);
        });
    }

    /**
     * Initializes or updates the chart for a specific ticker and timeframe.
     */
    function initChart(ticker, timeframe = 'D') {
        console.log(`Initializing chart for ${ticker}[${timeframe}]`);

        if (!elements.chartContainer) {
            console.error("Chart container not found in DOM");
            return;
        }

        if (typeof LightweightCharts === 'undefined') {
            console.error("LightweightCharts library is not loaded");
            elements.chartContainer.innerHTML = '<div style="color:var(--danger); padding:1rem;">Error: Charting library not loaded.</div>';
            return;
        }

        const tickerUpper = ticker.toUpperCase();
        const mockInfo = window.MOCK_DATA[tickerUpper];
        const fx = mockInfo && mockInfo.currency === 'USD' ? window.FX_RATE : 1;

        // Robust data fetch with fallback
        let rawData = [];
        if (mockInfo) {
            if (!mockInfo.historical || !mockInfo.historical[timeframe]) {
                console.warn(`Historical data missing for ${tickerUpper}[${timeframe}]. Generating on the fly...`);
                if (window.generateHistory) {
                    if (!mockInfo.historical) mockInfo.historical = {};
                    mockInfo.historical[timeframe] = window.generateHistory(mockInfo.price || 100, 60, timeframe, tickerUpper);
                }
            }
            rawData = mockInfo.historical ? (mockInfo.historical[timeframe] || []) : [];
        }

        // Convert to Euro if necessary
        const historicalData = rawData.map(d => ({
            time: d.time,
            open: d.open * fx,
            high: d.high * fx,
            low: d.low * fx,
            close: d.close * fx
        }));

        console.log(`Historical data points: ${historicalData.length}(Converted to EUR: ${fx !== 1})`);

        // Update tabs
        const tabs = document.querySelectorAll('.time-tab');
        tabs.forEach(tab => {
            tab.classList.toggle('active', tab.dataset.tf === timeframe);
            if (!tab.dataset.listener) {
                tab.dataset.listener = 'true';
                tab.addEventListener('click', (e) => {
                    // CRITICAL: Get the current ticker from the modal, NOT the closure
                    const currentTicker = elements.financialModalTicker.textContent;
                    if (currentTicker) {
                        initChart(currentTicker, e.target.dataset.tf);
                    }
                });
            }
        });

        if (historicalData.length === 0) {
            elements.chartContainer.innerHTML = '<div style="display:flex; align-items:center; justify-content:center; height:100%; color:var(--text-muted);">No historical data available for this ticker.</div>';
            return;
        }

        // Clear and prepare container
        elements.chartContainer.innerHTML = '';

        const containerWidth = elements.chartContainer.clientWidth || elements.financialDetailsModal.querySelector('.modal-content').clientWidth - 80 || 600;
        console.log(`Container width: ${containerWidth} `);

        try {
            if (chart) {
                chart.remove();
            }

            chart = LightweightCharts.createChart(elements.chartContainer, {
                width: containerWidth,
                height: 300,
                layout: {
                    background: { type: 'solid', color: '#1e293b' },
                    textColor: 'rgba(255, 255, 255, 0.7)',
                },
                grid: {
                    vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                    horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
                },
                rightPriceScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                },
                timeScale: {
                    borderColor: 'rgba(255, 255, 255, 0.1)',
                    timeVisible: true,
                },
                localization: {
                    priceFormatter: price => fmtEUR(price),
                }
            });

            candlestickSeries = chart.addCandlestickSeries({
                upColor: '#26a69a',
                downColor: '#ef5350',
                borderVisible: false,
                wickUpColor: '#26a69a',
                wickDownColor: '#ef5350',
            });

            candlestickSeries.setData(historicalData);
            chart.timeScale().fitContent();
            console.log("Chart rendered successfully");
        } catch (err) {
            console.error("Error creating chart:", err);
            elements.chartContainer.innerHTML = `< div style = "color:var(--danger); padding:1rem;" > Error rendering chart: ${err.message}</div > `;
        }

        const resizeHandler = () => {
            if (chart && elements.chartContainer && elements.chartContainer.clientWidth > 0) {
                chart.applyOptions({ width: elements.chartContainer.clientWidth });
            }
        };
        window.removeEventListener('resize', resizeHandler);
        window.addEventListener('resize', resizeHandler);
    }

    /**
     * Calculates technical analysis based on daily historical data.
     */
    function calculateTechnicalAnalysis(ticker, rawData, fx = 1) {
        if (!rawData || rawData.length === 0) {
            return {
                trend: 'Neutral',
                support: 0,
                resistance: 0,
                buyRange: '-',
                stopLoss: 0,
                volatility: 0,
                ma20: 0,
                patterns: []
            };
        }
        // Ensure we have enough data
        const data = rawData.map(d => ({
            close: d.close * fx,
            high: d.high * fx,
            low: d.low * fx,
            open: d.open * fx
        }));

        const count = data.length;
        const lastPrice = data[count - 1].close;

        // Helper for SMA
        const sma = (period) => {
            if (count < period) return null;
            const slice = data.slice(count - period);
            return slice.reduce((sum, d) => sum + d.close, 0) / period;
        };

        const sma20 = sma(20);
        const sma50 = sma(50);
        const sma200 = sma(200);

        // Support / Resistance (simplified local min/max of last 60 days)
        const recentData = data.slice(Math.max(0, count - 60));
        const support = Math.min(...recentData.map(d => d.low));
        const resistance = Math.max(...recentData.map(d => d.high));

        // Volatility (Average True Range approximation)
        const last20 = data.slice(Math.max(0, count - 20));
        const avgVolatility = last20.reduce((sum, d) => sum + (d.high - d.low), 0) / last20.length;

        // Trend Determination
        let trend = 'Neutral';
        let trendClass = 'trend-neutral';
        if (sma20 && sma50 && lastPrice > sma20 && sma20 > sma50) {
            trend = 'Alcista (Bullish)';
            trendClass = 'trend-bullish';
        } else if (sma20 && sma50 && lastPrice < sma20 && sma20 < sma50) {
            trend = 'Bajista (Bearish)';
            trendClass = 'trend-bearish';
        }

        // Candlestick Patterns (Prioritized: Engulfing > Hammer > Inv. Hammer > Doji)
        const patterns = [];
        const last = data[count - 1];
        const prev = data[count - 2];
        const bodySize = Math.abs(last.open - last.close);
        const candleRange = last.high - last.low;
        const bodyLimit = candleRange * 0.3;

        if (prev && last.close > prev.open && last.open < prev.close && last.close > last.open && prev.open > prev.close) {
            patterns.push('Envolvente Alcista');
        } else if (bodySize < bodyLimit && (Math.min(last.open, last.close) - last.low) > bodySize * 2) {
            patterns.push('Martillo (Hammer)');
        } else if (bodySize < bodyLimit && (last.high - Math.max(last.open, last.close)) > bodySize * 2) {
            patterns.push('Martillo Invertido');
        } else if (candleRange > 0 && bodySize < candleRange * 0.1) {
            patterns.push('Doji');
        }

        // Buy Range & Stop
        const buyRangeStart = support;
        const buyRangeEnd = support + (avgVolatility * 0.5);
        const stopLoss = support - (avgVolatility * 0.8);

        return {
            ticker,
            lastPrice,
            trend,
            trendClass,
            support,
            resistance,
            buyRange: `${fmtNum(buyRangeStart)} - ${fmtNum(buyRangeEnd)} (Actual: ${fmtEUR(lastPrice)})`,
            stopLoss,
            volatility: avgVolatility,
            maStatus: {
                sma20: sma20 ? (lastPrice > sma20 ? 'Arriba' : 'Abajo') : 'N/A',
                sma50: sma50 ? (lastPrice > sma50 ? 'Arriba' : 'Abajo') : 'N/A',
                sma200: sma200 ? (lastPrice > sma200 ? 'Arriba' : 'Abajo') : 'N/A'
            },
            patterns
        };
    }

    function renderTechnicalAnalysis(a) {
        elements.techTrend.innerHTML = `<span class="badge-trend ${a.trendClass}">${a.trend}</span>`;
        elements.techSupport.textContent = fmtEUR(a.support);
        elements.techResistance.textContent = fmtEUR(a.resistance);
        elements.techBuyRange.textContent = a.buyRange;
        elements.techStop.textContent = fmtEUR(a.stopLoss);
        elements.techVolatility.textContent = fmtEUR(a.volatility);

        elements.techMA.innerHTML = `
            <strong>Medias Móviles:</strong> SMA20: ${a.maStatus.sma20}, SMA50: ${a.maStatus.sma50}, SMA200: ${a.maStatus.sma200}
        `;
        elements.techPatterns.innerHTML = `
            <strong>Patrones Recientes:</strong> ${a.patterns.length > 0 ? a.patterns.join(', ') : 'Ninguno detectado'}
        `;
    }

    function clearTechnicalAnalysis() {
        ['techSupport', 'techResistance', 'techBuyRange', 'techStop', 'techVolatility'].forEach(id => {
            if (elements[id]) elements[id].textContent = '-';
        });
        // Fields that use innerHTML
        ['techTrend', 'techMA', 'techPatterns'].forEach(id => {
            if (elements[id]) elements[id].innerHTML = '-';
        });
    }


    function toggleDetails(ticker) {
        if (expandedTickers.has(ticker)) {
            expandedTickers.delete(ticker);
        } else {
            expandedTickers.add(ticker);
        }
        render();
    }

    // --- Settings Logic ---
    function toggleSettingsModal(show) {
        if (!elements.settingsModal) return;
        if (show) {
            elements.settingsModal.classList.remove('hidden');
        } else {
            elements.settingsModal.classList.add('hidden');
        }
    }

    function openSettingsModal() {
        if (elements.fiscalDayInput) elements.fiscalDayInput.value = parseInt(localStorage.getItem('fiscalDay')) || 25;
        if (elements.bottomNavModeInput) elements.bottomNavModeInput.value = bottomNavMode;
        if (elements.defaultTransferSourceSelect) {
            elements.defaultTransferSourceSelect.innerHTML = '<option value="">-- Sin traspaso por omisión --</option>';
            const activeDrawers = savingsDrawers.filter(d => !d.isAuto && !d.name.toLowerCase().includes('nómina') && !d.name.toLowerCase().includes('nomina'));
            activeDrawers.forEach(d => {
                const opt = document.createElement('option');
                opt.value = d.id;
                opt.textContent = `${d.icon || ''} ${d.name}`.trim();
                elements.defaultTransferSourceSelect.appendChild(opt);
            });
            const storedSource = localStorage.getItem('defaultTransferSource');
            if (storedSource) elements.defaultTransferSourceSelect.value = storedSource;
        }

        toggleSettingsModal(true);
    }

    function saveSettings(e) {
        e.preventDefault();

        // Fiscal Day
        let newFiscalDay = parseInt(elements.fiscalDayInput?.value);
        if (isNaN(newFiscalDay) || newFiscalDay < 1 || newFiscalDay > 31) newFiscalDay = 25;
        fiscalDay = newFiscalDay; // Update variable
        localStorage.setItem('fiscalDay', fiscalDay);

        // Default Transfer Source

        // Default Transfer Source
        if (elements.defaultTransferSourceSelect) {
            localStorage.setItem('defaultTransferSource', elements.defaultTransferSourceSelect.value);
        }



        // Nextcloud Config
        const ncCfg = getNcConfigFromInputs();
        if (ncCfg) NextcloudSync.saveConfig(ncCfg.url, ncCfg.user, ncCfg.password, ncCfg.proxy);

        // Bottom Nav Mode
        if (elements.bottomNavModeInput) {
            bottomNavMode = elements.bottomNavModeInput.value; // Update variable
            localStorage.setItem('bottomNavMode', bottomNavMode);
            updateBottomNavLayout(); // Refresh UI
        }

        // Apply visual updates and notify user
        if (typeof updateStorageStatus === 'function') updateStorageStatus();
        toggleSettingsModal(false);
        showToast('Ajustes guardados correctamente.');

        // Reload page so variables such as fiscalDay load properly across the code
        setTimeout(() => location.reload(), 1000);
    }

    // --- Categories Management ---
    let tempIncomeCategories = [];
    let tempExpenseCategories = [];

    function openCategoriesModal() {
        tempIncomeCategories = [...incomeCategories];
        tempExpenseCategories = [...expenseCategories];
        renderCategoriesList();
        if (elements.categoriesModal) {
            elements.categoriesModal.classList.remove('hidden');
            elements.categoriesModal.style.display = 'flex';
        }
    }

    function renderCategoriesList() {
        if (!elements.incomeCategoriesContainer || !elements.expenseCategoriesContainer) return;

        // Render Income
        elements.incomeCategoriesContainer.innerHTML = tempIncomeCategories.map((cat, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" value="${cat}" class="income-cat-input" data-index="${idx}" style="flex:1; padding:0.5rem; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                <button class="remove-income-cat" data-index="${idx}" style="background:none; border:none; cursor:pointer; font-size:1.1rem; opacity:0.6;">❌</button>
            </div>
        `).join('');

        // Render Expense
        elements.expenseCategoriesContainer.innerHTML = tempExpenseCategories.map((cat, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" value="${cat}" class="expense-cat-input" data-index="${idx}" style="flex:1; padding:0.5rem; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                <button class="remove-expense-cat" data-index="${idx}" style="background:none; border:none; cursor:pointer; font-size:1.1rem; opacity:0.6;">❌</button>
            </div>
        `).join('');

        // Attach listeners
        elements.incomeCategoriesContainer.querySelectorAll('.income-cat-input').forEach(input => {
            input.onchange = (e) => { tempIncomeCategories[parseInt(input.dataset.index)] = e.target.value.trim(); };
        });
        elements.expenseCategoriesContainer.querySelectorAll('.expense-cat-input').forEach(input => {
            input.onchange = (e) => { tempExpenseCategories[parseInt(input.dataset.index)] = e.target.value.trim(); };
        });
        elements.incomeCategoriesContainer.querySelectorAll('.remove-income-cat').forEach(btn => {
            btn.onclick = () => {
                tempIncomeCategories.splice(parseInt(btn.dataset.index), 1);
                renderCategoriesList();
            };
        });
        elements.expenseCategoriesContainer.querySelectorAll('.remove-expense-cat').forEach(btn => {
            btn.onclick = () => {
                tempExpenseCategories.splice(parseInt(btn.dataset.index), 1);
                renderCategoriesList();
            };
        });
    }

    if (elements.addIncomeCategoryBtn) {
        elements.addIncomeCategoryBtn.onclick = () => {
            tempIncomeCategories.push('');
            renderCategoriesList();
            // Focus new input
            setTimeout(() => {
                const inputs = elements.incomeCategoriesContainer.querySelectorAll('.income-cat-input');
                inputs[inputs.length - 1]?.focus();
            }, 50);
        };
    }
    if (elements.addExpenseCategoryBtn) {
        elements.addExpenseCategoryBtn.onclick = () => {
            tempExpenseCategories.push('');
            renderCategoriesList();
            setTimeout(() => {
                const inputs = elements.expenseCategoriesContainer.querySelectorAll('.expense-cat-input');
                inputs[inputs.length - 1]?.focus();
            }, 50);
        };
    }
    if (elements.saveCategoriesBtn) {
        elements.saveCategoriesBtn.onclick = () => {
            const finalInc = tempIncomeCategories.map(s => s.trim()).filter(s => s);
            const finalExp = tempExpenseCategories.map(s => s.trim()).filter(s => s);

            if (finalInc.length === 0 || finalExp.length === 0) {
                showToast("Debes tener al menos una categoría en cada sección.", "danger");
                return;
            }

            let changesMade = false;

            // Cascading updates for Income
            if (incomeCategories.length === finalInc.length) {
                incomeCategories.forEach((oldCat, idx) => {
                    const newCat = finalInc[idx];
                    if (oldCat !== newCat) {
                        savingsDrawers.forEach(drawer => {
                            drawer.movements.forEach(m => {
                                if (m.amount >= 0 && m.category) {
                                    const parts = m.category.split(':');
                                    if (parts[0] === oldCat) {
                                        parts[0] = newCat;
                                        m.category = parts.join(':');
                                        changesMade = true;
                                    }
                                }
                            });
                        });
                    }
                });
            }

            // Cascading updates for Expense
            if (expenseCategories.length === finalExp.length) {
                expenseCategories.forEach((oldCat, idx) => {
                    const newCat = finalExp[idx];
                    if (oldCat !== newCat) {
                        savingsDrawers.forEach(drawer => {
                            drawer.movements.forEach(m => {
                                if (m.amount < 0 && m.category) {
                                    const parts = m.category.split(':');
                                    if (parts[0] === oldCat) {
                                        parts[0] = newCat;
                                        m.category = parts.join(':');
                                        changesMade = true;
                                    }
                                }
                            });
                        });
                    }
                });
            }

            incomeCategories = finalInc;
            expenseCategories = finalExp;

            localStorage.setItem('incomeCategories', JSON.stringify(incomeCategories));
            localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories));

            if (changesMade && window.saveSavings) {
                window.saveSavings(savingsDrawers);
            }

            showToast("Categorías guardadas correctamente" + (changesMade ? " y movimientos actualizados." : "."));
            if (typeof updateStorageStatus === 'function') updateStorageStatus();
            elements.categoriesModal.classList.add('hidden');

            // Sync current lists if necessary
            if (activeView === 'ahorro') {
                renderSavingsList();
                renderSavings();
            }
        };
    }
    if (elements.closeCategoriesModal) {
        elements.closeCategoriesModal.onclick = () => {
            elements.categoriesModal.classList.add('hidden');
        };
    }
    if (elements.categoriesModal) {
        elements.categoriesModal.onclick = (e) => {
            if (e.target === elements.categoriesModal) {
                elements.categoriesModal.classList.add('hidden');
            }
        };
    }

    // --- Subcategories Management ---
    let tempIncomeSubcategories = [];
    let tempExpenseSubcategories = [];

    function openSubcategoriesModal() {
        tempIncomeSubcategories = [...incomeSubcategories];
        tempExpenseSubcategories = [...expenseSubcategories];
        renderSubcategoriesList();
        if (elements.subcategoriesModal) {
            elements.subcategoriesModal.classList.remove('hidden');
            elements.subcategoriesModal.style.display = 'flex';
        }
    }

    function renderSubcategoriesList() {
        if (!elements.incomeSubcategoriesContainer || !elements.expenseSubcategoriesContainer) return;

        // Render Income
        elements.incomeSubcategoriesContainer.innerHTML = tempIncomeSubcategories.map((cat, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" value="${cat}" class="income-subcat-input" data-index="${idx}" style="flex:1; padding:0.5rem; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                <button class="remove-income-subcat" data-index="${idx}" style="background:none; border:none; cursor:pointer; font-size:1.1rem; opacity:0.6;">❌</button>
            </div>
        `).join('');

        // Render Expense
        elements.expenseSubcategoriesContainer.innerHTML = tempExpenseSubcategories.map((cat, idx) => `
            <div style="display:flex; gap:8px; align-items:center;">
                <input type="text" value="${cat}" class="expense-subcat-input" data-index="${idx}" style="flex:1; padding:0.5rem; border-radius:6px; background:rgba(255,255,255,0.05); border:1px solid rgba(255,255,255,0.1);">
                <button class="remove-expense-subcat" data-index="${idx}" style="background:none; border:none; cursor:pointer; font-size:1.1rem; opacity:0.6;">❌</button>
            </div>
        `).join('');

        // Attach listeners
        elements.incomeSubcategoriesContainer.querySelectorAll('.income-subcat-input').forEach(input => {
            input.onchange = (e) => { tempIncomeSubcategories[parseInt(input.dataset.index)] = e.target.value.trim(); };
        });
        elements.expenseSubcategoriesContainer.querySelectorAll('.expense-subcat-input').forEach(input => {
            input.onchange = (e) => { tempExpenseSubcategories[parseInt(input.dataset.index)] = e.target.value.trim(); };
        });
        elements.incomeSubcategoriesContainer.querySelectorAll('.remove-income-subcat').forEach(btn => {
            btn.onclick = () => {
                tempIncomeSubcategories.splice(parseInt(btn.dataset.index), 1);
                renderSubcategoriesList();
            };
        });
        elements.expenseSubcategoriesContainer.querySelectorAll('.remove-expense-subcat').forEach(btn => {
            btn.onclick = () => {
                tempExpenseSubcategories.splice(parseInt(btn.dataset.index), 1);
                renderSubcategoriesList();
            };
        });
    }

    if (elements.addIncomeSubcategoryBtn) {
        elements.addIncomeSubcategoryBtn.onclick = () => {
            tempIncomeSubcategories.push('');
            renderSubcategoriesList();
            setTimeout(() => {
                const inputs = elements.incomeSubcategoriesContainer.querySelectorAll('.income-subcat-input');
                inputs[inputs.length - 1]?.focus();
            }, 50);
        };
    }
    if (elements.addExpenseSubcategoryBtn) {
        elements.addExpenseSubcategoryBtn.onclick = () => {
            tempExpenseSubcategories.push('');
            renderSubcategoriesList();
            setTimeout(() => {
                const inputs = elements.expenseSubcategoriesContainer.querySelectorAll('.expense-subcat-input');
                inputs[inputs.length - 1]?.focus();
            }, 50);
        };
    }
    if (elements.saveSubcategoriesBtn) {
        elements.saveSubcategoriesBtn.onclick = () => {
            const finalInc = tempIncomeSubcategories.map(s => s.trim()).filter(s => s);
            const finalExp = tempExpenseSubcategories.map(s => s.trim()).filter(s => s);

            let changesMade = false;

            // Cascading updates for Income Subcategories
            if (incomeSubcategories.length === finalInc.length) {
                incomeSubcategories.forEach((oldSub, idx) => {
                    const newSub = finalInc[idx];
                    if (oldSub !== newSub) {
                        savingsDrawers.forEach(drawer => {
                            drawer.movements.forEach(m => {
                                if (m.amount >= 0 && m.category) {
                                    const parts = m.category.split(':');
                                    if (parts.length > 1 && parts[1] === oldSub) {
                                        parts[1] = newSub;
                                        m.category = parts.join(':');
                                        changesMade = true;
                                    }
                                }
                            });
                        });
                    }
                });
            }

            // Cascading updates for Expense Subcategories
            if (expenseSubcategories.length === finalExp.length) {
                expenseSubcategories.forEach((oldSub, idx) => {
                    const newSub = finalExp[idx];
                    if (oldSub !== newSub) {
                        savingsDrawers.forEach(drawer => {
                            drawer.movements.forEach(m => {
                                if (m.amount < 0 && m.category) {
                                    const parts = m.category.split(':');
                                    if (parts.length > 1 && parts[1] === oldSub) {
                                        parts[1] = newSub;
                                        m.category = parts.join(':');
                                        changesMade = true;
                                    }
                                }
                            });
                        });
                    }
                });
            }

            incomeSubcategories = finalInc;
            expenseSubcategories = finalExp;

            localStorage.setItem('incomeSubcategories', JSON.stringify(incomeSubcategories));
            localStorage.setItem('expenseSubcategories', JSON.stringify(expenseSubcategories));

            if (changesMade && window.saveSavings) {
                window.saveSavings(savingsDrawers);
            }

            showToast("Subcategorías guardadas correctamente" + (changesMade ? " y movimientos actualizados." : "."));
            if (typeof updateStorageStatus === 'function') updateStorageStatus();
            elements.subcategoriesModal.classList.add('hidden');
        };
    }

    // Emoji Selection Listeners
    document.querySelectorAll('.emoji-opt').forEach(opt => {
        opt.onclick = () => { if (elements.drawerIconInput) elements.drawerIconInput.value = opt.textContent; };
    });
    document.querySelectorAll('.emoji-opt-nomina').forEach(opt => {
        opt.onclick = () => { if (elements.nominaIconInput) elements.nominaIconInput.value = opt.textContent; };
    });
    if (elements.closeSubcategoriesModal) {
        elements.closeSubcategoriesModal.onclick = () => {
            elements.subcategoriesModal.classList.add('hidden');
        };
    }
    if (elements.subcategoriesModal) {
        elements.subcategoriesModal.onclick = (e) => {
            if (e.target === elements.subcategoriesModal) {
                elements.subcategoriesModal.classList.add('hidden');
            }
        };
    }

    function panicReset() {
        if (confirm('¿ESTADO DE PÁNICO? Esto borrará ABSOLUTAMENTE TODO (Inversiones, Huchas, Nóminas) y reiniciará la app. ¿Continuar?')) {
            localStorage.clear();
            window.location.reload(true);
        }
    }
    // window.panicReset removed


    async function migrateInversions() {
        showCustomConfirm("Esta herramienta buscará movimientos que parezcan inversiones (con la palabra 'Inversión' o 'Bolsa' en la descripción) y los marcará con la categoría correcta para que se muestren en positivo automáticamente. ¿Deseas continuar?", () => {
            let count = 0;
            savingsDrawers.forEach(drawer => {
                (drawer.movements || []).forEach(m => {
                    const conceptLower = (m.concept || m.description || '').toLowerCase();
                    if (conceptLower.includes('invers') || conceptLower.includes('bolsa')) {
                        if (m.category !== 'Inversión') {
                            m.category = 'Inversión';
                            count++;
                        }
                    }
                });
            });
            if (count > 0) {
                if (window.saveSavings) window.saveSavings(savingsDrawers);
                render();
                alert(`Se han migrado ${count} movimientos a la categoría Inversión.`);
            } else {
                alert("No se encontraron nuevos movimientos para migrar.");
            }
        });
    }

    async function forceAppUpdate() {
        showCustomConfirm('Esto borrará toda la caché del navegador para esta aplicación y forzará una recarga total. ¿Continuar?', async () => {
            try {
                showToast('Limpiando caché...', 'info');

                // 1. Unregister all service workers
                if ('serviceWorker' in navigator) {
                    const registrations = await navigator.serviceWorker.getRegistrations();
                    for (let registration of registrations) {
                        await registration.unregister();
                    }
                }

                // 2. Delete all caches
                if ('caches' in window) {
                    const cacheNames = await caches.keys();
                    for (let name of cacheNames) {
                        await caches.delete(name);
                    }
                }

                // 3. Clear localStorage versions if needed
                localStorage.removeItem('app_version');

                showToast('Caché restablecida. Recargando...', 'success');

                // 4. Force reload from server
                setTimeout(() => {
                    window.location.reload(true);
                }, 1000);

            } catch (err) {
                console.error('Error in forceUpdate:', err);
                alert('Error al restablecer caché: ' + err.message);
            }
        });
    }

    async function deleteAllData() {
        const resetBtn = () => {
            if (elements.sidebarDeleteAllBtn) {
                elements.sidebarDeleteAllBtn.classList.add('locked');
                elements.sidebarDeleteAllBtn.classList.remove('activated');
                elements.sidebarDeleteAllBtn.disabled = true;
                elements.sidebarDeleteAllBtn.style.setProperty('--long-press-progress', '0%');
                elements.sidebarDeleteAllBtn.innerHTML = `<span>🗑️</span> Borrar todo`;
            }
        };

        showCustomConfirm('¿Estás seguro de que quieres BORRAR TODOS los datos de la aplicación? Esta acción es irreversible.', async () => {
            try {
                // Clear local session state
                stocks = [];
                savingsDrawers = [
                    { id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true, targetAmount: 0 }
                ];
                countdowns = [];

                // Persist clear state via storage.js
                if (window.saveStocks) window.saveStocks(stocks);
                if (window.saveSavings) window.saveSavings(savingsDrawers);
                if (window.saveCountdowns) window.saveCountdowns(countdowns);
                if (window.saveCountdowns) window.saveCountdowns(countdowns);
                nominaData = [];
                activityStockFilter = null;
                activityCellFilter = { column: null, value: null };
                activitySearchQuery = '';
                if (window.saveNomina) window.saveNomina(nominaData);

                // Clear extra system keys
                localStorage.removeItem('msv_fx_rate_v1');
                localStorage.removeItem('msv_fx_date_v1');
                localStorage.removeItem('msv_live_prices_v1');

                showToast('Todos los datos han sido borrados', 'info');
                render();

                // Ask for demo data
                setTimeout(() => {
                    showCustomConfirm('La aplicación está vacía. ¿Quieres cargar unos datos de ejemplo para explorar las funcionalidades?', () => {
                        loadDemoData();
                    });
                }, 800);
            } catch (err) {
                console.error('Error deleting data:', err);
                showToast('Error al borrar los datos', 'danger');
            }
        }, () => {
            resetBtn();
        });
    }

    function loadDemoData() {
        const now = new Date();
        const past = new Date(now);
        past.setDate(1); // avoid rollover
        past.setMonth(now.getMonth() - 1);
        const pastStr = past.toISOString().split('T')[0];
        const currentStr = now.toISOString().split('T')[0];

        stocks = [
            { id: 'demo_1', ticker: 'AAPL', qty: 12, price: 175.50, currency: 'USD', name: 'Apple Inc.', date: currentStr, market: 'NASDAQ' },
            { id: 'demo_2', ticker: 'MSFT', qty: 8, price: 395.20, currency: 'USD', name: 'Microsoft Corp.', date: currentStr, market: 'NASDAQ' },
            { id: 'demo_3', ticker: 'NVDA', qty: 5, price: 680.15, currency: 'USD', name: 'NVIDIA Corp.', date: currentStr, market: 'NASDAQ' },
            { id: 'demo_4', ticker: 'KO', qty: 45, price: 58.20, currency: 'USD', name: 'Coca-Cola Co.', date: pastStr, market: 'NYSE' },
            { id: 'demo_5', ticker: 'SAN.MC', qty: 500, price: 4.15, currency: 'EUR', name: 'Banco Santander', date: pastStr, market: 'IBEX35' },
            { id: 'demo_6', ticker: 'ITX.MC', qty: 25, price: 51.10, currency: 'EUR', name: 'Inditex', date: currentStr, market: 'IBEX35' }
        ];

        savingsDrawers = [
            { id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true, targetAmount: 0 },
            {
                id: 'emergency_demo', name: 'Fondo de Emergencia', icon: '🛡️', balance: 3500, movements: [
                    { id: Date.now() + 1, date: pastStr, amount: 3500, category: 'Ahorro', concept: 'Aportación inicial (Ahorros acumulados)', type: 'income' }
                ], isAuto: false, targetAmount: 5000
            },
            {
                id: 'travel_demo', name: 'Hucha Viajes', icon: '✈️', balance: 1350, movements: [
                    { id: Date.now() + 2, date: pastStr, amount: 1500, category: 'Ahorro', concept: 'Venta material segunda mano', type: 'income' },
                    { id: Date.now() + 3, date: currentStr, amount: 150, category: 'Gasto', concept: 'Reserva hotel Venecia', type: 'expense' }
                ], isAuto: false, targetAmount: 2500
            },
            {
                id: 'car_demo', name: 'Coche Nuevo', icon: '🚗', balance: 500, movements: [
                    { id: Date.now() + 6, date: currentStr, amount: 500, category: 'Ahorro', concept: 'Primera aportación coche', type: 'income' }
                ], isAuto: false, targetAmount: 20000
            }
        ];

        countdowns = [
            { id: Date.now() + 4, name: 'Vacaciones Verano', date: '2026-08-01T09:00:00', icon: '☀️' }
        ];

        const demoNomina = [
            {
                id: 'demo_nom_1',
                name: 'Nómina Principal',
                icon: '💼',
                type: 'income',
                movements: [
                    { id: 'demo_mov_1', date: currentStr, amount: 2500, category: 'Ahorro', concept: 'Nómina Mensual', type: 'income', activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], paid: true }
                ]
            },
            {
                id: 'demo_nom_2',
                name: 'Alquiler / Hipoteca',
                icon: '🏠',
                type: 'expense',
                movements: [
                    { id: 'demo_mov_2', date: currentStr, amount: 850, category: 'Gasto', concept: 'Recibo Mensual', type: 'expense', activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], paid: true }
                ]
            },
            {
                id: 'demo_nom_3',
                name: 'Ahorro Coche',
                icon: '🚗',
                type: 'saving',
                linkedSavingsDrawerId: 'car_demo',
                movements: [
                    { id: 'demo_mov_3', date: currentStr, amount: 500, category: 'Ahorro', concept: 'Aportación Hucha', type: 'income', activeMonths: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12], paid: true }
                ]
            }
        ];

        nominaData = demoNomina;
        isFirstUpdateDone = true;

        if (window.saveStocks) window.saveStocks(stocks);
        if (window.saveSavings) window.saveSavings(savingsDrawers);
        if (window.saveCountdowns) window.saveCountdowns(countdowns);
        if (window.saveNomina) window.saveNomina(nominaData);

        showToast('¡Datos de demostración enriquecidos cargados!', 'success');
        render();
    }

    // --- View Toggle Helpers ---
    function toggleBolsaView() {
        if (bolsaViewMode === 'cards') {
            bolsaViewMode = 'list';
            bolsaTotalsMode = false;
        } else if (!bolsaTotalsMode) {
            bolsaTotalsMode = true;
        } else {
            bolsaViewMode = 'cards';
            bolsaTotalsMode = false;
        }
        localStorage.setItem('bolsaViewMode', bolsaViewMode);
        localStorage.setItem('bolsaTotalsMode', bolsaTotalsMode);
        render();
    }

    function toggleActivityView() {
        const rendQuery = 'Intereses | Dividendos | Especulación';
        if (activitySearchQuery === rendQuery) {
            activitySearchQuery = '';
        } else {
            activitySearchQuery = rendQuery;
        }
        localStorage.setItem('activitySearchQuery', activitySearchQuery);
        if (elements.activitySearchInput) elements.activitySearchInput.value = activitySearchQuery;
        render();
        updateBottomNavLayout();
    }

    function updateBottomNavLayout() {
        if (!elements.bottomNav) return;
        
        // Find the 3rd navigation item (can have view nomina or activity)
        const navItems = elements.bottomNav.querySelectorAll('.bottom-nav-item');
        if (navItems.length < 3) return;
        
        const nav3 = navItems[2];
        const iconSpan = nav3.querySelector('.bottom-nav-icon');
        const textSpan = nav3.querySelector('.bottom-nav-text');

        if (bottomNavMode === 'activity') {
            nav3.setAttribute('data-view', 'activity');
            const isRend = activitySearchQuery === 'Intereses | Dividendos | Especulación';
            if (iconSpan) iconSpan.textContent = isRend ? '📊' : '📝';
            if (textSpan) textSpan.textContent = isRend ? 'Act. Rend.' : 'Actividad';
        } else {
            nav3.setAttribute('data-view', 'nomina');
            if (iconSpan) iconSpan.textContent = '💶';
            if (textSpan) textSpan.textContent = 'Nómina';
        }
    }

    function updateAhorroToggleIcons() {
        const toggleIds = ['ahorroViewToggleBtn', 'ahorroCalendarViewToggleBtn', 'ahorroEstadoViewToggleBtn', 'ahorroViewToggleBtn2'];
        let nextIcon = '<span>🔲</span>';
        let nextTitle = 'Cambiar Vista';

        if (ahorroViewMode === 'cards') {
            nextIcon = '<span>📋</span>';
            nextTitle = 'Cambiar a Vista Listado';
        } else if (ahorroViewMode === 'list') {
            nextIcon = '<span>📅</span>';
            nextTitle = 'Cambiar a Vista Calendario';
        } else if (ahorroViewMode === 'calendar') {
            nextIcon = '<span>📈</span>';
            nextTitle = 'Cambiar a Vista Estado';
        } else {
            nextIcon = '<span>🗂️</span>';
            nextTitle = 'Cambiar a Vista Cuentas';
        }

        toggleIds.forEach(id => {
            const btn = document.getElementById(id);
            if (btn) {
                btn.innerHTML = nextIcon;
                btn.title = nextTitle;
            }
        });
    }

    function toggleAhorroView() {
        if (ahorroViewMode === 'cards') {
            ahorroViewMode = 'list';
            if (currentView !== 'ahorro') switchView('ahorro');
        } else if (ahorroViewMode === 'list') {
            ahorroViewMode = 'calendar';
            switchView('ahorroCalendar');
        } else if (ahorroViewMode === 'calendar') {
            ahorroViewMode = 'estado';
            switchView('ahorroEstado');
        } else {
            ahorroViewMode = 'cards';
            switchView('ahorro');
        }
        localStorage.setItem('ahorroViewMode', ahorroViewMode);
        updateAhorroToggleIcons();
        render();
    }

    function toggleNominaView() {
        if (currentView === 'analisis') {
            switchView('analisis'); // Stay in analisis view but re-render
            return;
        }
        nominaViewMode = nominaViewMode === 'cards' ? 'list' : 'cards';
        localStorage.setItem('nominaViewMode', nominaViewMode);
        render();
    }

    function showAhorroBreakdown() {
        breakdownDrawerFilter = null;
        breakdownContext = 'ahorro';
        const now = new Date();
        if (elements.breakdownMonthInput) {
            elements.breakdownMonthInput.value = getFiscalMonth(now);
        }
        if (elements.breakdownYearInput) {
            elements.breakdownYearInput.value = getFiscalMonth(now).split('-')[0];
        }
        elements.breakdownDetailContainer?.classList.add('hidden');
        currentActiveBreakdownCategory = null;
        updateAhorroBreakdown();
        elements.ahorroBreakdownModal?.classList.remove('hidden');
    }

    function showBreakdownDetail(category) {
        if (!elements.breakdownDetailContainer || !elements.breakdownDetailList) return;

        // Toggle: If same category is clicked while visible, hide it
        if (currentActiveBreakdownCategory === category && !elements.breakdownDetailContainer.classList.contains('hidden')) {
            elements.breakdownDetailContainer.classList.add('hidden');
            currentActiveBreakdownCategory = null;
            return;
        }

        const movs = currentBreakdownMovements[category] || [];
        if (movs.length === 0) {
            elements.breakdownDetailContainer.classList.add('hidden');
            currentActiveBreakdownCategory = null;
            return;
        }

        currentActiveBreakdownCategory = category;

        if (elements.breakdownDetailTitle) {
            elements.breakdownDetailTitle.textContent = `Detalle: ${category}`;
        }

        elements.breakdownDetailList.innerHTML = movs.map(m => `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.8rem; background: rgba(255,255,255,0.05); border-radius: 8px; border: 1px solid rgba(255,255,255,0.05);">
                <div style="display: flex; flex-direction: column;">
                    <span style="font-size: 0.9rem; font-weight: 600;">${m.concept || m.description || 'Sin concepto'}</span>
                    <span style="font-size: 0.75rem; color: var(--text-muted);">${m.date} - ${m.drawerName}</span>
                </div>
                <span style="font-weight: 700; color: ${m.amount >= 0 ? 'var(--success)' : 'var(--danger)'};">${fmtEUR(m.amount, 2)}</span>
            </div>
        `).join('');

        elements.breakdownDetailContainer.classList.remove('hidden');
        // Scroll to detail
        elements.breakdownDetailContainer.scrollIntoView({ behavior: 'smooth' });
    }

    function updateAhorroBreakdown() {
        const filterType = elements.breakdownFilterType?.value || 'month';
        const monthVal = elements.breakdownMonthInput?.value;
        const yearVal = elements.breakdownYearInput?.value;

        let totalIntereses = 0;
        let totalDividendos = 0;
        let totalEspeculacion = 0;

        currentBreakdownMovements = {
            Intereses: [],
            Dividendos: [],
            Especulación: []
        };

        const filteredDrawers = breakdownDrawerFilter
            ? savingsDrawers.filter(d => d.id === breakdownDrawerFilter)
            : savingsDrawers;

        if (elements.breakdownModalTitle) {
            if (breakdownDrawerFilter) {
                const drawer = savingsDrawers.find(d => d.id === breakdownDrawerFilter);
                elements.breakdownModalTitle.textContent = `Rendimientos: ${drawer ? drawer.name : 'Cuenta'}`;
            } else {
                elements.breakdownModalTitle.textContent = "Resumen de Rendimientos (Global)";
            }
        }

        filteredDrawers.forEach(drawer => {
            (drawer.movements || []).forEach(mov => {
                const movFiscalMonth = getFiscalMonth(mov.date);
                const movFiscalYear = movFiscalMonth.split('-')[0];

                let match = false;
                if (filterType === 'month') {
                    match = movFiscalMonth === monthVal;
                } else {
                    match = movFiscalYear === yearVal.toString();
                }

                if (match) {
                    const cat = mov.category;
                    const movWithDrawer = { ...mov, drawerName: drawer.name };
                    if (cat === 'Intereses') {
                        totalIntereses += mov.amount;
                        currentBreakdownMovements.Intereses.push(movWithDrawer);
                    } else if (cat === 'Dividendos') {
                        totalDividendos += mov.amount;
                        currentBreakdownMovements.Dividendos.push(movWithDrawer);
                    } else if (cat === 'Especulación') {
                        totalEspeculacion += mov.amount;
                        currentBreakdownMovements.Especulación.push(movWithDrawer);
                    }
                }
            });
        });

        const totalRendimientos = totalIntereses + totalDividendos + totalEspeculacion;
        if (elements.breakdownIntereses) elements.breakdownIntereses.textContent = fmtEUR(totalIntereses, 2);
        if (elements.breakdownDividendos) elements.breakdownDividendos.textContent = fmtEUR(totalDividendos, 2);
        if (elements.breakdownEspeculacion) elements.breakdownEspeculacion.textContent = fmtEUR(totalEspeculacion, 2);
        if (elements.breakdownTotal) elements.breakdownTotal.textContent = fmtEUR(totalRendimientos, 2);

        // Calculate and show yield percentage vs total invested in bolsa or patrimonio total
        if (elements.breakdownBolsaPctContainer) {
            const isBolsa = breakdownContext === 'bolsa';
            const inv = isBolsa ? currentTotalInvestedBolsa : currentPatrimonioTotal;
            const labelText = isBolsa ? 'invertido' : 'patrimonio';

            if (inv > 0) {
                let pct = 0;
                if (filterType === 'month') {
                    pct = ((totalRendimientos * 12) / inv) * 100;
                } else {
                    const now = new Date();
                    const currentYear = now.getFullYear();
                    const currentMonth = now.getMonth() + 1; // 1-12
                    const selectedYear = parseInt(yearVal);

                    let monthsPassed = 12;
                    if (selectedYear === currentYear) {
                        monthsPassed = currentMonth;
                    } else if (selectedYear > currentYear) {
                        monthsPassed = 1;
                    }

                    pct = (totalRendimientos * (12 / monthsPassed) / inv) * 100;
                }

                elements.breakdownBolsaPctContainer.classList.remove('hidden');
                if (elements.breakdownBolsaPct) elements.breakdownBolsaPct.textContent = fmtPct(pct);
                if (elements.breakdownBolsaInvested) {
                    elements.breakdownBolsaInvested.parentElement.innerHTML = `
                        <span id="breakdownBolsaPct" style="color: var(--primary); font-weight: 600;">${fmtPct(pct)}</span> 
                        de <span id="breakdownBolsaInvested">${fmtEUR(inv)}</span> ${labelText}
                    `;
                    // Re-assign references because we just overwrote the parent's innerHTML
                    elements.breakdownBolsaPct = document.getElementById('breakdownBolsaPct');
                    elements.breakdownBolsaInvested = document.getElementById('breakdownBolsaInvested');
                }
            } else {
                elements.breakdownBolsaPctContainer.classList.add('hidden');
            }
        }
    }

    function toggleDataSource() {
        const newMode = (window.DATA_SOURCE_MODE === 'hybrid') ? 'yahoo' : 'hybrid';
        window.DATA_SOURCE_MODE = newMode;
        if (window.saveDataSourceMode) window.saveDataSourceMode(newMode);
        updateDataSourceUI();

        // Trigger a refresh of prices with the new mode
        const uniqueTickers = [...new Set(stocks.map(s => s.ticker))];
        if (window.refreshLivePrices) {
            showToast("🔄 Cambiando fuente de datos...", "info");
            const btn = elements.manualRefreshBtn;
            const originalContent = btn ? btn.textContent : '';
            if (btn) btn.style.color = '#f59e0b';

            window.refreshLivePrices(uniqueTickers, (current) => {
                if (btn) btn.textContent = current;
            }).then(() => {
                render();
                if (btn) {
                    btn.textContent = originalContent;
                    btn.style.color = '';
                }
                showToast(`✅ Modo ${newMode === 'yahoo' ? 'Yahoo Finance' : 'Híbrido'} activado`, "success");
            });
        }
    }

    // --- Event Listeners ---

    function setupEventListeners() {
        // Ahorro Estado Listeners
        elements.ahorroEstadoMonthUp?.addEventListener('click', () => {
            ahorroEstadoMonth++;
            if (ahorroEstadoMonth > 12) {
                ahorroEstadoMonth = 1;
                ahorroEstadoYear++;
            }
            renderAhorroEstado();
        });
        elements.ahorroEstadoMonthDown?.addEventListener('click', () => {
            ahorroEstadoMonth--;
            if (ahorroEstadoMonth < 1) {
                ahorroEstadoMonth = 12;
                ahorroEstadoYear--;
            }
            renderAhorroEstado();
        });
        elements.ahorroEstadoYearUp?.addEventListener('click', () => {
            ahorroEstadoYear++;
            renderAhorroEstado();
        });
        elements.ahorroEstadoYearDown?.addEventListener('click', () => {
            ahorroEstadoYear--;
            renderAhorroEstado();
        });
        elements.ahorroEstadoShowIncome?.addEventListener('click', () => {
            ahorroEstadoType = 'income';
            renderAhorroEstado();
        });
        elements.ahorroEstadoShowExpenses?.addEventListener('click', () => {
            ahorroEstadoType = 'expense';
            renderAhorroEstado();
        });

        elements.ahorroEstadoChartHeader?.addEventListener('click', () => {
            if (elements.ahorroEstadoChartContent && elements.ahorroEstadoChartToggleIcon) {
                isAhorroEstadoChartExpanded = !isAhorroEstadoChartExpanded;
                localStorage.setItem('isAhorroEstadoChartExpanded', isAhorroEstadoChartExpanded);
                elements.ahorroEstadoChartContent.classList.toggle('hidden', !isAhorroEstadoChartExpanded);
                elements.ahorroEstadoChartToggleIcon.textContent = isAhorroEstadoChartExpanded ? '▼' : '▶';
            }
        });

        // Apply initial Ahorro Estado Chart state
        if (elements.ahorroEstadoChartContent && elements.ahorroEstadoChartToggleIcon) {
            elements.ahorroEstadoChartContent.classList.toggle('hidden', !isAhorroEstadoChartExpanded);
            elements.ahorroEstadoChartToggleIcon.textContent = isAhorroEstadoChartExpanded ? '▼' : '▶';
        }


        // Global Date Picker Trigger: open calendar on field click
        document.addEventListener('click', (e) => {
            const dateInput = e.target.closest('input[type="date"]');
            if (dateInput && 'showPicker' in HTMLInputElement.prototype) {
                try {
                    dateInput.showPicker();
                } catch (err) {
                    console.error("showPicker error:", err);
                }
            }
        });

        elements.addStockBtn?.addEventListener('click', openAddStockModal);
        elements.bolsaAddStockBtn?.addEventListener('click', openAddStockModal);
        elements.mobileAddStockBtn?.addEventListener('click', openAddStockModal);

        elements.settingsBtn?.addEventListener('click', openSettingsModal);
        elements.mobileSettingsBtn?.addEventListener('click', openSettingsModal);
        elements.forceUpdateBtn?.addEventListener('click', forceAppUpdate);
        elements.closeSettingsModal?.addEventListener('click', () => toggleSettingsModal(false));
        elements.settingsForm?.addEventListener('submit', saveSettings);

        if (elements.privacyToggleBtn) {
            elements.privacyToggleBtn.addEventListener('click', togglePrivacy);
        }
        if (elements.mobilePrivacyToggleBtn) {
            elements.mobilePrivacyToggleBtn.addEventListener('click', togglePrivacy);
        }

        /**
         * Closes the mobile sidebar if it's open
         */
        function closeMobileSidebar() {
            elements.wealthSidebar?.classList.remove('mobile-open');
            elements.sidebarOverlay?.classList.remove('visible');
        }

        /**
         * Collapses all other sidebar nav containers except the one provided
         */
        function collapseOtherSidebarGroups(exceptContainer) {
            document.querySelectorAll('.nav-item-container').forEach(container => {
                if (container !== exceptContainer) {
                    container.classList.remove('open');
                }
            });
        }

        // New Navigation Logic
        const wealthNavsArr = elements.wealthNavItems ? Array.from(elements.wealthNavItems) : [];
        const bottomNavsArr = elements.bottomNavItems ? Array.from(elements.bottomNavItems) : [];
        const allNavs = [...wealthNavsArr, ...bottomNavsArr];

        allNavs.forEach(nav => {
            if (!nav) return;
            nav.addEventListener('click', (e) => {
                const view = nav.dataset.view;
                const isSidebar = nav.classList.contains('wealth-nav-item');
                const container = nav.closest('.nav-item-container');

                if (!view) {
                    if (isSidebar && container) {
                        const opening = !container.classList.contains('open');
                        if (opening) collapseOtherSidebarGroups(container);
                        container.classList.toggle('open');
                    }
                    return;
                }

                // Updated isAh to include ahorroGastos
                const isAh = (view === 'ahorro' && (currentView === 'ahorroCalendar' || currentView === 'ahorroEstado' || currentView === 'ahorroGastos'));
                const isNom = (view === 'nomina' && currentView === 'analisis');
                if (currentView === view || isAh || isNom) {
                    if (view === 'bolsa') toggleBolsaView();
                    else if (view === 'ahorro') toggleAhorroView();
                    else if (view === 'nomina') toggleNominaView();
                    else if (view === 'activity') toggleActivityView();

                    if (isSidebar && container) {
                        const opening = !container.classList.contains('open');
                        if (opening) collapseOtherSidebarGroups(container);
                        container.classList.toggle('open');
                    }
                    closeMobileSidebar();
                    return;
                }

                if (view === 'activity') {
                    activityFilterMode = 'all';
                    activityCellFilter = { column: null, value: null };
                    activitySearchQuery = '';
                    if (elements.activitySearchInput) elements.activitySearchInput.value = '';
                }
                // Accordion: collapse others, open this one
                if (isSidebar && container) {
                    collapseOtherSidebarGroups(container);
                    container.classList.add('open');
                }
                switchView(view);
                closeMobileSidebar();
            });
        });
        // Ensure clicking the header also triggers the main button
        document.querySelectorAll('.nav-item-header').forEach(header => {
            header.addEventListener('click', (e) => {
                if (e.target.closest('button')) return;
                const btn = header.querySelector('.wealth-nav-item');
                if (btn) btn.click();
            });
        });

        elements.ahorroGlobalCalendarMonthUp?.addEventListener('click', () => {
            globalAhorroCalendarViewDate.setDate(1);
            globalAhorroCalendarViewDate.setMonth(globalAhorroCalendarViewDate.getMonth() + 1);
            renderGlobalAhorroCalendar();
        });
        elements.ahorroGlobalCalendarMonthDown?.addEventListener('click', () => {
            globalAhorroCalendarViewDate.setDate(1);
            globalAhorroCalendarViewDate.setMonth(globalAhorroCalendarViewDate.getMonth() - 1);
            renderGlobalAhorroCalendar();
        });
        elements.ahorroGlobalCalendarYearUp?.addEventListener('click', () => {
            globalAhorroCalendarViewDate.setFullYear(globalAhorroCalendarViewDate.getFullYear() + 1);
            renderGlobalAhorroCalendar();
        });
        elements.ahorroGlobalCalendarYearDown?.addEventListener('click', () => {
            globalAhorroCalendarViewDate.setFullYear(globalAhorroCalendarViewDate.getFullYear() - 1);
            renderGlobalAhorroCalendar();
        });

        elements.ahorroGlobalCalendarDrawerFilter?.addEventListener('change', (e) => {
            globalAhorroCalendarDrawerFilter = e.target.value;
            localStorage.setItem('globalAhorroCalendarDrawerFilter', globalAhorroCalendarDrawerFilter);
            renderGlobalAhorroCalendar();
        });

        // Mobile "More" Menu
        // Mobile "More" Menu - Toggles sidebar (both mobile and desktop collapse)
        elements.mobileMoreBtn?.addEventListener('click', (e) => {
            e.stopPropagation();
            const sidebar = elements.wealthSidebar;
            if (!sidebar) return;

            // In mobile view (sidebar hidden left), toggle mobile-open
            if (window.innerWidth <= 1024) {
                sidebar.classList.toggle('mobile-open');
                elements.sidebarOverlay?.classList.toggle('visible');
            } else {
                // In desktop view (sidebar existing on left), toggle collapse state
                toggleSidebarCollapse();
            }
        });

        elements.sidebarOverlay?.addEventListener('click', () => {
            elements.wealthSidebar?.classList.remove('mobile-open');
            elements.sidebarOverlay?.classList.remove('visible');
        });

        // Sidebar Collapse Toggle
        document.getElementById('sidebarCollapseBtn')?.addEventListener('click', toggleSidebarCollapse);

        // Restore Sidebar State
        const sidebarIsCollapsed = localStorage.getItem('sidebarCollapsed') === 'true';
        if (sidebarIsCollapsed) {
            elements.wealthSidebar?.classList.add('collapsed');
            document.getElementById('appMain')?.classList.add('sidebar-collapsed');
        }

        const collapseBtn = document.getElementById('sidebarCollapseBtn');
        if (collapseBtn) {
            collapseBtn.classList.toggle('sidebar-open', !sidebarIsCollapsed);
            const icon = collapseBtn.querySelector('.collapse-icon');
            if (icon) icon.textContent = sidebarIsCollapsed ? '☰' : '◀';
        }

        // Action Buttons in Sidebar & Mobile Dynamic FAB

        elements.mobileMenuBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const activeNav = document.querySelector('.bottom-nav-item.active');
            const viewContext = activeNav ? activeNav.dataset.view : currentView;
            const effectiveView = viewContext || currentView;

            console.log("[FAB] Toggle. Context:", effectiveView);

            if (effectiveView === 'bolsa') {
                const modal = elements.addStockModal;
                if (modal && !modal.classList.contains('hidden')) {
                    toggleModal(false);
                } else {
                    openAddStockModal();
                }
            } else if (effectiveView === 'ahorro' || effectiveView === 'ahorroCalendar' || effectiveView === 'ahorroEstado') {
                const modal = document.getElementById('savingsInputModal');
                const actionType = document.getElementById('savingsActionType');
                if (modal && !modal.classList.contains('hidden')) {
                    if (actionType && actionType.value === 'global-movement') {
                        showAddDrawer();
                    } else {
                        toggleSavingsModal(false);
                    }
                } else {
                    showGlobalAddMovementModal();
                }
            } else if (effectiveView === 'nomina' || effectiveView === 'analisis') {
                const nModal = elements.nominaModal;
                const nmModal = elements.nominaMovementModal;
                const nOpen = nModal && !nModal.classList.contains('hidden');
                const nmOpen = nmModal && !nmModal.classList.contains('hidden');

                if (nOpen || nmOpen) {
                    if (nOpen) toggleNominaModal(false);
                    if (nmOpen) toggleNominaMovementModal(false);
                } else {
                    showAddNomina();
                }
            } else {
                // Default toggle for other views (usually Bolsa modal)
                const modal = elements.addStockModal;
                if (modal && !modal.classList.contains('hidden')) {
                    toggleModal(false);
                } else {
                    openAddStockModal();
                }
            }
        });
        elements.sidebarPrivacyToggleBtn?.addEventListener('click', togglePrivacy);
        elements.sidebarSettingsBtn?.addEventListener('click', openSettingsModal);
        elements.sidebarCategoriesBtn?.addEventListener('click', openCategoriesModal);
        elements.sidebarSubcategoriesBtn?.addEventListener('click', openSubcategoriesModal);
        elements.sidebarExportBtn?.addEventListener('click', () => exportGlobalJSON());
        elements.sidebarImportBtn?.addEventListener('click', () => elements.globalJsonInput?.click());
        elements.sidebarClockBtn?.addEventListener('click', () => {
            // Simulate old clockMenuBtn trigger
            document.getElementById('clockMenuBtn')?.click();
        });
        elements.sidebarResetBtn?.addEventListener('click', () => forceAppUpdate());
        elements.sidebarMigrateInversionsBtn?.addEventListener('click', () => migrateInversions());
        // --- Secure Delete All Button Hold logic ---
        let holdTimer = null;
        if (elements.sidebarDeleteAllBtn) {
            const btn = elements.sidebarDeleteAllBtn;

            const startHold = (e) => {
                if (!btn.classList.contains('locked')) return;
                // Prevent multi-touch or multiple starts
                if (holdTimer) clearInterval(holdTimer);

                const holdStartTime = Date.now();
                btn.style.setProperty('--long-press-progress', '0%');

                holdTimer = setInterval(() => {
                    const elapsed = Date.now() - holdStartTime;
                    const progress = Math.min((elapsed / 5000) * 100, 100);
                    btn.style.setProperty('--long-press-progress', `${progress}%`);

                    const secondsLeft = Math.ceil((5000 - elapsed) / 1000);
                    if (secondsLeft > 0) {
                        btn.innerHTML = `<span>🗑️</span> Mantén ${secondsLeft}s...`;
                    }

                    if (elapsed >= 5000) {
                        clearInterval(holdTimer);
                        holdTimer = null;
                        btn.classList.remove('locked');
                        btn.disabled = false;
                        btn.classList.add('activated');
                        btn.innerHTML = `<span>⚠️</span> ¡BORRAR TODO!`;
                        showToast('Botón de borrado activado', 'warning');
                    }
                }, 50);
            };

            const cancelHold = () => {
                if (!btn.classList.contains('locked')) return;
                if (holdTimer) {
                    clearInterval(holdTimer);
                    holdTimer = null;
                    btn.style.setProperty('--long-press-progress', '0%');
                    btn.innerHTML = `<span>🗑️</span> Borrar todo`;
                }
            };

            btn.addEventListener('pointerdown', startHold);
            // Global listeners to handle pointer leaving/up anywhere
            window.addEventListener('pointerup', cancelHold);
            btn.addEventListener('pointerleave', cancelHold);

            btn.addEventListener('click', (e) => {
                if (btn.classList.contains('locked')) {
                    e.preventDefault();
                    showToast('Mantén pulsado 5s para activar', 'info');
                } else if (btn.classList.contains('activated')) {
                    deleteAllData();
                }
            });
        }

        // Submenu button listeners (Direct calls to avoid "display:none" click issues)
        document.getElementById('sidebarAddStockBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openAddStockModal();
        });
        document.getElementById('bolsaHighlightsToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            bolsaHighlightsVisible = !bolsaHighlightsVisible;
            localStorage.setItem('bolsaHighlightsVisible', bolsaHighlightsVisible);
            render();
        });

        document.getElementById('bolsaDataSourceToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleDataSource();
        });
        document.getElementById('bolsaManualPriceBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openManualPriceModal();
        });
        document.getElementById('bolsaCardsBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            bolsaViewMode = 'cards';
            localStorage.setItem('bolsaViewMode', 'cards');
            if (currentView !== 'bolsa') switchView('bolsa');
            render();
        });
        document.getElementById('bolsaListBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            bolsaViewMode = 'list';
            localStorage.setItem('bolsaViewMode', 'list');
            if (currentView !== 'bolsa') switchView('bolsa');
            render();
        });




        document.getElementById('ahorroAccountsBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ahorroViewMode = 'cards';
            localStorage.setItem('ahorroViewMode', ahorroViewMode);
            if (currentView !== 'ahorro') switchView('ahorro');
            render();
        });
        document.getElementById('ahorroListBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ahorroViewMode = 'list';
            localStorage.setItem('ahorroViewMode', ahorroViewMode);
            if (currentView !== 'ahorro') switchView('ahorro');
            render();
        });
        document.getElementById('ahorroEstadoBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ahorroViewMode = 'estado';
            localStorage.setItem('ahorroViewMode', ahorroViewMode);
            switchView('ahorroEstado');
            render();
        });
        document.getElementById('ahorroCalendarBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ahorroViewMode = 'calendar';
            localStorage.setItem('ahorroViewMode', ahorroViewMode);
            switchView('ahorroCalendar');
            render();
        });


        // Activity Submenu Listeners
        const setActivitySearch = (query) => {
            activityCellFilter = { column: null, value: null };
            // Exit 'all' mode to respect the user's selected scope (month or year) in the UI
            if (activityFilterMode === 'all') {
                activityFilterMode = elements.activityFilterMode?.value || 'month';
            }
            if (elements.activitySearchInput) {
                elements.activitySearchInput.value = query;
            }
            activitySearchQuery = query;
            switchView('activity');
            renderActivity();
        };

        document.getElementById('sidebarFilterBuyBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setActivitySearch('Compra');
        });
        document.getElementById('sidebarFilterDivBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setActivitySearch('Dividendos');
        });
        document.getElementById('sidebarFilterIntBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setActivitySearch('Intereses');
        });
        document.getElementById('sidebarFilterEspBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setActivitySearch('Especulación');
        });
        document.getElementById('sidebarFilterRendBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setActivitySearch('Dividendos | Intereses | Especulación');
        });

        document.getElementById('sidebarFilterStocksBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            const query = stocks.map(s => `Compra + ${s.ticker}`).join(' | ');
            setActivitySearch(query);
        });

        document.getElementById('sidebarFilterAllBtn')?.addEventListener('click', (e) => {
            e.stopPropagation();
            activityCellFilter = { column: null, value: null };
            setActivitySearch('');
        });

        document.getElementById('ahorroBreakdownBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showAhorroBreakdown();
        });
        document.getElementById('ahorroHistoricoBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            switchView('ahorroHistorico');
        });
        document.getElementById('historicoModeMonth')?.addEventListener('click', () => {
            historicoMode = 'month';
            renderAhorroHistorico();
        });
        document.getElementById('historicoModeYear')?.addEventListener('click', () => {
            historicoMode = 'year';
            renderAhorroHistorico();
        });
        document.getElementById('addDrawerBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showAddDrawer();
        });
        document.getElementById('addGlobalMovementBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showGlobalAddMovementModal();
        });

        document.getElementById('addNominaBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showAddNomina();
        });
        document.getElementById('nominaAnalisisViewBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            switchView('analisis');
        });
        document.getElementById('nominaCardsBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            nominaViewMode = 'cards';
            localStorage.setItem('nominaViewMode', 'cards');
            if (currentView !== 'nomina') switchView('nomina');
            render();
        });
        document.getElementById('nominaListBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            nominaViewMode = 'list';
            localStorage.setItem('nominaViewMode', 'list');
            if (currentView !== 'nomina') switchView('nomina');
            render();
        });
        document.getElementById('exportDataBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            exportToCSV();
        });
        document.getElementById('fiscalCountdownBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showFiscalCalendarModal();
        });

        // Independent Chevron Toggle Logic
        document.querySelectorAll('.nav-item-chevron').forEach(chevron => {
            chevron.classList.add('clickable'); // Visual hint
            chevron.style.cursor = 'pointer';
            chevron.style.pointerEvents = 'auto';

            chevron.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const container = chevron.closest('.nav-item-container');
                if (container) {
                    const opening = !container.classList.contains('open');
                    if (opening) collapseOtherSidebarGroups(container);
                    container.classList.toggle('open');

                    // Also trigger navigation for that item
                    const navBtn = container.querySelector('.wealth-nav-item');
                    if (navBtn) {
                        const view = navBtn.getAttribute('data-view');
                        if (view && currentView !== view) {
                            switchView(view);
                        }
                    }
                }
            });
        });

        // ── Nextcloud buttons ──
        document.getElementById('ncTestBtn')?.addEventListener('click', () => ncTestConnection());
        document.getElementById('ncBackupBtn')?.addEventListener('click', () => ncBackupData());
        document.getElementById('ncRestoreBtn')?.addEventListener('click', () => ncRestoreData());

        // Initialize Nextcloud UI on load
        initNextcloudUI();

        document.getElementById('ncAutoUpload')?.addEventListener('change', (e) => {
            localStorage.setItem('ncAutoUpload', e.target.checked);
            if (e.target.checked) ncScheduleAutoUpload();
        });

        // Start Nextcloud auto-sync check on load (short delay to ensure core variables are ready)
        // Start Nextcloud auto-sync check on load
        setTimeout(() => {
            ncSyncOnLoad().then(() => {
                // After initial sync, start background periodic check every 5 minutes
                ncStartPeriodicCheck();
            });
        }, 500);

        // ── Nextcloud sidebar buttons ──
        document.getElementById('sidebarNcBackupBtn')?.addEventListener('click', () => ncBackupData());
        document.getElementById('sidebarNcRestoreBtn')?.addEventListener('click', () => ncRestoreData());
        document.getElementById('sidebarNcExcelBtn')?.addEventListener('click', () => ncExportToExcel());
        elements.sidebarSyncInfo?.addEventListener('click', () => {
            const oldOverlay = document.getElementById('customSyncConfirmOverlay');
            if (oldOverlay) oldOverlay.remove();
            
            const overlay = document.createElement('div');
            overlay.id = 'customSyncConfirmOverlay';
            overlay.style.cssText = `
                position: fixed; inset: 0; background: rgba(0,0,0,0.85); z-index: 20000;
                display: flex; align-items: center; justify-content: center; backdrop-filter: blur(10px);
                padding: 1rem;
            `;
            overlay.innerHTML = `
                <div class="glass-panel" style="background: var(--bg-card); border: 1px solid var(--glass-border); border-radius: 24px; padding: 2.5rem 2rem; width: min(400px, 90vw); text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5);">
                    <div style="font-size: 3.5rem; margin-bottom: 1.5rem;">☁️</div>
                    <h3 style="margin-bottom: 1rem; line-height: 1.5; font-weight: 700; color: white;">Sincronización Nextcloud</h3>
                    <p style="margin-bottom: 2rem; opacity: 0.8; font-size: 0.95rem;">¿Qué acción deseas realizar con Nextcloud?</p>
                    <div style="display: flex; flex-direction: column; gap: 0.75rem;">
                        <button id="syncWriteBtn" class="btn-primary" style="padding: 1rem; border-radius: 12px; font-weight: 700; font-size: 1rem; cursor: pointer;">Grabar (Sobrescribir servidor)</button>
                        <button id="syncReadBtn" class="btn-secondary" style="padding: 1rem; border-radius: 12px; font-weight: 600; font-size: 1rem; background: rgba(59, 130, 246, 0.1); border: 1px solid var(--primary); color: white; cursor: pointer;">Leer (Cargar de servidor)</button>
                        <button id="syncCancelBtn" class="btn-secondary" style="padding: 0.9rem; border-radius: 12px; font-weight: 600; font-size: 0.95rem; margin-top: 0.5rem; cursor: pointer;">Cancelar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);
            
            document.getElementById('syncWriteBtn').onclick = () => {
                overlay.remove();
                ncSafeUpload(true); 
            };
            document.getElementById('syncReadBtn').onclick = () => {
                overlay.remove();
                ncRestoreData(); 
            };
            document.getElementById('syncCancelBtn').onclick = () => {
                overlay.remove();
            };
        });

        // Activity Listeners
        elements.activityLoadMoreBtn?.addEventListener('click', () => {
            activityCurrentLimit += activityPageSize;
            renderActivity();
        });

        elements.activityFilterMode?.addEventListener('change', (e) => {
            activityFilterMode = e.target.value;
            activityCurrentLimit = activityPageSize; // Reset limit
            
            // Normalize activityListMonth when switching
            if (activityFilterMode === 'week') {
                // Default to current week when selecting "Semana"
                activityListMonth = new Date().toISOString().split('T')[0];
            } else if ((activityFilterMode === 'month' || activityFilterMode === 'year') && activityListMonth.length > 7) {
                activityListMonth = activityListMonth.substring(0, 7);
            }
            
            localStorage.setItem('activityFilterMode', activityFilterMode);
            renderActivity();
        });

        elements.activityMonthUp?.addEventListener('click', () => {
            if (activityFilterMode === 'all') {
                activityFilterMode = 'month';
                if (elements.activityFilterMode) elements.activityFilterMode.value = 'month';
            }
            activityCurrentLimit = activityPageSize;
            if (activityFilterMode === 'month') {
                activityListMonth = changeMonthVal(activityListMonth, 1);
            } else if (activityFilterMode === 'week') {
                const d = activityListMonth.length === 7 ? new Date(activityListMonth + "-01") : new Date(activityListMonth);
                d.setDate(d.getDate() + 7);
                activityListMonth = d.toISOString().split('T')[0];
            } else if (activityFilterMode === 'year') {
                let [y, m] = activityListMonth.split('-').map(Number);
                activityListMonth = `${y + 1}-${String(m).padStart(2, '0')}`;
            }
            renderActivity();
        });
        elements.activityMonthDown?.addEventListener('click', () => {
            if (activityFilterMode === 'all') {
                activityFilterMode = 'month';
                if (elements.activityFilterMode) elements.activityFilterMode.value = 'month';
            }
            activityCurrentLimit = activityPageSize;
            if (activityFilterMode === 'month') {
                activityListMonth = changeMonthVal(activityListMonth, -1);
            } else if (activityFilterMode === 'week') {
                const d = activityListMonth.length === 7 ? new Date(activityListMonth + "-01") : new Date(activityListMonth);
                d.setDate(d.getDate() - 7);
                activityListMonth = d.toISOString().split('T')[0];
            } else if (activityFilterMode === 'year') {
                let [y, m] = activityListMonth.split('-').map(Number);
                activityListMonth = `${y - 1}-${String(m).padStart(2, '0')}`;
            }
            renderActivity();
        });

        elements.activitySearchInput?.addEventListener('input', (e) => {
            activitySearchQuery = e.target.value;
            activityCurrentLimit = activityPageSize; // Reset limit on search
            renderActivity();
        });

        elements.activityDrawerFilter?.addEventListener('change', (e) => {
            activityDrawerFilter = e.target.value;
            localStorage.setItem('activityDrawerFilter', activityDrawerFilter);
            activityCurrentLimit = activityPageSize;
            renderActivity();
        });

        elements.activityTable?.querySelector('thead')?.addEventListener('click', (e) => {
            const th = e.target.closest('th[data-sort]');
            if (!th) return;
            const key = th.dataset.sort;
            if (activitySortConfig.key === key) {
                activitySortConfig.direction = activitySortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                activitySortConfig.key = key;
                activitySortConfig.direction = 'asc';
            }
            activityCurrentLimit = activityPageSize; // Reset limit on sort
            localStorage.setItem('activitySortConfig', JSON.stringify(activitySortConfig));
            renderActivity();
        });

        // Goal Modal Listeners
        if (elements.closeGoalModal) {
            elements.closeGoalModal.addEventListener('click', () => {
                elements.goalModal.classList.add('hidden');
            });
        }

        if (elements.goalForm) {
            elements.goalForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const newTarget = parseFloat(elements.goalAmountInput.value.replace(',', '.'));
                const drawer = savingsDrawers.find(d => d.id === currentGoalDrawerId);

                if (drawer && !isNaN(newTarget)) {
                    drawer.targetAmount = Math.max(0, newTarget);
                    if (window.saveSavings) window.saveSavings(savingsDrawers);
                    renderSavings();
                    elements.goalModal.classList.add('hidden');
                }
            });
        }

        // Swipe Navigation for Mobile
        (function () {
            console.log("MSV WealthTrack Booting... Version: 202603180820");
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            const views = ['bolsa', 'ahorro', 'nomina'];

            document.addEventListener('touchstart', e => {
                // Only block swipe if starting on a specific interactive element or modal content that MUST handle its own touches
                if (e.target.closest('button, input, select, textarea, .modal-content, .table-container')) return;

                touchStartX = e.changedTouches[0].clientX;
                touchStartY = e.changedTouches[0].clientY;
            }, { passive: true });

            document.addEventListener('touchend', e => {
                if (e.target.closest('button, input, select, textarea, .modal-content, .table-container')) return;

                touchEndX = e.changedTouches[0].clientX;
                const touchEndY = e.changedTouches[0].clientY;

                const deltaX = touchEndX - touchStartX;
                const deltaY = touchEndY - touchStartY;

                // Threshold: 50px for horizontal swipe, and must be more horizontal than vertical
                if (Math.abs(deltaX) > 50 && Math.abs(deltaX) > Math.abs(deltaY) * 1.3) {
                    const currentIndex = views.indexOf(currentView);
                    if (currentIndex === -1) return;

                    if (deltaX > 0) {
                        // Swipe Right -> Previous View
                        const prevIndex = (currentIndex - 1 + views.length) % views.length;
                        switchView(views[prevIndex]);
                    } else {
                        // Swipe Left -> Next View
                        const nextIndex = (currentIndex + 1) % views.length;
                        switchView(views[nextIndex]);
                    }
                }
            }, { passive: true });
        })();

        if (elements.addDrawerBtn) {
            elements.addDrawerBtn.addEventListener('click', showAddDrawer);
        }
        if (elements.closeSavingsModal) {
            elements.closeSavingsModal.addEventListener('click', () => {
                toggleSavingsModal(false);
                recurringExecutionQueue = []; // Clear queue on manual close
            });
        }
        window.addEventListener('click', (e) => {
            if (e.target === elements.savingsInputModal) {
                toggleSavingsModal(false);
                recurringExecutionQueue = []; // Clear queue on backdrop click
            }
        });

        elements.savingsInputForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const action = elements.savingsActionType.value;
            let rawAmount = parseFloat(elements.movementAmountInput.value);
            const amount = Math.abs(rawAmount);

            // If user explicitly typed a negative number, ensure it's treated as expense
            const typeOverride = (rawAmount < 0) ? 'expense' : (elements.savingsMovementType ? elements.savingsMovementType.value : 'income');

            if (action === 'drawer') {
                const name = elements.drawerNameInput.value.trim();
                const icon = elements.drawerIconInput.value || getBankIcon(name) || '📁';
                const newDrawer = {
                    id: 'drawer_' + Date.now(),
                    name: name || 'Nueva Cuenta',
                    icon: icon,
                    group: elements.drawerGroupInput.value.trim() || '',
                    balance: amount || 0,
                    movements: amount !== 0 ? [{
                        date: new Date().toISOString().split('T')[0],
                        amount: amount || 0,
                        description: 'Saldo inicial'
                    }] : [],
                    isAuto: false
                };
                savingsDrawers.push(newDrawer);
            } else if (action === 'movement' || action === 'global-movement') {
                let drawerId = elements.savingsTargetId.value;
                if (action === 'global-movement') {
                    const targetDrawerSelect = document.getElementById('targetDrawerSelect');
                    if (targetDrawerSelect) drawerId = targetDrawerSelect.value;
                }
                const drawer = savingsDrawers.find(d => d.id === drawerId);
                if (drawer) {
                    const concept = elements.movementConceptInput.value.trim() || 'Ajuste manual';
                    const type = typeOverride; 
                    const finalAmount = type === 'expense' ? -amount : amount;
                    let category = elements.savingsCategorySelect.value;
                    const subcategory = elements.savingsSubcategorySelect?.value || '';
                    if (subcategory) category = `${category}:${subcategory}`;

                    const date = elements.savingsDateInput.value || new Date().toISOString().split('T')[0];

                    drawer.balance += finalAmount;
                    drawer.movements.push({
                        date: date,
                        amount: finalAmount,
                        description: concept,
                        category: category,
                        isPeriodic: elements.savingsRecurringInput?.checked || false,
                        isMaxTotal: document.getElementById('movementIsMaxTotalInput')?.checked || false
                    });

                    // Recurring Sync Logic
                    if (elements.savingsRecurringInput?.checked) {
                        const templateAmount = Math.abs(finalAmount);
                        const exists = recurringSavingsMovements.some(t => 
                            t.type === 'movement' && t.drawerId == drawerId && Math.abs(t.amount) == templateAmount && t.description == concept
                        );
                        
                        if (!exists) {
                            recurringSavingsMovements.push({
                                id: 'rec_' + Date.now(),
                                type: 'movement',
                                drawerId: drawerId,
                                amount: amount,
                                description: concept,
                                category: category,
                                isIncome: type === 'income'
                            });
                            if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
                        }
                    }
                }
            } else if (action === 'transfer') {
                const fromId = elements.savingsTargetId.value;
                const toId = elements.transferTargetSelect.value;
                const fromDrawer = savingsDrawers.find(d => d.id == fromId);
                const toDrawer = savingsDrawers.find(d => d.id == toId);

                if (fromDrawer && toDrawer && amount > 0) {
                    const concept = elements.movementConceptInput.value.trim() || `Traspaso a ${toDrawer.name}`;
                    const targetConcept = `Traspaso desde ${fromDrawer.name}`;
                    const customDate = elements.savingsDateInput.value || new Date().toISOString().split('T')[0];
                    const transferId = 'tr_' + Date.now();

                    let category = elements.savingsCategorySelect?.value || 'Traspaso';
                    const subcategory = elements.savingsSubcategorySelect?.value || '';
                    if (subcategory) category = `${category}:${subcategory}`;

                    // Subtract from source
                    fromDrawer.balance -= amount;
                    fromDrawer.movements.push({
                        id: 'mv_' + Date.now() + '_src',
                        date: customDate,
                        amount: -amount,
                        description: concept,
                        category: category,
                        transferId: transferId,
                        isPeriodic: elements.savingsRecurringInput?.checked || false
                    });

                    // Add to target
                    toDrawer.balance += amount;
                    toDrawer.movements.push({
                        id: 'mv_' + Date.now() + '_dst',
                        date: customDate,
                        amount: amount,
                        description: targetConcept,
                        category: category,
                        transferId: transferId,
                        isPeriodic: elements.savingsRecurringInput?.checked || false
                    });

                    // Recurring Sync Logic
                    if (elements.savingsRecurringInput?.checked) {
                        const exists = recurringSavingsMovements.some(t => 
                            t.type === 'transfer' && t.fromDrawerId == fromId && t.toDrawerId == toId && Math.abs(t.amount) == amount
                        );

                        if (!exists) {
                            recurringSavingsMovements.push({
                                id: 'rec_' + Date.now(),
                                type: 'transfer',
                                fromDrawerId: fromId,
                                toDrawerId: toId,
                                amount: amount,
                                description: concept.replace('Traspaso a ', ''),
                                category: category
                            });
                            if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
                        }
                    }
                } else if (amount <= 0) {
                    alert("El importe del traspaso debe ser mayor que cero.");
                    return;
                }
            } else if (action === 'edit-drawer') {
                const drawerId = elements.savingsTargetId.value;
                const drawer = savingsDrawers.find(d => d.id === drawerId);
                if (drawer) {
                    const newName = elements.drawerNameInput.value.trim();
                    const newAmount = amount || 0;

                    drawer.name = newName || drawer.name;
                    drawer.group = elements.drawerGroupInput.value.trim() || '';
                    if (elements.drawerIconInput) drawer.icon = elements.drawerIconInput.value;

                    // Find initial movement with same logic as modal display
                    const allMovementsSync = [...(drawer.movements || [])].sort((a, b) => parseAppDate(a.date) - parseAppDate(b.date));
                    let initialMvmt = allMovementsSync.find(m => (m.description || m.concept || "").toLowerCase().includes('saldo inicial'))
                                    || allMovementsSync.find(m => isProvision(m));
                    
                    const oldInitialAmount = initialMvmt ? initialMvmt.amount : 0;
                    const newDate = elements.savingsDateInput.value;

                    if (initialMvmt) {
                        initialMvmt.amount = newAmount;
                        if (newDate) initialMvmt.date = newDate;
                    } else if (newAmount !== 0) {
                        drawer.movements.unshift({
                            id: Date.now() + Math.random(),
                            date: newDate || new Date().toISOString().split('T')[0],
                            amount: newAmount,
                            description: 'Saldo inicial',
                            concept: 'Saldo inicial'
                        });
                    }

                    drawer.balance += (newAmount - oldInitialAmount);
                }
            } else if (action === 'edit-movement') {
                const drawerId = elements.savingsTargetId.value;
                const mIndex = parseInt(document.getElementById('savingsMovementIndex').value);
                const drawer = savingsDrawers.find(d => d.id === drawerId);
                if (drawer && drawer.movements[mIndex]) {
                    const movement = drawer.movements[mIndex];
                    const concept = elements.movementConceptInput.value.trim() || movement.description;
                    const oldAmount = movement.amount;
                    let category = elements.savingsCategorySelect.value;
                    const subcategory = elements.savingsSubcategorySelect?.value || '';
                    if (subcategory) category = `${category}:${subcategory}`;

                    const date = elements.savingsDateInput.value || movement.date;

                    const type = (parseFloat(elements.movementAmountInput.value) < 0) ? 'expense' : elements.savingsMovementType.value;
                    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

                    movement.amount = finalAmount;
                    movement.description = concept;
                    movement.category = category;
                    movement.date = date;
                    movement.isPeriodic = elements.savingsRecurringInput?.checked || false;
                    movement.isMaxTotal = document.getElementById('movementIsMaxTotalInput')?.checked || false;
                    drawer.balance += (finalAmount - oldAmount);

                    // Recurring Sync Logic
                    if (elements.savingsRecurringInput) {
                        const isChecked = elements.savingsRecurringInput.checked;
                        const templateAmount = Math.abs(finalAmount);

                        if (isChecked) {
                            // Check if it already exists to avoid duplicates
                            const exists = recurringSavingsMovements.some(t => {
                                if (t.type === 'movement') {
                                    return t.drawerId == drawerId && Math.abs(t.amount) == templateAmount && t.description == concept;
                                } else if (t.type === 'transfer' && movement.transferId) {
                                    return (t.fromDrawerId == drawerId || t.toDrawerId == drawerId) && Math.abs(t.amount) == templateAmount;
                                }
                                return false;
                            });

                            if (!exists) {
                                if (movement.transferId) {
                                    // Find other leg
                                    let fromId = drawerId;
                                    let toId = null;
                                    savingsDrawers.forEach(d => {
                                        d.movements.forEach(m => {
                                            if (m.transferId === movement.transferId && m !== movement) {
                                                toId = d.id;
                                            }
                                        });
                                    });

                                    if (finalAmount > 0) { // We're editing the credit leg. Swap for From/To
                                        const temp = fromId; fromId = toId; toId = temp;
                                    }

                                    recurringSavingsMovements.push({
                                        id: 'rec_' + Date.now(),
                                        type: 'transfer',
                                        fromDrawerId: fromId,
                                        toDrawerId: toId,
                                        amount: templateAmount,
                                        description: concept.replace('Traspaso desde ', '').replace('Traspaso a ', ''),
                                        category: category
                                    });
                                } else {
                                    recurringSavingsMovements.push({
                                        id: 'rec_' + Date.now(),
                                        type: 'movement',
                                        drawerId: drawerId,
                                        amount: amount,
                                        description: concept,
                                        category: category,
                                        isIncome: type === 'income'
                                    });
                                }
                                if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
                            }
                        } else {
                            // REMOVE if exists
                            const originalLen = recurringSavingsMovements.length;
                            recurringSavingsMovements = recurringSavingsMovements.filter(t => {
                                if (t.type === 'movement') {
                                    return !(t.drawerId == drawerId && Math.abs(t.amount) == templateAmount && t.description == concept);
                                } else if (t.type === 'transfer' && movement.transferId) {
                                    // Remove the transfer template if it involves this drawer and amount
                                    return !((t.fromDrawerId == drawerId || t.toDrawerId == drawerId) && Math.abs(t.amount) == templateAmount);
                                }
                                return true;
                            });
                            if (recurringSavingsMovements.length !== originalLen) {
                                if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
                            }
                        }
                    }
                }
            }

            if (window.saveSavings) window.saveSavings(savingsDrawers);
            toggleSavingsModal(false);
            render();

            if (recurringExecutionQueue.length > 0) {
                setTimeout(() => processNextRecurringInQueue(), 400); // Small delay for UX
            }
        });

        // Set up recurring movements listeners
        if (elements.recurringMovementsBtn) {
            elements.recurringMovementsBtn.onclick = () => {
                renderRecurringMovements();
                elements.recurringMovementsModal.classList.remove('hidden');
            };
        }
        if (elements.closeRecurringMovementsModal) {
            elements.closeRecurringMovementsModal.onclick = () => {
                elements.recurringMovementsModal.classList.add('hidden');
            };
        }
        if (elements.executeRecurringMovementsBtn) {
            elements.executeRecurringMovementsBtn.onclick = executeRecurringMovements;
        }

        // Nomina View Mode Listeners
        if (elements.nominaAnalisisViewBtn) {
            elements.nominaAnalisisViewBtn.addEventListener('click', () => {
                switchView('analisis');
            });
        }
        if (elements.nominaViewToggleBtn) {
            elements.nominaViewToggleBtn.onclick = toggleNominaView;
        }

        // Nomina Listeners


        if (elements.importSavingsBtn) {
            elements.importSavingsBtn.addEventListener('click', () => {
                alert('La importación de CSV ha sido desactivada. Usa el backup JSON global.');
            });
        }

        elements.closeModal?.addEventListener('click', () => toggleModal(false));
        elements.closeFinModal?.addEventListener('click', () => elements.financialDetailsModal.classList.add('hidden'));

        if (elements.closeMonthDetailModal) {
            elements.closeMonthDetailModal.onclick = () => {
                if (elements.monthDetailModal) elements.monthDetailModal.classList.add('hidden');
            };
        }

        // Close on outside click for monthDetailModal
        window.onclick = (e) => {
            if (e.target === elements.addStockModal) toggleModal(false);
            if (e.target === elements.financialDetailsModal) elements.financialDetailsModal.classList.add('hidden');
            if (e.target === elements.savingsInputModal) toggleSavingsModal(false);
            if (e.target === elements.nominaModal) toggleNominaModal(false);
            if (e.target === elements.nominaMovementModal) toggleNominaMovementModal(false);
            if (e.target === elements.nominaHistoryModal) elements.nominaHistoryModal.classList.add('hidden');
            if (e.target === elements.monthDetailModal) elements.monthDetailModal.classList.add('hidden');
            if (e.target === elements.fiscalCalendarModal) elements.fiscalCalendarModal.classList.add('hidden');
        };

        if (elements.addNominaBtn) {
            elements.addNominaBtn.addEventListener('click', () => showAddNomina());
        }
        if (elements.closeNominaModal) {
            elements.closeNominaModal.addEventListener('click', () => toggleNominaModal(false));
        }

        if (elements.importNominaBtn) {
            elements.importNominaBtn.addEventListener('click', () => {
                alert('La importación de CSV ha sido desactivada. Usa el backup JSON global.');
            });
        }
        if (elements.closeNominaMovementModal) {
            elements.closeNominaMovementModal.addEventListener('click', () => toggleNominaMovementModal(false));
        }
        if (elements.closeNominaHistoryModal) {
            elements.closeNominaHistoryModal.addEventListener('click', () => elements.nominaHistoryModal.classList.add('hidden'));
        }
        if (elements.fiscalCountdownBtn) {
            console.log("Attaching listener to fiscalCountdownBtn");
            elements.fiscalCountdownBtn.onclick = (e) => {
                e.preventDefault();
                console.log("fiscalCountdownBtn clicked");
                showFiscalCalendarModal();
            };
        }
        if (elements.closeFiscalCalendarModal) {
            elements.closeFiscalCalendarModal.onclick = () => {
                elements.fiscalCalendarModal.classList.add('hidden');
            };
        }
        // nominaCsvInput listener removed

        elements.nominaForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const name = elements.nominaNameInput.value.trim();
            const initialAmount = parseFloat(elements.nominaAmountInput.value) || 0;
            const type = elements.nominaTypeSelect.value;
            const checkedBoxes = Array.from(elements.nominaDrawerMonthsCheckboxes.querySelectorAll('input:checked'));
            const activeMonths = checkedBoxes.map(cb => parseInt(cb.value));
            const editId = elements.nominaEditId.value;

            if (editId) {
                const drawer = nominaData.find(d => d.id == editId);
                if (drawer) {
                    drawer.name = name;
                    drawer.type = type;
                    drawer.icon = elements.nominaIconInput.value || getNominaIcon(name, type);
                    drawer.linkedSavingsDrawerId = elements.nominaLinkedAhorroSelect ? elements.nominaLinkedAhorroSelect.value : '';
                    // Update initial movement if amount changed
                    let initialMvmt = (drawer.movements || []).find(m => isProvision(m));
                    if (initialMvmt) {
                        initialMvmt.amount = Math.abs(initialAmount); // Ensure positive
                        initialMvmt.activeMonths = activeMonths;
                    }
                }
            } else {
                const newDrawer = {
                    id: Date.now(),
                    name: name,
                    type: type,
                    icon: elements.nominaIconInput.value || getNominaIcon(name, type),
                    linkedSavingsDrawerId: elements.nominaLinkedAhorroSelect ? elements.nominaLinkedAhorroSelect.value : '',
                    movements: [{
                        id: Date.now() + Math.random(),
                        date: new Date().toISOString().split('T')[0],
                        amount: Math.abs(initialAmount), // Ensure positive
                        description: 'Saldo inicial',
                        concept: 'Saldo inicial',
                        activeMonths: activeMonths,
                        paid: false
                    }]
                };
                nominaData.push(newDrawer);
            }

            if (window.saveNomina) window.saveNomina(nominaData);
            toggleNominaModal(false);
            renderNomina();
        });

        // Analisis Listeners
        if (elements.analisisTableViewBtn) {
            elements.analisisTableViewBtn.onclick = () => {
                analisisViewMode = 'list';
                renderAnalisis();
            };
        }
        if (elements.analisisCardViewBtn) {
            elements.analisisCardViewBtn.onclick = () => {
                analisisViewMode = 'cards';
                renderAnalisis();
            };
        }
        if (elements.analisisMobileTitle) {
            elements.analisisMobileTitle.onclick = () => {
                analisisViewMode = analisisViewMode === 'list' ? 'cards' : 'list';
                renderAnalisis();
            };
        }

        // Analisis Click Listener (Delegated for Sorting and Month Detail)
        if (elements.analisisSection) {
            elements.analisisSection.addEventListener('click', (e) => {
                // Check for sorting click
                const sortTrigger = e.target.closest('th[data-sort]');
                if (sortTrigger) {
                    const key = sortTrigger.dataset.sort;
                    if (analisisSortConfig.key === key) {
                        analisisSortConfig.direction = analisisSortConfig.direction === 'asc' ? 'desc' : 'asc';
                    } else {
                        analisisSortConfig.key = key;
                        analisisSortConfig.direction = 'asc';
                    }
                    localStorage.setItem('analisisSortConfig', JSON.stringify(analisisSortConfig));
                    renderAnalisis();
                    return; // Sorting handled
                }

                // Check for month detail click (row or card)
                const monthTrigger = e.target.closest('[data-month]');
                if (monthTrigger) {
                    const monthNum = parseInt(monthTrigger.dataset.month);
                    if (monthNum && window.showMonthDetailModal) {
                        window.showMonthDetailModal(monthNum);
                    }
                }
            });
        }

        elements.nominaMovementForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const drawerId = elements.nominaMovementTargetId.value;
            let amount = parseFloat(elements.nominaMovementAmountInput.value);
            const concept = elements.nominaMovementConceptInput.value.trim() || 'Ajuste manual';
            const checkedBoxes = Array.from(elements.nominaMonthsCheckboxes.querySelectorAll('input:checked'));
            const activeMonths = checkedBoxes.map(cb => parseInt(cb.value));
            const editIndex = elements.nominaMovementEditIndex.value;

            const drawer = nominaData.find(d => d.id == drawerId);
            if (drawer) {
                // Validation for automatic drawer: expenses cannot exceed residue
                if (drawer.isAutomatic && amount < 0) {
                    const fiscalMonthStr = getFiscalMonth();
                    const currentMonthNum = parseInt(fiscalMonthStr.split('-')[1]);
                    const monthlyMovements = (drawer.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));

                    // Exclude the current movement being edited from the balance if applicable
                    const otherMovements = (editIndex !== '')
                        ? monthlyMovements.filter((_, idx) => idx !== parseInt(editIndex))
                        : monthlyMovements;

                    const currentBalance = otherMovements.reduce((sum, m) => sum + m.amount, 0);

                    if (currentBalance + amount < 0) {
                        alert(`Gasto excesivo. El saldo disponible en "Dinero No Destinado" es ${fmtEUR(currentBalance)}.`);
                        return;
                    }
                }
                const isInitial = concept.toLowerCase().trim() === 'saldo inicial';

                if (isInitial) {
                    amount = Math.abs(amount);
                } else {
                    const type = elements.nominaMovementType.value;
                    if (type === 'expense') {
                        amount = -Math.abs(amount);
                    } else {
                        amount = Math.abs(amount);
                    }
                }

                if (editIndex !== '') {
                    const idx = parseInt(editIndex);
                    drawer.movements[idx] = {
                        ...drawer.movements[idx],
                        amount: amount,
                        concept: concept,
                        description: concept, // Standardize
                        activeMonths: activeMonths,
                        isMaxTotal: document.getElementById('nominaMovementIsMaxTotalInput')?.checked || false
                    };
                } else {
                    drawer.movements.push({
                        id: Date.now() + Math.random(),
                        date: new Date().toISOString().split('T')[0],
                        amount: amount,
                        concept: concept,
                        description: concept,
                        activeMonths: activeMonths,
                        paid: false,
                        isMaxTotal: document.getElementById('nominaMovementIsMaxTotalInput')?.checked || false
                    });
                }

                if (window.saveNomina) window.saveNomina(nominaData);
                toggleNominaMovementModal(false);
                renderNomina();
                if (editIndex !== '') showNominaDrawerDetails(drawerId);
            }
        });

        elements.savingsMovementIncomeToggle?.addEventListener('click', () => updateSavingsMovementType('income'));
        elements.savingsMovementExpenseToggle?.addEventListener('click', () => updateSavingsMovementType('expense'));

        elements.nominaMovementIncomeToggle?.addEventListener('click', () => updateNominaMovementType('income'));
        elements.nominaMovementExpenseToggle?.addEventListener('click', () => updateNominaMovementType('expense'));

        elements.selectAllMonths?.addEventListener('click', () => {
            const boxes = elements.nominaMonthsCheckboxes.querySelectorAll('input');
            const allChecked = Array.from(boxes).every(cb => cb.checked);
            boxes.forEach(cb => cb.checked = !allChecked);
            elements.selectAllMonths.textContent = allChecked ? 'Todos' : 'Ninguno';
        });

        elements.selectAllDrawerMonths?.addEventListener('click', () => {
            const boxes = elements.nominaDrawerMonthsCheckboxes.querySelectorAll('input');
            const allChecked = Array.from(boxes).every(cb => cb.checked);
            boxes.forEach(cb => cb.checked = !allChecked);
            elements.selectAllDrawerMonths.textContent = allChecked ? 'Todos' : 'Ninguno';
        });
        elements.addStockForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const qty = parseFloat(elements.qtyInput.value);
            const totalInvested = parseFloat(elements.priceInput.value);
            const calculatedPrice = totalInvested / qty;

            let tickerInput = elements.tickerInput.value.trim().toUpperCase();

            // Normalize .ES to .MC for API compatibility
            if (tickerInput.endsWith('.ES')) {
                tickerInput = tickerInput.replace('.ES', '.MC');
            }

            const mockInfo = window.MOCK_DATA[tickerInput];

            const stockData = {
                ticker: tickerInput,
                name: mockInfo ? mockInfo.name : tickerInput,
                market: elements.marketSelect.value,
                date: elements.dateInput.value,
                qty: qty,
                price: calculatedPrice
            };

            const editId = elements.editId.value;
            if (editId) {
                stockData.id = editId;
            }

            if (!editId && elements.fundSourceSelect && elements.fundSourceSelect.value) {
                const drawerId = elements.fundSourceSelect.value;
                const drawer = savingsDrawers.find(d => d.id === drawerId);
                if (drawer) {
                    stockData.sourceDrawerId = drawerId;
                    drawer.balance -= totalInvested;
                    drawer.movements.push({
                        id: Date.now() + Math.random(),
                        date: elements.dateInput.value || new Date().toISOString().split('T')[0],
                        amount: -totalInvested, // Se guarda en negativo para la lógica de saldo
                        description: `Inversión en ${stockData.name}`,
                        concept: `Inversión en ${stockData.name}`,
                        category: 'Inversión', // Nueva categoría para identificarlo
                        activeMonths: [parseInt((elements.dateInput.value || new Date().toISOString().split('T')[0]).split('-')[1])],
                        paid: false
                    });
                    if (window.saveSavings) window.saveSavings(savingsDrawers);

                    // Force re-render of Ahorro view to reflect new balance silently
                    if (typeof renderSavings === 'function') renderSavings();
                }
            }

            addStock(stockData);
        });

        // Ahorro View Toggles
        elements.ahorroViewToggleBtn?.addEventListener('click', toggleAhorroView);
        document.getElementById('ahorroCalendarViewToggleBtn')?.addEventListener('click', toggleAhorroView);
        document.getElementById('ahorroEstadoViewToggleBtn')?.addEventListener('click', toggleAhorroView);


        elements.ahorroFilterMode?.addEventListener('change', (e) => {
            ahorroFilterMode = e.target.value;
            // Normalize date when switching
            if (ahorroFilterMode === 'week') {
                // Default to current week when selecting "Semana"
                ahorroListMonth = new Date().toISOString().split('T')[0];
            } else if ((ahorroFilterMode === 'month' || ahorroFilterMode === 'year') && ahorroListMonth.length > 7) {
                ahorroListMonth = ahorroListMonth.substring(0, 7);
            }
            localStorage.setItem('ahorroFilterMode', ahorroFilterMode);
            renderSavings();
        });

        elements.ahorroListFilterMode?.addEventListener('click', (e) => {
            ahorroListFilterMode = ahorroListFilterMode === 'detail' ? 'totals' : 'detail';
            localStorage.setItem('ahorroListFilterMode', ahorroListFilterMode);
            renderSavings();
        });

        elements.nominaListFilterMode?.addEventListener('click', (e) => {
            nominaListFilterMode = nominaListFilterMode === 'detail' ? 'totals' : 'detail';
            localStorage.setItem('nominaListFilterMode', nominaListFilterMode);
            renderNomina();
        });

        // Ahorro Table Sorting Listener (Event Delegation)
        const ahorroTable = elements.ahorroTableContainer?.querySelector('table');
        ahorroTable?.querySelector('thead')?.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th || !th.dataset.sort) return;

            const key = th.dataset.sort;
            if (ahorroSortConfig.key === key) {
                ahorroSortConfig.direction = ahorroSortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                ahorroSortConfig.key = key;
                ahorroSortConfig.direction = 'asc';
            }
            localStorage.setItem('ahorroSortConfig', JSON.stringify(ahorroSortConfig));
            renderSavings();
        });

        // Search logic
        elements.tickerInput?.addEventListener('input', (e) => {
            const query = e.target.value.trim().toUpperCase();
            if (!query) {
                elements.searchResults.classList.add('hidden');
                return;
            }

            const matches = window.SEARCH_DATA.filter(item =>
                item.ticker.toUpperCase().includes(query) ||
                item.name.toUpperCase().includes(query)
            ).slice(0, 6);

            if (matches.length > 0) {
                elements.searchResults.innerHTML = matches.map(m =>
                    `<div class="search-item" data-ticker="${m.ticker}" data-name="${m.name}">
                        <span class="ticker">${m.ticker}</span>
                        <span class="name">${m.name}</span>
                    </div>`
                ).join('');
            } else {
                elements.searchResults.innerHTML = `<div class="search-item no-results" style="cursor: default; opacity: 0.7;">No se encontraron resultados.</div>`;
            }
            elements.searchResults.classList.remove('hidden');
        });

        elements.searchResults?.addEventListener('mousedown', (e) => {
            e.preventDefault(); // Crucial to prevent blur on input before selection
            const item = e.target.closest('.search-item');
            if (item && !item.classList.contains('no-results')) {
                const ticker = item.dataset.ticker;
                elements.tickerInput.value = ticker;
                elements.searchResults.classList.add('hidden');

                // Better auto-set market based on ticker and database
                const mockInfo = window.MOCK_DATA[ticker];
                if (ticker.endsWith('.MC')) {
                    elements.marketSelect.value = 'IBEX35';
                } else if (mockInfo && mockInfo.currency === 'USD') {
                    // Default to NASDAQ for tech or SP500 for others if not specified
                    const nasdaqTickers = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'PYPL', 'NFLX', 'AMD', 'META'];
                    elements.marketSelect.value = nasdaqTickers.includes(ticker) ? 'NASDAQ' : 'SP500';
                }
            }
        });

        // Hide search results when clicking outside
        document.addEventListener('click', (e) => {
            if (!elements.tickerInput.contains(e.target) && !elements.searchResults.contains(e.target)) {
                elements.searchResults.classList.add('hidden');
            }
        });



        // Table sorting listeners (Event Delegation)
        const stockThead = elements.stockTable?.querySelector('thead');
        if (stockThead) {
            stockThead.addEventListener('click', (e) => {
                const th = e.target.closest('th[data-sort]');
                if (!th) return;

                const key = th.dataset.sort;
                const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';

                sortConfig = { key, direction };
                localStorage.setItem('bolsaSortConfig', JSON.stringify(sortConfig));
                render();
            });
        }

        // --- Data Portability (Export/Import) ---

        elements.bolsaManualPriceBtn?.addEventListener('click', openManualPriceModal);
        elements.closeManualPriceModal?.addEventListener('click', () => {
            elements.manualPriceModal?.classList.add('hidden');
        });
        elements.saveManualPricesBtn?.addEventListener('click', saveManualPrices);
        elements.clearManualPricesBtn?.addEventListener('click', clearAllManualPrices);

        elements.exportDataBtn?.addEventListener('click', () => {
            exportToCSV(false); // standard CSV
        });

        // Nomina Table Sorting Listener (Event Delegation)
        const nominaTable = elements.nominaTableContainer?.querySelector('table');
        nominaTable?.querySelector('thead')?.addEventListener('click', (e) => {
            const th = e.target.closest('th');
            if (!th || !th.dataset.sort) return;

            const key = th.dataset.sort;
            if (nominaSortConfig.key === key) {
                nominaSortConfig.direction = nominaSortConfig.direction === 'asc' ? 'desc' : 'asc';
            } else {
                nominaSortConfig.key = key;
                nominaSortConfig.direction = 'asc';
            }
            localStorage.setItem('nominaSortConfig', JSON.stringify(nominaSortConfig));
            renderNominaList();
        });

        elements.importDataBtn?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json';

            input.onchange = ev => {
                const file = ev.target.files[0];
                if (!file) return;

                const reader = new FileReader();
                reader.onload = readerEvent => {
                    try {
                        const content = JSON.parse(readerEvent.target.result);
                        if (Array.isArray(content)) {
                            showCustomConfirm('¿Estás seguro de que quieres importar estos datos? Reemplazarán tu cartera actual.', () => {
                                stocks = content;
                                if (window.saveStocks) window.saveStocks(stocks);
                                render();
                                showToast('¡Datos importados con éxito!', 'success');
                            });
                        } else {
                            alert('El archivo no tiene el formato JSON correcto.');
                        }
                    } catch (err) {
                        console.error('Import error:', err);
                        alert('Error al leer el archivo JSON.');
                    }
                };
                reader.readAsText(file, 'UTF-8');
            };
            input.click();
        });

        // Global JSON Backup Listeners
        if (elements.globalExportBtn) {
            elements.globalExportBtn.addEventListener('click', exportGlobalJSON);
        }
        if (elements.globalImportBtn) {
            elements.globalImportBtn.addEventListener('click', () => {
                elements.globalJsonInput?.click();
            });
        }
        if (elements.globalJsonInput) {
            elements.globalJsonInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) importGlobalJSON(e.target.files[0]);
                e.target.value = '';
            });
        }
        let isSyncing = false;

        async function manualRefreshBolsa() {
            if (isSyncing) return;
            isSyncing = true;

            const btn1 = elements.manualRefreshBtn;
            const btn2 = document.getElementById('bolsaRefreshBtn2');
            const btn2Icon = btn2?.querySelector('span');

            const originalContent1 = btn1 ? btn1.textContent : '';
            const originalContent2 = btn2Icon ? btn2Icon.textContent : '';

            if (btn1) {
                btn1.classList.add('spin-animation');
                btn1.style.color = '#f59e0b';
                btn1.style.fontWeight = '700';
            }
            if (btn2Icon) {
                btn2Icon.classList.add('spin-animation');
                btn2Icon.style.color = '#f59e0b';
            }

            const currentTimerElement = document.getElementById('updateTimer');
            if (currentTimerElement) {
                currentTimerElement.classList.remove('hidden');
                currentTimerElement.textContent = `Actualizando Divisa USD/EUR...`;
                currentTimerElement.style.color = '#f59e0b';
            }

            try {
                if (window.refreshFXRate) {
                    if (currentTimerElement) currentTimerElement.textContent = `Actualizando Divisa USD/EUR...`;
                    await window.refreshFXRate();
                }

                if (window.FINNHUB_API_KEY) {
                    const uniqueTickers = [...new Set(stocks.map(s => s.ticker))];
                    await window.refreshLivePrices(uniqueTickers, (current, total) => {
                        if (btn1) {
                            btn1.textContent = current;
                            btn1.style.fontSize = '1rem';
                        }
                        if (btn2Icon) {
                            btn2Icon.textContent = current;
                        }
                        if (currentTimerElement) {
                            currentTimerElement.textContent = `Sincronizando: ${current} de ${total}`;
                        }
                    });
                }
                lastSyncTime = new Date().toLocaleTimeString();
                isFirstUpdateDone = true;
                render();

                if (currentTimerElement) {
                    currentTimerElement.style.color = '#10b981';
                    currentTimerElement.textContent = `¡Sincronización completada! (${lastSyncTime})`;
                    setTimeout(() => currentTimerElement.classList.add('hidden'), 3000);
                }

                document.querySelectorAll('.summary-card').forEach(card => {
                    card.classList.remove('sync-flash');
                    void card.offsetWidth;
                    card.classList.add('sync-flash');
                });
            } finally {
                isSyncing = false;
                if (btn1) {
                    btn1.classList.remove('spin-animation');
                    btn1.textContent = originalContent1;
                    btn1.style.fontSize = '';
                    btn1.style.color = '';
                    btn1.style.fontWeight = '';
                }
                if (btn2Icon) {
                    btn2Icon.classList.remove('spin-animation');
                    btn2Icon.textContent = originalContent2;
                    btn2Icon.style.color = '';
                }
            }
        }

        if (elements.manualRefreshBtn) {
            elements.manualRefreshBtn.addEventListener('click', manualRefreshBolsa);
        }

        document.getElementById('bolsaRefreshBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            manualRefreshBolsa();
        });

        // Bolsa View Toggle
        if (elements.bolsaViewToggleBtn) {
            elements.bolsaViewToggleBtn.addEventListener('click', toggleBolsaView);
        }

        // Mobile: tap "Sus Inversiones" title to toggle list/cards view
        const bolsaMobileTitle = document.getElementById('bolsaMobileTitle');
        if (bolsaMobileTitle) {
            bolsaMobileTitle.style.cursor = 'pointer';
            const updateMobileTitle = () => {
                if (bolsaViewMode === 'cards') {
                    bolsaMobileTitle.textContent = 'Mis Acciones 🃏';
                } else if (!bolsaTotalsMode) {
                    bolsaMobileTitle.textContent = 'Mis Acciones 📋';
                } else {
                    bolsaMobileTitle.textContent = 'Mis Acciones 📊';
                }
            };
            updateMobileTitle();
            bolsaMobileTitle.addEventListener('click', () => {
                toggleBolsaView(); // Use the unified toggle logic
                updateMobileTitle();
            });
        }

        // Bolsa Highlights Toggle
        if (elements.bolsaHighlightsToggleBtn) {
            elements.bolsaHighlightsToggleBtn.addEventListener('click', () => {
                bolsaHighlightsVisible = !bolsaHighlightsVisible;
                localStorage.setItem('bolsaHighlightsVisible', bolsaHighlightsVisible);
                render();
            });
        }





        // ── Mobile Tooltip System (Long Press) ──
        (function () {
            let tooltipTimeout;
            let currentTooltipItem = null;
            let longPressTriggered = false;

            const showTooltip = (el, x, y) => {
                const text = el.getAttribute('title');
                if (!text) return;

                if (currentTooltipItem) currentTooltipItem.remove();

                const tip = document.createElement('div');
                tip.className = 'mobile-tooltip';
                tip.textContent = text;
                document.body.appendChild(tip);

                // Center above the point
                tip.style.left = `${x}px`;
                tip.style.top = `${y}px`;

                // Force layout for animation
                requestAnimationFrame(() => tip.classList.add('visible'));
                currentTooltipItem = tip;
            };

            const hideTooltip = () => {
                if (currentTooltipItem) {
                    currentTooltipItem.classList.remove('visible');
                    const tipToRemove = currentTooltipItem;
                    setTimeout(() => tipToRemove.remove(), 250);
                    currentTooltipItem = null;
                }
            };

            document.addEventListener('touchstart', (e) => {
                const target = e.target.closest('[title]');
                if (!target) return;

                longPressTriggered = false;
                const touch = e.touches[0];
                const x = touch.clientX;
                const y = touch.clientY;

                tooltipTimeout = setTimeout(() => {
                    showTooltip(target, x, y);
                    longPressTriggered = true;
                    // Vibrate if supported
                    if ('vibrate' in navigator) navigator.vibrate(50);
                }, 400);
            }, { passive: true });

            document.addEventListener('touchend', (e) => {
                clearTimeout(tooltipTimeout);
                hideTooltip();

                if (longPressTriggered) {
                    // Prevent the click action after a long press
                    if (e.cancelable) e.preventDefault();
                    longPressTriggered = false;
                }
            }, { passive: false });

            document.addEventListener('touchmove', () => {
                clearTimeout(tooltipTimeout);
                hideTooltip();
            }, { passive: true });

            document.addEventListener('touchcancel', () => {
                clearTimeout(tooltipTimeout);
                hideTooltip();
            }, { passive: true });
        })();

        // --- Ahorro Breakdown Listeners ---
        if (elements.ahorroBreakdownBtn) {
            elements.ahorroBreakdownBtn.addEventListener('click', showAhorroBreakdown);
        }

        const openDefaultBreakdown = () => {
            const defaultSourceId = localStorage.getItem('defaultTransferSource');
            if (!defaultSourceId) {
                alert("No hay una cuenta de traspaso por defecto seleccionada en los Ajustes.");
                return;
            }
            breakdownDrawerFilter = defaultSourceId;
            breakdownContext = 'bolsa';
            const now = new Date();
            if (elements.breakdownMonthInput) {
                elements.breakdownMonthInput.value = getFiscalMonth(now);
            }
            if (elements.breakdownYearInput) {
                elements.breakdownYearInput.value = getFiscalMonth(now).split('-')[0];
            }
            elements.breakdownDetailContainer?.classList.add('hidden');
            currentActiveBreakdownCategory = null;
            updateAhorroBreakdown();
            elements.ahorroBreakdownModal?.classList.remove('hidden');
        };

        if (elements.bolsaBreakdownBtn) {
            elements.bolsaBreakdownBtn.addEventListener('click', openDefaultBreakdown);
        }
        document.getElementById('bolsaBreakdownBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            openDefaultBreakdown();
        });

        // ── Bolsa Calendar Event Listeners ──
        document.getElementById('bolsaCalendarBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            showBolsaCalendar();
            closeMobileSidebar();
        });

        elements.closeBolsaCalendarModal?.addEventListener('click', () => {
            if (elements.bolsaCalendarModal) {
                elements.bolsaCalendarModal.classList.add('hidden');
                elements.bolsaCalendarModal.style.display = '';
            }
        });

        elements.prevBolsaCalendarMonth?.addEventListener('click', () => {
            bolsaCalendarViewDate.setDate(1);
            bolsaCalendarViewDate.setMonth(bolsaCalendarViewDate.getMonth() - 1);
            renderBolsaCalendar();
        });

        elements.nextBolsaCalendarMonth?.addEventListener('click', () => {
            bolsaCalendarViewDate.setDate(1);
            bolsaCalendarViewDate.setMonth(bolsaCalendarViewDate.getMonth() + 1);
            renderBolsaCalendar();
        });


        if (elements.closeBreakdownModal) {
            elements.closeBreakdownModal.addEventListener('click', () => {
                elements.ahorroBreakdownModal?.classList.add('hidden');
            });
        }

        elements.breakdownFilterType?.addEventListener('change', (e) => {
            const isYear = e.target.value === 'year';
            elements.breakdownMonthContainer?.classList.toggle('hidden', isYear);
            elements.breakdownYearContainer?.classList.toggle('hidden', !isYear);
            elements.breakdownDetailContainer?.classList.add('hidden');
            currentActiveBreakdownCategory = null;
            updateAhorroBreakdown();
        });

        elements.breakdownMonthInput?.addEventListener('change', () => {
            elements.breakdownDetailContainer?.classList.add('hidden');
            currentActiveBreakdownCategory = null;
            updateAhorroBreakdown();
        });
        elements.breakdownYearInput?.addEventListener('input', () => {
            elements.breakdownDetailContainer?.classList.add('hidden');
            currentActiveBreakdownCategory = null;
            updateAhorroBreakdown();
        });


        elements.breakdownMonthUp?.addEventListener('click', () => {
            elements.breakdownMonthInput.value = changeMonthVal(elements.breakdownMonthInput.value, 1);
            elements.breakdownMonthInput.dispatchEvent(new Event('change'));
        });
        elements.breakdownMonthDown?.addEventListener('click', () => {
            elements.breakdownMonthInput.value = changeMonthVal(elements.breakdownMonthInput.value, -1);
            elements.breakdownMonthInput.dispatchEvent(new Event('change'));
        });
        elements.breakdownYearUp?.addEventListener('click', () => {
            elements.breakdownYearInput.value = parseInt(elements.breakdownYearInput.value) + 1;
            elements.breakdownYearInput.dispatchEvent(new Event('input'));
        });
        elements.breakdownYearDown?.addEventListener('click', () => {
            elements.breakdownYearInput.value = parseInt(elements.breakdownYearInput.value) - 1;
            elements.breakdownYearInput.dispatchEvent(new Event('input'));
        });

        // Other month filters navigation
        elements.nextAhorroMonthBtn?.addEventListener('click', () => {
            if (elements.ahorroFilterMode?.value === 'year') {
                let [y, m] = ahorroListMonth.split('-').map(Number);
                ahorroListMonth = `${y + 1}-${String(m).padStart(2, '0')}`;
            } else if (elements.ahorroFilterMode?.value === 'week') {
                const d = ahorroListMonth.length === 7 ? new Date(ahorroListMonth + "-01") : new Date(ahorroListMonth);
                d.setDate(d.getDate() + 7);
                ahorroListMonth = d.toISOString().split('T')[0];
            } else if (elements.ahorroFilterMode?.value === 'month') {
                ahorroListMonth = changeMonthVal(ahorroListMonth, 1);
            }
            renderSavings();
        });
        elements.prevAhorroMonthBtn?.addEventListener('click', () => {
            if (elements.ahorroFilterMode?.value === 'year') {
                let [y, m] = ahorroListMonth.split('-').map(Number);
                ahorroListMonth = `${y - 1}-${String(m).padStart(2, '0')}`;
            } else if (elements.ahorroFilterMode?.value === 'week') {
                const d = ahorroListMonth.length === 7 ? new Date(ahorroListMonth + "-01") : new Date(ahorroListMonth);
                d.setDate(d.getDate() - 7);
                ahorroListMonth = d.toISOString().split('T')[0];
            } else if (elements.ahorroFilterMode?.value === 'month') {
                ahorroListMonth = changeMonthVal(ahorroListMonth, -1);
            }
            renderSavings();
        });
        elements.nextNominaMonthBtn?.addEventListener('click', () => {
            nominaListMonth = changeMonthVal(nominaListMonth, 1);
            renderNomina();
        });
        elements.prevNominaMonthBtn?.addEventListener('click', () => {
            nominaListMonth = changeMonthVal(nominaListMonth, -1);
            renderNomina();
        });


        // Click on breakdown rows
        document.querySelectorAll('.breakdown-row').forEach(row => {
            row.addEventListener('click', () => {
                const cat = row.getAttribute('data-category');
                showBreakdownDetail(cat);
            });
        });


    }

    function updateFiscalCountdown() {
        console.log("updateFiscalCountdown called");
        if (!elements.fiscalDaysLeft) {
            console.warn("elements.fiscalDaysLeft not found");
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth(); // 0-indexed
        const today = now.getDate();

        // Target: Day X of current or next month
        let targetMonth = month;
        let targetYear = year;

        if (today >= fiscalDay) {
            targetMonth++;
            if (targetMonth > 11) {
                targetMonth = 0;
                targetYear++;
            }
        }

        const targetDate = new Date(targetYear, targetMonth, fiscalDay);
        const diffMs = targetDate - now;
        const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        console.log(`Calculating days until ${targetYear}-${targetMonth + 1}-${fiscalDay}: ${diffDays} days. fiscalDay: ${fiscalDay}`);
        const days = (diffDays >= 0 ? diffDays : 0);
        if (elements.fiscalDaysLeft) elements.fiscalDaysLeft.textContent = days;
        const sidebarDays = document.getElementById('fiscalDaysLeft2');
        if (sidebarDays) sidebarDays.textContent = days;
    }

    function showFiscalCalendarModal() {
        console.log("showFiscalCalendarModal called");
        if (!elements.fiscalCalendarModal || !elements.fiscalCalendarContent) {
            console.error("Fiscal modal elements missing", { modal: !!elements.fiscalCalendarModal, content: !!elements.fiscalCalendarContent });
            return;
        }

        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth();
        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
            "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
        ];

        // Header
        const monthTitle = `${monthNames[month]} ${year}`;
        const modalTitle = document.getElementById('fiscalCalendarTitle');
        if (modalTitle) modalTitle.textContent = `Calendario Fiscal - ${monthTitle}`;

        // Get first day of month and last day
        const firstDay = new Date(year, month, 1).getDay(); // 0 (Sun) to 6 (Sat)
        // Adjust for Monday start: 0->6, 1->0, 2->1 ...
        const startOffset = (firstDay + 6) % 7;
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        let html = `
        <div style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 8px; text-align: center; font-size: 0.9rem;">
            <div style="opacity: 0.5;">L</div><div style="opacity: 0.5;">M</div><div style="opacity: 0.5;">X</div>
            <div style="opacity: 0.5;">J</div><div style="opacity: 0.5;">V</div><div style="opacity: 0.5;">S</div>
            <div style="opacity: 0.5;">D</div>
    `;

        // Empty cells for offset
        for (let i = 0; i < startOffset; i++) {
            html += `<div></div>`;
        }

        // Days
        for (let day = 1; day <= daysInMonth; day++) {
            const isFiscal = day === fiscalDay;
            const isToday = day === now.getDate();
            let style = "padding: 8px; border-radius: 6px; position: relative;";

            if (isFiscal) {
                style += "background: var(--primary); color: white; font-weight: bold; box-shadow: 0 0 10px rgba(var(--primary-rgb), 0.5);";
            } else if (isToday) {
                style += "background: rgba(255,255,255,0.1); border: 1px solid var(--primary);";
            } else {
                style += "background: rgba(255,255,255,0.03);";
            }

            html += `<div style="${style}">${day}${isFiscal ? '<span style="position:absolute; top:-5px; right:5px; font-size:10px;">🚩</span>' : ''}</div>`;
        }

        html += `</div>`;
        html += `<p style="margin-top: 1.5rem; font-size: 0.85rem; opacity: 0.7; text-align: center;">
                El día fiscal está configurado para el día <strong>${fiscalDay}</strong> de cada mes.
             </p>`;

        elements.fiscalCalendarContent.innerHTML = html;
        elements.fiscalCalendarModal.classList.remove('hidden');
    }

    function openAddStockModal() {
        if (!elements.addStockForm) return;
        elements.addStockForm.reset();
        elements.editId.value = '';
        elements.modalTitle.textContent = "Add New Investment";
        elements.submitStockBtn.textContent = "Add Investment";
        elements.stockSourceInfoGroup?.classList.add('hidden');
        elements.fundSourceGroup?.classList.remove('hidden');

        updateFundSourceSelect();
        const storedSource = localStorage.getItem('defaultTransferSource');
        if (storedSource && elements.fundSourceSelect) elements.fundSourceSelect.value = storedSource;

        // Robust Today's Date Default
        const today = new Date().toISOString().split('T')[0];
        if (elements.dateInput) elements.dateInput.value = today;

        toggleModal(true);
    }

    // Sign synchronization for movement amounts
    elements.movementAmountInput?.addEventListener('input', (e) => {
        const val = e.target.value;
        if (val.startsWith('-')) {
            updateSavingsMovementType('expense');
        } else if (val.startsWith('+')) {
            updateSavingsMovementType('income');
        }
    });

    function openManualPriceModal() {
        if (!elements.manualPriceList) return;
        elements.manualPriceList.innerHTML = '';

        // --- DIVISA (Always visible) ---
        const fxDiv = document.createElement('div');
        fxDiv.className = 'manual-price-row fx-rate-row';
        fxDiv.style.cssText = 'display:flex; align-items:center; gap:1rem; background:rgba(59, 130, 246, 0.1); padding:0.8rem; border-radius:10px; border:1px solid rgba(59, 130, 246, 0.2); margin-bottom: 1.5rem;';
        fxDiv.innerHTML = `
            <div style="flex:1;">
                <div style="font-weight:700; color:var(--primary);">Divisa USD ➔ EUR</div>
                <div style="font-size:0.75rem; opacity:0.7;">Cambio actual empleado en la cartera</div>
                <div style="font-size:0.65rem; color:var(--text-muted); margin-top:2px;">Última lectura: ${window.FX_DATE || '---'}</div>
            </div>
            <div style="width:120px;">
                <input type="number" step="0.0001" id="manualFxRateInput" value="${window.FX_RATE}" 
                    style="width:100%; background:rgba(0,0,0,0.2); border:1px solid var(--primary); color:white; padding:0.4rem; border-radius:6px; font-size:0.9rem; font-weight:700; text-align:center;">
            </div>
        `;
        elements.manualPriceList.appendChild(fxDiv);

        // All tickers from all stocks
        const allTickers = [...new Set(stocks.map(s => s.ticker.toUpperCase()))];
        const rows = allTickers.map(ticker => {
            const info = window.getStockInfo(ticker);
            return { ticker, info };
        });

        // Display all stocks
        if (rows.length > 0) {
            const title = document.createElement('h4');
            title.textContent = 'Ajuste de Activos';
            title.style.cssText = 'margin: 1rem 0 0.5rem 0; font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.1em;';
            elements.manualPriceList.appendChild(title);

            rows.forEach(item => {
                const div = document.createElement('div');
                div.className = 'manual-price-row';
                div.style.cssText = 'display:flex; align-items:center; gap:1rem; background:rgba(255,255,255,0.03); padding:0.8rem; border-radius:10px; border:1px solid rgba(255,255,255,0.05); margin-bottom: 0.5rem;';

                const yahooTicker = item.ticker.endsWith('.MC') ? item.ticker : (item.ticker.endsWith('.ES') ? item.ticker.replace('.ES', '.MC') : item.ticker);
                const yahooUrl = `https://finance.yahoo.com/quote/${yahooTicker}`;

                const currentPrice = item.info.price || '';
                const isLive = item.info.isLive;
                const lastUpdatedDate = item.info.date || '';

                div.innerHTML = `
                    <div style="flex:1; display: flex; align-items: center; gap: 0.8rem;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px;">
                                <div style="font-weight:700; color:var(--primary);">${item.ticker}</div>
                                <span style="font-size: 0.65rem; padding: 2px 6px; border-radius: 4px; background: ${isLive ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)'}; color: ${isLive ? '#10b981' : 'var(--text-muted)'}; border: 1px solid ${isLive ? 'rgba(16, 185, 129, 0.3)' : 'rgba(255,255,255,0.1)'};">
                                    ${isLive ? 'EN VIVO' : (item.info.isManual ? 'MANUAL' : 'ESTÁTICO')}
                                </span>
                            </div>
                            <div style="display: flex; align-items: center; gap: 10px; margin-top: 4px;">
                                <a href="${yahooUrl}" target="_blank" style="font-size:0.75rem; color:#3b82f6; text-decoration:none;">🔗 Yahoo</a>
                                ${lastUpdatedDate ? `<div style="font-size:0.65rem; color:var(--text-muted);">Refreso: ${lastUpdatedDate}</div>` : ''}
                            </div>
                        </div>
                    </div>
                    <div style="width:120px;">
                        <input type="number" step="0.0001" class="manual-price-input" data-ticker="${item.ticker}" value="${currentPrice}" 
                            placeholder="${item.info.isSimulated ? item.info.price : '---'}"
                            style="width:100%; background:rgba(0,0,0,0.2); border:1px solid var(--border-color); color:white; padding:0.4rem; border-radius:6px; font-size:0.9rem; text-align: right;">
                    </div>
                `;
                elements.manualPriceList.appendChild(div);
            });
        }

        elements.manualPriceModal.classList.remove('hidden');
    }

    function saveManualPrices() {
        // --- 1. Save FX Rate ---
        const fxInput = document.getElementById('manualFxRateInput');
        if (fxInput) {
            const newFx = parseFloat(fxInput.value);
            if (!isNaN(newFx) && newFx > 0) {
                const isDifferent = newFx !== window.FX_RATE;
                window.FX_RATE = newFx;
                if (isDifferent) {
                    const now = new Date();
                    const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                    window.FX_DATE = dateStr;
                    if (window.saveFXDate) window.saveFXDate(dateStr);
                }
                if (window.saveFXRate) window.saveFXRate(newFx);
            }
        }

        // --- 2. Save Stock Prices ---
        const inputs = elements.manualPriceList.querySelectorAll('.manual-price-input');
        let count = 0;
        inputs.forEach(input => {
            const ticker = input.dataset.ticker;
            const val = parseFloat(input.value);
            if (!isNaN(val) && val > 0) {
                const now = new Date();
                const dateStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                window.MANUAL_PRICES[ticker] = {
                    price: val,
                    date: dateStr
                };
                count++;
            } else {
                delete window.MANUAL_PRICES[ticker];
            }
        });
        if (window.saveManualPrices) window.saveManualPrices(window.MANUAL_PRICES);
        elements.manualPriceModal.classList.add('hidden');
        render();
        showToast('Ajustes guardados correctamente');
    }

    function clearAllManualPrices() {
        showCustomConfirm('¿Estás seguro de que quieres borrar todos los ajustes manuales?', () => {
            window.MANUAL_PRICES = {};
            if (window.saveManualPrices) window.saveManualPrices({});
            elements.manualPriceModal.classList.add('hidden');
            render();
            showToast('Ajustes manuales eliminados');
        });
    }


    function toggleModal(show) {
        if (!elements.addStockModal) return;
        if (show) {
            elements.addStockModal.classList.remove('hidden');
        } else {
            elements.addStockModal.classList.add('hidden');
        }
    }

    function getFormattedDateWithTime() {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yyyy = now.getFullYear();
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        return `${dd}${mm}${yyyy}_${hh}${min}`;
    }


    function exportToCSV(isExcel) {
        if (currentView === 'nomina') {
            exportNominaToCSV(isExcel);
            return;
        }

        // Default to Bolsa Export
        const headers = ['Ticker', 'Quantity', 'Cost Per Share', 'Currency', 'Date'];
        const rows = stocks.map(s => {
            const currency = 'EUR';
            let price = s.price;
            let ticker = s.ticker;
            if (ticker.toUpperCase().endsWith('.MC')) {
                ticker = ticker.toUpperCase().replace('.MC', '.ES');
            }
            return [ticker, s.qty, price.toFixed(4), currency, s.date].join(',');
        });
        let csvContent = headers.join(',') + '\n' + rows.join('\n');
        if (rows.length === 0) csvContent = headers.join(',');

        let blob;
        let fileName = 'bolsa_' + getFormattedDateWithTime() + '.csv';

        if (isExcel) {
            const BOM = '\uFEFF';
            blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        } else {
            blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url, fileName, blob);
    }

    function exportNominaToCSV(isExcel) {
        const headers = ['Concepto', 'Tipo', 'Importe', 'Meses Activos'];
        const rows = [];
        nominaData.forEach(drawer => {
            drawer.movements.forEach(m => {
                rows.push([
                    m.concept,
                    m.amount >= 0 ? 'Ingreso' : 'Gasto',
                    Math.abs(m.amount).toFixed(2),
                    (m.activeMonths || []).join('|')
                ].join(','));
            });
        });

        let csvContent = headers.join(',') + '\n' + rows.join('\n');
        let fileName = 'nomina_' + getFormattedDateWithTime() + '.csv';
        let blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        triggerDownload(url, fileName, blob);
    }




    // importSavingsFromCSV removed as per request

    // --- Nomina Functions ---

    function toggleNominaModal(show) {
        if (!elements.nominaModal) return;
        if (show) {
            elements.nominaModal.classList.remove('hidden');
        } else {
            elements.nominaModal.classList.add('hidden');
            if (elements.nominaForm) elements.nominaForm.reset();
            if (elements.nominaEditId) elements.nominaEditId.value = '';
            if (elements.nominaLinkedAhorroSelect) elements.nominaLinkedAhorroSelect.value = '';
        }
    }

    function toggleNominaMovementModal(show) {
        if (!elements.nominaMovementModal) return;
        if (show) {
            elements.nominaMovementModal.classList.remove('hidden');
        } else {
            elements.nominaMovementModal.classList.add('hidden');
            if (elements.nominaMovementForm) elements.nominaMovementForm.reset();
            if (elements.nominaMovementTargetId) elements.nominaMovementTargetId.value = '';
            if (elements.nominaMovementEditIndex) elements.nominaMovementEditIndex.value = '';
        }
    }

    function populateNominaAhorroSelect(selectedValue = '') {
        if (!elements.nominaLinkedAhorroSelect) return;
        elements.nominaLinkedAhorroSelect.innerHTML = '<option value="">-- Sin vincular --</option>';
        savingsDrawers.forEach(drawer => {
            // Optional: skip auto drawers like 'bolsa' if they shouldn't be targets
            if (drawer.id !== 'bolsa') {
                const opt = document.createElement('option');
                opt.value = drawer.id;
                opt.textContent = `${drawer.icon} ${drawer.name} (${fmtEUR(drawer.balance)})`;
                elements.nominaLinkedAhorroSelect.appendChild(opt);
            }
        });
        elements.nominaLinkedAhorroSelect.value = selectedValue;
    }

    function showAddNomina() {
        if (elements.nominaModalTitle) elements.nominaModalTitle.textContent = 'Añadir Nueva Cuenta';
        if (elements.nominaEditId) elements.nominaEditId.value = '';
        if (elements.nominaNameInput) elements.nominaNameInput.value = '';
        if (elements.nominaAmountInput) elements.nominaAmountInput.value = '';
        if (elements.nominaTypeSelect) elements.nominaTypeSelect.value = 'income'; // Default or could be empty
        populateNominaAhorroSelect();
        if (elements.nominaDrawerMonthsCheckboxes) {
            elements.nominaDrawerMonthsCheckboxes.querySelectorAll('input').forEach(cb => cb.checked = true);
        }
        if (elements.nominaIconInput) elements.nominaIconInput.value = '📁';
        toggleNominaModal(true);
    }

    function showEditNominaDrawer(id) {
        const drawer = nominaData.find(d => d.id == id);
        if (!drawer) return;
        if (elements.nominaModalTitle) elements.nominaModalTitle.textContent = 'Editar Cuenta';
        if (elements.nominaEditId) elements.nominaEditId.value = id;
        if (elements.nominaNameInput) elements.nominaNameInput.value = drawer.name;
        let initialMvmt = (drawer.movements || []).find(m => isProvision(m));
        if (elements.nominaAmountInput) elements.nominaAmountInput.value = initialMvmt ? initialMvmt.amount : (drawer.balance || 0);
        if (elements.nominaTypeSelect) elements.nominaTypeSelect.value = drawer.type;
        populateNominaAhorroSelect(drawer.linkedSavingsDrawerId || '');
        if (elements.nominaDrawerMonthsCheckboxes && initialMvmt) {
            const active = initialMvmt.activeMonths || [];
            elements.nominaDrawerMonthsCheckboxes.querySelectorAll('input').forEach(cb => {
                cb.checked = active.includes(parseInt(cb.value));
            });
        }
        if (elements.nominaIconInput) elements.nominaIconInput.value = drawer.icon || '📁';
        toggleNominaModal(true);
    }

    function deleteNominaDrawer(id) {
        showCustomConfirm('¿Estás seguro de que quieres eliminar esta cuenta y todos sus movimientos?', () => {
            nominaData = nominaData.filter(d => d.id != id);
            if (window.saveNomina) window.saveNomina(nominaData);
            renderNomina();
        });
    }

    function showAddNominaMovement(drawerId) {
        if (elements.nominaMovementModalTitle) elements.nominaMovementModalTitle.textContent = 'Añadir Movimiento';
        if (elements.nominaMovementTargetId) elements.nominaMovementTargetId.value = drawerId;
        if (elements.nominaMovementEditIndex) elements.nominaMovementEditIndex.value = '';
        elements.nominaMonthsCheckboxes.querySelectorAll('input').forEach(cb => cb.checked = true);
        
        const isMaxTotalInp = document.getElementById('nominaMovementIsMaxTotalInput');
        if (isMaxTotalInp) isMaxTotalInp.checked = false;

        const drawer = nominaData.find(d => d.id == drawerId);

        if (drawer) {
            // Default logic: 1st movement is income, others expense.
            // Nomina drawer is always income.
            if (drawer.type === 'saving' || drawer.type === 'income') {
                updateNominaMovementType('income');
                if (elements.nominaMovementTypeContainer) elements.nominaMovementTypeContainer.classList.add('hidden');
            } else {
                if (elements.nominaMovementTypeContainer) {
                    elements.nominaMovementTypeContainer.classList.remove('hidden');
                    elements.nominaMovementTypeContainer.style.display = 'flex'; // Ensure flex layout
                }
                // Default to Expense for normal expense drawers
                updateNominaMovementType('expense');
            }
        }

        toggleNominaMovementModal(true);
    }

    function showEditNominaMovement(drawerId, index) {
        const drawer = nominaData.find(d => d.id == drawerId);
        if (!drawer || !drawer.movements[index]) return;
        const mov = drawer.movements[index];
        if (elements.nominaMovementModalTitle) elements.nominaMovementModalTitle.textContent = 'Editar Movimiento';
        if (elements.nominaMovementTargetId) elements.nominaMovementTargetId.value = drawerId;
        if (elements.nominaMovementEditIndex) elements.nominaMovementEditIndex.value = index;
        if (elements.nominaMovementAmountInput) elements.nominaMovementAmountInput.value = Math.abs(mov.amount);
        if (elements.nominaMovementConceptInput) elements.nominaMovementConceptInput.value = mov.concept || mov.description || '';
        
        const isMaxTotalInp = document.getElementById('nominaMovementIsMaxTotalInput');
        if (isMaxTotalInp) isMaxTotalInp.checked = !!mov.isMaxTotal || ((mov.concept || mov.description || '').toLowerCase() === 'total');

        const active = mov.activeMonths || [];
        elements.nominaMonthsCheckboxes.querySelectorAll('input').forEach(cb => {
            cb.checked = active.includes(parseInt(cb.value));
        });

        if (drawer.type === 'saving' || drawer.type === 'income') {
            updateNominaMovementType('income');
            if (elements.nominaMovementTypeContainer) elements.nominaMovementTypeContainer.classList.add('hidden');
        } else {
            if (elements.nominaMovementTypeContainer) {
                elements.nominaMovementTypeContainer.classList.remove('hidden');
                elements.nominaMovementTypeContainer.style.display = 'flex';
            }
            updateNominaMovementType(mov.amount >= 0 ? 'income' : 'expense');
        }

        toggleNominaMovementModal(true);
    }

    function deleteNominaMovement(drawerId, index) {
        const drawer = nominaData.find(d => d.id == drawerId);
        if (!drawer || !drawer.movements[index]) return;
        showCustomConfirm('¿Estás seguro de que quieres eliminar este movimiento?', () => {
            drawer.movements.splice(index, 1);
            if (window.saveNomina) window.saveNomina(nominaData);
            renderNomina();
            showNominaDrawerDetails(drawerId);
        });
    }

    function calculateNominaCurrentMonth(drawer, fiscalMonthStr) {
        const monthNum = parseInt(fiscalMonthStr.split('-')[1]);
        let income = 0;
        let expense = 0;

        (drawer.movements || []).forEach(m => {
            if ((m.activeMonths || []).includes(monthNum)) {
                if (m.amount > 0) income += m.amount;
                else expense += Math.abs(m.amount);
            }
        });

        return { income, expense };
    }

    function transferNominaToAhorro(drawerId) {
        const drawer = nominaData.find(d => d.id == drawerId);
        if (!drawer || !drawer.linkedSavingsDrawerId) return;

        const targetAhorroDrawer = savingsDrawers.find(d => d.id == drawer.linkedSavingsDrawerId);
        if (!targetAhorroDrawer) {
            alert('La cuenta de Ahorro vinculada ya no existe.');
            return;
        }

        const fiscalMonthStr = getFiscalMonth();
        const initialMvmt = (drawer.movements || []).find(m => isProvision(m));
        const defaultAmount = initialMvmt ? Math.abs(initialMvmt.amount) : 0;


        if (true) {
            // Setup Modal Categories
            if (elements.transferCategorySelect) {
                const allCats = [...new Set([...incomeCategories, ...expenseCategories])];
                elements.transferCategorySelect.innerHTML = allCats.map(c => `<option value="${c}" ${c === 'Traspaso' ? 'selected' : ''}>${c}</option>`).join('');
                elements.transferCategorySelect.value = 'Traspaso';
            }

            if (elements.transferSubcategorySelect) {
                const allSubCats = [...new Set([...incomeSubcategories, ...expenseSubcategories])];
                elements.transferSubcategorySelect.innerHTML = '<option value="">-- Sin subcategoría --</option>' +
                    allSubCats.map(s => `<option value="${s}">${s}</option>`).join('');
                elements.transferSubcategorySelect.value = '';
            }

            // Setup Modal Fields
            if (elements.transferSourceDrawerId) elements.transferSourceDrawerId.value = drawer.id;
            if (elements.transferSourceDrawerName) elements.transferSourceDrawerName.textContent = drawer.name;
            if (elements.transferTargetDrawerName) elements.transferTargetDrawerName.textContent = targetAhorroDrawer.name;
            if (elements.transferAmountInput) {
                elements.transferAmountInput.value = defaultAmount.toFixed(2);
                elements.transferAmountInput.focus();
            }
            if (elements.transferDateInput) {
                elements.transferDateInput.value = new Date().toISOString().split('T')[0];
            }

            // Show Modal
            if (elements.transferToAhorroModal) elements.transferToAhorroModal.classList.remove('hidden');

            // Handle Form Submit
            elements.transferToAhorroForm.onsubmit = (e) => {
                e.preventDefault();
                const amountToTransfer = parseFloat(elements.transferAmountInput.value);
                const selectedCategory = elements.transferCategorySelect.value;
                const selectedSubcategory = elements.transferSubcategorySelect?.value || '';

                if (isNaN(amountToTransfer) || amountToTransfer === 0) {
                    alert('Por favor, ingresa una cantidad válida diferente de 0.');
                    return;
                }

                // Add movement to Savings
                let finalCategory = selectedCategory;
                if (selectedSubcategory) finalCategory = `${selectedCategory}:${selectedSubcategory}`;

                targetAhorroDrawer.movements.push({
                    description: `Traspaso`,
                    date: elements.transferDateInput.value || new Date().toISOString().split('T')[0],
                    amount: amountToTransfer,
                    category: finalCategory
                });

                // Update Savings Balance
                targetAhorroDrawer.balance = (targetAhorroDrawer.balance || 0) + amountToTransfer;

                if (window.saveSavings) window.saveSavings(savingsDrawers);
                showToast(`✅ ${fmtEUR(amountToTransfer)} transferidos a ${targetAhorroDrawer.name}`);

                // Re-render everything
                render();
                elements.transferToAhorroModal.classList.add('hidden');
                elements.nominaHistoryModal.classList.add('hidden');
            };

            // Handle Cancel
            elements.cancelTransferBtn.onclick = () => {
                elements.transferToAhorroModal.classList.add('hidden');
            };
            elements.closeTransferModal.onclick = () => {
                elements.transferToAhorroModal.classList.add('hidden');
            };
        }
    }

    function showNominaDrawerDetails(id) {
        const drawer = nominaData.find(d => d.id == id);
        if (!drawer) return;
        if (elements.nominaHistoryTitle) elements.nominaHistoryTitle.textContent = `Historial: ${drawer.name}`;

        // Remove existing Transfer button area if any
        const existingTransferBtnContainer = elements.nominaHistoryModal.querySelector('.transfer-btn-container');
        if (existingTransferBtnContainer) existingTransferBtnContainer.remove();

        if (elements.nominaMovementsList) {
            elements.nominaMovementsList.innerHTML = '';

            // Handle Transfer Button injection at the top if linked
            if (drawer.linkedSavingsDrawerId) {
                const targetAhorro = savingsDrawers.find(d => d.id === drawer.linkedSavingsDrawerId);
                if (targetAhorro) {
                    const btnContainer = document.createElement('div');
                    btnContainer.className = 'transfer-btn-container';
                    btnContainer.style = 'margin-top: -10px; margin-bottom: 15px; text-align: center; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 15px;';
                    btnContainer.innerHTML = `
                        <p style="font-size: 0.8rem; color: var(--text-muted); margin-bottom: 8px;">Vinculado a: <strong>${targetAhorro.name}</strong></p>
                        <button class="btn-primary" id="btnTransferToAhorro" title="Traspasar a Ahorro" style="width: 100%; background: var(--success); display: flex; align-items: center; justify-content: center; gap: 8px;">
                            ➡️
                        </button>
                    `;
                    elements.nominaMovementsList.parentElement.insertBefore(btnContainer, elements.nominaMovementsList);

                    document.getElementById('btnTransferToAhorro').onclick = () => transferNominaToAhorro(drawer.id);
                }
            }

            if (!drawer.movements || drawer.movements.length === 0) {
                elements.nominaMovementsList.innerHTML = '<div style="text-align:center; opacity:0.5; padding:2rem;">No hay movimientos.</div>';
            } else {
                [...drawer.movements].reverse().forEach((mov, revIdx) => {
                    const originalIndex = drawer.movements.length - 1 - revIdx;
                    const item = document.createElement('div');
                    item.className = 'movement-item';
                    item.innerHTML = `
                        <div class="mov-info">
                            <div class="mov-concept">${mov.concept || mov.description || 'Sin concepto'}</div>
                            <div style="display:flex; gap:0.5rem; font-size:0.75rem; opacity:0.6; flex-wrap: wrap;">
                                <span>${mov.date}</span>
                                <span>•</span>
                                <span style="color:var(--primary); font-weight:600;">${mov.activeMonths?.length === 12 ? 'Todos los meses' : mov.activeMonths?.length + ' meses'}</span>
                            </div>
                        </div>
                        <div style="display:flex; align-items:center; gap: 1rem;">
                            <div class="mov-amount" style="color: var(--${mov.amount >= 0 ? 'success' : 'danger'})">
                                ${mov.amount > 0 ? '+' : ''}${fmtEUR(mov.amount)}
                            </div>
                            <div class="mov-actions" style="display:flex; gap:0.5rem;">
                                <button class="btn-icon edit-mov" data-drawer-id="${drawer.id}" data-index="${originalIndex}" title="Editar" style="font-size:0.9rem; opacity:0.6;">✏️</button>
                                <button class="btn-icon delete-mov" data-drawer-id="${drawer.id}" data-index="${originalIndex}" title="Borrar" style="font-size:0.9rem; opacity:0.6;">🗑️</button>
                            </div>
                        </div>
                    `;
                    elements.nominaMovementsList.appendChild(item);
                });
                elements.nominaMovementsList.onclick = (e) => {
                    const btn = e.target.closest('button');
                    if (!btn) return;
                    const dId = btn.dataset.drawerId;
                    const idx = parseInt(btn.dataset.index);
                    if (btn.classList.contains('edit-mov')) {
                        elements.nominaHistoryModal.classList.add('hidden');
                        showEditNominaMovement(dId, idx);
                    } else if (btn.classList.contains('delete-mov')) {
                        deleteNominaMovement(dId, idx);
                    }
                };
            }
        }
        if (elements.nominaHistoryModal) elements.nominaHistoryModal.classList.remove('hidden');
    }



    // importNominaFromCSV removed as per request

    // --- Global JSON Backup/Restore ---

    function getGlobalDataObject() {
        return {
            stocks: stocks,
            savings: savingsDrawers,
            nomina: nominaData,
            countdowns: countdowns,
            manualPrices: window.MANUAL_PRICES || {},
            livePrices: window.LIVE_PRICES || {},
            liveDates: window.LIVE_DATES || {},
            liveSources: window.LIVE_SOURCES || {},
            fxRate: window.FX_RATE,
            fxDate: window.FX_DATE,
            recurringMovements: recurringSavingsMovements,
            settings: {
                fiscalDay: fiscalDay,
                incomeCategories: incomeCategories,
                expenseCategories: expenseCategories,
                incomeSubcategories: incomeSubcategories,
                expenseSubcategories: expenseSubcategories,
                defaultTransferSource: localStorage.getItem('defaultTransferSource'),
                bottomNavMode: bottomNavMode
            },
            exportDate: new Date().toISOString(),
            version: "1.3"
        };
    }

    function exportGlobalJSON() {
        const globalData = getGlobalDataObject();
        const blob = new Blob([JSON.stringify(globalData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const fileName = getFormattedDateWithTime() + '.json';

        triggerDownload(url, fileName, blob);
    }

    function importGlobalJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.stocks || !data.savings || !data.nomina) {
                    throw new Error("El archivo no tiene el formato de respaldo global esperado.");
                }
                showCustomConfirm(`Se restaurarán:\n- ${data.stocks.length} activos en Bolsa\n- ${data.savings.length} cuentas de Ahorro\n- ${data.nomina.length} cuentas de Nómina\n${data.countdowns ? '- ' + data.countdowns.length + ' cuentas atrás\n' : ''}${data.manualPrices ? '- Precios manuales\n' : ''}${data.settings ? '- Ajustes personalizados\n' : ''}\n¿Estás SEGURO? Esto reemplazará tus datos actuales.`, () => {
                    stocks = data.stocks;
                    savingsDrawers = data.savings.map(d => ({ ...d, group: d.group || '' }));
                    recurringSavingsMovements = data.recurringMovements || [];
                    nominaData = migrateNominaData(data.nomina);
                    if (data.countdowns) {
                        countdowns = data.countdowns;
                    }
                    if (data.manualPrices) {
                        window.MANUAL_PRICES = data.manualPrices;
                    }
                    if (data.livePrices) window.LIVE_PRICES = data.livePrices;
                    if (data.liveDates) window.LIVE_DATES = data.liveDates;
                    if (data.liveSources) window.LIVE_SOURCES = data.liveSources;
                    if (data.fxRate) window.FX_RATE = data.fxRate;
                    if (data.fxDate) window.FX_DATE = data.fxDate;

                    // Update UI state for immediate refresh
                    isFirstUpdateDone = true;
                    if (data.exportDate) {
                        try {
                            const dateObj = new Date(data.exportDate);
                            lastSyncTime = dateObj.toLocaleTimeString();
                        } catch (e) { lastSyncTime = '-'; }
                    }

                    // Restore settings if present
                    if (data.settings) {
                        if (data.settings.fiscalDay) {
                            fiscalDay = parseInt(data.settings.fiscalDay);
                            localStorage.setItem('fiscalDay', fiscalDay);
                        }
                        if (data.settings.incomeCategories) {
                            incomeCategories = data.settings.incomeCategories;
                            localStorage.setItem('incomeCategories', JSON.stringify(incomeCategories));
                        }
                        if (data.settings.expenseCategories) {
                            expenseCategories = data.settings.expenseCategories;
                            localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories));
                        }
                        if (data.settings.incomeSubcategories) {
                            incomeSubcategories = data.settings.incomeSubcategories;
                            localStorage.setItem('incomeSubcategories', JSON.stringify(incomeSubcategories));
                        }
                        if (data.settings.expenseSubcategories) {
                            expenseSubcategories = data.settings.expenseSubcategories;
                            localStorage.setItem('expenseSubcategories', JSON.stringify(expenseSubcategories));
                        }
                        if (data.settings.defaultTransferSource !== undefined) {
                            localStorage.setItem('defaultTransferSource', data.settings.defaultTransferSource || "");
                        }
                        if (data.settings.bottomNavMode) {
                            bottomNavMode = data.settings.bottomNavMode;
                            localStorage.setItem('bottomNavMode', bottomNavMode);
                            updateBottomNavLayout();
                        }
                    }

                    if (window.saveStocks) window.saveStocks(stocks);
                    if (window.saveSavings) window.saveSavings(savingsDrawers);
                    if (window.saveNomina) window.saveNomina(nominaData);
                    if (window.saveCountdowns) window.saveCountdowns(countdowns);
                    if (window.saveManualPrices) window.saveManualPrices(window.MANUAL_PRICES);
                    if (window.saveLivePrices) window.saveLivePrices(window.LIVE_PRICES);
                    if (window.saveLiveDates) window.saveLiveDates(window.LIVE_DATES);
                    if (window.saveLiveSources) window.saveLiveSources(window.LIVE_SOURCES);
                    if (window.saveFXRate) window.saveFXRate(window.FX_RATE);
                    if (window.saveFXDate) window.saveFXDate(window.FX_DATE);
                    if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
                    render();
                    if (currentView === 'nomina') renderNomina();
                    showToast("✅ Respaldo global restaurado con éxito.", "success");
                });
            } catch (err) {
                console.error("Global import error:", err);
                alert("Error al importar el archivo JSON: " + err.message);
            }
        };
        reader.readAsText(file);
    }

    // ── Nextcloud Integration ──────────────────────────────────────
    function initNextcloudUI() {
        const config = NextcloudSync.loadConfig();
        const urlInput = document.getElementById('ncUrlInput');
        const userInput = document.getElementById('ncUserInput');
        const passInput = document.getElementById('ncPasswordInput');
        const proxyInput = document.getElementById('ncProxyInput');
        const autoUploadInput = document.getElementById('ncAutoUpload');
        const statusText = document.getElementById('ncStatusText');
        const deviceInfo = document.getElementById('ncDeviceInfo');
        const lastSync = document.getElementById('ncLastSync');
        const connectedActions = document.getElementById('ncConnectedActions');

        if (config) {
            if (urlInput) urlInput.value = config.url;
            if (userInput) userInput.value = config.user;
            if (passInput) passInput.value = config.password;
            if (proxyInput) proxyInput.value = config.proxy || '';
            if (statusText) statusText.textContent = '✅ Configurado';
            if (connectedActions) connectedActions.classList.remove('hidden');
        }

        if (autoUploadInput) {
            autoUploadInput.checked = localStorage.getItem('ncAutoUpload') !== 'false';
        }

        if (deviceInfo) {
            deviceInfo.textContent = `📱 ${NextcloudSync.getDeviceName()} · ID: ${NextcloudSync.getDeviceId().substr(-6)}`;
        }

        const savedLastSync = localStorage.getItem('nc_last_sync');
        if (savedLastSync && lastSync) {
            lastSync.textContent = `Última sync: ${new Date(savedLastSync).toLocaleString()}`;
        }
    }

    function getNcConfigFromInputs() {
        const url = document.getElementById('ncUrlInput')?.value?.trim();
        const user = document.getElementById('ncUserInput')?.value?.trim();
        const password = document.getElementById('ncPasswordInput')?.value;
        const proxy = document.getElementById('ncProxyInput')?.value?.trim() || '';

        if (!url || !user || !password) {
            showToast('Rellena URL, usuario y App Password', 'warning');
            return null;
        }
        return { url, user, password, proxy };
    }

    async function ncTestConnection() {
        const cfg = getNcConfigFromInputs();
        if (!cfg) return;

        const statusText = document.getElementById('ncStatusText');
        if (statusText) statusText.textContent = '⏳ Probando conexión...';

        const result = await NextcloudSync.testConnection(cfg);

        if (result.ok) {
            NextcloudSync.saveConfig(cfg.url, cfg.user, cfg.password, cfg.proxy);
            if (statusText) statusText.textContent = '✅ Conectado correctamente';
            document.getElementById('ncConnectedActions')?.classList.remove('hidden');
            showToast('✅ Conexión con Nextcloud OK', 'success');
        } else {
            if (statusText) statusText.textContent = '❌ ' + result.error;
            showToast('❌ ' + result.error, 'error', 5000);
        }
    }
    async function ncBackupData() {
        const config = NextcloudSync.loadConfig();
        if (!config) {
            showToast('Primero configura y prueba la conexión', 'warning');
            return;
        }

        showToast('⏳ Subiendo datos a Nextcloud...', 'info');
        const appData = getGlobalDataObject();
        const result = await NextcloudSync.uploadData(config, appData);

        if (result.ok) {
            localStorage.setItem('nc_last_sync', result.timestamp);
            const lastSync = document.getElementById('ncLastSync');
            if (lastSync) lastSync.textContent = `Última sync: ${new Date(result.timestamp).toLocaleString()}`;
            showToast('✅ Datos guardados en Nextcloud', 'success');
        } else {
            showToast('❌ ' + result.error, 'error', 5000);
        }
    }

    async function ncRestoreData() {
        const config = NextcloudSync.loadConfig();
        if (!config) {
            showToast('Primero configura y prueba la conexión', 'warning');
            return;
        }

        showToast('⏳ Descargando datos de Nextcloud...', 'info');
        const result = await NextcloudSync.downloadData(config);

        if (!result.ok) {
            showToast('❌ ' + result.error, 'error', 5000);
            return;
        }

        const data = result.data;
        if (!data || !data.stocks || !data.savings || !data.nomina) {
            showToast('❌ Los datos descargados no tienen el formato esperado', 'error');
            return;
        }

        const sourceDevice = result.deviceName || 'Desconocido';
        const sourceDate = result.lastModified ? new Date(result.lastModified).toLocaleString() : '?';
        const isSameDevice = result.deviceId === NextcloudSync.getDeviceId();

        const deviceWarning = isSameDevice
            ? ''
            : `\n\n⚠️ Estos datos fueron guardados desde OTRO dispositivo:\n📱 ${sourceDevice}`;

        showCustomConfirm(
            `Se restaurarán desde Nextcloud:\n` +
            `- ${data.stocks.length} activos en Bolsa\n` +
            `- ${data.savings.length} cuentas de Ahorro\n` +
            `- ${data.nomina.length} cuentas de Nómina\n` +
            `📅 Guardado: ${sourceDate}${deviceWarning}\n\n` +
            `¿Reemplazar tus datos actuales?`,
            () => {
                applyGlobalData(data);
                showToast('✅ Datos restaurados desde Nextcloud', 'success');
            }
        );
    }

    async function ncExportToExcel() {
        console.log('--- ncExportToExcel (Standard) ---');
        showToast('⏳ Generando hoja de cálculo...', 'info');

        try {
            // 1. Prepare data for ExcelJS
            let totalUnits = 0;
            let totalCost = 0;

            const bolsaRows = stocks.map(s => {
                const price = parseFloat(s.price) || 0;
                const cost = s.qty * price;
                
                totalUnits += s.qty;
                totalCost += cost;

                return [
                    s.ticker,
                    s.name || s.ticker,
                    s.qty,
                    Number(price.toFixed(2)),
                    Number(cost.toFixed(2)),
                    s.date ? new Date(s.date) : null
                ];
            });

            // Calculate Bolsa Summary aggregated by Name
            const bolsaAgg = {};
            stocks.forEach(s => {
                const name = s.name || s.ticker;
                if (!bolsaAgg[name]) {
                    bolsaAgg[name] = { qty: 0, totalCost: 0, ticker: s.ticker };
                }
                bolsaAgg[name].qty += s.qty;
                bolsaAgg[name].totalCost += (s.qty * (parseFloat(s.price) || 0));
            });

            const maxBolsaInv = Math.max(...Object.values(bolsaAgg).map(d => d.totalCost), 1);
            const bolsaSummaryRows = Object.entries(bolsaAgg).map(([name, data]) => {
                const avgPrice = data.qty > 0 ? data.totalCost / data.qty : 0;
                
                const segments = 15;
                const filled = Math.round((data.totalCost / maxBolsaInv) * segments);
                const visual = '█'.repeat(filled) + '░'.repeat(segments - filled);
                
                return [
                    name,
                    data.qty,
                    Number(avgPrice.toFixed(2)),
                    Number(data.totalCost.toFixed(2)),
                    visual
                ];
            });

            const categoryTotals = {};
            const drawerTotals = {};
            const savingsRowsTemp = [];
            const divRows = [];
            const divAgg = {};
            const gastosRows = [];
            const gastosByMonth = {};
            const ingresosRows = [];
            const ingresosByMonth = {};
            const gananciasRows = [];
            const gananciasByAccount = {};
            const gananciasByCategory = {};

            savingsDrawers.forEach(drawer => {
                const dName = drawer.name || 'Sin nombre';
                if (drawer.id === 'bolsa' || dName.toLowerCase().includes('bolsa')) {
                    drawerTotals[dName] = totalCost;
                } else {
                    if (!drawerTotals[dName]) drawerTotals[dName] = 0;
                }

                if (drawer.movements) {
                    drawer.movements.forEach(m => {
                        const amt = parseFloat(m.amount) || 0;
                        const catRaw = m.category || 'Sin categoría';
                        const catTrimmed = catRaw.trim().toLowerCase();
                        const conceptTrimmed = (m.concept || m.description || '').trim();
                        
                        const isTransfer = catRaw === 'Traspaso' || 
                                         catRaw === 'Inversión' || 
                                         (catRaw || '').startsWith('Traspaso:');

                        if (!isTransfer) {
                            if (!categoryTotals[catRaw]) categoryTotals[catRaw] = 0;
                            categoryTotals[catRaw] += amt;
                        }

                        // --- Logic for Dividendos ---
                        if (catTrimmed === 'dividendos') {
                            divRows.push([
                                m.date ? new Date(m.date) : null,
                                conceptTrimmed,
                                Number(amt.toFixed(2)),
                                dName
                            ]);
                            if (!divAgg[conceptTrimmed]) divAgg[conceptTrimmed] = 0;
                            divAgg[conceptTrimmed] += amt;
                        }

                        // --- Logic for Ganancias (Intereses, Dividendos, Especulación) ---
                        const isEarnings = catTrimmed === 'intereses' || 
                                         catTrimmed === 'dividendos' || 
                                         catTrimmed === 'especulación' || 
                                         catTrimmed === 'especulacion';
                        
                        if (isEarnings) {
                            gananciasRows.push([
                                m.date ? new Date(m.date) : null,
                                conceptTrimmed,
                                catRaw,
                                Number(amt.toFixed(2)),
                                dName
                            ]);
                            if (!gananciasByAccount[dName]) gananciasByAccount[dName] = 0;
                            gananciasByAccount[dName] += amt;
                            if (!gananciasByCategory[catRaw]) gananciasByCategory[catRaw] = 0;
                            gananciasByCategory[catRaw] += amt;
                        }

                        if (drawer.id !== 'bolsa' && !dName.toLowerCase().includes('bolsa')) {
                            drawerTotals[dName] += amt;
                        }

                        // --- Logic for Gastos (Excluding transfers and investments) ---
                        const isSpending = amt < 0 && !isTransfer;

                        if (isSpending) {
                            gastosRows.push([
                                m.date ? new Date(m.date) : null,
                                conceptTrimmed,
                                catRaw,
                                Number(amt.toFixed(2)),
                                dName
                            ]);
                            const monthKey = getFiscalMonth(m.date || new Date());
                            if (!gastosByMonth[monthKey]) gastosByMonth[monthKey] = 0;
                            gastosByMonth[monthKey] += amt;
                        }

                        // --- Logic for Ingresos (Excluding transfers and investments) ---
                        const isIncome = amt > 0 && !isTransfer;
                        
                        if (isIncome) {
                            ingresosRows.push([
                                m.date ? new Date(m.date) : null,
                                conceptTrimmed,
                                catRaw,
                                Number(amt.toFixed(2)),
                                dName
                            ]);
                            const monthKey = getFiscalMonth(m.date || new Date());
                            if (!ingresosByMonth[monthKey]) ingresosByMonth[monthKey] = 0;
                            ingresosByMonth[monthKey] += amt;
                        }

                        // --- Logic for Ahorro list (Excluding transfers and investments as requested) ---
                        if (!isTransfer) {
                            savingsRowsTemp.push({
                                rawDate: m.date,
                                concept: conceptTrimmed,
                                category: catRaw,
                                amount: Number(amt.toFixed(2)),
                                drawerName: dName
                            });
                        }
                    });
                }
            });

            console.log(`[Excel Export] Dividendos encontrados: ${divRows.length} en ${Object.keys(divAgg).length} empresas.`);
            divRows.sort((a, b) => (b[0] || 0) - (a[0] || 0));
            const divGroupedRows = Object.entries(divAgg)
                .map(([concept, total]) => [concept, Number(total.toFixed(2))])
                .sort((a, b) => b[1] - a[1]);

            gastosRows.sort((a, b) => (b[0] || 0) - (a[0] || 0));
            const gastosMonthGroupedRows = Object.entries(gastosByMonth)
                .map(([month, total]) => [month, Number(total.toFixed(2))])
                .sort((a, b) => b[0].localeCompare(a[0])); // Sort months descending

            ingresosRows.sort((a, b) => (b[0] || 0) - (a[0] || 0));
            const ingresosMonthGroupedRows = Object.entries(ingresosByMonth)
                .map(([month, total]) => [month, Number(total.toFixed(2))])
                .sort((a, b) => b[0].localeCompare(a[0])); // Sort months descending

            gananciasRows.sort((a, b) => (b[0] || 0) - (a[0] || 0));
            const gananciasAccountGroupedRows = Object.entries(gananciasByAccount)
                .map(([acc, total]) => [acc, Number(total.toFixed(2))])
                .sort((a, b) => b[1] - a[1]); // Sort by amount descending
            
            const gananciasCategoryGroupedRows = Object.entries(gananciasByCategory)
                .map(([cat, total]) => [cat, Number(total.toFixed(2))])
                .sort((a, b) => b[1] - a[1]);

            savingsRowsTemp.sort((a, b) => {
                const acctA = String(a.drawerName || '').toLowerCase();
                const acctB = String(b.drawerName || '').toLowerCase();
                if (acctA < acctB) return -1;
                if (acctA > acctB) return 1;
                return new Date(b.rawDate) - new Date(a.rawDate);
            });

            const ahorroRows = savingsRowsTemp.map(r => [
                r.rawDate ? new Date(r.rawDate) : null,
                r.concept,
                r.category,
                r.amount,
                r.drawerName
            ]);

            // Nomina Data
            const nominaRows = [];
            let totalNomina = 0;
            nominaData.forEach(drawer => {
                const dName = drawer.name || 'Sin nombre';
                if (drawer.movements) {
                    drawer.movements.forEach(m => {
                        const amt = parseFloat(m.amount) || 0;
                        totalNomina += amt;
                        nominaRows.push([
                            m.date ? new Date(m.date) : null,
                            m.concept || m.description || 'Sin concepto',
                            dName,
                            m.amount >= 0 ? 'Ingreso' : 'Gasto',
                            Number(amt.toFixed(2)),
                            (m.activeMonths || []).join(', ')
                        ]);
                    });
                }
            });
            nominaRows.sort((a, b) => (b[0] || 0) - (a[0] || 0));

            // 2. Create Workbook using ExcelJS
            if (typeof ExcelJS === 'undefined') throw new Error('Librería ExcelJS no cargada');
            const workbook = new ExcelJS.Workbook();
            

            // --- Sheet 1: Bolsa ---
            const wsBolsa = workbook.addWorksheet('Bolsa');
            wsBolsa.addTable({
                name: 'TablaBolsa',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Ticker', filterButton: true },
                    { name: 'Nombre', filterButton: true },
                    { name: 'Unidades', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Precio Compra', filterButton: true },
                    { name: 'Invertido', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Fecha Compra', filterButton: true }
                ],
                rows: bolsaRows
            });

            wsBolsa.addTable({
                name: 'ResumenBolsa',
                ref: 'I1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Nombre', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Total Unidades', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'P. Medio Compra', filterButton: true },
                    { name: 'Invertido', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Visual', filterButton: false }
                ],
                rows: bolsaSummaryRows
            });

            wsBolsa.columns = [
                { width: 15 }, { width: 30 }, { width: 12 }, { width: 18 }, { width: 18 }, { width: 18 },
                { width: 5 }, { width: 5 }, // Spacers
                { width: 25 }, { width: 18 }, { width: 18 }, { width: 18 }, { width: 20 } // Summary + Visual
            ];
            wsBolsa.getColumn(13).font = { name: 'Consolas', size: 10 };
            wsBolsa.getColumn(13).alignment = { horizontal: 'left' };

            wsBolsa.getColumn(4).numFmt = '#,##0.00"€"';
            wsBolsa.getColumn(5).numFmt = '#,##0.00"€"';
            wsBolsa.getColumn(6).numFmt = 'dd/mm/yyyy';
            wsBolsa.getColumn(11).numFmt = '#,##0.00"€"';
            wsBolsa.getColumn(12).numFmt = '#,##0.00"€"';

            // --- Sheet 2: Ahorro ---
            const wsAhorro = workbook.addWorksheet('Ahorro');
            wsAhorro.addTable({
                name: 'TablaAhorro',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Fecha', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Concepto', filterButton: true },
                    { name: 'Categoría', filterButton: true },
                    { name: 'Importe', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Cuenta', filterButton: true }
                ],
                rows: ahorroRows
            });

            const catRows = Object.entries(categoryTotals).map(([cat, amt]) => [cat, Number(amt.toFixed(2))]);
            wsAhorro.addTable({
                name: 'ResumenCategorias',
                ref: 'K1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Categoría', filterButton: true, totalsRowLabel: 'TOTAL' }, 
                    { name: 'Total', filterButton: true, totalsRowFunction: 'sum' }
                ],
                rows: catRows
            });

            const maxDr = Math.max(...Object.values(drawerTotals), 1);
            const drRows = Object.entries(drawerTotals).map(([dr, amt]) => {
                const segments = 15;
                const filled = Math.round((Math.max(0, amt) / maxDr) * segments);
                const visual = '█'.repeat(filled) + '░'.repeat(segments - filled);
                return [dr, Number(amt.toFixed(2)), visual];
            });
            
            wsAhorro.addTable({
                name: 'ResumenCajones',
                ref: 'N1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Cuenta', filterButton: true, totalsRowLabel: 'TOTAL' }, 
                    { name: 'Total', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Visual', filterButton: false }
                ],
                rows: drRows
            });

            wsAhorro.columns = [
                { width: 15 }, { width: 40 }, { width: 25 }, { width: 15 }, { width: 25 },
                { width: 5 }, { width: 5 }, { width: 5 }, { width: 5 }, { width: 5 }, // Spacers
                { width: 25 }, { width: 15 }, // Categories
                { width: 5 }, // Spacer
                { width: 25 }, { width: 15 }, { width: 20 } // Drawers + Visual
            ];

            wsAhorro.getColumn(1).numFmt = 'dd/mm/yyyy';
            wsAhorro.getColumn(1).alignment = { horizontal: 'left' };
            wsAhorro.getColumn(4).numFmt = '#,##0.00"€"';
            wsAhorro.getColumn(12).numFmt = '#,##0.00"€"';
            wsAhorro.getColumn(15).numFmt = '#,##0.00"€"';
            wsAhorro.getColumn(16).font = { name: 'Consolas', size: 10 };
            wsAhorro.getColumn(16).alignment = { horizontal: 'left' };

            // --- Sheet: Dividendos ---
            const wsDivs = workbook.addWorksheet('Dividendos');
            wsDivs.addTable({
                name: 'TablaDividendos',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Fecha', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Empresa', filterButton: true },
                    { name: 'Importe', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Cuenta', filterButton: true }
                ],
                rows: divRows
            });

            wsDivs.addTable({
                name: 'ResumenDividendosEmpresa',
                ref: 'F1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Empresa', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Total Dividendos', filterButton: true, totalsRowFunction: 'sum' }
                ],
                rows: divGroupedRows
            });

            wsDivs.columns = [
                { width: 15 }, { width: 35 }, { width: 15 }, { width: 25 },
                { width: 5 }, // Spacer
                { width: 35 }, { width: 18 }
            ];
            wsDivs.getColumn(1).numFmt = 'dd/mm/yyyy';
            wsDivs.getColumn(3).numFmt = '#,##0.00"€"';
            wsDivs.getColumn(7).numFmt = '#,##0.00"€"';

            // --- Sheet: Gastos ---
            const wsGastos = workbook.addWorksheet('Gastos');
            wsGastos.addTable({
                name: 'TablaGastos',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Fecha', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Concepto', filterButton: true },
                    { name: 'Categoría', filterButton: true },
                    { name: 'Importe', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Cuenta', filterButton: true }
                ],
                rows: gastosRows
            });

            wsGastos.addTable({
                name: 'ResumenGastosMes',
                ref: 'G1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Mes', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Total Gastos', filterButton: true, totalsRowFunction: 'sum' }
                ],
                rows: gastosMonthGroupedRows
            });

            wsGastos.columns = [
                { width: 15 }, { width: 35 }, { width: 25 }, { width: 15 }, { width: 25 },
                { width: 5 }, // Spacer
                { width: 20 }, { width: 15 }
            ];
            wsGastos.getColumn(1).numFmt = 'dd/mm/yyyy';
            wsGastos.getColumn(4).numFmt = '#,##0.00"€"';
            wsGastos.getColumn(8).numFmt = '#,##0.00"€"';

            // --- Sheet: Ingresos ---
            const wsIncomes = workbook.addWorksheet('Ingresos');
            wsIncomes.addTable({
                name: 'TablaIngresos',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Fecha', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Concepto', filterButton: true },
                    { name: 'Categoría', filterButton: true },
                    { name: 'Importe', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Cuenta', filterButton: true }
                ],
                rows: ingresosRows
            });

            wsIncomes.addTable({
                name: 'ResumenIngresosMes',
                ref: 'G1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Mes', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Total Ingresos', filterButton: true, totalsRowFunction: 'sum' }
                ],
                rows: ingresosMonthGroupedRows
            });

            wsIncomes.columns = [
                { width: 15 }, { width: 35 }, { width: 25 }, { width: 15 }, { width: 25 },
                { width: 5 }, // Spacer
                { width: 20 }, { width: 15 }
            ];
            wsIncomes.getColumn(1).numFmt = 'dd/mm/yyyy';
            wsIncomes.getColumn(4).numFmt = '#,##0.00"€"';
            wsIncomes.getColumn(8).numFmt = '#,##0.00"€"';

            // --- Sheet: Ganancias ---
            const wsEarnings = workbook.addWorksheet('Ganancias');
            wsEarnings.addTable({
                name: 'TablaGanancias',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Fecha', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Concepto', filterButton: true },
                    { name: 'Categoría', filterButton: true },
                    { name: 'Importe', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Cuenta', filterButton: true }
                ],
                rows: gananciasRows
            });

            wsEarnings.addTable({
                name: 'ResumenGananciasCuenta',
                ref: 'G1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Cuenta', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Total Ganancia', filterButton: true, totalsRowFunction: 'sum' }
                ],
                rows: gananciasAccountGroupedRows
            });

            wsEarnings.addTable({
                name: 'ResumenGananciasCategoria',
                ref: 'J1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium4', showRowStripes: true },
                columns: [
                    { name: 'Categoría', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Total Ganancia', filterButton: true, totalsRowFunction: 'sum' }
                ],
                rows: gananciasCategoryGroupedRows
            });

            wsEarnings.columns = [
                { width: 15 }, { width: 35 }, { width: 25 }, { width: 15 }, { width: 25 },
                { width: 5 }, // Spacer
                { width: 25 }, { width: 15 }, // By Account
                { width: 5 }, // Spacer
                { width: 25 }, { width: 15 } // By Category
            ];
            wsEarnings.getColumn(1).numFmt = 'dd/mm/yyyy';
            wsEarnings.getColumn(4).numFmt = '#,##0.00"€"';
            wsEarnings.getColumn(8).numFmt = '#,##0.00"€"';
            wsEarnings.getColumn(11).numFmt = '#,##0.00"€"';

            // --- Sheet 3: Nómina ---
            const wsNomina = workbook.addWorksheet('Nómina');
            wsNomina.addTable({
                name: 'TablaNomina',
                ref: 'A1',
                headerRow: true,
                totalsRow: true,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Fecha', filterButton: true, totalsRowLabel: 'TOTAL' },
                    { name: 'Concepto', filterButton: true },
                    { name: 'Cuenta Nómina', filterButton: true },
                    { name: 'Tipo', filterButton: true },
                    { name: 'Importe', filterButton: true, totalsRowFunction: 'sum' },
                    { name: 'Meses Activos', filterButton: true }
                ],
                rows: nominaRows
            });

            wsNomina.columns = [
                { width: 15 }, { width: 40 }, { width: 25 }, { width: 15 }, { width: 15 }, { width: 25 }
            ];
            wsNomina.getColumn(1).numFmt = 'dd/mm/yyyy';
            wsNomina.getColumn(5).numFmt = '#,##0.00"€"';
            
            // --- Sheet 4: Patrimonio Histórico ---
            const wsHist = workbook.addWorksheet('Patrimonio Histórico');
            const monthNamesShort = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
            const histNow = new Date();
            const histToday = new Date(histNow.getFullYear(), histNow.getMonth(), histNow.getDate());
            
            let hStartMonth = histToday.getMonth();
            let hStartYear = histToday.getFullYear();
            if (histToday.getDate() < fiscalDay) {
                hStartMonth--;
                if (hStartMonth < 0) { hStartMonth = 11; hStartYear--; }
            }

            const histPeriods = [];
            for (let i = 0; i < 24; i++) {
                let sMonth = hStartMonth - i;
                let sYear = hStartYear;
                while (sMonth < 0) { sMonth += 12; sYear--; }
                
                const fStart = new Date(sYear, sMonth, fiscalDay);
                const eDate = i === 0 ? histToday : new Date(fStart.getTime() - 86400000);
                if (eDate > histToday) continue;

                const lMonth = (sMonth + 1) % 12;
                const lYear = sMonth === 11 ? sYear + 1 : sYear;
                const label = `${monthNamesShort[lMonth]} ${lYear}`;
                
                const stats = calculatePatrimonioAt(eDate);
                histPeriods.push({ label, ...stats });
            }

            const histData = histPeriods.filter(d => d.cashTotal !== 0 || d.stockCost !== 0);
            const histTableRows = histData.map((row, i) => {
                const prev = histData[i + 1];
                const delta = prev ? row.total - prev.total : 0;
                return [
                    row.label,
                    Number(row.cashTotal.toFixed(2)),
                    Number(row.stockCost.toFixed(2)),
                    Number(row.total.toFixed(2)),
                    Number(delta.toFixed(2))
                ];
            });

            const maxT = Math.max(...histData.map(d => d.total), 1);
            wsHist.addTable({
                name: 'TablaPatrimonioHist',
                ref: 'A1',
                headerRow: true,
                totalsRow: false,
                style: { theme: 'TableStyleMedium2', showRowStripes: true },
                columns: [
                    { name: 'Período', filterButton: true },
                    { name: 'Ahorro', filterButton: true },
                    { name: 'Bolsa', filterButton: true },
                    { name: 'Total', filterButton: true },
                    { name: 'Δ Período', filterButton: true },
                    { name: 'Visual', filterButton: false } // Symbol-based fallback
                ],
                rows: histData.map((row, i) => {
                    const prev = histData[i + 1];
                    const delta = prev ? row.total - prev.total : 0;
                    
                    // Simple symbol bar: █ for Bolsa, ▒ for Ahorro
                    const segments = 25;
                    const bolsaBars = Math.round((row.stockCost / maxT) * segments);
                    const ahorroBars = Math.round((row.cashTotal / maxT) * segments);
                    const visual = '█'.repeat(bolsaBars) + '▒'.repeat(ahorroBars);
                    
                    return [
                        row.label,
                        Number(row.cashTotal.toFixed(2)),
                        Number(row.stockCost.toFixed(2)),
                        Number(row.total.toFixed(2)),
                        Number(delta.toFixed(2)),
                        visual
                    ];
                })
            });

            // Set column widths and formatting
            wsHist.columns = [
                { width: 15 }, // Período
                { width: 18 }, // Ahorro
                { width: 18 }, // Bolsa
                { width: 18 }, // Total
                { width: 15 }, // Delta
                { width: 35 }  // Visual Chart
            ];
            [2, 3, 4, 5].forEach(col => wsHist.getColumn(col).numFmt = '#,##0.00"€"');
            wsHist.getColumn(6).font = { name: 'Consolas', size: 10 }; // Fixed width font for better visual

            // DataBar conditional formatting for 'Total' column
            wsHist.addConditionalFormatting({
                ref: `D2:D${histData.length + 1}`,
                rules: [
                    {
                        type: 'dataBar',
                        color: { argb: 'FF3B82F6' },
                        cfvo: [{ type: 'min', value: 0 }, { type: 'max', value: maxT }],
                        showValue: true
                    }
                ]
            });

            // Background coloring (manual bar look) for columns B, C, D
            // Note: Since ExcelJS 4.4.0 might have limited dataBar support in some exports,
            // the 'Visual' column (6) with symbols is the most robust way.

            // 3. Generate and Buffer
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            
            const now = new Date();
            const timestamp = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}_${String(now.getHours()).padStart(2, '0')}${String(now.getMinutes()).padStart(2, '0')}`;
            const fileName = `msv-export-${timestamp}.xlsx`;

            // 4. Download
            if (typeof saveAs !== 'undefined') {
                saveAs(blob, fileName);
            } else {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = fileName;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
            showToast('✅ Hoja de cálculo generada con éxito');

        } catch (error) {
            console.error('Error exportando a Excel:', error);
            showToast('❌ Error: ' + error.message, 'error');
        }
    }

    function applyGlobalData(data) {
        stocks = data.stocks;
        savingsDrawers = data.savings.map(d => ({ ...d, group: d.group || '' }));
        nominaData = migrateNominaData(data.nomina);
        if (data.countdowns) countdowns = data.countdowns;
        if (data.manualPrices) window.MANUAL_PRICES = data.manualPrices;
        if (data.livePrices) window.LIVE_PRICES = data.livePrices;
        if (data.liveDates) window.LIVE_DATES = data.liveDates;
        if (data.liveSources) window.LIVE_SOURCES = data.liveSources;
        if (data.fxRate) window.FX_RATE = data.fxRate;
        if (data.fxDate) window.FX_DATE = data.fxDate;
        recurringSavingsMovements = data.recurringMovements || [];

        isFirstUpdateDone = true;
        if (data.exportDate) {
            try { lastSyncTime = new Date(data.exportDate).toLocaleTimeString(); }
            catch { lastSyncTime = '-'; }
        }

        if (data.settings) {
            if (data.settings.fiscalDay) {
                fiscalDay = parseInt(data.settings.fiscalDay);
                localStorage.setItem('fiscalDay', fiscalDay);
            }
            if (data.settings.incomeCategories) {
                incomeCategories = data.settings.incomeCategories;
                localStorage.setItem('incomeCategories', JSON.stringify(incomeCategories));
            }
            if (data.settings.expenseCategories) {
                expenseCategories = data.settings.expenseCategories;
                localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories));
            }
            if (data.settings.incomeSubcategories) {
                incomeSubcategories = data.settings.incomeSubcategories;
                localStorage.setItem('incomeSubcategories', JSON.stringify(incomeSubcategories));
            }
            if (data.settings.expenseSubcategories) {
                expenseSubcategories = data.settings.expenseSubcategories;
                localStorage.setItem('expenseSubcategories', JSON.stringify(expenseSubcategories));
            }
            if (data.settings.defaultTransferSource !== undefined) {
                localStorage.setItem('defaultTransferSource', data.settings.defaultTransferSource || '');
            }
        }

        if (window.saveStocks) window.saveStocks(stocks);
        if (window.saveSavings) window.saveSavings(savingsDrawers);
        if (window.saveNomina) window.saveNomina(nominaData);
        if (window.saveCountdowns) window.saveCountdowns(countdowns);
        if (window.saveManualPrices) window.saveManualPrices(window.MANUAL_PRICES);
        if (window.saveLivePrices) window.saveLivePrices(window.LIVE_PRICES);
        if (window.saveLiveDates) window.saveLiveDates(window.LIVE_DATES);
        if (window.saveLiveSources) window.saveLiveSources(window.LIVE_SOURCES);
        if (window.saveFXRate) window.saveFXRate(window.FX_RATE);
        if (window.saveFXDate) window.saveFXDate(window.FX_DATE);
        if (window.saveRecurringSavings) window.saveRecurringSavings(recurringSavingsMovements);
        render();
        if (currentView === 'nomina') renderNomina();
    }

    // ── Nextcloud Auto-Sync ────────────────────────────────────────
    let ncAutoSyncTimer = null;
    let ncSyncInProgress = false;
    let isSyncingFromServer = false; // Prevents loop: download -> apply -> render -> upload
    let ncLastServerModified = null; // Track server state to detect conflicts

    const updateSyncTimestampUI = (isoDate) => {
        if (!elements.sidebarSyncInfo || !elements.lastSyncTime) return;
        if (!isoDate) {
            elements.sidebarSyncInfo.style.display = 'none';
            return;
        }

        try {
            const date = new Date(isoDate);
            const now = new Date();
            const isToday = date.toDateString() === now.toDateString();

            let displayStr = '';
            if (isToday) {
                displayStr = `Hoy, ${date.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}`;
            } else {
                displayStr = date.toLocaleString('es-ES', {
                    day: '2-digit',
                    month: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit'
                });
            }

            elements.lastSyncTime.textContent = displayStr;
            elements.sidebarSyncInfo.style.display = 'flex';
        } catch (e) {
            console.warn("Failed to update sync UI:", e);
        }
    };

    // Called on app startup — checks if server has newer data
    async function ncSyncOnLoad() {
        const config = NextcloudSync.loadConfig();
        if (!config) {
            isInitialLoad = false;
            return;
        }

        try {
            // Priority 1: Check metadata via PROPFIND (bypasses GET cache)
            const metadata = await NextcloudSync.getFileMetadata(config);
            if (metadata) {
                console.log('[NC Sync] PROPFIND Metadata lastModified:', metadata.lastModified);
            }

            const result = await NextcloudSync.downloadData(config);
            if (!result.ok) {
                if (result.notFound) {
                    const appData = getGlobalDataObject();
                    const uploadResult = await NextcloudSync.uploadData(config, appData);
                    if (uploadResult.ok) {
                        updateSyncTimestampUI(uploadResult.timestamp);
                    }
                    showToast('📤 Datos sincronizados con Nextcloud', 'success');
                }
                isInitialLoad = false;
                return;
            }

            ncLastServerModified = result.lastModified;

            // USE STARTUP TIMESTAMP for comparison to avoid race condition with initial renders
            const localModified = startupLocalModified;

            let serverLastModified = result.lastModified;
            if (metadata && metadata.lastModified) {
                // PROPFIND is generally more reliable for real-time "true" file modification time
                serverLastModified = metadata.lastModified;
            }

            const serverDate = new Date(serverLastModified);
            const localDate = localModified ? new Date(localModified) : new Date(0);
            const isSameDevice = result.deviceId === NextcloudSync.getDeviceId();
            
            const diff = serverDate.getTime() - localDate.getTime();
            const tolerance = 2000; // 2 seconds

            console.log(`[NC Sync] Final check - Server: ${serverLastModified} (${serverDate}), Local: ${localModified} (${localDate}), Same: ${isSameDevice}`);

            if (isNaN(serverDate.getTime())) {
                console.error('[NC Sync] Invalid server date, skipping sync check');
                return;
            }

            if (diff > tolerance) {
                // Server has newer data
                if (isSameDevice) {
                    // Same device — auto-load silently
                    console.log('[NC Sync] Loading newer data from same device');
                    isSyncingFromServer = true;
                    applyGlobalData(result.data);
                    isSyncingFromServer = false;
                    NextcloudSync.setLocalModified(serverLastModified);
                    updateSyncTimestampUI(serverLastModified);
                    showToast('🔄 Datos actualizados desde Nextcloud', 'success');
                } else {
                    // Different device — ask the user
                    const sourceDevice = result.deviceName || 'Desconocido';
                    const sourceDate = serverDate.toLocaleString();
                    showCustomConfirm(
                        `📱 Hay datos más recientes en Nextcloud:\n\n` +
                        `Dispositivo: ${sourceDevice}\n` +
                        `Guardado: ${sourceDate}\n\n` +
                        `¿Cargar esos datos? (Si no, se mantendrán los locales)`,
                        () => {
                            isSyncingFromServer = true;
                            applyGlobalData(result.data);
                            isSyncingFromServer = false;
                            NextcloudSync.setLocalModified(serverLastModified);
                            updateSyncTimestampUI(serverLastModified);
                            showToast('✅ Datos cargados desde Nextcloud', 'success');
                        },
                        () => {
                            // User chose to keep local — upload local data
                            ncSafeUpload(true);
                        }
                    );
                }
            } else {
                console.log('[NC Sync] Local data is up to date');
                updateSyncTimestampUI(NextcloudSync.getLocalModified());
            }
        } catch (err) {
            console.error('[NC Sync] Error on load:', err);
        } finally {
            isInitialLoad = false;
        }
    }

    // Periodic check for server changes (e.g. from other devices)
    function ncStartPeriodicCheck() {
        setInterval(async () => {
            const config = NextcloudSync.loadConfig();
            if (!config || ncSyncInProgress) return;

            try {
                const result = await NextcloudSync.downloadData(config);
                if (result.ok) {
                    const serverDate = new Date(result.lastModified);
                    const lastKnown = ncLastServerModified ? new Date(ncLastServerModified) : new Date(0);
                    const isSameDevice = result.deviceId === NextcloudSync.getDeviceId();

                    if (serverDate > lastKnown && !isSameDevice) {
                        console.log('[NC Sync] Background check: Newer data found on server');
                        // Show notification to user
                        showCustomConfirm(
                            `📱 Hay datos más recientes en Nextcloud (desde ${result.deviceName || 'otro dispositivo'}).\n\n¿Quieres cargarlos ahora?`,
                            () => {
                                isSyncingFromServer = true;
                                applyGlobalData(result.data);
                                isSyncingFromServer = false;
                                NextcloudSync.setLocalModified(result.lastModified);
                                ncLastServerModified = result.lastModified;
                                updateSyncTimestampUI(result.lastModified);
                                showToast('✅ Datos actualizados desde Nextcloud', 'success');
                            }
                        );
                    }
                }
            } catch (e) {
                console.warn('[NC Sync] Periodic check failed:', e);
            }
        }, 5 * 60 * 1000); // 5 minutes
    }

    // Debounced auto-upload — called after data changes
    function ncScheduleAutoUpload() {
        if (isSyncingFromServer) return; // Don't upload while applying server data

        const config = NextcloudSync.loadConfig();
        if (!config) return;

        // Auto-upload is entirely disabled per user preference
        
        // Mark local data as modified (ONLY if we are not in the initial load phase)
        if (!isInitialLoad) {
            NextcloudSync.setLocalModified(new Date().toISOString());
        }

        if (ncAutoSyncTimer) clearTimeout(ncAutoSyncTimer);
    }

    // Upload with conflict detection
    async function ncSafeUpload(force = false) {
        if (ncSyncInProgress) return;
        const config = NextcloudSync.loadConfig();
        if (!config) return;

        ncSyncInProgress = true;

        const updateTimer = document.getElementById('updateTimer');
        if (updateTimer) {
            updateTimer.textContent = '☁️ Sincronizando...';
            updateTimer.classList.remove('hidden');
        }

        try {
            if (!force) {
                // Check server for conflicts
                const serverResult = await NextcloudSync.downloadData(config);
                if (serverResult.ok) {
                    const serverDate = new Date(serverResult.lastModified);
                    const lastKnown = ncLastServerModified ? new Date(ncLastServerModified) : new Date(0);
                    const isSameDevice = serverResult.deviceId === NextcloudSync.getDeviceId();

                    if (serverDate > lastKnown && !isSameDevice) {
                        // Another device has uploaded newer data since we last checked
                        const sourceDevice = serverResult.deviceName || 'Desconocido';
                        showCustomConfirm(
                            `⚠️ Otro dispositivo (${sourceDevice}) ha guardado datos más recientes.\n\n` +
                            `¿Sobrescribir con tus datos locales?`,
                            () => {
                                // User confirms overwrite
                                ncDoUpload(config);
                            },
                            () => {
                                // User cancels — optionally load server data
                                showCustomConfirm(
                                    `¿Quieres cargar los datos del servidor en su lugar?`,
                                    () => {
                                        isSyncingFromServer = true;
                                        applyGlobalData(serverResult.data);
                                        isSyncingFromServer = false;
                                        NextcloudSync.setLocalModified(serverResult.lastModified);
                                        ncLastServerModified = serverResult.lastModified;
                                        showToast('✅ Datos cargados desde Nextcloud', 'success');
                                    }
                                );
                            }
                        );
                        return;
                    }
                }
            }

            await ncDoUpload(config);
        } catch (err) {
            console.error('[NC Sync] Auto-upload error:', err);
            showToast('❌ Error de sincronización automática', 'error');
        } finally {
            ncSyncInProgress = false;
            const updateTimer = document.getElementById('updateTimer');
            if (updateTimer) {
                // If it was the success message, it'll be hidden by its own timeout elsewhere, 
                // but let's make sure it hides or stays showing success for a bit.
                if (updateTimer.textContent.includes('Sincronizando')) {
                    updateTimer.textContent = '✅ Sincronizado';
                    setTimeout(() => updateTimer.classList.add('hidden'), 2000);
                }
            }
        }
    }

    async function ncDoUpload(config) {
        const appData = getGlobalDataObject();
        const result = await NextcloudSync.uploadData(config, appData);
        if (result.ok) {
            ncLastServerModified = result.timestamp;
            updateSyncTimestampUI(result.timestamp);
            console.log('[NC Sync] Auto-upload OK:', result.timestamp);
        }
    }

    function showToast(message, type = 'success', duration = 3000) {
        let container = document.querySelector('.toast-container');
        if (!container) {
            container = document.createElement('div');
            container.className = 'toast-container';
            document.body.appendChild(container);
        }

        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        const icon = type === 'success' ? '✅' : '❌';
        toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;

        container.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(1rem)';
            toast.style.transition = 'all 0.3s ease-in';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    }

    async function triggerDownload(contentUri, fileName, blobData = null) {
        let pickerUsed = false;
        try {
            // Try to use File System Access API for better experience (handles Overwrite natively)
            // But skip if we are in PWA standalone mode on Android as it often fails partially
            const isAndroid = /Android/i.test(navigator.userAgent);
            const isPWA = window.matchMedia('(display-mode: standalone)').matches;

            if ('showSaveFilePicker' in window && !(isAndroid && isPWA)) {
                pickerUsed = true;
                const blob = blobData || await fetch(contentUri).then(r => r.blob());
                const handle = await window.showSaveFilePicker({
                    suggestedName: fileName,
                    types: [{
                        description: fileName.endsWith('.json') ? 'JSON File' : 'CSV File',
                        accept: fileName.endsWith('.json') ? { 'application/json': ['.json'] } : { 'text/csv': ['.csv'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(blob);
                await writable.close();
                showToast(`Guardado correctamente como ${fileName}`);
                return;
            }
        } catch (err) {
            // User cancelled or error occurred in FilePicker
            if (err.name === 'AbortError') return;
            console.error("FilePicker error:", err);
            // If picker was already used/prompted, don't fall back immediately as it might double-up or confuse
            // but if it's a known issue, maybe we should just allow the fallback.
            if (pickerUsed) {
                showToast(`Error al guardar el archivo: ${err.message || 'Operación fallida'}`, 'error');
                return;
            }
        }

        // Fallback for browsers/mobile without FileSystem API or if Picker failed/was skipped
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', contentUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();

        showToast(`Descarga iniciada: ${fileName}`);
        console.log(`File ${fileName} exported successfully (fallback)`);
    }

    function updateDataSourceUI() {
        if (!elements.dataSourceIcon || !elements.dataSourceLabel) return;
        const mode = window.DATA_SOURCE_MODE;
        const isYahoo = mode === 'yahoo';

        elements.dataSourceIcon.textContent = isYahoo ? '📊' : '⚡';
        elements.dataSourceLabel.textContent = isYahoo ? 'Yahoo' : 'Híbrido';

        if (elements.bolsaDataSourceToggleBtn) {
            elements.bolsaDataSourceToggleBtn.style.borderColor = isYahoo ? 'rgba(59, 130, 246, 0.8)' : 'rgba(59, 130, 246, 0.4)';
            elements.bolsaDataSourceToggleBtn.title = isYahoo
                ? 'Modo: Solo Yahoo Finance (Pulsa para Híbrido)'
                : 'Modo: Finnhub + Yahoo Fallback (Pulsa para Solo Yahoo)';
        }
        // Update sidebar button text
        const sidebarSourceBtn = document.getElementById('bolsaDataSourceToggleBtn2');
        if (sidebarSourceBtn) {
            sidebarSourceBtn.innerHTML = mode === 'yahoo'
                ? '<span>📊</span> Origen: Yahoo'
                : '<span>⚡</span> Origen: Híbrido';
        }
    }

    // Start
    const initApp = function () {
        updateAhorroGastosMonthLabel();
        updateStorageStatus();
        const initialSync = NextcloudSync.getLocalModified();
        updateSyncTimestampUI(initialSync);
        showWelcomeScreen(); // New startup greeting
        if (elements.bolsaDataSourceToggleBtn) {
            elements.bolsaDataSourceToggleBtn.addEventListener('click', toggleDataSource);
        }
        updateDataSourceUI();
        // Init Manual Prices
        if (window.loadManualPrices) {
            window.MANUAL_PRICES = window.loadManualPrices();
        }

        // --- Manejo de Deep Linking / Accesos Directos ---
        const handleDeepLink = () => {
            const params = new URLSearchParams(window.location.search);
            let viewParam = params.get('view');

            // Fallback: buscar en el hash si no está en el query
            if (!viewParam && window.location.hash.includes('view=')) {
                viewParam = window.location.hash.split('view=')[1].split('&')[0];
            }

            const validViews = ['bolsa', 'ahorro', 'nomina', 'analisis', 'ahorroGastos'];
            if (viewParam && validViews.includes(viewParam)) {
                console.log(`[DeepLink] Navegando a: ${viewParam}`);
                switchView(viewParam);
            }
        };

        // Ejecutar al inicio
        handleDeepLink();

        // Escuchar cambios de historial (opcional, por si el TWA no recarga)
        window.addEventListener('popstate', handleDeepLink);

        // --- New: detect if we have cached live data to avoid "-" total display ---
        if (Object.keys(window.LIVE_PRICES || {}).length > 0) {
            isFirstUpdateDone = true;
            console.log("[Cache] Found stored prices, setting isFirstUpdateDone = true");
        }

        switchView(currentView);
        setupEventListeners();
        // Nextcloud sync is initialized inside setupEventListeners() via ncSyncOnLoad()
        // which handles pulled data from server and enables auto-uploads.

        console.log("initApp completed");
    }

    /**
     * Shows a premium welcome screen on app startup
     */
    function showWelcomeScreen() {
        if (!elements.welcomeOverlay) return;

        // Display current URL / hostname
        const subtextEl = document.getElementById('welcomeSubtext');
        if (subtextEl) {
            subtextEl.innerHTML = `WealthTrack está listo para tus finanzas.<br><span style="font-size: 0.8rem; color: var(--accent); opacity: 0.8; margin-top: 0.5rem; display: inline-block;">📍 Accesible desde: <strong>${window.location.hostname || 'localhost'}</strong></span>`;
        }

        // Calculate greeting
        const hour = new Date().getHours();
        let greeting = "¡Buenas noches!";
        let emoji = "✨";
        if (hour >= 6 && hour < 12) {
            greeting = "¡Buenos días!";
            emoji = "☀️";
        } else if (hour >= 12 && hour < 20) {
            greeting = "¡Buenas tardes!";
            emoji = "🌤️";
        }

        elements.welcomeGreeting.textContent = greeting;
        const emojiEl = document.getElementById('welcomeEmoji');
        if (emojiEl) emojiEl.textContent = emoji;

        // Date and Time
        const options = { weekday: 'long', day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' };
        elements.welcomeDateTime.textContent = new Date().toLocaleString('es-ES', options);

        // Nextcloud Sync Status
        const ncConfig = NextcloudSync.loadConfig();
        if (ncConfig) {
            const lastSync = NextcloudSync.getLocalModified();
            if (lastSync) {
                elements.welcomeNextcloudGroup.classList.remove('hidden');
                elements.welcomeNextcloudTime.textContent = new Date(lastSync).toLocaleString('es-ES', {
                    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
                });
            }
        }

        // Show overlay
        elements.welcomeOverlay.classList.remove('hidden');

        // Close button
        elements.welcomeEnterBtn.onclick = () => {
            elements.welcomeOverlay.classList.add('hidden');
            // Check if login is needed AFTER welcome
            if (typeof checkLogin === 'function') checkLogin();
        };
    }
    function setupClockCountdown() {
        const clockMenuBtn = document.getElementById('clockMenuBtn');
        const clockModal = document.getElementById('clockCountdownModal');
        const closeClockModal = document.getElementById('closeClockModal');
        const currentDateDisplay = document.getElementById('currentDateDisplay');
        const currentTimeDisplay = document.getElementById('currentTimeDisplay');
        const addCountdownForm = document.getElementById('addCountdownForm');
        const countdownConceptInput = document.getElementById('countdownConceptInput');
        const countdownDateInput = document.getElementById('countdownDateInput');
        const countdownsList = document.getElementById('countdownsList');
        const countdownEditId = document.getElementById('countdownEditId');
        const submitCountdownBtn = document.getElementById('submitCountdownBtn');
        const cancelEditCountdownBtn = document.getElementById('cancelEditCountdownBtn');


        let clockInterval;

        function updateClock() {
            const now = new Date();
            if (currentDateDisplay) {
                currentDateDisplay.textContent = now.toLocaleDateString('es-ES');
            }
            if (currentTimeDisplay) {
                currentTimeDisplay.textContent = now.toLocaleTimeString('es-ES', { hour12: false });
            }
        }

        function renderCountdowns() {
            if (!countdownsList) return;
            countdownsList.innerHTML = '';

            // Sort by closest date
            countdowns.sort((a, b) => parseAppDate(a.date) - parseAppDate(b.date));

            const now = new Date();
            now.setHours(0, 0, 0, 0);

            if (countdowns.length === 0) {
                countdownsList.innerHTML = '<p style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">No hay cuentas atrás configuradas.</p>';
                return;
            }

            countdowns.forEach(item => {
                const targetDate = new Date(item.date);
                targetDate.setHours(0, 0, 0, 0);

                const diffTime = targetDate - now;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                let daysText = diffDays > 0 ? `Faltan ${diffDays} días` : (diffDays === 0 ? '¡Es hoy!' : `Hace ${Math.abs(diffDays)} días`);
                let colorClass = diffDays > 0 ? 'var(--primary)' : (diffDays === 0 ? 'var(--success)' : 'var(--danger)');

                const div = document.createElement('div');
                div.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.05); padding: 10px; border-radius: 8px; border: 1px solid var(--border-color);';

                div.innerHTML = `
                    <div style="display:flex; flex-direction:column; gap:4px; max-width: 65%;">
                        <strong style="white-space:nowrap; overflow:hidden; text-overflow:ellipsis;" title="${item.concept}">${item.concept}</strong>
                        <span style="font-size: 0.8rem; opacity: 0.7;">${targetDate.toLocaleDateString('es-ES')}</span>
                    </div>
                    <div style="display:flex; align-items:center; gap: 10px; justify-content: flex-end;">
                        <span style="font-weight:bold; color:${colorClass}; white-space:nowrap; font-size: 0.9rem;">${daysText}</span>
                        <button class="btn-sm btn-edit-countdown" data-id="${item.id}" style="background:transparent; border:none; color:var(--primary); cursor:pointer; font-size:1.1rem; padding:0 5px; line-height:1;" title="Editar">✏️</button>
                        <button class="btn-sm btn-delete-countdown" data-id="${item.id}" style="background:transparent; border:none; color:var(--danger); cursor:pointer; font-size:1.5rem; padding:0 5px; line-height:1;" title="Eliminar">×</button>
                    </div>
                `;
                countdownsList.appendChild(div);
            });

            document.querySelectorAll('.btn-edit-countdown').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('.btn-edit-countdown').getAttribute('data-id');
                    const targetCountdown = countdowns.find(c => c.id === id);
                    if (targetCountdown) {
                        countdownEditId.value = targetCountdown.id;
                        countdownConceptInput.value = targetCountdown.concept;
                        countdownDateInput.value = targetCountdown.date;

                        submitCountdownBtn.textContent = '💾';
                        submitCountdownBtn.title = 'Guardar Cambios';
                        cancelEditCountdownBtn.classList.remove('hidden');
                        countdownConceptInput.focus();
                    }
                });
            });

            document.querySelectorAll('.btn-delete-countdown').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const id = e.target.closest('.btn-delete-countdown').getAttribute('data-id');
                    countdowns = countdowns.filter(c => c.id !== id);
                    if (window.saveCountdowns) window.saveCountdowns(countdowns);

                    if (countdownEditId && countdownEditId.value === id) {
                        resetCountdownForm();
                    }

                    renderCountdowns();
                });
            });
        }

        function resetCountdownForm() {
            if (countdownEditId) countdownEditId.value = '';
            countdownConceptInput.value = '';
            countdownDateInput.value = '';
            if (submitCountdownBtn) {
                submitCountdownBtn.textContent = '➕';
                submitCountdownBtn.title = 'Añadir';
            }
            if (cancelEditCountdownBtn) cancelEditCountdownBtn.classList.add('hidden');
        }

        if (clockMenuBtn && clockModal && closeClockModal) {
            clockMenuBtn.addEventListener('click', () => {
                clockModal.classList.remove('hidden');
                updateClock();
                if (clockInterval) clearInterval(clockInterval);
                clockInterval = setInterval(updateClock, 1000);
                renderCountdowns();
            });

            closeClockModal.addEventListener('click', () => {
                clockModal.classList.add('hidden');
                if (clockInterval) clearInterval(clockInterval);
            });

            // Close on outside click
            clockModal.addEventListener('click', (e) => {
                if (e.target === clockModal) {
                    clockModal.classList.add('hidden');
                    if (clockInterval) clearInterval(clockInterval);
                }
            });

            if (cancelEditCountdownBtn) {
                cancelEditCountdownBtn.addEventListener('click', resetCountdownForm);
            }
        }

        if (addCountdownForm) {
            addCountdownForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const concept = countdownConceptInput.value.trim();
                const date = countdownDateInput.value;
                const editId = countdownEditId ? countdownEditId.value : '';

                if (!concept || !date) return;

                if (editId) {
                    const index = countdowns.findIndex(c => c.id === editId);
                    if (index !== -1) {
                        countdowns[index] = { ...countdowns[index], concept, date };
                    }
                } else {
                    const newCountdown = {
                        id: Date.now().toString(),
                        concept,
                        date
                    };
                    countdowns.push(newCountdown);
                }

                if (window.saveCountdowns) window.saveCountdowns(countdowns);
                resetCountdownForm();
                renderCountdowns();
            });
        }
    }

    function setupNumericSignToggles() {
        const numericInputs = document.querySelectorAll('input[type="number"]');
        numericInputs.forEach(input => {
            // Exclude specific inputs
            if (input.id === 'fiscalDayInput') return;
            if (input.classList.contains('no-toggle')) return;
            let pendingNegative = false;

            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.alignItems = 'stretch';
            wrapper.style.gap = '6px';
            wrapper.style.width = '100%';

            input.parentNode.insertBefore(wrapper, input);

            const signBtn = document.createElement('button');
            signBtn.type = 'button';
            signBtn.className = 'btn-secondary sign-toggle-btn';
            signBtn.style.padding = '0 0.8rem';
            signBtn.style.fontSize = '1.3rem';
            signBtn.style.fontWeight = 'bold';
            signBtn.style.lineHeight = '1';
            signBtn.style.border = '1px solid rgba(255,255,255,0.1)';
            signBtn.style.backgroundColor = 'rgba(255,255,255,0.05)';
            signBtn.style.flex = '0 0 auto';
            signBtn.style.borderRadius = 'var(--radius)';
            signBtn.style.cursor = 'pointer';

            const updateBtnState = () => {
                const val = parseFloat(input.value);
                const isNeg = (!isNaN(val) && val < 0) || (isNaN(val) && pendingNegative);
                if (isNeg) {
                    signBtn.textContent = '-';
                    signBtn.style.color = 'var(--danger)';
                    signBtn.style.backgroundColor = 'rgba(239, 68, 68, 0.1)';
                    signBtn.style.borderColor = 'rgba(239, 68, 68, 0.3)';
                } else {
                    signBtn.textContent = '+';
                    signBtn.style.color = 'var(--success)';
                    signBtn.style.backgroundColor = 'rgba(16, 185, 129, 0.1)';
                    signBtn.style.borderColor = 'rgba(16, 185, 129, 0.3)';
                }
            };

            updateBtnState();

            wrapper.appendChild(signBtn);
            wrapper.appendChild(input);
            input.style.flex = '1';
            input.style.minWidth = '0';

            signBtn.addEventListener('click', (e) => {
                e.preventDefault();
                let val = parseFloat(input.value);
                if (!isNaN(val) && val !== 0) {
                    input.value = (val * -1).toString();
                    input.dispatchEvent(new Event('input', { bubbles: true }));
                    input.dispatchEvent(new Event('change', { bubbles: true }));
                } else {
                    pendingNegative = !pendingNegative;
                }
                updateBtnState();
                input.focus();
            });

            input.addEventListener('input', () => {
                if (pendingNegative && input.value && input.value !== '-') {
                    let val = parseFloat(input.value);
                    if (val > 0) {
                        input.value = (val * -1).toString();
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                    }
                    pendingNegative = false;
                }
                updateBtnState();
            });

            input.addEventListener('change', updateBtnState);
        });
    }

    setupNumericSignToggles();
    setupClockCountdown();
    // Draggable Bottom Nav Hub (Mobile) - Robust Implementation
    function setupDraggableBottomNav() {
        const nav = elements.bottomNav;
        if (!nav) return;

        // Prevent browser scrolling while dragging
        nav.style.touchAction = 'none';

        let isDragging = false;
        let startY = 0;
        let startBottom = 0;

        const onStart = (e) => {
            // Ignore if clicking a button (don't block the button click)
            if (e.target.closest('button') || e.target.closest('.bottom-nav-item') || e.target.closest('.floating-action-btn')) {
                // If it's the DRAG HANDLE itself, we DO want to drag even if it's inside/covered
                if (!e.target.closest('.drag-handle')) return;
            }

            isDragging = true;
            startY = e.clientY || (e.touches ? e.touches[0].clientY : 0);

            const style = window.getComputedStyle(nav);
            startBottom = parseInt(style.bottom) || 0;

            nav.style.transition = 'none';

            // Add global listeners to handle fast movement or leaving element
            document.addEventListener('pointermove', onMove, { passive: false });
            document.addEventListener('pointerup', onEnd);
            document.addEventListener('pointercancel', onEnd);
        };

        const onMove = (e) => {
            if (!isDragging) return;

            const clientY = e.clientY || (e.touches ? e.touches[0].clientY : 0);
            const dy = startY - clientY;
            let newBottom = startBottom + dy;

            // Constraints
            const maxB = window.innerHeight - 80;
            newBottom = Math.max(10, Math.min(newBottom, maxB));

            nav.style.bottom = `${newBottom}px`;

            // Prevent event from bubbling or causing scroll
            if (e.cancelable) e.preventDefault();
        };

        const onEnd = () => {
            if (!isDragging) return;
            isDragging = false;

            const currentB = parseInt(nav.style.bottom) || 0;
            updateMinimizedState(currentB < -10);

            nav.style.transition = 'bottom 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
            localStorage.setItem('bottomNavPos', nav.style.bottom);

            // Clean up global listeners
            document.removeEventListener('pointermove', onMove);
            document.removeEventListener('pointerup', onEnd);
            document.removeEventListener('pointercancel', onEnd);
        };

        nav.addEventListener('pointerdown', onStart);

        // Minimize/Maximize Toggle
        const minimizeBtn = document.getElementById('bottomNavMinimizeBtn');
        const updateMinimizedState = (isNowMinimized) => {
            nav.classList.toggle('is-minimized', isNowMinimized);
            if (minimizeBtn) minimizeBtn.classList.toggle('rotated', !isNowMinimized);
        };

        if (minimizeBtn) {
            minimizeBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                const currentB = parseInt(nav.style.bottom) || 0;

                // If it's above -10px, it's "open", so we minimize it to -45px
                const currentlyOpen = currentB > -10;
                const targetB = currentlyOpen ? -45 : 24;

                nav.style.transition = 'bottom 0.4s cubic-bezier(0.18, 0.89, 0.32, 1.28)';
                nav.style.bottom = `${targetB}px`;
                updateMinimizedState(!currentlyOpen);

                localStorage.setItem('bottomNavPos', nav.style.bottom);
            });
        }

        // Restore position
        const savedPos = localStorage.getItem('bottomNavPos');
        if (savedPos) {
            nav.style.bottom = savedPos;
            const bVal = parseInt(savedPos) || 0;
            updateMinimizedState(bVal < -10);
        } else {
            // Default open
            updateMinimizedState(false);
        }
    }

    setupDraggableBottomNav();

    // Calendar Listeners
    if (elements.closeCalendarModal) {
        elements.closeCalendarModal.addEventListener('click', () => {
            elements.savingsCalendarModal.classList.add('hidden');
        });
    }
    if (elements.prevCalendarMonth) {
        elements.prevCalendarMonth.addEventListener('click', () => {
            calendarViewDate.setDate(1);
            calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
            renderCalendar();
        });
    }
    if (elements.nextCalendarMonth) {
        elements.nextCalendarMonth.addEventListener('click', () => {
            calendarViewDate.setDate(1);
            calendarViewDate.setMonth(calendarViewDate.getMonth() + 1);
            renderCalendar();
        });
    }
    if (elements.savingsCalendarModal) {
        elements.savingsCalendarModal.addEventListener('click', (e) => {
            if (e.target === elements.savingsCalendarModal) {
                elements.savingsCalendarModal.classList.add('hidden');
            }
        });
    }

    showApp();
});
