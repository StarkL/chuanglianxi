<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { onLoad } from '@dcloudio/uni-app'
import { SpeechRecognizer, type SpeechEngineMode } from '../../utils/speech-recognition'
import { modelManager, type ModelStatus, type ModelProgressEvent } from '../../utils/offline-asr/model-manager'
import { extractVoiceNoteLocally } from '../../utils/offline-asr/local-extractor'
import { processVoiceNote, saveVoiceNote } from '../../api/voice-note'
import type { VoiceNoteExtractResult } from '../../api/voice-note'
import { getContacts, type Contact } from '../../api/contacts'
import { createInteraction } from '../../api/interactions'
import { getStorageMode } from '../../utils/storage-mode'
import { emitDataChanged } from '../../utils/events'

// 状态定义
// 优先使用原生极速流式模式 (边说边出字，零等待)，环境不支持时平滑切换为离线模式
const engineMode = ref<SpeechEngineMode>(SpeechRecognizer.isOnlineSupported() ? 'online' : 'offline')
const isRecording = ref(false)
const isTranscribing = ref(false)
const isProcessing = ref(false)
const isSaving = ref(false)
const transcript = ref('')
const liveTranscript = ref('') // 实时流式转录文字 (录音过程中边说边显字)
const hasRecorded = ref(false) // 是否已完成录音 (控制转写卡片常驻)
const extractedData = ref<VoiceNoteExtractResult | null>(null)
const selectedContactId = ref('')
const errorMessage = ref('')
const volumeLevel = ref(0)
const recordSeconds = ref(0)

// 离线模型状态与进度
const modelStatus = ref<ModelStatus>(modelManager.getStatus())
const modelProgress = ref<ModelProgressEvent | null>(null)
const isModelCached = ref(false)

// 联系人列表
const contacts = ref<Contact[]>([])
const contactSearch = ref('')
const showContactPicker = ref(false)

let recognizer: SpeechRecognizer | null = null
let timerInterval: any = null

const isOfflineSupported = computed(() => SpeechRecognizer.isOfflineSupported())
const isOnlineSupported = computed(() => SpeechRecognizer.isOnlineSupported())

const currentStorageMode = computed(() => getStorageMode())

const selectedContact = computed(() => {
  return contacts.value.find((c) => c.id === selectedContactId.value) || null
})

const filteredContacts = computed(() => {
  const kw = contactSearch.value.trim().toLowerCase()
  if (!kw) return contacts.value
  return contacts.value.filter((c) =>
    c.name.toLowerCase().includes(kw) || (c.company && c.company.toLowerCase().includes(kw))
  )
})

const formattedDuration = computed(() => {
  const m = Math.floor(recordSeconds.value / 60)
  const s = recordSeconds.value % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
})

onLoad((options: any) => {
  if (options && options.contactId) {
    selectedContactId.value = options.contactId
  }
})

onMounted(async () => {
  // 检查页面路由参数
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page?: { options?: { contactId?: string } } }
  const cid = currentPage?.$page?.options?.contactId
  if (cid && !selectedContactId.value) {
    selectedContactId.value = cid
  }
  // 1. 检查离线模型缓存
  isModelCached.value = await modelManager.isModelCached()
  modelManager.onStatusChange((s) => {
    modelStatus.value = s
  })

  // 2. 加载联系人列表供选择与自动姓名匹配
  loadContactsList()

  // 3. 初始化识别器
  initRecognizer()
})

onUnmounted(() => {
  if (recognizer) {
    recognizer.stop()
  }
  if (timerInterval) {
    clearInterval(timerInterval)
  }
})

async function loadContactsList() {
  try {
    const res = await getContacts()
    if (res.success && Array.isArray(res.data)) {
      contacts.value = res.data
    }
  } catch (err) {
    console.warn('获取联系人列表失败:', err)
  }
}

function initRecognizer() {
  recognizer = new SpeechRecognizer({
    engineMode: engineMode.value,
    language: 'zh-CN',
    continuous: true,
    interimResults: true,
    onVolume: (level) => {
      volumeLevel.value = level
    },
    onInterim: (text) => {
      liveTranscript.value = text
    }
  })
}

