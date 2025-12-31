import { test, expect } from '@playwright/test';

test.describe('SixtyFiveOhTwo - Homepage', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should load homepage with correct title', async ({ page }) => {
    await expect(page).toHaveTitle('SixtyFiveOhTwo - Classic 6502 Games');
  });

  test('should display main logo and branding', async ({ page }) => {
    // Check for the ASCII art logo
    await expect(page.locator('text=6502')).toBeVisible();
    await expect(page.locator('text=SIXTYFIVEOHTWO')).toBeVisible();
  });

  test('should display all game options', async ({ page }) => {
    // Check for the "SELECT PROGRAM:" heading
    await expect(
      page.locator('heading:has-text("SELECT PROGRAM:")')
    ).toBeVisible();

    // Verify all three games are listed
    await expect(page.locator('a[href="/telengard/"]')).toContainText(
      'TELENGARD'
    );
    await expect(page.locator('a[href="/provinggrounds/"]')).toContainText(
      'THE PROVING GROUNDS'
    );
    await expect(page.locator('a[href="/sabotage/"]')).toContainText(
      'SABOTAGE'
    );
  });

  test('should display game descriptions', async ({ page }) => {
    await expect(
      page.locator('text=Dungeon crawler RPG (Avalon Hill, 1982)')
    ).toBeVisible();
    await expect(
      page.locator('text=Classic BBS door game recreation')
    ).toBeVisible();
    await expect(
      page.locator('text=Defend your base from paratroopers')
    ).toBeVisible();
  });

  test('should show SABOTAGE as under construction', async ({ page }) => {
    await expect(page.locator('text=[UNDER CONSTRUCTION]')).toBeVisible();
  });

  test('should display credits and greets', async ({ page }) => {
    await expect(page.locator('text=GREETS FLY OUT TO:')).toBeVisible();
    await expect(
      page.locator(
        'text=THE STACK · APPLE MAFIA · DIGITAL GANG · MIDWEST PIRATES'
      )
    ).toBeVisible();
  });

  test('should have GitHub link', async ({ page }) => {
    const githubLink = page.locator('a:has-text("View on GitHub")');
    await expect(githubLink).toBeVisible();
    await expect(githubLink).toHaveAttribute(
      'href',
      'https://github.com/jrimmer/sixtyfiveohtwo'
    );
  });

  test('should display Apple II boot screen elements', async ({ page }) => {
    await expect(page.locator("text=APPLE ][")).toBeVisible();
    await expect(page.locator('text=CHECKING MEMORY... 48K OK')).toBeVisible();
    await expect(page.locator('text=LOADING SIXTYFIVEOHTWO')).toBeVisible();
  });
});

test.describe('SixtyFiveOhTwo - Telengard Game', () => {
  test('should navigate to Telengard game', async ({ page }) => {
    await page.goto('/');

    // Click on Telengard link
    await page.click('a[href="/telengard/"]');

    // Wait for navigation
    await page.waitForURL('**/telengard/**');

    // Verify we're on the Telengard page
    await expect(page).toHaveTitle('telengard');
  });

  test('should display Telengard title screen', async ({ page }) => {
    await page.goto('/telengard/');

    // Check for Telengard ASCII logo
    await expect(page.locator('text=TELENGARD')).toBeVisible();

    // Check for version and copyright
    await expect(page.locator('text=V1.12 - Web Edition')).toBeVisible();
    await expect(
      page.locator('text=Original (C) 1982 Avalon Hill')
    ).toBeVisible();
  });

  test('should show start game button', async ({ page }) => {
    await page.goto('/telengard/');

    // Check for "START A NEW CHARACTER" button
    await expect(
      page.locator('button:has-text("(S)TART A NEW CHARACTER")')
    ).toBeVisible();
  });

  test('should start character creation flow', async ({ page }) => {
    await page.goto('/telengard/');

    // Press 'S' to start
    await page.keyboard.press('s');

    // Wait for character creation screen
    await expect(page.locator('text=CREATE YOUR CHARACTER')).toBeVisible({
      timeout: 5000,
    });

    // Verify character stats are displayed
    await expect(page.locator('text=STRENGTH')).toBeVisible();
    await expect(page.locator('text=INTELLIGENCE')).toBeVisible();
    await expect(page.locator('text=WISDOM')).toBeVisible();
    await expect(page.locator('text=CONSTITUTION')).toBeVisible();
    await expect(page.locator('text=DEXTERITY')).toBeVisible();
    await expect(page.locator('text=CHARISMA')).toBeVisible();
  });

  test('should proceed through character creation', async ({ page }) => {
    await page.goto('/telengard/');

    // Start character creation
    await page.keyboard.press('s');
    await expect(page.locator('text=CREATE YOUR CHARACTER')).toBeVisible({
      timeout: 5000,
    });

    // Accept stats
    await page.keyboard.press('y');

    // Should prompt for name
    await expect(page.locator('text=ENTER YOUR NAME:')).toBeVisible({
      timeout: 3000,
    });
    await expect(page.locator('text=PRESS <RET> WHEN DONE')).toBeVisible();
  });
});

