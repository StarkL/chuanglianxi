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
    <wd-cell-group border inset>
      <wd-form-item label="交互类型">
        <view class="type-selector">
          <wd-tag
            v-for="type in typeOptions"
            :key="type.value"
            size="small"
            :custom-style="{
              marginRight: '8px',
              marginBottom: '8px',
              ...(selectedType === type.value ? { backgroundColor: '#07c160', color: '#fff', borderColor: '#07c160' } : {})
            }"
            @click="selectType(type.value)"
          >
            {{ type.label }}
          </wd-tag>
        </view>
      </wd-form-item>
      <wd-form-item label="内容" required>
        <wd-textarea
          v-model="content"
          placeholder="输入交互内容"
          :maxlength="500"
        />
      </wd-form-item>
      <wd-form-item label="时长（分钟，可选）">
        <wd-input v-model="duration" placeholder="输入时长" type="number" />
      </wd-form-item>
      <wd-form-item label="时间（可选）">
        <wd-input v-model="occurredAt" placeholder="例如: 2026-04-16 14:00" />
      </wd-form-item>
    </wd-cell-group>

    <view class="save-section">
      <wd-button block type="primary" :loading="saving" :disabled="saving" @click="handleSave">
        保存
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.add-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.type-selector {
  display: flex;
  flex-wrap: wrap;
}

.save-section {
  margin-top: 32rpx;
}
</style>
