# Helium

A terminal UI AI coding agent with support for multiple AI providers.

## Supported Providers

- **Anthropic** (Claude)
- **Google** (Gemini)
- **OpenAI** (GPT)

## Requirements

- [Bun](https://bun.sh) runtime
- [fzf](https://github.com/junegunn/fzf) for file search
- API key for at least one provider

## Installation

```bash
git clone https://github.com/yishus/helium.git
cd helium
bun install
bun run dev
```

## Configuration

Add your API keys to `~/.helium/agent/auth.json`:

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
