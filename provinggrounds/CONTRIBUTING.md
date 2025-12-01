# Contributing to The Proving Grounds BBS

Thanks for your interest in contributing! This project welcomes contributions from the community.

## How to Contribute

### 1. Fork the Repository

Click the "Fork" button at the top right of the repository page to create your own copy.

### 2. Clone Your Fork

```bash
git clone https://github.com/YOUR-USERNAME/provinggrounds.git
cd provinggrounds
```

### 3. Create a Branch

Create a branch for your feature or fix:

```bash
git checkout -b feature/your-feature-name
# or
git checkout -b fix/issue-description
```

### 4. Make Your Changes

- Install dependencies: `npm install`
- Initialize the database: `npm run db:init && npm run db:seed`
- Start the dev server: `npm run dev`
- Make your changes and test locally

### 5. Commit Your Changes

Write clear, concise commit messages:

```bash
git add .
git commit -m "Add feature: description of what you added"
```

### 6. Push to Your Fork

```bash
git push origin feature/your-feature-name
```

### 7. Submit a Pull Request

1. Go to your fork on GitHub
2. Click "Compare & pull request"
3. Describe your changes and why they should be merged
4. Submit the PR

## Guidelines

### Code Style

- Use consistent indentation (4 spaces)
- Follow existing patterns in the codebase
- Keep the retro BBS aesthetic in UI changes

### Commit Messages

- Use present tense ("Add feature" not "Added feature")
- Keep the first line under 72 characters
- Reference issues when applicable ("Fix #123")

### Pull Requests

- One feature/fix per PR
- Include a clear description of changes
- Test your changes locally before submitting
- Update documentation if needed

### Reporting Bugs

Open an issue with:
- Description of the bug
- Steps to reproduce
- Expected vs actual behavior
- Browser/Node version if relevant

### Feature Requests

Open an issue describing:
- The feature you'd like
- Why it would be useful
- How it fits with the BBS theme

## Development Setup

```bash
npm install
npm run db:init
npm run db:seed
npm run dev
```

The server runs at http://localhost:3000

## Questions?

Open an issue for any questions about contributing.
