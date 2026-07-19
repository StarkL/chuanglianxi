import { test, expect } from '@playwright/test'

test.use({
  viewport: { width: 375, height: 812 },
  userAgent:
    'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X) ' +
    'AppleWebKit/605.1.15 (KHTML, like Gecko) Version/15.0 Mobile/15E148 Safari/604.1'
})

test.describe('Static Pages', () => {
  test('隐私政策页渲染: 标题和正文内容可见', async ({ page }) => {
    // 通过 uni.setStorageSync 设置 dev-token 绕过登录重定向
    await page.goto('/crm/#/pages/login/login')
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      ;(window as any).uni.setStorageSync('token', 'dev-token-h5')
      ;(window as any).uni.setStorageSync('userInfo', { nickname: 'test', avatar: null })
    })
    await page.goto('/crm/#/pages/privacy/privacy')
    await page.waitForTimeout(2000)

    // 页面标题
    await expect(page.locator('.title', { hasText: '隐私政策' })).toBeVisible()

    // 更新时间
    await expect(page.locator('.update-time')).toBeVisible()
    await expect(page.locator('.update-time')).toContainText('2026')

    // 各章节标题
    await expect(page.getByText('引言')).toBeVisible()
    await expect(page.getByText('一、我们收集的信息')).toBeVisible()
    await expect(page.getByText('二、我们如何使用信息')).toBeVisible()
    await expect(page.getByText('三、信息的存储与保护')).toBeVisible()
    await expect(page.getByText('五、您的权利')).toBeVisible()

    // 具体条款内容
    await expect(page.getByText(/账户信息/)).toBeVisible()
    await expect(page.getByText(/联系人信息/)).toBeVisible()
  })

  test('用户协议页渲染: 标题和正文内容可见', async ({ page }) => {
    // 通过 uni.setStorageSync 设置 dev-token 绕过登录重定向
    await page.goto('/crm/#/pages/login/login')
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      ;(window as any).uni.setStorageSync('token', 'dev-token-h5')
      ;(window as any).uni.setStorageSync('userInfo', { nickname: 'test', avatar: null })
    })
    await page.reload()
    await page.waitForTimeout(1000)
    await page.goto('/crm/#/pages/agreement/agreement')
    await page.waitForTimeout(2000)

    // 页面标题
    await expect(page.locator('.title', { hasText: '用户协议' })).toBeVisible()

    // 更新时间
    await expect(page.locator('.update-time')).toBeVisible()
    await expect(page.locator('.update-time')).toContainText('2026')

    // 各章节标题
    await expect(page.getByText('引言')).toBeVisible()
    await expect(page.getByText('一、服务说明')).toBeVisible()
    await expect(page.getByText('二、账户注册与使用')).toBeVisible()
    await expect(page.getByText('三、用户行为规范')).toBeVisible()
    await expect(page.getByText('五、免责声明')).toBeVisible()

    // 具体条款内容
    await expect(page.getByText(/联系人管理/)).toBeVisible()
    await expect(page.getByText(/名片识别/).first()).toBeVisible()
  })

  test('隐私政策页: 从登录页链接可正常跳转', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    // 登录页点击"隐私政策"链接
    await page.locator('.link', { hasText: '隐私政策' }).click()
    await page.waitForTimeout(1000)

    // 验证跳转目标
    await expect(page).toHaveURL(/.*privacy/)
    await expect(page.locator('.title', { hasText: '隐私政策' })).toBeVisible()
  })

  test('用户协议页: 从登录页链接可正常跳转', async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)

    // 登录页点击"用户协议"链接
    await page.locator('.link', { hasText: '用户协议' }).click()
    await page.waitForTimeout(1000)

    // 验证跳转目标
    await expect(page).toHaveURL(/.*agreement/)
    await expect(page.locator('.title', { hasText: '用户协议' })).toBeVisible()
  })
})
