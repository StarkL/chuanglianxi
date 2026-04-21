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

function handleRetake() {
  uni.navigateBack({ delta: 2 })
}
</script>

<template>
  <view class="result-page">
    <wd-form>
      <wd-form-item label="姓名" prop="name">
        <wd-input v-model="name" placeholder="姓名" />
      </wd-form-item>

      <wd-form-item label="公司" prop="company">
        <wd-input v-model="company" placeholder="公司" />
      </wd-form-item>

      <wd-form-item label="职位" prop="title">
        <wd-input v-model="title" placeholder="职位" />
      </wd-form-item>

      <wd-form-item label="电话" prop="phone">
        <wd-input v-model="phone" placeholder="电话" type="number" />
      </wd-form-item>

      <wd-form-item label="邮箱" prop="email">
        <wd-input v-model="email" placeholder="邮箱" type="email" />
      </wd-form-item>

      <wd-form-item label="微信号" prop="wechatId">
        <wd-input v-model="wechatId" placeholder="微信号" />
      </wd-form-item>
    </wd-form>

    <view class="button-group">
      <wd-button type="primary" block :loading="saving" @click="handleSave">确认保存</wd-button>
      <wd-button block @click="handleRetake">重新扫描</wd-button>
    </view>
  </view>
</template>

<style scoped>
.result-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.button-group {
  margin-top: 32rpx;
}
</style>
