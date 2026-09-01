const http = require('http');
const WebSocket = require('ws');

const PORT = process.env.PORT || 3000;
const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Access-Control-Allow-Origin', '*');

    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getCrossPlatformUI());
    } else if (req.method === 'GET' && url.pathname === '/api/telemetry') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
            status: 'operational',
            pid: process.pid,
            uptime: process.uptime(),
            activeConnections: connectedClients.size
        }));
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const wss = new WebSocket.Server({ server });
const connectedClients = new Map();

wss.on('connection', (ws) => {
    let clientState = { username: 'Anonymous', room: 'Global-Alpha' };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'AUTH') {
                clientState.username = (data.username || 'Anonymous').trim().substring(0, 32);
                clientState.room = (data.room || 'Global-Alpha').trim().substring(0, 32);
                connectedClients.set(ws, clientState);
                broadcastToRoom(clientState.room, {
                    type: 'SYSTEM',
                    text: `${clientState.username} connected across channel [${clientState.room}].`,
                    timestamp: new Date().toLocaleTimeString()
                });
                sendActiveUsers(clientState.room);
            } else if (data.type === 'SWITCH_ROOM') {
                const oldRoom = clientState.room;
                clientState.room = (data.room || 'Global-Alpha').trim().substring(0, 32);
                connectedClients.set(ws, clientState);
                broadcastToRoom(oldRoom, { type: 'SYSTEM', text: `${clientState.username} departed.`, timestamp: new Date().toLocaleTimeString() });
                sendActiveUsers(oldRoom);
                broadcastToRoom(clientState.room, { type: 'SYSTEM', text: `${clientState.username} joined.`, timestamp: new Date().toLocaleTimeString() });
                sendActiveUsers(clientState.room);
            } else if (data.type === 'MESSAGE') {
                broadcastToRoom(clientState.room, {
                    type: 'MESSAGE',
                    username: clientState.username,
                    room: clientState.room,
                    text: (data.text || '').trim().substring(0, 1000),
                    timestamp: new Date().toLocaleTimeString()
                });
            }
        } catch (e) {
            console.error('Payload error:', e);
        }
    });

    ws.on('close', () => {
        if (connectedClients.has(ws)) {
            const state = connectedClients.get(ws);
            connectedClients.delete(ws);
            broadcastToRoom(state.room, { type: 'SYSTEM', text: `${state.username} disconnected.`, timestamp: new Date().toLocaleTimeString() });
            sendActiveUsers(state.room);
        }
    });
});

function broadcastToRoom(room, data) {
    const packet = JSON.stringify(data);
    for (let [client, state] of connectedClients) {
        if (state.room === room && client.readyState === WebSocket.OPEN) {
            client.send(packet);
        }
    }
}

function sendActiveUsers(room) {
    const users = [];
    for (let [client, state] of connectedClients) {
        if (state.room === room) users.push(state.username);
    }
    const packet = JSON.stringify({ type: 'PRESENCE', users });
    for (let [client, state] of connectedClients) {
        if (state.room === room && client.readyState === WebSocket.OPEN) {
            client.send(packet);
        }
    }
}

