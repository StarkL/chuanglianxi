import { Page } from '@playwright/test'

export async function registerAndLogin(page: Page) {
  // 1. Navigate to login and agree policies
  await page.goto('/')
  await page.waitForTimeout(1000)
  
  // Accept terms if checkbox is visible/unchecked
  const checkbox = page.locator('.checkbox').first()
  if (await checkbox.isVisible()) {
    await checkbox.click()
    await page.waitForTimeout(200)
  }

  // 2. Register random new user
  await page.getByText('用户注册').click()
  await page.waitForTimeout(500)
  const randomUsername = `user_${Math.floor(Math.random() * 1000000)}`
  await page.locator('input').nth(0).fill(randomUsername)
  await page.locator('input').nth(2).fill('123456')
  await page.locator('.login-btn').click()
  await page.waitForTimeout(2000)
}
