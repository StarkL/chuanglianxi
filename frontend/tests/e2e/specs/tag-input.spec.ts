import { test, expect } from '@playwright/test'

test.describe('UI Design - Tag Input Component', () => {
  async function setupAuthAndNavigate(page: any) {
    await page.goto('/crm/')
    await page.waitForTimeout(500)
    await page.evaluate(() => {
      localStorage.setItem('token', 'dev-token-h5')
      localStorage.setItem(
        'userInfo',
        JSON.stringify({ id: 'dev-user', nickname: '测试用户', avatar: '' })
      )
    })
    await page.goto('/crm/#/pages/contacts/edit/edit')
    await page.waitForTimeout(2000)
  }

  test('preset tags display correctly', async ({ page }) => {
    await setupAuthAndNavigate(page)

    const presetTags = page.locator('.preset-tag')
    await expect(presetTags).toHaveCount(8)

    await expect(page.getByText('工作').first()).toBeVisible()
    await expect(page.getByText('朋友').first()).toBeVisible()
  })

  test('clicking preset tag toggles selection state', async ({ page }) => {
    await setupAuthAndNavigate(page)

    const workTag = page.locator('.preset-tag').filter({ hasText: '工作' }).first()
    await expect(workTag).not.toHaveClass(/active/)

    await workTag.click()
    await page.waitForTimeout(500)

    await expect(workTag).toHaveClass(/active/)
    await expect(page.locator('.count-num')).toHaveText('1')

    await workTag.click()
    await page.waitForTimeout(500)

    await expect(workTag).not.toHaveClass(/active/)
    await expect(page.locator('.count-num')).toHaveText('0')
  })

  test('add custom tag via input + button', async ({ page }) => {
    await setupAuthAndNavigate(page)

    // uni-input wraps the actual input, so use evaluate to fill the inner input
    await page.evaluate(() => {
      const uniInput = document.querySelector('.custom-input')
      const input = uniInput?.querySelector('input')
      if (input) {
        ;(input as HTMLInputElement).value = '投资人'
        ;(input as HTMLInputElement).dispatchEvent(new Event('input', { bubbles: true }))
      }
    })
    await page.waitForTimeout(300)

    await page.locator('.custom-add-btn').click()
    await page.waitForTimeout(500)

    await expect(page.getByText('投资人').first()).toBeVisible()
    await expect(page.locator('.count-num')).toHaveText('1')
  })

  test('remove selected tag via × button', async ({ page }) => {
    await setupAuthAndNavigate(page)

    await page.locator('.preset-tag').filter({ hasText: '工作' }).first().click()
    await page.waitForTimeout(500)
    await page.locator('.preset-tag').filter({ hasText: '朋友' }).first().click()
    await page.waitForTimeout(500)

    await expect(page.locator('.count-num')).toHaveText('2')

    await page.locator('.preset-tag').filter({ hasText: '工作' }).first().click()
    await page.waitForTimeout(600)

    await expect(page.locator('.count-num')).toHaveText('1')
    await expect(page.locator('.preset-tag').filter({ hasText: '工作' }).first()).not.toHaveClass(
      /active/
    )
  })
})
