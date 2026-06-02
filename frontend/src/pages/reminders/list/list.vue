<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getReminders, type Reminder } from '../../../api/reminders'
import { onDataChanged } from '../../../utils/events'

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

const stats = computed(() => {
  const today = groupedReminders.value.today.length
  const week = groupedReminders.value.week.length
  const upcoming = groupedReminders.value.upcoming.length
  return { today, week, upcoming, total: today + week + upcoming }
})

function getTypeIcon(type: string): string {
  const icons: Record<string, string> = {
    relationship: '🔔',
    birthday: '🎂',
    custom: '📝',
  }
  return icons[type] || '🔔'
}

function getTypeColor(type: string): string {
  const colors: Record<string, string> = {
    relationship: '#6C5CE7',
    birthday: '#FD79A8',
    custom: '#74B9FF',
  }
  return colors[type] || '#6C5CE7'
}

function getTypeBgLight(type: string): string {
  const colors: Record<string, string> = {
    relationship: 'rgba(108,92,231,0.08)',
    birthday: 'rgba(253,121,168,0.08)',
    custom: 'rgba(116,185,255,0.08)',
  }
  return colors[type] || 'rgba(108,92,231,0.08)'
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

function isUrgent(reminder: Reminder): boolean {
  const now = new Date()
  const scheduled = new Date(reminder.scheduledAt).getTime()
  const diff = scheduled - now.getTime()
  return diff < 2 * 60 * 60 * 1000 && diff > 0
}

function goAdd() {
  uni.navigateTo({ url: '/pages/reminders/add/add' })
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
  // 监听提醒数据变更（添加新提醒后触发）
  onDataChanged('reminders', () => {
    loadReminders()
  })
})
</script>

