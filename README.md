> [!IMPORTANT]
> **Active Fork Notice:** This repository is a fork of the original [Shipyard](https://github.com/defremont/Shipyard) by **defremont**. 
> It is maintained by **awilliansd** to include new features, bug fixes, and improvements that are not present in the upstream version.

---

<p align="center">
  <img src="assets/icon.png" width="120" height="120" alt="Dockyard" />
</p>

<h1 align="center">Dockyard</h1>

<p align="center">
  Local development dashboard &mdash; manage projects, tasks, git, and terminals from your browser.
</p>

<p align="center">
  <a href="https://github.com/awilliansd/dockyard/releases/latest"><img src="https://img.shields.io/github/v/release/awilliansd/dockyard?style=flat-square&label=download" alt="Download" /></a>
  <a href="https://github.com/awilliansd/dockyard"><img src="https://img.shields.io/github/stars/awilliansd/dockyard?style=flat-square" alt="Stars" /></a>
  <img src="https://img.shields.io/badge/react-18-61dafb?style=flat-square&logo=react&logoColor=white" alt="React 18" />
  <img src="https://img.shields.io/badge/fastify-5-000000?style=flat-square&logo=fastify&logoColor=white" alt="Fastify 5" />
  <img src="https://img.shields.io/badge/typescript-5-3178c6?style=flat-square&logo=typescript&logoColor=white" alt="TypeScript 5" />
  <img src="https://img.shields.io/badge/license-Apache%202.0-green?style=flat-square" alt="Apache 2.0 License" />
</p>

---

<p align="center">
  <a href="https://github.com/awilliansd/dockyard/releases/latest"><img src="https://img.shields.io/badge/Windows-.exe-0078D4?style=for-the-badge&logo=windows&logoColor=white" alt="Download for Windows" /></a>&nbsp;
  <a href="https://github.com/awilliansd/dockyard/releases/latest"><img src="https://img.shields.io/badge/macOS-.dmg-000000?style=for-the-badge&logo=apple&logoColor=white" alt="Download for macOS" /></a>&nbsp;
  <a href="https://github.com/awilliansd/dockyard/releases/latest"><img src="https://img.shields.io/badge/Linux-.AppImage | .deb-FCC624?style=for-the-badge&logo=linux&logoColor=black" alt="Download for Linux" /></a>
</p>

<p align="center">
  <img src="assets/dockyard-gif.gif" alt="Dockyard — workspace with kanban board, terminal, and git panel" width="100%" />
</p>

## Why Dockyard

- **Local-first** -- runs entirely on `localhost`. No cloud services, no accounts, no telemetry. Your data stays on your machine as plain JSON files.
- **Complements your editor** -- Dockyard is not an IDE. It sits alongside VS Code (or whatever you use) and gives you a bird's-eye view of all your projects, tasks, and git status in one place.
- **Cross-platform** -- works on Linux, macOS, and Windows. Launches native terminals, file managers, and VS Code with one click.
- **Agentic AI & Terminals** -- Dockyard bridge the gap between your task list and your terminal. Launch **OpenClaude** with full project context or let AI manage your tasks directly.

## Features

**Dashboard** -- See all your projects at a glance with live git status, branch info, tech stack detection, and task counts. A "Working On" banner shows in-progress tasks across all projects.

**Kanban Board** -- Per-project task management with drag-and-drop columns (Inbox, In Progress, Done). Priority levels, descriptions, and technical prompts for each task. Switch to a **list view** for a compact alternative.

**Milestones** -- Group tasks into milestones for phased work. A virtual "General" milestone holds ungrouped tasks. Create, close, and reorder milestones per project.

**Integrated Terminal** -- Full-featured terminal in your browser powered by **xterm.js** and **node-pty**. 
- **Automated AI Injection**: Launch OpenClaude or other AI CLIs and Dockyard automatically detects when they are ready to receive a task-specific prompt.
- **Context-Aware**: Prompts include project path, tech stack, current git branch, and detailed task instructions.
- **Smart Detection**: Uses content-based and silence-based detection with retry logic to ensure prompts are injected only when the CLI is fully initialized.
- **Native Fallback**: If `node-pty` is unavailable, Dockyard seamlessly falls back to launching native OS terminals (Windows Terminal, Terminal.app, gnome-terminal, etc.).

**OpenClaude Integration** -- Deep support for [OpenClaude](https://github.com/OpenClaude/openclaude). Launch in normal or `--dangerously-skip-permissions` (YOLO) mode. Dockyard ensures a clean environment by unsetting conflicting variables and providing bracketed paste support for large prompt injections.

**Git Panel** -- Stage, unstage, commit, push, pull, view diffs, and browse commit history without leaving the browser. 
- **Multi-repo support**: Automatically detects sub-repositories within a project (e.g., client/ and server/ folders with their own `.git`).
- **AI Commit Messages**: One-click to draft a commit message from your staged diff using any configured AI provider.

**Multi-Provider AI** -- Configure one or more AI providers in Settings:

| Provider | Key Required | Notes |
|----------|:---:|-------|
| Anthropic Claude | ✅ | claude-3.5-sonnet, opus, haiku |
| OpenAI | ✅ | gpt-4o, gpt-4-turbo |
| Google Gemini | ✅ | gemini-2.0-flash, gemini-1.5-pro |
| Ollama (local) | ❌ | Any model you've pulled locally |

AI capabilities include:
- **Assistant Chat**: Sidebar chat with file-system tools (list, read, write) to help you code autonomously.
- **Task Analysis**: ✨ AI generates technical prompts and implementation checklists for your tasks.
- **AI Task Manager**: Paste unstructured text (notes, emails, bug reports) and AI parses them into structured tasks.

**MCP Server** -- Expose Dockyard as a Model Context Protocol server. Claude Desktop, OpenClaude, or any MCP client can list projects, manage tasks, and read git status. Secured with OAuth 2.1 + PKCE.

**Google Sheets Sync** -- Bidirectional sync of tasks with a Google Sheet via Apps Script. Auto-push on changes, auto-pull every 30 seconds, with per-task merge based on timestamps.

## Quick Start

### Prerequisites

- [Node.js](https://nodejs.org/) >= 18
- [pnpm](https://pnpm.io/) (`npm install -g pnpm`)
- [git](https://git-scm.com/)

### Install and Run

```bash
git clone https://github.com/awilliansd/dockyard.git
cd dockyard
pnpm install
pnpm dev
```

Open [http://localhost:5421](http://localhost:5421).

### Launch Shortcuts

| OS | Command | Description |
|----|---------|-------------|
| Linux / macOS | `./dockyard.sh` | Starts server and opens browser |
| Windows | `dockyard.cmd` | Starts server and opens browser |

## Stack

| Layer | Technology |
|-------|-----------| 
| Frontend | React 18 + Vite + TypeScript + Tailwind CSS + shadcn/ui |
| Backend | Fastify 5 + TypeScript (via tsx) |
| Terminal | xterm.js + node-pty |
| AI | Anthropic, OpenAI, Gemini, Ollama |
| Data | Local JSON files (no database) |

## Data and Privacy

All data is stored locally in a `data/` directory as plain JSON files. Nothing is sent to any cloud service except when you explicitly use AI providers or Google Sheets sync. API keys are encrypted with AES-256-GCM on disk.

## License

[Apache License 2.0](LICENSE)
