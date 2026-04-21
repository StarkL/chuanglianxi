<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getContacts, type Contact } from '../../api/contacts.js'

const contacts = ref<Contact[]>([])
const loading = ref(false)
const searchKeyword = ref('')
const selectedTag = ref('')

const allTags = ref<string[]>(['工作', '朋友', '家人'])

async function loadContacts() {
  loading.value = true
  try {
    const params: Record<string, string> = {}
    if (searchKeyword.value) params.search = searchKeyword.value
    if (selectedTag.value) params.tag = selectedTag.value

    const res = await getContacts(params)
    if (res.success && res.data) {
      contacts.value = res.data
    }
  } catch {
    uni.showToast({ title: '加载失败', icon: 'none' })
  } finally {
    loading.value = false
  }
}

function handleSearch() {
  loadContacts()
}

function goDetail(id: string) {
  uni.navigateTo({ url: `/pages/contacts/detail/detail?id=${id}` })
}

function goCreate() {
  uni.navigateTo({ url: '/pages/contacts/edit/edit' })
}

function goImport() {
  uni.navigateTo({ url: '/pages/contacts/import-phone' })
}

onMounted(() => {
  loadContacts()
})
</script>

<template>
  <view class="contact-list-page">
    <wd-search-bar
      v-model="searchKeyword"
      placeholder="搜索姓名或公司"
      @search="handleSearch"
      @cancel="searchKeyword = ''; loadContacts()"
    />

    <view class="tag-filter">
      <wd-tag
        v-for="tag in allTags"
        :key="tag"
        size="small"
        :custom-style="{
          marginRight: '8px',
          ...(selectedTag === tag ? { backgroundColor: '#07c160', color: '#fff', borderColor: '#07c160' } : {})
        }"
        @click="selectedTag = selectedTag === tag ? '' : tag; loadContacts()"
      >
        {{ tag }}
      </wd-tag>
    </view>

    <view v-if="contacts.length > 0" class="list">
      <wd-cell-group>
        <wd-cell
          v-for="contact in contacts"
          :key="contact.id"
          :title="contact.name"
          :label="contact.company ? `${contact.company} · ${contact.title || ''}` : '暂无公司信息'"
          :center="true"
          is-link
          @click="goDetail(contact.id)"
        >
          <template #icon>
            <view class="avatar">
              <text v-if="contact.avatar" class="avatar-img">{{ contact.avatar }}</text>
              <text v-else class="avatar-text">{{ contact.name.charAt(0) }}</text>
            </view>
          </template>
          <template #value>
            <view v-if="contact.tags.length > 0" class="tags">
              <wd-tag
                v-for="tag in contact.tags"
                :key="tag"
                size="small"
                plain
                custom-class="contact-tag"
              >
                {{ tag }}
              </wd-tag>
            </view>
          </template>
        </wd-cell>
      </wd-cell-group>
    </view>

    <wd-empty
      v-else
      description="暂无联系人"
      image="search"
    />

    <!-- #ifdef MP-WEIXIN -->
    <view class="bottom-actions">
      <wd-button block plain custom-class="import-btn" @click="goImport">从通讯录导入</wd-button>
      <wd-button block type="primary" @click="goCreate">+ 添加联系人</wd-button>
    </view>
    <!-- #endif -->
  </view>
</template>

<style scoped>
.contact-list-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  padding-bottom: 160rpx;
}

.tag-filter {
  display: flex;
  padding: 16rpx 32rpx;
  flex-wrap: wrap;
}

.list {
  padding: 0 32rpx;
}

.avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background-color: #f6f6f6;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.avatar-text {
  font-size: 28rpx;
  font-weight: 600;
  color: #07c160;
}

.tags {
  display: flex;
  gap: 8rpx;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.bottom-actions {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 16rpx 32rpx;
  background-color: #fff;
  border-top: 1rpx solid #eee;
}
</style>
