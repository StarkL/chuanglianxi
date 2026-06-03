<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact, type Contact } from '../../../api/contacts'
import { emitDataChanged } from '../../../utils/events'

const saving = ref(false)

const name = ref('')
const company = ref('')
const title = ref('')
const phone = ref('')
const email = ref('')
const wechatId = ref('')
const cardId = ref('')

const showDuplicateModal = ref(false)
const showDetailModal = ref(false)
const duplicateContact = ref<Contact | null>(null)

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { data?: string; cardId?: string } } }
  const { data, cardId: cid } = currentPage.$page.options || {}

  if (cid) cardId.value = cid

  if (data) {
    try {
      const parsed = JSON.parse(decodeURIComponent(data))
      name.value = parsed.name || ''
      company.value = parsed.company || ''
      title.value = parsed.title || ''
      phone.value = parsed.phone || ''
      email.value = parsed.email || ''
      wechatId.value = parsed.wechatId || ''
    } catch {
      uni.showToast({ title: '数据解析失败', icon: 'none' })
    }
  }
})

async function executeSave(ignoreDuplicate = false) {
  saving.value = true
  try {
    const data = {
      name: name.value.trim(),
      company: company.value.trim() || undefined,
      title: title.value.trim() || undefined,
      phone: phone.value.trim() || undefined,
      email: email.value.trim() || undefined,
      wechatId: wechatId.value.trim() || undefined,
      source: 'business-card',
      tags: [],
      ignoreDuplicate,
    }

    const res = await createContact(data)
    if (!res.success && res.error === 'duplicate') {
      duplicateContact.value = res.data || null
      showDuplicateModal.value = true
      saving.value = false
      return
    }

    if (res.success && res.data) {
      emitDataChanged('contacts', 'create')
      uni.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => {
        uni.switchTab({ url: '/pages/contacts/list' })
      }, 500)
    } else {
      uni.showToast({ title: res.error || '保存失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

async function handleSave() {
  if (!name.value.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }

  await executeSave(false)
}

function handleConfirmDuplicate() {
  showDuplicateModal.value = false
  executeSave(true)
}

function handleRetake() {
  uni.navigateBack({ delta: 2 })
}
</script>

<template>
  <view class="result-page">
    <!-- 名片预览卡片 -->
    <view class="card-preview">
      <view class="card-preview__gradient" />
      <view class="card-preview__badge">
        <text class="card-preview__badge-text">
          ✨ AI 智能识别
        </text>
      </view>
      <view class="card-preview__content">
        <view class="card-preview__header">
          <view class="card-preview__avatar">
            <text class="card-preview__avatar-text">
              {{ name ? name.charAt(0) : '?' }}
            </text>
          </view>
          <view class="card-preview__info">
            <text class="card-preview__name">
              {{ name || '未识别姓名' }}
            </text>
            <view class="card-preview__role-row">
              <text
                v-if="title"
                class="card-preview__title"
              >
                {{ title }}
              </text>
              <text
                v-if="title && company"
                class="card-preview__dot"
              >
                ·
              </text>
              <text
                v-if="company"
                class="card-preview__company"
              >
                {{ company }}
              </text>
            </view>
          </view>
        </view>

        <!-- Bottom details section -->
        <view class="card-preview__details">
          <view
            v-if="phone"
            class="card-preview__detail-item"
          >
            <text class="card-preview__detail-icon">
              📞
            </text>
            <text class="card-preview__detail-text">
              {{ phone }}
            </text>
          </view>
          <view
            v-if="email"
            class="card-preview__detail-item"
          >
            <text class="card-preview__detail-icon">
              ✉️
            </text>
            <text class="card-preview__detail-text">
              {{ email }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 信息编辑区 -->
    <view class="edit-section">
      <text class="edit-section__title">
        确认信息
      </text>
      
      <view class="edit-card">
        <view class="edit-field">
          <view class="edit-field__header">
            <text class="field-icon icon-name">
              👤
            </text>
            <text class="edit-field__label">
              姓名
            </text>
          </view>
          <input 
            v-model="name" 
            class="edit-field__input" 
            placeholder="请输入姓名" 
            placeholder-class="input-placeholder"
          >
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <view class="edit-field__header">
            <text class="field-icon icon-company">
              🏢
            </text>
            <text class="edit-field__label">
              公司
            </text>
          </view>
          <input 
            v-model="company" 
            class="edit-field__input" 
            placeholder="请输入公司名称" 
            placeholder-class="input-placeholder"
          >
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <view class="edit-field__header">
            <text class="field-icon icon-title">
              💼
            </text>
            <text class="edit-field__label">
              职位
            </text>
          </view>
          <input 
            v-model="title" 
            class="edit-field__input" 
            placeholder="请输入职位" 
            placeholder-class="input-placeholder"
          >
        </view>
      </view>

      <view class="edit-card">
        <view class="edit-field">
          <view class="edit-field__header">
            <text class="field-icon icon-phone">
              📞
            </text>
            <text class="edit-field__label">
              电话
            </text>
          </view>
          <input 
            v-model="phone" 
            class="edit-field__input" 
            placeholder="请输入电话" 
            type="number" 
            placeholder-class="input-placeholder"
          >
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <view class="edit-field__header">
            <text class="field-icon icon-email">
              ✉️
            </text>
            <text class="edit-field__label">
              邮箱
            </text>
          </view>
          <input 
            v-model="email" 
            class="edit-field__input" 
            placeholder="请输入邮箱" 
            type="email" 
            placeholder-class="input-placeholder"
          >
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <view class="edit-field__header">
            <text class="field-icon icon-wechat">
              💬
            </text>
            <text class="edit-field__label">
              微信号
            </text>
          </view>
          <input 
            v-model="wechatId" 
            class="edit-field__input" 
            placeholder="请输入微信号" 
            placeholder-class="input-placeholder"
          >
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-group">
      <view
        class="btn-secondary"
        @click="handleRetake"
      >
        <text class="btn-secondary__text">
          重新扫描
        </text>
      </view>
      <view
        class="btn-primary"
        :class="{ 'btn-primary--loading': saving }"
        @click="handleSave"
      >
        <text class="btn-primary__text">
          {{ saving ? '保存中...' : '确认保存' }}
        </text>
      </view>
    </view>

    <!-- 重名提示弹窗 -->
    <view
      v-if="showDuplicateModal"
      class="modal-mask animate-fade"
    >
      <view class="modal-container animate-scale">
        <view class="modal-header">
          <text class="modal-title">
            ⚠️ 发现同名联系人
          </text>
        </view>
        <view class="modal-body">
          <text class="modal-text">
            系统里已存在同名联系人
          </text>
          <text
            class="modal-link"
            @click="showDetailModal = true"
          >
            {{ name }}
          </text>
          <text class="modal-text">
            ，您确定要继续添加吗？
          </text>
        </view>
        <view class="modal-footer">
          <view
            class="modal-btn modal-btn--cancel"
            @click="showDuplicateModal = false"
          >
            <text class="modal-btn-text">
              取消
            </text>
          </view>
          <view
            class="modal-btn modal-btn--confirm"
            @click="handleConfirmDuplicate"
          >
            <text class="modal-btn-text">
              继续添加
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 已有联系人详情二级弹窗 -->
    <view
      v-if="showDetailModal"
      class="modal-mask animate-fade"
      style="z-index: 1010;"
    >
      <view class="modal-container animate-scale">
        <view class="modal-header">
          <text class="modal-title">
            已存在联系人信息
          </text>
        </view>
        <view class="modal-body detail-body">
          <view class="detail-row">
            <text class="detail-label">
              姓名
            </text>
            <text class="detail-val">
              {{ duplicateContact?.name }}
            </text>
          </view>
          <view class="detail-divider" />
          <view
            v-if="duplicateContact?.company"
            class="detail-row"
          >
            <text class="detail-label">
              公司
            </text>
            <text class="detail-val">
              {{ duplicateContact?.company }}
            </text>
          </view>
          <view
            v-if="duplicateContact?.company"
            class="detail-divider"
          />
          <view
            v-if="duplicateContact?.title"
            class="detail-row"
          >
            <text class="detail-label">
              职位
            </text>
            <text class="detail-val">
              {{ duplicateContact?.title }}
            </text>
          </view>
          <view
            v-if="duplicateContact?.title"
            class="detail-divider"
          />
          <view
            v-if="duplicateContact?.phone"
            class="detail-row"
          >
            <text class="detail-label">
              电话
            </text>
            <text class="detail-val">
              {{ duplicateContact?.phone }}
            </text>
          </view>
          <view
            v-if="duplicateContact?.phone"
            class="detail-divider"
          />
          <view
            v-if="duplicateContact?.email"
            class="detail-row"
          >
            <text class="detail-label">
              邮箱
            </text>
            <text class="detail-val">
              {{ duplicateContact?.email }}
            </text>
          </view>
          <view
            v-if="duplicateContact?.email"
            class="detail-divider"
          />
          <view
            v-if="duplicateContact?.wechatId"
            class="detail-row"
          >
            <text class="detail-label">
              微信号
            </text>
            <text class="detail-val">
              {{ duplicateContact?.wechatId }}
            </text>
          </view>
        </view>
        <view class="modal-footer">
          <view
            class="modal-btn modal-btn--single"
            @click="showDetailModal = false"
          >
            <text class="modal-btn-text">
              知道了
            </text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped lang="scss">
.result-page {
  min-height: 100vh;
  background: $bg-main;
  padding: $space-md;
  padding-bottom: calc(220rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

/* 名片预览卡片 */
.card-preview {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-card;
  margin-bottom: $space-md;
  min-height: 280rpx;
  background: #FFFFFF;
}

.card-preview__gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
  opacity: 0.95;
  z-index: 0;
}

.card-preview__badge {
  position: absolute;
  top: 24rpx;
  right: 24rpx;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(8px);
  padding: 6rpx 16rpx;
  border-radius: 999rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  z-index: 2;
}

.card-preview__badge-text {
  color: #ffffff;
  font-size: 20rpx;
  font-weight: 600;
}

.card-preview__content {
  position: relative;
  z-index: 1;
  padding: 40rpx;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  box-sizing: border-box;
}

.card-preview__header {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
}

.card-preview__avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8rpx);
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  margin-right: 24rpx;
}

.card-preview__avatar-text {
  color: #ffffff;
  font-size: 36rpx;
  font-weight: 700;
}

.card-preview__info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-preview__name {
  color: #ffffff;
  font-size: 38rpx;
  font-weight: 700;
  margin-bottom: 8rpx;
  letter-spacing: 1rpx;
}

.card-preview__role-row {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.card-preview__title {
  color: #ffffff;
  font-size: $font-sm;
  font-weight: 600;
}

.card-preview__dot {
  color: rgba(255, 255, 255, 0.6);
  font-size: $font-sm;
  margin: 0 10rpx;
}

.card-preview__company {
  color: rgba(255, 255, 255, 0.85);
  font-size: $font-sm;
  font-weight: 400;
}

.card-preview__details {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
  border-top: 1rpx solid rgba(255, 255, 255, 0.15);
  padding-top: 24rpx;
}

.card-preview__detail-item {
  display: flex;
  align-items: center;
}

.card-preview__detail-icon {
  font-size: 24rpx;
  margin-right: 12rpx;
  opacity: 0.85;
}

.card-preview__detail-text {
  color: rgba(255, 255, 255, 0.9);
  font-size: 24rpx;
}

/* 编辑区 */
.edit-section {
  margin-bottom: $space-md;
}

.edit-section__title {
  font-size: 28rpx;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: 20rpx;
  padding-left: 8rpx;
}

.edit-card {
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-card;
  padding: 12rpx 0;
  margin-bottom: 30rpx;
}

.edit-field {
  display: flex;
  flex-direction: column;
  align-items: stretch;
  padding: 20rpx 32rpx;
}

.edit-field__header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.field-icon {
  font-size: 26rpx;
  margin-right: 12rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  
  &.icon-name { background: #EEF2FF; }
  &.icon-company { background: #ECFDF5; }
  &.icon-title { background: #FFF7ED; }
  &.icon-phone { background: #EFF6FF; }
  &.icon-email { background: #FDF2F8; }
  &.icon-wechat { background: #F5F3FF; }
}

.edit-field__label {
  font-size: 26rpx;
  font-weight: 600;
  color: $text-secondary;
}

.edit-field__input {
  width: 100%;
  box-sizing: border-box;
  height: 88rpx;
  background: #F8F9FA;
  border: 1rpx solid #E2E8F0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  
  :deep(.uni-input-input) {
    font-size: 28rpx;
    color: $text-primary;
    height: 100%;
  }

  :deep(.uni-input-placeholder) {
    font-size: 28rpx;
    color: $text-tertiary;
  }
}

.edit-field__input:focus-within {
  background: #FFFFFF;
  border-color: $primary;
  box-shadow: 0 0 0 6rpx rgba(108, 92, 231, 0.12);
}

.input-placeholder {
  color: $text-tertiary;
}

.edit-divider {
  height: 1rpx;
  background: $border-light;
  margin: 0 32rpx;
}

/* 操作按钮 */
.action-group {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 24rpx 32rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(20px);
  border-top: 1rpx solid rgba(226, 232, 240, 0.8);
  display: flex;
  gap: 20rpx;
  z-index: 10;
}

.btn-primary {
  flex: 7;
  height: 92rpx;
  border-radius: 999rpx;
  background: linear-gradient(135deg, $primary 0%, $primary-dark 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.25);
  transition: all 0.2s ease;
}

.btn-primary:active {
  transform: scale(0.97);
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.15);
}

.btn-primary--loading {
  opacity: 0.8;
  pointer-events: none;
}

.btn-primary__text {
  color: #fff;
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.btn-secondary {
  flex: 3;
  height: 92rpx;
  border-radius: 999rpx;
  background: $bg-card;
  border: 2rpx solid $border-color;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
}

.btn-secondary:active {
  transform: scale(0.97);
  background: $bg-main;
}

.btn-secondary__text {
  color: $text-secondary;
  font-size: 30rpx;
  font-weight: 500;
  letter-spacing: 2rpx;
}

/* ---- 弹窗模态框样式 ---- */
.modal-mask {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.4);
  backdrop-filter: blur(12rpx);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 0 48rpx;
  box-sizing: border-box;
}

.modal-container {
  width: 100%;
  max-width: 600rpx;
  background: #FFFFFF;
  border-radius: 36rpx;
  box-shadow: 0 24rpx 72rpx rgba(108, 92, 231, 0.15);
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.modal-header {
  padding: 40rpx 40rpx 20rpx;
  text-align: center;
}

.modal-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #2D3436;
}

.modal-body {
  padding: 20rpx 40rpx 40rpx;
  text-align: center;
}

.modal-text {
  font-size: 28rpx;
  color: #636E72;
  line-height: 1.6;
}

.modal-link {
  font-size: 28rpx;
  color: #6C5CE7;
  font-weight: 700;
  text-decoration: underline;
  margin: 0 6rpx;
  cursor: pointer;
}

.detail-body {
  text-align: left;
  padding-top: 10rpx;
}

.detail-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  min-height: 56rpx;
}

.detail-label {
  font-size: 26rpx;
  color: #94A3B8;
  flex-shrink: 0;
}

.detail-val {
  font-size: 28rpx;
  color: #2D3436;
  font-weight: 500;
  text-align: right;
  word-break: break-all;
  padding-left: 20rpx;
}

.detail-divider {
  height: 1rpx;
  background: #F1F5F9;
}

.modal-footer {
  display: flex;
  border-top: 1rpx solid #F1F5F9;
}

.modal-btn {
  flex: 1;
  height: 96rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: background-color 0.2s ease;
}

.modal-btn:active {
  background-color: #F8F9FA;
}

.modal-btn--cancel {
  border-right: 1rpx solid #F1F5F9;
}

.modal-btn--confirm .modal-btn-text {
  color: #6C5CE7;
  font-weight: 700;
}

.modal-btn--single .modal-btn-text {
  color: #6C5CE7;
  font-weight: 700;
}

.modal-btn-text {
  font-size: 30rpx;
  color: #636E72;
}

/* 动效 */
.animate-fade {
  animation: fadeIn 0.25s ease-out;
}

.animate-scale {
  animation: scaleIn 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes scaleIn {
  from { transform: scale(0.9); opacity: 0; }
  to { transform: scale(1); opacity: 1; }
}
</style>
