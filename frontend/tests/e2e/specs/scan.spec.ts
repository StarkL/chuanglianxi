import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Scan Page', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('scan page renders with empty state and action button', async ({ page }) => {
    // Navigate to scan page
    await page.goto('/crm/#/pages/ocr/scan/scan')
    await page.waitForTimeout(1500)

    // Should show empty state hint
    await expect(page.getByText('将名片放入框内，自动识别信息')).toBeVisible()

    // Should show action button
    await expect(page.getByText('拍照 / 从相册选择')).toBeVisible()
  })

  test('scan page has correct navigation bar title', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/scan/scan')
    await page.waitForTimeout(1500)

    // Navigation bar should show "扫描名片"
    await expect(page.getByText('扫描名片')).toBeVisible()
  })

  test('selected image is displayed in scan frame and is previewable', async ({ page }) => {
    // Navigate to scan page
    await page.goto('/crm/#/pages/ocr/scan/scan')
    await page.waitForTimeout(1500)

    const mockImgData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    // Stub uni.chooseImage and uni.previewImage
    await page.evaluate((imgData) => {
      const win = window as any
      if (win.uni) {
        win.uni.chooseImage = (options: any) => {
          options.success({
            tempFilePaths: [imgData],
            tempFiles: [{ path: imgData }]
          })
        }
        win.uni.previewImageCalled = false
        win.uni.previewImage = (options: any) => {
          win.uni.previewImageCalled = true
        }
      }
    }, mockImgData)

    // Click to select image
    await page.getByText('拍照 / 从相册选择').click()
    await page.waitForTimeout(1000)

    // Verify preview image is visible inside the scan frame
    const previewImgContainer = page.locator('.preview-img')
    await expect(previewImgContainer).toBeVisible()
    
    const innerImg = previewImgContainer.locator('img')
    await page.waitForTimeout(500)
    
    const hasImg = await innerImg.count() > 0
    if (hasImg) {
      await expect(innerImg).toHaveAttribute('src', mockImgData)
    } else {
      const style = await previewImgContainer.getAttribute('style')
      expect(style).toContain('background-image')
    }

    // Click the preview image container to trigger preview
    await previewImgContainer.click()
    await page.waitForTimeout(200)

    // Verify uni.previewImage was called
    const previewCalled = await page.evaluate(() => (window as any).uni.previewImageCalled)
    expect(previewCalled).toBe(true)
  })

  test('swiper navigation arrows are hidden during preview', async ({ page }) => {
    // Navigate to scan page
    await page.goto('/crm/#/pages/ocr/scan/scan')
    await page.waitForTimeout(1500)

    const mockImgData = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    // Stub ONLY chooseImage, let previewImage run natively
    await page.evaluate((imgData) => {
      const win = window as any
      if (win.uni) {
        win.uni.chooseImage = (options: any) => {
          options.success({
            tempFilePaths: [imgData],
            tempFiles: [{ path: imgData }]
          })
        }
      }
    }, mockImgData)

    // Click to select image
    await page.getByText('拍照 / 从相册选择').click()
    await page.waitForTimeout(1000)

    // Click preview image to open real preview
    const previewImgContainer = page.locator('.preview-img')
    await previewImgContainer.click()
    await page.waitForTimeout(1000)

    // Verify .uni-swiper-navigation-prev is hidden
    const navigationPrev = page.locator('.uni-swiper-navigation-prev')
    await expect(navigationPrev).toBeHidden()

    // Click anywhere on swiper to close preview
    const swiper = page.locator('uni-swiper')
    await swiper.click()
    await page.waitForTimeout(1000)
  })
})