/**
 * 切换识别模式 (原生实时流式 vs 端侧纯离线)
 */
function toggleEngineMode() {
  if (isRecording.value) return
  const newMode: SpeechEngineMode = engineMode.value === 'offline' ? 'online' : 'offline'
  engineMode.value = newMode
  if (recognizer) {
    recognizer.setEngineMode(newMode)
  }
  errorMessage.value = ''
  if (newMode === 'online') {
    uni.showToast({ title: '已切换至原生实时流式模式', icon: 'none' })
  } else {
    uni.showToast({ title: '已切换至端侧离线模式', icon: 'none' })
  }
}

/**
 * 手动下载/预热端侧离线模型
 */
async function triggerModelDownload() {
  try {
    errorMessage.value = ''
    await modelManager.loadModel(undefined, (evt) => {
      modelProgress.value = evt
    })
    isModelCached.value = true
    uni.showToast({ title: '离线模型已就绪', icon: 'success' })
  } catch (err: any) {
    errorMessage.value = `下载离线模型失败: ${err.message || '网络连接超时'}`
  }
}

/**
 * 开始或停止录音
 */
async function toggleRecording() {
  if (isRecording.value) {
    // 停止录音
    stopRecording()
  } else {
    // 开始录音
    startRecording()
  }
}

async function startRecording() {
  errorMessage.value = ''
  liveTranscript.value = ''
  recordSeconds.value = 0
  volumeLevel.value = 0

  // 若处于离线模式但本地无有效权重文件
  if (engineMode.value === 'offline' && !isModelCached.value) {
    uni.showModal({
      title: '离线模型未就绪',
      content: '端侧纯离线 ASR 需要预先下载 SenseVoice 模型权重 (~112MB)。推荐切换至【原生极速模式】，无需下载且支持边说边实时出字。',
      confirmText: '切换极速',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          toggleEngineMode()
        }
      }
    })
    return
  }

  if (!recognizer) {
    initRecognizer()
  } else {
    recognizer.setEngineMode(engineMode.value)
  }

  isRecording.value = true

  // 计时器
  timerInterval = setInterval(() => {
    recordSeconds.value++
    // 最多录制 60 秒自动停止
    if (recordSeconds.value >= 60) {
      stopRecording()
    }
  }, 1000)

  try {
    await recognizer!.start()
  } catch (error: any) {
    isRecording.value = false
    if (timerInterval) {
      clearInterval(timerInterval)
      timerInterval = null
    }
    handleRecordError(error)
  }
}

async function stopRecording() {
  if (!isRecording.value) return
  isRecording.value = false
  if (timerInterval) {
    clearInterval(timerInterval)
    timerInterval = null
  }

  isTranscribing.value = true
  try {
    if (recognizer) {
      const result = await recognizer.stop()
      const finalContent = (result && result.transcript) ? result.transcript : (liveTranscript.value || '')
      
      if (result?.isModelLoaded === false && !finalContent.trim()) {
        hasRecorded.value = true
        errorMessage.value = '未加载端侧离线模型权重文件（约 112MB），建议切换至【原生极速模式】体验高精度实时转写。'
      } else if (finalContent.trim()) {
        transcript.value = finalContent.trim()
        hasRecorded.value = true
        await handleAutoExtract()
      } else {
        hasRecorded.value = true
        errorMessage.value = '未检测到清晰语音内容，请靠近麦克风重新说话，或点击下方直接手动输入'
      }
    }
  } catch (err: any) {
    handleRecordError(err)
  } finally {
    isTranscribing.value = false
  }
}

