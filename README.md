# Micro Posting

A micro-posting plugin for [Obsidian](https://obsidian.md). Think of it as a private Twitter timeline inside your vault — jot down quick thoughts, ideas, and fleeting notes throughout the day without switching context.

## Why Micro Posting?

Most note-taking workflows push you toward long-form writing or structured capture. But sometimes you just want to post a short thought — a one-liner, a passing idea, a tiny update — and move on. Micro Posting gives you a fast, low-friction timeline for these micro-posts, all stored as plain Markdown in your vault.

## Features

- **Instant posting** — Open the view, type, hit Enter. That's it.
- **Timeline view** — Browse your posts chronologically in a list or chat-style layout.
- **Tags** — Use `#tags` inline. Filter by tag from the sidebar.
- **Tasks** — Toggle between plain posts and task items (`- [ ]`).
- **Quick Capture** — Post from anywhere via command palette, even without the view open.
- **Archive & Trash** — Keep your timeline clean. Archive old posts or move them to trash.
- **Search & Filter** — Full-text search with quick filters (links, tags, images).
- **Two storage modes**:
  - **Daily Note mode** — Posts are appended under a configurable heading (default: `# Posts`) in your daily notes.
  - **Single File mode** — All posts stored in one Markdown file.
- **Plain Markdown** — Disable the plugin anytime; your data remains readable.

## Usage

1. Click the clock icon in the ribbon, or run `Micro Posting: Open` from the command palette.
2. Type your thought in the input area at the bottom.
3. Press **Enter** to post. Use **Shift+Enter** for multi-line posts.

### Quick Capture

Assign a hotkey to `Micro Posting: Quick Capture` for instant posting from anywhere in Obsidian. If the Micro Posting view is already open, it focuses the input area. Otherwise, a modal dialog appears.

### Keyboard Shortcuts

| Key | Action |
|-----|--------|
| Enter | Post |
| Shift+Enter | New line |
| Escape | Cancel editing |

## Storage

### Daily Note Mode (Default)

Posts are stored as list items under a `# Posts` heading in your daily notes:

```markdown
# Posts

- 09:15 Had an idea about the project ^mp-a1b2
- 09:30 Need to check the API docs #work ^mp-c3d4
- [ ] 10:00 Reply to Alice's email ^mp-e5f6
```

Each post gets a block ID (`^mp-xxxx`) so you can link to individual posts from anywhere in your vault using `[[note#^mp-xxxx]]`.

Requires the built-in Daily Notes core plugin to be enabled.

### Single File Mode

All posts are stored in a single file (default: `micro-posting.md`) using Obsidian callout syntax. Enable this in settings if you prefer not to use daily notes.

## Settings

| Setting | Description | Default |
|---------|-------------|---------|
| Default save mode | Daily Note or Single File | Daily Note |
| Default entry type | List or Task | List |
| Diary heading | Heading title in daily notes | Posts |
| Single file path | File path for single-file mode | micro-posting.md |
| Default layout | List View or Chat View | List |
| Auto focus | Focus input when view opens | On |
| Hide completed tasks | Hide done tasks from view | Off |
| Sidebar always visible | Keep sidebar open | On |

## Installation

### From Community Plugins (coming soon)

1. Open **Settings > Community plugins > Browse**.
2. Search for "Micro Posting".
3. Click **Install**, then **Enable**.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the [latest release](https://github.com/shirou/obsidian-micro-posting/releases).
2. Create a folder `micro-posting` inside your vault's `.obsidian/plugins/` directory.
3. Copy the downloaded files into that folder.
4. Enable "Micro Posting" in **Settings > Community plugins**.

## Development

```bash
npm install
npm run dev
```

## References

- [Thino](https://github.com/Quorafind/Obsidian-Thino)

## License

Apache License 2.0
