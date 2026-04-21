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
  <view class="detail-page">
    <view v-if="loading">
      <wd-loading />
    </view>

    <template v-else-if="contact">
      <!-- Basic info -->
      <wd-cell-group>
        <view class="info-header">
          <view class="avatar-circle">{{ contact.name.charAt(0) }}</view>
          <text class="name">{{ contact.name }}</text>
          <text v-if="contact.company" class="company">{{ contact.company }} · {{ contact.title || '' }}</text>
          <view v-if="contact.tags.length > 0" class="tags">
            <text v-for="tag in contact.tags" :key="tag" class="tag">{{ tag }}</text>
          </view>
        </view>
      </wd-cell-group>

      <!-- Contact info -->
      <wd-cell-group title="联系方式">
        <wd-cell v-if="contact.phone" title="电话" :value="contact.phone" is-link @click="uni.makePhoneCall({ phoneNumber: contact.phone! })" />
        <wd-cell v-if="contact.email" title="邮箱" :value="contact.email" />
        <wd-cell v-if="contact.wechatId" title="微信" :value="contact.wechatId" />
      </wd-cell-group>

      <!-- Interaction timeline -->
      <wd-cell-group title="交互记录">
        <template #extra>
          <wd-button size="small" type="primary" @click="addInteraction">+ 添加</wd-button>
        </template>
        <wd-cell
          v-for="item in contact.interactions"
          :key="item.id"
          :title="getTypeLabel(item.type)"
          :label="item.content"
          :value="formatDate(item.occurredAt)"
          @longpress="handleInteractionLongPress(item)"
        />
        <wd-empty v-if="contact.interactions.length === 0" description="暂无交互记录" />
      </wd-cell-group>

      <!-- Actions -->
      <view class="actions">
        <wd-button type="primary" block @click="goEdit">编辑联系人</wd-button>
        <wd-button type="error" block plain @click="deleteContact">删除联系人</wd-button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
}

.info-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
}

.avatar-circle {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background: #e8f8ef;
  color: #07c160;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 48rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
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
  background: #e8f8ef;
  color: #07c160;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.actions {
  margin-top: 32rpx;
}
</style>
