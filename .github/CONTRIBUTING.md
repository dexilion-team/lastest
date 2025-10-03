# Contributing to lastest

Thank you for your interest in contributing to lastest! This document provides guidelines and instructions for contributing.

## Code of Conduct

Be respectful, inclusive, and professional in all interactions.

## How to Contribute

### Reporting Bugs

1. Check if the bug has already been reported in [Issues](https://github.com/yourusername/lastest/issues)
2. Use the bug report template
3. Include:
   - Node.js version
   - Operating system
   - Steps to reproduce
   - Expected vs actual behavior
   - Error messages and logs

### Suggesting Features

1. Check existing [Issues](https://github.com/yourusername/lastest/issues) for similar suggestions
2. Use the feature request template
3. Clearly describe:
   - The problem you're trying to solve
   - Your proposed solution
   - Alternative solutions considered
   - Example use cases

### Pull Requests

1. **Fork the repository**
   ```bash
   git clone https://github.com/yourusername/lastest.git
   cd lastest
   npm install
   ```

2. **Create a branch**
   ```bash
   git checkout -b feature/your-feature-name
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
   git push origin feature/your-feature-name
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
│   ├── cli.ts              # CLI entry point
│   ├── commands/           # Command implementations
│   ├── scanner.ts          # Codebase scanner
│   ├── ai/                 # AI integrations
│   ├── runner.ts           # Test runner
│   ├── differ.ts           # Screenshot comparison
│   ├── reporter.ts         # Report generation
│   └── utils/              # Utility functions
├── tests/                  # Test files
├── examples/               # Example projects
└── docs/                   # Documentation
```

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
