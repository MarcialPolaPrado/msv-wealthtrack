document.addEventListener('DOMContentLoaded', () => {

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
    let expandedSummaryDrawers = new Set();
    let drawerDetailFilterMode = localStorage.getItem('drawerDetailFilterMode') || 'all';
    let activityListMonth = _initialMonthStr;
    let activitySortConfig = getSortConfig('activitySortConfig', { key: 'date', direction: 'desc' });
    let activityCellFilter = { column: null, value: null };
    let activityFilterMode = localStorage.getItem('activityFilterMode') || 'month'; // 'month' or 'year'
    let activityDrawerFilter = localStorage.getItem('activityDrawerFilter') || 'all';
    let activitySearchQuery = '';
    let activityPageSize = 50;
    let activityCurrentLimit = 50;

    let calendarDrawerId = null;
    let calendarViewDate = new Date(); // Month/Year currently shown in the calendar modal

    const DRAWER_COLORS = [
        { name: 'green', border: '#10b981', bg: '#064e3b', grad: 'rgba(16, 185, 129, 0.4)' },
        { name: 'blue', border: '#3b82f6', bg: '#1e3a8a', grad: 'rgba(59, 130, 246, 0.4)' },
        { name: 'indigo', border: '#6366f1', bg: '#312e81', grad: 'rgba(99, 102, 241, 0.4)' },
        { name: 'purple', border: '#8b5cf6', bg: '#4c1d95', grad: 'rgba(139, 92, 246, 0.4)' },
        { name: 'red', border: '#ef4444', bg: '#7f1d1d', grad: 'rgba(239, 68, 68, 0.4)' },
        { name: 'orange', border: '#f59e0b', bg: '#78350f', grad: 'rgba(245, 158, 11, 0.4)' },
        { name: 'yellow', border: '#eab308', bg: '#713f12', grad: 'rgba(234, 179, 8, 0.4)' }
    ];



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
    const GOOGLE_CLIENT_ID = atob('OTAwNDA0NzcyODcwLTEwOGM3dGE4dnI1NjcwZWR1NWF2dmEyZ3NiYm43NXB0LmFwcHMuZ29vZ2xldXNlcmNvbnRlbnQuY29t');
    const GOOGLE_API_KEY = atob('QUl6YVN5QXp0ZTZOWl9PaHdBMTVHbHp4aGVPeGszb3dSWUZmLTRV');
    const GOOGLE_DISCOVERY_DOCS = ["https://www.googleapis.com/discovery/v1/apis/drive/v3/rest"];
    const GOOGLE_SCOPES = 'https://www.googleapis.com/auth/drive.file';
    let gapiInited = false;
    let gDriveTokenClient;
    let gDriveAccessToken = null;
    let gDriveIsUploading = false; 
    let gDriveLastBackupTime = 0; // Prevent redundant copies within seconds

    if (!expenseCategories.includes('Traspaso')) {
        expenseCategories.push('Traspaso');
        localStorage.setItem('expenseCategories', JSON.stringify(expenseCategories));
    }
    let isPrivacyActive = localStorage.getItem('isPrivacyActive') === 'true' || false;
    let currentView = 'ahorro';
    let lastSyncTime = '-';
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

    let countdowns = (window.loadCountdowns) ? window.loadCountdowns() : [];

    let currentGoalDrawerId = null;

    function setDrawerTargetAmount(id) {
        const drawer = savingsDrawers.find(d => d.id === id);
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

    function getFiscalMonth(dateInput = new Date()) {
        const d = new Date(dateInput);
        if (d.getDate() >= fiscalDay) {
            d.setMonth(d.getMonth() + 1);
        }
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    function formatFiscalMonth(isoMonth) {
        if (!isoMonth || typeof isoMonth !== 'string' || !isoMonth.includes('-')) return isoMonth || '---';
        const [year, month] = isoMonth.split('-');
        const date = new Date(parseInt(year), parseInt(month) - 1);
        if (isNaN(date.getTime())) return isoMonth;
        const str = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
        return str.charAt(0).toUpperCase() + str.slice(1);
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
                const isNominaName = concept.name?.toLowerCase().includes('nomina') || concept.name?.toLowerCase().includes('nómina');
                const hasEverHadExpenses = (concept.movements || []).some(m => !isProvision(m) && m.amount < 0);

                if (isNominaName) {
                    concept.type = 'income';
                } else if (!concept.type || concept.type === 'expense') {
                    // Transition to 'saving' if it has no expenses
                    concept.type = hasEverHadExpenses ? 'expense' : 'saving';
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

        // Portfolio Candle Elements
        portfolioCandleCard: document.getElementById('portfolioCandleCard'),
        portfolioCandleGraphic: document.getElementById('portfolioCandleGraphic'),
        valOpen: document.getElementById('valOpen'),
        valClose: document.getElementById('valClose'),
        valHigh: document.getElementById('valHigh'),
        valLow: document.getElementById('valLow'),
        candleDate: document.getElementById('candleDate'),
        connStatusDot: document.getElementById('connStatusDot'),
        marketStatusIcon: document.getElementById('marketStatusIcon'),
        manualRefreshBtn: document.getElementById('manualRefreshBtn'),
        portfolioPieChart: document.getElementById('portfolioPieChart'),
        bolsaSummarySection: document.getElementById('bolsaSummarySection'),
        bolsaSummaryToggleBtn: document.getElementById('bolsaSummaryToggleBtn'),
        ahorroSummarySection: document.getElementById('ahorroSummarySection'),
        ahorroSummaryToggleBtn: document.getElementById('ahorroSummaryToggleBtn'),

        // Savings Elements
        navItems: document.querySelectorAll('.nav-item'),
        bolsaSection: document.getElementById('bolsaSection'),
        ahorroSection: document.getElementById('ahorroSection'),
        misCajonesTitle: document.getElementById('misCajonesTitle'),
        drawersGrid: document.getElementById('drawersGrid'),
        addDrawerBtn: document.getElementById('addDrawerBtn'),
        exportSavingsBtn: document.getElementById('exportSavingsBtn'),

        // Savings Modal Elements
        savingsInputModal: document.getElementById('savingsInputModal'),
        addDrawerBtn: document.getElementById('addDrawerBtn'),
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
        bolsaTotalesToggle: document.getElementById('bolsaTotalesToggle'),
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
        activityDateTrigger: document.getElementById('activityDateTrigger'),
        activityMonthInput: document.getElementById('activityMonthInput'),
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
        sidebarDeleteAllBtn: document.getElementById('sidebarDeleteAllBtn'),
        sidebarActivityBtn: document.getElementById('sidebarActivityBtn'),
        wealthNavItems: document.querySelectorAll('.wealth-nav-item'),
        bottomNavItems: document.querySelectorAll('.bottom-nav-item'),
        
        // Google Drive Elements
        gDriveStatusText: document.getElementById('gDriveStatusText'),
        gDriveLoginBtn: document.getElementById('gDriveLoginBtn'),
        gDriveLoggedActions: document.getElementById('gDriveLoggedActions'),
        gDriveAutoBackup: document.getElementById('gDriveAutoBackup'),
        gDriveManualBackup: document.getElementById('gDriveManualBackup'),
        gDriveRestoreBtn: document.getElementById('gDriveRestoreBtn'),
        gDriveLastSync: document.getElementById('gDriveLastSync'),
        googleClientIdInput: document.getElementById('googleClientIdInput'),
        googleApiKeyInput: document.getElementById('googleApiKeyInput'),
        drawerIconGroup: document.getElementById('drawerIconGroup'),
        drawerIconInput: document.getElementById('drawerIconInput'),
        nominaIconGroup: document.getElementById('nominaIconGroup'),
        nominaIconInput: document.getElementById('nominaIconInput'),
        smartConceptToggle: document.getElementById('smartConceptToggle'),
        historicConceptsDatalist: document.getElementById('historicConcepts'),
        storageUsageBar: document.getElementById('storageUsageBar'),
        storageUsageText: document.getElementById('storageUsageText'),
        addNewCategoryBtn: document.getElementById('addNewCategoryBtn'),
        addNewSubcategoryBtn: document.getElementById('addNewSubcategoryBtn')
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
            (drawer.movements || []).forEach(m => {
                const desc = (m.description || m.concept || '').trim();
                if (desc && m.category) {
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
        try {
            const data = getGlobalDataObject(); 
            const jsonString = JSON.stringify(data);
            const sizeBytes = new Blob([jsonString]).size;
            
            // Theoretical LocalStorage limit 5MB
            const limitBytes = 5 * 1024 * 1024;
            const percentage = Math.min((sizeBytes / limitBytes) * 100, 100);
            const sizeDisplay = sizeBytes > 1024 * 1024 
                ? (sizeBytes / (1024 * 1024)).toFixed(2) + ' MB'
                : (sizeBytes / 1024).toFixed(1) + ' KB';
            
            elements.storageUsageBar.style.width = percentage + '%';
            elements.storageUsageText.textContent = `${percentage.toFixed(1)}% (${sizeDisplay})`;
            
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
        const updateSubmenuBtn = (id, isActive, baseText) => {
            const btn = document.getElementById(id);
            if (!btn) return;
            const iconSpan = btn.querySelector('span:first-child');
            const icon = iconSpan ? iconSpan.outerHTML : '';
            btn.innerHTML = `${icon} ${baseText} (${isActive ? 'on' : 'off'})`;
        };

        updateSubmenuBtn('bolsaHighlightsToggleBtn2', bolsaHighlightsVisible, 'Highlights');
        updateSubmenuBtn('bolsaSummaryToggleBtn2', bolsaSummaryVisible, 'Mostrar/Ocultar Totales');
        updateSubmenuBtn('bolsaTotalesToggle2', bolsaTotalsMode, 'Totales por Acción');
        updateSubmenuBtn('ahorroSummaryToggleBtn2', ahorroSummaryVisible, 'Mostrar/Ocultar Totales');
        updateSubmenuBtn('ahorroTotalesToggle2', ahorroListFilterMode === 'totals', 'Totales por Cajón');
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

    function render() {
        updateSidebarTogglesUI();
        // Toggle Bolsa Summary Visibility
        if (elements.bolsaSummarySection) {
            elements.bolsaSummarySection.classList.toggle('hidden', !bolsaSummaryVisible);
        }
        if (elements.bolsaSummaryToggleBtn) {
            elements.bolsaSummaryToggleBtn.style.background = bolsaSummaryVisible ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
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
            elements.bolsaViewToggleBtn.innerHTML = bolsaViewMode === 'cards' ? '<span>📄</span>' : '<span>🗂️</span>';
            elements.bolsaViewToggleBtn.title = bolsaViewMode === 'cards' ? 'Vista Lista' : 'Vista Tarjetas';
        }

        // Sync Sidebar View Toggle
        const sidebarViewBtn = document.getElementById('bolsaViewToggleBtn2');
        if (sidebarViewBtn) {
            sidebarViewBtn.innerHTML = bolsaViewMode === 'cards' 
                ? '<span>📄</span> Vista Lista' 
                : '<span>🗂️</span> Vista Tarjetas';
        }
        
        if (elements.bolsaTotalesToggle) {
            elements.bolsaTotalesToggle.classList.toggle('hidden', bolsaViewMode === 'cards');
            elements.bolsaTotalesToggle.style.background = bolsaTotalsMode ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
            
            // Sync with Sidebar
            const sidebarTotalsBtn = document.getElementById('bolsaTotalesToggle2');
            if (sidebarTotalsBtn) {
                sidebarTotalsBtn.style.background = bolsaTotalsMode ? 'rgba(59, 130, 246, 0.2)' : 'transparent';
                sidebarTotalsBtn.style.color = bolsaTotalsMode ? 'white' : 'var(--text-muted)';
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
                    stockTableBody.appendChild(tr);
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
                stockTableBody.appendChild(trTotal);

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
                            stockTableBody.appendChild(trDetail);
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
                stockTableBody.appendChild(trTotal);

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

        updatePortfolioCandle(totalInvestedEUR, totalCurrentValueEUR);

        // Section Toggling logic
        if (currentView === 'activity') {
            if (elements.activitySection) elements.activitySection.classList.remove('hidden');
            if (elements.bolsaSection) elements.bolsaSection.classList.add('hidden');
            if (elements.ahorroSection) elements.ahorroSection.classList.add('hidden');
            if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
            if (elements.analisisSection) elements.analisisSection.classList.add('hidden');
            if (elements.mobileActionBar) elements.mobileActionBar.classList.add('hidden');
            renderActivity();
        } else {
            if (elements.activitySection) elements.activitySection.classList.add('hidden');

            if (currentView === 'bolsa') {
                if (elements.bolsaSection) elements.bolsaSection.classList.remove('hidden');
                if (elements.ahorroSection) elements.ahorroSection.classList.add('hidden');
                if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
                if (elements.analisisSection) elements.analisisSection.classList.add('hidden');
                if (elements.mobileActionBar) elements.mobileActionBar.classList.remove('hidden');
                renderPortfolioPieChart();
            } else if (currentView === 'ahorro') {
                if (elements.bolsaSection) elements.bolsaSection.classList.add('hidden');
                if (elements.ahorroSection) elements.ahorroSection.classList.remove('hidden');
                if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
                if (elements.analisisSection) elements.analisisSection.classList.add('hidden');
                if (elements.mobileActionBar) elements.mobileActionBar.classList.add('hidden');
                renderSavings();
            } else if (currentView === 'nomina') {
                if (elements.bolsaSection) elements.bolsaSection.classList.add('hidden');
                if (elements.ahorroSection) elements.ahorroSection.classList.add('hidden');
                if (elements.analisisSection) elements.analisisSection.classList.add('hidden');
                if (elements.nominaSection) elements.nominaSection.classList.remove('hidden');
                if (elements.mobileActionBar) elements.mobileActionBar.classList.add('hidden');
                renderNomina();
            } else if (currentView === 'analisis') {
                if (elements.bolsaSection) elements.bolsaSection.classList.add('hidden');
                if (elements.ahorroSection) elements.ahorroSection.classList.add('hidden');
                if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
                if (elements.analisisSection) elements.analisisSection.classList.remove('hidden');
                if (elements.mobileActionBar) elements.mobileActionBar.classList.add('hidden');
                renderAnalisis();
            }
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
                amount: -( (s.qty || 0) * (s.price || 0) ), 
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
            filtered = allMovements.filter(m => m.date && m.date.startsWith(activityListMonth));
        } else if (activityFilterMode === 'year') {
            const year = activityListMonth.split('-')[0];
            filtered = allMovements.filter(m => m.date && m.date.startsWith(year));
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
        elements.activityDateTrigger?.classList.toggle('hidden', activityFilterMode !== 'month');

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
            // Support OR (|) and AND (+) logic
            const orGroups = activitySearchQuery.toLowerCase().split('|').map(g => g.trim()).filter(g => g);
            filtered = filtered.filter(m => {
                const concept = (m.concept || '').toLowerCase();
                const category = (m.category || '').toLowerCase();
                const text = concept + " " + category;
                
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
                totalAmount += m.amount;
                const tr = document.createElement('tr');
                tr.style.borderBottom = '1px solid var(--glass-border)';
                tr.style.background = 'rgba(255,255,255,0.02)';
                
                const amountClass = m.amount >= 0 ? 'profit' : 'loss';
                const dateStr = m.date ? new Date(m.date).toLocaleDateString() : '---';
                const amountStr = fmtEUR(m.amount, 2);

                const isFiltered = (col, val) => {
                    if (activityCellFilter.column !== col) return false;
                    if (col === 'category' && val.startsWith('Bolsa') && activityCellFilter.value?.startsWith('Bolsa')) return true;
                    return activityCellFilter.value === val;
                };

                tr.innerHTML = `
                    <td style="padding: 1rem; font-size: 0.9rem; cursor: pointer; ${isFiltered('date', dateStr) ? 'background: var(--primary-glow); color: white;' : ''}" data-col="date" data-val="${dateStr}">${dateStr}</td>
                    <td style="padding: 1rem; font-size: 0.9rem; font-weight: 500; cursor: pointer; ${isFiltered('concept', m.concept) ? 'background: var(--primary-glow); color: white;' : ''}" data-col="concept" data-val="${m.concept}">${m.concept}</td>
                    <td style="padding: 1rem; font-size: 0.9rem; cursor: pointer; ${isFiltered('category', m.category) ? 'background: var(--primary-glow); color: white;' : ''}" data-col="category" data-val="${m.category}">
                        <span style="background: rgba(255,255,255,0.1); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem;">${m.category}</span>
                        ${m.type === 'ahorro' && m.drawerName ? `<div style="font-size: 0.7rem; opacity: 0.55; margin-top: 3px; padding-left: 2px;">${m.drawerName}</div>` : ''}
                    </td>
                    <td style="padding: 1rem; font-size: 0.95rem; text-align: right; font-weight: 700; cursor: pointer; ${isFiltered('amount', amountStr) ? 'background: var(--primary-glow); color: white;' : ''}" class="${amountClass}" data-col="amount" data-val="${amountStr}">${amountStr}</td>
                    <td style="padding: 1rem; text-align: center;">
                        <div style="display: flex; gap: 4px; justify-content: center;">
                            <button class="btn-icon activity-edit-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Editar" style="padding: 4px 8px;">✏️</button>
                            <button class="btn-icon activity-copy-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Copiar" style="padding: 4px 8px;">📑</button>
                            <button class="btn-icon activity-delete-btn" data-type="${m.type}" data-id="${m.id}" data-drawer="${m.drawerId || ''}" data-index="${m.mvmtIndex !== undefined ? m.mvmtIndex : ''}" title="Eliminar" style="padding: 4px 8px; filter: contrast(0.5) opacity(0.8);">🗑️</button>
                        </div>
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
                <td colspan="3" style="padding: 1rem; text-align: right; color: var(--text-muted); font-size: 0.75rem; text-transform: uppercase; letter-spacing: 1px;">Balance Total</td>
                <td style="padding: 1rem; font-size: 1.1rem; text-align: right;" class="${totalAmount >= 0 ? 'profit' : 'loss'}">${fmtEUR(totalAmount, 2)}</td>
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
    }

    function updateActivityDrawerFilterOptions() {
        if (!elements.activityDrawerFilter) return;
        const currentValue = activityDrawerFilter;
        let html = '<option value="all">📁 Todos los Cajones</option>';
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
                ahorroFilterMode === 'year' ? ahorroListMonth.split('-')[0] :
                    'Todos'
            }</span>
                    </div>
                </div>

                <div class="collapsible-content ${isAhorroSummaryExpanded ? 'expanded' : ''}" id="ahorroSummaryContent">
                    <!-- Global Wealth Summary -->
                    <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 1rem; border: 1px dashed var(--primary-light); padding: 1.2rem; border-radius: 16px; background: rgba(var(--primary-rgb), 0.05);">
                        <div style="display: flex; flex-direction: column; gap: 4px;">
                            <div style="font-size: 0.75rem; opacity: 0.6; text-transform: uppercase;">Efectivo (Cajones)</div>
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
                        let match = false;
                        const mDate = new Date(m.date);
                        if (ahorroFilterMode === 'month') match = (getFiscalMonth(mDate) === ahorroListMonth);
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
            elements.ahorroTableBody.innerHTML = '<tr><td colspan="4" style="padding:2rem; text-align:center; opacity:0.5;">No hay cajones configurados</td></tr>';
            return;
        }

        // Apply Sorting to Drawers
        const sortedDrawers = [...savingsDrawers].sort((a, b) => {
            let valA, valB;
            if (ahorroSortConfig.key === 'name') {
                valA = a.name.toLowerCase();
                valB = b.name.toLowerCase();
            } else if (ahorroSortConfig.key === 'balance') {
                const getFilteredBalance = (d) => {
                    let mvmts;
                    if (ahorroFilterMode === 'month') {
                        mvmts = (d.movements || []).filter(m => m.date && getFiscalMonth(m.date) === ahorroListMonth);
                    } else if (ahorroFilterMode === 'year') {
                        const year = ahorroListMonth.split('-')[0];
                        mvmts = (d.movements || []).filter(m => m.date && m.date.startsWith(year));
                    } else {
                        mvmts = d.movements || [];
                    }
                    return mvmts.reduce((s, m) => s + m.amount, 0);
                };
                valA = getFilteredBalance(a);
                valB = getFilteredBalance(b);
            } else if (ahorroSortConfig.key === 'concept') {
                // Determine "leading" category for this month
                const getLeadCategory = (drawer) => {
                    const mvmts = (drawer.movements || []).filter(m => {
                        if (ahorroFilterMode === 'month') return m.date && getFiscalMonth(m.date) === ahorroListMonth;
                        if (ahorroFilterMode === 'year') return m.date && m.date.startsWith(ahorroListMonth.split('-')[0]);
                        return true;
                    });
                    if (mvmts.length === 0) return '';
                    // Use most recent movement for sorting
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
        sortedDrawers.forEach(drawer => {
            // Filter movements for this drawer and selected mode
            let drawerMovements = [];
            if (ahorroFilterMode === 'month') {
                drawerMovements = (drawer.movements || []).filter(m => m.date && getFiscalMonth(m.date) === ahorroListMonth);
            } else if (ahorroFilterMode === 'year') {
                const year = ahorroListMonth.split('-')[0];
                drawerMovements = (drawer.movements || []).filter(m => m.date && m.date.startsWith(year));
            } else {
                drawerMovements = (drawer.movements || []);
            }

            if (drawerMovements.length === 0) return; // Don't show drawer if no movements in this view

            // Calculate balance from filtered movements only
            const filteredBalance = drawerMovements.reduce((sum, m) => sum + m.amount, 0);
            globalFilteredTotal += filteredBalance;

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
                                <button class="transfer-list-btn btn-secondary" title="Transferir">⇆</button>
                                <button class="edit-drawer-list-btn btn-secondary" title="Editar Cajón">✏️</button>
                                <button class="delete-drawer-list-btn btn-danger" title="Borrar Cajón">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="balance">${fmtEUR(filteredBalance)}</td>
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

            elements.ahorroTableBody.appendChild(headerTr);

            // Sort by date descending
            drawerMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (ahorroListFilterMode !== 'totals') {
                drawerMovements.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.className = `ahorro-list-row mvmt-drawer-${drawer.id}`;

                    const isIncome = m.amount > 0;
                    const amountColor = isIncome ? 'var(--success)' : 'var(--danger)';
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
                    
                    elements.ahorroTableBody.appendChild(tr);
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
            elements.ahorroTableBody.appendChild(totalTr);
        }

        if (elements.ahorroTableBody.innerHTML === '') {
            elements.ahorroTableBody.innerHTML = '<tr><td colspan="3" style="padding:2rem; text-align:center; opacity:0.5;">No hay movimientos en este periodo</td></tr>';
        }
    }

    function renderSavings() {
        if (!elements.drawersGrid) return;
        
        if (elements.ahorroSummarySection) {
            elements.ahorroSummarySection.classList.toggle('hidden', !ahorroSummaryVisible);
            
            if (elements.ahorroSummaryToggleBtn) {
                elements.ahorroSummaryToggleBtn.style.background = ahorroSummaryVisible ? 'var(--primary)' : 'rgba(255,255,255,0.05)';
            }

            const cashTotal = savingsDrawers.filter(d => d.id !== 'bolsa').reduce((s, d) => s + d.balance, 0);
            const bolsaBalance = savingsDrawers.find(d => d.id === 'bolsa')?.balance || 0;
            const patrimonyTotal = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
            currentPatrimonioTotal = patrimonyTotal;

            elements.ahorroSummarySection.innerHTML = `
                <div class="card summary-card glass-panel" style="display: flex; align-items: center; gap: 1.25rem; border-color: rgba(255,255,255,0.1);">
                    <div class="summary-icon" style="font-size: 1.75rem; background: rgba(255,255,255,0.05); min-width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 14px;">🏦</div>
                    <div class="summary-info" style="display: flex; flex-direction: column; gap: 2px;">
                        <span class="summary-label" style="font-size: 0.7rem; opacity: 0.6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">EFECTIVO</span>
                        <span class="summary-value" style="font-size: 1.4rem; font-weight: 800; color: white;">${fmtEUR(cashTotal)}</span>
                    </div>
                </div>
                <div class="card summary-card glass-panel" style="display: flex; align-items: center; gap: 1.25rem; border-color: rgba(59, 130, 246, 0.3);">
                    <div class="summary-icon" style="font-size: 1.75rem; background: rgba(59, 130, 246, 0.1); min-width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 14px;">📈</div>
                    <div class="summary-info" style="display: flex; flex-direction: column; gap: 2px;">
                        <span class="summary-label" style="font-size: 0.7rem; opacity: 0.6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">INVERSIONES</span>
                        <span class="summary-value" style="color: var(--primary); font-size: 1.4rem; font-weight: 800;">${fmtEUR(bolsaBalance)}</span>
                    </div>
                </div>
                <div class="card summary-card glass-panel" style="display: flex; align-items: center; gap: 1.25rem; border-color: rgba(16, 185, 129, 0.3);">
                    <div class="summary-icon" style="font-size: 1.75rem; background: rgba(16, 185, 129, 0.1); min-width: 54px; height: 54px; display: flex; align-items: center; justify-content: center; border-radius: 14px;">💎</div>
                    <div class="summary-info" style="display: flex; flex-direction: column; gap: 2px;">
                        <span class="summary-label" style="font-size: 0.7rem; opacity: 0.6; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em;">PATRIMONIO TOTAL</span>
                        <span class="summary-value" style="color: var(--success); font-weight: 800; font-size: 1.4rem;">${fmtEUR(patrimonyTotal)}</span>
                    </div>
                </div>
            `;
        }

        // Calculate Global Total
        const total = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
        if (elements.misCajonesTitle) {
            elements.misCajonesTitle.textContent = `Mis Cajones: ${fmtEUR(total)}`;
        }

        // Toggle visibility based on view mode
        if (ahorroViewMode === 'list') {
            elements.drawersGrid?.classList.add('hidden');
            elements.ahorroTableContainer?.classList.remove('hidden');

            if (elements.ahorroViewToggleBtn) {
                elements.ahorroViewToggleBtn.innerHTML = '<span>🗂️</span>';
                elements.ahorroViewToggleBtn.title = 'Cambiar a Vista Cajones';
            }
            
            // Sync with Sidebar
            const sidebarBtn = document.getElementById('ahorroViewToggleBtn2');
            if (sidebarBtn) sidebarBtn.innerHTML = '<span>🗂️</span> Vista Cajones';

            renderSavingsList();
        } else {
            elements.drawersGrid?.classList.remove('hidden');
            elements.ahorroTableContainer?.classList.add('hidden');

            if (elements.ahorroViewToggleBtn) {
                elements.ahorroViewToggleBtn.innerHTML = '<span>📄</span>';
                elements.ahorroViewToggleBtn.title = 'Cambiar a Vista Listado';
            }
            
            // Sync with Sidebar
            const sidebarBtn = document.getElementById('ahorroViewToggleBtn2');
            if (sidebarBtn) sidebarBtn.innerHTML = '<span>📄</span> Vista Listado';
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

                card.innerHTML = `
                    <div class="drawer-color-btn" title="Cambiar Color" style="position: absolute; top: 0.5rem; right: 0.5rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; filter: grayscale(1); opacity: 0.4; transition: all 0.2s;">🎨</div>
                    <div class="drawer-target-icon" title="Establecer Objetivo" style="right: 3rem !important; top: 0.5rem !important;">🎯</div>
                    <div class="drawer-calendar-icon" title="Ver Calendario" style="position: absolute; right: 5.5rem; top: 0.5rem; width: 24px; height: 24px; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.4; transition: all 0.2s; filter: grayscale(1);">📅</div>
                    <span class="drawer-icon">${drawer.icon}</span>
                    <span class="drawer-name" style="color: white !important; font-weight: 700;">${drawer.name}</span>
                    <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                        <div style="display: flex; flex-direction: column;">
                            <div style="font-size: 0.65rem; opacity: 0.8; text-transform: uppercase; margin-bottom: 2px; font-weight: 700; color: white;">${drawer.id === 'bolsa' ? 'En Bolsa' : ''}</div>
                            <span class="drawer-amount" style="color: ${drawer.id === 'bolsa' ? 'white' : theme.border} !important; font-weight: 800; font-size: 1.2rem; display: block;">${fmtEUR(drawer.balance)}</span>
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
                            <button class="transfer-btn btn-secondary" title="Transferir" style="padding:0.5rem 0; font-size:1.2rem; font-weight:bold; flex:1; display:flex; justify-content:center; align-items:center;">⇆</button>
                            <button class="edit-drawer-btn btn-secondary" title="Editar Cajón" style="padding:0.5rem 0; font-size:1rem; flex:1; display:flex; justify-content:center; align-items:center;">✏️</button>
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

        const best = [...validStocks].sort((a,b) => (b.liveInfo.stockPLPercent || 0) - (a.liveInfo.stockPLPercent || 0))[0];
        const worst = [...validStocks].sort((a,b) => (a.liveInfo.stockPLPercent || 0) - (b.liveInfo.stockPLPercent || 0))[0];
        
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
                        <p style="font-size: 0.8rem; opacity: 0.7;">Reparto total por cajones de ahorro</p>
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
                elements.nominaTableBody.appendChild(sepTr);
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
                                ${drawer.linkedSavingsDrawerId ? `<button class="transfer-nomina-ahorro-list-btn btn-primary" style="background:var(--success); padding: 0.3rem 0.6rem;" title="Transferir Ahorro">➡️</button>` : ''}
                                <button class="edit-nomina-drawer-list-btn btn-secondary" title="Editar Cajón">✏️</button>
                                <button class="delete-nomina-drawer-list-btn btn-danger" title="Borrar Cajón">🗑️</button>
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

            elements.nominaTableBody.appendChild(headerTr);

            // In totals mode, skip movement rows
            if (nominaListFilterMode === 'totals') return;

            if (drawerMovements.length === 0) {
                const emptyTr = document.createElement('tr');
                emptyTr.className = 'ahorro-list-empty-row';
                emptyTr.innerHTML = `<td colspan="3">Sin movimientos este mes</td>`;
                elements.nominaTableBody.appendChild(emptyTr);
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

                    elements.nominaTableBody.appendChild(tr);
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
            elements.nominaTableBody.appendChild(sepTr);

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
                elements.nominaTableBody.appendChild(tr);
            });
        }
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
            // Sync with Sidebar
            const sidebarBtn = document.getElementById('nominaViewToggleBtn2');
            if (sidebarBtn) sidebarBtn.innerHTML = '<span>🗂️</span> Vista Tarjetas';
        } else {
            elements.nominaGridContainer?.classList.remove('hidden');
            elements.nominaTableContainer?.classList.add('hidden');

            if (elements.nominaViewToggleBtn) {
                elements.nominaViewToggleBtn.innerHTML = '<span>📄</span>';
                elements.nominaViewToggleBtn.title = 'Cambiar a Vista Listado';
            }
            // Sync with Sidebar
            const sidebarBtn = document.getElementById('nominaViewToggleBtn2');
            if (sidebarBtn) sidebarBtn.innerHTML = '<span>📄</span> Vista Listado';
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

            const isIncome = concept.type === 'income' ||
                concept.name?.toLowerCase().includes('nomina') ||
                concept.name?.toLowerCase().includes('nómina');

            const isSavings = concept.type === 'saving';

            const card = document.createElement('div');
            card.className = `card drawer-card glass-panel ${isIncome ? 'income-drawer' : ''} ${isSavings ? 'savings-drawer' : ''} ${concept.isAutomatic ? 'undestined-drawer' : ''}`;
            
            // Apply themes
            const colorIdx = concept.colorIndex !== undefined ? concept.colorIndex : (isIncome ? 0 : (isSavings ? 5 : 2));
            const theme = DRAWER_COLORS[colorIdx % DRAWER_COLORS.length];
            
            card.style.setProperty('background', `rgba(${parseInt(theme.border.slice(1,3), 16)}, ${parseInt(theme.border.slice(3,5), 16)}, ${parseInt(theme.border.slice(5,7), 16)}, 0.25)`, 'important');
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
                        <button class="btn-icon edit-nomina-drawer" data-id="${concept.id}" title="Editar Cajón">✏️</button>
                        <button class="btn-icon delete-nomina-drawer" data-id="${concept.id}" title="Borrar Cajón">🗑️</button>
                    </div>`}
                </div>
                ${balanceDisplay}
                <div class="drawer-footer" style="margin-top: 1rem; display: flex; gap: 0.5rem;">
                   <button class="btn-secondary btn-sm add-nomina-movement" data-id="${concept.id}" style="flex:1" title="Añadir Movimiento">➕</button>
                   <button class="btn-primary btn-sm view-nomina-details" data-id="${concept.id}" style="flex:1" title="Historial">🕒</button>
                   ${concept.linkedSavingsDrawerId ? `<button class="btn-primary btn-sm transfer-nomina-ahorro" data-id="${concept.id}" style="background:var(--success); padding: 0.5rem; flex: 0 0 auto;" title="Transferir Ahorro">➡️</button>` : ''}
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
            
            card.style.setProperty('background', `rgba(${parseInt(theme.border.slice(1,3), 16)}, ${parseInt(theme.border.slice(3,5), 16)}, ${parseInt(theme.border.slice(5,7), 16)}, 0.25)`, 'important');
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
                            <p style="font-size: 0.8rem; opacity: 0.7;">${allMonthlyExpenses.length} gastos en ${Object.keys(totalsByDrawer).length} cajones</p>
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
                                        ${drawerMovements.sort((a, b) => new Date(b.date) - new Date(a.date)).map(m => `
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
                if (confirm('¿Estás seguro de que quieres eliminar este cajón de Nomina?')) {
                    deleteNominaDrawer(id);
                }
            }
        };
    }


    function switchView(view) {
        currentView = view;
        
        // Sync Sidebar Items
        elements.wealthNavItems?.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });
        
        // Sync Bottom Bar Items
        elements.bottomNavItems?.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Update Mobile FAB (mobileMenuBtn) Icon/Label based on view context
        if (elements.mobileMenuBtn) {
            const iconSpan = elements.mobileMenuBtn.querySelector('span');
            if (iconSpan) {
                if (view === 'bolsa') {
                    iconSpan.textContent = '✨';
                    elements.mobileMenuBtn.title = 'Añadir Inversión';
                } else if (view === 'ahorro') {
                    iconSpan.textContent = '💶';
                    elements.mobileMenuBtn.title = 'Nuevo Movimiento';
                } else if (view === 'nomina') {
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
            const isTarget = container.id === `${view}NavContainer`;
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
        if (title) title.textContent = "Crear Nuevo Cajón";

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
        transferTargetGroup?.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        
        targetDrawerSelectGroup?.classList.remove('hidden');
        if (targetDrawerSelect) {
            targetDrawerSelect.innerHTML = savingsDrawers
                .filter(d => !d.isAuto)
                .map(d => `<option value="${d.id}">${d.name} (${fmtEUR(d.balance)})</option>`)
                .join('');
            if (targetDrawerSelect.options.length === 0) {
                alert("Necesitas crear un cajón primero.");
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
        transferTargetGroup?.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');

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
        if (title) title.textContent = `Transferir desde: ${sourceDrawer.name}`;

        // Set default concept
        const conceptInput = document.getElementById('movementConceptInput');
        if (conceptInput) conceptInput.value = 'Traspaso';

        nameGroup?.classList.add('hidden');
        transferTargetGroup?.classList.remove('hidden');
        conceptGroup?.classList.remove('hidden');
        if (amountInput) amountInput.placeholder = "Importe a transferir";
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        const targetDrawerSelectGroup = document.getElementById('targetDrawerSelectGroup');
        targetDrawerSelectGroup?.classList.add('hidden');

        // Populate target dropdown (exclude source and Bolsa)
        transferTargetSelect.innerHTML = savingsDrawers
            .filter(d => !d.isAuto && d.id !== drawerId)
            .map(d => `<option value="${d.id}">${d.name} (${fmtEUR(d.balance)})</option>`)
            .join('');

        if (elements.transferCategorySelect) {
            elements.transferCategorySelect.innerHTML = expenseCategories.map(c => `<option value="${c}">${c}</option>`).join('');
            elements.transferCategorySelect.value = 'Traspaso';
        }
        if (elements.transferSubcategorySelect) {
            elements.transferSubcategorySelect.innerHTML = '<option value="">-- Sin subcategoría --</option>' + 
                expenseSubcategories.map(s => `<option value="${s}">${s}</option>`).join('');
            elements.transferSubcategorySelect.value = '';
        }

        if (transferTargetSelect.options.length === 0) {
            alert("Necesitas al menos otro cajón manual para realizar una transferencia.");
            return;
        }

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
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
        if (title) title.textContent = `Editar Cajón: ${drawer.name}`;

        if (drawerNameInput) drawerNameInput.value = drawer.name;
        if (elements.drawerGroupInput) elements.drawerGroupInput.value = drawer.group || '';
        nameGroup?.classList.remove('hidden');
        elements.drawerInfoGroup?.classList.add('hidden');

        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.remove('hidden');
        if (elements.drawerIconInput) elements.drawerIconInput.value = drawer.icon || '📁';

        // Find initial balance movement
        const initialMvmt = drawer.movements.find(m => isProvision(m));
        if (amountInput) {
            amountInput.value = initialMvmt ? initialMvmt.amount : 0;
            amountInput.placeholder = "Saldo Inicial (€)";
        }

        // Default to oldest movement's date for editing
        let oldestDate = new Date().toISOString().split('T')[0];
        if (drawer.movements && drawer.movements.length > 0) {
            const sortedMovements = [...drawer.movements].sort((a,b) => new Date(a.date) - new Date(b.date));
            oldestDate = sortedMovements[0].date;
        }
        if (elements.savingsDateInput) elements.savingsDateInput.value = oldestDate;

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

        showCustomConfirm(`¿Estás seguro de que deseas borrar el cajón "${drawer.name}"? Esta acción no se puede deshacer.`, () => {
            savingsDrawers = savingsDrawers.filter(d => d.id !== drawerId);
            if (window.saveSavings) window.saveSavings(savingsDrawers);
            render();
        });
    }

    function deleteSavingsMovement(drawerId, index) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || !drawer.movements[index]) return;

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
            ? '<p style="opacity:0.7">Este cajón se sincroniza automáticamente con el valor de tu cartera de acciones.</p>'
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
                            <button id="editDrawerFromDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.2rem;" title="Editar Cajón">✏️</button>
                            <button id="deleteDrawerFromDetails" style="background:none; border:none; color:var(--danger); cursor:pointer; font-size:1.2rem;" title="Borrar Cajón">🗑️</button>
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

            const mvmts = (drawer.movements || []).filter(m => m.date === dateStr);
            const totalOnDay = mvmts.reduce((sum, m) => sum + m.amount, 0);

            const cell = document.createElement('div');
            cell.className = `calendar-cell ${isToday ? 'today' : ''}`;
            
            let amountHtml = '';
            if (totalOnDay !== 0) {
                const colorClass = totalOnDay > 0 ? 'income' : 'expense';
                amountHtml = `<div class="calendar-cell-amount ${colorClass}">${fmtEUR(totalOnDay)}</div>`;
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

        const dayMovements = (drawer.movements || [])
            .map((m, idx) => ({ ...m, originalIndex: idx }))
            .filter(m => m.date === dateStr);

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
        conceptGroup?.classList.remove('hidden');
        transferTargetGroup?.classList.add('hidden');
        elements.drawerGroupGroup?.classList.add('hidden');
        if (elements.drawerIconGroup) elements.drawerIconGroup.classList.add('hidden');

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
            if (elements.savingsSubcategorySelect) elements.savingsSubcategorySelect.value = subCat;

            if (elements.savingsCategoryGroup) {
                elements.savingsCategoryGroup.classList.remove('hidden');
            }
            if (elements.savingsSubcategoryGroup) {
                elements.savingsSubcategoryGroup.classList.remove('hidden');
            }
        }

        if (amountInput) amountInput.value = Math.abs(movement.amount);
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

        let totalOpen = 0;
        let totalHigh = 0;
        let totalLow = 0;
        let totalClose = 0;
        let candleDateStr = '';
        let hasData = false;

        stocks.forEach(stock => {
            const tickerUpper = stock.ticker.trim().toUpperCase();
            const mockInfo = window.MOCK_DATA[tickerUpper];
            if (mockInfo && mockInfo.historical && mockInfo.historical['D']) {
                const history = mockInfo.historical['D'];
                if (history.length >= 1) {
                    const latestBar = history[history.length - 1];
                    if (!candleDateStr) candleDateStr = latestBar.time;
                    const fx = mockInfo.currency === 'USD' ? window.FX_RATE : 1;

                    totalOpen += latestBar.open * fx * stock.qty;
                    totalHigh += latestBar.high * fx * stock.qty;
                    totalLow += latestBar.low * fx * stock.qty;
                    totalClose += latestBar.close * fx * stock.qty;
                    hasData = true;
                }
            }
        });

        // FORCE SYNC: Si estamos en modo simulado/fin de semana, el cierre debe ser EXACTO al del dashboard
        // para evitar discrepancias por decimales o redondeos entre funciones
        if (dashClose > 0 && !window.NETWORK_OFFLINE) {
            totalClose = dashClose;
        }

        if (!hasData || stocks.length === 0) {
            elements.portfolioCandleCard.classList.add('hidden');
            return;
        }

        elements.portfolioCandleCard.classList.remove('hidden');

        // Numeric values
        const invested = dashInvested;
        const current = dashClose;
        elements.valOpen.textContent = fmtEUR(totalOpen);
        elements.valClose.textContent = fmtEUR(totalClose);
        elements.valHigh.textContent = fmtEUR(totalHigh);
        elements.valLow.textContent = fmtEUR(totalLow);
        if (elements.candleDate) elements.candleDate.textContent = formatDate(candleDateStr);

        // SVG Candle
        const isBullish = totalClose >= totalOpen;
        const color = isBullish ? '#10b981' : '#ef4444'; // Using hex to be safe
        const height = 100;
        const width = 60;
        const padding = 10;

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
        localStorage.setItem('fiscalDay', newFiscalDay);

        // Default Transfer Source

        // Default Transfer Source
        if (elements.defaultTransferSourceSelect) {
            localStorage.setItem('defaultTransferSource', elements.defaultTransferSourceSelect.value);
        }



        // Apply visual updates and notify user
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
    window.panicReset = panicReset;

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
        });
    }

    function loadDemoData() {
        const now = new Date();
        const past = new Date();
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
            { id: 'emergency_demo', name: 'Fondo de Emergencia', icon: '🛡️', balance: 3500, movements: [
                { id: Date.now() + 1, date: pastStr, amount: 3500, category: 'Ahorro', concept: 'Aportación inicial (Ahorros acumulados)', type: 'income' }
            ], isAuto: false, targetAmount: 5000 },
            { id: 'travel_demo', name: 'Hucha Viajes', icon: '✈️', balance: 1350, movements: [
                { id: Date.now() + 2, date: pastStr, amount: 1500, category: 'Ahorro', concept: 'Venta material segunda mano', type: 'income' },
                { id: Date.now() + 3, date: currentStr, amount: 150, category: 'Gasto', concept: 'Reserva hotel Venecia', type: 'expense' }
            ], isAuto: false, targetAmount: 2500 },
            { id: 'car_demo', name: 'Coche Nuevo', icon: '🚗', balance: 500, movements: [
                { id: Date.now() + 6, date: currentStr, amount: 500, category: 'Ahorro', concept: 'Primera aportación coche', type: 'income' }
            ], isAuto: false, targetAmount: 20000 }
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
                    { id: 'demo_mov_1', date: currentStr, amount: 2500, category: 'Ahorro', concept: 'Nómina Mensual', type: 'income', activeMonths: [1,2,3,4,5,6,7,8,9,10,11,12], paid: true }
                ]
            },
            {
                id: 'demo_nom_2',
                name: 'Alquiler / Hipoteca',
                icon: '🏠',
                type: 'expense',
                movements: [
                    { id: 'demo_mov_2', date: currentStr, amount: 850, category: 'Gasto', concept: 'Recibo Mensual', type: 'expense', activeMonths: [1,2,3,4,5,6,7,8,9,10,11,12], paid: true }
                ]
            },
            {
                id: 'demo_nom_3',
                name: 'Ahorro Coche',
                icon: '🚗',
                type: 'saving',
                linkedSavingsDrawerId: 'car_demo',
                movements: [
                    { id: 'demo_mov_3', date: currentStr, amount: 500, category: 'Ahorro', concept: 'Aportación Hucha', type: 'income', activeMonths: [1,2,3,4,5,6,7,8,9,10,11,12], paid: true }
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
        bolsaViewMode = bolsaViewMode === 'cards' ? 'list' : 'cards';
        localStorage.setItem('bolsaViewMode', bolsaViewMode);
        render();
    }

    function toggleAhorroView() {
        ahorroViewMode = ahorroViewMode === 'cards' ? 'list' : 'cards';
        localStorage.setItem('ahorroViewMode', ahorroViewMode);
        render();
    }

    function toggleNominaView() {
        nominaViewMode = nominaViewMode === 'cards' ? 'list' : 'cards';
        localStorage.setItem('nominaViewMode', nominaViewMode);
        render();
    }

    function showAhorroBreakdown() {
        breakdownDrawerFilter = null;
        breakdownContext = 'ahorro';
        const now = new Date();
        if (elements.breakdownMonthInput) {
            elements.breakdownMonthInput.value = now.toISOString().slice(0, 7);
        }
        if (elements.breakdownYearInput) {
            elements.breakdownYearInput.value = now.getFullYear();
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
                elements.breakdownModalTitle.textContent = `Rendimientos: ${drawer ? drawer.name : 'Cajón'}`;
            } else {
                elements.breakdownModalTitle.textContent = "Resumen de Rendimientos (Global)";
            }
        }

        filteredDrawers.forEach(drawer => {
            (drawer.movements || []).forEach(mov => {
                const movDate = new Date(mov.date);
                const movYear = movDate.getFullYear();
                const movMonthStr = movDate.toISOString().slice(0, 7);
                
                let match = false;
                if (filterType === 'month') {
                    match = movMonthStr === monthVal;
                } else {
                    match = movYear.toString() === yearVal.toString();
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

        // New Navigation Logic
        const allNavs = [...elements.wealthNavItems, ...elements.bottomNavItems];
        allNavs.forEach(nav => {
            nav.addEventListener('click', (e) => {
                const view = nav.dataset.view;
                if (!view) return;

                const isSidebar = nav.classList.contains('wealth-nav-item');
                const container = nav.closest('.nav-item-container');

                if (currentView === view) {
                    if (view === 'bolsa') toggleBolsaView();
                    else if (view === 'ahorro') toggleAhorroView();
                    else if (view === 'nomina') toggleNominaView();
                    
                    if (isSidebar && container) {
                        container.classList.toggle('open');
                    }
                    return;
                }

                if (view === 'activity') {
                    activityFilterMode = 'all';
                    activityCellFilter = { column: null, value: null };
                    activitySearchQuery = '';
                    if (elements.activitySearchInput) elements.activitySearchInput.value = '';
                }
                switchView(view);

                if (elements.wealthSidebar) elements.wealthSidebar.classList.remove('mobile-open');
                if (elements.sidebarOverlay) elements.sidebarOverlay.classList.remove('visible');
            });
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
            } else if (effectiveView === 'ahorro') {
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
            } else if (effectiveView === 'nomina') {
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
        elements.sidebarDeleteAllBtn?.addEventListener('click', () => deleteAllData());

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
        document.getElementById('bolsaSummaryToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            bolsaSummaryVisible = !bolsaSummaryVisible;
            localStorage.setItem('bolsaSummaryVisible', bolsaSummaryVisible);
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
        document.getElementById('bolsaViewToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleBolsaView();
        });
        document.getElementById('bolsaTotalesToggle2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            bolsaTotalsMode = !bolsaTotalsMode;
            localStorage.setItem('bolsaTotalsMode', bolsaTotalsMode);
            
            // If turning on totals, force list view to see the effect
            if (bolsaTotalsMode) {
                bolsaViewMode = 'list';
                localStorage.setItem('bolsaViewMode', 'list');
            }
            render();
        });

        document.getElementById('ahorroViewToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleAhorroView();
        });
        document.getElementById('ahorroSummaryToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ahorroSummaryVisible = !ahorroSummaryVisible;
            localStorage.setItem('ahorroSummaryVisible', ahorroSummaryVisible);
            render();
        });
        document.getElementById('ahorroTotalesToggle2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            ahorroListFilterMode = (ahorroListFilterMode === 'totals' ? 'detail' : 'totals');
            localStorage.setItem('ahorroListFilterMode', ahorroListFilterMode);
            
            // Force list view
            ahorroViewMode = 'list';
            localStorage.setItem('ahorroViewMode', 'list');
            
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
        document.getElementById('nominaViewToggleBtn2')?.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleNominaView();
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


        // Google Drive Integration Logic
        async function gDriveInit() {
            try {
                await new Promise((resolve) => gapi.load('client', resolve));
                await gapi.client.init({
                    apiKey: GOOGLE_API_KEY,
                    discoveryDocs: GOOGLE_DISCOVERY_DOCS,
                });
                gapiInited = true;
                
                gDriveTokenClient = google.accounts.oauth2.initTokenClient({
                    client_id: GOOGLE_CLIENT_ID,
                    scope: GOOGLE_SCOPES,
                    callback: async (resp) => {
                        if (resp.error !== undefined) {
                             console.error("GIS Error:", resp);
                             if (window._resolveToken) {
                                 window._resolveToken(false);
                                 delete window._resolveToken;
                             }
                             return;
                        }
                        gDriveAccessToken = resp.access_token;
                        gapi.client.setToken({ access_token: gDriveAccessToken });
                        
                        // Store expiration
                        const expiresAt = Date.now() + (resp.expires_in * 1000);
                        localStorage.setItem('gDriveExpiresAt', expiresAt);
                        localStorage.setItem('gDriveIsLoggedIn', 'true');
                        
                        // NEW: Fetch and store user email to use as hint for multiple accounts
                        try {
                            const uiResp = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                                headers: { Authorization: `Bearer ${gDriveAccessToken}` }
                            });
                            const userData = await uiResp.json();
                            if (userData.email) {
                                localStorage.setItem('gDriveUserHint', userData.email);
                            }
                        } catch (e) { console.error("Error fetching userinfo", e); }

                        updateGDriveUI(true);
                        
                        if (window._resolveToken) {
                            window._resolveToken(true);
                            delete window._resolveToken;
                        }
                    },
                });

                // Removed all auto-login and background refresh logic.
                updateGDriveUI(false);
                
                const lastSync = localStorage.getItem('gDriveLastSyncTime');
                if (lastSync && elements.gDriveLastSync) {
                    elements.gDriveLastSync.textContent = "Última copia: " + lastSync;
                }
            } catch (err) {
                console.error("error gDriveInit", err);
            }
        }

        function updateGDriveUI(connected) {
            const hasToken = !!gDriveAccessToken;
            
            if (elements.gDriveStatusText) {
                if (hasToken) {
                    elements.gDriveStatusText.textContent = '✅ Conectado';
                    elements.gDriveStatusText.style.color = 'var(--success)';
                    elements.gDriveStatusText.style.opacity = '1';
                } else {
                    elements.gDriveStatusText.textContent = '❌ No conectado';
                    elements.gDriveStatusText.style.color = 'inherit';
                    elements.gDriveStatusText.style.opacity = '0.6';
                }
            }
            
            elements.gDriveLoginBtn?.classList.toggle('hidden', hasToken);
            elements.gDriveLoggedActions?.classList.toggle('hidden', !hasToken);
        }

        async function uploadDataToGDrive(silent = false) {
            // Check both the lock and a 10-second cooldown
            if (gDriveIsUploading) return false;
            const nowTime = Date.now();
            if (silent && (nowTime - gDriveLastBackupTime < 10000)) return false; 
            
            gDriveIsUploading = true;
            
            try {
                // Check if token expired
                const expiresAt = parseInt(localStorage.getItem('gDriveExpiresAt') || '0');
                const isExpired = Date.now() > expiresAt - 60000; // 1 minute buffer

                if (!gDriveAccessToken || isExpired) {
                    showToast("Iniciando sesión en Google...", "info");
                    const waitPromise = new Promise(resolve => { window._resolveToken = resolve; });
                    const hint = localStorage.getItem('gDriveUserHint');
                    gDriveTokenClient.requestAccessToken({ prompt: 'select_account', hint: hint || '' });
                    
                    const ok = await Promise.race([waitPromise, new Promise(r => setTimeout(r, 60000))]);
                    if (!ok || !gDriveAccessToken) {
                        showToast("Se requiere conexión para continuar", "warning");
                        return false;
                    }
                }
            
                if (!silent) showToast("Subiendo copia a Drive...", "info");
                
                const now = new Date();
                const datePart = now.toISOString().split('T')[0];
                const timePart = now.getHours().toString().padStart(2, '0') + "-" + now.getMinutes().toString().padStart(2, '0');
                const filename = `msv_wealth_backup_${datePart}_${timePart}.json`;

                const data = getGlobalDataObject();
                const content = JSON.stringify(data);
                
                const metadata = {
                    name: filename,
                    mimeType: 'application/json'
                };

                const boundary = '-------314159265358979323846';
                const delimiter = "\r\n--" + boundary + "\r\n";
                const close_delim = "\r\n--" + boundary + "--";

                let body = delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    JSON.stringify(metadata) +
                    delimiter +
                    'Content-Type: application/json\r\n\r\n' +
                    content +
                    close_delim;

                // Always create new to keep history with timestamps
                await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
                    method: 'POST',
                    keepalive: true,
                    headers: new Headers({
                        'Authorization': 'Bearer ' + gDriveAccessToken,
                        'Content-Type': 'multipart/related; boundary=' + boundary
                    }),
                    body: body
                });
                
                if (!silent) showToast("Backup guardado en Drive", "success");
                
                // Update Last Sync Time (Date + Time)
                const timestampStr = now.toLocaleDateString() + " " + now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                localStorage.setItem('gDriveLastSyncTime', timestampStr);
                if (elements.gDriveLastSync) {
                    elements.gDriveLastSync.textContent = "Última copia: " + timestampStr;
                }
                gDriveLastBackupTime = Date.now();
                return true;
            } catch (err) {
                console.error("GDrive Upload Error:", err);
                if (!silent) showToast("Error al subir a Drive", "danger");
                return false;
            } finally {
                gDriveIsUploading = false;
            }
        }

        async function downloadDataFromGDrive() {
            if (!gDriveAccessToken) {
                showToast("Conectando con Google...", "info");
                const waitPromise = new Promise(resolve => { window._resolveToken = resolve; });
                gDriveTokenClient.requestAccessToken({ prompt: 'select_account' });
                const ok = await Promise.race([waitPromise, new Promise(r => setTimeout(r, 30000))]);
                if (!ok || !gDriveAccessToken) return;
            }
            try {
                showToast("Buscando copia reciente en Drive...", "info");
                const response = await gapi.client.drive.files.list({
                    q: "name contains 'msv_wealth_backup' and trashed = false",
                    orderBy: 'createdTime desc',
                    fields: 'files(id, name, createdTime)',
                    spaces: 'drive'
                });
                
                const files = response.result.files;
                if (!files || files.length === 0) {
                    showToast("No se encontró ningún backup", "warning");
                    return;
                }

                // Pick the first one (most recent due to orderBy)
                const fileId = files[0].id;
                const fileName = files[0].name;
                
                const fileData = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                    headers: new Headers({ 'Authorization': 'Bearer ' + gDriveAccessToken })
                });
                
                const json = await fileData.json();
                
                showCustomConfirm("Se ha encontrado un backup con fecha " + new Date(json.exportDate || json.timestamp).toLocaleString() + ". ¿Deseas restaurarlo? Esto sobrescribirá tus datos actuales.", () => {
                    // Use a temporary file-like object to trigger the main importGlobalJSON logic
                    const blob = new Blob([JSON.stringify(json)], {type: 'application/json'});
                    const file = new File([blob], fileName, {type: 'application/json'});
                    importGlobalJSON(file);
                });
            } catch (err) {
                console.error("GDrive Download Error:", err);
                showToast("Error al descargar de Drive", "danger");
            }
        }

        elements.gDriveLoginBtn?.addEventListener('click', () => {
            if (!gapiInited) {
                showToast("⚠️ Inicializando Google API... inténtalo de nuevo en 1 segundo.", "warning");
                return;
            }
            gDriveTokenClient.requestAccessToken({ prompt: 'select_account' });
        });

        elements.gDriveManualBackup?.addEventListener('click', () => uploadDataToGDrive(false));
        elements.gDriveRestoreBtn?.addEventListener('click', () => downloadDataFromGDrive());
        elements.gDriveAutoBackup?.addEventListener('change', (e) => {
            localStorage.setItem('gDriveAutoBackup', e.target.checked);
        });

        const sidebarGDriveSyncExitBtn = document.getElementById('sidebarGDriveSyncExitBtn');
        sidebarGDriveSyncExitBtn?.addEventListener('click', async () => {
            let success = await uploadDataToGDrive(false);
            
            // If failed because of token, the call inside uploadDataToGDrive will already trigger a prompt
            // but we add a safety check here just in case.
            if (!success && !gDriveAccessToken) {
                // Not calling anything here because uploadDataToGDrive handles prompts now.
            }
            
            if (success) {
                const now = new Date();
                const finalTime = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
                const finalDate = now.toLocaleDateString();

                document.body.innerHTML = `
                    <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f172a; color: white; font-family: 'Outfit', sans-serif; text-align: center; padding: 2rem;">
                        <div style="font-size: 4rem; margin-bottom: 1.5rem;">✅</div>
                        <h1 style="font-size: 2rem; margin-bottom: 0.5rem; background: linear-gradient(135deg, #10b981, #3b82f6); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Sincronización Completada</h1>
                        <p style="font-size: 1.1rem; margin-bottom: 1.5rem; color: #10b981; font-weight: 600;">${finalDate} - ${finalTime}</p>
                        <p style="opacity: 0.7; max-width: 450px; line-height: 1.6; margin-bottom: 2rem;">Tus datos están a salvo en la nube. Puedes cerrar la aplicación tranquilamente.</p>
                        <div style="display: flex; gap: 1rem;">
                            <button onclick="location.reload()" style="padding: 0.8rem 1.5rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.1); background: rgba(255,255,255,0.05); color: white; cursor: pointer; font-weight: 600; font-family: inherit;">🔄 Volver a entrar</button>
                            <button onclick="window.close();" style="padding: 0.8rem 1.5rem; border-radius: 12px; border: none; background: #ef4444; color: white; cursor: pointer; font-weight: 600; font-family: inherit;">🔒 Cerrar ahora</button>
                        </div>
                    </div>
                `;
            }
        });

        document.getElementById('sidebarGDriveRestoreBtn')?.addEventListener('click', () => downloadDataFromGDrive());

        // All automatic background tasks removed to prevent PWA/TWA issues.

        setTimeout(gDriveInit, 1500); // Small delay to let gapi/google scripts load

        // Activity Listeners
        elements.activityLoadMoreBtn?.addEventListener('click', () => {
            activityCurrentLimit += activityPageSize;
            renderActivity();
        });

        elements.activityFilterMode?.addEventListener('change', (e) => {
            activityFilterMode = e.target.value;
            activityCurrentLimit = activityPageSize; // Reset limit
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
            } else {
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
            } else {
                let [y, m] = activityListMonth.split('-').map(Number);
                activityListMonth = `${y - 1}-${String(m).padStart(2, '0')}`;
            }
            renderActivity();
        });
        elements.activityDateTrigger?.addEventListener('click', () => {
            if (elements.activityMonthInput) elements.activityMonthInput.showPicker();
        });
        elements.activityMonthInput?.addEventListener('change', (e) => {
            activityListMonth = e.target.value;
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
            console.log("MSV WealthTrack Booting... Version: 202603180644");
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
            elements.closeSavingsModal.addEventListener('click', () => toggleSavingsModal(false));
        }
        window.addEventListener('click', (e) => {
            if (e.target === elements.savingsInputModal) toggleSavingsModal(false);
        });

        elements.savingsInputForm?.addEventListener('submit', (e) => {
            e.preventDefault();
            const action = elements.savingsActionType.value;
            const amount = parseFloat(elements.movementAmountInput.value);

            if (action === 'drawer') {
                const name = elements.drawerNameInput.value.trim();
                const icon = elements.drawerIconInput.value || getBankIcon(name) || '📁';
                const newDrawer = {
                    id: 'drawer_' + Date.now(),
                    name: name || 'Nuevo Cajón',
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
                    const type = elements.savingsMovementType.value;
                    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
                    let category = elements.savingsCategorySelect.value;
                    const subcategory = elements.savingsSubcategorySelect?.value || '';
                    if (subcategory) category = `${category}:${subcategory}`;
                    
                    const date = elements.savingsDateInput.value || new Date().toISOString().split('T')[0];

                    drawer.balance += finalAmount;
                    drawer.movements.push({
                        date: date,
                        amount: finalAmount,
                        description: concept,
                        category: category
                    });
                }
            } else if (action === 'transfer') {
                const fromId = elements.savingsTargetId.value;
                const toId = elements.transferTargetSelect.value;
                const fromDrawer = savingsDrawers.find(d => d.id === fromId);
                const toDrawer = savingsDrawers.find(d => d.id === toId);

                if (fromDrawer && toDrawer && amount > 0) {
                    const concept = elements.movementConceptInput.value.trim() || `Transferencia a ${toDrawer.name}`;
                    const targetConcept = `Transferencia desde ${fromDrawer.name}`;
                    const today = new Date().toISOString().split('T')[0];

                    let category = elements.transferCategorySelect?.value || 'Traspaso';
                    const subcategory = elements.transferSubcategorySelect?.value || '';
                    if (subcategory) category = `${category}:${subcategory}`;

                    // Subtract from source
                    fromDrawer.balance -= amount;
                    fromDrawer.movements.push({
                        date: today,
                        amount: -amount,
                        description: concept,
                        category: category
                    });

                    // Add to target
                    toDrawer.balance += amount;
                    toDrawer.movements.push({
                        date: today,
                        amount: amount,
                        description: targetConcept,
                        category: category
                    });
                } else if (amount <= 0) {
                    alert("El importe de la transferencia debe ser mayor que cero.");
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

                    // Find initial movement
                    let initialMvmt = drawer.movements.find(m => isProvision(m));
                    const oldInitialAmount = initialMvmt ? initialMvmt.amount : 0;

                    if (initialMvmt) {
                        initialMvmt.amount = newAmount;
                    } else if (newAmount !== 0) {
                        drawer.movements.unshift({
                            date: new Date().toISOString().split('T')[0],
                            amount: newAmount,
                            description: 'Saldo inicial'
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

                    const type = elements.savingsMovementType.value;
                    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);

                    movement.amount = finalAmount;
                    movement.description = concept;
                    movement.category = category;
                    movement.date = date;
                    drawer.balance += (finalAmount - oldAmount);
                }
            }

            if (window.saveSavings) window.saveSavings(savingsDrawers);
            toggleSavingsModal(false);
            render();
        });

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
                        activeMonths: activeMonths
                    };
                } else {
                    drawer.movements.push({
                        id: Date.now() + Math.random(),
                        date: new Date().toISOString().split('T')[0],
                        amount: amount,
                        concept: concept,
                        description: concept, // Standardize
                        activeMonths: activeMonths,
                        paid: false
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
                        amount: -totalInvested,
                        description: `Inversión en ${stockData.name}`,
                        concept: `Inversión en ${stockData.name}`,
                        category: 'Traspaso',
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


        elements.ahorroFilterMode?.addEventListener('change', (e) => {
            ahorroFilterMode = e.target.value;
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
                bolsaMobileTitle.textContent = bolsaViewMode === 'cards'
                    ? 'Mis Acciones 🃏'
                    : 'Mis Acciones 📋';
            };
            updateMobileTitle();
            bolsaMobileTitle.addEventListener('click', () => {
                bolsaViewMode = bolsaViewMode === 'cards' ? 'list' : 'cards';
                localStorage.setItem('bolsaViewMode', bolsaViewMode);
                updateMobileTitle();
                render();
            });
        }

        // Bolsa Totals Toggle
        if (elements.bolsaTotalesToggle) {
            elements.bolsaTotalesToggle.addEventListener('click', () => {
                bolsaTotalsMode = !bolsaTotalsMode;
                localStorage.setItem('bolsaTotalsMode', bolsaTotalsMode);
                
                // If turning on totals, force list view to see the effect
                if (bolsaTotalsMode) {
                    bolsaViewMode = 'list';
                    localStorage.setItem('bolsaViewMode', 'list');
                }
                render();
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

        // Bolsa Summary Toggle
        if (elements.bolsaSummaryToggleBtn) {
            elements.bolsaSummaryToggleBtn.addEventListener('click', () => {
                bolsaSummaryVisible = !bolsaSummaryVisible;
                localStorage.setItem('bolsaSummaryVisible', bolsaSummaryVisible);
                render();
            });
        }

        // Ahorro Summary Toggle (Header button)
        if (elements.ahorroSummaryToggleBtn) {
            elements.ahorroSummaryToggleBtn.addEventListener('click', () => {
                ahorroSummaryVisible = !ahorroSummaryVisible;
                localStorage.setItem('ahorroSummaryVisible', ahorroSummaryVisible);
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
                alert("No hay un cajón por defecto seleccionado en los Ajustes.");
                return;
            }
            breakdownDrawerFilter = defaultSourceId;
            breakdownContext = 'bolsa';
            const now = new Date();
            if (elements.breakdownMonthInput) {
                elements.breakdownMonthInput.value = now.toISOString().slice(0, 7);
            }
            if (elements.breakdownYearInput) {
                elements.breakdownYearInput.value = now.getFullYear();
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
            } else if (elements.ahorroFilterMode?.value === 'month') {
                ahorroListMonth = changeMonthVal(ahorroListMonth, 1);
            }
            renderSavings();
        });
        elements.prevAhorroMonthBtn?.addEventListener('click', () => {
            if (elements.ahorroFilterMode?.value === 'year') {
                let [y, m] = ahorroListMonth.split('-').map(Number);
                ahorroListMonth = `${y - 1}-${String(m).padStart(2, '0')}`;
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
        if (elements.nominaModalTitle) elements.nominaModalTitle.textContent = 'Añadir Nuevo Cajón';
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
        if (elements.nominaModalTitle) elements.nominaModalTitle.textContent = 'Editar Cajón';
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
        showCustomConfirm('¿Estás seguro de que quieres eliminar este cajón y todos sus movimientos?', () => {
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

        const drawer = nominaData.find(d => d.id == drawerId);

        if (drawer) {
            // Default logic: 1st movement is income, others expense.
            // Nomina drawer is always income.
            const isNomina = drawer.name.toLowerCase().includes('nomina') || drawer.name.toLowerCase().includes('nómina');

            if (drawer.type === 'saving' || drawer.type === 'income' || isNomina) {
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
        const active = mov.activeMonths || [];
        elements.nominaMonthsCheckboxes.querySelectorAll('input').forEach(cb => {
            cb.checked = active.includes(parseInt(cb.value));
        });

        const isNomina = drawer.name.toLowerCase().includes('nomina') || drawer.name.toLowerCase().includes('nómina');
        if (drawer.type === 'saving' || drawer.type === 'income' || isNomina) {
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
            alert('El cajón de Ahorro vinculado ya no existe.');
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

            // Setup Modal Fields
            if (elements.transferSourceDrawerId) elements.transferSourceDrawerId.value = drawer.id;
            if (elements.transferSourceDrawerName) elements.transferSourceDrawerName.textContent = drawer.name;
            if (elements.transferTargetDrawerName) elements.transferTargetDrawerName.textContent = targetAhorroDrawer.name;
            if (elements.transferAmountInput) {
                elements.transferAmountInput.value = defaultAmount.toFixed(2);
                elements.transferAmountInput.focus();
            }

            // Show Modal
            if (elements.transferToAhorroModal) elements.transferToAhorroModal.classList.remove('hidden');

            // Handle Form Submit
            elements.transferToAhorroForm.onsubmit = (e) => {
                e.preventDefault();
                const amountToTransfer = parseFloat(elements.transferAmountInput.value);
                const selectedCategory = elements.transferCategorySelect.value;

                if (isNaN(amountToTransfer) || amountToTransfer === 0) {
                    alert('Por favor, ingresa una cantidad válida diferente de 0.');
                    return;
                }

                // Add movement to Savings
                targetAhorroDrawer.movements.push({
                    description: `Traspaso`,
                    date: new Date().toISOString().split('T')[0],
                    amount: amountToTransfer,
                    category: selectedCategory
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
                        <button class="btn-primary" id="btnTransferToAhorro" title="Transferir a Ahorro" style="width: 100%; background: var(--success); display: flex; align-items: center; justify-content: center; gap: 8px;">
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
            settings: {
                fiscalDay: fiscalDay,
                incomeCategories: incomeCategories,
                expenseCategories: expenseCategories,
                incomeSubcategories: incomeSubcategories,
                expenseSubcategories: expenseSubcategories,
                defaultTransferSource: localStorage.getItem('defaultTransferSource')
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
                showCustomConfirm(`Se restaurarán:\n- ${data.stocks.length} activos en Bolsa\n- ${data.savings.length} cajones de Ahorro\n- ${data.nomina.length} cajones de Nómina\n${data.countdowns ? '- ' + data.countdowns.length + ' cuentas atrás\n' : ''}${data.manualPrices ? '- Precios manuales\n' : ''}${data.settings ? '- Ajustes personalizados\n' : ''}\n¿Estás SEGURO? Esto reemplazará tus datos actuales.`, () => {
                    stocks = data.stocks;
                    savingsDrawers = data.savings.map(d => ({ ...d, group: d.group || '' }));
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
                        } catch(e) { lastSyncTime = '-'; }
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
        updateStorageStatus();
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

            const validViews = ['bolsa', 'ahorro', 'nomina', 'analisis'];
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

        render();
        setupEventListeners();
        // Automatic update cycle removed. Now manual via refresh button.
        // Simplified sync for first load REMOVED as per request to use persistent/cached data.
        
        console.log("initApp completed");
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
            countdowns.sort((a, b) => new Date(a.date) - new Date(b.date));

            const now = new Date();
            now.setHours(0,0,0,0);

            if (countdowns.length === 0) {
                countdownsList.innerHTML = '<p style="text-align:center; color: var(--text-muted); font-size: 0.9rem;">No hay cuentas atrás configuradas.</p>';
                return;
            }

            countdowns.forEach(item => {
                const targetDate = new Date(item.date);
                targetDate.setHours(0,0,0,0);
                
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
            calendarViewDate.setMonth(calendarViewDate.getMonth() - 1);
            renderCalendar();
        });
    }
    if (elements.nextCalendarMonth) {
        elements.nextCalendarMonth.addEventListener('click', () => {
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