function handleRecordError(error: any) {
  const msg = error.message || String(error)
  if (msg.includes('NotAllowedError') || msg.includes('permission') || msg.includes('麦克风权限')) {
    errorMessage.value = '麦克风权限被拒绝，请在浏览器中允许访问麦克风'
  } else if (msg.includes('no-speech') || msg.includes('未检测到')) {
    errorMessage.value = '未检测到语音输入，请靠近麦克风重新说话'
  } else if (msg.includes('network') || msg.includes('网络')) {
    errorMessage.value = '网络连接异常，建议切换至【端侧离线模式】'
  } else {
    errorMessage.value = `录音失败: ${msg}`
  }
}

/**
 * 自动/手动结构化提取 (优先本地离线分析)
 */
async function handleAutoExtract() {
  if (!transcript.value.trim()) {
    errorMessage.value = '当前没有可解析的语音文本'
    return
  }

  isProcessing.value = true
  errorMessage.value = ''

  try {
    // 1. 若当前处于纯本地存储模式，直接执行 100% 端侧零网络离线分析
    if (currentStorageMode.value === 'local') {
      const localResult = extractVoiceNoteLocally(transcript.value, contacts.value)
      extractedData.value = localResult

      // 若匹配到联系人姓名且当前尚未选择，自动匹配
      if (localResult.contactName && !selectedContactId.value) {
        const found = contacts.value.find((c) => c.name === localResult.contactName)
        if (found) {
          selectedContactId.value = found.id
        }
      }
    } else {
      // 2. 云端模式：请求 Fastify 后端
      try {
        const response = await processVoiceNote(transcript.value, selectedContactId.value || undefined)
        if (response.success && response.data) {
          extractedData.value = response.data.extracted
          if (response.data.contact && !selectedContactId.value) {
            selectedContactId.value = response.data.contact.id
          }
        } else {
          // 降级为本地分析
          extractedData.value = extractVoiceNoteLocally(transcript.value, contacts.value)
        }
      } catch {
        // 网络故障时平滑降级
        extractedData.value = extractVoiceNoteLocally(transcript.value, contacts.value)
      }
    }
  } catch (err: any) {
    errorMessage.value = `分析提取失败: ${err.message}`
  } finally {
    isProcessing.value = false
  }
}

/**
 * 保存语音笔记为沟通记录
 */
async function handleSave() {
  if (!selectedContactId.value) {
    errorMessage.value = '请先选择关联的联系人'
    showContactPicker.value = true
    return
  }

  if (!extractedData.value) {
    errorMessage.value = '请先点击解析生成纪要内容'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    const summary = extractedData.value.summary || transcript.value
    const keyPoints = extractedData.value.keyPoints || []
    const content = `${summary}${keyPoints.length > 0 ? '\n\n要点：\n' + keyPoints.map((k) => `• ${k}`).join('\n') : ''}`

    if (currentStorageMode.value === 'local') {
      // 本地模式：通过 AES-256-GCM 加密落盘 IndexedDB
      const res = await createInteraction({
        contactId: selectedContactId.value,
        type: extractedData.value.interactionType || 'meeting',
        content: content,
        duration: recordSeconds.value || undefined,
        occurredAt: new Date().toISOString(),
      })

      if (res.success) {
        emitDataChanged('interactions', 'create')
        uni.showToast({ title: '已本地加密保存', icon: 'success' })
        setTimeout(() => {
          resetState()
          uni.navigateBack()
        }, 500)
      } else {
        errorMessage.value = '保存至本地失败'
      }
    } else {
      // 云端模式：请求云端保存
      const res = await saveVoiceNote({
        contactId: selectedContactId.value,
        transcript: transcript.value,
        summary: extractedData.value.summary,
        keyPoints: extractedData.value.keyPoints,
        reminderAction: extractedData.value.reminder?.action,
        reminderDays: extractedData.value.reminder?.daysLater,
      })

      if (res.success) {
        emitDataChanged('interactions', 'create')
        uni.showToast({ title: '已同步保存', icon: 'success' })
        setTimeout(() => {
          resetState()
          uni.navigateBack()
        }, 500)
      } else {
        errorMessage.value = res.error || '保存失败'
      }
    }
  } catch (error: any) {
    errorMessage.value = `保存失败: ${error.message}`
  } finally {
    isSaving.value = false
  }
}

