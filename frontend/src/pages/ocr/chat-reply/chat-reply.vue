<script setup lang="ts">
import { ref } from 'vue'
import { request } from '../../../utils/request'

interface ReplyOption {
  style: string
  text: string
}

const selectedImagePath = ref('')
const loading = ref(false)
const detectedName = ref('')
const contactId = ref<string | null>(null)
const analysis = ref('')
const options = ref<ReplyOption[]>([])
const saveToInteraction = ref(true)
const userPreferences = ref('')

function previewSelectedImage() {
  if (selectedImagePath.value) {
    uni.previewImage({
      urls: [selectedImagePath.value],
      current: selectedImagePath.value,
    })
  }
}

async function selectImage() {
  try {
    const imageRes = await new Promise<any>((resolve, reject) => {
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: resolve,
        fail: reject,
      })
    })

    const imagePath = imageRes.tempFilePaths[0]
    selectedImagePath.value = imagePath
    
    // Reset output when new image selected
    analysis.value = ''
    options.value = []
    detectedName.value = ''
    contactId.value = null
  } catch (err) {
    console.error('Image selection failed:', err)
  }
}

async function generateReplies() {
  if (!selectedImagePath.value) {
    uni.showToast({ title: '请先选择微信聊天截图', icon: 'none' })
    return
  }

  loading.value = true
  uni.showLoading({ title: 'AI 深度分析中...' })

  try {
    // Convert image to base64
    const base64 = await new Promise<string>((resolve, reject) => {
      // #ifdef H5
      fetch(selectedImagePath.value)
        .then(res => res.blob())
        .then(blob => {
          const reader = new FileReader()
          reader.onloadend = () => {
            const dataUrl = reader.result as string
            const base64Str = dataUrl.split(',')[1]
            resolve(base64Str)
          }
          reader.onerror = reject
          reader.readAsDataURL(blob)
        })
        .catch(reject)
      // #endif

      // #ifdef MP-WEIXIN
      // @ts-ignore - uni-app API
      const fs = uni.getFileSystemManager()
      fs.readFile({
        filePath: selectedImagePath.value,
        encoding: 'base64',
        success: (res: any) => resolve(res.data),
        fail: reject,
      })
      // #endif
    })

    const res = await request<{
      detectedName: string
      contactId: string | null
      analysis: string
      options: ReplyOption[]
    }>({
      url: '/ocr/chat-reply',
      method: 'POST',
      data: {
        imageData: base64,
        userPreferences: userPreferences.value
      }
    })

    uni.hideLoading()

    if (res.success && res.data) {
      detectedName.value = res.data.detectedName
      contactId.value = res.data.contactId
      analysis.value = res.data.analysis
      options.value = res.data.options
      uni.showToast({ title: '生成成功', icon: 'success' })
    } else {
      uni.showToast({ title: res.error || '分析失败，请重试', icon: 'none' })
    }
  } catch (err) {
    uni.hideLoading()
    console.error('generateReplies error:', err)
    uni.showToast({ title: '系统错误，请重试', icon: 'none' })
  } finally {
    loading.value = false
  }
}

async function copyToClipboard(text: string, style: string) {
  uni.setClipboardData({
    data: text,
    success: async () => {
      uni.showToast({ title: '已复制话术', icon: 'success' })

      // Auto log as interaction if user checked the box and contact is matched
      if (saveToInteraction.value && contactId.value) {
        try {
          await request({
            url: '/interactions',
            method: 'POST',
            data: {
              contactId: contactId.value,
              type: 'chat_export',
              content: `使用【常联系AI嘴替】发送回复（风格：${style}）: "${text}"`,
              occurredAt: new Date().toISOString()
            }
          })
          console.log('Interaction logged automatically.')
        } catch (err) {
          console.error('Auto interaction log failed:', err)
        }
      }
    }
  })
}
</script>

