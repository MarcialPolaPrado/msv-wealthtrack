document.addEventListener('DOMContentLoaded', () => {

    // State
    let stocks = (window.loadStocks) ? window.loadStocks() : [];
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

    let ahorroSummaryFilterMode = localStorage.getItem('ahorroSummaryFilterMode') || 'month'; // 'month', 'year', 'all'
    let isAhorroSummaryExpanded = localStorage.getItem('isAhorroSummaryExpanded') !== 'false';
    let isSavingsPieExpanded = localStorage.getItem('isSavingsPieExpanded') !== 'false';
    let isBolsaPieExpanded = localStorage.getItem('isBolsaPieExpanded') !== 'false';
    let isExpenseSummaryExpanded = localStorage.getItem('isExpenseSummaryExpanded') !== 'false';

    // Dynamic Settings
    let fiscalDay = parseInt(localStorage.getItem('fiscalDay')) || 25;
    let incomeCategories = JSON.parse(localStorage.getItem('incomeCategories')) || ['Ahorro', 'Intereses', 'Dividendos', 'Especulación'];
    let expenseCategories = JSON.parse(localStorage.getItem('expenseCategories')) || ['Inversión', 'Gasto'];
    let isPrivacyActive = localStorage.getItem('isPrivacyActive') === 'true' || false;
    let currentView = 'bolsa';
    let lastSyncTime = '-';

    // Global Formatters
    const fmtEUR = (num) => {
        if (isPrivacyActive) return '€ ****';
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', useGrouping: true }).format(Number(num || 0));
    };
    const fmtNum = (num, decimals = 2) => {
        if (isPrivacyActive) return '****';
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: decimals, maximumFractionDigits: decimals, useGrouping: true }).format(Number(num || 0));
    };
    const fmtPct = (num) => {
        if (isPrivacyActive) return '****%';
        return (num !== null && num !== undefined) ? new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num) + '%' : '-';
    };

    // Savings State
    let savingsDrawers = (window.loadSavings) ? (window.loadSavings() || [
        { id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true }
    ]) : [
        { id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true }
    ];

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

        if (n.includes('salario') || n.includes('nomina') || n.includes('nómina') || n.includes('sueldo')) return '💼';
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
        if (!isoMonth) return '---';
        const [year, month] = isoMonth.split('-');
        const date = new Date(year, month - 1);
        const str = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' }).format(date);
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    // Nomina State
    function migrateNominaData(data) {
        return data.map(concept => {
            // Migration to movements structure
            if (concept.amount !== undefined && concept.movements === undefined) {
                concept = {
                    id: concept.id || Date.now() + Math.random(),
                    name: concept.name,
                    balance: Number(concept.amount),
                    type: concept.type,
                    movements: [{
                        date: new Date().toISOString().split('T')[0],
                        amount: Number(concept.amount),
                        description: 'Saldo inicial'
                    }]
                };
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
    let nominaData = migrateNominaData(rawNomina);
    if (window.saveNomina) window.saveNomina(nominaData);

    // DOM Elements
    const stockTableBody = document.getElementById('stockTableBody');
    const emptyState = document.getElementById('emptyState');

    const elements = {
        totalInvested: document.getElementById('totalInvested'),
        totalValue: document.getElementById('totalValue'),
        totalPL: document.getElementById('totalPL'),
        totalTrend: document.getElementById('totalTrend'),
        addStockBtn: document.getElementById('addStockBtn'),
        addStockModal: document.getElementById('addStockModal'),
        closeModal: document.querySelector('.close-modal'),
        addStockForm: document.getElementById('addStockForm'),
        tickerInput: document.getElementById('tickerInput'),
        marketSelect: document.getElementById('marketSelect'),
        dateInput: document.getElementById('dateInput'),
        qtyInput: document.getElementById('qtyInput'),
        priceInput: document.getElementById('priceInput'),
        filterTabs: document.querySelectorAll('.tab'),
        searchResults: document.getElementById('searchResults'),
        fxIndicator: document.getElementById('fxIndicator'),
        liveStatus: document.getElementById('liveStatus'),
        editId: document.getElementById('editId'),
        modalTitle: document.getElementById('modalTitle'),
        submitStockBtn: document.getElementById('submitStockBtn'),
        exportDataBtn: document.getElementById('exportDataBtn'),
        importDataBtn: document.getElementById('importDataBtn'),
        mobileAddStockBtn: document.getElementById('mobileAddStockBtn'),
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

        // Savings Elements
        navItems: document.querySelectorAll('.nav-item'),
        bolsaSection: document.getElementById('bolsaSection'),
        ahorroSection: document.getElementById('ahorroSection'),
        misCajonesTitle: document.getElementById('misCajonesTitle'),
        drawersGrid: document.getElementById('drawersGrid'),
        addDrawerBtn: document.getElementById('addDrawerBtn'),
        exportSavingsBtn: document.getElementById('exportSavingsBtn'),
        importSavingsBtn: document.getElementById('importSavingsBtn'),
        savingsCsvInput: document.getElementById('savingsCsvInput'),

        // Savings Modal Elements
        savingsInputModal: document.getElementById('savingsInputModal'),
        addDrawerBtn: document.getElementById('addDrawerBtn'),
        ahorroCardViewBtn: document.getElementById('ahorroCardViewBtn'),
        ahorroTableViewBtn: document.getElementById('ahorroTableViewBtn'),
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
        movementAmountInput: document.getElementById('movementAmountInput'),
        movementConceptInput: document.getElementById('movementConceptInput'),
        movementConceptGroup: document.getElementById('movementConceptGroup'),
        transferTargetGroup: document.getElementById('transferTargetGroup'),
        transferTargetSelect: document.getElementById('transferTargetSelect'),
        mobileActionBar: document.getElementById('mobileActionBar'),
        privacyToggleBtn: document.getElementById('privacyToggleBtn'),
        mobilePrivacyToggleBtn: document.getElementById('mobilePrivacyToggleBtn'),
        savingsInputForm: document.getElementById('savingsInputForm'),
        savingsMovementIndex: document.getElementById('savingsMovementIndex'),
        savingsMovementTypeContainer: document.getElementById('savingsMovementTypeContainer'),
        savingsMovementIncomeToggle: document.getElementById('savingsMovementIncomeToggle'),
        savingsMovementExpenseToggle: document.getElementById('savingsMovementExpenseToggle'),
        savingsMovementType: document.getElementById('savingsMovementType'),
        savingsMovementTypeHint: document.getElementById('savingsMovementTypeHint'),
        savingsDateInput: document.getElementById('savingsDateInput'),

        // Nomina Elements
        nominaSection: document.getElementById('nominaSection'),
        nominaGrid: document.getElementById('nominaGrid'),
        nominaGridContainer: document.getElementById('nominaGridContainer'),
        nominaCardViewBtn: document.getElementById('nominaCardViewBtn'),
        nominaTableViewBtn: document.getElementById('nominaTableViewBtn'),
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
        importNominaBtn: document.getElementById('importNominaBtn'),
        nominaCsvInput: document.getElementById('nominaCsvInput'),

        // Nomina Modal Elements
        nominaModal: document.getElementById('nominaModal'),
        nominaForm: document.getElementById('nominaForm'),
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
        bolsaTableViewBtn: document.getElementById('bolsaTableViewBtn'),
        bolsaCardViewBtn: document.getElementById('bolsaCardViewBtn'),
        stockTable: document.getElementById('stockTable'),
        savingsCategoryGroup: document.getElementById('savingsCategoryGroup'),
        savingsCategorySelect: document.getElementById('savingsCategorySelect'),
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
        incomeCategoriesInput: document.getElementById('incomeCategoriesInput'),
        expenseCategoriesInput: document.getElementById('expenseCategoriesInput')
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

            elements.savingsCategorySelect.innerHTML = cats.map(c => `<option value="${c}">${c}</option>`).join('');
        }
    };

    // Fix the typo in elements object
    elements.savingsMovementExpenseToggle = document.getElementById('savingsMovementExpenseToggle');
    elements.savingsMovementIncomeToggle = document.getElementById('savingsMovementIncomeToggle');

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
                btn.innerHTML = isPrivacyActive ? '🔒' : '👁️';
                btn.title = isPrivacyActive ? 'Mostrar Datos' : 'Ocultar Datos';
            }
        });
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
    }

    function editStock(id) {
        const stock = stocks.find(s => s.id === id);
        if (!stock) return;

        elements.editId.value = stock.id;
        elements.tickerInput.value = stock.ticker;
        elements.marketSelect.value = stock.market;
        elements.dateInput.value = stock.date;
        elements.qtyInput.value = stock.qty;
        // The price stored in the object is the calculated "Buy Price", 
        // but the user enters "Total Invested". Let's show Total Invested.
        elements.priceInput.value = (stock.price * stock.qty).toFixed(2);

        elements.modalTitle.textContent = "Edit Investment";
        elements.submitStockBtn.textContent = "Save Changes";
        toggleModal(true);
    }

    function addMoreFromStock(id) {
        const stock = stocks.find(s => s.id === id);
        if (!stock) return;

        elements.editId.value = ''; // Ensure it's a NEW stock
        elements.tickerInput.value = stock.ticker;
        // Only set market if it's a valid option in the select
        const validOptions = Array.from(elements.marketSelect.options).map(o => o.value);
        elements.marketSelect.value = validOptions.includes(stock.market) ? stock.market : 'SP500';

        // Robust Today's Date Default
        const today = new Date().toISOString().split('T')[0];
        if (elements.dateInput) elements.dateInput.value = today;

        elements.qtyInput.value = '';
        elements.priceInput.value = '';

        elements.modalTitle.textContent = `Añadir más - ${stock.name || stock.ticker}`;
        elements.submitStockBtn.textContent = "Add Investment";
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
    }

    // --- Rendering ---
    let isFirstUpdateDone = false;

    function render() {
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

        const totalCurrentValueEUR = isAnyPriceMissing ? null : totalCurrentValueEURValue;


        // 2. Update Totals UI
        const pl = totalCurrentValueEUR - totalInvestedEUR;
        const plPercent = totalInvestedEUR > 0 ? (pl / totalInvestedEUR) * 100 : 0;

        // Sync Savings Bolsa Drawer
        const bolsaDrawer = savingsDrawers.find(d => d.id === 'bolsa');
        if (bolsaDrawer) {
            bolsaDrawer.balance = totalCurrentValueEURValue;
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
            elements.fxIndicator.innerHTML = `FX Rate: 1 USD = ${fmtNum(window.FX_RATE, 3)} EUR <span style="margin-left: 10px; font-size: 0.8em; opacity: 0.7;">(Sincronizado: ${lastSyncTime})</span>`;
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
        if (bolsaViewMode === 'cards') {
            if (elements.stockTable) elements.stockTable.parentElement.classList.add('hidden');
            if (elements.bolsaGrid) {
                elements.bolsaGrid.classList.remove('hidden');
                renderBolsaCards(displayStocksData);
            }
        } else {
            if (elements.stockTable) elements.stockTable.parentElement.classList.remove('hidden');
            if (elements.bolsaGrid) elements.bolsaGrid.classList.add('hidden');

            // Inject Totales toggle button into the table wrapper (only once)
            const tableWrapper = elements.stockTable?.parentElement;
            if (tableWrapper && !tableWrapper.querySelector('#bolsaTotalesToggle')) {
                const toggleBtn = document.createElement('div');
                toggleBtn.style.cssText = 'display:flex; justify-content:flex-end; padding: 0.5rem 0 0.3rem 0;';
                toggleBtn.innerHTML = `<button id="bolsaTotalesToggle" class="totales-toggle-btn">📊 Totales</button>`;
                tableWrapper.insertBefore(toggleBtn, elements.stockTable);
                toggleBtn.querySelector('#bolsaTotalesToggle').addEventListener('click', () => {
                    bolsaTotalsMode = !bolsaTotalsMode;
                    localStorage.setItem('bolsaTotalsMode', bolsaTotalsMode);
                    render();
                });
            }
            // Update button state
            const totalesBtn = tableWrapper?.querySelector('#bolsaTotalesToggle');
            if (totalesBtn) {
                totalesBtn.classList.toggle('active', bolsaTotalsMode);
            }
        }

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
                elements.stockTable.className = 'bolsa-totals-compact';

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

                displayGroups.forEach(group => {
                    const pl = group.totalCurrentVal !== null ? group.totalCurrentVal - group.totalInvested : null;
                    const plClass = pl === null ? '' : (pl >= 0 ? 'profit' : 'loss');
                    const tr = document.createElement('tr');
                    tr.className = 'group-row';
                    tr.style.cursor = 'pointer';
                    tr.innerHTML = `
                        <td class="btc-siglas" style="padding:0.35rem 0.5rem; font-weight:700; font-size:0.85rem; color:var(--primary);">${group.ticker}</td>
                        <td class="btc-inv" style="padding:0.35rem 0.5rem; text-align:right; font-size:0.8rem;">${fmtEUR(group.totalInvested)}</td>
                        <td class="btc-val" style="padding:0.35rem 0.5rem; text-align:right; font-weight:700; font-size:0.8rem; background:rgba(59,130,246,0.05);">${group.totalCurrentVal !== null ? fmtEUR(group.totalCurrentVal) : '-'}</td>
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
                // Restore full thead
                const thead = elements.stockTable?.querySelector('thead');
                if (thead && !thead.querySelector('th[data-sort="name"]')) {
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

                    const statusBadge = info.isLive
                        ? `<div style="display:flex; flex-direction:column; align-items:flex-end;"><span class="badge-live">Live</span>${info.date ? `<span style="font-size:0.75em; color:var(--text-muted); opacity:0.8; margin-top:2px;">${info.date}</span>` : ''}</div>`
                        : (info.isSimulated ? `
                        <div style="display:flex; flex-direction:column; align-items:flex-end;">
                            <span class="badge-simulated">Cierre</span>
                            ${info.date ? `<span style="font-size:0.7em; color:var(--text-muted); opacity:0.8; margin-top:2px;">${info.date}</span>` : ''}
                        </div>` : '');

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
                                ${createSparkline(group.ticker)}
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
                            <button class="btn-primary add-more-btn" data-ticker="${group.ticker}" title="Añadir más" style="padding: 0.4rem 0.6rem; font-size: 1rem; box-shadow: none; background: var(--success); border-color: var(--success);">+</button>
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
                                    <button class="btn-primary edit-btn" data-id="${item.id}" style="padding: 0.2rem 0.4rem; font-size: 0.7rem; box-shadow: none;">Edit</button>
                                    <button class="btn-danger delete-btn" data-id="${item.id}" style="padding: 0.2rem 0.4rem; font-size: 0.7rem;">Del</button>
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

        // Calculate Category Totals
        const categoryTotals = {};
        savingsDrawers.forEach(drawer => {
            if (drawer.isAuto) return;
            (drawer.movements || []).forEach(m => {
                const mDate = new Date(m.date);
                if (isNaN(mDate.getTime())) return;

                const mFiscal = getFiscalMonth(mDate);
                let match = false;
                if (!selectedAhorroFiscalMonth && ahorroSummaryFilterMode !== 'all') {
                    match = false;
                } else if (ahorroSummaryFilterMode === 'month') {
                    match = (mFiscal === selectedAhorroFiscalMonth);
                } else if (ahorroSummaryFilterMode === 'year') {
                    match = (mFiscal.startsWith(selectedAhorroFiscalMonth.split('-')[0]));
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
            <div class="card drawer-card glass-panel summary-drawer" style="border: 1px solid var(--primary); padding: 1rem; ${!isAhorroSummaryExpanded ? 'max-width: fit-content;' : ''}">
                <div class="drawer-header" id="ahorroSummaryHeader" style="cursor:pointer; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 1rem;">
                    <div style="display:flex; align-items:center; gap: 10px; flex: 1;">
                        <span class="drawer-icon">📊</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">Distribución por Categoría <span class="toggle-arrow ${isAhorroSummaryExpanded ? 'expanded' : ''}">▼</span></h4>
                            <p style="font-size: 0.8rem; opacity: 0.7;">Resumen de movimientos por categoría</p>
                        </div>
                    </div>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <select id="ahorroSummaryFilterMode" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 0.85rem; cursor: pointer; outline: none;">
                            <option value="month" ${ahorroSummaryFilterMode === 'month' ? 'selected' : ''}>📅 Mes</option>
                            <option value="year" ${ahorroSummaryFilterMode === 'year' ? 'selected' : ''}>🗓️ Año</option>
                            <option value="all" ${ahorroSummaryFilterMode === 'all' ? 'selected' : ''}>♾️ Todo</option>
                        </select>
                        ${ahorroSummaryFilterMode !== 'all' ? `
                            <select id="ahorroMonthSelect" style="background: rgba(255,255,255,0.05); color: white; border: 1px solid var(--border-color); border-radius: 6px; padding: 4px 8px; font-size: 0.85rem; cursor: pointer; outline: none;">
                                ${sortedMonths.map(m => {
            const label = ahorroSummaryFilterMode === 'year' ? m.split('-')[0] : formatFiscalMonth(m);
            // If year mode, only show unique years
            return `<option value="${m}" ${m === selectedAhorroFiscalMonth ? 'selected' : ''}>${label}</option>`;
        }).filter((v, i, a) => {
            if (ahorroSummaryFilterMode === 'year') {
                const year = v.match(/>(.*)</)[1];
                return a.findIndex(x => x.includes(`>${year}<`)) === i;
            }
            return true;
        }).join('')}
                            </select>
                        ` : ''}
                    </div>
                </div>

                <div class="collapsible-content ${isAhorroSummaryExpanded ? 'expanded' : ''}" id="ahorroSummaryContent">
                    ${!hasData ? `
                        <div style="margin-top: 1.5rem; text-align: center; padding: 1rem; background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px dashed rgba(255,255,255,0.1);">
                            <p style="opacity: 0.5; margin: 0;">No hay movimientos en el periodo seleccionado.</p>
                        </div>
                    ` : `
                        <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 1rem;">
                            ${sortedCats.map(([cat, total]) => `
                                <div style="background: rgba(255,255,255,0.03); padding: 1rem; border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); display: flex; flex-direction: column; gap: 4px;">
                                    <div style="font-size: 0.8rem; opacity: 0.6; text-transform: uppercase; letter-spacing: 0.05em;">${cat}</div>
                                    <div style="font-size: 1.1rem; font-weight: 700; color: ${total >= 0 ? 'var(--success)' : 'var(--danger)'};"> ${total > 0 ? '+' : ''}${fmtEUR(total)}</div>
                                </div>
                            `).join('')}
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

        const modeSelect = container.querySelector('#ahorroSummaryFilterMode');
        modeSelect.onchange = (e) => {
            ahorroSummaryFilterMode = e.target.value;
            localStorage.setItem('ahorroSummaryFilterMode', ahorroSummaryFilterMode);
            renderAhorroSummaryDrawer();
        };

        const monthSelect = container.querySelector('#ahorroMonthSelect');
        if (monthSelect) {
            monthSelect.onchange = (e) => {
                selectedAhorroFiscalMonth = e.target.value;
                renderAhorroSummaryDrawer();
            };
        }
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
                valA = a.balance;
                valB = b.balance;
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

            // Drawer Header Row
            const headerTr = document.createElement('tr');
            headerTr.className = 'ahorro-list-header';
            headerTr.innerHTML = `
                <td colspan="2">
                    <div class="header-content">
                        <span>${drawer.icon} ${drawer.name}</span>
                        ${(!drawer.isAuto && ahorroListFilterMode === 'detail') ? `
                            <div class="list-actions">
                                <button class="add-mvmt-list-btn btn-primary">+ Mov</button>
                                <button class="transfer-list-btn btn-secondary">⇆ Tx</button>
                                <button class="edit-drawer-list-btn btn-secondary">✏️</button>
                                <button class="delete-drawer-list-btn btn-danger">🗑️</button>
                            </div>
                        ` : ''}
                    </div>
                </td>
                <td class="balance">${fmtEUR(drawer.balance)}</td>
            `;

            // Add event listeners to list buttons
            if (!drawer.isAuto && ahorroListFilterMode === 'detail') {
                headerTr.querySelector('.add-mvmt-list-btn').onclick = (e) => { e.stopPropagation(); showAddMovementModal(drawer.id); };
                headerTr.querySelector('.transfer-list-btn').onclick = (e) => { e.stopPropagation(); showTransferModal(drawer.id); };
                headerTr.querySelector('.edit-drawer-list-btn').onclick = (e) => { e.stopPropagation(); showEditDrawerModal(drawer.id); };
                headerTr.querySelector('.delete-drawer-list-btn').onclick = (e) => { e.stopPropagation(); deleteSavingsDrawer(drawer.id); };
            }

            elements.ahorroTableBody.appendChild(headerTr);

            // Sort by date descending
            drawerMovements.sort((a, b) => new Date(b.date) - new Date(a.date));

            if (ahorroListFilterMode !== 'totals') {
                drawerMovements.forEach(m => {
                    const tr = document.createElement('tr');
                    tr.className = 'ahorro-list-row';

                    const isIncome = m.amount > 0;
                    const amountColor = isIncome ? 'var(--success)' : 'var(--danger)';
                    const category = m.category || '-';

                    tr.innerHTML = `
                        <td class="date">${new Date(m.date).toLocaleDateString('es-ES')}</td>
                        <td class="concept">${category}</td>
                        <td class="amount" style="color: ${amountColor}">${fmtEUR(m.amount)}</td>
                    `;
                    elements.ahorroTableBody.appendChild(tr);
                });
            }
        });

        if (elements.ahorroTableBody.innerHTML === '') {
            elements.ahorroTableBody.innerHTML = '<tr><td colspan="3" style="padding:2rem; text-align:center; opacity:0.5;">No hay movimientos en este periodo</td></tr>';
        }
    }

    function renderSavings() {
        if (!elements.drawersGrid) return;


        // Calculate Global Total
        const total = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
        if (elements.misCajonesTitle) {
            elements.misCajonesTitle.textContent = `Mis Cajones: ${fmtEUR(total)}`;
        }

        // Toggle visibility based on view mode
        if (ahorroViewMode === 'list') {
            elements.drawersGrid?.classList.add('hidden');
            elements.ahorroTableContainer?.classList.remove('hidden');

            elements.ahorroCardViewBtn?.classList.remove('active');
            elements.ahorroCardViewBtn.style.background = 'transparent';
            elements.ahorroCardViewBtn.style.color = 'var(--text-muted)';

            elements.ahorroTableViewBtn?.classList.add('active');
            elements.ahorroTableViewBtn.style.background = 'var(--primary)';
            elements.ahorroTableViewBtn.style.color = 'white';

            renderSavingsList();
        } else {
            elements.drawersGrid?.classList.remove('hidden');
            elements.ahorroTableContainer?.classList.add('hidden');

            elements.ahorroCardViewBtn?.classList.add('active');
            elements.ahorroCardViewBtn.style.background = 'var(--primary)';
            elements.ahorroCardViewBtn.style.color = 'white';

            elements.ahorroTableViewBtn?.classList.remove('active');
            elements.ahorroTableViewBtn.style.background = 'transparent';
            elements.ahorroTableViewBtn.style.color = 'var(--text-muted)';
        }

        elements.drawersGrid.innerHTML = '';

        if (savingsDrawers.length === 0) return;

        savingsDrawers.forEach(drawer => {
            const card = document.createElement('div');
            // We force income-drawer but also apply very explicit inline styles to ensure green color
            card.className = `card drawer-card glass-panel income-drawer ${drawer.isAuto ? 'bolsa-drawer' : ''}`;

            const pct = total > 0 ? (drawer.balance / total * 100).toFixed(1) : 0;

            // Force green theme inline with high priority
            card.style.setProperty('background', 'rgba(16, 185, 129, 0.25)', 'important');
            card.style.setProperty('background-color', '#064e3b', 'important');
            card.style.setProperty('background-image', 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)', 'important');
            card.style.setProperty('border', '2px solid #10b981', 'important');

            card.innerHTML = `
                <span class="drawer-icon">${drawer.icon}</span>
                <span class="drawer-name" style="color: white !important; font-weight: 700;">${drawer.name}</span>
                <div style="display: flex; align-items: center; justify-content: space-between; width: 100%;">
                    <span class="drawer-amount" style="color: #10b981 !important; font-weight: 800; font-size: 1.2rem;">${fmtEUR(drawer.balance)}</span>
                    <span style="font-size: 1.2rem; font-weight: 800; color: #10b981; opacity: 0.9;">${pct}%</span>
                </div>
                ${!drawer.isAuto ? `
                    <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                        <button class="add-mvmt-btn btn-primary" style="padding:0.4rem 0.8rem; font-size:0.8rem;">+ Movimiento</button>
                        <button class="transfer-btn btn-secondary" style="padding:0.4rem 0.8rem; font-size:0.8rem;">⇆ Transferir</button>
                        <button class="edit-drawer-btn btn-secondary" title="Editar Cajón" style="padding:0.4rem 0.6rem; font-size:0.8rem;">✏️</button>
                        <button class="delete-drawer-btn btn-danger" title="Borrar Cajón" style="padding:0.4rem 0.6rem; font-size:0.8rem; border:none; background:rgba(239,68,68,0.15); color:var(--danger);">🗑️</button>
                    </div>` : ''}
            `;

            card.onclick = (e) => {
                const mvmtBtn = e.target.closest('.add-mvmt-btn');
                const transBtn = e.target.closest('.transfer-btn');
                const editBtn = e.target.closest('.edit-drawer-btn');

                if (mvmtBtn) {
                    e.stopPropagation();
                    showAddMovementModal(drawer.id);
                } else if (transBtn) {
                    e.stopPropagation();
                    showTransferModal(drawer.id);
                } else if (editBtn) {
                    e.stopPropagation();
                    showEditDrawerModal(drawer.id);
                } else if (e.target.closest('.delete-drawer-btn')) {
                    e.stopPropagation();
                    deleteSavingsDrawer(drawer.id);
                } else {
                    showDrawerDetails(drawer.id);
                }
            };

            elements.drawersGrid.appendChild(card);
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
            const info = group.liveInfo;
            const plGroup = group.totalCurrentVal - group.totalInvested;
            const plPercentGroup = group.totalInvested > 0 ? (plGroup / group.totalInvested) * 100 : 0;
            const isExpanded = expandedTickers.has(group.ticker);

            const card = document.createElement('div');
            card.className = `card drawer-card glass-panel bolsa-drawer`;

            // Color theme: similar to Nomina but for Bolsa (maybe blue/indigo)
            card.style.background = 'rgba(99, 102, 241, 0.15)';
            card.style.backgroundColor = '#1e1b4b';
            card.style.backgroundImage = 'linear-gradient(135deg, rgba(99, 102, 241, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)';
            card.style.border = '2px solid #6366f1';

            const performanceClass = (plPercentGroup === null) ? 'neutral' : (plPercentGroup < 0 ? 'loss' : 'profit');

            card.innerHTML = `
                <div style="display: flex; justify-content: space-between; align-items: flex-start; width: 100%;">
                    <div style="display: flex; align-items: center; gap: 10px;">
                        <span class="drawer-icon">📈</span>
                        <div style="display: flex; flex-direction: column;">
                            <span class="drawer-name" style="color: white !important; font-weight: 700; margin: 0;">${group.name || group.ticker}</span>
                            <span style="font-size: 0.75rem; opacity: 0.6;">${group.ticker} • ${group.market}</span>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <span class="drawer-amount ${performanceClass}" style="font-weight: 800; font-size: 1.2rem; display: block;">${group.totalCurrentVal !== null ? fmtEUR(group.totalCurrentVal) : '-'}</span>
                        <span class="${performanceClass}" style="font-size: 0.85rem; font-weight: 600;">${plGroup !== null ? (plGroup >= 0 ? '+' : '') + fmtEUR(plGroup) : '-'} (${fmtPct(plPercentGroup)})</span>
                    </div>
                </div>

                <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 12px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.05); display: grid; grid-template-columns: 1fr 1fr; gap: 0.8rem;">
                    <div>
                        <div style="opacity: 0.6; font-size: 0.7rem; text-transform: uppercase;">Invested</div>
                        <div style="font-weight: 600;">${fmtEUR(group.totalInvested)}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.6; font-size: 0.7rem; text-transform: uppercase;">Current Price</div>
                        <div style="font-weight: 600;">${info.currentPriceEUR !== null ? fmtEUR(info.currentPriceEUR) : '-'}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.6; font-size: 0.7rem; text-transform: uppercase;">Quantity</div>
                        <div style="font-weight: 600;">${fmtNum(group.totalQty, 4)}</div>
                    </div>
                    <div>
                        <div style="opacity: 0.6; font-size: 0.7rem; text-transform: uppercase;">Market</div>
                        <div style="font-weight: 600;">${group.market}</div>
                    </div>
                </div>

                <div style="margin-top:1rem; display:flex; gap:0.5rem; flex-wrap:wrap;">
                    <button class="add-mvmt-btn btn-primary" data-ticker="${group.ticker}" style="padding:0.4rem 0.8rem; font-size:0.8rem;">+</button>
                    <button class="history-btn btn-secondary" data-ticker="${group.ticker}" style="padding:0.4rem 0.8rem; font-size:0.8rem;">Hist.</button>
                    <button class="details-btn btn-secondary" data-ticker="${group.ticker}" style="padding:0.4rem 0.8rem; font-size:0.8rem;">🔍 Det.</button>
                </div>

                <div id="history-${group.ticker.replace(/[^a-zA-Z0-9]/g, '_')}" class="hidden" style="margin-top: 1rem; padding-top: 1rem; border-top: 1px solid rgba(255,255,255,0.1);">
                    <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                        ${group.items.sort((a, b) => new Date(b.date) - new Date(a.date)).map(item => {
                const itemPL = item.liveInfo.stockPL;
                const isSale = item.qty < 0;
                return `
                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem; background: rgba(255,255,255,0.02); border-radius: 8px; font-size: 0.8rem;">
                                    <div>
                                        <div style="font-weight: 600; color: ${isSale ? 'var(--danger)' : 'var(--success)'}">${isSale ? '🔴 Venta' : '🟢 Compra'}</div>
                                        <div style="opacity: 0.6; font-size: 0.7rem;">${new Date(item.date).toLocaleDateString()} • ${fmtNum(item.qty, 4)} @ ${fmtEUR(item.price)}</div>
                                    </div>
                                    <div style="text-align: right;">
                                        <div style="font-weight: 600;">${fmtEUR(item.liveInfo.stockCurrentVal || 0)}</div>
                                        <div class="${itemPL >= 0 ? 'profit' : 'loss'}" style="font-size: 0.75rem;">${itemPL !== null ? (itemPL >= 0 ? '+' : '') + fmtEUR(itemPL) : '-'}</div>
                                    </div>
                                    <div style="display: flex; gap: 5px; margin-left: 10px;">
                                        <button class="edit-btn-small" data-id="${item.id}" style="background:none; border:none; cursor:pointer; opacity:0.6;">✏️</button>
                                        <button class="delete-btn-small" data-id="${item.id}" style="background:none; border:none; cursor:pointer; opacity:0.6;">🗑️</button>
                                    </div>
                                </div>
                            `;
            }).join('')}
                    </div>
                </div>
            `;

            card.addEventListener('click', (e) => {
                const ticker = group.ticker;
                if (e.target.closest('.add-mvmt-btn')) {
                    addMoreFromStockByTicker(ticker);
                } else if (e.target.closest('.history-btn')) {
                    const historyDiv = card.querySelector(`#history-${ticker.replace(/[^a-zA-Z0-9]/g, '_')}`);
                    historyDiv.classList.toggle('hidden');
                } else if (e.target.closest('.details-btn')) {
                    showFinancialDetails(ticker);
                } else if (e.target.closest('.edit-btn-small')) {
                    editStock(e.target.closest('.edit-btn-small').dataset.id);
                } else if (e.target.closest('.delete-btn-small')) {
                    if (confirm('¿Borrar esta operación?')) {
                        removeStock(e.target.closest('.delete-btn-small').dataset.id);
                    }
                }
            });

            elements.bolsaGrid.appendChild(card);
        });
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

        // Limit parent and grandparent width when collapsed
        const parentContainer = container.parentElement;
        if (parentContainer) {
            parentContainer.style.maxWidth = isSavingsPieExpanded ? '' : 'fit-content';
            parentContainer.style.padding = isSavingsPieExpanded ? '1.5rem' : '0.8rem';
            const grandparent = parentContainer.parentElement;
            if (grandparent) {
                grandparent.style.maxWidth = isSavingsPieExpanded ? '' : 'fit-content';
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
    function buildSection(grid, title, icon, color, cards, totalAmount) {
        if (cards.length === 0) return null;
        const section = document.createElement('div');
        section.style.marginBottom = '2rem';

        const header = document.createElement('div');
        header.style.cssText = 'display:flex; align-items:center; gap:10px; margin-bottom:1rem; padding-bottom:0.6rem; border-bottom:2px solid ' + color + '22;';
        const totalStr = totalAmount !== undefined ? `<span style="margin-left:0.8rem; font-weight:700; color:${color}; font-size:0.95rem;">${fmtEUR(totalAmount)}</span>` : '';
        header.innerHTML = `<span style="font-size:1.3rem;">${icon}</span><h3 style="margin:0; font-size:1rem; color:${color}; font-weight:700; letter-spacing:0.02em;">${title} (${cards.length})</h3>${totalStr}`;

        const subGrid = document.createElement('div');
        subGrid.style.cssText = 'display:grid; grid-template-columns:repeat(auto-fill, minmax(260px, 1fr)); gap:1.2rem;';
        cards.forEach(c => subGrid.appendChild(c));

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
                                <button class="add-nomina-mvmt-list-btn btn-primary">+ Mov</button>
                                <button class="edit-nomina-drawer-list-btn btn-secondary">✏️</button>
                                <button class="delete-nomina-drawer-list-btn btn-danger">🗑️</button>
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
    }

    function renderNomina() {
        if (!elements.nominaSection || currentView !== 'nomina') return;

        // Toggle visibility based on view mode
        if (nominaViewMode === 'list') {
            elements.nominaGridContainer?.classList.add('hidden');
            elements.nominaTableContainer?.classList.remove('hidden');

            elements.nominaCardViewBtn?.classList.remove('active');
            elements.nominaCardViewBtn.style.background = 'transparent';
            elements.nominaCardViewBtn.style.color = 'var(--text-muted)';

            elements.nominaTableViewBtn?.classList.add('active');
            elements.nominaTableViewBtn.style.background = 'var(--primary)';
            elements.nominaTableViewBtn.style.color = 'white';
        } else {
            elements.nominaGridContainer?.classList.remove('hidden');
            elements.nominaTableContainer?.classList.add('hidden');

            elements.nominaCardViewBtn?.classList.add('active');
            elements.nominaCardViewBtn.style.background = 'var(--primary)';
            elements.nominaCardViewBtn.style.color = 'white';

            elements.nominaTableViewBtn?.classList.remove('active');
            elements.nominaTableViewBtn.style.background = 'transparent';
            elements.nominaTableViewBtn.style.color = 'var(--text-muted)';
        }

        // Helper to ensure the automatic drawer exists - DO THIS BEFORE RENDERING LIST
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
            if (isIncome) {
                card.style.background = 'rgba(16, 185, 129, 0.25)';
                card.style.backgroundColor = '#064e3b';
                card.style.backgroundImage = 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)';
                card.style.border = '2px solid #10b981';
            } else if (isSavings) {
                card.style.background = 'rgba(245, 158, 11, 0.15)';
                card.style.backgroundColor = '#451a03';
                card.style.backgroundImage = 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)';
                card.style.border = '2px solid #f59e0b';
                savingsSecTotal += provision;
            } else if (concept.isAutomatic) {
                card.style.background = 'rgba(139, 92, 246, 0.15)';
                card.style.backgroundColor = '#2e1065';
                card.style.backgroundImage = 'linear-gradient(135deg, rgba(139, 92, 246, 0.3) 0%, rgba(15, 23, 42, 0.8) 100%)';
                card.style.border = '2px solid #8b5cf6';
            }

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
                    <div class="drawer-balance" style="color: var(--success); margin-top: 1rem; font-size: 1.25rem; font-weight: 700;">
                        ${fmtEUR(monthlyBalance)} 
                        <span style="font-size: 0.85rem; opacity: 0.6; font-weight: 400; color: var(--text-color); margin-left: 4px;">
                            de ${fmtEUR(yearlyIncomeSum)}
                        </span>
                    </div>
                `;
            }

            card.innerHTML = `
                <div class="drawer-header">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <span class="drawer-icon">${concept.icon || getNominaIcon(concept.name, concept.type)}</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">${concept.name}</h4>
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
                   <button class="btn-secondary btn-sm add-nomina-movement" data-id="${concept.id}" style="flex:1">+ Movimiento</button>
                   <button class="btn-primary btn-sm view-nomina-details" data-id="${concept.id}" style="flex:1">Historial</button>
                </div>
            `;

            // Route card to the right section
            if (isIncome) incomeCards.push(card);
            else if (isSavings) savingCards.push(card);
            else if (concept.isAutomatic) autoCard = card;
            else expenseCards.push(card);
        });

        // Render the sections

        grid.style.display = 'block'; // sections handle their own grid
        const incomeSubGrid = buildSection(grid, 'Distribución Ingresos', '📈', '#10b981', incomeCards, totalPrimaryIncome);
        buildSection(grid, 'Distribución Ahorro', '🏦', '#f59e0b', savingCards, savingsSecTotal);
        buildSection(grid, 'Distribución Gastos', '📉', '#ef4444', expenseCards, totalPlannedExpensesManual);

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
                        <div style="font-size: 0.8rem; opacity: 0.6;">Total Pagado</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--danger);">${fmtEUR(totalPaidExpensesManual)} <span style="font-size: 0.8rem; opacity: 0.6; font-weight: 400; color: var(--text-color);">de planeado: ${fmtEUR(totalPlannedExpensesManual)}</span></div>
                    </div>
                </div>

                <div class="collapsible-content ${isExpenseSummaryExpanded ? 'expanded' : ''}" id="expenseSummaryContent">
                    <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
                        ${Object.entries(totalsByDrawer).map(([drawerId, data]) => `
                            <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                                <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                    <span>${data.icon}</span>
                                    <span style="font-size: 0.85rem; opacity: 0.8;">${data.name}</span>
                                </div>
                                <div style="text-align: right; line-height: 1.1;">
                                    <div style="font-weight: 700; color: var(--danger); font-size: 0.9rem;">${fmtEUR(Math.abs(data.spent))}</div>
                                    <div style="font-size: 0.7rem; opacity: 0.6; color: var(--text-color);">de ${fmtEUR(data.provision)}</div>
                                </div>
                            </div>
                        `).join('')}
                    </div>

                    <div style="margin-top: 1.5rem; max-height: 250px; overflow-y: auto; padding-right: 5px; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 1rem;">
                        <h5 style="margin: 0 0 0.8rem 0; font-size: 0.8rem; opacity: 0.5; text-transform: uppercase; letter-spacing: 0.05em;">Desglose Detallado</h5>
                        <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 0.8rem;">
                            ${(() => {
                    const grouped = allMonthlyExpenses.reduce((acc, exp) => {
                        if (!acc[exp.drawerId]) acc[exp.drawerId] = { name: exp.drawerName, icon: exp.icon, items: [] };
                        acc[exp.drawerId].items.push(exp);
                        return acc;
                    }, {});

                    return Object.entries(grouped).map(([drawerId, group]) => {
                        const boxTotal = group.items.reduce((sum, m) => sum + Math.abs(m.amount), 0);
                        const boxPending = group.items.filter(m => !m.paid).reduce((sum, m) => sum + Math.abs(m.amount), 0);
                        const allPaid = group.items.every(m => m.paid);

                        return `
                                    <div style="background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; height: fit-content;">
                                        <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.6rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.03);">
                                            <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                                                <input type="checkbox" class="nomina-checkbox master-paid-checkbox" data-drawer-id="${drawerId}" ${allPaid ? 'checked' : ''} title="Marcar/Desmarcar todos">
                                                <span style="font-size: 1rem; width: 20px; text-align: center;">${group.icon}</span>
                                                <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${group.name}</span>
                                            </div>
                                            <div class="box-total-group" style="flex-shrink: 0; margin-left: 8px;">
                                                <div style="display: flex; gap: 8px; align-items: center;">
                                                    <span class="box-total-label">tot.</span>
                                                    <span class="box-total-value">${fmtEUR(boxTotal)}</span>
                                                </div>
                                                <div style="display: flex; gap: 8px; align-items: center;">
                                                    <span class="box-total-label">pend.</span>
                                                    <span class="box-total-value" style="color: ${boxPending > 0 ? 'var(--danger)' : 'var(--success)'};">${fmtEUR(boxPending)}</span>
                                                </div>
                                            </div>
                                        </div>
                                        <div style="display: flex; flex-direction: column;">
                                            ${group.items.sort((a, b) => new Date(b.date) - new Date(a.date)).map((m, idx) => `
                                                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.4rem 0.6rem; ${idx < group.items.length - 1 ? 'border-bottom: 1px solid rgba(255,255,255,0.02);' : ''}">
                                                    <div style="display: flex; align-items: center; gap: 8px; overflow: hidden; flex: 1;">
                                                        <input type="checkbox" class="nomina-checkbox line-paid-checkbox" 
                                                            data-drawer-id="${m.drawerId}" 
                                                            data-id="${m.id}" 
                                                            ${m.paid ? 'checked' : ''} 
                                                            title="Marcar como pagado">
                                                        <span class="line-concept ${m.paid ? 'movement-item-paid' : ''}" 
                                                            style="font-size: 0.7rem; color: var(--text-main); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" 
                                                            title="${m.concept || m.description}">${m.concept || m.description}</span>
                                                    </div>
                                                    <span style="font-size: 0.75rem; font-weight: 600; color: var(--danger); white-space: nowrap; margin-left: 8px;">${fmtEUR(m.amount)}</span>
                                                </div>
                                            `).join('')}
                                        </div>
                                    </div>
                                `;
                    }).join('');
                })()}
                        </div>
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
                { label: '💸 Gastos', value: `${fmtEUR(totalPaidExpensesManual || 0)} de ${fmtEUR(totalPlannedExpensesManual || 0)}`, color: 'var(--danger)' },
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
            const checkbox = e.target.closest('input[type="checkbox"]');

            if (checkbox) {
                if (checkbox.classList.contains('line-paid-checkbox')) {
                    const drawerId = checkbox.dataset.drawerId;
                    const movementId = checkbox.dataset.id;
                    const drawer = nominaData.find(d => d.id == drawerId);
                    if (drawer) {
                        const movement = drawer.movements.find(m => m.id == movementId);
                        if (movement) {
                            movement.paid = checkbox.checked;
                            if (window.saveNomina) window.saveNomina(nominaData);
                            renderNomina();
                        }
                    }
                } else if (checkbox.classList.contains('master-paid-checkbox')) {
                    const drawerId = checkbox.dataset.drawerId;
                    const drawer = nominaData.find(d => d.id == drawerId);
                    if (drawer) {
                        // Toggle paid for all movements visible in the summary for this drawer
                        drawer.movements.forEach(m => {
                            if ((m.activeMonths || []).includes(currentMonthNum) && !isProvision(m)) {
                                m.paid = checkbox.checked;
                            }
                        });
                        if (window.saveNomina) window.saveNomina(nominaData);
                        renderNomina();
                    }
                }
                return;
            }

            if (!btn) return;
            const id = btn.dataset.id;
            if (btn.classList.contains('add-nomina-movement')) showAddNominaMovement(id);
            if (btn.classList.contains('view-nomina-details')) showNominaDrawerDetails(id);
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
        elements.navItems.forEach(item => {
            item.classList.toggle('active', item.dataset.view === view);
        });

        // Use generalized render to handle visibility and specific rendering
        render();
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

        form.reset();
        typeInput.value = 'drawer';
        if (title) title.textContent = "Crear Nuevo Cajón";

        nameGroup?.classList.remove('hidden');
        if (amountInput) amountInput.placeholder = "Saldo Inicial (€)";
        conceptGroup?.classList.add('hidden');
        transferTargetGroup?.classList.add('hidden');
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');

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
        if (amountInput) amountInput.placeholder = "0.00";
        conceptGroup?.classList.remove('hidden');
        transferTargetGroup?.classList.add('hidden');

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

        nameGroup?.classList.add('hidden');
        transferTargetGroup?.classList.remove('hidden');
        conceptGroup?.classList.remove('hidden');
        if (amountInput) amountInput.placeholder = "Importe a transferir";
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');

        // Populate target dropdown (exclude source and Bolsa)
        transferTargetSelect.innerHTML = savingsDrawers
            .filter(d => !d.isAuto && d.id !== drawerId)
            .map(d => `<option value="${d.id}">${d.name} (${fmtEUR(d.balance)})</option>`)
            .join('');

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

        form.reset();
        typeInput.value = 'edit-drawer';
        if (targetIdInput) targetIdInput.value = drawerId;
        if (title) title.textContent = `Editar Cajón: ${drawer.name}`;

        if (drawerNameInput) drawerNameInput.value = drawer.name;
        nameGroup?.classList.remove('hidden');

        // Find initial balance movement
        const initialMvmt = drawer.movements.find(m => isProvision(m));
        if (amountInput) {
            amountInput.value = initialMvmt ? initialMvmt.amount : 0;
            amountInput.placeholder = "Saldo Inicial (€)";
        }

        conceptGroup?.classList.add('hidden');
        transferTargetGroup?.classList.add('hidden');
        if (elements.savingsMovementTypeContainer) elements.savingsMovementTypeContainer.classList.add('hidden');
        if (elements.savingsCategoryGroup) elements.savingsCategoryGroup.classList.add('hidden');

        modal.classList.remove('hidden');
        modal.style.display = 'flex';
    }

    function consolidateDrawerHistory(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || drawer.isAuto) return;

        if (confirm(`¿Consolidar historial de "${drawer.name}"? Se eliminarán todos los movimientos y el saldo inicial se ajustará al saldo actual (${fmtEUR(drawer.balance)}).`)) {

            // Keep/Update initial movement
            let initialMvmt = drawer.movements.find(m => isProvision(m));
            if (initialMvmt) {
                initialMvmt.amount = drawer.balance;
                initialMvmt.date = new Date().toISOString().split('T')[0];
            } else {
                initialMvmt = {
                    date: new Date().toISOString().split('T')[0],
                    amount: drawer.balance,
                    description: 'Saldo inicial'
                };
            }

            drawer.movements = [initialMvmt];
            if (window.saveSavings) window.saveSavings(savingsDrawers);
            render();
        }
    }

    function deleteSavingsDrawer(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer || drawer.isAuto) return;

        if (confirm(`¿Estás seguro de que deseas borrar el cajón "${drawer.name}"? Esta acción no se puede deshacer.`)) {
            savingsDrawers = savingsDrawers.filter(d => d.id !== drawerId);
            if (window.saveSavings) window.saveSavings(savingsDrawers);
            render();
        }
    }

    function toggleSavingsModal(show) {
        const modal = document.getElementById('savingsInputModal');
        if (modal) {
            modal.classList.toggle('hidden', !show);
            modal.style.display = show ? 'flex' : 'none';
        }
    }

    function showDrawerDetails(drawerId) {
        const drawer = savingsDrawers.find(d => d.id === drawerId);
        if (!drawer) return;

        let movementsHtml = drawer.isAuto
            ? '<p style="opacity:0.7">Este cajón se sincroniza automáticamente con el valor de tu cartera de acciones.</p>'
            : drawer.movements.map((m, idx) => `
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
                        <button class="edit-mvmt-entry-btn" data-index="${idx}" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1rem; opacity:0.5; padding:0.2rem;" title="Editar Movimiento">✏️</button>
                    </div>
                </div>
            `).join('') || '<p style="opacity:0.5; padding:1rem; text-align:center;">No hay movimientos aún.</p>';

        const overlay = document.createElement('div');
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
                        <button id="closeDetails" style="background:none; border:none; color:inherit; cursor:pointer; font-size:1.5rem;">✕</button>
                    </div>
                </div>
                <div style="margin-top:1.5rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; border-bottom: 2px solid var(--primary); padding-bottom: 3px; margin-bottom: 1rem;">
                        <h3 style="margin:0">Historial</h3>
                        ${!drawer.isAuto && drawer.movements.length > 1 ? `<button id="consolidateBtn" class="btn-secondary" style="padding:0.3rem 0.6rem; font-size:0.75rem;">📦 Consolidar</button>` : ''}
                    </div>
                    <div>${movementsHtml}</div>
                </div>
            </div>
        `;
        document.body.appendChild(overlay);
        document.getElementById('closeDetails').onclick = () => overlay.remove();
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
                overlay.remove(); // Close detail after consolidation to refresh
                showDrawerDetails(drawer.id); // Re-open to see consolidated state
            };
        }
        overlay.querySelectorAll('.edit-mvmt-entry-btn').forEach(btn => {
            btn.onclick = () => {
                const index = parseInt(btn.dataset.index);
                overlay.remove();
                showEditMovementModal(drawer.id, index);
            };
        });
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
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
        conceptGroup?.classList.remove('hidden');
        transferTargetGroup?.classList.add('hidden');

        if (elements.savingsMovementTypeContainer) {
            elements.savingsMovementTypeContainer.classList.remove('hidden');
            updateSavingsMovementType(movement.amount >= 0 ? 'income' : 'expense');
        }

        if (elements.savingsCategoryGroup) {
            elements.savingsCategoryGroup.classList.remove('hidden');
        }

        // Delay setting the value slightly to ensure options are generated
        setTimeout(() => {
            if (elements.savingsCategorySelect && movement.category) {
                elements.savingsCategorySelect.value = movement.category;
            }
        }, 10);

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
     * Generates a mini sparkline SVG for a given ticker.
     */
    function createSparkline(ticker, days = 30) {
        const mockInfo = window.MOCK_DATA[ticker.toUpperCase()];
        if (!mockInfo || !mockInfo.historical || !mockInfo.historical['D']) {
            return '<div class="sparkline-placeholder">-</div>';
        }

        const data = mockInfo.historical['D'].slice(-days);
        if (data.length < 2) return '';

        const min = Math.min(...data.map(d => d.close));
        const max = Math.max(...data.map(d => d.close));
        const range = max - min || 1;

        const width = 80;
        const height = 30;
        const padding = 2;

        const points = data.map((d, i) => {
            const x = (i / (data.length - 1)) * width;
            const y = height - padding - ((d.close - min) / range) * (height - 2 * padding);
            return `${x.toFixed(1)},${y.toFixed(1)} `;
        }).join(' ');

        const isUp = data[data.length - 1].close >= data[0].close;
        const color = isUp ? 'var(--success)' : 'var(--danger)';

        return `
            <div class="sparkline-container" title="Últimos 30 días">
                <svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
                    <polyline
                        fill="none"
                        stroke="${color}"
                        stroke-width="1.5"
                        stroke-linecap="round"
                        stroke-linejoin="round"
                        points="${points}"
                    />
                </svg>
            </div>
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
        if (elements.incomeCategoriesInput) {
            const incCats = JSON.parse(localStorage.getItem('incomeCategories')) || ['Ahorro', 'Intereses', 'Dividendos', 'Especulación'];
            elements.incomeCategoriesInput.value = incCats.join(', ');
        }
        if (elements.expenseCategoriesInput) {
            const expCats = JSON.parse(localStorage.getItem('expenseCategories')) || ['Inversión', 'Gasto'];
            elements.expenseCategoriesInput.value = expCats.join(', ');
        }
        toggleSettingsModal(true);
    }

    function saveSettings(e) {
        e.preventDefault();

        // Fiscal Day
        let newFiscalDay = parseInt(elements.fiscalDayInput?.value);
        if (isNaN(newFiscalDay) || newFiscalDay < 1 || newFiscalDay > 31) newFiscalDay = 25;
        localStorage.setItem('fiscalDay', newFiscalDay);

        // Income Categories
        const newIncCats = elements.incomeCategoriesInput?.value.split(',').map(s => s.trim()).filter(s => s);
        if (newIncCats && newIncCats.length > 0) {
            localStorage.setItem('incomeCategories', JSON.stringify(newIncCats));
        } else {
            localStorage.setItem('incomeCategories', JSON.stringify(['Ahorro', 'Intereses', 'Dividendos', 'Especulación']));
        }

        // Expense Categories
        const newExpCats = elements.expenseCategoriesInput?.value.split(',').map(s => s.trim()).filter(s => s);
        if (newExpCats && newExpCats.length > 0) {
            localStorage.setItem('expenseCategories', JSON.stringify(newExpCats));
        } else {
            localStorage.setItem('expenseCategories', JSON.stringify(['Inversión', 'Gasto']));
        }

        // Apply visual updates and notify user
        toggleSettingsModal(false);
        showToast('Ajustes guardados correctamente.');

        // Reload page so variables such as fiscalDay load properly across the code
        setTimeout(() => location.reload(), 1000);
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

        elements.addStockBtn?.addEventListener('click', () => {
            elements.addStockForm.reset();
            elements.editId.value = '';
            elements.modalTitle.textContent = "Add New Investment";
            elements.submitStockBtn.textContent = "Add Investment";

            // Robust Today's Date Default
            const today = new Date().toISOString().split('T')[0];
            if (elements.dateInput) elements.dateInput.value = today;

            toggleModal(true);
        });

        elements.settingsBtn?.addEventListener('click', openSettingsModal);
        elements.mobileSettingsBtn?.addEventListener('click', openSettingsModal);
        elements.closeSettingsModal?.addEventListener('click', () => toggleSettingsModal(false));
        elements.settingsForm?.addEventListener('submit', saveSettings);

        if (elements.privacyToggleBtn) {
            elements.privacyToggleBtn.addEventListener('click', togglePrivacy);
        }
        if (elements.mobilePrivacyToggleBtn) {
            elements.mobilePrivacyToggleBtn.addEventListener('click', togglePrivacy);
        }

        // Navigation
        elements.navItems.forEach(item => {
            item.addEventListener('click', () => switchView(item.dataset.view));
        });

        // Swipe Navigation for Mobile
        (function () {
            let touchStartX = 0;
            let touchEndX = 0;
            let touchStartY = 0;
            const views = ['bolsa', 'ahorro', 'nomina', 'analisis'];

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
            elements.addDrawerBtn.addEventListener('click', () => showAddDrawer());
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
                const bankIcon = getBankIcon(name);
                const newDrawer = {
                    id: 'drawer_' + Date.now(),
                    name: name || 'Nuevo Cajón',
                    icon: bankIcon || '📁',
                    balance: amount || 0,
                    movements: amount !== 0 ? [{
                        date: new Date().toISOString().split('T')[0],
                        amount: amount || 0,
                        description: 'Saldo inicial'
                    }] : [],
                    isAuto: false
                };
                savingsDrawers.push(newDrawer);
            } else if (action === 'movement') {
                const drawerId = elements.savingsTargetId.value;
                const drawer = savingsDrawers.find(d => d.id === drawerId);
                if (drawer) {
                    const concept = elements.movementConceptInput.value.trim() || 'Ajuste manual';
                    const type = elements.savingsMovementType.value;
                    const finalAmount = type === 'expense' ? -Math.abs(amount) : Math.abs(amount);
                    const category = elements.savingsCategorySelect.value;
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

                    // Subtract from source
                    fromDrawer.balance -= amount;
                    fromDrawer.movements.push({
                        date: today,
                        amount: -amount,
                        description: concept
                    });

                    // Add to target
                    toDrawer.balance += amount;
                    toDrawer.movements.push({
                        date: today,
                        amount: amount,
                        description: targetConcept
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
                    const category = elements.savingsCategorySelect.value;
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
        if (elements.nominaTableViewBtn) {
            elements.nominaTableViewBtn.onclick = () => {
                nominaViewMode = 'list';
                localStorage.setItem('nominaViewMode', 'list');
                renderNomina();
            };
        }
        if (elements.nominaCardViewBtn) {
            elements.nominaCardViewBtn.onclick = () => {
                nominaViewMode = 'cards';
                localStorage.setItem('nominaViewMode', 'cards');
                renderNomina();
            };
        }

        // Nomina Month Navigation
        if (elements.prevNominaMonthBtn) {
            elements.prevNominaMonthBtn.onclick = () => {
                const [y, m] = nominaListMonth.split('-').map(Number);
                const d = new Date(y, m - 2);
                nominaListMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                renderNominaList();
            };
        }
        if (elements.nextNominaMonthBtn) {
            elements.nextNominaMonthBtn.onclick = () => {
                const [y, m] = nominaListMonth.split('-').map(Number);
                const d = new Date(y, m);
                nominaListMonth = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
                renderNominaList();
            };
        }
        // Nomina Listeners

        if (elements.exportSavingsBtn) {
            elements.exportSavingsBtn.addEventListener('click', () => exportSavingsToCSV());
        }
        if (elements.importSavingsBtn) {
            elements.importSavingsBtn.addEventListener('click', () => elements.savingsCsvInput.click());
        }
        if (elements.savingsCsvInput) {
            elements.savingsCsvInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) importSavingsFromCSV(e.target.files[0]);
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
        };

        if (elements.addNominaBtn) {
            elements.addNominaBtn.addEventListener('click', () => showAddNomina());
        }
        if (elements.closeNominaModal) {
            elements.closeNominaModal.addEventListener('click', () => toggleNominaModal(false));
        }
        if (elements.exportNominaBtn) {
            elements.exportNominaBtn.addEventListener('click', () => exportNominaToCSV());
        }
        if (elements.importNominaBtn) {
            elements.importNominaBtn.addEventListener('click', () => elements.nominaCsvInput.click());
        }
        if (elements.closeNominaMovementModal) {
            elements.closeNominaMovementModal.addEventListener('click', () => toggleNominaMovementModal(false));
        }
        if (elements.closeNominaHistoryModal) {
            elements.closeNominaHistoryModal.addEventListener('click', () => elements.nominaHistoryModal.classList.add('hidden'));
        }
        if (elements.nominaCsvInput) {
            elements.nominaCsvInput.addEventListener('change', (e) => {
                if (e.target.files.length > 0) importNominaFromCSV(e.target.files[0]);
            });
        }

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
                    drawer.icon = getNominaIcon(name, type);
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
                    icon: getNominaIcon(name, type),
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

            const tickerInput = elements.tickerInput.value.trim().toUpperCase();
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

            addStock(stockData);
        });

        // Ahorro View Toggles
        elements.ahorroCardViewBtn?.addEventListener('click', () => {
            ahorroViewMode = 'cards';
            localStorage.setItem('ahorroViewMode', 'cards');
            renderSavings();
        });

        elements.ahorroTableViewBtn?.addEventListener('click', () => {
            ahorroViewMode = 'list';
            localStorage.setItem('ahorroViewMode', 'list');
            renderSavings();
        });

        // Ahorro Month Navigation
        elements.prevAhorroMonthBtn?.addEventListener('click', () => {
            let [y, m] = ahorroListMonth.split('-').map(Number);
            if (ahorroFilterMode === 'year') {
                y--;
            } else {
                m--;
                if (m < 1) {
                    m = 12;
                    y--;
                }
            }
            ahorroListMonth = `${y}-${String(m).padStart(2, '0')}`;
            renderSavingsList();
        });

        elements.nextAhorroMonthBtn?.addEventListener('click', () => {
            let [y, m] = ahorroListMonth.split('-').map(Number);
            if (ahorroFilterMode === 'year') {
                y++;
            } else {
                m++;
                if (m > 12) {
                    m = 1;
                    y++;
                }
            }
            ahorroListMonth = `${y}-${String(m).padStart(2, '0')}`;
            renderSavingsList();
        });

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

        window.onclick = (event) => {
            if (event.target === elements.addStockModal) toggleModal(false);
            if (event.target === elements.financialDetailsModal) {
                elements.financialDetailsModal.classList.add('hidden');
            }
        };

        elements.importDataBtn?.addEventListener('click', () => {
            const input = document.createElement('input');
            input.type = 'file';
            input.accept = 'application/json,.csv,text/csv';

            input.onchange = e => {
                const file = e.target.files[0];
                if (!file) return;

                const isCSV = file.name.toLowerCase().endsWith('.csv');
                const reader = new FileReader();

                reader.onload = readerEvent => {
                    if (isCSV) {
                        // --- CSV Parser ---
                        try {
                            const text = readerEvent.target.result;
                            const lines = text.split(/\r?\n/).filter(l => l.trim() !== '');
                            if (lines.length < 2) {
                                alert('El CSV está vacío o no tiene datos.');
                                return;
                            }

                            // Parse header
                            const headers = lines[0].split(',').map(h => h.trim());
                            const idx = {
                                ticker: headers.indexOf('Ticker'),
                                qty: headers.indexOf('Quantity'),
                                price: headers.indexOf('Cost Per Share'),
                                currency: headers.indexOf('Currency'),
                                date: headers.indexOf('Date'),
                            };

                            if (idx.ticker === -1 || idx.qty === -1 || idx.price === -1 || idx.date === -1) {
                                alert('El CSV no tiene el formato esperado. Columnas requeridas: Ticker, Quantity, Cost Per Share, Date.');
                                return;
                            }

                            // Helper: infer market from ticker
                            const inferMarket = (ticker, currency) => {
                                if (ticker.endsWith('.ES')) return 'IBEX35';
                                if (ticker.endsWith('.DE')) return 'XETRA';
                                if (ticker.endsWith('.MC')) return 'IBEX35';
                                if (currency === 'USD') return 'SP500';
                                return 'SP500'; // default fallback
                            };

                            const parsed = [];
                            for (let i = 1; i < lines.length; i++) {
                                const cols = lines[i].split(',');
                                if (cols.length < 5) continue;

                                const ticker = (cols[idx.ticker] || '').trim().toUpperCase();
                                const qty = parseFloat(cols[idx.qty] || '0');
                                const price = parseFloat(cols[idx.price] || '0');
                                const currency = (cols[idx.currency] || 'EUR').trim().toUpperCase();
                                const date = (cols[idx.date] || '').trim();

                                if (!ticker || isNaN(qty) || qty === 0 || isNaN(price) || !date) continue;

                                // Convert price to EUR if needed
                                const fxRate = (window.FX_RATE && window.FX_RATE > 0) ? window.FX_RATE : 0.92;
                                const priceEUR = currency === 'USD' ? price * fxRate : price;

                                // Look up known name from MOCK_DATA, fall back to ticker
                                const mockInfo = window.MOCK_DATA ? window.MOCK_DATA[ticker] : null;
                                const name = mockInfo ? (mockInfo.name || ticker) : ticker;
                                const market = inferMarket(ticker, currency);

                                parsed.push({
                                    id: Date.now().toString() + '_' + i,
                                    ticker,
                                    name,
                                    market,
                                    date,
                                    qty,
                                    price: priceEUR, // Cost Per Share in EUR
                                });
                            }

                            if (parsed.length === 0) {
                                alert('No se encontraron filas válidas en el CSV.');
                                return;
                            }

                            if (confirm(`Se encontraron ${parsed.length} operaciones en el CSV.\n\n¿Estás seguro de que quieres importar estos datos? Reemplazarán tu cartera actual.`)) {
                                stocks = parsed;
                                if (window.saveStocks) window.saveStocks(stocks);
                                render();
                                alert(`✅ ${parsed.length} operaciones importadas correctamente desde el CSV.`);
                            }
                        } catch (err) {
                            console.error('CSV import error:', err);
                            alert('Error al procesar el archivo CSV: ' + err.message);
                        }

                    } else {
                        // --- JSON Parser (original behavior) ---
                        try {
                            const content = JSON.parse(readerEvent.target.result);
                            if (Array.isArray(content)) {
                                if (confirm('¿Estás seguro de que quieres importar estos datos? Reemplazarán tu cartera actual.')) {
                                    stocks = content;
                                    if (window.saveStocks) window.saveStocks(stocks);
                                    render();
                                    alert('¡Datos importados con éxito!');
                                }
                            } else {
                                alert('El archivo no tiene el formato correcto.');
                            }
                        } catch (err) {
                            console.error('Import error:', err);
                            alert('Error al leer el archivo JSON.');
                        }
                    }
                };

                reader.readAsText(file, 'UTF-8');
            };
            input.click();
        });

        elements.mobileAddStockBtn?.addEventListener('click', () => {
            elements.addStockForm.reset();
            elements.editId.value = '';
            elements.modalTitle.textContent = "Add New Investment";
            elements.submitStockBtn.textContent = "Add Investment";
            toggleModal(true);
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
        if (elements.manualRefreshBtn) {
            elements.manualRefreshBtn.addEventListener('click', async () => {
                const btn = elements.manualRefreshBtn;
                btn.classList.add('spin-animation');

                const currentTimerElement = document.getElementById('updateTimer');
                if (currentTimerElement) {
                    currentTimerElement.classList.remove('hidden');
                    currentTimerElement.textContent = `Actualizando datos...`;
                    currentTimerElement.style.color = '#f59e0b';
                }

                try {
                    if (window.FINNHUB_API_KEY) {
                        const uniqueTickers = [...new Set(stocks.map(s => s.ticker))];
                        await window.refreshLivePrices(uniqueTickers);
                    }
                    lastSyncTime = new Date().toLocaleTimeString();
                    isFirstUpdateDone = true;
                    render();

                    if (currentTimerElement) {
                        currentTimerElement.style.color = 'var(--primary)';
                        currentTimerElement.textContent = `Actualizado: ${lastSyncTime}`;
                        setTimeout(() => currentTimerElement.classList.add('hidden'), 3000);
                    }

                    // Show flash animation
                    document.querySelectorAll('.summary-card').forEach(card => {
                        card.classList.remove('sync-flash');
                        void card.offsetWidth;
                        card.classList.add('sync-flash');
                    });
                } finally {
                    btn.classList.remove('spin-animation');
                }
            });
        }

        // Bolsa View Toggle
        if (elements.bolsaTableViewBtn) {
            elements.bolsaTableViewBtn.addEventListener('click', () => {
                bolsaViewMode = 'list';
                localStorage.setItem('bolsaViewMode', 'list');
                elements.bolsaTableViewBtn.classList.add('active');
                elements.bolsaTableViewBtn.style.background = 'var(--primary)';
                elements.bolsaTableViewBtn.style.color = 'white';
                elements.bolsaCardViewBtn.classList.remove('active');
                elements.bolsaCardViewBtn.style.background = 'transparent';
                elements.bolsaCardViewBtn.style.color = 'var(--text-muted)';
                render();
            });
        }
        if (elements.bolsaCardViewBtn) {
            elements.bolsaCardViewBtn.addEventListener('click', () => {
                bolsaViewMode = 'cards';
                localStorage.setItem('bolsaViewMode', 'cards');
                elements.bolsaCardViewBtn.classList.add('active');
                elements.bolsaCardViewBtn.style.background = 'var(--primary)';
                elements.bolsaCardViewBtn.style.color = 'white';
                elements.bolsaTableViewBtn.classList.remove('active');
                elements.bolsaTableViewBtn.style.background = 'transparent';
                elements.bolsaTableViewBtn.style.color = 'var(--text-muted)';
                render();
            });
        }

        // Mobile: tap "Sus Inversiones" title to toggle list/cards view
        const bolsaMobileTitle = document.getElementById('bolsaMobileTitle');
        if (bolsaMobileTitle) {
            bolsaMobileTitle.style.cursor = 'pointer';
            const updateMobileTitle = () => {
                bolsaMobileTitle.textContent = bolsaViewMode === 'cards'
                    ? 'Sus Inversiones 🃏'
                    : 'Sus Inversiones 📋';
            };
            updateMobileTitle();
            bolsaMobileTitle.addEventListener('click', () => {
                bolsaViewMode = bolsaViewMode === 'cards' ? 'list' : 'cards';
                localStorage.setItem('bolsaViewMode', bolsaViewMode);
                if (elements.bolsaCardViewBtn && elements.bolsaTableViewBtn) {
                    if (bolsaViewMode === 'cards') {
                        elements.bolsaCardViewBtn.classList.add('active');
                        elements.bolsaCardViewBtn.style.background = 'var(--primary)';
                        elements.bolsaCardViewBtn.style.color = 'white';
                        elements.bolsaTableViewBtn.classList.remove('active');
                        elements.bolsaTableViewBtn.style.background = 'transparent';
                        elements.bolsaTableViewBtn.style.color = 'var(--text-muted)';
                    } else {
                        elements.bolsaTableViewBtn.classList.add('active');
                        elements.bolsaTableViewBtn.style.background = 'var(--primary)';
                        elements.bolsaTableViewBtn.style.color = 'white';
                        elements.bolsaCardViewBtn.classList.remove('active');
                        elements.bolsaCardViewBtn.style.background = 'transparent';
                        elements.bolsaCardViewBtn.style.color = 'var(--text-muted)';
                    }
                }
                updateMobileTitle();
                render();
            });
        }
    }

    function toggleModal(show) {
        if (!elements.addStockModal) return;
        if (show) {
            elements.addStockModal.classList.remove('hidden');
        } else {
            elements.addStockModal.classList.add('hidden');
        }
    }

    function exportToCSV(isExcel) {
        // Required format: Ticker, Quantity, Cost Per Share, Currency, Date
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
        let blob;
        let fileName = 'portfolio_export_' + new Date().toISOString().split('T')[0] + '.csv';
        if (isExcel) {
            const BOM = '\uFEFF';
            blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
        } else {
            blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        }
        const url = URL.createObjectURL(blob);
        triggerDownload(url, fileName);
    }

    function exportSavingsToCSV() {
        const headers = ['Type', 'DrawerID', 'Name/Description', 'Icon/Date', 'Balance/Amount', 'Category'];
        const csvRows = [headers.join(',')];
        savingsDrawers.forEach(drawer => {
            csvRows.push(['DRAWER', drawer.id, drawer.name, drawer.icon, drawer.balance, ''].join(','));
            drawer.movements.forEach(m => {
                csvRows.push(['MOVEMENT', drawer.id, m.description, m.date, m.amount, m.category || ''].join(','));
            });
        });
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        triggerDownload(encodedUri, `ahorros_msv_${new Date().toISOString().split('T')[0]}.csv`);
    }

    function importSavingsFromCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n');
            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim());
                if (headers.includes('Months')) {
                    alert("Este archivo parece ser de Nómina. Por favor, impórtalo en la sección de Nómina.");
                    return;
                }
            }
            const newDrawers = [];
            const drawersMap = {};

            lines.forEach((line, index) => {
                if (index === 0 || !line.trim()) return;
                const parts = line.split(',').map(p => p.trim());
                if (parts.length < 5) return;
                const [type, id, nameDesc, iconDate, amountVal, category] = parts;
                const value = parseFloat(amountVal);
                if (type === 'DRAWER') {
                    const drawer = { id: id, name: nameDesc, icon: iconDate, balance: value, movements: [], isAuto: (id === 'bolsa') };
                    newDrawers.push(drawer);
                    drawersMap[id] = drawer;
                } else if (type === 'MOVEMENT') {
                    if (drawersMap[id]) {
                        drawersMap[id].movements.push({
                            description: nameDesc,
                            date: iconDate,
                            amount: value,
                            category: category || ''
                        });
                    }
                }
            });

            if (newDrawers.length > 0) {
                if (!drawersMap['bolsa']) {
                    newDrawers.unshift({ id: 'bolsa', name: 'Bolsas y Acciones', icon: '📈', balance: 0, movements: [], isAuto: true });
                }
                savingsDrawers = newDrawers;
                if (window.saveSavings) window.saveSavings(savingsDrawers);
                render();
                alert("Ahorros importados correctamente.");
            } else {
                alert("No se encontraron datos válidos en el archivo.");
            }
        };
        reader.readAsText(file);
    }

    // --- Nomina Functions ---

    function toggleNominaModal(show) {
        if (!elements.nominaModal) return;
        if (show) {
            elements.nominaModal.classList.remove('hidden');
        } else {
            elements.nominaModal.classList.add('hidden');
            if (elements.nominaForm) elements.nominaForm.reset();
            if (elements.nominaEditId) elements.nominaEditId.value = '';
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

    function showAddNomina() {
        if (elements.nominaModalTitle) elements.nominaModalTitle.textContent = 'Añadir Nuevo Cajón';
        if (elements.nominaEditId) elements.nominaEditId.value = '';
        if (elements.nominaNameInput) elements.nominaNameInput.value = '';
        if (elements.nominaAmountInput) elements.nominaAmountInput.value = '';
        if (elements.nominaTypeSelect) elements.nominaTypeSelect.value = 'income'; // Default or could be empty
        if (elements.nominaDrawerMonthsCheckboxes) {
            elements.nominaDrawerMonthsCheckboxes.querySelectorAll('input').forEach(cb => cb.checked = true);
        }
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
        if (elements.nominaDrawerMonthsCheckboxes && initialMvmt) {
            const active = initialMvmt.activeMonths || [];
            elements.nominaDrawerMonthsCheckboxes.querySelectorAll('input').forEach(cb => {
                cb.checked = active.includes(parseInt(cb.value));
            });
        }
        toggleNominaModal(true);
    }

    function deleteNominaDrawer(id) {
        if (confirm('¿Estás seguro de que quieres eliminar este cajón y todos sus movimientos?')) {
            nominaData = nominaData.filter(d => d.id != id);
            if (window.saveNomina) window.saveNomina(nominaData);
            renderNomina();
        }
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
        if (confirm('¿Estás seguro de que quieres eliminar este movimiento?')) {
            drawer.movements.splice(index, 1);
            if (window.saveNomina) window.saveNomina(nominaData);
            renderNomina();
            showNominaDrawerDetails(drawerId);
        }
    }

    function showNominaDrawerDetails(id) {
        const drawer = nominaData.find(d => d.id == id);
        if (!drawer) return;
        if (elements.nominaHistoryTitle) elements.nominaHistoryTitle.textContent = `Historial: ${drawer.name}`;
        if (elements.nominaMovementsList) {
            elements.nominaMovementsList.innerHTML = '';
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

    function exportNominaToCSV() {
        const headers = ['Type', 'DrawerID', 'Name/Description', 'Icon/Date', 'Balance/Amount', 'Months', 'Paid'];
        const csvRows = [headers.join(',')];
        nominaData.forEach(drawer => {
            const initialMvmt = (drawer.movements || []).find(m => isProvision(m));
            const drawerMonths = (initialMvmt?.activeMonths || []).join('|');
            csvRows.push(['DRAWER', drawer.id, drawer.name, drawer.type || '', drawer.balance, drawerMonths, ''].join(','));
            drawer.movements.forEach(m => {
                const movMonths = (m.activeMonths || []).join('|');
                csvRows.push(['MOVEMENT', drawer.id, m.concept || m.description, m.date, m.amount, movMonths, m.paid ? '1' : '0'].join(','));
            });
        });
        const csvContent = "data:text/csv;charset=utf-8," + csvRows.join("\n");
        const encodedUri = encodeURI(csvContent);
        triggerDownload(encodedUri, `nomina_msv_${new Date().toISOString().split('T')[0]}.csv`);
    }

    function importNominaFromCSV(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            const lines = e.target.result.split('\n');
            const newData = [];
            const map = {};
            if (lines.length > 0) {
                const headers = lines[0].split(',').map(h => h.trim());
                if (!headers.includes('Months')) {
                    alert("Este archivo parece ser de Ahorros. Por favor, impórtalo en la sección de Ahorros.");
                    return;
                }
            }
            lines.forEach((line, index) => {
                if (index === 0 || !line.trim()) return;
                const parts = line.split(',').map(p => p.trim());
                if (parts.length < 5) return;
                const [type, id, nameDesc, iconDate, amountVal, monthsStr, paidStr] = parts;
                const value = parseFloat(amountVal);
                const activeMonths = monthsStr ? monthsStr.split('|').map(m => parseInt(m)) : null;
                const paid = paidStr === '1';
                if (type === 'DRAWER') {
                    let dType = iconDate; // Could be 'income', 'expense', 'saving' or '📈'/'📉'
                    if (dType === '📈') dType = 'income';
                    else if (dType === '📉') dType = 'expense';
                    else if (!['income', 'expense', 'saving'].includes(dType)) dType = 'expense'; // Default fallback

                    const drawer = { id: id, name: nameDesc, type: dType, balance: value, movements: [] };
                    newData.push(drawer);
                    map[id] = drawer;
                } else if (type === 'MOVEMENT') {
                    if (map[id]) {
                        const date = iconDate;
                        let movActiveMonths = activeMonths;
                        if (!movActiveMonths) {
                            const d = new Date(date);
                            let monthNum = d.getMonth() + 1;
                            if (d.getDate() >= 25) monthNum = (monthNum % 12) + 1;
                            movActiveMonths = isProvision({ description: nameDesc }) ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] : [monthNum];
                        }
                        map[id].movements.push({
                            id: Date.now() + Math.random(), // Ensure unique ID on import
                            concept: nameDesc,
                            description: nameDesc,
                            date: date,
                            amount: value,
                            activeMonths: movActiveMonths,
                            paid: paid
                        });
                    }
                }
            });
            if (newData.length > 0) {
                nominaData = migrateNominaData(newData);
                if (window.saveNomina) window.saveNomina(nominaData);
                renderNomina();
                alert("Nomina importada correctamente.");
            } else {
                alert("No se encontraron datos válidos.");
            }
        };
        reader.readAsText(file);
    }

    // --- Global JSON Backup/Restore ---

    function exportGlobalJSON() {
        const globalData = {
            stocks: stocks,
            savings: savingsDrawers,
            nomina: nominaData,
            exportDate: new Date().toISOString(),
            version: "1.0"
        };
        const blob = new Blob([JSON.stringify(globalData, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const fileName = `wealthtrack_backup_${new Date().toISOString().split('T')[0]}.json`;
        triggerDownload(url, fileName);
    }

    function importGlobalJSON(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = JSON.parse(e.target.result);
                if (!data.stocks || !data.savings || !data.nomina) {
                    throw new Error("El archivo no tiene el formato de respaldo global esperado.");
                }
                if (confirm(`Se restaurarán:\n- ${data.stocks.length} activos en Bolsa\n- ${data.savings.length} cajones de Ahorro\n- ${data.nomina.length} cajones de Nómina\n\n¿Estás SEGURO? Esto reemplazará tus datos actuales.`)) {
                    stocks = data.stocks;
                    savingsDrawers = data.savings;
                    nominaData = migrateNominaData(data.nomina);
                    if (window.saveStocks) window.saveStocks(stocks);
                    if (window.saveSavings) window.saveSavings(savingsDrawers);
                    if (window.saveNomina) window.saveNomina(nominaData);
                    render();
                    if (currentView === 'nomina') renderNomina();
                    alert("✅ Respaldo global restaurado con éxito.");
                }
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

    async function triggerDownload(contentUri, fileName) {
        try {
            // Try to use File System Access API for better experience (handles Overwrite natively)
            if ('showSaveFilePicker' in window) {
                const blob = await fetch(contentUri).then(r => r.blob());
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
        }

        // Fallback for browsers/mobile without FileSystem API
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', contentUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();

        showToast(`Descarga iniciada: ${fileName}`);
        console.log(`File ${fileName} exported successfully (fallback)`);
    }

    // Start
    const initApp = function () {
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

        render();
        setupEventListeners();
        // Automatic update cycle removed. Now manual via refresh button.
        // Simplified sync for first load
        if (window.FINNHUB_API_KEY && !isFirstUpdateDone) {
            const uniqueTickers = [...new Set(stocks.map(s => s.ticker))];
            window.refreshLivePrices(uniqueTickers).then(() => {
                lastSyncTime = new Date().toLocaleTimeString();
                isFirstUpdateDone = true;
                render();
            });
        }
    }

    showApp();
});
