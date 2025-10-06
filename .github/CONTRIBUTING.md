# Contributing to lasTest

Thank you for your interest in contributing to lastest! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/dexilion-team/lastest/issues)
2. Use the bug report template
3. Include:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs

### Suggesting Features

1. Check existing [Issues](https://github.com/dexilion-team/lastest/issues) for similar suggestions
2. Use the feature request template
3. Clearly describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - Example use cases

### Pull Requests

1. **Fork the repository**
   First, fork the repository at `https://github.com/dexilion-team/lastest.git` on GitHub. Then proceed to checkout your fork and install dependencies:

   ```bash
   git clone https://github.com/<your-username>/lastest.git
   cd lastest
   npm install
   ```

2. **Create a branch**
   ```bash
   git checkout -b <fix|feat|chore|docs|test|refactor>/<your-short-feature-name>
   ```

3. **Make your changes**
   - Follow the existing code style
   - Add tests for new functionality
   - Update documentation as needed
   - Run linter: `npm run lint`
   - Run tests: `npm test`
   - Build: `npm run build`

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

   Use conventional commit format:
   - `feat:` new feature
   - `fix:` bug fix
   - `docs:` documentation changes
   - `test:` test additions or changes
   - `refactor:` code refactoring
   - `chore:` maintenance tasks

5. **Push and create PR**
   ```bash
   git push origin <fix|feat|chore|docs|test|refactor>/<your-short-feature-name>
   ```
   Then open a pull request on GitHub.

### Development Setup

```bash
# Install dependencies
npm install

# Build the project
npm run build

# Run in development mode
npm run dev

# Run tests
npm test

# Lint code
npm run lint

# Format code
npm run format
```

### Testing Locally

To test the CLI locally:

```bash
npm run build
npm link
lastest init
```

## Project Structure

```
lastest/
├── src/
│   ├── cli.ts                    # CLI entry point
│   ├── commands/                 # Command implementations
│   │   ├── init.ts              # Full pipeline with setup
│   │   └── run.ts               # Fast re-run with cached tests
│   ├── scanner.ts                # Codebase scanner (with AI route detection)
│   ├── generator.ts              # Test generator orchestrator
│   ├── template-generator.ts     # Template-based test generator
│   ├── ai/                       # AI integrations
│   │   ├── claude-subscription.ts
│   │   └── copilot-subscription.ts
│   ├── runner.ts                 # Test runner
│   ├── differ.ts                 # Screenshot comparison
│   ├── reporter.ts               # Report generation
│   ├── config.ts                 # Configuration manager
│   ├── test-cache.ts             # Test cache persistence
│   ├── types.ts                  # TypeScript interfaces
│   └── utils/                    # Utility functions
├── tests/                        # Test files
├── examples/                     # Example projects
└── docs/                         # Documentation
```

## Key Architecture Patterns

### Test Generation Modes

**AI Mode (default):**
- Uses Claude or Copilot to generate custom tests
- Supports custom instructions for interactions
- Optional AI-powered route detection
- Requires AI provider authentication

**Template Mode:**
- Generates simple screenshot tests from templates
- No AI calls or costs
- Faster test generation
- No authentication required

### Route Detection Strategies

**Traditional Scanning:**
- Framework-specific pattern matching
- Glob patterns and regex
- Fast but may miss complex routes

**AI-Powered Detection:**
- Analyzes codebase files with AI
- Understands complex routing patterns
- Slower but more comprehensive
- Enabled via `useAIRouteDetection: true`

## Coding Standards

- Use TypeScript with strict mode
- Follow ESLint configuration
- Use Prettier for formatting
- Write descriptive variable and function names
- Add JSDoc comments for public APIs
- Keep functions small and focused
- Write tests for new features

## Questions?

Feel free to open a discussion or reach out via issues.

Thank you for contributing!
