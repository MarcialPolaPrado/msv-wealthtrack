document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized");

    // State
    let stocks = (window.loadStocks) ? window.loadStocks() : [];
    let currentFilter = 'all';
    let sortConfig = { key: null, direction: 'asc' };
    let expandedTickers = new Set(); // Track which positions are expanded to show details
    let lastSyncTime = new Date().toLocaleTimeString();
    let currentView = 'bolsa';
    let isPrivacyActive = (window.loadPrivacy) ? window.loadPrivacy() : true;

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

        return type === 'income' ? '💰' : '💸';
    }

    function isProvision(m) {
        if (!m) return false;
        const desc = (m.description || m.concept || '').toLowerCase().trim();
        // Broader regex to ensure transfers/savings are never counted as external income
        return /saldo inicial|provisión|provision|presupuesto|asignado|transfer|ahorro|extraer|inicial|carga|remanente|ajuste|mes de|nomina|nómina/i.test(desc);
    }

    function getFiscalMonth(dateInput = new Date()) {
        const d = new Date(dateInput);
        if (d.getDate() >= 25) {
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
    let nominaData = (window.loadNomina) ? (window.loadNomina() || []) : [];
    // Ensure data structure compatibility (migration)
    nominaData = nominaData.map(concept => {
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
        return concept;
    });
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

        // Savings Elements
        navItems: document.querySelectorAll('.nav-item'),
        bolsaSection: document.getElementById('bolsaSection'),
        ahorroSection: document.getElementById('ahorroSection'),
        totalSavingsGlobal: document.getElementById('totalSavingsGlobal'),
        drawersGrid: document.getElementById('drawersGrid'),
        addDrawerBtn: document.getElementById('addDrawerBtn'),
        exportSavingsBtn: document.getElementById('exportSavingsBtn'),
        importSavingsBtn: document.getElementById('importSavingsBtn'),
        savingsCsvInput: document.getElementById('savingsCsvInput'),

        // Savings Modal Elements
        savingsInputModal: document.getElementById('savingsInputModal'),
        savingsInputForm: document.getElementById('savingsInputForm'),
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

        // Nomina Elements
        nominaSection: document.getElementById('nominaSection'),
        nominaGrid: document.getElementById('nominaGrid'),
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
        analisisChart: document.getElementById('analisisChart'),
        nominaMovementForm: document.getElementById('nominaMovementForm'),
        nominaMovementModalTitle: document.getElementById('nominaMovementModalTitle'),
        closeNominaMovementModal: document.getElementById('closeNominaMovementModal'),
        nominaMovementTargetId: document.getElementById('nominaMovementTargetId'),
        nominaMovementEditIndex: document.getElementById('nominaMovementEditIndex'),
        nominaMovementAmountInput: document.getElementById('nominaMovementAmountInput'),
        nominaMovementConceptInput: document.getElementById('nominaMovementConceptInput'),
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
        globalJsonInput: document.getElementById('globalJsonInput')
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

    // Authentication removed as requested
    function showApp() {
        elements.loginOverlay.classList.add('hidden');
        elements.mainApp.classList.remove('hidden');
        updatePrivacyUI();
        initApp();
    }

    function togglePrivacy() {
        isPrivacyActive = !isPrivacyActive;
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

        }
        updatePortfolioCandle(totalInvestedEUR, totalCurrentValueEUR);

        // Section Toggling logic - Robust Multi-view support
        if (currentView === 'bolsa') {
            if (elements.bolsaSection) elements.bolsaSection.classList.remove('hidden');
            if (elements.ahorroSection) elements.ahorroSection.classList.add('hidden');
            if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
            if (elements.mobileActionBar) elements.mobileActionBar.classList.remove('hidden');
        } else if (currentView === 'ahorro') {
            if (elements.bolsaSection) elements.bolsaSection.classList.add('hidden');
            if (elements.ahorroSection) elements.ahorroSection.classList.remove('hidden');
            if (elements.nominaSection) elements.nominaSection.classList.add('hidden');
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
            netSaving: 0
        }));

        for (let mIdx = 0; mIdx < 12; mIdx++) {
            const monthNum = mIdx + 1;
            let mInc = 0;
            let mExp = 0;
            let mNetSaving = 0;

            nominaData.forEach(drawer => {
                if (drawer.isAutomatic) return;

                const mvmts = (drawer.movements || []).filter(m => {
                    const active = (m.activeMonths || []).map(Number);
                    return active.includes(monthNum);
                });

                const isIncomeType = drawer.type === 'income';
                const hasEverHadExpenses = (drawer.movements || []).some(m => !isProvision(m) && m.amount < 0);

                mvmts.forEach(m => {
                    if (m.amount < 0) {
                        mExp += Math.abs(m.amount);
                    } else if (isIncomeType) {
                        mInc += m.amount;
                    }

                    // Net Saving logic (from renderNomina): 
                    // Provision counts as pure saving ONLY if there are NO expenses EVER in this drawer
                    if (!isIncomeType && isProvision(m) && !hasEverHadExpenses) {
                        mNetSaving += m.amount;
                    }
                });
            });

            monthlyData[mIdx].income = mInc;
            monthlyData[mIdx].expenses = mExp;
            monthlyData[mIdx].netSaving = mNetSaving;
        }

        const totalInc = monthlyData.reduce((s, d) => s + d.income, 0);
        const totalExp = monthlyData.reduce((s, d) => s + d.expenses, 0);
        const totalNetSaving = monthlyData.reduce((s, d) => s + d.netSaving, 0);

        if (elements.totalYearlyIncome) elements.totalYearlyIncome.textContent = fmtEUR(totalInc);
        if (elements.totalYearlyExpense) elements.totalYearlyExpense.textContent = fmtEUR(totalExp);
        if (elements.totalYearlyNetSaving) elements.totalYearlyNetSaving.textContent = fmtEUR(totalNetSaving);

        const monthNames = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        elements.analisisTableBody.innerHTML = monthlyData.map((d, i) => {
            return '<tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">' +
                '<td style="padding: 0.8rem 1rem; font-weight: 500;">' + monthNames[i] + '</td>' +
                '<td style="padding: 0.8rem 1rem; text-align: right; color: var(--success);">' + fmtEUR(d.income) + '</td>' +
                '<td style="padding: 0.8rem 1rem; text-align: right; color: var(--danger); opacity: 0.8;">' + fmtEUR(d.expenses) + '</td>' +
                '<td style="padding: 0.8rem 1rem; text-align: right; color: #f59e0b; font-weight: 600;">' + fmtEUR(d.netSaving) + '</td>' +
                '</tr>';
        }).join('');

        renderAnalisisChart(monthlyData);
    }


    function renderAnalisisChart(data) {
        if (!elements.analisisChart) return;

        const container = elements.analisisChart;
        container.innerHTML = '';

        const maxVal = Math.max(...data.map(d => Math.max(d.income, d.expenses)), 1000);
        const monthNames = ["E", "F", "M", "A", "M", "J", "J", "A", "S", "O", "N", "D"];

        const chartHtml = `
            <div style="display: flex; align-items: flex-end; justify-content: space-between; height: 100%; gap: 4px; padding-top: 20px;">
                ${data.map((d, i) => {
            const incH = (d.income / maxVal) * 100;
            const expH = (d.expenses / maxVal) * 100;
            return `
                        <div style="flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%;">
                            <div style="display: flex; align-items: flex-end; gap: 2px; flex-grow: 1; width: 100%; justify-content: center;">
                                <div title="Ingresos: ${fmtEUR(d.income)}" style="width: 40%; height: ${incH}%; background: var(--success); border-radius: 4px 4px 0 0; opacity: 0.8; min-height: 2px;"></div>
                                <div title="Gastos: ${fmtEUR(d.expenses)}" style="width: 40%; height: ${expH}%; background: var(--danger); border-radius: 4px 4px 0 0; opacity: 0.8; min-height: 2px;"></div>
                            </div>
                            <div style="font-size: 0.7rem; margin-top: 0.5rem; opacity: 0.7; font-weight: 600;">${monthNames[i]}</div>
                        </div>
                    `;
        }).join('')}
            </div>
            <div style="display: flex; gap: 1rem; margin-top: 1rem; justify-content: center; font-size: 0.8rem;">
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <div style="width: 12px; height: 12px; background: var(--success); border-radius: 2px;"></div>
                    <span>Ingresos</span>
                </div>
                <div style="display: flex; align-items: center; gap: 0.4rem;">
                    <div style="width: 12px; height: 12px; background: var(--danger); border-radius: 2px;"></div>
                    <span>Gastos</span>
                </div>
            </div>
        `;

        container.innerHTML = chartHtml;
    }

    function renderSavings() {
        if (!elements.drawersGrid) return;
        console.log("Rendering savings drawers. Count:", savingsDrawers.length);

        // Calculate Global Total
        const total = savingsDrawers.reduce((sum, d) => sum + d.balance, 0);
        if (elements.totalSavingsGlobal) elements.totalSavingsGlobal.textContent = fmtEUR(total);

        elements.drawersGrid.innerHTML = '';

        if (savingsDrawers.length === 0) {
            console.warn("No savings drawers found to render.");
            return;
        }

        savingsDrawers.forEach(drawer => {
            const card = document.createElement('div');
            // We force income-drawer but also apply very explicit inline styles to ensure green color
            card.className = `card drawer-card glass-panel income-drawer ${drawer.isAuto ? 'bolsa-drawer' : ''}`;

            // Force green theme inline with high priority
            card.style.setProperty('background', 'rgba(16, 185, 129, 0.25)', 'important');
            card.style.setProperty('background-color', '#064e3b', 'important');
            card.style.setProperty('background-image', 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)', 'important');
            card.style.setProperty('border', '2px solid #10b981', 'important');

            card.innerHTML = `
                <span class="drawer-icon">${drawer.icon}</span>
                <span class="drawer-name" style="color: white !important; font-weight: 700;">${drawer.name}</span>
                <span class="drawer-amount" style="color: #10b981 !important; font-weight: 800; font-size: 1.2rem;">${fmtEUR(drawer.balance)}</span>
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
    }

    function renderNomina() {
        if (!elements.nominaSection || currentView !== 'nomina') return;

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

        // Helper to ensure the automatic drawer exists
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

        // 1. First Pass: Calculate all global sums (excluding automatic drawer)
        nominaData.forEach((concept) => {
            if (concept.isAutomatic) return;

            const isIncomeType = concept.type === 'income';
            const monthlyMovements = (concept.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));

            monthlyMovements.forEach(m => {
                const provision = isProvision(m);
                if (m.amount > 0) {
                    if (isIncomeType) {
                        totalPrimaryIncome += m.amount;
                    } else {
                        if (provision) {
                            totalBudgetedProvisions += m.amount;
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
                            drawerName: concept.name,
                            icon: concept.icon || getNominaIcon(concept.name, concept.type)
                        });
                    }
                }
            });
        });

        // 2. Synchronize residue (Undestined) to the automatic drawer
        const calculatedUndestined = (totalPrimaryIncome + totalExternalExtraIncome) - totalBudgetedProvisions;

        let autoProvision = autoDrawer.movements.find(m => {
            return isProvision(m) && (m.activeMonths || []).includes(currentMonthNum);
        });

        if (!autoProvision) {
            autoProvision = {
                id: Date.now() + Math.random(),
                date: new Date().toISOString().split('T')[0],
                description: 'Saldo inicial',
                amount: calculatedUndestined,
                activeMonths: [currentMonthNum]
            };
            autoDrawer.movements.push(autoProvision);
        } else {
            autoProvision.amount = calculatedUndestined;
        }

        // 3. Second Pass: Start loop for rendering and local sums
        nominaData.forEach((concept) => {
            const isIncomeType = concept.type === 'income';
            const monthlyMovements = (concept.movements || []).filter(m => (m.activeMonths || []).includes(currentMonthNum));
            const monthlyBalance = monthlyMovements.reduce((sum, m) => sum + m.amount, 0);

            const provisionMvmt = monthlyMovements.find(m => isProvision(m));
            const provision = provisionMvmt ? provisionMvmt.amount : 0;

            // REDUNDANT LOGIC REMOVED: Separate and sum movements by sign for global totals
            // (Calculated already in the first pass)

            if (!isIncomeType && !concept.isAutomatic) {
                totalCurrentExpenseBalanceManual += monthlyBalance;

                // Ahorro Neto logic: Provision counts as pure saving ONLY if there are NO expenses EVER in this drawer
                const hasEverHadNegativeMovements = (concept.movements || []).some(m => !isProvision(m) && m.amount < 0);
                if (provision > 0 && !hasEverHadNegativeMovements) {
                    totalAhorroNetoManual += provision;
                }
            }

            const isIncome = isIncomeType ||
                concept.name?.toLowerCase() === 'nómina' ||
                concept.name?.toLowerCase() === 'nomina';

            // Savings check for styling: Provision > 0 and no expenses EVER
            const hasEverHadExpenses = (concept.movements || []).some(m => !isProvision(m) && m.amount < 0);
            const isSavings = concept.type === 'expense' && provision > 0 && !hasEverHadExpenses;

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

                balanceDisplay = `
                    <div style="margin-top: 1rem; padding: 0.8rem; background: rgba(255,255,255,0.03); border-radius: 12px; font-size: 0.85rem; border: 1px solid rgba(255,255,255,0.05);">
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Provisión:</span>
                            <span style="font-weight:600;">${fmtEUR(provision)}</span>
                        </div>
                        ${monthlyOtherIncomesSum > 0 ? `
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Otros Ingresos:</span>
                            <span style="font-weight:600; color:var(--success);">+${fmtEUR(monthlyOtherIncomesSum)}</span>
                        </div>` : ''}
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;">
                            <span style="opacity:0.6;">Gastos Mes:</span>
                            <span style="font-weight:600; color:var(--danger);">${fmtEUR(monthlyExpensesSum)}</span>
                        </div>
                        <div style="display:flex; justify-content:space-between; border-top: 1px solid rgba(255,255,255,0.08); padding-top:0.4rem; margin-top:0.2rem;">
                            <span style="opacity:0.6;">Sobrante:</span>
                            <span style="font-weight:700; color:${monthlyBalance >= 0 ? 'var(--success)' : 'var(--danger)'}; font-size: 1rem;">${fmtEUR(monthlyBalance)}</span>
                        </div>
                    </div>
                `;
            } else {
                balanceDisplay = `
                    <div class="drawer-balance" style="color: ${monthlyBalance >= 0 ? 'var(--success)' : 'var(--danger)'}; margin-top: 1rem; font-size: 1.25rem; font-weight: 700;">
                        ${fmtEUR(monthlyBalance)}
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
            grid.appendChild(card);
        });

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
                if (!totalsByDrawer[m.drawerName]) {
                    // Find provision for this drawer in this fiscal month
                    const concept = nominaData.find(c => c.name === m.drawerName);
                    const provisionMvmt = (concept?.movements || [])
                        .filter(cm => {
                            const months = cm.activeMonths || [];
                            return months.some(mo => parseInt(mo) === currentMonthNum);
                        })
                        .find(cm => isProvision(cm));
                    const provision = provisionMvmt ? provisionMvmt.amount : 0;

                    totalsByDrawer[m.drawerName] = {
                        spent: 0,
                        provision: provision,
                        icon: m.icon
                    };
                }
                totalsByDrawer[m.drawerName].spent += m.amount;
            });

            summaryCard.innerHTML = `
                <div class="drawer-header">
                    <div style="display:flex; align-items:center; gap: 10px;">
                        <span class="drawer-icon">📉</span>
                        <div class="drawer-info">
                            <h4 style="margin:0">Resumen de Gastos: ${formatFiscalMonth(fiscalMonthStr)}</h4>
                            <p style="font-size: 0.8rem; opacity: 0.7;">${allMonthlyExpenses.length} gastos en ${Object.keys(totalsByDrawer).length} cajones</p>
                        </div>
                    </div>
                    <div style="text-align: right;">
                        <div style="font-size: 0.8rem; opacity: 0.6;">Total Pagado</div>
                        <div style="font-size: 1.1rem; font-weight: 700; color: var(--danger);">${fmtEUR(totalPaidExpensesManual)} <span style="font-size: 0.8rem; opacity: 0.6; font-weight: 400; color: var(--text-color);">de planeado: ${fmtEUR(totalPlannedExpensesManual)}</span></div>
                    </div>
                </div>

                <div style="margin-top: 1.5rem; display: grid; grid-template-columns: repeat(auto-fit, minmax(210px, 1fr)); gap: 10px;">
                    ${Object.entries(totalsByDrawer).map(([name, data]) => `
                        <div style="background: rgba(255,255,255,0.03); padding: 10px; border-radius: 10px; border: 1px solid rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: space-between; gap: 8px;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-shrink: 0;">
                                <span>${data.icon}</span>
                                <span style="font-size: 0.85rem; opacity: 0.8;">${name}</span>
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
                        if (!acc[exp.drawerName]) acc[exp.drawerName] = { icon: exp.icon, items: [] };
                        acc[exp.drawerName].items.push(exp);
                        return acc;
                    }, {});

                    return Object.entries(grouped).map(([name, group]) => {
                        const boxTotal = group.items.reduce((sum, m) => sum + Math.abs(m.amount), 0);
                        const boxPending = group.items.filter(m => !m.paid).reduce((sum, m) => sum + Math.abs(m.amount), 0);
                        const allPaid = group.items.every(m => m.paid);

                        return `
                                <div style="background: rgba(255,255,255,0.02); border-radius: 12px; border: 1px solid rgba(255,255,255,0.05); overflow: hidden; display: flex; flex-direction: column; height: fit-content;">
                                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 0.5rem 0.6rem; background: rgba(255,255,255,0.03); border-bottom: 1px solid rgba(255,255,255,0.03);">
                                        <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
                                            <input type="checkbox" class="nomina-checkbox master-paid-checkbox" data-drawer="${name}" ${allPaid ? 'checked' : ''} title="Marcar/Desmarcar todos">
                                            <span style="font-size: 1rem; width: 20px; text-align: center;">${group.icon}</span>
                                            <span style="font-size: 0.8rem; font-weight: 700; color: var(--primary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${name}</span>
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
                                                           data-drawer-name="${m.drawerName}" 
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
            `;
            grid.insertBefore(summaryCard, grid.firstChild);
        }

        const totalSpent = allMonthlyExpenses.reduce((sum, m) => sum + m.amount, 0);

        if (elements.totalNominaIncome) {
            const externalNetIncome = totalPrimaryIncome + totalExternalExtraIncome;
            elements.totalNominaIncome.textContent = fmtEUR(externalNetIncome);
            if (elements.incomeCard) {
                if (externalNetIncome > 0) {
                    elements.incomeCard.style.background = 'rgba(16, 185, 129, 0.25)';
                    elements.incomeCard.style.backgroundColor = '#064e3b';
                    elements.incomeCard.style.backgroundImage = 'linear-gradient(135deg, rgba(16, 185, 129, 0.4) 0%, rgba(15, 23, 42, 0.8) 100%)';
                    elements.incomeCard.style.border = '2px solid #10b981';
                } else {
                    elements.incomeCard.style.background = '';
                    elements.incomeCard.style.backgroundColor = '';
                    elements.incomeCard.style.backgroundImage = '';
                    elements.incomeCard.style.border = '';
                }
            }
        }
        if (elements.totalNominaExpense) {
            // "Total Gastos" now shows: Paid / Total Planned (for currently active months)
            // The "de presupuesto" part is moved to the summary card to avoid confusion.
            elements.totalNominaExpense.textContent = `${fmtEUR(totalPaidExpensesManual)} de: ${fmtEUR(totalPlannedExpensesManual)}`;
            elements.totalNominaExpense.style.fontSize = "1.1rem";
            elements.totalNominaExpense.style.color = "var(--danger)";
        }


        if (elements.totalNominaUndestined) {
            // "Dinero No Destinado" is what remains of the total external income after budget assignment.
            // We use the same formula as the one used to update the autoDrawer movement for consistency.
            const externalAvailable = totalPrimaryIncome + totalExternalExtraIncome;
            const undestined = externalAvailable - totalBudgetedProvisions;

            elements.totalNominaUndestined.textContent = fmtEUR(undestined);
            elements.totalNominaUndestined.style.color = undestined >= 0 ? 'var(--success)' : 'var(--danger)';
        }

        if (elements.totalNominaSaving) {
            elements.totalNominaSaving.textContent = fmtEUR(totalCurrentExpenseBalanceManual);
            elements.totalNominaSaving.style.color = totalCurrentExpenseBalanceManual >= 0 ? 'var(--success)' : 'var(--danger)';
        }

        if (elements.totalNominaNetSaving) {
            elements.totalNominaNetSaving.textContent = fmtEUR(totalAhorroNetoManual);
            // If totalAhorroNeto is > 0, we'll keep it success green but the card will be yellow
            elements.totalNominaNetSaving.style.color = 'var(--success)';
            elements.totalNominaNetSaving.style.fontWeight = '700';

            if (elements.netSavingCard) {
                if (totalAhorroNetoManual > 0) {
                    elements.netSavingCard.style.background = 'rgba(245, 158, 11, 0.15)';
                    elements.netSavingCard.style.backgroundColor = '#451a03';
                    elements.netSavingCard.style.backgroundImage = 'linear-gradient(135deg, rgba(245, 158, 11, 0.25) 0%, rgba(15, 23, 42, 0.8) 100%)';
                    elements.netSavingCard.style.border = '2px solid #f59e0b';
                } else {
                    elements.netSavingCard.style.background = '';
                    elements.netSavingCard.style.backgroundColor = '';
                    elements.netSavingCard.style.backgroundImage = '';
                    elements.netSavingCard.style.border = '';
                }
            }
        }

        // Payday Countdown Logic
        const now = new Date();
        const todayStr = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
        if (elements.paydayDate) elements.paydayDate.textContent = todayStr;

        let payday = new Date(now.getFullYear(), now.getMonth(), 25);
        if (now.getDate() >= 25) {
            payday = new Date(now.getFullYear(), now.getMonth() + 1, 25);
        }
        const diffTime = payday - now;
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (elements.paydayCountdown) {
            elements.paydayCountdown.textContent = `${diffDays} días`;
            elements.paydayCountdown.style.color = diffDays <= 3 ? 'var(--danger)' : (diffDays <= 10 ? 'var(--primary)' : 'inherit');
        }

        // Event delegation or direct listeners
        grid.onclick = (e) => {
            const btn = e.target.closest('button');
            const checkbox = e.target.closest('input[type="checkbox"]');

            if (checkbox) {
                if (checkbox.classList.contains('line-paid-checkbox')) {
                    const drawerName = checkbox.dataset.drawerName;
                    const movementId = checkbox.dataset.id;
                    const drawer = nominaData.find(d => d.name === drawerName);
                    if (drawer) {
                        const movement = drawer.movements.find(m => m.id == movementId);
                        if (movement) {
                            movement.paid = checkbox.checked;
                            if (window.saveNomina) window.saveNomina(nominaData);
                            renderNomina();
                        }
                    }
                } else if (checkbox.classList.contains('master-paid-checkbox')) {
                    const drawerName = checkbox.dataset.drawer;
                    const drawer = nominaData.find(d => d.name === drawerName);
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
                        <div style="font-weight:600;">${m.description}</div>
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

        if (amountInput) amountInput.value = movement.amount;
        if (conceptInput) conceptInput.value = movement.description;

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

    // --- Event Listeners ---

    function setupEventListeners() {
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
                    drawer.balance += amount;
                    drawer.movements.push({
                        date: new Date().toISOString().split('T')[0],
                        amount: amount,
                        description: concept
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
                    movement.amount = amount;
                    movement.description = concept;
                    drawer.balance += (amount - oldAmount);
                }
            }

            if (window.saveSavings) window.saveSavings(savingsDrawers);
            toggleSavingsModal(false);
            render();
        });
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

        if (elements.addStockModal) {
            window.addEventListener('click', (e) => {
                if (e.target === elements.addStockModal) toggleModal(false);
                if (e.target === elements.financialDetailsModal) elements.financialDetailsModal.classList.add('hidden');
                if (e.target === elements.nominaModal) toggleNominaModal(false);
                if (e.target === elements.nominaMovementModal) toggleNominaMovementModal(false);
                if (e.target === elements.nominaHistoryModal) elements.nominaHistoryModal.classList.add('hidden');
            });
        }

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

        elements.filterTabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                elements.filterTabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                currentFilter = e.target.dataset.filter;
                render();
            });
        });

        // Table sorting listeners
        document.querySelectorAll('th[data-sort]').forEach(th => {
            th.addEventListener('click', () => {
                const key = th.dataset.sort;
                const direction = sortConfig.key === key && sortConfig.direction === 'asc' ? 'desc' : 'asc';

                sortConfig = { key, direction };

                // Update UI: classes and icons
                document.querySelectorAll('th').forEach(header => {
                    header.classList.remove('active-sort');
                    const icon = header.querySelector('.sort-icon');
                    if (icon) icon.textContent = '';
                });

                th.classList.add('active-sort');
                const icon = th.querySelector('.sort-icon');
                if (icon) icon.textContent = direction === 'asc' ? '▲' : '▼';

                render();
            });
        });

        // --- Data Portability (Export/Import) ---

        elements.exportDataBtn?.addEventListener('click', () => {
            exportToCSV(false); // standard CSV
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
        const headers = ['Type', 'DrawerID', 'Name/Description', 'Icon/Date', 'Balance/Amount'];
        const csvRows = [headers.join(',')];
        savingsDrawers.forEach(drawer => {
            csvRows.push(['DRAWER', drawer.id, drawer.name, drawer.icon, drawer.balance].join(','));
            drawer.movements.forEach(m => {
                csvRows.push(['MOVEMENT', drawer.id, m.description, m.date, m.amount].join(','));
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
                const [type, id, nameDesc, iconDate, amountVal] = parts;
                const value = parseFloat(amountVal);
                if (type === 'DRAWER') {
                    const drawer = { id: id, name: nameDesc, icon: iconDate, balance: value, movements: [], isAuto: (id === 'bolsa') };
                    newDrawers.push(drawer);
                    drawersMap[id] = drawer;
                } else if (type === 'MOVEMENT') {
                    if (drawersMap[id]) {
                        drawersMap[id].movements.push({ description: nameDesc, date: iconDate, amount: value });
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
        if (elements.nominaModalTitle) elements.nominaModalTitle.textContent = 'Nuevo Cajón de Nomina';
        if (elements.nominaEditId) elements.nominaEditId.value = '';
        if (elements.nominaNameInput) elements.nominaNameInput.value = '';
        if (elements.nominaAmountInput) elements.nominaAmountInput.value = '';
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
            const isIncomeDrawer = drawer.type === 'income';

            if (isNomina) {
                updateNominaMovementType('income');
                if (elements.nominaMovementIncomeToggle) elements.nominaMovementIncomeToggle.style.display = 'none';
                if (elements.nominaMovementExpenseToggle) elements.nominaMovementExpenseToggle.style.display = 'none';
            } else {
                if (elements.nominaMovementIncomeToggle) elements.nominaMovementIncomeToggle.style.display = 'block';
                if (elements.nominaMovementExpenseToggle) elements.nominaMovementExpenseToggle.style.display = 'block';
                // Default to Income for income drawers, Expense for expense drawers
                updateNominaMovementType(isIncomeDrawer ? 'income' : 'expense');
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
        if (isNomina) {
            updateNominaMovementType('income');
            if (elements.nominaMovementIncomeToggle) elements.nominaMovementIncomeToggle.style.display = 'none';
            if (elements.nominaMovementExpenseToggle) elements.nominaMovementExpenseToggle.style.display = 'none';
        } else {
            if (elements.nominaMovementIncomeToggle) elements.nominaMovementIncomeToggle.style.display = 'block';
            if (elements.nominaMovementExpenseToggle) elements.nominaMovementExpenseToggle.style.display = 'block';
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
            const icon = drawer.type === 'income' ? '📈' : '📉';
            const initialMvmt = (drawer.movements || []).find(m => isProvision(m));
            const drawerMonths = (initialMvmt?.activeMonths || []).join('|');
            csvRows.push(['DRAWER', drawer.id, drawer.name, icon, drawer.balance, drawerMonths, ''].join(','));
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
                    const drawer = { id: id, name: nameDesc, type: iconDate === '📈' ? 'income' : 'expense', balance: value, movements: [] };
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
                nominaData = newData;
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
                    nominaData = data.nomina;
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
        render();
        setupEventListeners();
        let timeToUpdate = 0;
        const runUpdateCycle = async () => {
            const currentTimerElement = document.getElementById('updateTimer');
            if (timeToUpdate > 0) {
                if (currentTimerElement) currentTimerElement.textContent = `Sincronizando en ${timeToUpdate}s...`;
                timeToUpdate--;
                setTimeout(runUpdateCycle, 1000);
            } else {
                if (currentTimerElement) {
                    currentTimerElement.textContent = `Actualizando datos...`;
                    currentTimerElement.style.color = '#f59e0b';
                }
                if (window.FINNHUB_API_KEY) {
                    const uniqueTickers = [...new Set(stocks.map(s => s.ticker))];
                    await window.refreshLivePrices(uniqueTickers);
                }
                lastSyncTime = new Date().toLocaleTimeString();
                isFirstUpdateDone = true;
                render();
                if (currentTimerElement) currentTimerElement.style.color = 'var(--primary)';
                document.querySelectorAll('.summary-card').forEach(card => {
                    card.classList.remove('sync-flash');
                    void card.offsetWidth;
                    card.classList.add('sync-flash');
                });
                timeToUpdate = 30;
                setTimeout(runUpdateCycle, 1000);
            }
        };
        runUpdateCycle();
    }

    showApp();
});