function resetState() {
  transcript.value = ''
  liveTranscript.value = ''
  hasRecorded.value = false
  extractedData.value = null
  selectedContactId.value = ''
  errorMessage.value = ''
  recordSeconds.value = 0
  volumeLevel.value = 0
}

function handleManualInput() {
  const text = prompt('请输入或粘贴语音转录文本:')
  if (text && text.trim()) {
    transcript.value = text.trim()
    handleAutoExtract()
  }
}

function selectContact(contact: Contact) {
  selectedContactId.value = contact.id
  showContactPicker.value = false
}
</script>

<template>
  <view class="voice-note-page">
    <!-- 顶部隐私与引擎模式状态卡片 -->
    <view class="mode-header-card">
      <view class="mode-info">
        <view class="mode-badge" :class="engineMode">
          <text class="mode-badge-icon">{{ engineMode === 'online' ? '⚡' : '🛡️' }}</text>
          <text class="mode-badge-text">
            {{ engineMode === 'online' ? '原生极速模式 (实时流式·边说边出字)' : '端侧离线模式 (零上传·保护隐私)' }}
          </text>
        </view>
        <view class="mode-desc">
          {{
            engineMode === 'online'
              ? '调用浏览器原生语音识别引擎，毫秒级响应，说话实时显字'
              : '录音与转写 100% 在本地完成，音频绝不离开设备'
          }}
        </view>
      </view>
      <view class="mode-switch-btn" @click="toggleEngineMode">
        <text class="switch-text">{{ engineMode === 'online' ? '切至离线' : '切至原生' }}</text>
      </view>
    </view>

    <!-- 离线模型下载/就绪提示条 (仅离线模式展示) -->
    <view v-if="engineMode === 'offline'" class="model-status-strip">
      <view v-if="isModelCached" class="status-ready">
        <text class="status-icon">⚡</text>
        <text class="status-text">SenseVoice 离线加速引擎已持久就绪 (0秒启动)</text>
      </view>
      <view v-else-if="modelStatus === 'downloading'" class="status-downloading">
        <view class="progress-info">
          <text class="progress-title">📥 正在下载离线 ASR 模型权重...</text>
          <text class="progress-pct">{{ modelProgress?.percent || 0 }}%</text>
        </view>
        <view class="progress-bar">
          <view class="progress-fill" :style="{ width: `${modelProgress?.percent || 0}%` }"></view>
        </view>
      </view>
      <view v-else class="status-prompt" @click="triggerModelDownload">
        <text class="prompt-icon">💡</text>
        <text class="prompt-text">点击预载 SenseVoice 离线模型 (~110MB)，断网亦可秒速识别</text>
        <text class="prompt-action">立即预载 ➔</text>
      </view>
    </view>

    <!-- 核心录音区 -->
    <view class="record-section">
      <view class="record-card">
        <view class="record-title">语音速记</view>
        <view class="record-subtitle">说出与联系人的沟通经过，自动提取要点与待办</view>

        <!-- 录音主按钮 -->
        <view class="record-button-wrapper">
          <view
            class="record-button"
            :class="{ recording: isRecording, transcribing: isTranscribing }"
            @click="toggleRecording"
          >
            <view class="record-icon">
              {{ isRecording ? '⏹' : isTranscribing ? '⏳' : '🎙️' }}
            </view>
            <view class="record-text">
              {{ isRecording ? '点击停止' : isTranscribing ? '正在转写...' : '开始说话' }}
            </view>
          </view>

          <!-- 实时声波动画 (基于 RMS 音量电平) -->
          <view v-if="isRecording" class="waveform-container">
            <view class="wave-timer">{{ formattedDuration }}</view>
            <view class="soundwave-bars">
              <view
                v-for="i in 9"
                :key="i"
                class="soundwave-bar"
                :style="{
                  height: `${Math.max(12, Math.min(64, volumeLevel * (0.4 + (i % 4) * 0.2)))}rpx`,
                }"
              ></view>
            </view>
          </view>

          <!-- 实时流式字幕呈现区 (边说边出字) -->
          <view v-if="isRecording" class="live-stream-box">
            <view class="live-stream-header">
              <view class="live-pulse-dot" />
              <text class="live-stream-badge">正在实时转写中</text>
            </view>
            <view class="live-stream-body">
              <text v-if="liveTranscript" class="live-text">{{ liveTranscript }}</text>
              <text v-else class="live-placeholder">请说话，转写文字将在此实时呈现...</text>
              <text class="typing-cursor">|</text>
            </view>
          </view>
        </view>

        <!-- 备选方式提示 -->
        <view class="manual-input-hint" @click="handleManualInput">
          <text class="hint-text">💡 环境不便说话？点击手动输入或粘贴纪要</text>
        </view>
      </view>
    </view>

    <!-- 转录结果呈现卡片 -->
    <view v-if="transcript || hasRecorded" class="transcript-section">
      <view class="transcript-card">
        <view class="card-header">
          <view class="card-title">📝 语音转录文本</view>
          <view class="badge-tag">自动标点·可编辑</view>
        </view>
        <textarea
          v-model="transcript"
          class="transcript-textarea"
          placeholder="转录结果沉淀在此，可直接二次编辑修改..."
          :auto-height="true"
        />
        <view class="transcript-actions">
          <button class="action-btn primary" :loading="isProcessing" @click="handleAutoExtract">
            {{ isProcessing ? '解析中...' : '⚡ 提取结构化要点' }}
          </button>
          <button class="action-btn secondary" @click="resetState">清空</button>
        </view>
      </view>
    </view>

    <!-- 关联联系人卡片 -->
    <view v-if="transcript || hasRecorded" class="contact-section">
      <view class="contact-card">
        <view class="card-title">👤 关联联系人</view>
        <view class="contact-selector-box" @click="showContactPicker = true">
          <view v-if="selectedContact" class="selected-contact-view">
            <text class="contact-name">{{ selectedContact.name }}</text>
            <text v-if="selectedContact.company" class="contact-comp">
              {{ selectedContact.company }}
            </text>
            <text v-if="selectedContact.title" class="contact-title">
              · {{ selectedContact.title }}
            </text>
          </view>
          <view v-else class="empty-contact-placeholder">
            <text class="placeholder-text">点击选择要关联的联系人...</text>
          </view>
          <text class="arrow-icon">▼</text>
        </view>
      </view>
    </view>

    <!-- 提取结果呈现 -->
    <view v-if="extractedData" class="extracted-section">
      <view class="extracted-card">
        <view class="card-header">
          <view class="card-title">✨ 结构化归档纪要</view>
          <text class="type-pill">{{ extractedData.interactionType || '沟通' }}</text>
        </view>

        <!-- 摘要 -->
        <view class="extracted-item">
          <text class="extracted-label">📌 核心摘要</text>
          <text class="extracted-value">{{ extractedData.summary }}</text>
        </view>

        <!-- 要点 -->
        <view v-if="extractedData.keyPoints && extractedData.keyPoints.length > 0" class="extracted-item">
          <text class="extracted-label">🎯 关键要点</text>
          <view class="key-points-list">
            <view v-for="(point, idx) in extractedData.keyPoints" :key="idx" class="key-point-chip">
              • {{ point }}
            </view>
          </view>
        </view>

        <!-- 提醒事项 -->
        <view v-if="extractedData.reminder" class="extracted-item reminder-box">
          <text class="reminder-icon">⏰</text>
          <view class="reminder-content">
            <text class="reminder-time">{{ extractedData.reminder.daysLater }} 天后待办提醒</text>
            <text class="reminder-action">{{ extractedData.reminder.action }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 错误反馈提示 -->
    <view v-if="errorMessage" class="error-section">
      <view class="error-card">
        <text class="error-icon">⚠️</text>
        <text class="error-text">{{ errorMessage }}</text>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view v-if="transcript || hasRecorded" class="save-section">
      <button class="save-button" :loading="isSaving" @click="handleSave">
        {{ currentStorageMode === 'local' ? '🛡️ 本地加密保存纪要' : '☁️ 同步保存纪要' }}
      </button>
    </view>

    <!-- 联系人选择弹窗 Modal -->
    <view v-if="showContactPicker" class="picker-overlay" @click.self="showContactPicker = false">
      <view class="picker-panel">
        <view class="picker-header">
          <text class="picker-title">选择关联联系人</text>
          <text class="picker-close" @click="showContactPicker = false">✕</text>
        </view>
        <view class="picker-search">
          <input
            v-model="contactSearch"
            class="search-input"
            placeholder="搜索联系人姓名或公司..."
          />
        </view>
        <scroll-view scroll-y class="contact-list-scroll">
          <view
            v-for="c in filteredContacts"
            :key="c.id"
            class="contact-item"
            :class="{ active: c.id === selectedContactId }"
            @click="selectContact(c)"
          >
            <view class="contact-item-main">
              <text class="item-name">{{ c.name }}</text>
              <text v-if="c.company" class="item-comp">{{ c.company }}</text>
            </view>
            <text v-if="c.id === selectedContactId" class="check-icon">✓</text>
          </view>
          <view v-if="filteredContacts.length === 0" class="empty-list">
            <text class="empty-text">未找到匹配的联系人</text>
          </view>
        </scroll-view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.voice-note-page {
  min-height: 100%;
  box-sizing: border-box;
  background-color: #F8F9FA;
  padding: 32rpx;
  padding-bottom: 220rpx;
}

/* ---- 顶部隐私与引擎模式卡片 ---- */
.mode-header-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(108, 92, 231, 0.06);
}

