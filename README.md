# Helium

A terminal UI (TUI) AI coding assistant built with Bun, React, and OpenTUI. Helium provides an interactive chat interface for working with Claude to assist with software engineering tasks.

## Features

- **Interactive Chat Interface**: Conversational UI for communicating with Claude AI directly in your terminal
- **Tool System**: Built-in tools that Claude can use to interact with your system:
  - `bash` - Execute shell commands
  - `read` - Read file contents
  - `write` - Create or overwrite files
  - `edit` - Make targeted edits to existing files
  - `web-fetch` - Fetch and process web content
- **Permission Control**: Prompts for user approval before executing potentially impactful tools (bash, edit, write, web-fetch)
- **Diff Preview**: Shows diffs for file edits and writes before execution
- **Slash Commands**: Quick actions via slash commands:
  - `/help` - Show available commands
  - `/clear` - Clear the conversation
  - `/commit` - Create a git commit
  - `/review` - Review recent changes
  - `/plan` - Create an implementation plan
- **Token Usage Tracking**: Real-time display of token usage and API costs
- **CLAUDE.md Support**: Automatically loads project context from `CLAUDE.md` in the working directory
- **Hot Reload Development**: Fast iteration with `bun run --watch`

## Requirements

- [Bun](https://bun.sh/) runtime (v1.0 or later)
- An Anthropic API key

## Installation

1. Clone the repository:
   ```bash
   git clone https://github.com/yourusername/helium.git
   cd helium
   ```

2. Install dependencies:
   ```bash
   bun install
   ```

3. Set up your Anthropic API key:

   Create the auth file at `~/.helium/agent/auth.json`:
   ```json
   {
     "apiKey": "your-anthropic-api-key"
   }
   ```

## Usage

Start Helium with hot reload:
```bash
bun run dev
```

Once running:
1. Type your message in the input box and press `Enter` to send
2. Use `Shift+Enter` for multi-line input
3. Type `/` to see available slash commands
4. Use arrow keys to navigate command suggestions
5. When Claude requests to use a tool, select `Yes` or `No` to approve/deny

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Enter` | Submit message |
| `Shift+Enter` | New line |
| `Up/Down` | Navigate options |

## Project Structure

```
helium/
├── src/
│   ├── index.tsx          # Entry point
│   ├── agent.ts           # AI context and tool execution
│   ├── session.ts         # Session orchestration
│   ├── components/        # React UI components
│   ├── tools/             # Tool implementations
│   └── prompts/           # System prompts
└── package.json
```

## Technology Stack

- **Runtime**: Bun
- **UI Framework**: React 19 with OpenTUI
- **Language**: TypeScript 5
- **AI Provider**: Anthropic Claude

## License

MIT
