# Testing

TPro BBS uses Playwright for end-to-end testing.

## Prerequisites

```bash
# Install Playwright browsers (if not already installed)
npx playwright install

# Initialize/reset database before running tests
cd tprobbs && node src/db/init.js
```

## Running Tests

### All TPro BBS Tests

```bash
# From project root
npx playwright test tprobbs/tests/e2e.spec.js
```

### With Visible Browser

```bash
npx playwright test tprobbs/tests/e2e.spec.js --headed
```

### With Playwright UI (Debugging)

```bash
npx playwright test tprobbs/tests/e2e.spec.js --ui
```

### Specific Test by Name

```bash
npx playwright test -g "should spin slot machine"
npx playwright test -g "should login with valid credentials"
```

### Specific Browser

```bash
npx playwright test tprobbs/tests/e2e.spec.js --project=chromium
npx playwright test tprobbs/tests/e2e.spec.js --project=firefox
npx playwright test tprobbs/tests/e2e.spec.js --project=webkit
```

## Test Coverage

The E2E suite covers:

### Authentication
- Login page display
- New user registration
- Login with valid credentials
- Rejection of invalid credentials

### Main Menu
- Character stats display
- All menu sections visible
- Navigation to Message Boards
- Navigation to Combat Menu
- Navigation to Town Square
- Navigation to Casino

### Stores
- Town Square menu display
- Weapon shop with items
- Armor shop with items
- Healer services
- Bank interface

### Combat
- Combat menu display
- Dungeon entry
- Dungeon navigation options

### Casino Games
- Casino menu display
- Slot machine display
- Slot machine gameplay

### Gangs
- Gang headquarters display

### System
- Voting booth
- System info
- Members list
- Logout functionality

## Test Configuration

Tests use the Playwright config at the project root:

```typescript
// playwright.config.ts
export default defineConfig({
  testDir: './',
  testMatch: ['**/tests/**/*.spec.js', '**/tests/**/*.spec.ts'],
  webServer: {
    command: 'npm start',
    port: 3000,
    reuseExistingServer: true,
  },
  // ...
});
```

The server starts automatically when running tests (unless already running).

## Test User

Tests use a dedicated test user:

```javascript
const TEST_USER = {
    username: 'E2ETestUser',
    password: 'testpass123'
};
```

**Important:** Reset the database between test runs for a clean state:

```bash
cd tprobbs && node src/db/init.js
```

## Writing New Tests

### Test Structure

```javascript
test.describe('Feature Name', () => {
    test.beforeEach(async ({ page }) => {
        // Login before each test
        await page.goto(BASE_URL);
        await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
        await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
        await page.getByRole('button', { name: 'Login' }).click();
    });

    test('should do something', async ({ page }) => {
        await page.goto(`${BASE_URL}/some-page`);
        await expect(page.getByText('Expected Text')).toBeVisible();
    });
});
```

### Common Patterns

```javascript
// Navigate and verify URL
await page.getByRole('link', { name: 'Menu Item' }).click();
await expect(page).toHaveURL(/\/expected-path/);

// Fill and submit form
await page.getByRole('textbox', { name: 'Field:' }).fill('value');
await page.getByRole('button', { name: 'Submit' }).click();

// Verify content
await expect(page.getByText('Success')).toBeVisible();
await expect(page.getByRole('heading', { name: 'Title' })).toBeVisible();
```

## Debugging Failed Tests

1. Run with `--headed` to see the browser
2. Run with `--ui` for step-by-step debugging
3. Check `playwright-report/` for HTML report after failures
4. Screenshots are captured automatically on failure
