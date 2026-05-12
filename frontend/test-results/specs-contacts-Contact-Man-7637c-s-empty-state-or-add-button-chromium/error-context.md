# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: specs\contacts.spec.ts >> Contact Management >> shows empty state or add button
- Location: tests\e2e\specs\contacts.spec.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByText('+ 添加联系人')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByText('+ 添加联系人')

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
  3  | test.describe('Contact Management', () => {
  4  |   test.beforeEach(async ({ page }) => {
  5  |     // Login first via mock
  6  |     await page.goto('/')
  7  |     await page.getByText('模拟登录 (H5开发)').click()
  8  |     await page.waitForTimeout(500)
  9  |   })
  10 | 
  11 |   test('can navigate to contacts list from home', async ({ page }) => {
  12 |     // After login, contacts list is the first tabBar page -- should already be visible
  13 |     await expect(page.getByText('联系人').first()).toBeVisible()
  14 |   })
  15 | 
  16 |   test('shows empty state or add button', async ({ page }) => {
  17 |     // Should show the add contact button
> 18 |     await expect(page.getByText('+ 添加联系人')).toBeVisible()
     |                                             ^ Error: expect(locator).toBeVisible() failed
  19 |   })
  20 | 
  21 |   test('can search and filter contacts by query', async ({ page }) => {
  22 |     // Step 1: Create a test contact via evaluate
  23 |     await page.evaluate(() => {
  24 |       const buttons = document.querySelectorAll('.add-btn, .wd-button')
  25 |       for (const btn of buttons) {
  26 |         if (btn.textContent?.includes('添加联系人')) {
  27 |           ;(btn as HTMLElement).click()
  28 |           return true
  29 |         }
  30 |       }
  31 |       return false
  32 |     })
  33 |     await page.waitForTimeout(1000)
  34 | 
  35 |     // Fill in contact form
  36 |     const textInputs = page.locator('input[type="text"]')
  37 |     await textInputs.nth(0).fill('张三测试')
  38 |     await textInputs.nth(1).fill('测试公司')
  39 |     await page.locator('input[type="number"]').first().fill('13800138000')
  40 | 
  41 |     // Save via evaluate
  42 |     await page.evaluate(() => {
  43 |       const buttons = document.querySelectorAll('uni-button, button, .wd-button')
  44 |       for (const btn of buttons) {
  45 |         if (btn.textContent?.includes('保存')) {
  46 |           ;(btn as HTMLElement).click()
  47 |           return true
  48 |         }
  49 |       }
  50 |       return false
  51 |     })
  52 |     await page.waitForTimeout(1500)
  53 | 
  54 |     // Step 2: Search — type in any text input (wd-search renders as custom input)
  55 |     // Find the first text input on the contacts page (search bar)
  56 |     await page.locator('.wd-search').first().click()
  57 |     await page.waitForTimeout(500)
  58 |     // Type using keyboard since the input may be hidden in shadow DOM
  59 |     await page.keyboard.type('张三')
  60 |     await page.waitForTimeout(1000)
  61 | 
  62 |     // Step 3: Assert filtered results
  63 |     await expect(page.getByText('张三测试').first()).toBeVisible()
  64 |     await expect(page.getByText('测试公司').first()).toBeVisible()
  65 |   })
  66 | })
  67 | 
```