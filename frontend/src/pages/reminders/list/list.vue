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
    <wd-notice-bar v-if="pendingCount > 0" :text="`你有 ${pendingCount} 条待提醒`" />

    <view v-if="groupedReminders.today.length > 0" class="section">
      <wd-cell-group title="今天">
        <wd-cell
          v-for="reminder in groupedReminders.today"
          :key="reminder.id"
          :title="reminder.message"
          :label="getTypeLabel(reminder.type) + ' · ' + formatTime(reminder.scheduledAt)"
        >
          <template #icon>
            <text>{{ getTypeIcon(reminder.type) }}</text>
          </template>
          <template v-if="reminder.contact" #right-icon>
            <text class="contact-label">{{ reminder.contact.name }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <view v-if="groupedReminders.week.length > 0" class="section">
      <wd-cell-group title="本周">
        <wd-cell
          v-for="reminder in groupedReminders.week"
          :key="reminder.id"
          :title="reminder.message"
          :label="getTypeLabel(reminder.type) + ' · ' + formatTime(reminder.scheduledAt)"
        >
          <template #icon>
            <text>{{ getTypeIcon(reminder.type) }}</text>
          </template>
          <template v-if="reminder.contact" #right-icon>
            <text class="contact-label">{{ reminder.contact.name }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <view v-if="groupedReminders.upcoming.length > 0" class="section">
      <wd-cell-group title="后续">
        <wd-cell
          v-for="reminder in groupedReminders.upcoming"
          :key="reminder.id"
          :title="reminder.message"
          :label="getTypeLabel(reminder.type) + ' · ' + formatTime(reminder.scheduledAt)"
        >
          <template #icon>
            <text>{{ getTypeIcon(reminder.type) }}</text>
          </template>
          <template v-if="reminder.contact" #right-icon>
            <text class="contact-label">{{ reminder.contact.name }}</text>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <wd-empty v-if="reminders.length === 0 && !loading" description="暂无提醒" />
  </view>
</template>

<style scoped>
.reminder-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
}

.section {
  margin-bottom: 24rpx;
}

.contact-label {
  font-size: 24rpx;
  color: #999;
}
</style>
