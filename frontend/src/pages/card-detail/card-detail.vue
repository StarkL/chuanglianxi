<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact, type Contact } from '../api/contacts.js'

interface OcrData {
  name: string
  company: string
  title: string
  phone: string
  email: string
  website: string | null
  address: string | null
  wechatId: string | null
}

const cardId = ref('')
const ocrData = ref<OcrData | null>(null)
const loading = ref(false)
const saving = ref(false)

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { cardId?: string; data?: string } } }
  const { cardId: cid, data } = currentPage.$page.options || {}

  if (cid) cardId.value = cid
  if (data) {
    try {
      ocrData.value = JSON.parse(decodeURIComponent(data))
    } catch {
      ocrData.value = null
    }
  }
})

async function saveAsContact() {
  if (!ocrData.value || !ocrData.value.name) {
    uni.showToast({ title: '无有效姓名', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const data: Partial<Contact> = {
      name: ocrData.value.name,
      company: ocrData.value.company || undefined,
      title: ocrData.value.title || undefined,
      phone: ocrData.value.phone || undefined,
      email: ocrData.value.email || undefined,
      wechatId: ocrData.value.wechatId || undefined,
      source: 'ocr',
      tags: [],
    }
    await createContact(data)
    uni.showToast({ title: '已保存为联系人', icon: 'success' })
    setTimeout(() => {
      uni.navigateBack({ delta: 2 })
    }, 500)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function deleteCard() {
  uni.showModal({
    title: '确认删除？',
    content: '删除后无法恢复该名片',
    confirmColor: '#e64340',
    success: async (res) => {
      if (res.confirm) {
        try {
          const { request } = await import('../utils/request.js')
          await request({ url: `/business-cards/${cardId.value}`, method: 'DELETE' })
          uni.showToast({ title: '已删除', icon: 'success' })
          setTimeout(() => uni.navigateBack(), 500)
        } catch {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    },
  })
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}
</script>

<template>
  <view class="card-detail-page">
    <view v-if="!ocrData" class="empty">
      <wd-status-tip image="content" tip="名片信息不存在" />
    </view>

    <template v-else>
      <!-- OCR result -->
      <wd-cell-group>
        <view class="name-header">
          <text class="name">{{ ocrData.name || '未识别' }}</text>
          <text v-if="ocrData.company || ocrData.title" class="subtitle">
            {{ ocrData.company }}<text v-if="ocrData.company && ocrData.title"> · </text>{{ ocrData.title }}
          </text>
        </view>
      </wd-cell-group>

      <wd-cell-group title="联系方式">
        <wd-cell v-if="ocrData.phone" title="电话" :value="ocrData.phone" is-link @click="uni.makePhoneCall({ phoneNumber: ocrData.phone! })" />
        <wd-cell v-if="ocrData.email" title="邮箱" :value="ocrData.email" />
        <wd-cell v-if="ocrData.wechatId" title="微信" :value="ocrData.wechatId" />
        <wd-cell v-if="ocrData.website" title="网站" :value="ocrData.website" />
        <wd-cell v-if="ocrData.address" title="地址" :value="ocrData.address" />
      </wd-cell-group>

      <!-- Actions -->
      <view class="actions">
        <wd-button type="primary" block :loading="saving" @click="saveAsContact">
          保存为联系人
        </wd-button>
        <wd-gap :height="16" bg-color="transparent" />
        <wd-button type="error" block plain @click="deleteCard">
          删除名片
        </wd-button>
      </view>
    </template>
  </view>
</template>

<style scoped>
.card-detail-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
}

.empty {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
}

.name-header {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 24rpx 0;
}

.name {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #999;
}

.actions {
  margin-top: 32rpx;
}
</style>
