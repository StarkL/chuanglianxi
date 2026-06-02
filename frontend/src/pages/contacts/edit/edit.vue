<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { createContact, updateContact, getContact } from '../../../api/contacts'
import TagInput from '../../../components/tag-input.vue'
import { emitDataChanged } from '../../../utils/events'

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
    selectedTags.value = selectedTags.value.filter((_, i) => i !== idx)
  } else {
    selectedTags.value = [...selectedTags.value, tag]
  }
}

const monthOptions = Array.from({ length: 12 }, (_, i) => `${i + 1}月`)
const dayOptions = Array.from({ length: 30 }, (_, i) => `${i + 1}日`)

interface PickerEvent {
  detail: { value: number | string }
}

function onBirthdayChange(e: PickerEvent) {
  birthday.value = e.detail.value as string
}

function onLunarMonthChange(e: PickerEvent) {
  const idx = e.detail.value as number
  lunarMonth.value = idx + 1
}

function onLunarDayChange(e: PickerEvent) {
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
      emitDataChanged('contacts', 'update', contactId.value)
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      const res = await createContact(data)
      if (res.success && res.data) {
        contactId.value = res.data.id
        emitDataChanged('contacts', 'create', res.data.id)
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
    <!-- 基本信息分组 -->
    <view class="form-group">
      <text class="group-title">基本信息</text>
      <view class="form-card">
        <view class="form-item">
          <text class="form-label required">姓名</text>
          <input
            class="form-input"
            v-model="name"
            placeholder="请输入姓名"
            placeholder-class="input-placeholder"
          />
        </view>
        <view class="divider" />
        <view class="form-item">
          <text class="form-label">公司</text>
          <input
            class="form-input"
            v-model="company"
            placeholder="请输入公司名称"
            placeholder-class="input-placeholder"
          />
        </view>
        <view class="divider" />
        <view class="form-item">
          <text class="form-label">职位</text>
          <input
            class="form-input"
            v-model="title"
            placeholder="请输入职位"
            placeholder-class="input-placeholder"
          />
        </view>
      </view>
    </view>

    <!-- 联系方式分组 -->
    <view class="form-group">
      <text class="group-title">联系方式</text>
      <view class="form-card">
        <view class="form-item">
          <text class="form-label">电话</text>
          <input
            class="form-input"
            v-model="phone"
            placeholder="请输入电话号码"
            type="number"
            placeholder-class="input-placeholder"
          />
        </view>
        <view class="divider" />
        <view class="form-item">
          <text class="form-label">邮箱</text>
          <input
            class="form-input"
            v-model="email"
            placeholder="请输入邮箱"
            type="email"
            placeholder-class="input-placeholder"
          />
        </view>
        <view class="divider" />
        <view class="form-item">
          <text class="form-label">微信号</text>
          <input
            class="form-input"
            v-model="wechatId"
            placeholder="请输入微信号"
            placeholder-class="input-placeholder"
          />
        </view>
      </view>
    </view>

    <!-- 标签分组 -->
    <view class="form-group">
      <text class="group-title">标签</text>
      <view class="form-card">
        <tag-input v-model="selectedTags" />
      </view>
    </view>

    <!-- 生日分组 -->
    <view class="form-group">
      <text class="group-title">生日</text>
      <view class="form-card birthday-card">
        <!-- 公历/农历切换 -->
        <view class="birthday-type-switch">
          <view
            class="type-btn"
            :class="{ active: birthdayType === 'solar' }"
            @click="birthdayType = 'solar'"
          >
            <text class="type-btn-text" :class="{ active: birthdayType === 'solar' }">公历</text>
          </view>
          <view
            class="type-btn"
            :class="{ active: birthdayType === 'lunar' }"
            @click="birthdayType = 'lunar'"
          >
            <text class="type-btn-text" :class="{ active: birthdayType === 'lunar' }">农历</text>
          </view>
        </view>

        <!-- 公历选择 -->
        <view v-if="birthdayType === 'solar'" class="birthday-picker">
          <picker mode="date" :value="birthday" @change="onBirthdayChange">
            <view class="picker-display">
              <text class="picker-icon">📅</text>
              <text :class="{ 'picker-text': !!birthday, 'picker-placeholder': !birthday }">
                {{ birthday || '请选择日期' }}
              </text>
            </view>
          </picker>
        </view>

        <!-- 农历选择 -->
        <view v-if="birthdayType === 'lunar'" class="birthday-lunar">
          <view class="lunar-row">
            <picker mode="selector" :range="monthOptions" @change="onLunarMonthChange">
              <view class="picker-display lunar-picker">
                <text :class="{ 'picker-text': lunarMonth, 'picker-placeholder': !lunarMonth }">
                  {{ lunarMonth ? `${lunarMonth}月` : '月份' }}
                </text>
              </view>
            </picker>
            <picker mode="selector" :range="dayOptions" @change="onLunarDayChange">
              <view class="picker-display lunar-picker">
                <text :class="{ 'picker-text': lunarDay, 'picker-placeholder': !lunarDay }">
                  {{ lunarDay ? `${lunarDay}日` : '日期' }}
                </text>
              </view>
            </picker>
          </view>
        </view>
      </view>
    </view>

    <!-- 保存按钮 -->
    <view class="save-btn-wrap">
      <view class="save-btn" :class="{ saving }" @click="handleSave">
        <text class="save-btn-text">{{ contactId ? '保存修改' : '创建联系人' }}</text>
      </view>
    </view>
  </view>
</template>

<style scoped>
.edit-page {
  min-height: 100vh;
  background-color: #F8F9FA;
  padding: 24rpx 32rpx;
  padding-bottom: 160rpx;
}

/* ---- 表单分组 ---- */
.form-group {
  margin-bottom: 32rpx;
}

.group-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
  display: block;
  margin-bottom: 16rpx;
  padding-left: 8rpx;
}

.form-card {
  background: #FFFFFF;
  border-radius: 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  overflow: hidden;
}

/* ---- 表单项 ---- */
.form-item {
  display: flex;
  align-items: center;
  padding: 24rpx 32rpx;
  min-height: 96rpx;
}

.form-label {
  font-size: 28rpx;
  color: #2D3436;
  width: 120rpx;
  flex-shrink: 0;
}

.form-label.required::before {
  content: '*';
  color: #E17055;
  margin-right: 4rpx;
}

.form-input {
  flex: 1;
  font-size: 28rpx;
  color: #2D3436;
  background: transparent;
  border: none;
  outline: none;
}

.input-placeholder {
  color: #B2BEC3;
}

.divider {
  height: 1rpx;
  background: #F0F0F0;
  margin: 0 32rpx;
}

/* ---- 标签输入 ---- */
.form-card :deep(.tag-input-wrap) {
  padding: 24rpx 32rpx;
}

/* ---- 生日分组 ---- */
.birthday-card {
  padding: 24rpx 32rpx;
}

.birthday-type-switch {
  display: flex;
  gap: 16rpx;
  margin-bottom: 24rpx;
}

.type-btn {
  padding: 12rpx 32rpx;
  border-radius: 9999rpx;
  background: #F8F9FA;
  border: 2rpx solid #EEE;
  transition: all 0.3s ease;
}

.type-btn.active {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  border-color: #6C5CE7;
}

.type-btn-text {
  font-size: 26rpx;
  color: #636E72;
}

.type-btn-text.active {
  color: #FFFFFF;
  font-weight: 600;
}

.birthday-picker {
  margin-top: 8rpx;
}

.picker-display {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 20rpx 24rpx;
  background: #F8F9FA;
  border-radius: 16rpx;
  min-height: 80rpx;
}

.picker-icon {
  font-size: 32rpx;
}

.picker-text {
  font-size: 28rpx;
  color: #2D3436;
}

.picker-placeholder {
  font-size: 28rpx;
  color: #B2BEC3;
}

.birthday-lunar {
  margin-top: 8rpx;
}

.lunar-row {
  display: flex;
  gap: 16rpx;
}

.lunar-picker {
  flex: 1;
}

/* ---- 保存按钮 ---- */
.save-btn-wrap {
  padding: 16rpx 0 32rpx;
}

.save-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 9999rpx;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(108, 92, 231, 0.3);
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.save-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.2);
}

.save-btn.saving {
  opacity: 0.7;
  pointer-events: none;
}

.save-btn-text {
  font-size: 32rpx;
  color: #FFFFFF;
  font-weight: 600;
  letter-spacing: 2rpx;
}
</style>