<template>
  <view class="reply-page">
    <!-- 头部背景艺术渐变 -->
    <view class="header-art">
      <view class="header-art__bg" />
      <view class="header-art__content">
        <text class="title">AI 嘴替助理</text>
        <text class="subtitle">截图一键上传，AI 高情商回复，自动沉淀人脉</text>
      </view>
    </view>

    <view class="content-container">
      <!-- 截图选择器 -->
      <view class="card select-card" @click="selectImage">
        <view v-if="!selectedImagePath" class="select-placeholder">
          <wd-icon name="picture" size="48px" color="#6C5CE7" />
          <text class="placeholder-text">点击上传微信聊天截图</text>
          <text class="placeholder-sub">AI 将提取上下文，免去手动打字</text>
        </view>
        <view v-else class="preview-container">
          <image
            :src="selectedImagePath"
            mode="aspectFit"
            class="screenshot-preview"
            @click.stop="previewSelectedImage"
          />
          <view class="reselect-badge">重新选择</view>
        </view>
      </view>

      <!-- 偏好设置 -->
      <view class="card pref-card">
        <view class="section-title">
          <wd-icon name="setting" size="18px" color="#6C5CE7" />
          <text class="section-title-text">沟通偏好设定 (选填)</text>
        </view>
        <wd-input
          v-model="userPreferences"
          placeholder="例如：稍微幽默点、委婉拒绝、突出专业性等"
          clearable
          custom-class="pref-input"
        />
      </view>

      <!-- 触发按钮 -->
      <view class="btn-wrap">
        <wd-button
          block
          size="large"
          type="primary"
          :loading="loading"
          custom-class="generate-btn"
          @click="generateReplies"
        >
          一键生成高情商话术
        </wd-button>
      </view>

      <!-- AI 分析与话术结果展示 -->
      <view v-if="analysis || options.length > 0" class="result-section">
        <!-- 匹配人脉卡 -->
        <view class="card match-card animate-fade-in">
          <view class="match-info">
            <text class="match-label">聊天对象：</text>
            <view class="match-badge" :class="{ 'match-badge--matched': contactId }">
              <text class="match-name">{{ detectedName || '未识别' }}</text>
              <text class="match-status">{{ contactId ? '已关联人脉库' : '临时对话 (未关联)' }}</text>
            </view>
          </view>
          <!-- 智能自动记录选项 -->
          <view v-if="contactId" class="auto-log-row">
            <checkbox-group @change="saveToInteraction = !saveToInteraction">
              <label class="checkbox-label">
                <checkbox :checked="saveToInteraction" color="#6C5CE7" style="transform:scale(0.8)" />
                <text class="checkbox-text">复制话术时，自动将回复记录存入该联系人档案</text>
              </label>
            </checkbox-group>
          </view>
        </view>

        <!-- 语境分析卡 -->
        <view class="card analysis-card animate-fade-in">
          <view class="section-title">
            <wd-icon name="chat" size="18px" color="#FD79A8" />
            <text class="section-title-text">AI 语境透视</text>
          </view>
          <text class="analysis-text">{{ analysis }}</text>
        </view>

        <!-- 话术卡片列表 -->
        <view class="options-container">
          <view
            v-for="(opt, idx) in options"
            :key="idx"
            class="card option-card animate-fade-in"
            :style="{ animationDelay: `${idx * 0.15}s` }"
          >
            <view class="option-header">
              <view class="style-badge" :class="`style-badge--${idx}`">
                <text class="style-badge-text">{{ opt.style }}</text>
              </view>
              <wd-button
                size="small"
                type="primary"
                plain
                icon="copy"
                custom-class="copy-btn"
                @click="copyToClipboard(opt.text, opt.style)"
              >
                复制话术
              </wd-button>
            </view>
            <view class="option-body">
              <text class="option-text">{{ opt.text }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.reply-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding-bottom: 80rpx;
}

/* 头部艺术渐变 */
.header-art {
  position: relative;
  height: 280rpx;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  display: flex;
  align-items: flex-end;
  padding: 0 40rpx 50rpx;
  overflow: hidden;
  border-bottom-left-radius: 40rpx;
  border-bottom-right-radius: 40rpx;
  box-shadow: 0 10rpx 30rpx rgba(108, 92, 231, 0.15);
}

.header-art__bg {
  position: absolute;
  top: -80rpx;
  right: -80rpx;
  width: 300rpx;
  height: 300rpx;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 50%;
}

