# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\contacts-crud.spec.ts >> Contact CRUD Flow >> add button is visible on contacts page
- Location: tests\e2e\specs\contacts-crud.spec.ts:56:3

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
  3  | test.describe('Contact CRUD Flow', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login first via mock
  6  |     await page.goto('/')
  7  |     await page.getByText('模拟登录 (H5开发)').click()
  8  |     await page.waitForTimeout(500)
  9  |     // After login, should be on contacts list (first tabBar page)
> 10 |     await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
     |                                                                  ^ Error: expect(locator).toBeVisible() failed
  11 |   })
  12 | 
  13 |   test('create contact and verify it appears in list (onShow refresh)', async ({ page }) => {
  14 |     // Step 1: Click add contact button via evaluate to avoid interception
  15 |     await page.evaluate(() => {
  16 |       const buttons = document.querySelectorAll('.add-btn, .wd-button')
  17 |       for (const btn of buttons) {
  18 |         if (btn.textContent?.includes('添加联系人')) {
  19 |           ;(btn as HTMLElement).click()
  20 |           return true
  21 |         }
  22 |       }
  23 |       return false
  24 |     })
  25 |     await page.waitForTimeout(1000)
  26 | 
  27 |     // Step 2: Fill in the form — inputs in order: name, company, title, phone
  28 |     const textInputs = page.locator('input[type="text"]')
  29 |     const phoneInput = page.locator('input[type="number"]')
  30 | 
  31 |     await textInputs.nth(0).fill('自动化测试')
  32 |     await textInputs.nth(1).fill('自动化公司')
  33 |     await textInputs.nth(2).fill('测试工程师')
  34 |     await phoneInput.fill('13900000001')
  35 | 
  36 |     // Step 3: Save
  37 |     await page.evaluate(() => {
  38 |       const buttons = document.querySelectorAll('uni-button, button, .wd-button')
  39 |       for (const btn of buttons) {
  40 |         if (btn.textContent?.includes('保存')) {
  41 |           ;(btn as HTMLElement).click()
  42 |           return true
  43 |         }
  44 |       }
  45 |       return false
  46 |     })
  47 |     await page.waitForTimeout(2000)
  48 | 
  49 |     // Step 4: Should be back on contacts list with new contact visible
  50 |     await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  51 |     // New contact should appear - use first() to avoid strict mode
  52 |     await expect(page.getByText('自动化测试').first()).toBeVisible()
  53 |     await expect(page.getByText('自动化公司 · 测试工程师').first()).toBeVisible()
  54 |   })
  55 | 
  56 |   test('add button is visible on contacts page', async ({ page }) => {
  57 |     await expect(page.getByText('+ 添加联系人')).toBeVisible()
  58 |   })
  59 | })
  60 | 
```