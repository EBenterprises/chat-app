# Ensure package.json reflects v2 metadata
cat << 'EOT' > package.json
{
  "name": "chat-app-v2-direct-messenger",
  "version": "2.0.0",
  "description": "Executive Spectrum v2 - End-to-end direct messaging platform with multi-conversation threading and zero presence telemetry.",
  "main": "cluster.js",
  "scripts": {
    "start": "node cluster.js",
    "dev": "node server.js"
  },
  "dependencies": {
    "ws": "^8.16.0"
  }
}
EOT

# Upgrade server.js specifically for v2 multi-convo direct messaging architecture
cat << 'EOT' > server.js
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
        res.end(getV2MessengerUI());
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

const wss = new WebSocket.Server({ server });
const connectedClients = new Map(); // ws -> username

wss.on('connection', (ws) => {
    let clientState = { username: '' };

    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            if (data.type === 'AUTH') {
                clientState.username = (data.username || 'Anonymous').trim().substring(0, 32);
                connectedClients.set(ws, clientState.username);
            } else if (data.type === 'DIRECT_MESSAGE') {
                const recipient = (data.recipient || '').trim().substring(0, 32);
                const text = (data.text || '').trim().substring(0, 1000);
                if (!recipient || !text || !clientState.username) return;

                const packet = JSON.stringify({
                    type: 'DIRECT_MESSAGE',
                    sender: clientState.username,
                    recipient: recipient,
                    text: text,
                    timestamp: new Date().toLocaleTimeString()
                });

                // Route to recipient if online
                for (let [client, username] of connectedClients) {
                    if (username === recipient && client.readyState === WebSocket.OPEN) {
                        client.send(packet);
                    }
                }
                // Echo back to sender for immediate state synchronization
                if (ws.readyState === WebSocket.OPEN) {
                    ws.send(packet);
                }
            }
        } catch (e) {
            console.error('Payload parse error:', e);
        }
    });

    ws.on('close', () => {
        connectedClients.delete(ws);
    });
});

