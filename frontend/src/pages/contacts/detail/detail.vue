<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContact, type ContactDetail } from '../../../api/contacts.js'

const contact = ref<ContactDetail | null>(null)
const loading = ref(false)

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { id: string } } }
  const id = currentPage.$page.options.id
  if (id) await loadContact(id)
})

async function loadContact(id: string) {
  loading.value = true
  try {
    const res = await getContact(id)
    if (res.success && res.data) {
      contact.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function goEdit() {
  if (contact.value) {
    uni.navigateTo({ url: `/pages/contacts/edit/edit?id=${contact.value.id}` })
  }
}

function deleteContact() {
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复该联系人及其所有交互记录',
    confirmColor: '#e64340',
    success: async (res) => {
      if (res.confirm && contact.value) {
        try {
          const { deleteContact } = await import('../../../api/contacts.js')
          await deleteContact(contact.value.id)
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function addInteraction() {
  uni.showModal({
    title: '添加交互记录',
    editable: true,
    placeholderText: '输入交互内容',
    success: async (res) => {
      if (res.confirm && res.content && contact.value) {
        try {
          const { request } = await import('../../../utils/request.js')
          await request({
            url: '/interactions',
            method: 'POST',
            data: {
              contactId: contact.value.id,
              type: 'manual_note',
              content: res.content,
            },
          })
          await loadContact(contact.value.id)
          uni.showToast({ title: '已添加', icon: 'success' })
        } catch {
          uni.showToast({ title: '添加失败', icon: 'none' })
        }
      }
    },
  })
}

function getTypeLabel(type: string): string {
  const map: Record<string, string> = {
    voice_note: '语音笔记',
    chat_export: '聊天记录',
    manual_note: '手动笔记',
    call: '通话',
    meeting: '会议',
  }
  return map[type] || type
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <view class="detail-page">
    <view v-if="contact" class="detail-content">
      <!-- Basic info -->
      <view class="info-card">
        <view class="avatar">
          <text class="avatar-text">{{ contact.name.charAt(0) }}</text>
        </view>
        <text class="name">{{ contact.name }}</text>
        <text v-if="contact.company" class="company">{{ contact.company }} · {{ contact.title || '' }}</text>
        <view v-if="contact.tags.length > 0" class="tags">
          <text v-for="tag in contact.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>

      <!-- Contact info -->
      <view class="detail-card">
        <text class="card-title">联系方式</text>
        <view v-if="contact.phone" class="detail-item">
          <text class="label">电话</text>
          <text class="value" @click="uni.makePhoneCall({ phoneNumber: contact.phone! })">{{ contact.phone }}</text>
        </view>
        <view v-if="contact.email" class="detail-item">
          <text class="label">邮箱</text>
          <text class="value">{{ contact.email }}</text>
        </view>
        <view v-if="contact.wechatId" class="detail-item">
          <text class="label">微信</text>
          <text class="value">{{ contact.wechatId }}</text>
        </view>
      </view>

      <!-- Interaction timeline -->
      <view class="timeline-card">
        <view class="timeline-header">
          <text class="card-title">交互记录</text>
          <text class="add-btn" @click="addInteraction">+ 添加</text>
        </view>
        <view v-if="contact.interactions.length > 0" class="timeline">
          <view v-for="item in contact.interactions" :key="item.id" class="timeline-item">
            <view class="timeline-dot" />
            <view class="timeline-content">
              <view class="timeline-header-row">
                <text class="timeline-type">{{ getTypeLabel(item.type) }}</text>
                <text class="timeline-time">{{ formatDate(item.occurredAt) }}</text>
              </view>
              <text class="timeline-text">{{ item.content }}</text>
            </view>
          </view>
        </view>
        <view v-else class="empty-timeline">
          <text>暂无交互记录</text>
        </view>
      </view>
    </view>

    <!-- Actions -->
    <view class="actions">
      <button class="action-btn edit" @click="goEdit">编辑联系人</button>
      <button class="action-btn delete" @click="deleteContact">删除联系人</button>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
}

.info-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 48rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-bottom: 32rpx;
}

.avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background-color: #e8f8ef;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 16rpx;
}

.avatar-text {
  font-size: 48rpx;
  font-weight: 600;
  color: #07c160;
}

.name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.company {
  font-size: 28rpx;
  color: #999;
}

.tags {
  display: flex;
  gap: 8rpx;
  margin-top: 16rpx;
}

.tag {
  padding: 4rpx 12rpx;
  background-color: #e8f8ef;
  color: #07c160;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.detail-card,
.timeline-card {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 32rpx;
}

.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 24rpx;
  display: block;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1px solid #f6f6f6;
}

.detail-item:last-child {
  border-bottom: none;
}

.label {
  font-size: 28rpx;
  color: #999;
}

.value {
  font-size: 28rpx;
  color: #333;
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.add-btn {
  font-size: 28rpx;
  color: #07c160;
}

.timeline-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.timeline-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background-color: #07c160;
  margin-top: 12rpx;
  flex-shrink: 0;
}

.timeline-header-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 8rpx;
}

.timeline-type {
  font-size: 24rpx;
  color: #07c160;
  font-weight: 600;
}

.timeline-time {
  font-size: 24rpx;
  color: #999;
}

.timeline-text {
  font-size: 28rpx;
  color: #333;
  display: block;
}

.empty-timeline {
  text-align: center;
  padding: 32rpx 0;
  color: #ccc;
  font-size: 28rpx;
}

.actions {
  margin-top: 32rpx;
}

.action-btn {
  height: 80rpx;
  line-height: 80rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  margin-bottom: 16rpx;
}

.action-btn.edit {
  background-color: #07c160;
  color: #fff;
}

.action-btn.delete {
  background-color: transparent;
  color: #e64340;
}
</style>
