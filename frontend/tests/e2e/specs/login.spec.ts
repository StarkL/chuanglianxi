import { test, expect } from '@playwright/test'

test.describe('Login Flow', () => {
  test('shows login page and can complete mock login', async ({ page }) => {
    await page.goto('/')

    // Should show login page
    await expect(page.getByText('常联系', { exact: true })).toBeVisible()
    await expect(page.getByText('欢迎使用常联系')).toBeVisible()

    // Should show mock login button (H5)
    const loginBtn = page.getByText('模拟登录 (H5开发)')
    await expect(loginBtn).toBeVisible()

    // Should show privacy agreement text
    await expect(page.getByText('用户协议')).toBeVisible()
    await expect(page.getByText('隐私政策')).toBeVisible()

    // Click login
    await loginBtn.click()

    // Should navigate to contacts list (first tabBar page)
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  })
})
