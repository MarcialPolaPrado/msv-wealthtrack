// ── Nextcloud WebDAV Sync Module ──────────────────────────────────
// Handles reading/writing JSON data to Nextcloud via WebDAV
// Supports optional CORS proxy for hosted Nextcloud instances

const NextcloudSync = (() => {
    const STORAGE_KEY = 'nc_config';
    const DEVICE_KEY = 'nc_device_id';
    const LOCAL_MODIFIED_KEY = 'nc_local_modified';
    const NC_FOLDER = 'MSV';
    const NC_FILE = 'msv-data.json';
    
    // ── Device Identification ──────────────────────────────
    function getDeviceId() {
        let id = localStorage.getItem(DEVICE_KEY);
        if (!id) {
            id = 'dev_' + Date.now().toString(36) + '_' + Math.random().toString(36).substr(2, 6);
            localStorage.setItem(DEVICE_KEY, id);
        }
        return id;
    }

    function getDeviceName() {
        const ua = navigator.userAgent;
        let browser = 'Navegador';
        if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
        else if (ua.includes('Firefox')) browser = 'Firefox';
        else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
        else if (ua.includes('Edg')) browser = 'Edge';

        let os = 'Desconocido';
        if (ua.includes('Windows')) os = 'Windows';
        else if (ua.includes('Mac')) os = 'Mac';
        else if (ua.includes('Linux')) os = 'Linux';
        else if (ua.includes('Android')) os = 'Android';
        else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

        return `${browser} · ${os}`;
    }

    // ── Config Management ──────────────────────────────────
    function saveConfig(url, user, password, proxy) {
        url = url.replace(/\/+$/, '');
        proxy = proxy ? proxy.replace(/\/+$/, '') : '';
        const config = { url, user, password, proxy };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        return config;
    }

    function loadConfig() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function clearConfig() {
        localStorage.removeItem(STORAGE_KEY);
    }

    // ── Local modification tracking ────────────────────────
    function getLocalModified() {
        return localStorage.getItem(LOCAL_MODIFIED_KEY) || null;
    }

    function setLocalModified(isoDate) {
        localStorage.setItem(LOCAL_MODIFIED_KEY, isoDate || new Date().toISOString());
    }

    // ── WebDAV Helpers ─────────────────────────────────────
    function buildWebDavUrl(config, path) {
        return `${config.url}/remote.php/dav/files/${encodeURIComponent(config.user)}/${path}`;
    }

    function authHeaders(config) {
        return {
            'Authorization': 'Basic ' + btoa(config.user + ':' + config.password)
        };
    }

    async function proxiedFetch(config, targetUrl, options = {}) {
        if (config.proxy) {
            const proxyUrl = config.proxy;
            const headers = new Headers(options.headers || {});
            headers.set('X-Target-URL', targetUrl);
            return fetch(proxyUrl, { ...options, headers });
        } else {
            return fetch(targetUrl, options);
        }
    }

    // ── Test Connection ────────────────────────────────────
    async function testConnection(config) {
        const url = buildWebDavUrl(config, '');
        try {
            const resp = await proxiedFetch(config, url, {
                method: 'PROPFIND',
                headers: {
                    ...authHeaders(config),
                    'Depth': '0',
                    'Content-Type': 'application/xml'
                }
            });
            if (resp.status === 207) return { ok: true };
            if (resp.status === 401) return { ok: false, error: 'Credenciales incorrectas' };
            return { ok: false, error: `Error del servidor: ${resp.status}` };
        } catch (err) {
            if (err.message?.includes('Failed to fetch') || err.name === 'TypeError') {
                return { ok: false, error: config.proxy 
                    ? 'No se pudo conectar al proxy. Verifica la URL del Worker.'
                    : 'CORS bloqueado. Necesitas configurar un Proxy CORS (Cloudflare Worker).' 
                };
            }
            return { ok: false, error: err.message };
        }
    }

    // ── Ensure folder exists ───────────────────────────────
    async function ensureFolder(config) {
        const url = buildWebDavUrl(config, NC_FOLDER);
        try {
            await proxiedFetch(config, url, {
                method: 'MKCOL',
                headers: authHeaders(config)
            });
        } catch { /* 201=created, 405=exists — both fine */ }
    }

    // ── Upload Data ────────────────────────────────────────
    async function uploadData(config, appData) {
        await ensureFolder(config);

        const now = new Date().toISOString();
        const payload = {
            version: 1,
            lastModified: now,
            deviceId: getDeviceId(),
            deviceName: getDeviceName(),
            data: appData
        };

        const url = buildWebDavUrl(config, `${NC_FOLDER}/${NC_FILE}`);
        const resp = await proxiedFetch(config, url, {
            method: 'PUT',
            headers: {
                ...authHeaders(config),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload, null, 2)
        });

        if (resp.ok || resp.status === 201 || resp.status === 204) {
            // Get the actual server modified time after upload to avoid skew
            const meta = await getFileMetadata(config);
            const finalTimestamp = meta ? meta.lastModified : now;
            setLocalModified(finalTimestamp);
            return { ok: true, timestamp: finalTimestamp };
        }
        return { ok: false, error: `Error al subir: ${resp.status}` };
    }

    // ── Download Data ──────────────────────────────────────
    async function getFileMetadata(config) {
        const url = buildWebDavUrl(config, `${NC_FOLDER}/${NC_FILE}`);
        const resp = await proxiedFetch(config, url, {
            method: 'PROPFIND',
            headers: {
                ...authHeaders(config),
                'Depth': '0'
            }
        });

        if (!resp.ok) return null;

        const xml = await resp.text();
        const lastModifiedMatch = xml.match(/<d:getlastmodified>(.*?)<\/d:getlastmodified>/i) || xml.match(/<getlastmodified>(.*?)<\/getlastmodified>/i);
        
        if (lastModifiedMatch && lastModifiedMatch[1]) {
            return {
                lastModified: new Date(lastModifiedMatch[1]).toISOString()
            };
        }
        return null;
    }

    // ── Download Data ──────────────────────────────────────
    async function downloadData(config) {
        const url = buildWebDavUrl(config, `${NC_FOLDER}/${NC_FILE}`);
        console.log('[NC Sync] Downloading data from:', url);
        const resp = await proxiedFetch(config, url, {
            method: 'GET',
            headers: authHeaders(config)
        });

        if (resp.status === 404) {
            return { ok: false, notFound: true, error: 'No hay datos en Nextcloud aún.' };
        }

        if (!resp.ok) {
            return { ok: false, error: `Error al descargar: ${resp.status}` };
        }

        try {
            const payload = await resp.json();
            // Use payload lastModified or fallback to HTTP header
            let lm = payload.lastModified;
            if (!lm) {
                const headerLm = resp.headers.get('Last-Modified');
                if (headerLm) lm = new Date(headerLm).toISOString();
            }

            return {
                ok: true,
                data: payload.data,
                lastModified: lm,
                deviceId: payload.deviceId,
                deviceName: payload.deviceName
            };
        } catch (e) {
            return { ok: false, error: 'El archivo no tiene formato JSON válido.' };
        }
    }

    // ── Public API ─────────────────────────────────────────
    return {
        getDeviceId,
        getDeviceName,
        saveConfig,
        loadConfig,
        clearConfig,
        getLocalModified,
        setLocalModified,
        testConnection,
        uploadData,
        downloadData,
        getFileMetadata
    };
})();
