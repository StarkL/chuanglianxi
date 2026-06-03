<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContact, type ContactDetail } from '../../../api/contacts'
import { deleteInteraction, updateInteraction } from '../../../api/interactions'
import { emitDataChanged, onDataChanged } from '../../../utils/events'

const contact = ref<ContactDetail | null>(null)
const loading = ref(false)

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { id: string } } }
  const id = currentPage.$page.options.id
  if (id) await loadContact(id)

  // 监听联系人变更（编辑页修改后触发）和交互记录变更
  // 注意：只监听 create/update，delete 时直接导航返回，不重新加载
  onDataChanged('contacts', (event) => {
    if (event.action === 'delete') return
    if (id) loadContact(id)
  })
  onDataChanged('interactions', () => {
    if (id) loadContact(id)
  })
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

function addInteraction() {
  if (contact.value) {
    uni.navigateTo({ url: `/pages/interactions/add/add?contactId=${contact.value.id}` })
  }
}

interface PickerCallback {
  confirm: boolean
  content?: string
}

interface ActionSheetResult {
  tapIndex: number
}

async function confirmDelete() {
  if (!contact.value) return
  try {
    const { deleteContact } = await import('../../../api/contacts')
    await deleteContact(contact.value.id)
    uni.showToast({ title: '已删除', icon: 'success' })
    setTimeout(() => uni.navigateBack(), 500)
  } catch {
    uni.showToast({ title: '删除失败', icon: 'none' })
  }
}

function deleteContact() {
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复该联系人及其所有交互记录',
    cancelText: '取消',
    confirmText: '确定',
    confirmColor: '#e03131',
    success: async (res: unknown) => {
      const result = res as { confirm: boolean }
      if (result.confirm) {
        await confirmDelete()
      }
    },
  })
}

function callPhone(phone: string) {
  uni.makePhoneCall({ phoneNumber: phone })
}

async function editInteractionItem(item: NonNullable<typeof contact.value>['interactions'][number]) {
  uni.showModal({
    title: '编辑交互记录',
    editable: true,
    placeholderText: '输入交互内容',
    content: item.content,
    cancelText: '取消',
    confirmText: '确定',
    success: async (editRes: unknown) => {
      const res = editRes as PickerCallback
      if (res.confirm && res.content && contact.value) {
        try {
          await updateInteraction(item.id, { content: res.content })
          await loadContact(contact.value.id)
          uni.showToast({ title: '已更新', icon: 'success' })
        } catch {
          uni.showToast({ title: '更新失败', icon: 'none' })
        }
      }
    },
  })
}