test.describe('SixtyFiveOhTwo - The Proving Grounds', () => {
  test('should navigate to The Proving Grounds', async ({ page }) => {
    await page.goto('/');

    // Click on The Proving Grounds link
    await page.click('a[href="/provinggrounds/"]');

    // Wait for navigation
    await page.waitForURL('**/provinggrounds/**');
  });

  test('should have The Proving Grounds in navigation', async ({ page }) => {
    await page.goto('/');

    const provingGroundsLink = page.locator(
      'a:has-text("THE PROVING GROUNDS")'
    );
    await expect(provingGroundsLink).toBeVisible();
    await expect(provingGroundsLink).toHaveAttribute(
      'href',
      '/provinggrounds/'
    );
  });
});

test.describe('SixtyFiveOhTwo - Navigation & Keyboard', () => {
  test('should support keyboard navigation for game selection', async ({
    page,
  }) => {
    await page.goto('/');

    // Verify selection prompt
    await expect(page.locator('text=ENTER SELECTION (1-3):')).toBeVisible();
  });

  test('should handle back navigation', async ({ page }) => {
    await page.goto('/');

    // Navigate to a game
    await page.click('a[href="/telengard/"]');
    await page.waitForURL('**/telengard/**');

    // Go back
    await page.goBack();

    // Should be back on home page
    await expect(page.locator('text=SELECT PROGRAM:')).toBeVisible();
  });
});

test.describe('SixtyFiveOhTwo - Responsive Design', () => {
  test('should display properly on mobile viewport', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    // Main elements should still be visible
    await expect(page.locator('text=6502')).toBeVisible();
    await expect(page.locator('text=SELECT PROGRAM:')).toBeVisible();
  });

  test('should display properly on tablet viewport', async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');

    await expect(page.locator('text=TELENGARD')).toBeVisible();
    await expect(page.locator('text=THE PROVING GROUNDS')).toBeVisible();
  });
});

test.describe('SixtyFiveOhTwo - External Links', () => {
  test('should have correct GitHub repository link', async ({ page }) => {
    await page.goto('/');

    const githubLink = page.locator(
      'a[href="https://github.com/jrimmer/sixtyfiveohtwo"]'
    );
    await expect(githubLink).toBeVisible();
  });
});

test.describe('SixtyFiveOhTwo - Accessibility', () => {
  test('should have accessible navigation links', async ({ page }) => {
    await page.goto('/');

    // All game links should be keyboard accessible
    const telengardLink = page.locator('a[href="/telengard/"]');
    await telengardLink.focus();
    await expect(telengardLink).toBeFocused();
  });

  test('should have semantic HTML structure', async ({ page }) => {
    await page.goto('/');

    // Check for proper navigation element
    const nav = page.locator('navigation');
    await expect(nav).toBeVisible();

    // Check for proper heading structure
    const heading = page.locator('heading:has-text("SELECT PROGRAM:")');
    await expect(heading).toBeVisible();
  });
});
