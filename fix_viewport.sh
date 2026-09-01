cd "$HOME/workspace/chat-app"

# Update server.js UI to clamp max-width and optimize layout scaling for desktop screens
python3 -c '
with open("server.js", "r") as f:
    content = f.read()

# Replace body styles and layout containers for better desktop sizing
old_styles = """        body { background: var(--bg-obsidian); color: var(--text-primary); height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; }"""
new_styles = """        body { background: var(--bg-obsidian); color: var(--text-primary); height: 100vh; height: 100dvh; display: flex; flex-direction: column; overflow: hidden; align-items: center; }
        .app-wrapper { width: 100%; max-width: 1400px; height: 100%; display: flex; flex-direction: column; overflow: hidden; box-shadow: 0 0 50px rgba(0,0,0,0.8); border-left: 1px solid var(--border-subtle); border-right: 1px solid var(--border-subtle); }"""

content = content.replace(old_styles, new_styles)

# Wrap layout inside app-wrapper
content = content.replace("<body>", "<body>\n    <div class=\"app-wrapper\">")
content = content.replace("</body>", "    </div>\n</body>")

with open("server.js", "w") as f:
    f.write(content)
'

git add server.js
git commit -m "Constrain maximum layout width to 1400px centered wrapper for optimal desktop viewing"
git push origin main

npm start
