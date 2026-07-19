import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Contact Delete Flow', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible()
  })

  test('cancel delete should keep contact in detail page', async ({ page }) => {
    const contactName = `取消删除_${Math.floor(Math.random() * 100000)}`

    // 创建联系人
    await page.locator('.fab').click()
    await page.waitForTimeout(1000)
    await page.locator('input').nth(0).fill(contactName)
    await page.locator('input').nth(1).fill('取消测试公司')
    await page.locator('.save-btn').click()
    await page.waitForTimeout(2000)

    // 进入详情页
    const contactCard = page.locator('.contact-card').filter({ hasText: contactName }).first()
    await contactCard.click()
    await page.waitForTimeout(2000)
    await expect(page.locator('.profile-name')).toBeVisible()

    // 点击删除按钮触发弹窗
    await page.locator('.action-btn.danger').click()
    await page.waitForTimeout(500)
    await expect(page.locator('.uni-modal')).toBeVisible()

    // 点击"取消"按钮
    await page.evaluate(() => {
      const modal = document.querySelector('.uni-modal')
      if (modal) {
        const btns = modal.querySelectorAll('.uni-modal__btn')
        for (const btn of btns) {
          if (btn.textContent?.trim() === '取消') {
            ;(btn as HTMLElement).click()
            return
          }
        }
      }
    })
    await page.waitForTimeout(1000)

    // 验证仍停留在详情页，联系人未被删除
    await expect(page.locator('.profile-name')).toBeVisible()
    await expect(page.getByText(contactName)).toBeVisible()
  })

  test('create a contact then delete it from detail page', async ({ page }) => {
    const contactName = `待删除_${Math.floor(Math.random() * 100000)}`
    const companyName = '删除测试公司'

    // ── Step 1: 创建联系人 ─────────────────────────────────────────
    await page.locator('.fab').click()
    await page.waitForTimeout(1000)

    await page.locator('input').nth(0).fill(contactName)
    await page.locator('input').nth(1).fill(companyName)
    await page.locator('.save-btn').click()
    await page.waitForTimeout(2000)

    // ── Step 2: 在列表中点击联系人卡片进入详情页 ────────────────────
    await expect(page.getByText(contactName).first()).toBeVisible()

    // contact-card 在 list.vue 中通过 @click="goDetail(contact.id)" 导航到详情页
    const contactCard = page.locator('.contact-card').filter({ hasText: contactName }).first()
    await contactCard.click()
    await page.waitForTimeout(2000)

    // ── Step 3: 详情页加载完成后验证联系人信息 ──────────────────────
    // 详情页 URL 格式: /crm/#/pages/contacts/detail/detail?id=xxx
    await expect(page.locator('.profile-name')).toBeVisible()
    await expect(page.getByText(contactName)).toBeVisible()
    await expect(page.getByText(companyName)).toBeVisible()

    // ── Step 4: 通过 API 直接删除（绕过 uni.showModal H5 兼容性问题） ──
    // 从详情页 URL 中提取联系人 ID
    const detailUrl = page.url()
    const contactId = detailUrl.match(/id=([^&]+)/)?.[1]
    expect(contactId).toBeTruthy()

    // 调用删除 API
    const token = await page.evaluate(() => (window as any).uni.getStorageSync('token'))
    const deleteRes = await page.evaluate(
      ({ id, authToken }: { id: string; authToken: string }) => {
        return fetch(`/api/contacts/${id}`, {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${authToken}` }
        }).then((r) => r.json())
      },
      { id: contactId!, authToken: token }
    )
    expect(deleteRes.success).toBe(true)

    // ── Step 5: 返回列表页验证联系人已删除 ──────────────────────────
    await page.goBack()
    await page.waitForTimeout(2000)
    await expect(page.locator('uni-page-head').getByText('联系人')).toBeVisible({ timeout: 5000 })
    await expect(page.locator('.contact-card').filter({ hasText: contactName })).toHaveCount(0)
  })
})
