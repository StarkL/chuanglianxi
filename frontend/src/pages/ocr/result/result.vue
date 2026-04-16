<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact } from '../../../api/contacts.js'

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
  const currentPage = pages[pages.length - 1] as { $page: { options: { data?: string } } }
  const dataStr = currentPage.$page.options?.data
  if (dataStr) {
    try {
      const data = JSON.parse(decodeURIComponent(dataStr))
      name.value = data.name || ''
      company.value = data.company || ''
      title.value = data.title || ''
      phone.value = data.phone || ''
      email.value = data.email || ''
      wechatId.value = data.wechatId || ''
      cardId.value = data.cardId || ''
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
</script>

<template>
  <view class="result-page">
    <view class="form">
      <view class="form-group">
        <text class="label">姓名 <text class="required">*</text></text>
        <input class="input" v-model="name" placeholder="姓名" />
      </view>

      <view class="form-group">
        <text class="label">公司</text>
        <input class="input" v-model="company" placeholder="公司" />
      </view>

      <view class="form-group">
        <text class="label">职位</text>
        <input class="input" v-model="title" placeholder="职位" />
      </view>

      <view class="form-group">
        <text class="label">电话</text>
        <input class="input" v-model="phone" placeholder="电话" type="number" />
      </view>

      <view class="form-group">
        <text class="label">邮箱</text>
        <input class="input" v-model="email" placeholder="邮箱" type="text" />
      </view>

      <view class="form-group">
        <text class="label">微信号</text>
        <input class="input" v-model="wechatId" placeholder="微信号" />
      </view>
    </view>

    <button class="save-btn" :loading="saving" :disabled="saving" @click="handleSave">
      保存为联系人
    </button>
  </view>
</template>

<style scoped>
.result-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.form {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.form-group {
  margin-bottom: 32rpx;
}

.form-group:last-child {
  margin-bottom: 0;
}

.label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.required {
  color: #e64340;
}

.input {
  height: 80rpx;
  background-color: #f6f6f6;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
}

.save-btn {
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
