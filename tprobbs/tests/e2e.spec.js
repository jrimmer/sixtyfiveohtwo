/**
 * TPro BBS End-to-End Tests
 *
 * Run with: npx playwright test tprobbs/tests/e2e.spec.js
 *
 * Prerequisites:
 *   1. Initialize database: cd tprobbs && node src/db/init.js
 *   2. Start server: node server.js
 */

const { test, expect } = require('@playwright/test');

const BASE_URL = 'http://localhost:3000/tprobbs';
const TEST_USER = {
    username: 'E2ETestUser',
    password: 'testpass123'
};

test.describe('TPro BBS', () => {

    test.describe('Authentication', () => {

        test('should show login page', async ({ page }) => {
            await page.goto(BASE_URL);
            await expect(page).toHaveTitle('Lost Gonzo BBS');
            await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'New User Registration' })).toBeVisible();
        });

        test('should register a new user', async ({ page }) => {
            await page.goto(`${BASE_URL}/register`);
            await expect(page).toHaveTitle('New User Registration');

            // Fill registration form
            await page.getByRole('textbox', { name: /Username/ }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: /Password/ }).fill(TEST_USER.password);
            await page.getByLabel('Character Class:').selectOption('Barbarian');

            // Submit
            await page.getByRole('button', { name: 'Create Character' }).click();

            // Should redirect to login with success message
            await expect(page.getByText('Registration successful')).toBeVisible();
        });

        test('should login with valid credentials', async ({ page }) => {
            await page.goto(BASE_URL);

            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();

            // Should be on main menu
            await expect(page).toHaveTitle('Main Menu - Lost Gonzo BBS');
            await expect(page.getByText(TEST_USER.username)).toBeVisible();
        });

        test('should reject invalid credentials', async ({ page }) => {
            await page.goto(BASE_URL);

            await page.getByRole('textbox', { name: 'Username:' }).fill('nonexistent');
            await page.getByRole('textbox', { name: 'Password:' }).fill('wrongpass');
            await page.getByRole('button', { name: 'Login' }).click();

            // Should show error
            await expect(page.getByText(/Invalid/i)).toBeVisible();
        });
    });

    test.describe('Main Menu', () => {

        test.beforeEach(async ({ page }) => {
            // Login before each test
            await page.goto(BASE_URL);
            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();
            await expect(page).toHaveTitle('Main Menu - Lost Gonzo BBS');
        });

        test('should display character stats', async ({ page }) => {
            await expect(page.getByText('Character:')).toBeVisible();
            await expect(page.getByText('Class:')).toBeVisible();
            await expect(page.getByText('Level:')).toBeVisible();
            await expect(page.getByText('Gold:')).toBeVisible();
            await expect(page.getByText('HP:')).toBeVisible();
        });

        test('should have all menu sections', async ({ page }) => {
            await expect(page.getByRole('heading', { name: 'Communication' })).toBeVisible();
            await expect(page.getByRole('heading', { name: 'Adventure' })).toBeVisible();
            await expect(page.getByRole('heading', { name: 'Entertainment' })).toBeVisible();
            await expect(page.getByRole('heading', { name: 'System' })).toBeVisible();
        });

        test('should navigate to Message Boards', async ({ page }) => {
            await page.getByRole('link', { name: 'Message Boards' }).click();
            await expect(page).toHaveURL(/\/boards/);
        });

        test('should navigate to Combat Menu', async ({ page }) => {
            await page.getByRole('link', { name: 'Combat Menu' }).click();
            await expect(page).toHaveURL(/\/combat/);
        });

        test('should navigate to Town Square', async ({ page }) => {
            await page.getByRole('link', { name: 'Town Square' }).click();
            await expect(page).toHaveURL(/\/stores/);
        });

        test('should navigate to Casino', async ({ page }) => {
            await page.getByRole('link', { name: 'Casino' }).click();
            await expect(page).toHaveURL(/\/games/);
        });
    });

    test.describe('Stores', () => {

        test.beforeEach(async ({ page }) => {
            await page.goto(BASE_URL);
            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();
            await page.goto(`${BASE_URL}/stores`);
        });

        test('should display Town Square menu', async ({ page }) => {
            await expect(page.getByText('TOWN SQUARE')).toBeVisible();
            await expect(page.getByRole('link', { name: 'Weapon Shop' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Armor Shop' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Magic Shop' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Healer' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Bank' })).toBeVisible();
        });

        test('should display weapon shop with items', async ({ page }) => {
            await page.getByRole('link', { name: 'Weapon Shop' }).click();
            await expect(page.getByText('WEAPON SHOP')).toBeVisible();
            await expect(page.getByText('Current Weapon:')).toBeVisible();

            // Should have weapon table
            await expect(page.getByRole('table')).toBeVisible();
            await expect(page.getByText('Hands')).toBeVisible(); // Starting weapon
        });

        test('should display armor shop with items', async ({ page }) => {
            await page.getByRole('link', { name: 'Armor Shop' }).click();
            await expect(page.getByText('ARMOR SHOP')).toBeVisible();
            await expect(page.getByRole('table')).toBeVisible();
        });

        test('should display healer services', async ({ page }) => {
            await page.getByRole('link', { name: 'Healer' }).click();
            await expect(page.getByText('THE HEALER')).toBeVisible();
            await expect(page.getByText('HP:')).toBeVisible();
            await expect(page.getByText('SP:')).toBeVisible();
        });

        test('should display bank interface', async ({ page }) => {
            await page.getByRole('link', { name: 'Bank' }).click();
            await expect(page.getByText('GONZO BANK')).toBeVisible();
            await expect(page.getByText('Gold on Hand:')).toBeVisible();
            await expect(page.getByText('Gold in Bank:')).toBeVisible();
            await expect(page.getByRole('button', { name: 'Deposit' })).toBeVisible();
            await expect(page.getByRole('button', { name: 'Withdraw' })).toBeVisible();
        });
    });

    test.describe('Combat', () => {

        test.beforeEach(async ({ page }) => {
            await page.goto(BASE_URL);
            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();
            await page.goto(`${BASE_URL}/combat`);
        });

        test('should display combat menu', async ({ page }) => {
            await expect(page.getByText('Combat Menu')).toBeVisible();
            await expect(page.getByRole('link', { name: 'Enter Dungeon' })).toBeVisible();
            await expect(page.getByRole('link', { name: /Arena/i })).toBeVisible();
        });

        test('should enter dungeon', async ({ page }) => {
            await page.getByRole('link', { name: 'Enter Dungeon' }).click();
            await expect(page.getByText('THE DUNGEON')).toBeVisible();
            await expect(page.getByText(/Level \d+, Room \d+/)).toBeVisible();
        });

        test('should have dungeon navigation options', async ({ page }) => {
            await page.getByRole('link', { name: 'Enter Dungeon' }).click();
            await expect(page.getByRole('button', { name: /Move Forward/i })).toBeVisible();
            await expect(page.getByRole('button', { name: /Go Deeper/i })).toBeVisible();
            await expect(page.getByRole('link', { name: /Leave Dungeon/i })).toBeVisible();
        });
    });

    test.describe('Casino Games', () => {

        test.beforeEach(async ({ page }) => {
            await page.goto(BASE_URL);
            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();
            await page.goto(`${BASE_URL}/games`);
        });

        test('should display casino menu', async ({ page }) => {
            await expect(page.getByText("GONZO'S CASINO")).toBeVisible();
            await expect(page.getByRole('link', { name: 'Blackjack' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Slot Machine' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'Craps' })).toBeVisible();
            await expect(page.getByRole('link', { name: 'High-Low' })).toBeVisible();
        });

        test('should display slot machine', async ({ page }) => {
            await page.getByRole('link', { name: 'Slot Machine' }).click();
            await expect(page.getByText('SLOT MACHINE')).toBeVisible();
            await expect(page.getByText('Payouts')).toBeVisible();
            await expect(page.getByRole('button', { name: /Pull Lever/i })).toBeVisible();
        });

        test('should spin slot machine', async ({ page }) => {
            // Give player gold first via direct DB or assume they have some
            await page.getByRole('link', { name: 'Slot Machine' }).click();

            // Set bet amount
            await page.getByRole('spinbutton', { name: /Bet Amount/i }).fill('10');

            // Spin
            await page.getByRole('button', { name: /Pull Lever/i }).click();

            // Should show results (reels displayed)
            await expect(page.locator('pre')).toContainText(/\+-------\+/);
        });
    });

    test.describe('Gangs', () => {

        test.beforeEach(async ({ page }) => {
            await page.goto(BASE_URL);
            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();
            await page.goto(`${BASE_URL}/gangs`);
        });

        test('should display gang headquarters', async ({ page }) => {
            await expect(page.getByText(/Gang/i)).toBeVisible();
            await expect(page.getByRole('link', { name: /Create/i })).toBeVisible();
        });
    });

    test.describe('System', () => {

        test.beforeEach(async ({ page }) => {
            await page.goto(BASE_URL);
            await page.getByRole('textbox', { name: 'Username:' }).fill(TEST_USER.username);
            await page.getByRole('textbox', { name: 'Password:' }).fill(TEST_USER.password);
            await page.getByRole('button', { name: 'Login' }).click();
        });

        test('should display voting booth', async ({ page }) => {
            await page.goto(`${BASE_URL}/main/vote`);
            await expect(page.getByText('VOTING BOOTH')).toBeVisible();
        });

        test('should display system info', async ({ page }) => {
            await page.goto(`${BASE_URL}/main/info`);
            await expect(page.getByText(/Information/i)).toBeVisible();
        });

        test('should display members list', async ({ page }) => {
            await page.goto(`${BASE_URL}/main/members`);
            await expect(page.getByText(/Members/i)).toBeVisible();
        });

        test('should logout', async ({ page }) => {
            await page.getByRole('link', { name: /Quit/i }).click();
            // Should be back at login
            await expect(page.getByRole('heading', { name: 'Login' })).toBeVisible();
        });
    });
});
