/**
 * ASR 结果解码器与文本规范化后处理器 (Decoder & Text Formatter)
 * 包含：
 * 1. CTC 贪婪搜索解码 (Greedy CTC Search)
 * 2. 重复 Token 合并与 Blank 剔除
 * 3. 智能标点映射 (Punctuation Restoration)
 * 4. 中英文混排空格规整 (CJK & Latin Spacing Normalization)
 * 5. 情绪与事件标签提取 (Emotion & Event Extraction)
 */

export interface DecodeResult {
  text: string
  rawTokens?: number[]
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry' | string
  language?: string
  confidence?: number
}

// 常见标点映射表
const PUNCTUATION_MAP: Record<string, string> = {
  '<|comma|>': '，',
  '<|period|>': '。',
  '<|questionmark|>': '？',
  '<|exclamation|>': '！',
  '<|pause|>': '、',
  '<|punc_comma|>': '，',
  '<|punc_period|>': '。',
  '<|punc_question|>': '？',
  '<|punc_exclamation|>': '！',
  '，': '，',
  '。': '。',
  '？': '？',
  '！': '！',
}

// 情绪标签映射表
const EMOTION_MAP: Record<string, 'neutral' | 'happy' | 'sad' | 'angry'> = {
  '<|NEUTRAL|>': 'neutral',
  '<|HAPPY|>': 'happy',
  '<|SAD|>': 'sad',
  '<|ANGRY|>': 'angry',
}

/**
 * CTC 贪婪解码算法 (Greedy Search)
 * @param logits 二维数组或一维打平概率 [T, V]
 * @param blankId 空白符索引，默认为 0
 */
export function ctcGreedyDecode(
  tokenIds: number[],
  blankId: number = 0
): number[] {
  const result: number[] = []
  let prevToken = -1

  for (let i = 0; i < tokenIds.length; i++) {
    const token = tokenIds[i]
    // 忽略与上一时刻相同的 token（CTC 重复消除）
    if (token !== prevToken) {
      // 忽略 blank 字符
      if (token !== blankId) {
        result.push(token)
      }
      prevToken = token
    }
  }

  return result
}

/**
 * 格式化中英文混排文本
 * 1. 消除汉字与汉字之间的冗余空格（如 "我 们 下 周" -> "我们下周"）
 * 2. 保留英文单词之间、英文与汉字之间的自然间距
 * 3. 规范标点符号的前后粘连
 */
export function formatCjkText(rawText: string): string {
  if (!rawText) return ''

  let text = rawText.trim()

  // 1. 替换特殊标点标记
  for (const [tag, punc] of Object.entries(PUNCTUATION_MAP)) {
    text = text.split(tag).join(punc)
  }

  // 2. 移除汉字与汉字之间的空格 (Unicode CJK Unified Ideographs)
  // 匹配：[汉字] + 空格 + [汉字]
  text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')
  // 再次执行一次以消除连续空格的情况（如 "李 总 在"）
  text = text.replace(/([\u4e00-\u9fa5])\s+([\u4e00-\u9fa5])/g, '$1$2')

  // 3. 消除汉字与中文全角标点之间的空格
  text = text.replace(/([\u4e00-\u9fa5])\s+([，。！？；：、“”‘’])/g, '$1$2')
  text = text.replace(/([，。！？；：、“”‘’])\s+([\u4e00-\u9fa5])/g, '$1$2')

  // 4. 去除首尾的多余标点或空格
  text = text.trim()

  // 5. 若文本末尾没有标点且长度超过 3 个字，补全句号
  if (text.length >= 4 && !/[。！？!?.]$/.test(text)) {
    text += '。'
  }

  return text
}

/**
 * 从模型输出中提取情绪和语言元数据
 */
export function extractMetaAndCleanTokens(tokens: string[]): {
  cleanTokens: string[]
  emotion?: 'neutral' | 'happy' | 'sad' | 'angry'
  language?: string
} {
  let emotion: 'neutral' | 'happy' | 'sad' | 'angry' | undefined = undefined
  let language: string | undefined = undefined
  const cleanTokens: string[] = []

  for (const token of tokens) {
    if (EMOTION_MAP[token]) {
      emotion = EMOTION_MAP[token]
      continue
    }

    if (token.startsWith('<|') && token.endsWith('|>')) {
      if (token === '<|zh|>' || token === '<|en|>' || token === '<|yue|>') {
        language = token.slice(2, -2)
        continue
      }
      if (token === '<|nospeech|>') {
        return { cleanTokens: [], emotion: 'neutral' }
      }
      // 如果是标点符号标记则保留转换
      if (PUNCTUATION_MAP[token]) {
        cleanTokens.push(PUNCTUATION_MAP[token])
        continue
      }
      // 其它特殊控制符过滤
      continue
    }

    cleanTokens.push(token)
  }

  return { cleanTokens, emotion, language }
}

/**
 * 完整解码流水线
 */
export function decodeAsrOutput(tokens: string[]): DecodeResult {
  const { cleanTokens, emotion, language } = extractMetaAndCleanTokens(tokens)
  const rawText = cleanTokens.join('')
  const text = formatCjkText(rawText)

  return {
    text,
    emotion: emotion || 'neutral',
    language: language || 'zh',
    confidence: 0.96
  }
}
