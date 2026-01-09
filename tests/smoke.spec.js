/**
 * Smoke Tests for SixtyFiveOhTwo
 *
 * Lightweight tests to verify deployment was successful.
 * Covers all major features across all apps.
 *
 * Run against local:
 *   npx playwright test tests/smoke.spec.js
 *
 * Run against production:
 *   BASE_URL=https://sixtyfiveohtwo.com npx playwright test tests/smoke.spec.js
 *
 * Run specific browser:
 *   npx playwright test tests/smoke.spec.js --project=chromium
 */

const { test, expect } = require('@playwright/test');

// Test users for authenticated features
// Note: TPro BBS has a seeded E2ETestUser, Proving Grounds does not
const TPRO_TEST_USER = { username: 'E2ETestUser', password: 'testpass123' };

// Helper to login to TPro BBS
async function loginTproBbs(page) {
    await page.goto('/tprobbs');
    await page.getByRole('textbox', { name: 'Username:' }).fill(TPRO_TEST_USER.username);
    await page.getByRole('textbox', { name: 'Password:' }).fill(TPRO_TEST_USER.password);
    await page.getByRole('button', { name: 'Login' }).click();
    await expect(page).toHaveTitle(/Main Menu/);
}


// ============================================================================
// LANDING PAGE
// ============================================================================

test.describe('Landing Page', () => {
    test('loads and displays menu', async ({ page }) => {
        await page.goto('/');
        await expect(page).toHaveTitle(/SixtyFiveOhTwo|6502/i);

        // Check main navigation links
        await expect(page.getByRole('link', { name: /Telengard/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Sabotage/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Proving Grounds/i })).toBeVisible();
        await expect(page.getByRole('link', { name: /Lost Gonzo|TPro/i })).toBeVisible();
    });

    test('health endpoint returns ok', async ({ request }) => {
        const response = await request.get('/health');
        expect(response.ok()).toBeTruthy();
        const json = await response.json();
        expect(json.status).toBe('ok');
    });
});

// ============================================================================
// TELENGARD (React SPA)
// ============================================================================

test.describe('Telengard', () => {
    test('loads game interface', async ({ page }) => {
        await page.goto('/telengard/');

        // Wait for React to hydrate - look for game UI elements
        await expect(page.locator('body')).not.toBeEmpty();

        // Check for game-specific elements (adjust based on actual UI)
        // The game should show either start screen or game interface
        await expect(page.locator('#root, #app, [data-testid="game"]')).toBeVisible({ timeout: 10000 });
    });

    test('serves static assets', async ({ request }) => {
        const response = await request.get('/telengard/');
        expect(response.ok()).toBeTruthy();
        expect(response.headers()['content-type']).toContain('text/html');
    });
});

// ============================================================================
// SABOTAGE (React SPA)
// ============================================================================

test.describe('Sabotage', () => {
    test('loads game interface', async ({ page }) => {
        await page.goto('/sabotage/');

        // Wait for React to hydrate
        await expect(page.locator('body')).not.toBeEmpty();

        // Check for game canvas (Sabotage uses canvas for rendering)
        await expect(page.locator('canvas')).toBeVisible({ timeout: 10000 });
    });

    test('serves static assets', async ({ request }) => {
        const response = await request.get('/sabotage/');
        expect(response.ok()).toBeTruthy();
        expect(response.headers()['content-type']).toContain('text/html');
    });
});

// ============================================================================
// PROVING GROUNDS (Express App)
// Note: No seeded test user, so only testing public pages
// ============================================================================

test.describe('Proving Grounds', () => {
    test('login page loads', async ({ page }) => {
        await page.goto('/provinggrounds/');
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /password/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Enter the Grounds/i })).toBeVisible();
    });

    test('registration page loads', async ({ page }) => {
        await page.goto('/provinggrounds/register');
        await expect(page.getByRole('heading', { name: /Create Your Character/i })).toBeVisible();
        await expect(page.getByRole('textbox', { name: /Character Name/i })).toBeVisible();
        await expect(page.getByRole('button', { name: /Create Character/i })).toBeVisible();
    });

    test('unauthenticated routes redirect to login', async ({ page }) => {
        // Try to access protected route
        await page.goto('/provinggrounds/main');

        // Should redirect to login page
        await expect(page).toHaveURL(/\/provinggrounds\/?$/);
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('CSS and JS assets load', async ({ request }) => {
        const cssResponse = await request.get('/provinggrounds/css/terminal.css');
        expect(cssResponse.ok()).toBeTruthy();

        const jsResponse = await request.get('/provinggrounds/js/terminal.js');
        expect(jsResponse.ok()).toBeTruthy();
    });
});

