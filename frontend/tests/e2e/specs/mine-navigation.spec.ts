import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Mine Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    // 切换到"我的"TabBar
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(1000)
  })

  test('should display user info card', async ({ page }) => {
    // 验证用户卡片可见
    await expect(page.locator('.user-card')).toBeVisible()
    // 验证用户昵称可见
    await expect(page.locator('.user-name')).toBeVisible()
    // 验证角色描述
    await expect(page.locator('.user-role')).toContainText('你的人脉管理助手')
  })

  test('click scan quick action should navigate to scan page', async ({ page }) => {
    // 点击"扫描名片"快捷操作
    await page.locator('.action-item').filter({ hasText: '扫描名片' }).click()
    await page.waitForTimeout(1000)

    // 验证跳转到扫描页面
    expect(page.url()).toContain('ocr/scan')
  })

  test('click cards quick action should navigate to cards page', async ({ page }) => {
    // 点击"名片墙"快捷操作
    await page.locator('.action-item').filter({ hasText: '名片墙' }).click()
    await page.waitForTimeout(1000)

    // 验证跳转到名片墙页面
    expect(page.url()).toContain('ocr/cards')
  })

  test('click privacy policy should navigate to privacy page', async ({ page }) => {
    // 点击"隐私政策"
    await page.locator('.settings-item').filter({ hasText: '隐私政策' }).click()
    await page.waitForTimeout(1000)

    // 验证跳转到隐私政策页
    expect(page.url()).toContain('privacy')
  })

  test('click user agreement should navigate to agreement page', async ({ page }) => {
    // 点击"用户协议"
    await page.locator('.settings-item').filter({ hasText: '用户协议' }).click()
    await page.waitForTimeout(1000)

    // 验证跳转到用户协议页
    expect(page.url()).toContain('agreement')
  })

  test('should display version number', async ({ page }) => {
    // 验证版本号可见，格式为 vX.X.X
    await expect(page.locator('.settings-value')).toHaveText(/v\d+\.\d+\.\d+/)
  })
})
