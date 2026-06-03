import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Card Wall', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('card wall renders with empty state and action button', async ({ page }) => {
    // Navigate to card wall
    await page.goto('/crm/#/pages/ocr/cards/cards')
    await page.waitForTimeout(1500)

    // Should show empty state
    await expect(page.getByText('还没有名片')).toBeVisible()

    // Should show action button
    await expect(page.getByText('扫描名片')).toBeVisible()
  })

  test('card wall has correct navigation bar title', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/cards/cards')
    await page.waitForTimeout(1500)

    // Navigation bar should show "名片墙"
    await expect(page.getByText('名片墙')).toBeVisible()
  })
})
