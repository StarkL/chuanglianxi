import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Reminder CRUD Flow', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    await page.waitForTimeout(1000)
  })

  test('reminder list shows empty state for new user', async ({ page }) => {
    // 通过 TabBar 进入提醒页
    await page.locator('.uni-tabbar__label').filter({ hasText: '提醒' }).click()
    await page.waitForTimeout(1000)

    // 验证页面标题
    await expect(page.locator('uni-page-head').getByText('提醒')).toBeVisible()
    // 验证空状态
    await expect(page.locator('.empty-state')).toBeVisible()
    await expect(page.getByText('暂无提醒')).toBeVisible()
  })

  test('TabBar navigation to reminders list', async ({ page }) => {
    await page.locator('.uni-tabbar__label').filter({ hasText: '提醒' }).click()
    await page.waitForTimeout(1000)

    // 验证到达提醒列表页：统计卡片和浮动按钮可见
    await expect(page.locator('.stats-card')).toBeVisible()
    await expect(page.locator('.float-btn')).toBeVisible()
  })

  test('navigate to add reminder page via float button', async ({ page }) => {
    // 先进入提醒页
    await page.locator('.uni-tabbar__label').filter({ hasText: '提醒' }).click()
    await page.waitForTimeout(1000)

    // 点击浮动添加按钮
    await page.locator('.float-btn').click()
    await page.waitForTimeout(1000)

    // 验证到达添加提醒页
    await expect(page).toHaveURL(/.*pages\/reminders\/add\/add/)
  })

  test('add reminder page renders correctly', async ({ page }) => {
    // 直接导航到添加提醒页
    await page.goto('/crm/#/pages/reminders/add/add')
    await page.waitForTimeout(1500)

    // 验证页面标题
    await expect(page.locator('uni-page-head').getByText('添加提醒')).toBeVisible()

    // 验证提醒类型选择区域
    await expect(page.locator('.type-grid')).toBeVisible()
    // 验证3个类型按钮
    await expect(page.locator('.type-btn')).toHaveCount(3)
    await expect(page.getByText('自定义')).toBeVisible()
    await expect(page.getByText('关系提醒')).toBeVisible()
    await expect(page.getByText('生日提醒')).toBeVisible()

    // 验证提醒内容输入区域（wd-textarea 渲染为 textarea）
    await expect(page.locator('textarea')).toBeVisible()

    // 验证日期选择器可见
    await expect(page.getByText('日期')).toBeVisible()

    // 验证创建按钮
    await expect(page.locator('.submit-btn')).toBeVisible()
    await expect(page.locator('.submit-btn').getByText('创建提醒')).toBeVisible()
  })

  test('select reminder type switches active state', async ({ page }) => {
    await page.goto('/crm/#/pages/reminders/add/add')
    await page.waitForTimeout(1500)

    // 默认选中"自定义"
    const customBtn = page.locator('.type-btn').filter({ hasText: '自定义' })
    await expect(customBtn).toHaveClass(/active/)

    // 点击"关系提醒"
    const relationshipBtn = page.locator('.type-btn').filter({ hasText: '关系提醒' })
    await relationshipBtn.click()
    await page.waitForTimeout(300)
    await expect(relationshipBtn).toHaveClass(/active/)
    // 自定义不再 active
    await expect(customBtn).not.toHaveClass(/active/)

    // 点击"生日提醒"
    const birthdayBtn = page.locator('.type-btn').filter({ hasText: '生日提醒' })
    await birthdayBtn.click()
    await page.waitForTimeout(300)
    await expect(birthdayBtn).toHaveClass(/active/)
    await expect(relationshipBtn).not.toHaveClass(/active/)
  })

  test('create reminder full flow', async ({ page }) => {
    // Step 1: 先创建一个联系人（通过联系人页面）
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
    await page.locator('.fab').click()
    await page.waitForTimeout(1000)

    await page.locator('input').nth(0).fill('提醒测试联系人')
    await page.locator('input').nth(1).fill('测试公司')
    await page.locator('input').nth(2).fill('测试职位')
    await page.locator('input').nth(3).fill('13800000001')
    await page.locator('.save-btn').click()
    await page.waitForTimeout(2000)

    // 验证回到联系人列表
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()

    // Step 2: 通过 TabBar 进入提醒页，再通过浮动按钮导航到添加提醒页
    // （确保 navigateBack 能正确返回提醒列表而非联系人页）
    await page.locator('.uni-tabbar__label').filter({ hasText: '提醒' }).click()
    await page.waitForTimeout(1000)
    await page.locator('.float-btn').click()
    await page.waitForTimeout(1500)

    // 验证到达添加提醒页
    await expect(page).toHaveURL(/.*pages\/reminders\/add\/add/)

    // Step 3: 选择"自定义"类型（默认已是自定义，但显式点击确认）
    const customBtn = page.locator('.type-btn').filter({ hasText: '自定义' })
    await customBtn.click()
    await page.waitForTimeout(300)
    await expect(customBtn).toHaveClass(/active/)

    // Step 4: 输入提醒内容
    await page.locator('textarea').fill('记得下周联系提醒测试联系人')

    // Step 5: 点击创建提醒
    await page.locator('.submit-btn').click()
    await page.waitForTimeout(2000)

    // Step 6: 验证返回提醒列表页
    await expect(page.locator('uni-page-head').getByText('提醒')).toBeVisible()

    // Step 7: 等待提醒数据加载
    await page.waitForTimeout(3000)

    // Step 8: 验证新创建的提醒内容出现在列表中
    await expect(
      page.locator('.card-message').filter({ hasText: '记得下周联系提醒测试联系人' }).first()
    ).toBeVisible({ timeout: 5000 })
  })

  test('form validation shows error when content is empty', async ({ page }) => {
    await page.goto('/crm/#/pages/reminders/add/add')
    await page.waitForTimeout(1500)

    // 不填内容，直接点击创建
    await page.locator('.submit-btn').click()
    await page.waitForTimeout(1000)

    // 验证显示提示（uni.showToast 在 H5 渲染为 .uni-toast 或 .uni-toast__text）
    await expect(page.getByText('请输入提醒内容').first()).toBeVisible()
  })
})
