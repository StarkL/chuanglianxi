<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { SpeechRecognizer } from '../../utils/speech-recognition'
import { processVoiceNote, saveVoiceNote } from '../../api/voice-note'
import type { VoiceNoteExtractResult } from '../../api/voice-note'
import { emitDataChanged } from '../../utils/events'

// 状态
const isRecording = ref(false)
const isProcessing = ref(false)
const isSaving = ref(false)
const transcript = ref('')
const extractedData = ref<VoiceNoteExtractResult | null>(null)
const selectedContactId = ref('')
const errorMessage = ref('')

// 浏览器支持检查
const isSupported = computed(() => SpeechRecognizer.isSupported())

// 录音器实例
let recognizer: SpeechRecognizer | null = null

onMounted(() => {
  if (isSupported.value) {
    recognizer = new SpeechRecognizer({
      language: 'zh-CN',
      continuous: false,
      interimResults: false,
    })
  }
})

onUnmounted(() => {
  if (recognizer) {
    recognizer.stop()
  }
})

/**
 * 开始/停止录音
 */
async function toggleRecording() {
  if (!isSupported.value) {
    errorMessage.value = '当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器'
    return
  }

  if (isRecording.value) {
    // 停止录音
    recognizer?.stop()
    isRecording.value = false
  } else {
    // 开始录音
    errorMessage.value = ''
    transcript.value = ''
    extractedData.value = null
    isRecording.value = true

    try {
      const result = await recognizer!.start()
      transcript.value = result.transcript
      isRecording.value = false

      // 自动处理转录文本
      await handleProcess()
    } catch (error: any) {
      isRecording.value = false
      errorMessage.value = `录音失败: ${error.message}`
    }
  }
}

/**
 * 处理转录文本，提取结构化信息
 */
async function handleProcess() {
  if (!transcript.value.trim()) {
    errorMessage.value = '没有识别到语音内容'
    return
  }

  isProcessing.value = true
  errorMessage.value = ''

  try {
    const response = await processVoiceNote(transcript.value, selectedContactId.value || undefined)
    extractedData.value = response.extracted

    // 如果 AI 识别到联系人姓名，尝试匹配现有联系人
    if (response.extracted.contactName && !selectedContactId.value) {
      // TODO: 实现联系人搜索和自动匹配
      console.log('识别到联系人:', response.extracted.contactName)
    }
  } catch (error: any) {
    errorMessage.value = `处理失败: ${error.message}`
  } finally {
    isProcessing.value = false
  }
}

/**
 * 保存语音笔记
 */
async function handleSave() {
  if (!selectedContactId.value) {
    errorMessage.value = '请选择联系人'
    return
  }

  if (!extractedData.value) {
    errorMessage.value = '请先处理语音内容'
    return
  }

  isSaving.value = true
  errorMessage.value = ''

  try {
    await saveVoiceNote({
      contactId: selectedContactId.value,
      transcript: transcript.value,
      summary: extractedData.value.summary,
      keyPoints: extractedData.value.keyPoints,
      reminderAction: extractedData.value.reminder?.action,
      reminderDays: extractedData.value.reminder?.daysLater,
    })

    emitDataChanged('interactions', 'create')
    uni.showToast({ title: '已保存', icon: 'success' })

    // 重置状态
    setTimeout(() => {
      resetState()
      uni.navigateBack()
    }, 500)
  } catch (error: any) {
    errorMessage.value = `保存失败: ${error.message}`
  } finally {
    isSaving.value = false
  }
}

/**
 * 重置状态
 */
function resetState() {
  transcript.value = ''
  extractedData.value = null
  selectedContactId.value = ''
  errorMessage.value = ''
}

/**
 * 手动输入转录文本
 */
function handleManualInput() {
  const text = prompt('请输入语音转录文本:')
  if (text) {
    transcript.value = text
    handleProcess()
  }
}
</script>

