<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContacts } from '../../../api/contacts'
import { createReminder } from '../../../api/reminders'
import { emitDataChanged } from '../../../utils/events'

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

const reminderTypes = [
  { value: 'custom', label: '自定义', icon: '📝', color: '#74B9FF' },
  { value: 'relationship', label: '关系提醒', icon: '🔔', color: '#6C5CE7' },
  { value: 'birthday', label: '生日提醒', icon: '🎂', color: '#FD79A8' },
]
const selectedType = ref('custom')

const recurrenceOptions = ['不重复', '每天', '每周', '每月', '每年']
const recurrenceValues = ['', 'daily', 'weekly', 'monthly', 'yearly']

interface PickerEvent {
  detail: { value: number }
}

function onContactChange(e: PickerEvent) {
  const idx = e.detail.value
  selectedContactId.value = contacts.value[idx]?.id || ''
}

function onRecurrenceChange(e: PickerEvent) {
  const idx = e.detail.value
  recurrenceRule.value = recurrenceValues[idx]
}

function selectType(type: string) {
  selectedType.value = type
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
      contactId: selectedContactId.value || undefined,
      type: selectedType.value,
      message: message.value.trim(),
      scheduledAt,
      recurrenceRule: recurrenceRule.value || undefined,
    })

    uni.showToast({ title: '提醒已创建', icon: 'success' })
    emitDataChanged('reminders', 'create')
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
    <!-- 提醒类型选择 -->
    <view class="form-card">
      <view class="card-title">提醒类型</view>
      <view class="type-grid">
        <view
          v-for="type in reminderTypes"
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

    <!-- 表单内容 -->
    <view class="form-card">
      <view class="card-title">提醒详情</view>

      <!-- 关联联系人 -->
      <view class="form-item">
        <text class="form-label">关联联系人</text>
        <picker mode="selector" :range="contacts.map(c => c.name)" @change="onContactChange">
          <view class="form-input picker-input">
            <text :class="{ placeholder: !selectedContactId }">
              {{ selectedContactId ? contacts.find(c => c.id === selectedContactId)?.name : '选择联系人（可选）' }}
            </text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>

      <!-- 提醒内容 -->
      <view class="form-item">
        <text class="form-label">提醒内容</text>
        <view class="textarea-wrapper">
          <wd-textarea v-model="message" placeholder="输入提醒内容..." :maxlength="200" />
        </view>
      </view>

      <!-- 日期时间 -->
      <view class="form-row">
        <view class="form-item half">
          <text class="form-label">日期</text>
          <picker mode="date" :value="scheduledDate" @change="e => scheduledDate = e.detail.value">
            <view class="form-input picker-input">
              <text :class="{ placeholder: !scheduledDate }">{{ scheduledDate || '选择日期' }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
        <view class="form-item half">
          <text class="form-label">时间</text>
          <picker mode="time" :value="scheduledTime" @change="e => scheduledTime = e.detail.value">
            <view class="form-input picker-input">
              <text>{{ scheduledTime }}</text>
              <text class="picker-arrow">›</text>
            </view>
          </picker>
        </view>
      </view>

      <!-- 重复 -->
      <view class="form-item">
        <text class="form-label">重复</text>
        <picker mode="selector" :range="recurrenceOptions" @change="onRecurrenceChange">
          <view class="form-input picker-input">
            <text>{{ recurrenceRule ? recurrenceOptions[recurrenceValues.indexOf(recurrenceRule)] : '不重复' }}</text>
            <text class="picker-arrow">›</text>
          </view>
        </picker>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="submit-area">
      <button class="submit-btn" @click="handleSubmit">创建提醒</button>
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

/* ---- 提醒类型选择 ---- */
.type-grid {
  display: flex;
  gap: 20rpx;
}

.type-btn {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
  padding: 24rpx 16rpx;
  border-radius: 20rpx;
  background: #F8F9FA;
  transition: all 0.2s;
}

.type-btn.active {
  background: #FFFFFF;
  box-shadow: 0 4rpx 20rpx rgba(108, 92, 231, 0.15);
}

.type-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.type-emoji {
  font-size: 40rpx;
}

.type-label {
  font-size: 24rpx;
  font-weight: 500;
}

/* ---- 表单元素 ---- */
.form-item {
  margin-bottom: 28rpx;
}

.form-item:last-child {
  margin-bottom: 0;
}

.form-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 28rpx;
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
  height: 80rpx;
  background-color: #F8F9FA;
  border-radius: 16rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.form-input text {
  font-size: 28rpx;
  color: #2D3436;
}

.placeholder {
  color: #B2BEC3 !important;
}

.picker-arrow {
  font-size: 32rpx;
  color: #B2BEC3;
}

.textarea-wrapper {
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
