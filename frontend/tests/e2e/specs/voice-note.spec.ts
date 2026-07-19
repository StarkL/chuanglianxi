import { test, expect } from '@playwright/test'
import { registerAndLogin } from '../login-helper'

test.describe('Voice Note Page', () => {
  test.beforeEach(async ({ page }) => {
    await registerAndLogin(page)
  })

  test('page renders with title, record card and manual input hint', async ({ page }) => {
    await page.goto('/crm/#/pages/voice-note/voice-note')
    await page.waitForTimeout(1500)

    // 录音卡片区域可见（内含"开始录音"文字）
    const recordCard = page.locator('.record-card')
    await expect(recordCard).toBeVisible()
    await expect(page.getByText('开始录音')).toBeVisible()

    // "手动输入"提示可见
    const manualHint = page.locator('.manual-input-hint')
    await expect(manualHint).toBeVisible()
  })

  test('manual input flow: prompt returns text and transcript is displayed', async ({ page }) => {
    await page.goto('/crm/#/pages/voice-note/voice-note')
    await page.waitForTimeout(1500)

    const testText = '今天和张三开了个会议，讨论了项目进展'

    // stub window.prompt 返回测试文本
    await page.evaluate((text) => {
      window.prompt = () => text
    }, testText)

    // 点击"手动输入"
    await page.locator('.manual-input-hint').click()
    await page.waitForTimeout(2000)

    // 转录内容应显示在 .transcript-content 中
    const transcriptContent = page.locator('.transcript-content')
    await expect(transcriptContent).toBeVisible()
    await expect(transcriptContent).toContainText(testText)
  })

  test('transcript section shows reprocess and clear buttons after manual input', async ({
    page
  }) => {
    await page.goto('/crm/#/pages/voice-note/voice-note')
    await page.waitForTimeout(1500)

    const testText = '测试清空和重新处理按钮'
    await page.evaluate((text) => {
      window.prompt = () => text
    }, testText)

    await page.locator('.manual-input-hint').click()
    await page.waitForTimeout(2000)

    // 转录区域应显示"重新处理"和"清空"按钮
    await expect(page.getByText('重新处理').first()).toBeVisible()
    await expect(page.getByText('清空').first()).toBeVisible()
  })

  test('record button is visible with default text', async ({ page }) => {
    await page.goto('/crm/#/pages/voice-note/voice-note')
    await page.waitForTimeout(1500)

    // 录音按钮可见
    const recordButton = page.locator('.record-button')
    await expect(recordButton).toBeVisible()

    // 默认显示"开始录音"文字
    await expect(recordButton).toContainText('开始录音')
  })

  test('navigation bar shows correct title', async ({ page }) => {
    await page.goto('/crm/#/pages/voice-note/voice-note')
    await page.waitForTimeout(1500)

    // uni-app H5 导航栏标题（页面模板 + 导航栏重复，用 first）
    await expect(page.getByText('语音速记').first()).toBeVisible()
  })
})