// ============================================================================
// TPRO BBS (Express App)
// ============================================================================

test.describe('TPro BBS', () => {
    test('login page loads', async ({ page }) => {
        await page.goto('/tprobbs/');
        await expect(page).toHaveTitle(/Lost Gonzo/i);
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
        await expect(page.getByRole('link', { name: /New User Registration/i })).toBeVisible();
    });

    test('registration page loads', async ({ page }) => {
        await page.goto('/tprobbs/register');
        await expect(page).toHaveTitle(/Registration/i);
        await expect(page.getByRole('textbox', { name: /Username/i })).toBeVisible();
        await expect(page.getByLabel('Character Class:')).toBeVisible();
    });

    test('login and access main menu', async ({ page }) => {
        await loginTproBbs(page);

        // Verify character stats displayed
        await expect(page.getByText('Character:', { exact: true })).toBeVisible();
        await expect(page.getByText('Level:', { exact: true })).toBeVisible();
        await expect(page.getByText('Gold:', { exact: true })).toBeVisible();
    });

    test('stores accessible after login', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/stores');

        await expect(page.getByText('TOWN SQUARE')).toBeVisible();
        await expect(page.getByRole('link', { name: 'Weapon Shop' })).toBeVisible();
        await expect(page.getByRole('link', { name: 'Bank' })).toBeVisible();
    });

    test('combat menu accessible after login', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/combat');

        await expect(page.getByText(/Combat Menu/i)).toBeVisible();
        await expect(page.getByRole('link', { name: /Dungeon/i })).toBeVisible();
    });

    test('casino accessible after login', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/games');

        await expect(page.getByText("GONZO'S CASINO")).toBeVisible();
        await expect(page.getByRole('link', { name: 'Slot Machine' })).toBeVisible();
    });

    test('message boards accessible after login', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/boards');

        // Page title contains "Message Boards" in ASCII art header
        await expect(page.locator('pre')).toContainText('Message Boards');
    });

    test('gang headquarters accessible after login', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/gangs');

        // Page has "GANG HQ" header and "Active Gangs" section
        await expect(page.locator('pre')).toContainText('GANG HQ');
        await expect(page.getByRole('heading', { name: 'Active Gangs' })).toBeVisible();
    });

    test('email system accessible after login', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/email');

        // Page has "Electronic Mail" header
        await expect(page.locator('pre')).toContainText('Electronic Mail');
        await expect(page.getByRole('link', { name: 'Compose New' })).toBeVisible();
    });

    test('logout works', async ({ page }) => {
        await loginTproBbs(page);
        await page.goto('/tprobbs/logout');

        // Should be back at login
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });
});

// ============================================================================
// CROSS-APP NAVIGATION
// ============================================================================

test.describe('Cross-App Navigation', () => {
    test('can navigate from landing to each app', async ({ page }) => {
        await page.goto('/');

        // Navigate to Telengard
        await page.getByRole('link', { name: /Telengard/i }).click();
        await expect(page).toHaveURL(/\/telengard/);

        // Navigate back and to Sabotage
        await page.goto('/');
        await page.getByRole('link', { name: /Sabotage/i }).click();
        await expect(page).toHaveURL(/\/sabotage/);

        // Navigate back and to Proving Grounds
        await page.goto('/');
        await page.getByRole('link', { name: /Proving Grounds/i }).click();
        await expect(page).toHaveURL(/\/provinggrounds/);

        // Navigate back and to TPro BBS
        await page.goto('/');
        await page.getByRole('link', { name: /Lost Gonzo|TPro/i }).click();
        await expect(page).toHaveURL(/\/tprobbs/);
    });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

test.describe('Error Handling', () => {
    test('404 returns landing page', async ({ page }) => {
        const response = await page.goto('/nonexistent-page-xyz');
        expect(response.status()).toBe(404);

        // Should show landing page content
        await expect(page.getByRole('link', { name: /Telengard/i })).toBeVisible();
    });

    test('invalid tprobbs route redirects to login', async ({ page }) => {
        await page.goto('/tprobbs/main');

        // Should redirect to login (not authenticated)
        await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
    });

    test('invalid provinggrounds route redirects to login', async ({ page }) => {
        await page.goto('/provinggrounds/main');

        // Should redirect to login (not authenticated)
        await expect(page.getByRole('textbox', { name: /username/i })).toBeVisible();
    });
});
