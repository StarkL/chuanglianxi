import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Chat Reply Page', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('page renders with title, upload area, preferences and generate button', async ({
    page
  }) => {
    await page.goto('/crm/#/pages/ocr/chat-reply/chat-reply')
    await page.waitForTimeout(1500)

    // 标题可见（页面模板 + 导航栏都有此文字，用 first 避免 strict mode）
    await expect(page.getByText('AI 嘴替助理').first()).toBeVisible()

    // 上传截图区域可见，显示占位文字
    const selectCard = page.locator('.select-card')
    await expect(selectCard).toBeVisible()
    await expect(page.getByText('点击上传微信聊天截图')).toBeVisible()

    // 沟通偏好输入框可见
    await expect(page.locator('.pref-card')).toBeVisible()

    // 生成按钮可见（页面模板 + 导航栏可能有重复，用 first）
    await expect(page.getByText('一键生成高情商话术').first()).toBeVisible()
  })

  test('upload screenshot shows preview and reselect badge', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/chat-reply/chat-reply')
    await page.waitForTimeout(1500)

    const mockImgData =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    // stub uni.chooseImage
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

    // 点击上传区域选择图片
    await page.locator('.select-card').click()
    await page.waitForTimeout(1000)

    // 预览图可见
    const preview = page.locator('.screenshot-preview')
    await expect(preview).toBeVisible()

    // "重新选择"徽章可见
    const reselectBadge = page.locator('.reselect-badge')
    await expect(reselectBadge).toBeVisible()
    await expect(reselectBadge).toHaveText('重新选择')
  })

  test('shows toast when generating without image selected', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/chat-reply/chat-reply')
    await page.waitForTimeout(1500)

    // 直接点击生成按钮（wd-button 外层拦截点击，用 force 穿透）
    await page.locator('.generate-btn').click({ force: true })
    await page.waitForTimeout(1000)

    // 应显示提示文字
    await expect(page.getByText('请先选择微信聊天截图')).toBeVisible()
  })

  test('generate replies shows result cards with mock API', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/chat-reply/chat-reply')
    await page.waitForTimeout(1500)

    const mockImgData =
      'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'

    // stub uni.chooseImage
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

    // stub uni.request to mock the API response for chat-reply endpoint
    await page.evaluate(() => {
      const win = window as any
      if (win.uni) {
        const originalRequest = win.uni.request
        win.uni.request = (options: any) => {
          if (
            options.url &&
            (options.url.includes('/ocr/chat-reply') || options.url.includes('/api/ocr/chat-reply'))
          ) {
            options.success({
              statusCode: 200,
              data: {
                success: true,
                data: {
                  detectedName: '张三',
                  contactId: null,
                  analysis: '对方在询问项目进度，建议积极回应并给出具体时间节点。',
                  options: [
                    { style: '专业正式', text: '您好，项目目前进展顺利，预计下周完成第一阶段。' },
                    { style: '友好随和', text: '放心放心，一切都在掌控中～下周给你看成果！' },
                    { style: '简洁高效', text: '进展正常，下周交付。' }
                  ]
                }
              }
            })
            return
          }
          return originalRequest(options)
        }
      }
    })

    // 选择图片
    await page.locator('.select-card').click()
    await page.waitForTimeout(1000)

    // 点击生成按钮（wd-button 外层拦截点击，用 force 穿透）
    await page.locator('.generate-btn').click({ force: true })
    await page.waitForTimeout(3000)

    // 验证匹配人脉卡显示
    await expect(page.getByText('张三').first()).toBeVisible()

    // 验证语境分析卡显示
    await expect(page.getByText('AI 语境透视').first()).toBeVisible()
    await expect(page.getByText(/项目目前进展顺利/)).toBeVisible()

    // 验证话术卡片显示（至少1个）
    await expect(page.locator('.option-card').first()).toBeVisible()
    await expect(page.getByText(/专业正式|友好随和|简洁高效/).first()).toBeVisible()
  })

  test('preference input accepts text', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/chat-reply/chat-reply')
    await page.waitForTimeout(1500)

    // 在偏好输入框中输入文字
    const prefInput = page.locator('.pref-input input')
    await prefInput.fill('稍微幽默点')

    // 验证输入值
    await expect(prefInput).toHaveValue('稍微幽默点')
  })

  test('navigation bar shows correct title', async ({ page }) => {
    await page.goto('/crm/#/pages/ocr/chat-reply/chat-reply')
    await page.waitForTimeout(1500)

    // uni-app H5 导航栏标题（页面模板 + 导航栏重复，用 first）
    await expect(page.getByText('AI 嘴替助理').first()).toBeVisible()
  })
})
