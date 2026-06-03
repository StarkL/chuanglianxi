import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.use({
  viewport: { width: 375, height: 812 },
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1',
})

test('Duplicate contact warning popup and override flow', async ({ page }) => {
  await registerAndLogin(page)

  // 3. Create first contact named '张重名'
  await page.locator('.fab').click()
  await page.waitForTimeout(500)
  await page.locator('input').nth(0).fill('张重名') // name
  await page.locator('input').nth(1).fill('谷歌公司') // company
  await page.locator('input').nth(3).fill('13911112222') // phone
  await page.locator('.save-btn').click()
  await page.waitForTimeout(1500)

  // Verify first contact exists in list
  await expect(page.getByText('张重名').first()).toBeVisible()

  // 4. Create second contact named '张重名'
  await page.locator('.fab').click()
  await page.waitForTimeout(500)
  await page.locator('input').nth(0).fill('张重名') // same name
  await page.locator('input').nth(1).fill('苹果公司') // different company
  await page.locator('input').nth(3).fill('13955556666') // different phone
  await page.locator('.save-btn').click()
  await page.waitForTimeout(1000)

  // 5. Verify primary duplicate modal pops up
  await expect(page.getByText('发现同名联系人')).toBeVisible()
  
  // 6. Click on duplicate link to open detail modal
  await page.locator('.modal-link').click()
  await page.waitForTimeout(500)

  // Verify secondary modal lists details of first contact
  await expect(page.getByText('已存在联系人信息')).toBeVisible()
  await expect(page.getByText('谷歌公司')).toBeVisible()
  await expect(page.getByText('13911112222')).toBeVisible()

  // 7. Click '知道了' to close detail modal
  await page.getByText('知道了', { exact: true }).click()
  await page.waitForTimeout(300)

  // 8. Click '继续添加' to force save
  await page.getByText('继续添加', { exact: true }).click()
  await page.waitForTimeout(1500)

  // 9. Verify both contacts are listed in main list
  await expect(page.getByText('张重名').first()).toBeVisible()
  const count = await page.getByText('张重名').count()
  expect(count).toBeGreaterThanOrEqual(2)
})