.mode-info {
  flex: 1;
}

.mode-badge {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 6rpx 16rpx;
  border-radius: 12rpx;
  margin-bottom: 8rpx;
}

.mode-badge.offline {
  background: #E8F8F5;
}

.mode-badge.offline .mode-badge-text {
  color: #00B894;
  font-weight: 600;
  font-size: 24rpx;
}

.mode-badge.online {
  background: #EFF6FF;
}

.mode-badge.online .mode-badge-text {
  color: #3B82F6;
  font-weight: 600;
  font-size: 24rpx;
}

.mode-desc {
  font-size: 22rpx;
  color: #8395A7;
}

.mode-switch-btn {
  padding: 10rpx 20rpx;
  background: #F1F2F6;
  border-radius: 20rpx;
}

.switch-text {
  font-size: 24rpx;
  color: #576574;
}

/* ---- 离线模型状态条 ---- */
.model-status-strip {
  margin-bottom: 24rpx;
}

.status-ready {
  background: #E8F8F5;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.status-icon {
  font-size: 28rpx;
}

.status-text {
  font-size: 24rpx;
  color: #00B894;
  font-weight: 500;
}

.status-downloading {
  background: #EFF6FF;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
}

.progress-info {
  display: flex;
  justify-content: space-between;
  margin-bottom: 12rpx;
}

