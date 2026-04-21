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
    <wd-cell-group border inset>
      <wd-form-item label="姓名" required>
        <wd-input v-model="name" placeholder="姓名" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="公司">
        <wd-input v-model="company" placeholder="公司" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="职位">
        <wd-input v-model="title" placeholder="职位" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="电话">
        <wd-input v-model="phone" placeholder="电话" type="number" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="邮箱">
        <wd-input v-model="email" placeholder="邮箱" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="微信号">
        <wd-input v-model="wechatId" placeholder="微信号" :clearable="true" />
      </wd-form-item>
    </wd-cell-group>

    <view class="save-section">
      <wd-button block type="primary" :loading="saving" :disabled="saving" @click="handleSave">
        保存为联系人
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.result-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.save-section {
  margin-top: 32rpx;
}
</style>
