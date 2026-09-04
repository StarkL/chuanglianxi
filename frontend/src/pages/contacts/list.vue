<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getContacts, type Contact } from '../../api/contacts'
import { onDataChanged } from '../../utils/events'

const contacts = ref<Contact[]>([])
const searchKeyword = ref('')
const selectedTag = ref('')
const searchFocused = ref(false)

let searchTimer: ReturnType<typeof setTimeout> | null = null

const allTags = ref<string[]>(['工作', '朋友', '家人'])

onMounted(() => {
  loadContacts()
  // 监听联系人数据变更事件（编辑页创建/更新后触发）
  onDataChanged('contacts', () => {
    loadContacts()
  })
})

onShow(() => {
  loadContacts()
})

// 页面销毁时清理事件监听（uni-app 中用 onUnmounted 或页面栈管理）

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

function handleFocus() {
  searchFocused.value = true
}

function handleBlur() {
  searchFocused.value = false
}

function handleChange() {
  handleSearch()
}

function handleCancel() {
  searchKeyword.value = ''
  searchFocused.value = false
  loadContacts()
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

const showFabMenu = ref(false)

function toggleFabMenu() {
  showFabMenu.value = !showFabMenu.value
}

function handleMenuSelect(type: 'import' | 'create' | 'scan') {
  showFabMenu.value = false
  if (type === 'import') {
    goImport()
  } else if (type === 'create') {
    goCreate()
  } else if (type === 'scan') {
    uni.navigateTo({ url: '/pages/ocr/scan/scan' })
  }
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
  <view class="contact-list-page" :class="{ 'has-items': contacts.length > 0 }">
    <!-- 搜索栏 -->
    <view class="search-bar">
      <wd-search
        placeholder="搜索姓名或公司"
        v-model="searchKeyword"
        :hide-cancel="!searchFocused"
        @search="handleSearch"
        @clear="handleSearch"
        @change="handleChange"
        @focus="handleFocus"
        @blur="handleBlur"
        @cancel="handleCancel"
        custom-class="custom-search"
      />
    </view>

    <!-- 标签筛选 - 胶囊式横向滚动 -->
    <scroll-view scroll-x :show-scrollbar="false" class="tag-filter-scroll">
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
      <view class="empty-actions">
        <view class="empty-btn primary" @click="goImport">
          <text class="btn-icon">📥</text>
          <text class="btn-text">批量导入通讯录</text>
        </view>
        <view class="empty-btn secondary" @click="goCreate">
          <text class="btn-icon">➕</text>
          <text class="btn-text">手动添加联系人</text>
        </view>
      </view>
    </view>

    <!-- 浮动操作浮窗遮罩 -->
    <view v-if="showFabMenu" class="fab-mask" @click="showFabMenu = false" />

    <!-- 浮动操作卡片浮窗 -->
    <view v-if="showFabMenu" class="fab-popover">
      <view class="fab-menu-item" @click="handleMenuSelect('import')">
        <view class="fab-menu-icon icon-import">📥</view>
        <view class="fab-menu-info">
          <text class="fab-menu-title">通讯录导入</text>
          <text class="fab-menu-desc">手机通讯录 vcf 文件一键导入</text>
        </view>
      </view>
      <view class="fab-menu-divider" />
      <view class="fab-menu-item" @click="handleMenuSelect('create')">
        <view class="fab-menu-icon icon-create">➕</view>
        <view class="fab-menu-info">
          <text class="fab-menu-title">手动新增</text>
          <text class="fab-menu-desc">逐项录入姓名、电话、公司等</text>
        </view>
      </view>
      <view class="fab-menu-divider" />
      <view class="fab-menu-item" @click="handleMenuSelect('scan')">
        <view class="fab-menu-icon icon-scan">📷</view>
        <view class="fab-menu-info">
          <text class="fab-menu-title">扫描名片</text>
          <text class="fab-menu-desc">拍照上传名片智能识别</text>
        </view>
      </view>
    </view>

    <!-- 浮动添加按钮 -->
    <view class="fab" :class="{ 'is-active': showFabMenu }" @click="toggleFabMenu">
      <text class="fab-icon">+</text>
    </view>
  </view>
</template>

<style scoped>
.contact-list-page {
  min-height: 100%;
  box-sizing: border-box;
  background-color: #F8F9FA;
  padding-bottom: 32rpx;
  display: flex;
  flex-direction: column;
}

.contact-list-page.has-items {
  padding-bottom: calc(var(--window-bottom, 50px) + 120rpx);
}

/* ---- 搜索栏 ---- */
.search-bar {
  padding: 20rpx 32rpx 16rpx;
  position: sticky;
  top: 0;
  z-index: 10;
  background: rgba(248, 249, 250, 0.95);
  backdrop-filter: blur(10px);
}

/* ---- 标签筛选 - 胶囊式横向滚动 ---- */
.tag-filter-scroll {
  white-space: nowrap;
  padding: 0 32rpx 20rpx;
  scrollbar-width: none; /* Firefox */
  -ms-overflow-style: none; /* IE/Edge */
}

.tag-filter-scroll ::-webkit-scrollbar,
.tag-filter-scroll::-webkit-scrollbar {
  display: none !important;
  width: 0 !important;
  height: 0 !important;
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
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 40rpx 48rpx;
  text-align: center;
  box-sizing: border-box;
}

.empty-icon {
  font-size: 88rpx;
  margin-bottom: 20rpx;
  opacity: 0.6;
}

.empty-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  margin-bottom: 10rpx;
}

.empty-hint {
  font-size: 24rpx;
  color: #B2BEC3;
  line-height: 1.5;
}

.empty-actions {
  margin-top: 36rpx;
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  width: 100%;
  max-width: 440rpx;
}

.empty-btn {
  height: 80rpx;
  border-radius: 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
  font-size: 26rpx;
  font-weight: 600;
  transition: all 0.2s;
}

.empty-btn:active {
  transform: scale(0.98);
}

.empty-btn.primary {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  color: #FFFFFF;
  box-shadow: 0 8rpx 24rpx rgba(108, 92, 231, 0.25);
}

.empty-btn.secondary {
  background: #FFFFFF;
  color: #6C5CE7;
  border: 2rpx solid #E2E8F0;
}

/* ---- 浮动操作浮窗遮罩 ---- */
.fab-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  bottom: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  z-index: 999;
  animation: fabFadeIn 0.2s ease-out;
}

