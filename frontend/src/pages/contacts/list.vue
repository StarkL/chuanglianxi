<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getContacts, type Contact } from '../../api/contacts.js'

const contacts = ref<Contact[]>([])
const loading = ref(false)
const searching = ref(false)
const searchKeyword = ref('')
const selectedTag = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

const allTags = ref<string[]>(['工作', '朋友', '家人'])

async function loadContacts() {
  searching.value = true
  try {
    const params: Record<string, string> = {}
    if (searchKeyword.value) params.search = searchKeyword.value
    if (selectedTag.value) params.tag = selectedTag.value

    const res = await getContacts(params)
    if (res.success && res.data) {
      contacts.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    searching.value = false
  }
}

function handleSearch() {
  if (searchTimer) clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    loadContacts()
  }, 500)
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/contacts/detail/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/contacts/edit/edit' })
}

function goImport() {
  uni.navigateTo({ url: '/pages/contacts/import-phone' })
}

onMounted(() => {
  loadContacts()
})

// Reload when page becomes visible again (e.g. after returning from edit/detail)
onShow(() => {
  loadContacts()
})
</script>

<template>
  <view class="contact-list-page">
    <wd-search placeholder="搜索姓名或公司" v-model="searchKeyword" @search="handleSearch" @clear="handleSearch" />

    <view class="tag-filter">
      <view
        class="tag-item"
        :class="{ active: selectedTag === '' }"
        @click="selectedTag = ''; loadContacts()"
      >
        全部
      </view>
      <view
        v-for="tag in allTags"
        :key="tag"
        class="tag-item"
        :class="{ active: selectedTag === tag }"
        @click="selectedTag = selectedTag === tag ? '' : tag; loadContacts()"
      >
        {{ tag }}
      </view>
    </view>

    <wd-cell-group v-if="contacts.length > 0">
      <wd-cell
        v-for="contact in contacts"
        :key="contact.id"
        :title="contact.name"
        :label="contact.company ? contact.company + ' · ' + (contact.title || '') : '暂无公司信息'"
        is-link
        @click="goDetail(contact.id)"
      >
        <template #icon>
          <view class="avatar-circle">{{ contact.name.charAt(0) }}</view>
        </template>
        <template v-if="contact.tags.length > 0" #right-icon>
          <view class="tags-row">
            <text v-for="tag in contact.tags" :key="tag" class="tag-badge">{{ tag }}</text>
          </view>
        </template>
      </wd-cell>
    </wd-cell-group>

    <wd-status-tip v-else image="content" tip="暂无联系人" />

    <!-- #ifndef H5 -->
    <wd-button block plain @click="goImport" custom-class="import-btn">从通讯录导入</wd-button>
    <!-- #endif -->
    <wd-button type="primary" block @click="goCreate" custom-class="add-btn">+ 添加联系人</wd-button>
  </view>
</template>

<style scoped>
.contact-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
}

.tag-filter {
  display: flex;
  gap: 16rpx;
  margin-bottom: 32rpx;
}

.tag-item {
  padding: 8rpx 24rpx;
  background-color: #f6f6f6;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666;
}

.tag-item.active {
  background-color: #07c160;
  color: #fff;
}

.avatar-circle {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: #e8f8ef;
  color: #07c160;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.tags-row {
  display: flex;
}

.tag-badge {
  padding: 2rpx 8rpx;
  background: #e8f8ef;
  color: #07c160;
  border-radius: 4rpx;
  font-size: 20rpx;
  margin-left: 8rpx;
}
</style>
