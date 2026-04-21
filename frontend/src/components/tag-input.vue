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
  <view class="tag-input-component">
    <!-- Selected tags -->
    <view v-if="modelValue.length > 0" class="section">
      <text class="section-label">已选标签</text>
      <view class="tags-row">
        <wd-tag
          v-for="tag in modelValue"
          :key="tag"
          size="small"
          closable
          :custom-style="{ marginRight: '8px', marginBottom: '8px' }"
          @close="toggleTag(tag)"
        >
          {{ tag }}
        </wd-tag>
      </view>
    </view>

    <!-- Preset tags -->
    <view class="section">
      <text class="section-label">预设标签</text>
      <view class="tags-row">
        <wd-tag
          v-for="tag in presetTags"
          :key="tag"
          size="small"
          :plain="!modelValue.includes(tag)"
          :custom-style="{
            marginRight: '8px',
            marginBottom: '8px',
            ...(modelValue.includes(tag) ? { backgroundColor: '#07c160', color: '#fff', borderColor: '#07c160' } : {})
          }"
          @click="toggleTag(tag)"
        >
          {{ tag }}
        </wd-tag>
      </view>
    </view>

    <!-- Custom tag input -->
    <view class="section">
      <text class="section-label">自定义标签</text>
      <view class="custom-input-row">
        <wd-input v-model="customInput" placeholder="输入自定义标签" size="small" :clearable="true" @confirm="addCustomTag" />
        <wd-icon name="add" size="24px" @click="addCustomTag" />
      </view>
    </view>
  </view>
</template>

<style scoped>
.tag-input-component {
  padding: 8rpx 0;
}

.section {
  margin-bottom: 24rpx;
}

.section:last-child {
  margin-bottom: 0;
}

.section-label {
  font-size: 24rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
}

.custom-input-row {
  display: flex;
  align-items: center;
  gap: 16rpx;
}
</style>
