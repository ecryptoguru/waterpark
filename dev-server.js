const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');

const PORT = 3000;
const PUBLIC_DIR = __dirname;
const FUNCTIONS_DIR = path.join(__dirname, 'netlify/functions');

// 1. Load .env manually since dotenv is not in dependencies
function loadEnv() {
    const envPath = path.join(__dirname, '.env');
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        envContent.split('\n').forEach(line => {
            const [key, ...rest] = line.split('=');
            if (key && rest.length > 0) {
                const val = rest.join('=').trim().replace(/^"(.*)"$/, '$1');
                process.env[key.trim()] = val;
            }
        });
        console.log('✅ Loaded .env variables');
    } else {
        console.warn('⚠️  No .env file found');
    }
}

loadEnv();

const MIME_TYPES = {
    '.html': 'text/html',
    '.css': 'text/css',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.ico': 'image/x-icon'
};

const server = http.createServer(async (req, res) => {
    const parsedUrl = url.parse(req.url, true);
    const pathname = decodeURIComponent(parsedUrl.pathname);

    // 2. Handle Netlify Functions
    if (pathname.startsWith('/.netlify/functions/')) {
        const functionName = pathname.split('/').pop().split('?')[0];
        const functionPath = path.join(FUNCTIONS_DIR, `${functionName}.js`);

        console.log(`📡 Function called: ${functionName}`);

        if (!fs.existsSync(functionPath)) {
            res.statusCode = 404;
            return res.end(JSON.stringify({ error: `Function ${functionName} not found` }));
        }

        try {
            // Read body if POST
            let body = '';
            if (req.method === 'POST') {
                body = await new Promise((resolve) => {
                    let chunk = '';
                    req.on('data', data => chunk += data);
                    req.on('end', () => resolve(chunk));
                });
            }

            // Mock Netlify event object
            const event = {
                path: pathname,
                httpMethod: req.method,
                headers: req.headers,
                queryStringParameters: parsedUrl.query,
                body: body,
                isBase64Encoded: false
            };

            // Clear cache and load function handler
            delete require.cache[require.resolve(functionPath)];
            const { handler } = require(functionPath);

            // Execute handler
            const result = await handler(event, {});

            // Return response
            res.statusCode = result.statusCode || 200;
            if (result.headers) {
                for (const [key, value] of Object.entries(result.headers)) {
                    res.setHeader(key, value);
                }
            }
            res.setHeader('Content-Type', 'application/json');
            return res.end(result.body);

        } catch (err) {
            console.error(`💥 Function error: ${err.message}`);
            res.statusCode = 500;
            return res.end(JSON.stringify({ error: err.message }));
        }
    }

    // 3. Handle Static Files
    let filePath = path.join(PUBLIC_DIR, pathname === '/' ? 'index.html' : pathname);
    let extname = path.extname(filePath);
    let contentType = MIME_TYPES[extname] || 'application/octet-stream';

    fs.readFile(filePath, (error, content) => {
        if (error) {
            if (error.code === 'ENOENT') {
                res.statusCode = 404;
                res.end('<h1>404 Not Found</h1>');
            } else {
                res.statusCode = 500;
                res.end(`Server Error: ${error.code}`);
            }
        } else {
            res.writeHead(200, { 'Content-Type': contentType });
            res.end(content, 'utf-8');
        }
    });
});

server.listen(PORT, () => {
    console.log(`🚀 Blue Splash Dev Server Bridge running at: http://bluesplash.in:${PORT}`);
    console.log(`🛠️ Mapping /shared/ to Root Shared folder`);
    console.log(`🛠️ Mapping /.netlify/functions/ to netlify/functions/`);
});
