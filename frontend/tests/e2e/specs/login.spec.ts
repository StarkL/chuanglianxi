import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('shows login page and can complete registration', async ({ page }) => {
    await page.goto('/')

    // Should show login page
    await expect(page.getByText('常联系', { exact: true })).toBeVisible()

    // Should show privacy agreement text
    await expect(page.getByText('用户协议')).toBeVisible()
    await expect(page.getByText('隐私政策')).toBeVisible()

    // Click policy agreement checkbox
    await page.locator('.checkbox').first().click()
    await page.waitForTimeout(200)

    // Toggle to registration tab
    await page.getByText('用户注册').click()
    await page.waitForTimeout(500)

    // Fill in registration form
    const randomUsername = `testuser_${Math.floor(Math.random() * 1000000)}`
    await page.locator('input').nth(0).fill(randomUsername)
    await page.locator('input').nth(2).fill('123456')

    // Click submit registration
    await page.locator('.login-btn').click()
    await page.waitForTimeout(2000)

    // Should navigate to contacts list (first tabBar page)
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  })
})