<template>
  <view class="voice-note-page">
    <!-- 不支持提示 -->
    <view v-if="!isSupported" class="not-supported-card">
      <text class="not-supported-icon">⚠️</text>
      <text class="not-supported-text">
        当前浏览器不支持语音识别，请使用 Chrome 或 Edge 浏览器
      </text>
    </view>

    <!-- 录音按钮 -->
    <view v-else class="record-section">
      <view class="record-card">
        <view class="record-title">语音速记</view>
        <view class="record-subtitle">说出你与联系人的交互，AI 自动整理归档</view>

        <view class="record-button-wrapper">
          <button
            class="record-button"
            :class="{ recording: isRecording }"
            @click="toggleRecording"
            :disabled="isProcessing"
          >
            <view class="record-icon">
              {{ isRecording ? '⏹' : '🎙️' }}
            </view>
            <text class="record-text">
              {{ isRecording ? '停止录音' : '开始录音' }}
            </text>
          </button>

          <view v-if="isRecording" class="recording-indicator">
            <view class="pulse-dot"></view>
            <text class="recording-text">正在录音...</text>
          </view>
        </view>

        <view class="manual-input-hint" @click="handleManualInput">
          <text class="hint-text">💡 无法录音？点击手动输入</text>
        </view>
      </view>
    </view>

    <!-- 转录结果 -->
    <view v-if="transcript" class="transcript-section">
      <view class="transcript-card">
        <view class="card-title">语音转录</view>
        <view class="transcript-content">
          <text>{{ transcript }}</text>
        </view>
        <view class="transcript-actions">
          <button class="small-btn" @click="handleProcess" :disabled="isProcessing">
            {{ isProcessing ? '处理中...' : '重新处理' }}
          </button>
          <button class="small-btn secondary" @click="resetState">清空</button>
        </view>
      </view>
    </view>

    <!-- AI 提取结果 -->
    <view v-if="extractedData" class="extracted-section">
      <view class="extracted-card">
        <view class="card-title">AI 整理结果</view>

        <!-- 摘要 -->
        <view class="extracted-item">
          <text class="extracted-label">📝 摘要</text>
          <text class="extracted-value">{{ extractedData.summary }}</text>
        </view>

        <!-- 要点 -->
        <view v-if="extractedData.keyPoints.length > 0" class="extracted-item">
          <text class="extracted-label">⭐ 要点</text>
          <view class="key-points">
            <view v-for="(point, index) in extractedData.keyPoints" :key="index" class="key-point-tag">
              {{ point }}
            </view>
          </view>
        </view>

        <!-- 提醒 -->
        <view v-if="extractedData.reminder" class="extracted-item highlight">
          <text class="extracted-label">⏰ 提醒</text>
          <text class="extracted-value">
            {{ extractedData.reminder.daysLater }}天后：{{ extractedData.reminder.action }}
          </text>
        </view>

        <!-- 识别到的联系人 -->
        <view v-if="extractedData.contactName" class="extracted-item">
          <text class="extracted-label">👤 识别到联系人</text>
          <text class="extracted-value">
            {{ extractedData.contactName }}
            <text v-if="extractedData.company"> · {{ extractedData.company }}</text>
            <text v-if="extractedData.title"> · {{ extractedData.title }}</text>
          </text>
        </view>
      </view>
    </view>

    <!-- 选择联系人 -->
    <view v-if="extractedData" class="contact-section">
      <view class="contact-card">
        <view class="card-title">选择联系人</view>
        <view class="contact-input">
          <wd-input
            v-model="selectedContactId"
            placeholder="输入联系人 ID（TODO: 实现联系人选择器）"
            type="text"
          />
        </view>
      </view>
    </view>

    <!-- 错误提示 -->
    <view v-if="errorMessage" class="error-section">
      <view class="error-card">
        <text class="error-text">{{ errorMessage }}</text>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view v-if="extractedData && selectedContactId" class="save-section">
      <button class="save-button" :loading="isSaving" @click="handleSave">
        保存语音笔记
      </button>
    </view>
  </view>
</template>

<style scoped>
.voice-note-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 32rpx;
  padding-bottom: 180rpx;
}

/* ---- 不支持提示 ---- */
.not-supported-card {
  background: #FFF3CD;
  border-radius: 24rpx;
  padding: 40rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
}

.not-supported-icon {
  font-size: 64rpx;
}

.not-supported-text {
  font-size: 28rpx;
  color: #856404;
  text-align: center;
}

/* ---- 录音区域 ---- */
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
  margin-bottom: 40rpx;
}

.record-button-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 32rpx;
}

.record-button {
  width: 240rpx;
  height: 240rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  border: none;
  box-shadow: 0 12rpx 40rpx rgba(108, 92, 231, 0.3);
  transition: all 0.3s;
}

.record-button.recording {
  background: linear-gradient(135deg, #FF6B6B 0%, #FF8E8E 100%);
  animation: pulse 1.5s infinite;
}

.record-button:disabled {
  opacity: 0.5;
}

.record-icon {
  font-size: 80rpx;
}

.record-text {
  font-size: 28rpx;
  color: #FFFFFF;
  font-weight: 600;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.05);
  }
}

.recording-indicator {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.pulse-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #FF6B6B;
  animation: pulse-dot 1s infinite;
}

@keyframes pulse-dot {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.3;
  }
}

.recording-text {
  font-size: 26rpx;
  color: #FF6B6B;
}

.manual-input-hint {
  padding: 16rpx;
  background: #F8F9FA;
  border-radius: 12rpx;
}

.hint-text {
  font-size: 24rpx;
  color: #6C5CE7;
}

/* ---- 转录结果 ---- */
.transcript-section {
  margin-bottom: 32rpx;
}

.transcript-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 20rpx;
}

.transcript-content {
  background: #F8F9FA;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 20rpx;
  font-size: 28rpx;
  color: #2D3436;
  line-height: 1.6;
}

.transcript-actions {
  display: flex;
  gap: 16rpx;
}

.small-btn {
  flex: 1;
  height: 64rpx;
  line-height: 64rpx;
  background: #6C5CE7;
  color: #FFFFFF;
  font-size: 26rpx;
  border-radius: 12rpx;
  border: none;
}

.small-btn.secondary {
  background: #F8F9FA;
  color: #636E72;
}

/* ---- AI 提取结果 ---- */
.extracted-section {
  margin-bottom: 32rpx;
}

.extracted-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.extracted-item {
  padding: 20rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.extracted-item:last-child {
  border-bottom: none;
}

.extracted-item.highlight {
  background: #FFF9E6;
  border-radius: 12rpx;
  padding: 20rpx;
  margin: 16rpx 0;
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

.key-points {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 8rpx;
}

.key-point-tag {
  background: #E8F4FD;
  color: #0984E3;
  padding: 8rpx 20rpx;
  border-radius: 20rpx;
  font-size: 24rpx;
}

/* ---- 选择联系人 ---- */
.contact-section {
  margin-bottom: 32rpx;
}

.contact-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.contact-input {
  background: #F8F9FA;
  border-radius: 16rpx;
  overflow: hidden;
}

/* ---- 错误提示 ---- */
.error-section {
  margin-bottom: 32rpx;
}

.error-card {
  background: #FFE5E5;
  border-radius: 16rpx;
  padding: 20rpx;
}

.error-text {
  font-size: 26rpx;
  color: #D63031;
}

/* ---- 保存按钮 ---- */
.save-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(248, 249, 250, 0.95);
  backdrop-filter: blur(16rpx);
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

.save-button::after {
  border: none;
}
</style>
