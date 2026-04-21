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

const birthdayType = ref<'solar' | 'lunar' | ''>('')
const birthday = ref('')
const lunarMonth = ref<number | null>(null)
const lunarDay = ref<number | null>(null)

const selectedTags = ref<string[]>([])

function toggleTag(tag: string) {
  const idx = selectedTags.value.indexOf(tag)
  if (idx >= 0) {
    selectedTags.value.splice(idx, 1)
  } else {
    selectedTags.value.push(tag)
  }
}

const monthOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
const dayOptions = Array.from({ length: 30 }, (_, i) => `${i + 1}日`)

function onBirthdayChange(e: any) {
  birthday.value = e.detail.value
}

function onLunarMonthChange(e: any) {
  const idx = e.detail.value as number
  lunarMonth.value = idx + 1
}

function onLunarDayChange(e: any) {
  const idx = e.detail.value as number
  lunarDay.value = idx + 1
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

      // Load birthday fields
      if (res.data.birthdayType) {
        birthdayType.value = res.data.birthdayType
      }
      if (res.data.birthday) {
        const d = new Date(res.data.birthday)
        birthday.value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      }
      if (res.data.lunarMonth) lunarMonth.value = res.data.lunarMonth
      if (res.data.lunarDay) lunarDay.value = res.data.lunarDay
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
      birthdayType: birthdayType.value || undefined,
      birthday: birthday.value || undefined,
      lunarMonth: lunarMonth.value || undefined,
      lunarDay: lunarDay.value || undefined,
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
    <wd-cell-group border inset>
      <wd-form-item label="姓名" required>
        <wd-input v-model="name" placeholder="请输入姓名" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="公司">
        <wd-input v-model="company" placeholder="请输入公司名称" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="职位">
        <wd-input v-model="title" placeholder="请输入职位" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="电话">
        <wd-input v-model="phone" placeholder="请输入电话号码" type="number" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="邮箱">
        <wd-input v-model="email" placeholder="请输入邮箱" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="微信号">
        <wd-input v-model="wechatId" placeholder="请输入微信号" :clearable="true" />
      </wd-form-item>
      <wd-form-item label="标签">
        <view class="tag-input">
          <wd-tag
            v-for="tag in ['工作', '朋友', '家人']"
            :key="tag"
            size="small"
            :plain="!selectedTags.includes(tag)"
            :custom-style="{
              marginRight: '8px',
              marginBottom: '8px',
              ...(selectedTags.includes(tag) ? { backgroundColor: '#07c160', color: '#fff', borderColor: '#07c160' } : {})
            }"
            @click="toggleTag(tag)"
          >
            {{ tag }}
          </wd-tag>
        </view>
      </wd-form-item>

      <wd-form-item label="生日">
        <view class="birthday-section">
          <view class="birthday-type">
            <wd-tag
              size="small"
              :custom-style="{ flex: 1, textAlign: 'center' }"
              :plain="birthdayType !== 'solar'"
              @click="birthdayType = 'solar'"
            >
              公历
            </wd-tag>
            <wd-tag
              size="small"
              :custom-style="{ flex: 1, textAlign: 'center' }"
              :plain="birthdayType !== 'lunar'"
              @click="birthdayType = 'lunar'"
            >
              农历
            </wd-tag>
          </view>

          <view v-if="birthdayType === 'solar'" class="birthday-picker">
            <picker mode="date" :value="birthday" @change="onBirthdayChange">
              <view class="picker-display">
                {{ birthday || '请选择日期' }}
              </view>
            </picker>
          </view>

          <view v-if="birthdayType === 'lunar'" class="birthday-picker lunar-row">
            <picker mode="selector" :range="monthOptions" @change="onLunarMonthChange">
              <view class="picker-display">
                {{ lunarMonth ? `${lunarMonth}月` : '月份' }}
              </view>
            </picker>
            <picker mode="selector" :range="dayOptions" @change="onLunarDayChange">
              <view class="picker-display">
                {{ lunarDay ? `${lunarDay}日` : '日期' }}
              </view>
            </picker>
          </view>
        </view>
      </wd-form-item>
    </wd-cell-group>

    <view class="save-section">
      <wd-button block type="primary" :loading="saving" :disabled="saving" @click="handleSave">
        保存
      </wd-button>
    </view>
  </view>
</template>

<style scoped>
.edit-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding: 32rpx;
  padding-bottom: 160rpx;
}

.tag-input {
  display: flex;
  flex-wrap: wrap;
}

.birthday-section {
  width: 100%;
}

.birthday-type {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.birthday-picker {
  margin-top: 12rpx;
}

.lunar-row {
  display: flex;
  gap: 16rpx;
}

.picker-display {
  height: 60rpx;
  line-height: 60rpx;
  font-size: 28rpx;
  color: #333;
}

.save-section {
  margin-top: 32rpx;
}
</style>
