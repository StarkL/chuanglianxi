import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Contact CRUD Flow', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    // After login, should be on contacts list (first tabBar page)
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  })

  test('create contact and verify it appears in list (onShow refresh)', async ({ page }) => {
    // Step 1: Click add contact button
    await page.locator('.fab').click()
    await page.waitForTimeout(1000)

    // Step 2: Fill in the form
    await page.locator('input').nth(0).fill('自动化测试')
    await page.locator('input').nth(1).fill('自动化公司')
    await page.locator('input').nth(2).fill('测试工程师')
    await page.locator('input').nth(3).fill('13900000001')

    // Step 3: Save
    await page.locator('.save-btn').click()
    await page.waitForTimeout(2000)

    // Step 4: Should be back on contacts list with new contact visible
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
    // New contact should appear - use first() to avoid strict mode
    await expect(page.getByText('自动化测试').first()).toBeVisible()
    await expect(page.getByText('自动化公司 · 测试工程师').first()).toBeVisible()
  })

  test('add button is visible on contacts page', async ({ page }) => {
    await expect(page.locator('.fab')).toBeVisible()
  })
})
