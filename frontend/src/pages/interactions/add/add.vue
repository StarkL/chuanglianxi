<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createInteraction } from '../../../api/interactions.js'

const contactId = ref('')
const saving = ref(false)

const typeOptions = [
  { value: 'manual_note', label: '手动笔记' },
  { value: 'call', label: '通话' },
  { value: 'meeting', label: '会议' },
  { value: 'voice_note', label: '语音笔记' },
  { value: 'chat_export', label: '聊天记录' },
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
    <view class="form-section">
      <wd-form-item label="交互类型">
        <wd-radio-group v-model="selectedType" shape="button" @update:model-value="">
          <wd-radio v-for="type in typeOptions" :key="type.value" :value="type.value">
            {{ type.label }}
          </wd-radio>
        </wd-radio-group>
      </wd-form-item>

      <wd-form-item label="内容">
        <wd-textarea v-model="content" placeholder="记录交互内容" :maxlength="500" show-word-limit />
      </wd-form-item>

      <wd-form-item label="时长（分钟，可选）">
        <wd-input v-model="duration" placeholder="输入时长" type="number" />
      </wd-form-item>

      <wd-form-item label="时间（可选）">
        <wd-input v-model="occurredAt" placeholder="例如: 2026-04-16 14:00" />
      </wd-form-item>
    </view>

    <wd-button type="primary" block :loading="saving" @click="handleSave">保存</wd-button>
  </view>
</template>

<style scoped>
.add-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.form-section {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
}
</style>