function getV2MessengerUI() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>Executive Spectrum v2 | Secure Messenger</title>
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
        body { background: var(--bg-obsidian); color: var(--text-primary); height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; align-items: center; }
        
        .app-wrapper { width: 100%; max-width: 1400px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 50px rgba(0,0,0,0.8); border-left: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); }

        header { background: var(--surface-dark); border-bottom: 1px solid var(--border-subtle); padding: 0.75rem 1rem; display: flex; justify-content: space-between; align-items: center; z-index: 20; }
        .brand { display: flex; align-items: center; gap: 0.5rem; }
        .logo-badge { width: 12px; height: 12px; background: var(--accent-teal); border-radius: 50%; box-shadow: 0 0 10px var(--accent-teal); }
        h1 { font-size: 1rem; color: var(--accent-teal); letter-spacing: 0.05em; text-transform: uppercase; font-weight: 700; }
        
        .mobile-menu-btn { display: none; background: transparent; border: 1px solid var(--border-subtle); color: var(--accent-teal); padding: 0.4rem 0.6rem; border-radius: 4px; font-size: 1.1rem; cursor: pointer; }

        .layout { flex: 1; display: grid; grid-template-columns: 280px 1fr; overflow: hidden; position: relative; }
        
        aside { background: var(--surface-dark); border-right: 1px solid var(--border-subtle); padding: 1rem; display: flex; flex-direction: column; gap: 1rem; transition: transform 0.3s ease; }
        aside h3 { font-size: 0.75rem; color: var(--accent-gold); text-transform: uppercase; letter-spacing: 0.08em; }
        
        .new-convo-box { display: flex; gap: 0.4rem; }
        .new-convo-box input { flex: 1; padding: 0.5rem; font-size: 0.85rem; }
        .new-convo-box button { padding: 0.5rem 0.75rem; font-size: 0.75rem; }

        .convo-list { display: flex; flex-direction: column; gap: 0.4rem; overflow-y: auto; flex: 1; }
        .convo-btn { background: var(--surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.65rem 0.75rem; border-radius: 6px; text-align: left; cursor: pointer; font-size: 0.85rem; display: flex; justify-content: space-between; align-items: center; }
        .convo-btn.active { border-color: var(--accent-teal); background: rgba(0, 210, 196, 0.08); color: var(--accent-teal); font-weight: 600; }

        .main-chat { display: flex; flex-direction: column; height: 100%; padding: 1rem; gap: 0.75rem; overflow: hidden; background: var(--bg-obsidian); }
        .chat-header-bar { font-size: 0.85rem; color: var(--accent-gold); font-weight: 600; padding-bottom: 0.5rem; border-bottom: 1px solid var(--border-subtle); display: flex; align-items: center; gap: 0.5rem; }
        #chat-box { flex: 1; background: var(--surface-dark); border: 1px solid var(--border-subtle); border-radius: 8px; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
        
        .message { background: var(--surface-elevated); border-left: 3px solid var(--accent-teal); padding: 0.65rem 0.85rem; border-radius: 6px; font-size: 0.95rem; }
        .message.self { border-left-color: var(--accent-gold); }
        
        .msg-header { display: flex; justify-content: space-between; font-size: 0.7rem; color: var(--text-muted); margin-bottom: 0.25rem; }
        .msg-user { color: var(--accent-teal); font-weight: 700; }
        .message.self .msg-user { color: var(--accent-gold); }
        
        #input-form { display: flex; gap: 0.5rem; }
        input, button { background: var(--surface-elevated); border: 1px solid var(--border-subtle); color: var(--text-primary); padding: 0.75rem 1rem; border-radius: 8px; font-size: 1rem; outline: none; }
        input:focus { border-color: var(--accent-teal); }
        button { background: var(--accent-teal); color: var(--bg-obsidian); font-weight: 700; cursor: pointer; text-transform: uppercase; font-size: 0.85rem; }
        #input-form input { flex: 1; }

        #login-overlay { position: fixed; inset: 0; background: rgba(11, 15, 18, 0.96); display: flex; justify-content: center; align-items: center; z-index: 100; padding: 1rem; backdrop-filter: blur(8px); }
        .login-card { background: var(--surface-dark); border: 1px solid var(--border-gold); padding: 2rem; border-radius: 12px; width: 100%; max-width: 380px; display: flex; flex-direction: column; gap: 1.25rem; box-shadow: 0 10px 40px rgba(0,0,0,0.8); }
        .login-card h2 { color: var(--accent-gold); font-size: 1.2rem; text-align: center; text-transform: uppercase; letter-spacing: 0.05em; }

        @media (max-width: 900px) {
            .layout { grid-template-columns: 1fr; }
            aside { position: fixed; top: 53px; bottom: 0; width: 280px; z-index: 50; box-shadow: 5px 0 25px rgba(0,0,0,0.8); left: -280px; }
            aside.open { left: 0; }
            .mobile-menu-btn { display: inline-block; }
        }
    </style>
</head>
<body>
    <div id="login-overlay">
        <div class="login-card">
            <h2>Executive Spectrum v2</h2>
            <input type="text" id="username-input" placeholder="Enter secure handle..." autocomplete="off" />
            <button id="login-btn">Initialize Session</button>
        </div>
    </div>

    <div class="app-wrapper">
        <header>
            <div class="brand">
                <button class="mobile-menu-btn" id="menu-toggle">☰</button>
                <div class="logo-badge"></div>
                <h1>Executive Spectrum v2</h1>
            </div>
            <div id="header-user" style="color: var(--accent-gold); font-size: 0.85rem; font-weight: 600;"></div>
        </header>

        <div class="layout">
            <aside id="sidebar">
                <h3>Direct Conversations</h3>
                <div class="new-convo-box">
                    <input type="text" id="new-recipient" placeholder="Recipient handle..." autocomplete="off" />
                    <button id="add-convo-btn">Open</button>
                </div>
                <div class="convo-list" id="convo-list"></div>
            </aside>

            <main class="main-chat">
                <div class="chat-header-bar" id="active-convo-title">Select or start a conversation</div>
                <div id="chat-box">
                    <div style="color: var(--text-muted); text-align: center; margin-top: auto; margin-bottom: auto; font-style: italic;">No conversation selected.</div>
                </div>
                <form id="input-form" style="display: none;">
                    <input type="text" id="msg-input" placeholder="Type encrypted transmission..." autocomplete="off" />
                    <button type="submit">Transmit</button>
                </form>
            </main>
        </div>
    </div>

    <script>
        let ws;
        let currentUser = localStorage.getItem('exec_v2_user') || '';
        let currentRecipient = null;
        let conversations = JSON.parse(localStorage.getItem('exec_v2_convos') || '[]');
        let messagesStore = JSON.parse(localStorage.getItem('exec_v2_msgs') || '{}');

        const loginOverlay = document.getElementById('login-overlay');
        const usernameInput = document.getElementById('username-input');
        const loginBtn = document.getElementById('login-btn');
        const headerUser = document.getElementById('header-user');
        const convoList = document.getElementById('convo-list');
        const newRecipientInput = document.getElementById('new-recipient');
        const addConvoBtn = document.getElementById('add-convo-btn');
        const chatBox = document.getElementById('chat-box');
        const inputForm = document.getElementById('input-form');
        const msgInput = document.getElementById('msg-input');
        const activeConvoTitle = document.getElementById('active-convo-title');
        const menuToggle = document.getElementById('menu-toggle');
        const sidebar = document.getElementById('sidebar');

        if (currentUser) {
            loginOverlay.style.display = 'none';
            headerUser.textContent = currentUser;
            initWebSocket();
            renderConversations();
        }

        loginBtn.addEventListener('click', handleLogin);
        usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

        function handleLogin() {
            const val = usernameInput.value.trim();
            if (!val) return;
            currentUser = val;
            localStorage.setItem('exec_v2_user', currentUser);
            loginOverlay.style.display = 'none';
            headerUser.textContent = currentUser;
            initWebSocket();
            renderConversations();
        }

        menuToggle.addEventListener('click', () => { sidebar.classList.toggle('open'); });

        addConvoBtn.addEventListener('click', startNewConvo);
        newRecipientInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') startNewConvo(); });

        function startNewConvo() {
            const recipient = newRecipientInput.value.trim();
            if (!recipient || recipient === currentUser) return;
            if (!conversations.includes(recipient)) {
                conversations.push(recipient);
                localStorage.setItem('exec_v2_convos', JSON.stringify(conversations));
            }
            newRecipientInput.value = '';
            renderConversations();
            selectConvo(recipient);
        }

        function renderConversations() {
            convoList.innerHTML = conversations.map(c => `
                <div class="convo-btn ${c === currentRecipient ? 'active' : ''}" onclick="selectConvo('${c}')">
                    <span>${escapeHTML(c)}</span>
                </div>
            `).join('');
        }

        window.selectConvo = function(recipient) {
            currentRecipient = recipient;
            renderConversations();
            activeConvoTitle.textContent = \`Secure Convo with @\${recipient}\`;
            inputForm.style.display = 'flex';
            sidebar.classList.remove('open');
            renderMessages();
        }

        function initWebSocket() {
            const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            ws = new WebSocket(\`\${proto}//\${window.location.host}\`);

            ws.onopen = () => {
                ws.send(JSON.stringify({ type: 'AUTH', username: currentUser }));
            };

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if (data.type === 'DIRECT_MESSAGE') {
                    const peer = data.sender === currentUser ? data.recipient : data.sender;
                    if (!conversations.includes(peer)) {
                        conversations.push(peer);
                        localStorage.setItem('exec_v2_convos', JSON.stringify(conversations));
                        renderConversations();
                    }
                    if (!messagesStore[peer]) messagesStore[peer] = [];
                    messagesStore[peer].push(data);
                    localStorage.setItem('exec_v2_msgs', JSON.stringify(messagesStore));

                    if (currentRecipient === peer) {
                        renderMessages();
                    }
                }
            };

            ws.onclose = () => {
                setTimeout(initWebSocket, 2000);
            };
        }

        inputForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const text = msgInput.value.trim();
            if (!text || !currentRecipient || !ws || ws.readyState !== WebSocket.OPEN) return;
            ws.send(JSON.stringify({
                type: 'DIRECT_MESSAGE',
                recipient: currentRecipient,
                text: text
            }));
            msgInput.value = '';
        });

        function renderMessages() {
            if (!currentRecipient) return;
            const msgs = messagesStore[currentRecipient] || [];
            if (msgs.length === 0) {
                chatBox.innerHTML = \`<div style="color: var(--text-muted); text-align: center; margin-top: auto; margin-bottom: auto; font-style: italic;">No transmissions logged with \${escapeHTML(currentRecipient)}. Send your first message below.</div>\`;
                return;
            }
            chatBox.innerHTML = msgs.map(m => {
                const isSelf = m.sender === currentUser;
                return \`
                    <div class="message \${isSelf ? 'self' : ''}">
                        <div class="msg-header">
                            <span class="msg-user">\${escapeHTML(m.sender)}</span>
                            <span>\${m.timestamp}</span>
                        </div>
                        <div>\${escapeHTML(m.text)}</div>
                    </div>\`;
            }).join('');
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
    console.log(`[Executive v2 Worker ${process.pid}] Secure multi-convo messenger active on port ${PORT}`);
});
EOT

git add -A
git commit -m "Upgrade v2 branch with multi-convo direct messaging architecture"
git push origin v2-development

npm start
