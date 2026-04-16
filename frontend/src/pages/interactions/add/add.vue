<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createInteraction } from '../../../api/interactions.js'

const contactId = ref('')
const saving = ref(false)

const typeOptions = [
  { value: 'manual_note', label: '📝 手动笔记' },
  { value: 'call', label: '📞 通话' },
  { value: 'meeting', label: '🤝 会议' },
  { value: 'voice_note', label: '🎙️ 语音笔记' },
  { value: 'chat_export', label: '💬 聊天记录' },
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

function selectType(type: string) {
  selectedType.value = type
}

async function handleSave() {
  if (!content.value.trim()) {
    uni.showToast({ title: '请输入交互内容', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const data: Record<string, unknown> = {
      contactId: contactId.value,
      type: selectedType.value,
      content: content.value.trim(),
    }
    if (duration.value) data.duration = parseInt(duration.value, 10)
    if (occurredAt.value) data.occurredAt = occurredAt.value

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
    <view class="form">
      <view class="form-group">
        <text class="label">交互类型</text>
        <view class="type-selector">
          <view
            v-for="type in typeOptions"
            :key="type.value"
            :class="['type-item', selectedType === type.value ? 'selected' : '']"
            @click="selectType(type.value)"
          >
            <text class="type-label">{{ type.label }}</text>
          </view>
        </view>
      </view>

      <view class="form-group">
        <text class="label">内容 <text class="required">*</text></text>
        <textarea
          class="textarea"
          v-model="content"
          placeholder="输入交互内容"
          maxlength="500"
        />
      </view>

      <view class="form-group">
        <text class="label">时长（分钟，可选）</text>
        <input class="input" v-model="duration" placeholder="输入时长" type="number" />
      </view>

      <view class="form-group">
        <text class="label">时间（可选）</text>
        <input class="input" v-model="occurredAt" placeholder="例如: 2026-04-16 14:00" />
      </view>
    </view>

    <button class="save-btn" :loading="saving" :disabled="saving" @click="handleSave">
      保存
    </button>
  </view>
</template>

<style scoped>
.add-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.form {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-group:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.required {
  color: #e64340;
}

.type-selector {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.type-item {
  padding: 12rpx 24rpx;
  background-color: #f6f6f6;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666;
}

.type-item.selected {
  background-color: #07c160;
  color: #fff;
}

.type-label {
  font-size: 24rpx;
}

.textarea {
  width: 100%;
  min-height: 200rpx;
  background-color: #f6f6f6;
  border-radius: 12rpx;
  padding: 24rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.input {
  height: 80rpx;
  background-color: #f6f6f6;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.save-btn {
  position: fixed;
  bottom: 64rpx;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 64rpx);
  height: 88rpx;
  line-height: 88rpx;
  background-color: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}
</style>
