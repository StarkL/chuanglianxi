<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createInteraction } from '../../../api/interactions'

const contactId = ref('')
const saving = ref(false)

const typeOptions = [
  { value: 'manual_note', label: '手动笔记', icon: '📝', color: '#74B9FF' },
  { value: 'call', label: '通话', icon: '📞', color: '#6C5CE7' },
  { value: 'meeting', label: '会议', icon: '🤝', color: '#FD79A8' },
  { value: 'voice_note', label: '语音笔记', icon: '🎙️', color: '#00B894' },
  { value: 'chat_export', label: '聊天记录', icon: '💬', color: '#FDCB6E' },
]
const selectedType = ref('manual_note')
const content = ref('')
const duration = ref('')
const occurredAt = ref('')

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { contactId?: string } } }
  contactId.value = currentPage.$page.options?.contactId || ''
})

function selectType(value: string) {
  selectedType.value = value
}

async function handleSave() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入交互内容', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const durationNum = duration.value ? parseInt(duration.value, 10) : undefined
    const data = {
      contactId: contactId.value,
      type: selectedType.value,
      content: content.value.trim(),
      ...(durationNum && !isNaN(durationNum) ? { duration: durationNum } : {}),
      ...(occurredAt.value ? { occurredAt: occurredAt.value } : {}),
    }

    await createInteraction(data)
    uni.showToast({ title: '已保存', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="add-page">
    <!-- 交互类型选择 -->
    <view class="form-card">
      <view class="card-title">交互类型</view>
      <view class="type-grid">
        <view
          v-for="type in typeOptions"
          :key="type.value"
          class="type-btn"
          :class="{ active: selectedType === type.value }"
          @click="selectType(type.value)"
        >
          <view
            class="type-icon"
            :style="{
              backgroundColor: selectedType === type.value ? type.color + '18' : '#F0F0F0'
            }"
          >
            <text class="type-emoji">{{ type.icon }}</text>
          </view>
          <text
            class="type-label"
            :style="{ color: selectedType === type.value ? type.color : '#636E72' }"
          >{{ type.label }}</text>
        </view>
      </view>
    </view>

    <!-- 内容输入 -->
    <view class="form-card">
      <view class="card-title">内容记录</view>
      <view class="textarea-wrapper">
        <wd-textarea v-model="content" placeholder="记录交互内容..." :maxlength="500" show-word-limit />
      </view>
    </view>

    <!-- 附加信息 -->
    <view class="form-card">
      <view class="card-title">附加信息</view>

      <view class="form-row">
        <view class="form-item half">
          <text class="form-label">时长（分钟）</text>
          <view class="form-input">
            <wd-input v-model="duration" placeholder="输入时长" type="number" />
          </view>
        </view>
        <view class="form-item half">
          <text class="form-label">时间</text>
          <view class="form-input">
            <wd-input v-model="occurredAt" placeholder="如: 2026-04-16 14:00" />
          </view>
        </view>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="submit-area">
      <button class="submit-btn" :loading="saving" @click="handleSave">保存记录</button>
    </view>
  </view>
</template>

<style scoped>
.add-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 32rpx;
  padding-bottom: 180rpx;
}

/* ---- 表单卡片 ---- */
.form-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.card-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 24rpx;
}

/* ---- 交互类型选择 ---- */
.type-grid {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.type-btn {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 20rpx 12rpx;
  border-radius: 20rpx;
  background: #F8F9FA;
  flex: 1;
  min-width: 0;
  transition: all 0.2s;
}

.type-btn.active {
  background: #FFFFFF;
  box-shadow: 0 4rpx 20rpx rgba(108, 92, 231, 0.15);
}

.type-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 18rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-emoji {
  font-size: 34rpx;
}

.type-label {
  font-size: 22rpx;
  font-weight: 500;
  text-align: center;
  white-space: nowrap;
}

/* ---- 内容输入 ---- */
.textarea-wrapper {
  background: #F8F9FA;
  border-radius: 16rpx;
  overflow: hidden;
}

/* ---- 附加信息 ---- */
.form-row {
  display: flex;
  gap: 20rpx;
}

.form-item.half {
  flex: 1;
}

.form-label {
  display: block;
  font-size: 26rpx;
  color: #636E72;
  margin-bottom: 12rpx;
}

.form-input {
  background: #F8F9FA;
  border-radius: 16rpx;
  overflow: hidden;
}

/* ---- 保存按钮 ---- */
.submit-area {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(248, 249, 250, 0.95);
  backdrop-filter: blur(16rpx);
}

.submit-btn {
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

.submit-btn::after {
  border: none;
}
</style>