.progress-title {
  font-size: 24rpx;
  color: #2563EB;
}

.progress-pct {
  font-size: 24rpx;
  color: #2563EB;
  font-weight: 600;
}

.progress-bar {
  height: 12rpx;
  background: #DBEAFE;
  border-radius: 6rpx;
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: #2563EB;
  transition: width 0.2s ease;
}

.status-prompt {
  background: #FFF9E6;
  border-radius: 16rpx;
  padding: 16rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
  cursor: pointer;
}

.prompt-icon {
  font-size: 28rpx;
}

.prompt-text {
  font-size: 24rpx;
  color: #D97706;
  flex: 1;
}

.prompt-action {
  font-size: 24rpx;
  color: #D97706;
  font-weight: 600;
}

/* ---- 录音卡片 ---- */
.record-section {
  margin-bottom: 32rpx;
}

.record-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  text-align: center;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.record-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 12rpx;
}

.record-subtitle {
  font-size: 26rpx;
  color: #636E72;
  margin-bottom: 36rpx;
}

.record-button-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.record-button {
  width: 260rpx;
  height: 260rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  box-shadow: 0 16rpx 40rpx rgba(108, 92, 231, 0.32);
  transition: all 0.3s;
  cursor: pointer;
  user-select: none;
}

.record-button.recording {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
  box-shadow: 0 16rpx 40rpx rgba(255, 107, 107, 0.4);
  animation: pulse 1.5s infinite;
}

