# dim

A lightweight terminal coding agent. Use it as it is, or as a base to build your own specialized coding agent.

## Key Features

- Extensions
- Multi model support
- Context engineering support with
  - CLAUDE.md

## Requirements

- [Bun](https://bun.sh) >= 1.0.0

## Installation

```bash
bun install -g @yishus/dim-code
```

Or run directly:

```bash
bunx @yishus/dim-code
```

## Configuration

Dim needs at least one API key to work. You can provide keys via environment variables or a config file.

### Environment variables

```bash
export ANTHROPIC_API_KEY=sk-...
export GOOGLE_API_KEY=...        # or GEMINI_API_KEY
export OPENAI_API_KEY=sk-...
```

### Config file

Create `~/.dim/agent/auth.json`:

```json
{
  "anthropic": { "apiKey": "sk-..." },
  "google": { "apiKey": "..." },
  "openai": { "apiKey": "sk-..." }
}
```

Environment variables take precedence over the config file.

## Development

```bash
bun install
bun run dev        # run with hot reload
bun run typecheck   # type check
```

## License

MIT
