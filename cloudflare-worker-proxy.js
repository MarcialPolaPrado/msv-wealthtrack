// ── MSV Nextcloud CORS Proxy ──────────────────────────────────
// Despliega este script como Cloudflare Worker.
// Reenvía peticiones WebDAV a Nextcloud añadiendo cabeceras CORS.
// No almacena ningún dato ni credencial.

export default {
    async fetch(request) {
        // Handle CORS preflight
        if (request.method === 'OPTIONS') {
            return new Response(null, {
                status: 204,
                headers: corsHeaders()
            });
        }

        // Get target URL from header
        const targetUrl = request.headers.get('X-Target-URL');
        if (!targetUrl) {
            return new Response(JSON.stringify({ error: 'Missing X-Target-URL header' }), {
                status: 400,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
            });
        }

        // Forward the request to Nextcloud
        const forwardHeaders = new Headers();
        for (const [key, value] of request.headers) {
            if (key.toLowerCase() !== 'x-target-url' && key.toLowerCase() !== 'host') {
                forwardHeaders.set(key, value);
            }
        }

        try {
            const response = await fetch(targetUrl, {
                method: request.method,
                headers: forwardHeaders,
                body: ['GET', 'HEAD'].includes(request.method) ? null : await request.text()
            });

            const responseHeaders = new Headers(response.headers);
            // Add CORS headers to the response
            for (const [key, value] of Object.entries(corsHeaders())) {
                responseHeaders.set(key, value);
            }

            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders
            });
        } catch (err) {
            return new Response(JSON.stringify({ error: err.message }), {
                status: 502,
                headers: { ...corsHeaders(), 'Content-Type': 'application/json' }
            });
        }
    }
};

function corsHeaders() {
    return {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, PUT, DELETE, PROPFIND, MKCOL, OPTIONS',
        'Access-Control-Allow-Headers': 'Authorization, Content-Type, Depth, X-Target-URL',
        'Access-Control-Max-Age': '86400'
    };
}
