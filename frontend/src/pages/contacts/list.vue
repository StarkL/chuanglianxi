<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContacts, type Contact } from '../../api/contacts.js'

const contacts = ref<Contact[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const selectedTag = ref('')

const allTags = ref<string[]>(['工作', '朋友', '家人'])

async function loadContacts() {
  loading.value = true
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
    loading.value = false
  }
}

function handleSearch() {
  loadContacts()
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/contacts/detail/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/contacts/edit/edit' })
}

onMounted(() => {
  loadContacts()
})
</script>

<template>
  <view class="contact-list-page">
    <view class="search-bar">
      <input
        class="search-input"
        placeholder="搜索姓名或公司"
        v-model="searchKeyword"
        @confirm="handleSearch"
      />
    </view>

    <view class="tag-filter">
      <view
        v-for="tag in allTags"
        :key="tag"
        :class="['tag-item', selectedTag === tag ? 'active' : '']"
        @click="selectedTag = selectedTag === tag ? '' : tag; loadContacts()"
      >
        {{ tag }}
      </view>
    </view>

    <view class="list" v-if="contacts.length > 0">
      <view
        v-for="contact in contacts"
        :key="contact.id"
        class="contact-item"
        @click="goDetail(contact.id)"
      >
        <view class="avatar">
          <text v-if="contact.avatar" class="avatar-img">{{ contact.avatar }}</text>
          <text v-else class="avatar-text">{{ contact.name.charAt(0) }}</text>
        </view>
        <view class="info">
          <text class="name">{{ contact.name }}</text>
          <text v-if="contact.company" class="company">{{ contact.company }} · {{ contact.title || '' }}</text>
          <text v-else class="company-empty">暂无公司信息</text>
        </view>
        <view v-if="contact.tags.length > 0" class="tags">
          <text v-for="tag in contact.tags" :key="tag" class="tag">{{ tag }}</text>
        </view>
      </view>
    </view>

    <view v-else class="empty">
      <text class="empty-text">暂无联系人</text>
      <text class="empty-hint">点击下方按钮添加第一个联系人</text>
    </view>

    <button class="add-btn" @click="goCreate">+ 添加联系人</button>
  </view>
</template>

<style scoped>
.contact-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
}

.search-bar {
  margin-bottom: 16rpx;
}

.search-input {
  height: 72rpx;
  background-color: #f6f6f6;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
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

.contact-item {
  display: flex;
  align-items: center;
  background-color: #fff;
  padding: 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
}

.avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background-color: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 32rpx;
  font-weight: 600;
  color: #07c160;
}

.info {
  flex: 1;
  min-width: 0;
}

.name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  display: block;
}

.company {
  font-size: 24rpx;
  color: #999;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.company-empty {
  font-size: 24rpx;
  color: #ccc;
  display: block;
}

.tags {
  display: flex;
  gap: 8rpx;
  flex-shrink: 0;
}

.tag {
  padding: 4rpx 12rpx;
  background-color: #e8f8ef;
  color: #07c160;
  border-radius: 8rpx;
  font-size: 20rpx;
}

.empty {
  text-align: center;
  padding: 128rpx 0;
}

.empty-text {
  font-size: 32rpx;
  color: #999;
  display: block;
  margin-bottom: 16rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #ccc;
  display: block;
}

.add-btn {
  position: fixed;
  bottom: 64rpx;
  left: 50%;
  transform: translateX(-50%);
  width: calc(100% - 64rpx);
  height: 88rpx;
  line-height: 88rpx;
  background-color: #07c160;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 16rpx;
  border: none;
}
</style>
