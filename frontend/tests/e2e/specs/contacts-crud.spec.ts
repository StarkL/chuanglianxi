import { test, expect } from '@playwright/test'

test.describe('Contact CRUD Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Login first via mock
    await page.goto('/')
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)
    // After login, should be on contacts list (first tabBar page)
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  })

  test('create contact and verify it appears in list (onShow refresh)', async ({ page }) => {
    // Step 1: Click add contact button via evaluate to avoid interception
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('.add-btn, .wd-button')
      for (const btn of buttons) {
        if (btn.textContent?.includes('添加联系人')) {
          ;(btn as HTMLElement).click()
          return true
        }
      }
      return false
    })
    await page.waitForTimeout(1000)

    // Step 2: Fill in the form — inputs in order: name, company, title, phone
    const textInputs = page.locator('input[type="text"]')
    const phoneInput = page.locator('input[type="number"]')

    await textInputs.nth(0).fill('自动化测试')
    await textInputs.nth(1).fill('自动化公司')
    await textInputs.nth(2).fill('测试工程师')
    await phoneInput.fill('13900000001')

    // Step 3: Save
    await page.evaluate(() => {
      const buttons = document.querySelectorAll('uni-button, button, .wd-button')
      for (const btn of buttons) {
        if (btn.textContent?.includes('保存')) {
          ;(btn as HTMLElement).click()
          return true
        }
      }
      return false
    })
    await page.waitForTimeout(2000)

    // Step 4: Should be back on contacts list with new contact visible
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
    // New contact should appear - use first() to avoid strict mode
    await expect(page.getByText('自动化测试').first()).toBeVisible()
    await expect(page.getByText('自动化公司 · 测试工程师').first()).toBeVisible()
  })

  test('add button is visible on contacts page', async ({ page }) => {
    await expect(page.getByText('+ 添加联系人')).toBeVisible()
  })
})
