import { test, expect } from '@playwright/test'

test.use({
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
})

test('Create contact, edit, add tag, and save', async ({ page }) => {
  // 1. Navigate to login and agree policies
  await page.goto('/')
  await page.waitForTimeout(1000)
  await page.locator('.checkbox').first().click()
  await page.waitForTimeout(200)

  // 2. Register random new user
  await page.getByText('用户注册').click()
  await page.waitForTimeout(500)
  const randomUsername = `edituser_${Math.floor(Math.random() * 1000000)}`
  await page.locator('input').nth(0).fill(randomUsername)
  await page.locator('input').nth(2).fill('123456')
  await page.locator('.login-btn').click()
  await page.waitForTimeout(2000)

  // 3. Create contact named '编辑测试'
  await page.locator('.fab').click()
  await page.waitForTimeout(1000)
  await page.locator('input').nth(0).fill('编辑测试') // name
  await page.locator('input').nth(1).fill('测试公司') // company
  await page.locator('input').nth(3).fill('13812345678') // phone
  await page.locator('.save-btn').click()
  await page.waitForTimeout(2000)

  // Verify it appears in the list
  await expect(page.getByText('编辑测试').first()).toBeVisible()

  // 4. Click the contact card to go to details
  await page.getByText('编辑测试').first().click()
  await page.waitForTimeout(1000)
  await expect(page.getByText('暂无交互记录')).toBeVisible()

  // 5. Click '编辑联系人'
  await page.getByText('编辑联系人').click()
  await page.waitForTimeout(1000)

  // 6. Select the '朋友' tag
  const friendTag = page.locator('.preset-tag').filter({ hasText: '朋友' }).first()
  await friendTag.click()
  await page.waitForTimeout(500)

  // 7. Click save changes button
  await page.locator('.save-btn').click()
  await page.waitForTimeout(2000)

  // 8. Verify we redirect back and details are updated with '朋友' tag
  // Check if detail page is showing the tag '朋友'
  await expect(page.locator('.profile-tag').filter({ hasText: '朋友' }).first()).toBeVisible()
})