.record-button.transcribing {
  background: linear-gradient(135deg, #00B894 0%, #55EFC4 100%);
}

.record-icon {
  font-size: 90rpx;
  line-height: 1;
}

.record-text {
  font-size: 30rpx;
  color: #FFFFFF;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.04);
  }
}

/* 实时波形 */
.waveform-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.wave-timer {
  font-size: 30rpx;
  font-weight: 600;
  color: #FF6B6B;
}

.soundwave-bars {
  display: flex;
  align-items: center;
  gap: 8rpx;
  height: 70rpx;
}

.soundwave-bar {
  width: 8rpx;
  background: #FF6B6B;
  border-radius: 4rpx;
  transition: height 0.08s ease;
}

/* ---- 实时流式转录呈现面板 ---- */
.live-stream-box {
  margin-top: 24rpx;
  background: linear-gradient(135deg, #F3F0FF 0%, #FAF8FF 100%);
  border: 2rpx solid #D6D0FE;
  border-radius: 20rpx;
  padding: 24rpx;
  width: 100%;
  box-sizing: border-box;
  animation: liveFadeIn 0.3s ease;
}

@keyframes liveFadeIn {
  from { opacity: 0; transform: translateY(10rpx); }
  to { opacity: 1; transform: translateY(0); }
}

.live-stream-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.live-pulse-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #6C5CE7;
  animation: pulseDot 1.2s infinite ease-in-out;
}

@keyframes pulseDot {
  0% { transform: scale(0.8); opacity: 0.5; }
  50% { transform: scale(1.3); opacity: 1; }
  100% { transform: scale(0.8); opacity: 0.5; }
}

.live-stream-badge {
  font-size: 22rpx;
  font-weight: 600;
  color: #6C5CE7;
}

.live-stream-body {
  min-height: 72rpx;
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.live-text {
  font-size: 30rpx;
  color: #2D3436;
  line-height: 1.5;
  font-weight: 500;
  word-break: break-all;
}

.live-placeholder {
  font-size: 26rpx;
  color: #A0AEC0;
  line-height: 1.5;
  font-style: italic;
}

.typing-cursor {
  font-size: 32rpx;
  color: #6C5CE7;
  font-weight: bold;
  animation: blinkCursor 0.8s infinite;
  margin-left: 4rpx;
}

@keyframes blinkCursor {
  0%, 100% { opacity: 1; }
  50% { opacity: 0; }
}

.manual-input-hint {
  padding: 18rpx 28rpx;
  background: #F8F9FA;
  border-radius: 16rpx;
  text-align: center;
  cursor: pointer;
}

.hint-text {
  font-size: 25rpx;
  color: #6C5CE7;
}

/* ---- 转录结果卡片 ---- */
.transcript-section {
  margin-bottom: 24rpx;
}

.transcript-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 20rpx;
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.badge-tag {
  font-size: 22rpx;
  color: #6C5CE7;
  background: #F0EDFE;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
}

.transcript-textarea {
  width: 100%;
  box-sizing: border-box;
  background: #F8F9FA;
  border-radius: 16rpx;
  padding: 20rpx;
  font-size: 28rpx;
  color: #2D3436;
  line-height: 1.6;
  min-height: 140rpx;
  margin-bottom: 24rpx;
}

.transcript-actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  height: 68rpx;
  line-height: 68rpx;
  font-size: 26rpx;
  border-radius: 14rpx;
  border: none;
}

.action-btn.primary {
  background: #6C5CE7;
  color: #FFFFFF;
  font-weight: 600;
}

