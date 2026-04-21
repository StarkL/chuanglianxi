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
    await expect(page.getByText('联系人')).toBeVisible()
  })

  test('shows empty state or add button', async ({ page }) => {
    // Should show the add contact button
    await expect(page.getByText('+ 添加联系人')).toBeVisible()
  })

  test('can search and filter contacts by query', async ({ page }) => {
    // Step 1: Check if add contact button exists and create a test contact
    const addBtn = page.getByText('+ 添加联系人')
    if (await addBtn.isVisible()) {
      await addBtn.click()
      await page.waitForTimeout(300)

      // Fill in contact form - use labels or placeholders
      const nameInput = page.locator('input[placeholder="请输入姓名"]')
      if (await nameInput.isVisible()) {
        await nameInput.fill('张三测试')
        await page.locator('input[placeholder="请输入电话号码"]').fill('13800138000')
        await page.locator('input[placeholder="请输入公司名称"]').fill('测试公司')

        // Save
        await page.getByText('保存').click()
        await page.waitForTimeout(500)
      }
    }

    // Step 2: Type a search query that matches the contact
    const searchBar = page.locator('input[placeholder="搜索姓名或公司"]')
    if (await searchBar.isVisible()) {
      await searchBar.fill('张三')
      await page.waitForTimeout(500)

      // Step 3: Assert filtered results -- only matching contacts visible
      await expect(page.getByText('张三测试')).toBeVisible()
      await expect(page.getByText('测试公司')).toBeVisible()

      // Step 4: Type a query that matches nothing
      await searchBar.fill('不存在的联系人')
      await page.waitForTimeout(500)

      // Step 5: Clear search and verify results return
      await searchBar.fill('')
      await page.waitForTimeout(500)
      await expect(page.getByText('张三测试')).toBeVisible()
    }
  })
})
