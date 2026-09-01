const http = require('http');

const PORT = process.env.PORT || 3000;
const messages = [];
const users = new Set();

const server = http.createServer((req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    
    if (req.method === 'GET' && url.pathname === '/') {
        res.writeHead(200, { 'Content-Type': 'text/html' });
        res.end(getHTML());
    } else if (req.method === 'GET' && url.pathname === '/api/messages') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(messages));
    } else if (req.method === 'POST' && url.pathname === '/api/login') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username } = JSON.parse(body);
                if (!username || username.trim() === '') {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Username required' }));
                    return;
                }
                users.add(username.trim());
                res.writeHead(200, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ success: true, username: username.trim() }));
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else if (req.method === 'POST' && url.pathname === '/api/messages') {
        let body = '';
        req.on('data', chunk => body += chunk);
        req.on('end', () => {
            try {
                const { username, text } = JSON.parse(body);
                if (username && text) {
                    const msg = {
                        id: Date.now(),
                        username,
                        text,
                        timestamp: new Date().toLocaleTimeString()
                    };
                    messages.push(msg);
                    if (messages.length > 100) messages.shift();
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify(msg));
                } else {
                    res.writeHead(400, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Invalid message' }));
                }
            } catch (e) {
                res.writeHead(400, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Invalid JSON' }));
            }
        });
    } else {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Not Found');
    }
});

function getHTML() {
    return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Executive Spectrum Chat</title>
    <style>
        :root {
            --bg-obsidian: #0b0f12;
            --surface-dark: #12181d;
            --accent-teal: #00d2c4;
            --accent-gold: #d4af37;
            --text-primary: #e0e6ed;
            --text-muted: #8a99ad;
        }
        * { box-sizing: border-box; margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; }
        body { background: var(--bg-obsidian); color: var(--text-primary); height: 100vh; display: flex; flex-direction: column; }
        header { background: var(--surface-dark); border-bottom: 1px solid rgba(0, 210, 196, 0.2); padding: 1rem 2rem; display: flex; justify-content: space-between; align-items: center; }
        h1 { font-size: 1.25rem; color: var(--accent-teal); letter-spacing: 0.05em; }
        .container { flex: 1; display: flex; flex-direction: column; max-width: 800px; width: 100%; margin: 0 auto; padding: 1rem; overflow: hidden; }
        #login-screen { display: flex; flex-direction: column; justify-content: center; align-items: center; height: 100%; gap: 1rem; }
        input, button { background: var(--surface-dark); border: 1px solid rgba(0, 210, 196, 0.3); color: var(--text-primary); padding: 0.75rem 1rem; border-radius: 6px; font-size: 1rem; outline: none; transition: border-color 0.2s; }
        input:focus { border-color: var(--accent-teal); box-shadow: 0 0 10px rgba(0, 210, 196, 0.2); }
        button { background: var(--accent-teal); color: var(--bg-obsidian); font-weight: bold; cursor: pointer; }
        button:hover { background: #00b3a6; }
        #chat-screen { display: none; flex-direction: column; height: 100%; gap: 1rem; }
        #chat-box { flex: 1; background: var(--surface-dark); border: 1px solid rgba(212, 175, 55, 0.2); border-radius: 8px; padding: 1rem; overflow-y: auto; display: flex; flex-direction: column; gap: 0.75rem; }
        .message { background: rgba(18, 24, 29, 0.8); border-left: 3px solid var(--accent-teal); padding: 0.5rem 1rem; border-radius: 4px; }
        .message.self { border-left-color: var(--accent-gold); }
        .msg-header { display: flex; justify-content: space-between; font-size: 0.8rem; color: var(--text-muted); margin-bottom: 0.25rem; }
        .msg-user { color: var(--accent-teal); font-weight: bold; }
        .message.self .msg-user { color: var(--accent-gold); }
        #input-form { display: flex; gap: 0.5rem; }
        #input-form input { flex: 1; }
    </style>
</head>
<body>
    <header>
        <h1>Executive Spectrum Chat</h1>
        <div id="user-display" style="color: var(--accent-gold); font-weight: 500;"></div>
    </header>
    <div class="container">
        <div id="login-screen">
            <h2 style="color: var(--accent-gold);">Enter Messaging Portal</h2>
            <div style="display: flex; gap: 0.5rem; width: 100%; max-width: 350px;">
                <input type="text" id="username-input" placeholder="Enter username..." style="flex:1;" />
                <button id="login-btn">Join</button>
            </div>
        </div>
        <div id="chat-screen">
            <div id="chat-box"></div>
            <form id="input-form">
                <input type="text" id="msg-input" placeholder="Type message..." autocomplete="off" />
                <button type="submit">Send</button>
            </form>
        </div>
    </div>
    <script>
        let currentUser = localStorage.getItem('chat_user') || '';
        const loginScreen = document.getElementById('login-screen');
        const chatScreen = document.getElementById('chat-screen');
        const usernameInput = document.getElementById('username-input');
        const loginBtn = document.getElementById('login-btn');
        const userDisplay = document.getElementById('user-display');
        const chatBox = document.getElementById('chat-box');
        const inputForm = document.getElementById('input-form');
        const msgInput = document.getElementById('msg-input');

        if (currentUser) {
            initChat();
        }

        loginBtn.addEventListener('click', handleLogin);
        usernameInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleLogin(); });

        async function handleLogin() {
            const val = usernameInput.value.trim();
            if (!val) return;
            const res = await fetch('/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: val })
            });
            const data = await res.json();
            if (data.success) {
                currentUser = data.username;
                localStorage.setItem('chat_user', currentUser);
                initChat();
            }
        }

        function initChat() {
            loginScreen.style.display = 'none';
            chatScreen.style.display = 'flex';
            userDisplay.textContent = \`User: \${currentUser}\`;
            pollMessages();
            setInterval(pollMessages, 1500);
        }

        inputForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const text = msgInput.value.trim();
            if (!text) return;
            msgInput.value = '';
            await fetch('/api/messages', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username: currentUser, text })
            });
            pollMessages();
        });

        let lastMessagesLength = 0;
        async function pollMessages() {
            try {
                const res = await fetch('/api/messages');
                const messages = await res.json();
                if (messages.length !== lastMessagesLength) {
                    lastMessagesLength = messages.length;
                    chatBox.innerHTML = messages.map(m => \`
                        <div class="message \${m.username === currentUser ? 'self' : ''}">
                            <div class="msg-header">
                                <span class="msg-user">\${escapeHTML(m.username)}</span>
                                <span>\${m.timestamp}</span>
                            </div>
                            <div>\${escapeHTML(m.text)}</div>
                        </div>
                    \`).join('');
                    chatBox.scrollTop = chatBox.scrollHeight;
                }
            } catch (e) {
                console.error(e);
            }
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
    console.log(`Chat server running on http://localhost:${PORT}`);
});
