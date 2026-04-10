const { test, expect } = require('@playwright/test');

test.describe('Waterpark Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Using port 3001 with the new dev-server.js bridge
    await page.goto('http://localhost:3001');
  });

  test('should open booking modal and navigate through steps', async ({ page }) => {
    // 1. Open Modal
    const ticketsBtn = page.locator('text=Tickets').first();
    await ticketsBtn.click();
    await expect(page.locator('#booking-modal')).toBeVisible();

    // 2. Select a Date (Step 1)
    // Find an enabled calendar day
    const enabledDay = page.locator('.calendar-day:not(.disabled)').first();
    await enabledDay.click();
    await page.click('button:has-text("Proceed")');

    // 3. Add Tickets (Step 2)
    // Click ADD for Waterpark
    const addWaterpark = page.locator('.btn-add[data-ticket="waterpark"]');
    await addWaterpark.click();
    
    // Check if quantity updated
    const qtyWaterpark = page.locator('#qty-waterpark');
    await expect(qtyWaterpark).toHaveText('1');

    // Check if Footer Total is visible and correct
    const footerTotal = page.locator('#booking-total');
    await expect(footerTotal).toContainText('₹599');

    // 4. Navigate to Billing (Step 3)
    const proceedToBilling = page.locator('.btn-proceed');
    await proceedToBilling.click();

    // Check if Summary shows the correct date/total
    await expect(page.locator('#summary-total')).toContainText('₹599');
    await expect(page.locator('input[placeholder="Full Name*"]')).toBeVisible();
  });

  test('should accurately calculate group offer (Buy 4 Get 1 Free)', async ({ page }) => {
    await page.locator('text=Tickets').first().click();
    await page.locator('.calendar-day:not(.disabled)').first().click();
    await page.click('button:has-text("Proceed")');

    // Click Group ADD button
    const groupAdd = page.locator('.btn-add[data-ticket="group"]');
    await groupAdd.click();
    
    // Add 4 more (total 5) to trigger free ticket
    const groupPlus = page.locator('.qty-btn').nth(13); // Index for Group + button
    for(let i=0; i<4; i++) {
        await groupPlus.click();
    }

    // Total should be 4 * 499 = 1996 (5th one free)
    const footerTotal = page.locator('#booking-total');
    await expect(footerTotal).toContainText('₹1,996');
  });
});
