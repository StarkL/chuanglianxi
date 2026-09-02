import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('PWA (Progressive Web App) Suite', () => {
  test('manifest.webmanifest is accessible and valid', async ({ request }) => {
    const response = await request.get('/crm/manifest.webmanifest')
    expect(response.status()).toBe(200)

    const manifest = await response.json()
    expect(manifest.name).toBe('常联系 - AI 个人人脉 CRM')
    expect(manifest.short_name).toBe('常联系')
    expect(manifest.display).toBe('standalone')
    expect(manifest.start_url).toBe('/crm/')
    expect(manifest.theme_color).toBe('#6C5CE7')
    expect(manifest.icons.length).toBeGreaterThanOrEqual(2)
    expect(manifest.shortcuts.length).toBe(3)
  })

  test('sw.js Service Worker is accessible', async ({ request }) => {
    const response = await request.get('/crm/sw.js')
    expect(response.status()).toBe(200)
    const text = await response.text()
    expect(text).toContain('changlianxi-pwa')
    expect(text).toContain('addEventListener')
  })

  test('HTML entry includes PWA metadata and manifest link', async ({ page }) => {
    await page.goto('/')

    // Check manifest link
    const manifestLink = page.locator('link[rel="manifest"]')
    await expect(manifestLink).toHaveAttribute('href', '/crm/manifest.webmanifest')

    // Check theme-color meta
    const themeColorMeta = page.locator('meta[name="theme-color"]')
    await expect(themeColorMeta).toHaveAttribute('content', '#6C5CE7')

    // Check apple-mobile-web-app meta tags
    const appleCapableMeta = page.locator('meta[name="apple-mobile-web-app-capable"]')
    await expect(appleCapableMeta).toHaveAttribute('content', 'yes')
  })

  test('mine page displays PWA install entry and opens modal', async ({ page }) => {
    await registerAndLogin(page)

    // Go to Mine tab
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(600)

    // Check PWA menu item is visible
    const pwaItem = page.locator('.pwa-item')
    await expect(pwaItem).toBeVisible()
    await expect(pwaItem).toContainText('安装到手机桌面 (App)')

    // Click to open PWA Install Modal
    await pwaItem.click()
    await page.waitForTimeout(400)

    // Verify modal content
    const modal = page.locator('.pwa-modal-container')
    await expect(modal).toBeVisible()
    await expect(modal).toContainText('常联系')
    await expect(modal).toContainText('全屏独立运行')
    await expect(modal).toContainText('秒级极速打开')

    // Close modal
    await page.locator('.pwa-close-btn').click()
    await page.waitForTimeout(300)
    await expect(modal).not.toBeVisible()
  })
})