function getCrossPlatformUI() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Executive Spectrum | Cross-Platform Hub</title>
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
            --border-gold: rgba(212, 175, 55, 0.2);
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; -webkit-tap-highlight-color: transparent; }
        body { background: var(--bg-obsidian); color: var(--text-primary); height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }
        
        header { background: var(--surface-dark); border-bottom: 1px solid var(--border-subtle); padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 20; }
        .brand { display: flex; align-items: center; gap: 0.5rem; }
        .logo-badge { width: 12px; height: 12px; background: var(--accent-teal); border-radius: 50%; box-shadow: 0 0 10px var(--accent-teal); }
        h1 { font-size: 1rem; color: var(--accent-teal); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700; }
        
        .mobile-menu-btn { display: none; background: transparent; border: 1px solid var(--border-subtle); color: var(--accent-teal); padding: 0.4rem 0.6rem; border-radius: 4px; font-size: 1.1rem; cursor: pointer; }

        .layout { flex: 1; display: grid; grid-template-columns: 260px 1fr 220px; overflow: hidden; position: relative; }
        
        aside, .right-panel { background: var(--surface-dark); transition: transform 0.3s ease; }
        aside { border-right: 1px solid var(--border-subtle); padding: 1rem; display: flex; flex-direction: column; gap: 1rem; }
        aside h3, .right-panel h3 { font-size: 0.75rem; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 0.08em; }
        
        .room-list { display: flex; flex-direction: column; gap: 0.4rem; }
        .room-btn { background: var(--surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.65rem 0.75rem; border-radius: 6px; text-align: left; cursor: pointer; font-size: 0.85rem; }
        .room-btn.active { border-color: var(--accent-teal); background: rgba(0, 210, 196, 0.08); color: var(--accent-teal); font-weight: 600; }

        .main-chat { display: flex; flex-direction: column; height: 100%; padding: 1rem; gap: 0.75rem; overflow: hidden; background: var(--bg-obsidian); }
        #chat-box { flex: 1; background: var(--surface-dark); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
        
        .message { background: var(--surface-elevated); border-left: 3px solid var(--accent-teal); padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.95rem; }
        .message.self { border-left-color: var(--accent-gold); }
        .message.system { border-left-color: var(--text-muted); background: rgba(18,24,29,0.4); font-style: italic; font-size: 0.8rem; color: var(--text-muted); }
        
        .msg-header { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; }
        .msg-user { color: var(--accent-teal); font-weight: 700; }
        .message.self .msg-user { color: var(--accent-gold); }
        
        #input-form { display: flex; gap: 0.5rem; }
        input, button { background: var(--surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.75rem 1rem; border-radius: 8px; font-size: 1rem; outline: none; }
        input:focus { border-color: var(--accent-teal); }
        button { background: var(--accent-teal); color: var(--bg-obsidian); font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
        #input-form input { flex: 1; }

        .right-panel { border-left: 1px solid var(--border-subtle); padding: 1rem; display: flex; flex-direction: column; gap: 0.75rem; overflow-y: auto; }
        .user-pill { background: var(--surface-elevated); padding: 0.4rem 0.6rem; border-radius: 4px; border: 1px solid var(--border-subtle); font-size: 0.8rem; display: flex; align-items: center; gap: 0.4rem; }
        .user-pill::before { content: ''; width: 6px; height: 6px; background: var(--accent-teal); border-radius: 50%; }

        #login-overlay { position: fixed; inset: 0; background: rgba(11, 15, 18, 0.96); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 1rem; backdrop-filter: blur(8px); }
        .login-card { background: var(--surface-dark); border: 1px solid var(--border-gold); padding: 2rem; border-radius: 12px; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 1.25rem; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
        .login-card h2 { color: var(--accent-gold); font-size: 1.2rem; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }

        /* Responsive Mobile Drawer Styling */
        @media (max-width: 900px) {
            .layout { grid-template-columns: 1fr; }
            aside, .right-panel { position: fixed; top: 53px; bottom: 0; width: 260px; z-index: 50; box-shadow: 5px 0 25px rgba(0,0,0,0.8); }
            aside { left: -260px; }
            aside.open { left: 0; }
            .right-panel { right: -220px; width: 220px; }
            .right-panel.open { right: 0; }
            .mobile-menu-btn { display: inline-block; }
        }
    </style>
</head>
<body>
    <div id="login-overlay">
        <div class="login-card">
            <h2>Executive Terminal</h2>
            <input type="text" id="username-input" placeholder="Enter handle..." autocomplete="off" />
            <button id="login-btn">Connect Platform</button>
        </div>
    </div>

    <header>
        <div class="brand">
            <button class="mobile-menu-btn" id="menu-toggle">☰</button>
            <div class="logo-badge"></div>
            <h1>Executive Spectrum</h1>
        </div>
        <div id="header-user" style="color: var(--accent-gold); font-size: 0.85rem; font-weight: 600;"></div>
    </header>

    <div class="layout">
        <aside id="sidebar">
            <h3>Channels</h3>
            <div class="room-list">
                <button class="room-btn active" data-room="Global-Alpha"># Global-Alpha</button>
                <button class="room-btn" data-room="Architecture-Core"># Architecture-Core</button>
                <button class="room-btn" data-room="Mobile-Sync"># Mobile-Sync</button>
                <button class="room-btn" data-room="Desktop-Ops"># Desktop-Ops</button>
            </div>
        </aside>

        <main class="main-chat">
            <div id="chat-box"></div>
            <form id="input-form">
                <input type="text" id="msg-input" placeholder="Type transmission..." autocomplete="off" />
                <button type="submit">Send</button>
            </form>
        </main>

        <section class="right-panel" id="users-panel">
            <h3>Active Users</h3>
            <div id="users-list" style="display: flex; flex-direction: column; gap: 0.4rem;"></div>
        </section>
    </div>

    <script>
        let ws;
        let currentUser = localStorage.getItem('exec_user') || '';
        let currentRoom = 'Global-Alpha';

        const loginOverlay = document.getElementById('login-overlay');
        const usernameInput = document.getElementById('username-input');
        const loginBtn = document.getElementById('login-btn');
        const headerUser = document.getElementById('header-user');
        const chatBox = document.getElementById('chat-box');
        const inputForm = document.getElementById('input-form');
        const msgInput = document.getElementById('msg-input');
        const usersList = document.getElementById('users-list');
        const roomButtons = document.querySelectorAll('.room-btn');
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');

        if (currentUser) {
            loginOverlay.style.display = 'none';
            headerUser.textContent = currentUser;
            initWebSocket();
        }

        loginBtn.addEventListener('click', handleLogin);
        usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

        function handleLogin() {
            const val = usernameInput.value.trim();
            if (!val) return;
            currentUser = val;
            localStorage.setItem('exec_user', currentUser);
            loginOverlay.style.display = 'none';
            headerUser.textContent = currentUser;
            initWebSocket();
        }

        menuToggle.addEventListener('click', () => {
            sidebar.classList.toggle('open');
        });

        roomButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                roomButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentRoom = btn.getAttribute('data-room');
                chatBox.innerHTML = '';
                if (ws && ws.readyState === WebSocket.OPEN) {
                    ws.send(JSON.stringify({ type: 'SWITCH_ROOM', room: currentRoom }));
                }
                sidebar.classList.remove('open');
            });
        });

        function initWebSocket() {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${proto}//\${window.location.host}\`);

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'AUTH', username: currentUser, room: currentRoom }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'PRESENCE') {
                    usersList.innerHTML = data.users.map(u => \`<div class="user-pill">\${escapeHTML(u)}</div>\`).join('');
                } else {
                    appendMessage(data);
                }
            };

            ws.onclose = () => {
                setTimeout(initWebSocket, 2000);
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
    console.log(`[Cross-Platform Worker ${process.pid}] Listening on port ${PORT}`);
});