@keyframes fabFadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* ---- 浮动操作浮窗卡片 ---- */
.fab-popover {
  position: fixed;
  bottom: 250rpx;
  right: 48rpx;
  width: 440rpx;
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 16rpx 18rpx;
  box-shadow: 0 20rpx 60rpx rgba(108, 92, 231, 0.2), 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  z-index: 1000;
  transform-origin: bottom right;
  animation: fabPopIn 0.22s cubic-bezier(0.16, 1, 0.3, 1);
}

@keyframes fabPopIn {
  from {
    opacity: 0;
    transform: scale(0.7) translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

.fab-menu-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 16rpx 16rpx;
  border-radius: 18rpx;
  transition: background-color 0.2s;
  cursor: pointer;
}

.fab-menu-item:active {
  background: #F4F3FF;
}

.fab-menu-icon {
  width: 68rpx;
  height: 68rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 32rpx;
  flex-shrink: 0;
}

.fab-menu-icon.icon-import {
  background: rgba(108, 92, 231, 0.12);
  color: #6C5CE7;
}

.fab-menu-icon.icon-create {
  background: rgba(0, 184, 148, 0.12);
  color: #00B894;
}

.fab-menu-icon.icon-scan {
  background: rgba(9, 132, 227, 0.12);
  color: #0984E3;
}

.fab-menu-info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}

.fab-menu-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
  line-height: 1.2;
}

.fab-menu-desc {
  font-size: 20rpx;
  color: #8C99A6;
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.fab-menu-divider {
  height: 1rpx;
  background: #F1F2F6;
  margin: 4rpx 12rpx;
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
  box-shadow: 0 16rpx 48rpx rgba(108, 92, 231, 0.35);
  z-index: 1001;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.fab.is-active {
  transform: rotate(45deg);
  background: linear-gradient(135deg, #636E72, #2D3436);
  box-shadow: 0 16rpx 48rpx rgba(45, 52, 54, 0.3);
}

.fab:active {
  transform: scale(0.92);
}

.fab.is-active:active {
  transform: scale(0.92) rotate(45deg);
}

.fab-icon {
  color: #FFFFFF;
  font-size: 48rpx;
  font-weight: 300;
  line-height: 1;
}
</style>
