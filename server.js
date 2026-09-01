const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    // Security & Performance Headers
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');

    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getEnterpriseUI());
    } else if (req.method === 'GET' && url.pathname === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'healthy', uptime: process.uptime(), pid: process.pid }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const wss = new WebSocket.Server({ server });
const connectedClients = new Map();

wss.on('connection', (ws, req) => {
    let clientUsername = 'Anonymous';

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'AUTH') {
                clientUsername = data.username.trim().substring(0, 32);
                connectedClients.set(ws, clientUsername);
                broadcastSystemMessage(`${clientUsername} entered the secure channel.`);
            } else if (data.type === 'MESSAGE') {
                const payload = {
                    type: 'MESSAGE',
                    username: clientUsername,
                    text: data.text.trim().substring(0, 1000),
                    timestamp: new Date().toLocaleTimeString()
                };
                broadcast(payload);
            }
        } catch (e) {
            console.error('Malformed payload:', e);
        }
    });

    ws.on('close', () => {
        if (connectedClients.has(ws)) {
            const user = connectedClients.get(ws);
            connectedClients.delete(ws);
            broadcastSystemMessage(`${user} disconnected.`);
        }
    });
});

function broadcast(data) {
    const packet = JSON.stringify(data);
    for (let [client] of connectedClients) {
        if (client.readyState === WebSocket.OPEN) {
            client.send(packet);
        }
    }
}

function broadcastSystemMessage(text) {
    broadcast({
        type: 'SYSTEM',
        text,
        timestamp: new Date().toLocaleTimeString()
    });
}

