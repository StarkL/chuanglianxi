# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\login.spec.ts >> Login Flow >> shows login page and can complete mock login
- Location: tests\e2e\specs\login.spec.ts:4:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('uni-page-head').getByText('联系人')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('uni-page-head').getByText('联系人')

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
  3  | test.describe('Login Flow', () => {
  4  |   test('shows login page and can complete mock login', async ({ page }) => {
  5  |     await page.goto('/')
  6  | 
  7  |     // Should show login page
  8  |     await expect(page.getByText('常联系', { exact: true })).toBeVisible()
  9  |     await expect(page.getByText('欢迎使用常联系')).toBeVisible()
  10 | 
  11 |     // Should show mock login button (H5)
  12 |     const loginBtn = page.getByText('模拟登录 (H5开发)')
  13 |     await expect(loginBtn).toBeVisible()
  14 | 
  15 |     // Should show privacy agreement text
  16 |     await expect(page.getByText('用户协议')).toBeVisible()
  17 |     await expect(page.getByText('隐私政策')).toBeVisible()
  18 | 
  19 |     // Click login
  20 |     await loginBtn.click()
  21 | 
  22 |     // Should navigate to contacts list (first tabBar page)
> 23 |     await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  24 |   })
  25 | })
  26 | 
```