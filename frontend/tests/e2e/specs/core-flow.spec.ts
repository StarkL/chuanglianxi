import { test, expect } from '@playwright/test'

test.describe('Core User Flow', () => {
  test('login -> navigate to contacts -> search', async ({ page }) => {
    // Step 1: Login
    await page.goto('/')
    await expect(page.getByText('常联系')).toBeVisible()
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)

    // Step 2: Verify contacts list loaded (first tabBar page)
    await expect(page.getByText('联系人')).toBeVisible()

    // Step 3: Search bar visible
    await expect(page.locator('input[placeholder="搜索姓名或公司"]')).toBeVisible()
  })

  test('tabBar navigation works', async ({ page }) => {
    // Login
    await page.goto('/')
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)

    // Click 提醒 tab
    await page.getByText('提醒').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('提醒')).toBeVisible()

    // Click 我的 tab
    await page.getByText('我的').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('退出登录')).toBeVisible()

    // Click back to 联系人 tab
    await page.getByText('联系人').first().click()
    await page.waitForTimeout(500)
    await expect(page.getByText('联系人')).toBeVisible()
  })

  test('logout from mine page', async ({ page }) => {
    // Login
    await page.goto('/')
    await page.getByText('模拟登录 (H5开发)').click()
    await page.waitForTimeout(500)

    // Go to mine
    await page.getByText('我的').first().click()
    await page.waitForTimeout(500)

    // Click logout (shows confirmation dialog)
    await page.getByText('退出登录').click()
    await page.waitForTimeout(500)

    // Confirm the logout dialog
    // uni.showModal creates a native dialog - click the confirm button
    const confirmBtn = page.getByRole('button', { name: '确认' })
    if (await confirmBtn.isVisible()) {
      await confirmBtn.click()
    } else {
      // Fallback: click the first button that could be confirm
      await page.locator('.uni-modal__footer .uni-button').first().click()
    }
    await page.waitForTimeout(500)

    // Should be back at login page
    await expect(page.getByText('常联系')).toBeVisible()
  })
})
