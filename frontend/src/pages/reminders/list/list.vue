<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getReminders, type Reminder } from '../../../api/reminders.js'

const reminders = ref<Reminder[]>([])
const loading = ref(false)
const pendingCount = ref(0)

const groupedReminders = computed(() => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const weekEnd = today + 7 * 24 * 60 * 60 * 1000

  const todayList: Reminder[] = []
  const weekList: Reminder[] = []
  const upcomingList: Reminder[] = []

  for (const r of reminders.value) {
    const scheduled = new Date(r.scheduledAt).getTime()
    if (r.sentAt) continue

    if (scheduled < today + 24 * 60 * 60 * 1000) {
      todayList.push(r)
    } else if (scheduled < weekEnd) {
      weekList.push(r)
    } else {
      upcomingList.push(r)
    }
  }

  return { today: todayList, week: weekList, upcoming: upcomingList }
})

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    relationship: '🔔',
    birthday: '🎂',
    custom: '📝',
  }
  return icons[type] || '🔔'
}

function getTypeLabel(type: string): string {
  const labels: Record<string, string> = {
    relationship: '关系提醒',
    birthday: '生日提醒',
    custom: '自定义提醒',
  }
  return labels[type] || type
}

function formatTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diff = date.getTime() - now.getTime()
  const days = Math.floor(diff / (24 * 60 * 60 * 1000))

  if (days < 0) return `已过期 ${Math.abs(days)} 天`
  if (days === 0) return '今天'
  if (days === 1) return '明天'
  if (days <= 7) return `${days}天后`
  return `${date.getMonth() + 1}月${date.getDate()}日`
}

async function loadReminders() {
  loading.value = true
  try {
    const res = await getReminders()
    if (res.success && res.data) {
      reminders.value = res.data
      pendingCount.value = res.data.filter(r => !r.sentAt).length
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadReminders()
})
</script>

<template>
  <view class="reminder-page">
    <view v-if="pendingCount > 0" class="summary">
      <text class="summary-text">你有 {{ pendingCount }} 条待提醒</text>
    </view>

    <view v-if="groupedReminders.today.length > 0" class="section">
      <text class="section-title">今天</text>
      <view
        v-for="reminder in groupedReminders.today"
        :key="reminder.id"
        class="reminder-card"
      >
        <view class="reminder-icon">{{ getTypeIcon(reminder.type) }}</view>
        <view class="reminder-content">
          <text class="reminder-message">{{ reminder.message }}</text>
          <view class="reminder-meta">
            <text class="reminder-type">{{ getTypeLabel(reminder.type) }}</text>
            <text v-if="reminder.contact" class="reminder-contact">{{ reminder.contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="groupedReminders.week.length > 0" class="section">
      <text class="section-title">本周</text>
      <view
        v-for="reminder in groupedReminders.week"
        :key="reminder.id"
        class="reminder-card"
      >
        <view class="reminder-icon">{{ getTypeIcon(reminder.type) }}</view>
        <view class="reminder-content">
          <text class="reminder-message">{{ reminder.message }}</text>
          <view class="reminder-meta">
            <text class="reminder-type">{{ getTypeLabel(reminder.type) }}</text>
            <text v-if="reminder.contact" class="reminder-contact">{{ reminder.contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="groupedReminders.upcoming.length > 0" class="section">
      <text class="section-title"> upcoming</text>
      <view
        v-for="reminder in groupedReminders.upcoming"
        :key="reminder.id"
        class="reminder-card"
      >
        <view class="reminder-icon">{{ getTypeIcon(reminder.type) }}</view>
        <view class="reminder-content">
          <text class="reminder-message">{{ reminder.message }}</text>
          <view class="reminder-meta">
            <text class="reminder-type">{{ getTypeLabel(reminder.type) }}</text>
            <text v-if="reminder.contact" class="reminder-contact">{{ reminder.contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="reminders.length === 0 && !loading" class="empty">
      <text class="empty-text">暂无提醒</text>
      <text class="empty-hint">系统会在适当时候自动推送关系提醒和生日提醒</text>
    </view>
  </view>
</template>

<style scoped>
.reminder-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
}

.summary {
  background-color: #07c160;
  border-radius: 16rpx;
  padding: 24rpx 32rpx;
  margin-bottom: 24rpx;
}

.summary-text {
  color: #fff;
  font-size: 28rpx;
  font-weight: 600;
}

.section {
  margin-bottom: 32rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.reminder-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.reminder-icon {
  font-size: 40rpx;
  flex-shrink: 0;
}

.reminder-content {
  flex: 1;
}

.reminder-message {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 8rpx;
}

.reminder-meta {
  display: flex;
  gap: 16rpx;
  align-items: center;
}

.reminder-type {
  font-size: 24rpx;
  color: #999;
}

.reminder-contact {
  font-size: 24rpx;
  color: #999;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding-top: 200rpx;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #ccc;
}
</style>
