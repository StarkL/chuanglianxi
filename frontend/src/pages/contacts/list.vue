<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getContacts, type Contact } from '../../api/contacts'

const contacts = ref<Contact[]>([])
const searchKeyword = ref('')
const selectedTag = ref('')

let searchTimer: ReturnType<typeof setTimeout> | null = null

const allTags = ref<string[]>(['工作', '朋友', '家人'])

// 页面显示时刷新列表（新增联系人后返回时触发）
onShow(() => {
  loadContacts()
})

async function loadContacts() {
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

// 计算关系温度环颜色（基于 tags）
function getTempClass(contact: Contact): string {
  if (contact.tags.includes('家人')) return 'warm'
  if (contact.tags.includes('工作')) return 'cold'
  return 'warm'
}

function getTempGradient(contact: Contact): string {
  if (contact.tags.includes('家人')) {
    return 'linear-gradient(135deg, #55EFC4, #00B894)'
  }
  if (contact.tags.length === 0) {
    return 'linear-gradient(135deg, #DFE6E9, #B2BEC3)'
  }
  return 'linear-gradient(135deg, #A29BFE, #6C5CE7)'
}

// 联系频率指示器颜色
function getFreqClass(contact: Contact): string {
  if (contact.tags.includes('家人')) return 'warm'
  return ''
}
</script>

<template>
  <view class="contact-list-page">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <wd-search
        placeholder="搜索姓名或公司"
        v-model="searchKeyword"
        @search="handleSearch"
        @clear="handleSearch"
        custom-class="custom-search"
      />
    </view>

    <!-- 标签筛选 - 胶囊式横向滚动 -->
    <scroll-view scroll-x class="tag-filter-scroll">
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
    </scroll-view>

    <!-- 联系人卡片列表 -->
    <view class="contact-list" v-if="contacts.length > 0">
      <view
        v-for="contact in contacts"
        :key="contact.id"
        class="contact-card"
        @click="goDetail(contact.id)"
      >
        <!-- 头像 + 关系温度环 -->
        <view class="avatar-wrapper">
          <view
            class="avatar-ring"
            :class="getTempClass(contact)"
          />
          <view class="avatar" :style="{ background: getTempGradient(contact) }">
            {{ contact.name.charAt(0) }}
          </view>
        </view>

        <!-- 信息区域 -->
        <view class="contact-info">
          <text class="contact-name">{{ contact.name }}</text>
          <text class="contact-meta">
            {{ contact.company ? contact.company + (contact.title ? ' · ' + contact.title : '') : '暂无公司信息' }}
          </text>
          <view v-if="contact.tags.length > 0" class="contact-tags">
            <text
              v-for="tag in contact.tags"
              :key="tag"
              class="contact-tag"
            >{{ tag }}</text>
          </view>
        </view>

        <!-- 联系频率指示条 -->
        <view class="frequency-bar" :class="getFreqClass(contact)" />
      </view>
    </view>

    <!-- 空状态 -->
    <view v-else class="empty-state">
      <view class="empty-icon">📇</view>
      <text class="empty-title">暂无联系人</text>
      <text class="empty-hint">添加你的第一个联系人，开始管理你的人际关系吧</text>
    </view>

    <!-- 底部操作区 -->
    <view class="bottom-actions">
      <!-- #ifndef H5 -->
      <view class="import-btn-wrap">
        <wd-button block plain @click="goImport" custom-class="import-btn">从通讯录导入</wd-button>
      </view>
      <!-- #endif -->
    </view>

    <!-- 浮动添加按钮 -->
    <view class="fab" @click="goCreate">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<style scoped>
.contact-list-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding-bottom: 160rpx;
}

/* ---- 搜索栏 ---- */
.search-bar {
  padding: 24rpx 32rpx 16rpx;
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(248, 249, 250, 0.95);
  backdrop-filter: blur(10px);
}

/* ---- 标签筛选 - 胶囊式横向滚动 ---- */
.tag-filter-scroll {
  white-space: nowrap;
  padding: 0 32rpx 24rpx;
}

.tag-filter {
  display: inline-flex;
  gap: 16rpx;
}

.tag-item {
  padding: 12rpx 32rpx;
  border-radius: 9999rpx;
  font-size: 26rpx;
  color: #636E72;
  background: #FFFFFF;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  white-space: nowrap;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.tag-item:active {
  transform: scale(0.95);
}

.tag-item.active {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  color: #FFFFFF;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.3);
}

/* ---- 联系人卡片 ---- */
.contact-list {
  padding: 0 32rpx;
}

.contact-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  display: flex;
  align-items: center;
  gap: 24rpx;
  position: relative;
  overflow: hidden;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.contact-card:active {
  transform: scale(0.98);
  background: #F0EEFF;
}

/* 关系温度环 */
.avatar-wrapper {
  position: relative;
  width: 96rpx;
  height: 96rpx;
  flex-shrink: 0;
}

.avatar-ring {
  position: absolute;
  inset: -4rpx;
  border-radius: 50%;
  padding: 4rpx;
  background: linear-gradient(135deg, #74B9FF, #6C5CE7, #FD79A8);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  animation: ringPulse 3s ease-in-out infinite;
}

.avatar-ring.cold {
  background: #74B9FF;
}

.avatar-ring.warm {
  background: linear-gradient(135deg, #55EFC4, #00B894);
}

@keyframes ringPulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50% { opacity: 0.8; transform: scale(1.05); }
}

.avatar {
  width: 96rpx;
  height: 96rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #FFFFFF;
  font-size: 36rpx;
  font-weight: 600;
  position: relative;
  z-index: 1;
}

/* 信息区域 */
.contact-info {
  flex: 1;
  min-width: 0;
}

.contact-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  display: block;
  margin-bottom: 4rpx;
}

.contact-meta {
  font-size: 24rpx;
  color: #636E72;
  display: block;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  margin-bottom: 8rpx;
}

.contact-tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
}

.contact-tag {
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 9999rpx;
  background: rgba(108, 92, 231, 0.1);
  color: #6C5CE7;
  font-weight: 500;
}

/* 联系频率指示条 */
.frequency-bar {
  width: 8rpx;
  height: 64rpx;
  border-radius: 4rpx;
  background: #74B9FF;
  flex-shrink: 0;
}

.frequency-bar.warm {
  background: linear-gradient(to top, #FD79A8, #6C5CE7);
}

/* ---- 空状态 ---- */
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 128rpx 64rpx;
  text-align: center;
}

.empty-icon {
  font-size: 128rpx;
  margin-bottom: 32rpx;
  opacity: 0.5;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 12rpx;
}

.empty-hint {
  font-size: 26rpx;
  color: #B2BEC3;
  line-height: 1.6;
}

/* ---- 底部操作区 ---- */
.bottom-actions {
  padding: 24rpx 32rpx;
}

/* ---- 浮动添加按钮 (FAB) ---- */
.fab {
  position: fixed;
  bottom: 120rpx;
  right: 48rpx;
  width: 112rpx;
  height: 112rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 16rpx 64rpx rgba(108, 92, 231, 0.3);
  z-index: 100;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab:active {
  transform: scale(0.9) rotate(90deg);
}

.fab-icon {
  color: #FFFFFF;
  font-size: 48rpx;
  font-weight: 300;
  line-height: 1;
}
</style>
