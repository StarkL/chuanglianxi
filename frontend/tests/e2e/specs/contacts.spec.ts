import { test, expect } from '@playwright/test'

test.describe('Contact Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login first via mock
    await page.goto('/')
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)
  })

  test('can navigate to contacts list from home', async ({ page }) => {
    // After login, contacts list is the first tabBar page -- should already be visible
    await expect(page.getByText('联系人').first()).toBeVisible()
  })

  test('shows empty state or add button', async ({ page }) => {
    // Should show the add contact button
    await expect(page.getByText('+ 添加联系人')).toBeVisible()
  })

  test('can search and filter contacts by query', async ({ page }) => {
    // Step 1: Create a test contact via evaluate
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

    // Fill in contact form
    const textInputs = page.locator('input[type="text"]')
    await textInputs.nth(0).fill('张三测试')
    await textInputs.nth(1).fill('测试公司')
    await page.locator('input[type="number"]').first().fill('13800138000')

    // Save via evaluate
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
    await page.waitForTimeout(1500)

    // Step 2: Search — type in any text input (wd-search renders as custom input)
    // Find the first text input on the contacts page (search bar)
    await page.locator('.wd-search').first().click()
    await page.waitForTimeout(500)
    // Type using keyboard since the input may be hidden in shadow DOM
    await page.keyboard.type('张三')
    await page.waitForTimeout(1000)

    // Step 3: Assert filtered results
    await expect(page.getByText('张三测试').first()).toBeVisible()
    await expect(page.getByText('测试公司').first()).toBeVisible()
  })
})
