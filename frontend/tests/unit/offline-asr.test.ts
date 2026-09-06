import { describe, it, expect } from 'vitest'
import { hzToMel, melToHz, computeFbank } from '../../src/utils/offline-asr/fbank'
import { ctcGreedyDecode, formatCjkText, decodeAsrOutput } from '../../src/utils/offline-asr/decoder'
import { extractVoiceNoteLocally } from '../../src/utils/offline-asr/local-extractor'

describe('Offline ASR - Fbank Feature Extraction', () => {
  it('hzToMel and melToHz should be reciprocal', () => {
    const freqs = [100, 500, 1000, 4000, 8000]
    for (const hz of freqs) {
      const mel = hzToMel(hz)
      const convertedHz = melToHz(mel)
      expect(convertedHz).toBeCloseTo(hz, 1)
    }
  })

  it('computeFbank should produce correct frame dimensions and 80-bin mel features', () => {
    // 构造 1 秒的 16kHz 正弦波 (440Hz)
    const sampleRate = 16000
    const durationSec = 0.5
    const pcm = new Float32Array(sampleRate * durationSec)
    for (let i = 0; i < pcm.length; i++) {
      pcm[i] = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.5
    }

    const fbank = computeFbank(pcm, { sampleRate: 16000 })
    // 0.5s: 500ms, frameLength 25ms, frameShift 10ms -> 48 帧左右
    expect(fbank.length).toBeGreaterThan(40)
    expect(fbank.length).toBeLessThan(55)

    // 每一帧应当具有严格 80 维特征
    expect(fbank[0].length).toBe(80)

    // 数值应当有效（非 NaN 或 Infinity）
    for (let m = 0; m < 80; m++) {
      expect(Number.isNaN(fbank[0][m])).toBe(false)
      expect(Number.isFinite(fbank[0][m])).toBe(true)
    }
  })

  it('computeFbank returns empty array when audio is shorter than frameLength', () => {
    const shortPcm = new Float32Array(100) // 100 samples < 400
    const fbank = computeFbank(shortPcm)
    expect(fbank).toEqual([])
  })
})

describe('Offline ASR - CTC Decoder & Text Formatter', () => {
  it('ctcGreedyDecode should collapse identical consecutive tokens and strip blank (0)', () => {
    const tokenIds = [0, 1, 1, 0, 2, 2, 2, 0, 3, 3, 0]
    const decoded = ctcGreedyDecode(tokenIds, 0)
    expect(decoded).toEqual([1, 2, 3])
  })

  it('ctcGreedyDecode handles alternating tokens and blanks', () => {
    const tokenIds = [1, 0, 1, 0, 2, 0]
    const decoded = ctcGreedyDecode(tokenIds, 0)
    expect(decoded).toEqual([1, 1, 2])
  })

  it('formatCjkText removes spaces between Chinese characters while keeping English spacing', () => {
    const raw = '我 们 下 周 在 咖 啡 馆 讨 论 新 项 目 的 POC 和 demo 设 计'
    const formatted = formatCjkText(raw)
    expect(formatted).toContain('我们下周在咖啡馆讨论新项目的 POC 和 demo 设计')
  })

  it('formatCjkText converts special punctuation tags', () => {
    const raw = '今天天气不错<|comma|>下午一起开会吧<|period|>'
    const formatted = formatCjkText(raw)
    expect(formatted).toBe('今天天气不错，下午一起开会吧。')
  })

  it('decodeAsrOutput extracts emotion and cleans special tags', () => {
    const tokens = ['<|zh|>', '<|HAPPY|>', '太', '好', '了', '<|exclamation|>']
    const result = decodeAsrOutput(tokens)
    expect(result.emotion).toBe('happy')
    expect(result.text).toBe('太好了！')
  })
})

describe('Offline ASR - Local Extractor', () => {
  it('extractVoiceNoteLocally accurately extracts meeting type and reminder', () => {
    const text = '今天下午和李明总监在咖啡馆聊了新方案，他下周二想看demo，记得提醒我提前准备好演示PPT。'
    const contacts = [
      { id: '1', name: '李明', company: '某某科技', title: '总监', phone: null, email: null, wechatId: null, avatar: null, tags: [], birthdayType: null, birthday: null, lunarMonth: null, lunarDay: null, createdAt: '', updatedAt: '' }
    ]

    const result = extractVoiceNoteLocally(text, contacts)
    expect(result.contactName).toBe('李明')
    expect(result.interactionType).toBe('meeting')
    expect(result.reminder).not.toBeNull()
    expect(result.reminder?.action).toContain('提前准备好演示PPT')
    expect(result.keyPoints.length).toBeGreaterThan(0)
  })

  it('extractVoiceNoteLocally correctly classifies phone calls', () => {
    const text = '今天给王总打了电话沟通报价，明天需要重新发一份修订版合同。'
    const result = extractVoiceNoteLocally(text, [])
    expect(result.interactionType).toBe('call')
    expect(result.reminder?.daysLater).toBe(1)
  })
})
