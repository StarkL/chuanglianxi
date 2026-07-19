import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Home Page Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    // 跳转到首页
    await page.goto('/crm/#/pages/index/index')
    await page.waitForTimeout(1000)
  })

  test('should display welcome hero card with greeting', async ({ page }) => {
    // 验证 hero 卡片可见
    await expect(page.locator('.hero-card')).toBeVisible()
    // 验证 "Hi" 问候语
    await expect(page.locator('.greeting').filter({ hasText: 'Hi' })).toBeVisible()
    // 验证用户昵称显示
    await expect(page.locator('.hero-name')).toBeVisible()
    // 验证副标题
    await expect(page.locator('.hero-subtitle')).toBeVisible()
  })

  test('should display AI banner and navigate to chat-reply', async ({ page }) => {
    // 验证 AI 嘴替横幅可见
    const aiBanner = page.locator('.ai-banner')
    await expect(aiBanner).toBeVisible()
    // 验证横幅内文字
    await expect(aiBanner.locator('.ai-banner__title')).toContainText('AI 嘴替助理')
    await expect(aiBanner.locator('.ai-banner__desc')).toContainText('截图一键上传')

    // 点击横幅跳转
    await aiBanner.click()
    await page.waitForTimeout(1000)

    // 验证 URL 变化到 chat-reply 页面
    expect(page.url()).toContain('chat-reply')
  })

  test('should display nav section with 5 navigation items', async ({ page }) => {
    // 验证导航区域可见
    const navSection = page.locator('.nav-section')
    await expect(navSection).toBeVisible()

    // 验证包含5个导航项
    const navItems = page.locator('.nav-item')
    await expect(navItems).toHaveCount(5)
  })

  test('click contacts nav should switch to contacts tab', async ({ page }) => {
    // 点击"联系人"导航
    await page.locator('.nav-item').filter({ hasText: '联系人' }).click()
    await page.waitForTimeout(1000)

    // switchTab 跳转，验证到达联系人页面
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  })

  test('click scan nav should navigate to scan page', async ({ page }) => {
    // 点击"扫描名片"导航
    await page.locator('.nav-item').filter({ hasText: '扫描名片' }).click()
    await page.waitForTimeout(1000)

    // 验证 URL 变化到扫描页面
    expect(page.url()).toContain('ocr/scan')
  })

  test('click reminders nav should navigate to reminders page', async ({ page }) => {
    // 点击"提醒"导航（限定 nav-section 避免匹配到 TabBar 的"提醒"标签）
    await page.locator('.nav-section .nav-item').filter({ hasText: '提醒' }).click()
    await page.waitForTimeout(1500)

    // 验证 URL 变化到提醒页面
    expect(page.url()).toContain('reminders')
  })

  test('click cards nav should navigate to cards page', async ({ page }) => {
    await page.locator('.nav-item').filter({ hasText: '名片墙' }).click()
    await page.waitForTimeout(1000)
    expect(page.url()).toContain('ocr/cards')
  })

  test('click voice note nav should navigate to voice-note page', async ({ page }) => {
    // 点击"语音速记"导航
    await page.locator('.nav-item').filter({ hasText: '语音速记' }).click()
    await page.waitForTimeout(1000)

    // 验证 URL 变化到语音速记页面
    expect(page.url()).toContain('voice-note')
  })
})
