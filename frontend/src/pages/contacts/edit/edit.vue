<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact, updateContact, getContact } from '../../../api/contacts.js'

const contactId = ref('')
const name = ref('')
const company = ref('')
const title = ref('')
const phone = ref('')
const email = ref('')
const wechatId = ref('')
const saving = ref(false)

const tagOptions = ['工作', '朋友', '家人', '同事', '客户']
const selectedTags = ref<string[]>([])

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

onMounted(async () => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as { $page: { options: { id?: string } } }
  const id = currentPage.$page.options?.id
  if (id) {
    contactId.value = id
    uni.setNavigationBarTitle({ title: '编辑联系人' })
    const res = await getContact(id)
    if (res.success && res.data) {
      name.value = res.data.name
      company.value = res.data.company || ''
      title.value = res.data.title || ''
      phone.value = res.data.phone || ''
      email.value = res.data.email || ''
      wechatId.value = res.data.wechatId || ''
      selectedTags.value = res.data.tags || []
    }
  } else {
    uni.setNavigationBarTitle({ title: '添加联系人' })
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
      tags: selectedTags.value,
    }

    if (contactId.value) {
      await updateContact(contactId.value, data)
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      const res = await createContact(data)
      if (res.success && res.data) {
        contactId.value = res.data.id
      }
      uni.showToast({ title: '已创建', icon: 'success' })
    }

    setTimeout(() => {
      uni.navigateBack()
    }, 500)
  } catch {
    uni.showToast({ title: '保存失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <view class="edit-page">
    <view class="form">
      <view class="form-group">
        <text class="label">姓名 <text class="required">*</text></text>
        <input class="input" v-model="name" placeholder="请输入姓名" />
      </view>

      <view class="form-group">
        <text class="label">公司</text>
        <input class="input" v-model="company" placeholder="请输入公司名称" />
      </view>

      <view class="form-group">
        <text class="label">职位</text>
        <input class="input" v-model="title" placeholder="请输入职位" />
      </view>

      <view class="form-group">
        <text class="label">电话</text>
        <input class="input" v-model="phone" placeholder="请输入电话号码" type="number" />
      </view>

      <view class="form-group">
        <text class="label">邮箱</text>
        <input class="input" v-model="email" placeholder="请输入邮箱" type="text" />
      </view>

      <view class="form-group">
        <text class="label">微信号</text>
        <input class="input" v-model="wechatId" placeholder="请输入微信号" />
      </view>

      <view class="form-group">
        <text class="label">标签</text>
        <view class="tag-picker">
          <view
            v-for="tag in tagOptions"
            :key="tag"
            :class="['tag-option', selectedTags.includes(tag) ? 'selected' : '']"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </view>
        </view>
      </view>
    </view>

    <button class="save-btn" :loading="saving" :disabled="saving" @click="handleSave">
      保存
    </button>
  </view>
</template>

<style scoped>
.edit-page {
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

.tag-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.tag-option {
  padding: 8rpx 24rpx;
  background-color: #f6f6f6;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666;
}

.tag-option.selected {
  background-color: #07c160;
  color: #fff;
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
