import { test, expect } from '@playwright/test'

test.describe('UI Design - Contact Form (New)', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)
  })

  test('add contact form displays with new card layout', async ({ page }) => {
    await page.locator('.fab').click()
    await page.waitForTimeout(500)

    // Check form groups exist
    await expect(page.getByText('基本信息').first()).toBeVisible()
    await expect(page.getByText('联系方式').first()).toBeVisible()
    await expect(page.getByText('标签').first()).toBeVisible()
    await expect(page.getByText('生日').first()).toBeVisible()

    // Check form inputs
    const nameInput = page.locator('input[placeholder="请输入姓名"]').first()
    await expect(nameInput).toBeVisible()

    const companyInput = page.locator('input[placeholder="请输入公司名称"]').first()
    await expect(companyInput).toBeVisible()
  })

  test('create contact with new form and verify', async ({ page }) => {
    await page.locator('.fab').click()
    await page.waitForTimeout(500)

    // Fill name
    await page.locator('input[placeholder="请输入姓名"]').first().fill('李设计')
    await page.locator('input[placeholder="请输入公司名称"]').first().fill('设计公司')

    // Select a tag
    await page.locator('.preset-tag').filter({ hasText: '工作' }).first().click()
    await page.waitForTimeout(200)

    // Save using the new save button
    await page.locator('.save-btn').click()
    await page.waitForTimeout(1500)

    // Verify contact appears in list
    await expect(page.getByText('李设计').first()).toBeVisible()
    await expect(page.getByText('设计公司').first()).toBeVisible()
  })

  test('contact card displays new gradient header', async ({ page }) => {
    // Create a contact first
    await page.locator('.fab').click()
    await page.waitForTimeout(500)
    await page.locator('input[placeholder="请输入姓名"]').first().fill('王卡片')
    await page.locator('.save-btn').click()
    await page.waitForTimeout(1500)

    // Click on the contact
    await page.getByText('王卡片').first().click()
    await page.waitForTimeout(500)

    // Verify gradient header exists
    await expect(page.locator('.profile-header')).toBeVisible()

    // Take screenshot for visual regression
    await page.locator('.profile-header').screenshot({
      path: 'tests/e2e/screenshots/ui-test/contact-detail-header.png'
    })
  })

  test('reminder list shows new stat cards', async ({ page }) => {
    // Navigate to reminders
    await page.locator('.uni-tabbar__label').filter({ hasText: '提醒' }).click()
    await page.waitForTimeout(500)

    // Check stat overview cards exist
    await expect(page.locator('.stat-card')).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/ui-test/reminders-new.png'
    })
  })

  test('mine page shows new gradient user card', async ({ page }) => {
    // Navigate to mine
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(500)

    // Check user section with gradient
    await expect(page.locator('.user-section')).toBeVisible()

    // Take screenshot
    await page.screenshot({
      path: 'tests/e2e/screenshots/ui-test/mine-new.png'
    })
  })
})
