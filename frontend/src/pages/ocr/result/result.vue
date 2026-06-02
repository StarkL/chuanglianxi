<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact } from '../../../api/contacts'
import { emitDataChanged } from '../../../utils/events'

const saving = ref(false)

const name = ref('')
const company = ref('')
const title = ref('')
const phone = ref('')
const email = ref('')
const wechatId = ref('')
const cardId = ref('')

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

async function handleSave() {
  if (!name.value.trim()) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }

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
    }

    const res = await createContact(data)
    if (res.success && res.data) {
      emitDataChanged('contacts', 'create')
      uni.showToast({ title: '已保存', icon: 'success' })
      setTimeout(() => uni.navigateBack({ delta: 2 }), 500)
    } else {
      uni.showToast({ title: '保存失败', icon: 'none' })
    }
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
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
      <view class="card-preview__content">
        <view class="card-preview__header">
          <view class="card-preview__avatar">
            <text class="card-preview__avatar-text">{{ name ? name.charAt(0) : '?' }}</text>
          </view>
          <view class="card-preview__info">
            <text class="card-preview__name">{{ name || '未识别姓名' }}</text>
            <text v-if="company || title" class="card-preview__role">
              {{ company }}<template v-if="company && title"> · </template>{{ title }}
            </text>
          </view>
        </view>
      </view>
    </view>

    <!-- 信息编辑区 -->
    <view class="edit-section">
      <text class="edit-section__title">确认信息</text>
      <view class="edit-card">
        <view class="edit-field">
          <text class="edit-field__label">姓名</text>
          <input v-model="name" class="edit-field__input" placeholder="请输入姓名" />
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <text class="edit-field__label">公司</text>
          <input v-model="company" class="edit-field__input" placeholder="请输入公司名称" />
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <text class="edit-field__label">职位</text>
          <input v-model="title" class="edit-field__input" placeholder="请输入职位" />
        </view>
      </view>

      <view class="edit-card">
        <view class="edit-field">
          <text class="edit-field__label">电话</text>
          <input v-model="phone" class="edit-field__input" placeholder="请输入电话" type="number" />
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <text class="edit-field__label">邮箱</text>
          <input v-model="email" class="edit-field__input" placeholder="请输入邮箱" type="email" />
        </view>
        <view class="edit-divider" />
        <view class="edit-field">
          <text class="edit-field__label">微信号</text>
          <input v-model="wechatId" class="edit-field__input" placeholder="请输入微信号" />
        </view>
      </view>
    </view>

    <!-- 操作按钮 -->
    <view class="action-group">
      <view class="btn-primary" :class="{ 'btn-primary--loading': saving }" @click="handleSave">
        <text class="btn-primary__text">{{ saving ? '保存中...' : '确认保存' }}</text>
      </view>
      <view class="btn-secondary" @click="handleRetake">
        <text class="btn-secondary__text">重新扫描</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.result-page {
  min-height: 100vh;
  background: $bg-main;
  padding: $space-md;
  padding-bottom: 200rpx;
}

/* 名片预览卡片 */
.card-preview {
  position: relative;
  border-radius: $radius-lg;
  overflow: hidden;
  box-shadow: $shadow-card;
  margin-bottom: $space-md;
}

.card-preview__gradient {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, $primary 0%, $primary-light 60%, $temp-warm 100%);
  opacity: 0.9;
}

.card-preview__content {
  position: relative;
  z-index: 1;
  padding: $space-md;
  min-height: 180rpx;
}

.card-preview__header {
  display: flex;
  align-items: center;
}

.card-preview__avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: $radius-full;
  background: rgba(255, 255, 255, 0.25);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(8rpx);
  border: 2rpx solid rgba(255, 255, 255, 0.4);
  margin-right: $space-sm;
}

.card-preview__avatar-text {
  color: #fff;
  font-size: $font-lg;
  font-weight: 700;
}

.card-preview__info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-preview__name {
  color: #fff;
  font-size: $font-lg;
  font-weight: 600;
  margin-bottom: 6rpx;
}

.card-preview__role {
  color: rgba(255, 255, 255, 0.8);
  font-size: $font-sm;
}

/* 编辑区 */
.edit-section {
  margin-bottom: $space-md;
}

.edit-section__title {
  font-size: $font-md;
  font-weight: 600;
  color: $text-primary;
  display: block;
  margin-bottom: $space-sm;
  padding-left: $space-xs;
}

.edit-card {
  background: $bg-card;
  border-radius: $radius-md;
  box-shadow: $shadow-card;
  padding: $space-sm 0;
  margin-bottom: $space-sm;
}

.edit-field {
  display: flex;
  align-items: center;
  padding: $space-sm $space-md;
}

.edit-field__label {
  width: 120rpx;
  font-size: $font-sm;
  color: $text-secondary;
  flex-shrink: 0;
}

.edit-field__input {
  flex: 1;
  font-size: $font-sm;
  color: $text-primary;
  text-align: right;
  padding: 8rpx 0;
}

.edit-divider {
  height: 1rpx;
  background: $border-light;
  margin: 0 $space-md;
}

/* 操作按钮 */
.action-group {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: $space-sm $space-md;
  padding-bottom: calc($space-sm + env(safe-area-inset-bottom));
  background: linear-gradient(to top, rgba(248, 249, 250, 0.98), rgba(248, 249, 250, 0.9));
  backdrop-filter: blur(12rpx);
}

.btn-primary {
  width: 100%;
  height: 88rpx;
  border-radius: $radius-md;
  background: linear-gradient(135deg, $primary 0%, $primary-light 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.25);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
  margin-bottom: $space-sm;
}

.btn-primary:active {
  transform: scale(0.98);
}

.btn-primary--loading {
  opacity: 0.8;
}

.btn-primary__text {
  color: #fff;
  font-size: $font-md;
  font-weight: 600;
  letter-spacing: 2rpx;
}

.btn-secondary {
  width: 100%;
  height: 88rpx;
  border-radius: $radius-md;
  background: $bg-card;
  border: 2rpx solid $border-color;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: transform 0.2s ease;
}

.btn-secondary:active {
  transform: scale(0.98);
}

.btn-secondary__text {
  color: $text-secondary;
  font-size: $font-md;
  font-weight: 500;
  letter-spacing: 2rpx;
}
</style>
