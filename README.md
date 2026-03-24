# gt — Lightning-fast Git companion
<p align="center">If you find this project useful, consider giving it a ⭐.</p>

<p align="center"><strong>Fast, minimal CLI for AI-assisted Git commits.</strong></p>

<p align="center">
  <a href="https://www.npmjs.com/package/gt-smart"><img src="https://img.shields.io/npm/v/gt-smart.svg" alt="npm version" /></a>
  <a href="./LICENSE"><img src="https://img.shields.io/badge/license-MIT-yellow.svg" alt="license" /></a>
  <a href="https://github.com/ellibertador00/git-smart/pulls"><img src="https://img.shields.io/badge/PRs-welcome-brightgreen.svg" alt="prs" /></a>
</p>

## Features
- **AI-generated commits** — One-line messages with a fallback if the provider fails.
- **Smart push** — `gt p` commits (if needed) and pushes in one step.
- **Minimal terminal UX** — No clutter, no noise.
- **Manual control** — Run commands when you want, nothing runs in the background.

Supports OpenAI and Gemini for generating commit messages.

## Install
```bash
npm install -g gt-smart
```
> Requires Node.js 18+ and git on your PATH.

## Setup
Create an API key:

- OpenAI — [Get API key](https://platform.openai.com/api-keys)
- Gemini — [Get API key](https://aistudio.google.com/api-keys)

Set one environment variable:

### macOS / Linux / Git Bash
```bash
export OPENAI_API_KEY="your_api_key_here"
# or
export GEMINI_API_KEY="your_api_key_here"
```

### Windows PowerShell
```powershell
$env:OPENAI_API_KEY="your_api_key_here"
# or
$env:GEMINI_API_KEY="your_api_key_here"
```

Alternatively, you can create a `.env` file in your project root:

```
OPENAI_API_KEY=your_api_key_here
# or
GEMINI_API_KEY=your_api_key_here
```

## Usage
```bash
gt
gt s
gt c
gt p
```

## Commands
| Command | Description |
| --- | --- |
| `gt c` / `gt commit` | Stage files, generate an AI commit message, and commit immediately. |
| `gt p` / `gt push` | Smart push: auto-commit pending changes and push the current branch (or just push if nothing needs committing). |
| `gt s` / `gt status` | Show a concise git status summary. |
| `gt h` / `gt help` | Show inline help. |

## Environment Variables
```
OPENAI_API_KEY=your_openai_key
GEMINI_API_KEY=your_gemini_key
```

## Example
```bash
gt c   # generate AI-assisted commit message and commit
gt p   # auto-commit (if needed) and push
gt s   # short git status
```

## Contributing
We welcome contributions. Feel free to open issues or submit pull requests. See [CONTRIBUTING.md](CONTRIBUTING.md) for more details.

## License
[MIT](LICENSE)
