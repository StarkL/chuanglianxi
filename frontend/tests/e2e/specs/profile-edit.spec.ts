import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Nickname Edit (Modal on Mine Page)', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('edit button visible on user card', async ({ page }) => {
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(1000)

    // 编辑按钮应可见
    await expect(page.locator('.edit-btn')).toBeVisible()
  })

  test('click edit button opens nickname modal', async ({ page }) => {
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(1000)

    // 通过 evaluate 触发 Vue 点击（uni-view 的 force click 不触发 Vue 事件）
    await page.evaluate(() => {
      const btn = document.querySelector('.edit-btn') as HTMLElement
      if (btn) btn.click()
    })
    await page.waitForTimeout(1000)

    // 自定义弹窗应出现
    await expect(page.locator('.modal-overlay')).toBeVisible()
    await expect(page.locator('.modal-content')).toBeVisible()
    await expect(page.getByText('修改昵称').first()).toBeVisible()
  })
})

test.describe('Password Change Page', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('password change menu item navigates correctly', async ({ page }) => {
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(1000)

    // 点击"修改密码"菜单项
    await page.getByText('修改密码').first().click()
    await page.waitForTimeout(1500)

    // 应跳转到修改密码页
    await expect(page).toHaveURL(/.*pages\/password\/change/)
    await expect(page.locator('uni-page-head').getByText('修改密码')).toBeVisible()
  })

  test('password change page renders all fields', async ({ page }) => {
    await page.goto('/crm/#/pages/password/change/change')
    await page.waitForTimeout(1500)

    await expect(page.getByText('原密码').first()).toBeVisible()
    await expect(page.getByText('新密码').first()).toBeVisible()
    await expect(page.getByText('确认新密码').first()).toBeVisible()
    await expect(page.locator('.save-btn').filter({ hasText: '确认修改' }).first()).toBeVisible()
  })

  test('validates new password minimum length', async ({ page }) => {
    await page.goto('/crm/#/pages/password/change/change')
    await page.waitForTimeout(1500)

    const allInputs = page.locator('.field-input input')
    await allInputs.nth(0).fill('123456')
    await allInputs.nth(1).fill('12345')
    await allInputs.nth(2).fill('12345')
    await page.locator('.save-btn').first().click({ force: true })
    await page.waitForTimeout(500)

    await expect(page.getByText('新密码长度不能小于6位').first()).toBeVisible()
  })

  test('validates confirm password match', async ({ page }) => {
    await page.goto('/crm/#/pages/password/change/change')
    await page.waitForTimeout(1500)

    const allInputs = page.locator('.field-input input')
    await allInputs.nth(0).fill('123456')
    await allInputs.nth(1).fill('newpass123')
    await allInputs.nth(2).fill('different123')
    await page.locator('.save-btn').first().click({ force: true })
    await page.waitForTimeout(500)

    await expect(page.getByText('两次输入的密码不一致').first()).toBeVisible()
  })

  test('clears error on input', async ({ page }) => {
    await page.goto('/crm/#/pages/password/change/change')
    await page.waitForTimeout(1500)

    // 先触发错误
    const allInputs = page.locator('.field-input input')
    await allInputs.nth(0).fill('123456')
    await allInputs.nth(1).fill('12345')
    await allInputs.nth(2).fill('12345')
    await page.locator('.save-btn').first().click({ force: true })
    await page.waitForTimeout(500)
    await expect(page.getByText('新密码长度不能小于6位').first()).toBeVisible()

    // 输入新内容应清除错误
    await allInputs.nth(1).fill('newpass')
    await page.waitForTimeout(300)
    await expect(page.getByText('新密码长度不能小于6位').first()).not.toBeVisible()
  })

  test('back button returns to mine page', async ({ page }) => {
    await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
    await page.waitForTimeout(1000)
    await page.getByText('修改密码').first().click()
    await page.waitForTimeout(1500)

    await page.evaluate(() => {
      ;(window as any).uni.navigateBack()
    })
    await page.waitForTimeout(1000)

    await expect(page.getByText('退出登录').first()).toBeVisible()
  })
})
