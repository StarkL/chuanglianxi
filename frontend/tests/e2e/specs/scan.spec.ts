import { test, expect } from '@playwright/test'

test.describe('Scan Page', () => {
  test.beforeEach(async ({ page }) => {
    // Login first via mock
    await page.goto('/')
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)
  })

  test('scan page renders with empty state and action button', async ({ page }) => {
    // Navigate to scan page
    await page.goto('/#/pages/ocr/scan/scan')
    await page.waitForTimeout(1500)

    // Should show empty state
    await expect(page.getByText('拍照或从相册选择名片')).toBeVisible()

    // Should show action button
    await expect(page.getByText('选择图片')).toBeVisible()
  })

  test('scan page has correct navigation bar title', async ({ page }) => {
    await page.goto('/#/pages/ocr/scan/scan')
    await page.waitForTimeout(1500)

    // Navigation bar should show "扫描名片"
    await expect(page.getByText('扫描名片')).toBeVisible()
  })
})