async function deleteInteractionItem(item: NonNullable<typeof contact.value>['interactions'][number]) {
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复该交互记录',
    cancelText: '取消',
    confirmText: '确定',
    confirmColor: '#e03131',
    success: async (delRes: unknown) => {
      const res = delRes as { confirm: boolean }
      if (res.confirm && contact.value) {
        try {
          await deleteInteraction(item.id)
          await loadContact(contact.value.id)
          uni.showToast({ title: '已删除', icon: 'success' })
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function handleInteractionLongPress(item: NonNullable<typeof contact.value>['interactions'][number]) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: async (res: unknown) => {
      const result = res as ActionSheetResult
      if (result.tapIndex === 0) {
        editInteractionItem(item)
      } else if (result.tapIndex === 1) {
        deleteInteractionItem(item)
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

function getTypeDotClass(type: string): string {
  const map: Record<string, string> = {
    voice_note: 'note',
    chat_export: 'chat',
    manual_note: 'note',
    call: 'call',
    meeting: 'meeting',
  }
  return map[type] || 'note'
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}月${date.getDate()}日 ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
}
</script>

<template>
  <view class="detail-page">
    <view v-if="loading" class="loading-wrap">
      <wd-loading />
    </view>

    <template v-else-if="contact">
      <!-- 头部 - 渐变个人信息卡片 -->
      <view class="profile-header">
        <view class="profile-content">
          <view class="profile-avatar">
            {{ contact.name.charAt(0) }}
          </view>
          <view class="profile-info">
            <text class="profile-name">{{ contact.name }}</text>
            <text v-if="contact.company" class="profile-company">
              {{ contact.company }}{{ contact.title ? ' · ' + contact.title : '' }}
            </text>
            <view v-if="contact.tags.length > 0" class="profile-tags">
              <text v-for="tag in contact.tags" :key="tag" class="profile-tag">{{ tag }}</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 联系方式卡片 -->
      <view class="contact-methods" v-if="contact.phone || contact.email || contact.wechatId">
        <text class="section-title">联系方式</text>
        <view
          v-if="contact.phone"
          class="method-item"
          @click="callPhone(contact.phone)"
        >
          <view class="method-icon phone-icon">📞</view>
          <view class="method-info">
            <text class="method-label">电话</text>
            <text class="method-value">{{ contact.phone }}</text>
          </view>
          <text class="method-arrow">›</text>
        </view>
        <view v-if="contact.email" class="method-item">
          <view class="method-icon email-icon">✉️</view>
          <view class="method-info">
            <text class="method-label">邮箱</text>
            <text class="method-value">{{ contact.email }}</text>
          </view>
          <text class="method-arrow">›</text>
        </view>
        <view v-if="contact.wechatId" class="method-item">
          <view class="method-icon wechat-icon">💬</view>
          <view class="method-info">
            <text class="method-label">微信</text>
            <text class="method-value">{{ contact.wechatId }}</text>
          </view>
          <text class="method-arrow">›</text>
        </view>
      </view>

      <!-- 交互时间线 -->
      <view class="timeline-card">
        <view class="timeline-header">
          <text class="section-title">交互记录</text>
          <view class="add-btn" @click="addInteraction">+ 添加</view>
        </view>

        <view v-if="contact.interactions.length > 0" class="timeline">
          <view
            v-for="item in contact.interactions"
            :key="item.id"
            class="timeline-item"
            @longpress="handleInteractionLongPress(item)"
          >
            <view class="timeline-dot" :class="getTypeDotClass(item.type)" />
            <text class="timeline-date">{{ formatDate(item.occurredAt) }}</text>
            <text class="timeline-content">{{ item.content }}</text>
            <view class="timeline-type" :class="getTypeDotClass(item.type)">
              {{ getTypeLabel(item.type) }}
            </view>
          </view>
        </view>

        <view v-else class="timeline-empty">
          <text class="timeline-empty-icon">📝</text>
          <text class="timeline-empty-text">暂无交互记录</text>
        </view>
      </view>

      <!-- 操作按钮 -->
      <view class="actions">
        <view class="action-btn secondary" @click="goEdit">编辑联系人</view>
        <view class="action-btn danger" @click="deleteContact">删除联系人</view>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #F8F9FA;
}

.loading-wrap {
  display: flex;
  justify-content: center;
  padding: 128rpx 0;
}

/* ---- 头部 - 渐变个人信息卡片 ---- */
.profile-header {
  background: linear-gradient(135deg, #6C5CE7, #FD79A8);
  padding: 48rpx 32rpx 40rpx;
  position: relative;
  overflow: hidden;
}

.profile-header::before {
  content: '';
  position: absolute;
  top: -40rpx;
  right: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 6s ease-in-out infinite;
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20rpx) scale(1.1); }
}

.profile-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  z-index: 1;
}

.profile-avatar {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 48rpx;
  font-weight: 600;
  border: 4rpx solid rgba(255, 255, 255, 0.3);
  flex-shrink: 0;
}

.profile-info {
  color: #FFFFFF;
}

.profile-name {
  font-size: 40rpx;
  font-weight: 700;
  display: block;
  margin-bottom: 8rpx;
}

.profile-company {
  font-size: 26rpx;
  opacity: 0.9;
  display: block;
  margin-bottom: 16rpx;
}

.profile-tags {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.profile-tag {
  font-size: 22rpx;
  padding: 6rpx 20rpx;
  border-radius: 9999rpx;
  background: rgba(255, 255, 255, 0.25);
  color: #FFFFFF;
}

/* ---- 联系方式卡片 ---- */
.contact-methods {
  margin: 24rpx 32rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.section-title {
  font-size: 28rpx;
  color: #636E72;
  font-weight: 500;
  display: block;
  margin-bottom: 24rpx;
}

.method-item {
  display: flex;
  align-items: center;
  gap: 24rpx;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.method-item:last-child {
  border-bottom: none;
}

.method-item:active {
  opacity: 0.7;
}

.method-icon {
  width: 64rpx;
  height: 64rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  flex-shrink: 0;
}

.phone-icon {
  background: rgba(0, 184, 148, 0.1);
}

.email-icon {
  background: rgba(108, 92, 231, 0.1);
}

.wechat-icon {
  background: rgba(0, 184, 148, 0.1);
}

.method-info {
  flex: 1;
  min-width: 0;
}

.method-label {
  font-size: 22rpx;
  color: #B2BEC3;
  display: block;
}

.method-value {
  font-size: 28rpx;
  color: #2D3436;
  display: block;
}

.method-arrow {
  color: #B2BEC3;
  font-size: 28rpx;
}

/* ---- 交互时间线 ---- */
.timeline-card {
  margin: 0 32rpx 48rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.timeline-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.add-btn {
  font-size: 24rpx;
  color: #6C5CE7;
  padding: 8rpx 24rpx;
  border-radius: 9999rpx;
  border: 1rpx solid #A29BFE;
  background: transparent;
  transition: all 0.3s ease;
}

.add-btn:active {
  background: #6C5CE7;
  color: #FFFFFF;
}

.timeline {
  position: relative;
  padding-left: 32rpx;
}

.timeline::before {
  content: '';
  position: absolute;
  left: 12rpx;
  top: 12rpx;
  bottom: 12rpx;
  width: 4rpx;
  background: linear-gradient(to bottom, #6C5CE7, #74B9FF);
  border-radius: 2rpx;
}

.timeline-item {
  position: relative;
  padding-bottom: 32rpx;
  animation: timelineSlideIn 0.5s ease-out both;
}

.timeline-item:nth-child(1) { animation-delay: 0.1s; }
.timeline-item:nth-child(2) { animation-delay: 0.2s; }
.timeline-item:nth-child(3) { animation-delay: 0.3s; }
.timeline-item:nth-child(4) { animation-delay: 0.4s; }

@keyframes timelineSlideIn {
  from { opacity: 0; transform: translateX(-10rpx); }
  to { opacity: 1; transform: translateX(0); }
}

.timeline-dot {
  position: absolute;
  left: -28rpx;
  top: 8rpx;
  width: 20rpx;
  height: 20rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  z-index: 1;
}

.timeline-dot.meeting { background: #6C5CE7; }
.timeline-dot.call { background: #FD79A8; }
.timeline-dot.note { background: #74B9FF; }
.timeline-dot.chat { background: #FDCB6E; }

.timeline-date {
  font-size: 22rpx;
  color: #B2BEC3;
  display: block;
  margin-bottom: 8rpx;
}

.timeline-content {
  font-size: 28rpx;
  color: #2D3436;
  line-height: 1.6;
  display: block;
  margin-bottom: 8rpx;
}

.timeline-type {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 9999rpx;
  display: inline-block;
}

.timeline-type.meeting { background: rgba(108, 92, 231, 0.1); color: #6C5CE7; }
.timeline-type.call { background: rgba(253, 121, 168, 0.1); color: #FD79A8; }
.timeline-type.note { background: rgba(116, 185, 255, 0.1); color: #74B9FF; }
.timeline-type.chat { background: rgba(253, 203, 110, 0.1); color: #E17055; }

/* 时间线空状态 */
.timeline-empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48rpx 0;
}

.timeline-empty-icon {
  font-size: 64rpx;
  opacity: 0.5;
  margin-bottom: 16rpx;
}

.timeline-empty-text {
  font-size: 26rpx;
  color: #B2BEC3;
}

/* ---- 操作按钮 ---- */
.actions {
  margin: 0 32rpx 64rpx;
  display: flex;
  gap: 16rpx;
}

.action-btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 24rpx;
  text-align: center;
  font-size: 28rpx;
  font-weight: 600;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.action-btn:active {
  transform: translateY(-4rpx);
}

.action-btn.secondary {
  background: #FFFFFF;
  color: #636E72;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.action-btn.danger {
  background: #FFFFFF;
  color: #E17055;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}
</style>
