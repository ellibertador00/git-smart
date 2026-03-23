# Contributing to gt

Thanks for contributing to `gt` — a lightning-fast Git companion for AI-assisted commits.

## Project Structure

```text
gt/
├── src/
│   ├── index.ts              # CLI entry point and command routing
│   ├── commands/
│   │   ├── commit.ts         # Commit flow
│   │   ├── push.ts           # Smart push flow
│   │   └── status.ts         # Status command
│   ├── lib/
│   │   ├── args.ts           # Command aliases and parsing
│   │   ├── config.ts         # Environment/config loading
│   │   ├── git.ts            # Git command wrappers
│   │   ├── help.ts           # Help output
│   │   └── output.ts         # CLI UI helpers
│   ├── providers/
│   │   ├── index.ts          # Provider selection
│   │   ├── openai.ts         # OpenAI integration
│   │   └── gemini.ts         # Gemini integration
│   └── types.ts              # Shared types
├── tests/
│   ├── args.test.ts
│   ├── config.test.ts
│   ├── git.test.ts
│   ├── providers.test.ts
│   ├── sanitize.test.ts
│   └── integration/
│       └── commit-flow.test.ts
├── .env.example              # Environment variable template
├── .gitignore
├── LICENSE
├── README.md
├── package.json
├── tsconfig.json
└── CONTRIBUTING.md
```

## Development

### Prerequisites

* Node.js 18+
* Git
* npm

### Setup

```bash
git clone <your-repo-url>
cd gt
npm install
npm run build
npm link
```

After linking, you can test the CLI globally:

```bash
gt
gt s
gt c
gt p
```

## Available Scripts

```bash
npm run build     # Build dist/index.js
npm run dev       # Run the CLI in development
npm test          # Run tests
```

## Environment Setup

Set one provider key before testing AI commit generation.

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

## Contributing Workflow

1. Fork the repository
2. Create a branch

```bash
git checkout -b feature/your-change
```

3. Make your changes
4. Add or update tests where needed
5. Run tests

```bash
npm test
```

6. Build the project

```bash
npm run build
```

7. Smoke-test the CLI

```bash
gt
gt s
gt c
gt p
```

8. Commit and open a pull request

## Contribution Guidelines

* Keep changes focused and minimal
* Preserve the project’s fast, clean CLI philosophy
* Do not add background watchers or heavy automation
* Prefer explicit, predictable behavior over hidden magic
* Update the README when user-facing behavior changes
* Add tests for bug fixes and new behavior
* Keep terminal output concise and readable

## Command Behavior Notes

Before changing command behavior, keep these expectations in mind:

* `gt c` stages changes, generates a commit message, and commits
* `gt p` commits pending changes if needed, then pushes
* `gt s` shows a concise status view

Changes to these flows should be intentional and clearly documented.

## Testing

Run all tests:

```bash
npm test
```

Build and verify runtime output:

```bash
npm run build
node dist/index.js h
```

Global smoke test in another repo:

```bash
npm link
cd ../some-test-repo
gt s
gt c
gt p
```

## Documentation

Please update documentation when changing:

* commands
* environment variables
* provider behavior
* setup flow
* user-facing output

## Security

* Never commit real API keys
* Never commit `.env`
* Use `.env.example` for placeholders only

## Reporting Issues

When opening an issue, include:

* what you expected
* what happened
* OS and shell
* Node version
* exact command run
* error output, if any

## Pull Requests

A good pull request should:

* explain the change clearly
* stay focused on one improvement
* include tests when relevant
* avoid unrelated refactors

Thanks for helping improve `gt`.
