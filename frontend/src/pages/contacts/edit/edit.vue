<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact, updateContact, getContact } from '../../../api/contacts'
import TagInput from '../../../components/tag-input.vue'

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

  if (phone.value.trim() && !/^1[3-9]\d{9}$/.test(phone.value.trim())) {
    uni.showToast({ title: '手机号格式不正确', icon: 'none' })
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
    <wd-form ref="formRef">
      <wd-form-item label="姓名" prop="name" required>
        <wd-input v-model="name" placeholder="请输入姓名" />
      </wd-form-item>

      <wd-form-item label="公司" prop="company">
        <wd-input v-model="company" placeholder="请输入公司名称" />
      </wd-form-item>

      <wd-form-item label="职位" prop="title">
        <wd-input v-model="title" placeholder="请输入职位" />
      </wd-form-item>

      <wd-form-item label="电话" prop="phone">
        <wd-input v-model="phone" placeholder="请输入电话号码" type="number" />
      </wd-form-item>

      <wd-form-item label="邮箱" prop="email">
        <wd-input v-model="email" placeholder="请输入邮箱" type="email" />
      </wd-form-item>

      <wd-form-item label="微信号" prop="wechatId">
        <wd-input v-model="wechatId" placeholder="请输入微信号" />
      </wd-form-item>

      <wd-form-item label="标签" prop="tags">
        <tag-input v-model="selectedTags" />
      </wd-form-item>

      <wd-form-item label="生日" prop="birthday">
        <view class="birthday-section">
          <view class="birthday-type">
            <wd-button
              size="small"
              :type="birthdayType === 'solar' ? 'primary' : 'default'"
              @click="birthdayType = 'solar'"
            >公历</wd-button>
            <wd-button
              size="small"
              :type="birthdayType === 'lunar' ? 'primary' : 'default'"
              @click="birthdayType = 'lunar'"
            >农历</wd-button>
          </view>

          <view v-if="birthdayType === 'solar'" class="birthday-solar">
            <picker mode="date" :value="birthday" @change="onBirthdayChange">
              <view class="input picker-input">
                {{ birthday || '请选择日期' }}
              </view>
            </picker>
          </view>

          <view v-if="birthdayType === 'lunar'" class="birthday-lunar">
            <view class="lunar-row">
              <picker mode="selector" :range="monthOptions" @change="onLunarMonthChange">
                <view class="input picker-input">
                  {{ lunarMonth ? `${lunarMonth}月` : '月份' }}
                </view>
              </picker>
              <picker mode="selector" :range="dayOptions" @change="onLunarDayChange">
                <view class="input picker-input">
                  {{ lunarDay ? `${lunarDay}日` : '日期' }}
                </view>
              </picker>
            </view>
          </view>
        </view>
      </wd-form-item>
    </wd-form>

    <wd-button type="primary" block :loading="saving" @click="handleSave">保存</wd-button>
  </view>
</template>

<style scoped>
.edit-page {
  min-height: 100vh;
  background-color: #f6f5f4;
  padding: 24rpx;
  padding-bottom: 160rpx;
}

.birthday-section {
  width: 100%;
}

.birthday-type {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}

.birthday-solar {
  margin-top: 12rpx;
}

.birthday-lunar {
  margin-top: 12rpx;
}

.lunar-row {
  display: flex;
  gap: 16rpx;
}

.input {
  height: 80rpx;
  background-color: #f6f5f4;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
}

.picker-input {
  width: 100%;
}
</style>
