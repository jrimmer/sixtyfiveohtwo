# Contributing to SixtyFiveOhTwo

Thank you for your interest in contributing to SixtyFiveOhTwo! This document provides guidelines and instructions for contributing.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [How to Contribute](#how-to-contribute)
- [Development Workflow](#development-workflow)
- [Pull Request Process](#pull-request-process)
- [Coding Standards](#coding-standards)
- [Commit Messages](#commit-messages)
- [Testing](#testing)
- [Project-Specific Guidelines](#project-specific-guidelines)

## Code of Conduct

- Be respectful and inclusive
- Provide constructive feedback
- Focus on the code, not the person
- Help maintain a welcoming environment for all contributors

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- Git

### Fork and Clone

1. **Fork the repository** on GitHub by clicking the "Fork" button

2. **Clone your fork** locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/sixtyfiveohtwo.git
   cd sixtyfiveohtwo
   ```

3. **Add the upstream remote**:
   ```bash
   git remote add upstream https://github.com/ORIGINAL_OWNER/sixtyfiveohtwo.git
   ```

4. **Install dependencies**:
   ```bash
   npm install
   ```

5. **Initialize the Proving Grounds database** (if working on that game):
   ```bash
   cd provinggrounds && npm run db:init && cd ..
   ```

## How to Contribute

### Reporting Bugs

Before submitting a bug report:
- Check existing issues to avoid duplicates
- Collect relevant information (browser, OS, steps to reproduce)

When submitting a bug report, include:
- Clear, descriptive title
- Steps to reproduce the issue
- Expected vs actual behavior
- Screenshots if applicable
- Browser and OS information

### Suggesting Features

Feature requests are welcome! Please include:
- Clear description of the feature
- Use case and motivation
- Any relevant examples or mockups

### Submitting Code

We accept contributions for:
- Bug fixes
- New features
- Documentation improvements
- Performance optimizations
- Test coverage improvements

## Development Workflow

### Keeping Your Fork Updated

```bash
# Fetch upstream changes
git fetch upstream

# Switch to main branch
git checkout main

# Merge upstream changes
git merge upstream/main

# Push to your fork
git push origin main
```

### Creating a Feature Branch

Always create a new branch for your work:

```bash
# Create and switch to a new branch
git checkout -b feature/your-feature-name

# Or for bug fixes
git checkout -b fix/bug-description
```

Branch naming conventions:
- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation changes
- `refactor/` - Code refactoring
- `test/` - Test additions or fixes

### Making Changes

1. Make your changes in small, logical commits
2. Write or update tests as needed
3. Ensure all tests pass
4. Update documentation if needed

## Pull Request Process

### Before Submitting

1. **Sync with upstream**:
   ```bash
   git fetch upstream
   git rebase upstream/main
   ```

2. **Run tests** for the affected game(s):
   ```bash
   # For Telengard
   cd telengard && npm run lint && npm run build

   # For Sabotage
   cd sabotage/sabotage-web && npm run lint && npm run build

   # For Proving Grounds
   cd provinggrounds && npm test
   ```

3. **Resolve any conflicts** with the main branch

### Submitting the PR

1. **Push your branch**:
   ```bash
   git push origin feature/your-feature-name
   ```

2. **Create a Pull Request** on GitHub

3. **Fill out the PR template** with:
   - Summary of changes
   - Related issue number (if applicable)
   - Type of change (bug fix, feature, etc.)
   - Testing performed
   - Screenshots (for UI changes)

### PR Review Process

1. A maintainer will review your PR
2. Address any requested changes
3. Once approved, a maintainer will merge your PR

### After Your PR is Merged

```bash
# Switch to main
git checkout main

# Delete your local branch
git branch -d feature/your-feature-name

# Delete remote branch
git push origin --delete feature/your-feature-name

# Update your local main
git pull upstream main
```

## Coding Standards

### General

- Use consistent indentation (2 spaces for JS/TS, 4 spaces for Python)
- Keep lines under 100 characters when practical
- Remove trailing whitespace
- End files with a newline

### JavaScript/TypeScript

- Use ES6+ features
- Prefer `const` over `let`, avoid `var`
- Use meaningful variable and function names
- Add JSDoc comments for public functions
- Follow existing code style in each project

### React Components

- Use functional components with hooks
- Keep components focused and single-purpose
- Extract reusable logic into custom hooks
- Use TypeScript interfaces for props

### CSS

- Use meaningful class names
- Prefer CSS variables for theming
- Keep specificity low
- Mobile-first responsive design

## Commit Messages

Follow the conventional commits format:

```
type(scope): brief description

[optional body]

[optional footer]
```

### Types

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Formatting, no code change
- `refactor` - Code restructuring
- `test` - Adding/updating tests
- `chore` - Maintenance tasks

### Examples

```
feat(telengard): add cloud save functionality

fix(sabotage): correct collision detection for paratroopers

docs: update README with deployment instructions

refactor(provinggrounds): extract combat logic into separate module
```

## Testing

### Writing Tests

- Write tests for new features
- Update tests when modifying existing functionality
- Aim for meaningful coverage, not 100%

### Running Tests

```bash
# Run tests for specific game only
cd telengard && npm test
cd sabotage/sabotage-web && npm test
cd provinggrounds && npm test
```

## Project-Specific Guidelines

### Telengard

- Preserve original game mechanics when possible
- Document any deviations from the original
- Test both ASCII and Modern renderers
- Verify save/load functionality

### Sabotage

- Maintain frame-rate consistency
- Test all three visual modes
- Preserve original physics and timing
- Test on multiple browsers

### Proving Grounds

- Follow Express.js best practices
- Use parameterized queries for database access
- Validate all user input
- Test WebSocket functionality

## Questions?

If you have questions about contributing, feel free to:
- Open a GitHub issue
- Reach out to maintainers

Thank you for contributing to SixtyFiveOhTwo!
