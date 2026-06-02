<script setup lang="ts">
import { ref, computed } from 'vue'

const props = defineProps<{
  modelValue: string[]
  presetTags?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const presetTags = props.presetTags ?? ['工作', '朋友', '家人', '同事', '客户', 'VIP', '投资人', '前同事']
const customInput = ref('')
const MAX_TAGS = 10

const selectedSet = computed(() => new Set(props.modelValue))

function toggleTag(tag: string) {
  const tags = [...props.modelValue]
  const idx = tags.indexOf(tag)
  if (idx >= 0) {
    tags.splice(idx, 1)
  } else {
    if (tags.length >= MAX_TAGS) {
      uni.showToast({ title: `最多选择 ${MAX_TAGS} 个标签`, icon: 'none' })
      return
    }
    tags.push(tag)
  }
  emit('update:modelValue', tags)
}

function addCustomTag() {
  const tag = customInput.value.trim()
  if (!tag) return
  if (props.modelValue.includes(tag)) {
    uni.showToast({ title: '标签已存在', icon: 'none' })
    customInput.value = ''
    return
  }
  if (props.modelValue.length >= MAX_TAGS) {
    uni.showToast({ title: `最多选择 ${MAX_TAGS} 个标签`, icon: 'none' })
    return
  }
  emit('update:modelValue', [...props.modelValue, tag])
  customInput.value = ''
}

function handleInputConfirm() {
  addCustomTag()
}
</script>

<template>
  <view class="tag-input-component">
    <!-- 预设标签 -->
    <view class="preset-section">
      <view class="preset-tags">
        <view
          v-for="tag in presetTags"
          :key="tag"
          class="preset-tag"
          :class="{ active: selectedSet.has(tag) }"
          @click="toggleTag(tag)"
        >
          <text class="preset-tag-text">{{ tag }}</text>
        </view>
      </view>
    </view>

    <!-- 自定义输入 -->
    <view class="custom-section">
      <input
        class="custom-input"
        :value="customInput"
        placeholder="输入自定义标签"
        placeholder-class="input-placeholder"
        @input="(e: any) => customInput = e.detail?.value ?? ''"
        @confirm="handleInputConfirm"
      />
      <view
        class="custom-add-btn"
        :class="{ disabled: !customInput.trim() }"
        @click="addCustomTag"
      >
        <text class="add-icon">+</text>
      </view>
    </view>

    <!-- 标签计数 -->
    <view class="tag-count">
      已选 <text class="count-num">{{ modelValue.length }}</text> / {{ MAX_TAGS }}
    </view>
  </view>
</template>

<style scoped>
.tag-input-component {
  padding: 20rpx 24rpx;
}

/* ---- 预设标签 ---- */
.preset-section {
  padding-top: 0;
}

.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.preset-tag {
  display: inline-flex;
  align-items: center;
  padding: 14rpx 28rpx;
  background: #F8F9FA;
  border: 2rpx solid #EEE;
  border-radius: 9999rpx;
  transition: all 0.2s ease;
}

.preset-tag:active {
  transform: scale(0.95);
}

.preset-tag.active {
  background: #6C5CE7;
  border-color: #6C5CE7;
}

.preset-tag-text {
  font-size: 26rpx;
  color: #636E72;
  font-weight: 500;
}

.preset-tag.active .preset-tag-text {
  color: #FFFFFF;
}

/* ---- 自定义输入 ---- */
.custom-section {
  display: flex;
  align-items: center;
  gap: 16rpx;
  margin-top: 24rpx;
}

.custom-input {
  flex: 1;
  height: 72rpx;
  padding: 0 24rpx;
  border: 2rpx solid #EEE;
  border-radius: 9999rpx;
  background: #F8F9FA;
  font-size: 26rpx;
  color: #2D3436;
}

.input-placeholder {
  color: #B2BEC3;
}

.custom-add-btn {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 16rpx rgba(108, 92, 231, 0.15);
  flex-shrink: 0;
  transition: all 0.25s ease;
}

.custom-add-btn:active {
  transform: scale(0.9) rotate(90deg);
}

.custom-add-btn.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.add-icon {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 300;
  line-height: 1;
}

/* ---- 标签计数 ---- */
.tag-count {
  font-size: 20rpx;
  color: #B2BEC3;
  text-align: right;
  margin-top: 16rpx;
}

.count-num {
  color: #6C5CE7;
  font-weight: 600;
}
</style>
