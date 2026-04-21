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
    relationship: 'bell',
    birthday: 'cake',
    custom: 'edit',
  }
  return icons[type] || 'bell'
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

    <template v-if="groupedReminders.today.length > 0">
      <view class="section-header">
        <text class="section-title">今天</text>
      </view>
      <wd-cell-group border inset>
        <wd-cell
          v-for="reminder in groupedReminders.today"
          :key="reminder.id"
          :title="reminder.message"
          :label="getTypeLabel(reminder.type)"
        >
          <template #icon>
            <wd-icon :name="getTypeIcon(reminder.type)" size="20px" />
          </template>
          <template #value>
            <text class="time-badge">{{ formatTime(reminder.scheduledAt) }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </template>

    <template v-if="groupedReminders.week.length > 0">
      <view class="section-header">
        <text class="section-title">本周</text>
      </view>
      <wd-cell-group border inset>
        <wd-cell
          v-for="reminder in groupedReminders.week"
          :key="reminder.id"
          :title="reminder.message"
          :label="getTypeLabel(reminder.type)"
        >
          <template #icon>
            <wd-icon :name="getTypeIcon(reminder.type)" size="20px" />
          </template>
          <template #value>
            <text class="time-badge">{{ formatTime(reminder.scheduledAt) }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </template>

    <template v-if="groupedReminders.upcoming.length > 0">
      <view class="section-header">
        <text class="section-title"> upcoming</text>
      </view>
      <wd-cell-group border inset>
        <wd-cell
          v-for="reminder in groupedReminders.upcoming"
          :key="reminder.id"
          :title="reminder.message"
          :label="getTypeLabel(reminder.type)"
        >
          <template #icon>
            <wd-icon :name="getTypeIcon(reminder.type)" size="20px" />
          </template>
          <template #value>
            <text class="time-badge">{{ formatTime(reminder.scheduledAt) }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </template>

    <wd-empty
      v-if="reminders.length === 0 && !loading"
      image="notification"
      description="暂无提醒"
    />
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

.section-header {
  padding: 24rpx 32rpx 8rpx;
}

.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}

.time-badge {
  font-size: 22rpx;
  color: #999;
}
</style>