.header-art__content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.title {
  font-size: 44rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

/* 容器 */
.content-container {
  padding: 30rpx;
  display: flex;
  flex-direction: column;
  gap: 30rpx;
  margin-top: -30rpx;
}

/* 卡片通用 */
.card {
  background-color: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.05);
  transition: transform 0.3s ease;
}

/* 上传卡片 */
.select-card {
  min-height: 320rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 3rpx dashed rgba(108, 92, 231, 0.25);
  background-color: rgba(108, 92, 231, 0.02);
  cursor: pointer;
}

.select-placeholder {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  text-align: center;
}

.placeholder-text {
  font-size: 30rpx;
  font-weight: 600;
  color: #2D3436;
}

.placeholder-sub {
  font-size: 22rpx;
  color: #B2BEC3;
}

.preview-container {
  position: relative;
  width: 100%;
  height: 400rpx;
}

.screenshot-preview {
  width: 100%;
  height: 100%;
  border-radius: 16rpx;
}

.reselect-badge {
  position: absolute;
  bottom: 20rpx;
  right: 20rpx;
  background-color: rgba(0, 0, 0, 0.6);
  color: #FFFFFF;
  font-size: 22rpx;
  padding: 8rpx 20rpx;
  border-radius: 30rpx;
  backdrop-filter: blur(8rpx);
}

/* 偏好卡片 */
.pref-card {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.section-title-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.pref-input {
  --input-bg-color: #F8F9FA;
  border-radius: 12rpx;
}

/* 按钮 */
.btn-wrap {
  margin-top: 10rpx;
}

.generate-btn {
  --button-primary-bg-color: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  --button-primary-border-color: transparent;
  border-radius: 30rpx !important;
  font-weight: 600 !important;
}

/* 结果区 */
.result-section {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.match-card {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.match-info {
  display: flex;
  align-items: center;
}

.match-label {
  font-size: 26rpx;
  color: #636E72;
}

.match-badge {
  display: flex;
  flex-direction: column;
  gap: 4rpx;
  background-color: #F1F2F6;
  padding: 10rpx 20rpx;
  border-radius: 16rpx;
  border-left: 6rpx solid #B2BEC3;
  
  &--matched {
    background-color: rgba(108, 92, 231, 0.08);
    border-left-color: #6C5CE7;
  }
}

.match-name {
  font-size: 28rpx;
  font-weight: 700;
  color: #2D3436;
}

.match-status {
  font-size: 20rpx;
  color: #636E72;
}

.auto-log-row {
  border-top: 1rpx solid #F1F2F6;
  padding-top: 20rpx;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 10rpx;
}

.checkbox-text {
  font-size: 22rpx;
  color: #636E72;
}

.analysis-card {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.analysis-text {
  font-size: 26rpx;
  color: #2D3436;
  line-height: 1.6;
}

/* 话术选项 */
.options-container {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.option-card {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  border-left: 8rpx solid transparent;
}

.option-card:nth-child(1) { border-left-color: #6C5CE7; }
.option-card:nth-child(2) { border-left-color: #00B894; }
.option-card:nth-child(3) { border-left-color: #FD79A8; }

.option-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.style-badge {
  padding: 6rpx 20rpx;
  border-radius: 10rpx;
  
  &--0 {
    background-color: rgba(108, 92, 231, 0.1);
    color: #6C5CE7;
  }
  &--1 {
    background-color: rgba(0, 118, 94, 0.1);
    color: #00B894;
  }
  &--2 {
    background-color: rgba(253, 121, 168, 0.1);
    color: #FD79A8;
  }
}

.style-badge-text {
  font-size: 24rpx;
  font-weight: 600;
}

.copy-btn {
  --button-small-padding: 8rpx 20rpx !important;
  border-radius: 12rpx !important;
}

.option-body {
  background-color: #F8F9FA;
  padding: 24rpx;
  border-radius: 16rpx;
  border: 1rpx solid #F1F2F6;
}

.option-text {
  font-size: 28rpx;
  color: #2D3436;
  line-height: 1.6;
}

/* 动画效果 */
.animate-fade-in {
  animation: fadeIn 0.4s ease-out both;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style>