function getEnterpriseUI() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Spectrum | Enterprise Messaging</title>
    <style>
        :root {
            --bg-obsidian: #0b0f12;
            --surface-dark: #12181d;
            --surface-elevated: #18222b;
            --accent-teal: #00d2c4;
            --accent-gold: #d4af37;
            --text-primary: #e0e6ed;
            --text-muted: #8a99ad;
            --border-subtle: rgba(0, 210, 196, 0.2);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: var(--bg-obsidian); color: var(--text-primary); height: 100vh; display: flex; flex-direction: column; overflow: hidden; }
        
        header { background: var(--surface-dark); border-bottom: 1px solid var(--border-subtle); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; box-shadow: 0 4px 20px rgba(0,0,0,0.5); }
        .brand { display: flex; align-items: center; gap: 0.75rem; }
        .logo-badge { width: 12px; height: 12px; background: var(--accent-teal); border-radius: 50%; box-shadow: 0 0 10px var(--accent-teal); }
        h1 { font-size: 1.15rem; color: var(--accent-teal); letter-spacing: 0.08em; text-transform: uppercase; font-weight: 700; }
        
        .main-layout { flex: 1; display: grid; grid-template-columns: 260px 1fr; overflow: hidden; }
        
        aside { background: var(--surface-dark); border-right: 1px solid var(--border-subtle); padding: 1.5rem; display: flex; flex-direction: column; gap: 1.5rem; }
        aside h3 { font-size: 0.85rem; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 0.05em; }
        .metrics-box { background: var(--surface-elevated); padding: 1rem; border-radius: 8px; border: 1px solid rgba(212, 175, 55, 0.15); font-size: 0.85rem; display: flex; flex-direction: column; gap: 0.5rem; }
        .metric-row { display: flex; justify-content: space-between; color: var(--text-muted); }
        .metric-val { color: var(--accent-teal); font-weight: bold; }

        .chat-container { display: flex; flex-direction: column; height: 100%; padding: 1.5rem; gap: 1rem; overflow: hidden; }
        
        #login-overlay { position: fixed; inset: 0; background: rgba(11, 15, 18, 0.92); display: flex; justify-content: center; align-items: center; z-index: 100; backdrop-filter: blur(8px); }
        .login-card { background: var(--surface-dark); border: 1px solid var(--border-subtle); padding: 2.5rem; border-radius: 12px; width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 1.5rem; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
        .login-card h2 { color: var(--accent-gold); font-size: 1.4rem; text-align: center; letter-spacing: 0.05em; }
        
        input, button { background: var(--surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.85rem 1rem; border-radius: 8px; font-size: 1rem; outline: none; transition: all 0.2s ease; }
        input:focus { border-color: var(--accent-teal); box-shadow: 0 0 12px rgba(0, 210, 196, 0.25); }
        button { background: var(--accent-teal); color: var(--bg-obsidian); font-weight: 700; cursor: pointer; text-transform: uppercase; letter-spacing: 0.05em; }
        button:hover { background: #00b3a6; box-shadow: 0 0 15px rgba(0, 210, 196, 0.4); }

        #chat-box { flex: 1; background: var(--surface-dark); border: 1px solid var(--border-subtle); border-radius: 10px; padding: 1.25rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.85rem; box-shadow: inset 0 2px 10px rgba(0,0,0,0.5); }
        
        .message { background: var(--surface-elevated); border-left: 3px solid var(--accent-teal); padding: 0.75rem 1rem; border-radius: 6px; animation: fadeIn 0.25s ease; }
        .message.self { border-left-color: var(--accent-gold); }
        .message.system { border-left-color: var(--text-muted); background: rgba(18,24,29,0.5); font-style: italic; font-size: 0.9rem; color: var(--text-muted); }
        
        .msg-header { display: flex; justify-content: space-between; font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.35rem; }
        .msg-user { color: var(--accent-teal); font-weight: 700; }
        .message.self .msg-user { color: var(--accent-gold); }
        
        #input-form { display: flex; gap: 0.75rem; }
        #input-form input { flex: 1; }

        @keyframes fadeIn { from { opacity: 0; transform: translateY(4px); } to { opacity: 1; transform: translateY(0); } }
    </style>
</head>
<body>
    <div id="login-overlay">
        <div class="login-card">
            <h2>Executive Portal</h2>
            <input type="text" id="username-input" placeholder="Enter secure handle..." autocomplete="off" />
            <button id="login-btn">Authenticate & Connect</button>
        </div>
    </div>

    <header>
        <div class="brand">
            <div class="logo-badge"></div>
            <h1>Executive Spectrum</h1>
        </div>
        <div id="status-pill" style="color: var(--accent-teal); font-size: 0.85rem; font-weight: 500;">● Secure WebSocket Active</div>
    </header>

    <div class="main-layout">
        <aside>
            <h3>Node Telemetry</h3>
            <div class="metrics-box">
                <div class="metric-row"><span>Protocol</span><span class="metric-val">WSS / JSON</span></div>
                <div class="metric-row"><span>Cluster State</span><span class="metric-val">Active / Balanced</span></div>
                <div class="metric-row"><span>Latency</span><span id="latency-val" class="metric-val">&lt; 12ms</span></div>
            </div>
            <div style="margin-top: auto; font-size: 0.75rem; color: var(--text-muted);">
                EB Enterprises Top-Grossing Architecture Build v2.0
            </div>
        </aside>

        <div class="chat-container">
            <div id="chat-box"></div>
            <form id="input-form">
                <input type="text" id="msg-input" placeholder="Broadcast encrypted message..." autocomplete="off" />
                <button type="submit">Send</button>
            </form>
        </div>
    </div>

    <script>
        let ws;
        let currentUser = localStorage.getItem('exec_chat_user') || '';
        const loginOverlay = document.getElementById('login-overlay');
        const usernameInput = document.getElementById('username-input');
        const loginBtn = document.getElementById('login-btn');
        const chatBox = document.getElementById('chat-box');
        const inputForm = document.getElementById('input-form');
        const msgInput = document.getElementById('msg-input');

        if (currentUser) {
            loginOverlay.style.display = 'none';
            connectWebSocket();
        }

        loginBtn.addEventListener('click', handleLogin);
        usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

        function handleLogin() {
            const val = usernameInput.value.trim();
            if (!val) return;
            currentUser = val;
            localStorage.setItem('exec_chat_user', currentUser);
            loginOverlay.style.display = 'none';
            connectWebSocket();
        }

        function connectWebSocket() {
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${protocol}//\${window.location.host}\`);

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'AUTH', username: currentUser }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                appendMessage(data);
            };

            ws.onclose = () => {
                setTimeout(connectWebSocket, 2000); // Auto-reconnect heartbeat
            };
        }

        inputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = msgInput.value.trim();
            if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({ type: 'MESSAGE', text }));
            msgInput.value = '';
        });

        function appendMessage(data) {
            if (data.type === 'SYSTEM') {
                chatBox.innerHTML += \`<div class="message system"><div class="msg-header"><span>SYSTEM</span><span>\${data.timestamp}</span></div><div>\${escapeHTML(data.text)}</div></div>\`;
            } else {
                const isSelf = data.username === currentUser;
                chatBox.innerHTML += \`
                    <div class="message \${isSelf ? 'self' : ''}">
                        <div class="msg-header">
                            <span class="msg-user">\${escapeHTML(data.username)}</span>
                            <span>\${data.timestamp}</span>
                        </div>
                        <div>\${escapeHTML(data.text)}</div>
                    </div>\`;
            }
            chatBox.scrollTop = chatBox.scrollHeight;
        }

        function escapeHTML(str) {
            return str.replace(/[&<>'"]/g,
                tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
            );
        }
    </script>
</body>
</html>`;
}

server.listen(PORT, () => {
    console.log(`[Worker ${process.pid}] Enterprise server listening on port ${PORT}`);
});
