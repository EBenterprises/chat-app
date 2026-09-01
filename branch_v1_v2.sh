cd "$HOME/workspace/chat-app"

# Ensure we are on main representing v2 (or branch it out)
git checkout -b v2-development

# Create a tag or separate branch for v1 as it currently sits
git branch v1-stable

echo "Branching complete! 'v1-stable' preserves the exact previous state, and 'v2-development' is active for v2 enhancements."
