<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContact, type ContactDetail } from '../../../api/contacts.js'
import { deleteInteraction, updateInteraction } from '../../../api/interactions.js'

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

function addInteraction() {
  if (contact.value) {
    uni.navigateTo({ url: `/pages/interactions/add/add?contactId=${contact.value.id}` })
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

function handleInteractionLongPress(item: NonNullable<typeof contact.value>['interactions'][number]) {
  uni.showActionSheet({
    itemList: ['编辑', '删除'],
    success: async (res) => {
      if (res.tapIndex === 0) {
        uni.showModal({
          title: '编辑交互记录',
          editable: true,
          placeholderText: '输入交互内容',
          content: item.content,
          success: async (editRes) => {
            if (editRes.confirm && editRes.content && contact.value) {
              try {
                await updateInteraction(item.id, { content: editRes.content })
                await loadContact(contact.value.id)
                uni.showToast({ title: '已更新', icon: 'success' })
              } catch {
                uni.showToast({ title: '更新失败', icon: 'none' })
              }
            }
          },
        })
      } else if (res.tapIndex === 1) {
        uni.showModal({
          title: '确认删除？',
          content: '删除后无法恢复该交互记录',
          confirmColor: '#e64340',
          success: async (delRes) => {
            if (delRes.confirm && contact.value) {
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
  <view v-if="loading" class="detail-page">
    <view class="loading-center">
      <wd-loading size="48px" />
      <text class="loading-text">加载中...</text>
    </view>
  </view>

  <view v-else-if="contact" class="detail-page">
    <!-- Basic info -->
    <wd-cell-group border inset>
      <wd-cell center>
        <template #icon>
          <view class="avatar">
            <text class="avatar-text">{{ contact.name.charAt(0) }}</text>
          </view>
        </template>
        <template #title>
          <text class="name">{{ contact.name }}</text>
        </template>
      </wd-cell>
      <wd-cell v-if="contact.company" title="公司" :value="`${contact.company} · ${contact.title || ''}`" />
      <wd-cell v-if="contact.phone" title="电话" :value="contact.phone" is-link @click="uni.makePhoneCall({ phoneNumber: contact.phone! })" />
      <wd-cell v-if="contact.email" title="邮箱" :value="contact.email" />
      <wd-cell v-if="contact.wechatId" title="微信" :value="contact.wechatId" />
      <wd-cell v-if="contact.tags.length > 0" title="标签">
        <template #value>
          <view class="tags">
            <wd-tag v-for="tag in contact.tags" :key="tag" size="small" plain>{{ tag }}</wd-tag>
          </view>
        </template>
      </wd-cell>
    </wd-cell-group>

    <!-- Interaction timeline -->
    <wd-cell-group border inset>
      <wd-cell title="交互记录">
        <template #right-icon>
          <text class="add-btn" @click="addInteraction">+ 添加</text>
        </template>
      </wd-cell>
      <view v-if="contact.interactions.length > 0" class="timeline">
        <view v-for="item in contact.interactions" :key="item.id" class="timeline-item" @longpress="handleInteractionLongPress(item)">
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
      <wd-empty v-else description="暂无交互记录" image="search" />
    </wd-cell-group>

    <!-- Actions -->
    <view class="actions">
      <wd-button block type="primary" @click="goEdit">编辑联系人</wd-button>
      <wd-gap :height="8" :bg-color="'transparent'" />
      <wd-button block plain custom-style="{ '--wot-button-color': '#e64340' }" @click="deleteContact">删除联系人</wd-button>
    </view>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
}

.loading-center {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999;
  margin-top: 16rpx;
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  background-color: #e8f8ef;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-text {
  font-size: 40rpx;
  font-weight: 600;
  color: #07c160;
}

.name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.add-btn {
  font-size: 28rpx;
  color: #07c160;
}

.timeline {
  padding: 0 24rpx;
}

.timeline-item {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
  padding-bottom: 24rpx;
  border-bottom: 1rpx solid #f6f6f6;
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
}

.actions {
  margin-top: 32rpx;
}
</style>
