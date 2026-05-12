# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\core-flow.spec.ts >> Core User Flow >> tabBar navigation works
- Location: tests\e2e\specs\core-flow.spec.ts:19:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('.uni-tabbar__label').filter({ hasText: '提醒' })
    - locator resolved to <div class="uni-tabbar__label">提醒</div>
  - attempting click action
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
    - waiting 20ms
    2 × waiting for element to be visible, enabled and stable
      - element is not visible
    - retrying click action
      - waiting 100ms
    54 × waiting for element to be visible, enabled and stable
       - element is not visible
     - retrying click action
       - waiting 500ms

```

# Page snapshot

```yaml
- generic [ref=e4]:
  - generic [ref=e8]: 登录
  - generic [ref=e12]:
    - generic [ref=e14]: 常联系
    - generic [ref=e15]:
      - generic [ref=e16]: 欢迎使用常联系
      - generic [ref=e17]: 使用微信账号登录，开启你的人脉管理之旅
    - generic [ref=e18]:
      - generic [ref=e19]: 模拟登录 (H5开发)
      - generic [ref=e20]: 登录后即可开始管理你的人脉
    - generic [ref=e25]:
      - text: 我已阅读并同意
      - generic [ref=e26]: 《用户协议》
      - text: 和
      - generic [ref=e27]: 《隐私政策》
```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test'
  2  | 
  3  | test.describe('Core User Flow', () => {
  4  |   test('login -> navigate to contacts -> search', async ({ page }) => {
  5  |     // Step 1: Login
  6  |     await page.goto('/')
  7  |     await expect(page.getByText('常联系', { exact: true })).toBeVisible()
  8  |     await page.getByText('模拟登录 (H5开发)').click()
  9  |     await page.waitForTimeout(500)
  10 | 
  11 |     // Step 2: Verify contacts list loaded (first tabBar page)
  12 |     await expect(page.getByText('联系人').first()).toBeVisible()
  13 | 
  14 |     // Step 3: Page is loaded (contacts list)
  15 |     // Verify we're on the contacts page by checking the add button
  16 |     await expect(page.getByText('+ 添加联系人')).toBeVisible()
  17 |   })
  18 | 
  19 |   test('tabBar navigation works', async ({ page }) => {
  20 |     // Login
  21 |     await page.goto('/')
  22 |     await page.getByText('模拟登录 (H5开发)').click()
  23 |     await page.waitForTimeout(500)
  24 | 
  25 |     // Click 提醒 tab
> 26 |     await page.locator('.uni-tabbar__label').filter({ hasText: '提醒' }).click()
     |                                                                        ^ Error: locator.click: Test timeout of 30000ms exceeded.
  27 |     await page.waitForTimeout(500)
  28 |     await expect(page.locator('uni-page-head').getByText('提醒')).toBeVisible()
  29 | 
  30 |     // Click 我的 tab
  31 |     await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
  32 |     await page.waitForTimeout(500)
  33 |     await expect(page.getByText('退出登录').first()).toBeVisible()
  34 | 
  35 |     // Click back to 联系人 tab
  36 |     await page.locator('.uni-tabbar__label').filter({ hasText: '联系人' }).click()
  37 |     await page.waitForTimeout(500)
  38 |     await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  39 |   })
  40 | 
  41 |   test('logout from mine page', async ({ page }) => {
  42 |     // Login
  43 |     await page.goto('/')
  44 |     await page.getByText('模拟登录 (H5开发)').click()
  45 |     await page.waitForTimeout(500)
  46 | 
  47 |     // Go to mine
  48 |     await page.locator('.uni-tabbar__label').filter({ hasText: '我的' }).click()
  49 |     await page.waitForTimeout(500)
  50 | 
  51 |     // Click logout + confirm via evaluate
  52 |     await page.evaluate(() => {
  53 |       const buttons = document.querySelectorAll('uni-button, button, .wd-button, .logout-btn')
  54 |       for (const btn of buttons) {
  55 |         if (btn.textContent?.includes('退出登录')) {
  56 |           ;(btn as HTMLElement).click()
  57 |           return true
  58 |         }
  59 |       }
  60 |       return false
  61 |     })
  62 |     await page.waitForTimeout(500)
  63 | 
  64 |     // Confirm dialog
  65 |     await page.evaluate(() => {
  66 |       const buttons = document.querySelectorAll('uni-button, button, .uni-button')
  67 |       for (const btn of buttons) {
  68 |         if (btn.textContent?.includes('确认')) {
  69 |           ;(btn as HTMLElement).click()
  70 |           return true
  71 |         }
  72 |       }
  73 |       return false
  74 |     })
  75 |     await page.waitForTimeout(1000)
  76 | 
  77 |     // After logout, should show login page or mine page (H5 dev mode behavior)
  78 |     // In H5 dev mode, clearSession removes the token so onLaunch redirects to login
  79 |     const loginVisible = await page.getByText('模拟登录 (H5开发)').isVisible()
  80 |     const logoutBtnVisible = await page.getByText('退出登录').first().isVisible()
  81 |     expect(loginVisible || logoutBtnVisible).toBe(true)
  82 |   })
  83 | })
  84 | 
```