<template>
  <view class="reminder-page">
    <!-- 统计概览卡片 -->
    <view class="stats-card">
      <view class="stat-item">
        <text class="stat-num">{{ stats.today }}</text>
        <text class="stat-label">今天</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">{{ stats.week }}</text>
        <text class="stat-label">本周</text>
      </view>
      <view class="stat-divider" />
      <view class="stat-item">
        <text class="stat-num">{{ stats.upcoming }}</text>
        <text class="stat-label">后续</text>
      </view>
    </view>

    <!-- 通知栏 -->
    <view v-if="pendingCount > 0" class="notice-bar">
      <text class="notice-dot" />
      <text class="notice-text">你有 {{ pendingCount }} 条待提醒</text>
    </view>

    <!-- 今天分组 -->
    <view v-if="groupedReminders.today.length > 0" class="section">
      <view class="section-header">
        <view class="header-dot today" />
        <text class="header-title">今天</text>
        <text class="header-count">{{ groupedReminders.today.length }}</text>
      </view>
      <view
        v-for="reminder in groupedReminders.today"
        :key="reminder.id"
        class="reminder-card"
        :class="{ urgent: isUrgent(reminder) }"
      >
        <view class="urgent-border" v-if="isUrgent(reminder)" />
        <view class="card-inner">
          <view class="icon-wrapper" :style="{ backgroundColor: getTypeBgLight(reminder.type) }">
            <text class="type-icon">{{ getTypeIcon(reminder.type) }}</text>
          </view>
          <view class="card-content">
            <text class="card-message">{{ reminder.message }}</text>
            <view class="card-meta">
              <text class="type-label" :style="{ color: getTypeColor(reminder.type) }">{{ getTypeLabel(reminder.type) }}</text>
              <text class="meta-dot">·</text>
              <text class="time-text">{{ formatTime(reminder.scheduledAt) }}</text>
            </view>
            <text v-if="reminder.contact" class="contact-name">{{ reminder.contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 本周分组 -->
    <view v-if="groupedReminders.week.length > 0" class="section">
      <view class="section-header">
        <view class="header-dot week" />
        <text class="header-title">本周</text>
        <text class="header-count">{{ groupedReminders.week.length }}</text>
      </view>
      <view
        v-for="reminder in groupedReminders.week"
        :key="reminder.id"
        class="reminder-card"
        :class="{ urgent: isUrgent(reminder) }"
      >
        <view class="urgent-border" v-if="isUrgent(reminder)" />
        <view class="card-inner">
          <view class="icon-wrapper" :style="{ backgroundColor: getTypeBgLight(reminder.type) }">
            <text class="type-icon">{{ getTypeIcon(reminder.type) }}</text>
          </view>
          <view class="card-content">
            <text class="card-message">{{ reminder.message }}</text>
            <view class="card-meta">
              <text class="type-label" :style="{ color: getTypeColor(reminder.type) }">{{ getTypeLabel(reminder.type) }}</text>
              <text class="meta-dot">·</text>
              <text class="time-text">{{ formatTime(reminder.scheduledAt) }}</text>
            </view>
            <text v-if="reminder.contact" class="contact-name">{{ reminder.contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 后续分组 -->
    <view v-if="groupedReminders.upcoming.length > 0" class="section">
      <view class="section-header">
        <view class="header-dot upcoming" />
        <text class="header-title">后续</text>
        <text class="header-count">{{ groupedReminders.upcoming.length }}</text>
      </view>
      <view
        v-for="reminder in groupedReminders.upcoming"
        :key="reminder.id"
        class="reminder-card"
        :class="{ urgent: isUrgent(reminder) }"
      >
        <view class="urgent-border" v-if="isUrgent(reminder)" />
        <view class="card-inner">
          <view class="icon-wrapper" :style="{ backgroundColor: getTypeBgLight(reminder.type) }">
            <text class="type-icon">{{ getTypeIcon(reminder.type) }}</text>
          </view>
          <view class="card-content">
            <text class="card-message">{{ reminder.message }}</text>
            <view class="card-meta">
              <text class="type-label" :style="{ color: getTypeColor(reminder.type) }">{{ getTypeLabel(reminder.type) }}</text>
              <text class="meta-dot">·</text>
              <text class="time-text">{{ formatTime(reminder.scheduledAt) }}</text>
            </view>
            <text v-if="reminder.contact" class="contact-name">{{ reminder.contact.name }}</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 空状态 -->
    <view v-if="reminders.length === 0 && !loading" class="empty-state">
      <text class="empty-icon">🔔</text>
      <text class="empty-text">暂无提醒</text>
      <text class="empty-hint">点击下方按钮创建第一条提醒吧</text>
    </view>

    <!-- 浮动添加按钮 -->
    <view class="float-btn" @click="goAdd">
      <text class="float-btn-icon">+</text>
    </view>
  </view>
</template>

<style scoped>
.reminder-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

/* ---- 统计概览卡片 ---- */
.stats-card {
  display: flex;
  align-items: center;
  justify-content: space-around;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  border-radius: 32rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 16rpx 48rpx rgba(108, 92, 231, 0.25);
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-num {
  font-size: 48rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.stat-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.stat-divider {
  width: 2rpx;
  height: 64rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 2rpx;
}

/* ---- 通知栏 ---- */
.notice-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(225, 112, 85, 0.08);
  border-radius: 24rpx;
  padding: 20rpx 28rpx;
  margin-bottom: 32rpx;
}

.notice-dot {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  background: #E17055;
  animation: breathe 2s ease-in-out infinite;
}

.notice-text {
  font-size: 26rpx;
  color: #E17055;
  font-weight: 500;
}

/* ---- 分组头部 ---- */
.section {
  margin-bottom: 32rpx;
}

.section-header {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.header-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
}

.header-dot.today {
  background: #6C5CE7;
  box-shadow: 0 0 12rpx rgba(108, 92, 231, 0.4);
}

.header-dot.week {
  background: #A29BFE;
}

.header-dot.upcoming {
  background: #B2BEC3;
}

.header-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #2D3436;
}

.header-count {
  font-size: 22rpx;
  color: #B2BEC3;
  background: #F0F0F0;
  padding: 4rpx 12rpx;
  border-radius: 9999rpx;
}

/* ---- 提醒卡片 ---- */
.reminder-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  overflow: hidden;
  position: relative;
}

.reminder-card.urgent {
  border-left: 8rpx solid #E17055;
  animation: breathe 2.5s ease-in-out infinite;
}

@keyframes breathe {
  0%, 100% { box-shadow: 0 4rpx 24rpx rgba(225, 112, 85, 0.15); }
  50% { box-shadow: 0 4rpx 32rpx rgba(225, 112, 85, 0.3); }
}

.urgent-border {
  position: absolute;
  left: 0;
  top: 0;
  bottom: 0;
  width: 8rpx;
  background: linear-gradient(180deg, #E17055 0%, #D63031 100%);
}

.card-inner {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
  padding: 28rpx 32rpx;
}

.icon-wrapper {
  width: 72rpx;
  height: 72rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.type-icon {
  font-size: 36rpx;
}

.card-content {
  flex: 1;
  min-width: 0;
}

.card-message {
  font-size: 30rpx;
  font-weight: 500;
  color: #2D3436;
  line-height: 1.5;
  display: block;
  margin-bottom: 10rpx;
}

.card-meta {
  display: flex;
  align-items: center;
  gap: 8rpx;
}

.type-label {
  font-size: 22rpx;
  font-weight: 500;
}

.meta-dot {
  font-size: 22rpx;
  color: #B2BEC3;
}

.time-text {
  font-size: 22rpx;
  color: #636E72;
}

.contact-name {
  display: block;
  font-size: 22rpx;
  color: #B2BEC3;
  margin-top: 6rpx;
}

/* ---- 空状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 120rpx 0;
}

.empty-icon {
  font-size: 80rpx;
  margin-bottom: 24rpx;
  opacity: 0.6;
}

.empty-text {
  font-size: 30rpx;
  color: #636E72;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #B2BEC3;
}

/* ---- 浮动添加按钮 ---- */
.float-btn {
  position: fixed;
  right: 48rpx;
  bottom: 120rpx;
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  box-shadow: 0 16rpx 48rpx rgba(108, 92, 231, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 100;
  transition: transform 0.2s;
}

.float-btn:active {
  transform: scale(0.92);
}

.float-btn-icon {
  font-size: 48rpx;
  font-weight: 300;
  color: #FFFFFF;
  line-height: 1;
}
</style>
