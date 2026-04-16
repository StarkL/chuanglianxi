<script setup lang="ts">
import { ref } from 'vue'

const props = defineProps<{
  modelValue: string[]
  presetTags?: string[]
}>()

const emit = defineEmits<{
  (e: 'update:modelValue', value: string[]): void
}>()

const presetTags = props.presetTags ?? ['工作', '朋友', '家人', '同事', '客户']
const customInput = ref('')

function toggleTag(tag: string) {
  const tags = [...props.modelValue]
  const idx = tags.indexOf(tag)
  if (idx >= 0) {
    tags.splice(idx, 1)
  } else {
    tags.push(tag)
  }
  emit('update:modelValue', tags)
}

function addCustomTag() {
  const tag = customInput.value.trim()
  if (!tag || props.modelValue.includes(tag)) {
    customInput.value = ''
    return
  }
  emit('update:modelValue', [...props.modelValue, tag])
  customInput.value = ''
}
</script>

<template>
  <view class="tag-input">
    <!-- Selected tags -->
    <view v-if="modelValue.length > 0" class="section">
      <text class="section-label">已选标签</text>
      <view class="selected-tags">
        <view
          v-for="tag in modelValue"
          :key="tag"
          class="selected-tag"
        >
          <text class="tag-text">{{ tag }}</text>
          <text class="tag-remove" @click="toggleTag(tag)">×</text>
        </view>
      </view>
    </view>

    <!-- Preset tags -->
    <view class="section">
      <text class="section-label">预设标签</text>
      <view class="preset-tags">
        <view
          v-for="tag in presetTags"
          :key="tag"
          :class="['preset-tag', modelValue.includes(tag) ? 'selected' : '']"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </view>
      </view>
    </view>

    <!-- Custom tag input -->
    <view class="section">
      <text class="section-label">自定义标签</text>
      <view class="custom-input-row">
        <input
          class="custom-input"
          v-model="customInput"
          placeholder="输入自定义标签"
          @confirm="addCustomTag"
        />
        <view class="add-btn" @click="addCustomTag">+</view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.tag-input {
  background-color: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
}

.section {
  margin-bottom: 32rpx;
}

.section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
  display: block;
  margin-bottom: 16rpx;
}

.selected-tags,
.preset-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.selected-tag {
  display: flex;
  align-items: center;
  padding: 8rpx 24rpx;
  background-color: #e8f8ef;
  border-radius: 32rpx;
}

.tag-text {
  font-size: 24rpx;
  color: #07c160;
}

.tag-remove {
  margin-left: 8rpx;
  font-size: 28rpx;
  color: #07c160;
  line-height: 1;
}

.preset-tag {
  padding: 8rpx 24rpx;
  background-color: #f6f6f6;
  border-radius: 32rpx;
  font-size: 24rpx;
  color: #666;
}

.preset-tag.selected {
  background-color: #07c160;
  color: #fff;
}

.custom-input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}

.custom-input {
  flex: 1;
  height: 60rpx;
  background-color: #f6f6f6;
  border-radius: 12rpx;
  padding: 0 24rpx;
  font-size: 24rpx;
}

.add-btn {
  width: 60rpx;
  height: 60rpx;
  background-color: #07c160;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #fff;
  font-size: 32rpx;
  font-weight: 600;
  flex-shrink: 0;
}
</style>
