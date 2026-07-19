import { test, expect } from '@playwright/test'

test.describe('Login Form Validation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/')
    await page.waitForTimeout(1000)
  })

  test('页面渲染: 首页显示登录页面，标题"常联系"可见', async ({ page }) => {
    // logo-text 显示 "常联系"
    await expect(page.locator('.logo-text')).toBeVisible()
    await expect(page.locator('.logo-slogan')).toBeVisible()

    // 默认显示"账号登录"和"用户注册"两个 tab
    await expect(page.getByText('账号登录')).toBeVisible()
    await expect(page.getByText('用户注册')).toBeVisible()

    // 隐私协议区域可见
    await expect(page.getByText('用户协议')).toBeVisible()
    await expect(page.getByText('隐私政策')).toBeVisible()

    // 底部提示文字可见
    await expect(page.locator('.footer-text')).toBeVisible()
  })

  test('未勾选协议时: 登录按钮处于禁用状态，无法登录', async ({ page }) => {
    // 不勾选协议 checkbox，验证按钮处于禁用状态
    // uni-app H5 模式下 button 的 disabled 属性可能不直接映射到 HTML，
    // 通过 CSS class "disabled" 判断更可靠
    const loginBtn = page.locator('.login-btn')
    await expect(loginBtn).toHaveClass(/disabled/)

    // 页面 URL 不包含 contacts/list，说明没有跳转
    await expect(page).not.toHaveURL(/.*contacts\/list/)
  })

  test('表单校验 - 用户名过短: 登录 tab 下输入少于 3 位用户名，提示错误', async ({ page }) => {
    // 默认在"账号登录" tab
    await page.locator('.checkbox').first().click()
    await page.waitForTimeout(200)

    // login tab: input.nth(0) = 用户名, input.nth(1) = 密码
    await page.locator('input').nth(0).fill('ab') // 2 位，少于 3 位
    await page.locator('input').nth(1).fill('123456') // 满足 6 位

    await page.locator('.login-btn').click()
    await page.waitForTimeout(500)

    // handleH5Submit 校验: username.length < 3 → error = '用户名长度不能小于3位'
    await expect(page.locator('.error-text')).toHaveText('用户名长度不能小于3位')
  })

  test('表单校验 - 密码过短: 输入正确用户名但少于 6 位密码，提示错误', async ({ page }) => {
    await page.locator('.checkbox').first().click()
    await page.waitForTimeout(200)

    await page.locator('input').nth(0).fill('validuser') // 满足 3 位
    await page.locator('input').nth(1).fill('12345') // 5 位，少于 6 位

    await page.locator('.login-btn').click()
    await page.waitForTimeout(500)

    // handleH5Submit 校验: password.length < 6 → error = '密码长度不能小于6位'
    await expect(page.locator('.error-text')).toHaveText('密码长度不能小于6位')
  })

  test('密码显示切换: 点击眼睛图标，密码框 type 在 text/password 间切换', async ({ page }) => {
    // uni-app H5 模式下 :password="true" 映射为 input 的 type="password"，
    // :password="false" 映射为 type="text"，而非 DOM 的 password 属性
    const pwdInput = page.locator('input').nth(1)
    await expect(pwdInput).toHaveAttribute('type', 'password')

    // 点击眼睛图标切换为明文
    await page.locator('.eye-icon').click()
    await page.waitForTimeout(200)

    // showPassword=true → :password="false" → type="text"
    await expect(pwdInput).toHaveAttribute('type', 'text')

    // 再次点击切换回密文
    await page.locator('.eye-icon').click()
    await page.waitForTimeout(200)

    await expect(pwdInput).toHaveAttribute('type', 'password')
  })

  test('隐私政策链接: 点击"隐私政策"文字，跳转到隐私政策页', async ({ page }) => {
    // .link 是 <text class="link"> 元素，使用 @click.stop="navigateToPrivacy"
    await page.locator('.link', { hasText: '隐私政策' }).click()
    await page.waitForTimeout(1000)

    // 验证 URL 跳转到隐私政策页
    await expect(page).toHaveURL(/.*privacy/)

    // 验证隐私政策页内容
    await expect(page.locator('.title', { hasText: '隐私政策' })).toBeVisible()
    await expect(page.getByText('引言')).toBeVisible()
  })

  test('用户协议链接: 点击"用户协议"文字，跳转到用户协议页', async ({ page }) => {
    // .link 是 <text class="link"> 元素，使用 @click.stop="navigateToAgreement"
    await page.locator('.link', { hasText: '用户协议' }).click()
    await page.waitForTimeout(1000)

    // 验证 URL 跳转到用户协议页
    await expect(page).toHaveURL(/.*agreement/)

    // 验证用户协议页内容
    await expect(page.locator('.title', { hasText: '用户协议' })).toBeVisible()
    await expect(page.getByText('引言')).toBeVisible()
  })

  test('登录失败提示: 输入不存在的用户和错误密码，显示错误信息', async ({ page }) => {
    await page.locator('.checkbox').first().click()
    await page.waitForTimeout(200)

    // 输入一个极不存在的用户名和错误密码
    await page.locator('input').nth(0).fill('nonexistent_user_xyz_999999')
    await page.locator('input').nth(1).fill('wrongpassword')

    await page.locator('.login-btn').click()
    await page.waitForTimeout(3000)

    // passwordLogin API 返回错误 → error 被赋值 → .error-text 显示
    await expect(page.locator('.error-text')).toBeVisible()

    // 应停留在登录页，不跳转
    await expect(page.locator('.logo-text')).toBeVisible()
  })
})
