# dim

A lightweight terminal coding agent. Use it as it is, or as a base to build your own specialized coding agent.

## Requirements

- [Bun](https://bun.sh) runtime
- [fzf](https://github.com/junegunn/fzf) for file search
- API key for at least one provider

## Installation

```bash
git clone https://github.com/yishus/dim.git
cd dim
bun install
bun run dev
```

## Configuration

Add your API keys to `~/.dim/agent/auth.json`:

```json
{
  "anthropic": {
    "apiKey": "sk-ant-..."
  },
  "google": {
    "apiKey": "..."
  },
  "openai": {
    "apiKey": "sk-..."
  }
}
```