.action-btn.secondary {
  background: #F1F2F6;
  color: #576574;
}

/* ---- 联系人选择器 ---- */
.contact-section {
  margin-bottom: 24rpx;
}

.contact-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.contact-selector-box {
  background: #F8F9FA;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 16rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  cursor: pointer;
}

.selected-contact-view {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.contact-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #2D3436;
}

.contact-comp,
.contact-title {
  font-size: 24rpx;
  color: #636E72;
}

.placeholder-text {
  font-size: 28rpx;
  color: #B2BEC3;
}

.arrow-icon {
  font-size: 22rpx;
  color: #B2BEC3;
}

/* ---- 提取结果卡片 ---- */
.extracted-section {
  margin-bottom: 32rpx;
}

.extracted-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.type-pill {
  font-size: 22rpx;
  color: #00B894;
  background: #E8F8F5;
  padding: 4rpx 14rpx;
  border-radius: 8rpx;
  font-weight: 600;
}

.extracted-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.extracted-item:last-child {
  border-bottom: none;
}

.extracted-label {
  display: block;
  font-size: 24rpx;
  color: #636E72;
  margin-bottom: 8rpx;
}

.extracted-value {
  display: block;
  font-size: 28rpx;
  color: #2D3436;
  line-height: 1.6;
}

.key-points-list {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  margin-top: 8rpx;
}

.key-point-chip {
  font-size: 26rpx;
  color: #2D3436;
  line-height: 1.5;
}

.reminder-box {
  background: #FFF9E6;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-top: 16rpx;
  display: flex;
  align-items: flex-start;
  gap: 16rpx;
  border-bottom: none;
}

.reminder-icon {
  font-size: 36rpx;
}

.reminder-content {
  flex: 1;
}

.reminder-time {
  display: block;
  font-size: 24rpx;
  color: #D97706;
  font-weight: 600;
  margin-bottom: 4rpx;
}

.reminder-action {
  font-size: 26rpx;
  color: #92400E;
}

/* ---- 错误卡片 ---- */
.error-section {
  margin-bottom: 24rpx;
}

.error-card {
  background: #FFE5E5;
  border-radius: 16rpx;
  padding: 20rpx 24rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.error-icon {
  font-size: 28rpx;
}

.error-text {
  font-size: 26rpx;
  color: #D63031;
}

/* ---- 底部固定保存区 ---- */
.save-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(248, 249, 250, 0.95);
  backdrop-filter: blur(16rpx);
  z-index: 100;
}

@media screen and (min-width: 500px) {
  .save-section {
    max-width: 440px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.save-button {
  height: 92rpx;
  line-height: 92rpx;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 24rpx;
  border: none;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.3);
}

/* ---- 联系人弹窗 ---- */
.picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: flex-end;
  z-index: 999;
}

.picker-panel {
  width: 100%;
  background: #FFFFFF;
  border-radius: 32rpx 32rpx 0 0;
  max-height: 70vh;
  display: flex;
  flex-direction: column;
}

@media screen and (min-width: 500px) {
  .picker-overlay {
    max-width: 440px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.picker-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 32rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.picker-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
}

.picker-close {
  font-size: 36rpx;
  color: #B2BEC3;
  cursor: pointer;
}

.picker-search {
  padding: 20rpx 32rpx;
}

.search-input {
  height: 72rpx;
  background: #F8F9FA;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.contact-list-scroll {
  flex: 1;
  max-height: 480rpx;
  padding: 0 32rpx 32rpx;
  box-sizing: border-box;
}

.contact-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 16rpx;
  border-bottom: 1rpx solid #F8F9FA;
}

.contact-item.active {
  background: #F0EDFE;
  border-radius: 12rpx;
}

.contact-item-main {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.item-name {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.item-comp {
  font-size: 24rpx;
  color: #636E72;
}

.check-icon {
  font-size: 30rpx;
  color: #6C5CE7;
  font-weight: bold;
}

.empty-list {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: #B2BEC3;
}
</style>
