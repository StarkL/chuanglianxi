<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContacts } from '../../../api/contacts.js'
import { createReminder } from '../../../api/reminders.js'

interface Contact {
  id: string
  name: string
  company: string | null
}

const contacts = ref<Contact[]>([])
const selectedContactId = ref('')
const message = ref('')
const scheduledDate = ref('')
const scheduledTime = ref('09:00')
const recurrenceRule = ref('')

const recurrenceOptions = ['不重复', '每天', '每周', '每月', '每年']
const recurrenceValues = ['', 'daily', 'weekly', 'monthly', 'yearly']

function onContactChange(e: any) {
  const idx = e.detail.value as number
  selectedContactId.value = contacts.value[idx]?.id || ''
}

function onRecurrenceChange(e: any) {
  const idx = e.detail.value as number
  recurrenceRule.value = recurrenceValues[idx]
}

onMounted(async () => {
  try {
    const res = await getContacts()
    if (res.success && res.data) {
      contacts.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载联系人失败', icon: 'none' })
  }

  // Set default date to tomorrow
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  scheduledDate.value = `${tomorrow.getFullYear()}-${String(tomorrow.getMonth() + 1).padStart(2, '0')}-${String(tomorrow.getDate()).padStart(2, '0')}`
})

async function handleSubmit() {
  if (!message.value.trim()) {
    uni.showToast({ title: '请输入提醒内容', icon: 'none' })
    return
  }
  if (!scheduledDate.value) {
    uni.showToast({ title: '请选择提醒时间', icon: 'none' })
    return
  }

  try {
    const scheduledAt = `${scheduledDate.value}T${scheduledTime.value}:00`
    await createReminder({
      contactId: selectedContactId || undefined,
      type: 'custom',
      message: message.value.trim(),
      scheduledAt,
      recurrenceRule: recurrenceRule || undefined,
    })

    uni.showToast({ title: '提醒已创建', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch {
    uni.showToast({ title: '创建失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="add-page">
    <wd-cell-group border inset>
      <wd-form-item label="关联联系人">
        <picker mode="selector" :range="contacts.map(c => c.name)" @change="onContactChange">
          <view class="picker-display">
            {{ selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : '选择联系人（可选）' }}
          </view>
        </picker>
      </wd-form-item>
      <wd-form-item label="提醒内容">
        <wd-textarea
          v-model="message"
          placeholder="输入提醒内容..."
          :maxlength="200"
        />
      </wd-form-item>
      <wd-form-item label="日期">
        <picker mode="date" :value="scheduledDate" @change="e => scheduledDate = e.detail.value">
          <view class="picker-display">{{ scheduledDate || '选择日期' }}</view>
        </picker>
      </wd-form-item>
      <wd-form-item label="时间">
        <picker mode="time" :value="scheduledTime" @change="e => scheduledTime = e.detail.value">
          <view class="picker-display">{{ scheduledTime }}</view>
        </picker>
      </wd-form-item>
      <wd-form-item label="重复">
        <picker mode="selector" :range="recurrenceOptions" @change="onRecurrenceChange">
          <view class="picker-display">
            {{ recurrenceRule ? recurrenceOptions[recurrenceValues.indexOf(recurrenceRule)] : '不重复' }}
          </view>
        </picker>
      </wd-form-item>
    </wd-cell-group>

    <view class="submit-section">
      <wd-button block type="primary" @click="handleSubmit">
        创建提醒
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

.picker-display {
  height: 60rpx;
  line-height: 60rpx;
  font-size: 28rpx;
  color: #333;
}

.submit-section {
  margin-top: 32rpx;
}
</style>
