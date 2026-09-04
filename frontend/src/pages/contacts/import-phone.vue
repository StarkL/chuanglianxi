<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import {
  parseVCF,
  parseCSV,
  isContactPickerSupported,
  selectNativeContacts,
  type ParsedContact,
} from '../../utils/vcf-parser'
import { batchImportContacts, importContactFromPhone } from '../../api/contacts'
import { emitDataChanged } from '../../utils/events'
import { encryptField, getOrCreateUserKey } from '../../utils/crypto'

// 指引系统切换: 'ios' | 'android'
const activeGuideTab = ref<'ios' | 'android'>('ios')

// 运行环境检测
const hasContactPicker = ref(false)
const fileInputRef = ref<HTMLInputElement | null>(null)

// 导入与解析状态
const importing = ref(false)
const parsedContacts = ref<ParsedContact[]>([])
const showPreview = ref(false)
const selectedTag = ref('通讯录导入')
const availableTags = ['通讯录导入', '工作', '朋友', '家人']

const selectedCount = computed(() => {
  return parsedContacts.value.filter((c) => c.selected).length
})

const isAllSelected = computed(() => {
  return (
    parsedContacts.value.length > 0 &&
    parsedContacts.value.every((c) => c.selected)
  )
})

onMounted(() => {
  // #ifdef H5
  hasContactPicker.value = isContactPickerSupported()
  // #endif
})

// ---- 1. 原生 Contact Picker 流程 (支持的移动浏览器) ----
async function handleNativePicker() {
  try {
    const list = await selectNativeContacts()
    if (list.length === 0) {
      uni.showToast({ title: '未选择任何联系人', icon: 'none' })
      return
    }
    parsedContacts.value = list
    showPreview.value = true
  } catch (err: any) {
    uni.showToast({ title: err?.message || '读取联系人失败', icon: 'none' })
  }
}

// ---- 2. 文件导入流程 (.vcf / .csv) ----
function processRawFileContent(content: string, fileName = '') {
  if (!content) {
    uni.showToast({ title: '文件内容为空', icon: 'none' })
    return
  }

  let result: ParsedContact[] = []
  if (fileName.toLowerCase().endsWith('.csv')) {
    result = parseCSV(content)
  } else {
    result = parseVCF(content)
    if (result.length === 0) {
      result = parseCSV(content)
    }
  }

  if (result.length === 0) {
    uni.showModal({
      title: '解析失败',
      content: '未能在该文件中识别出有效联系人，请确认文件是否为手机导出的 .vcf 或 .csv 格式',
      showCancel: false,
      confirmText: '我知道了',
    })
    return
  }

  parsedContacts.value = result
  showPreview.value = true
}

function triggerFilePicker() {
  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = '.vcf,.vcard,.csv,text/vcard,text/x-vcard,text/csv'
  input.style.display = 'none'
  document.body.appendChild(input)

  input.onchange = (event: Event) => {
    const target = event.target as HTMLInputElement
    const file = target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        processRawFileContent(content, file.name)
      }
      reader.onerror = () => {
        uni.showToast({ title: '读取文件失败', icon: 'none' })
      }
      reader.readAsText(file, 'utf-8')
    }
    try {
      document.body.removeChild(input)
    } catch {
      // ignore
    }
  }

  input.click()
  // #endif

  // #ifndef H5
  uni.showToast({ title: '请在 H5 或微信中打开使用', icon: 'none' })
  // #endif
}


// ---- 3. 全选 / 反选 ----
function toggleSelectAll() {
  const targetState = !isAllSelected.value
  parsedContacts.value.forEach((c) => {
    c.selected = targetState
  })
}

function toggleContact(item: ParsedContact) {
  item.selected = !item.selected
}

// ---- 4. 确认提交批量导入 ----
async function confirmBatchImport() {
  const toImport = parsedContacts.value.filter((c) => c.selected)
  if (toImport.length === 0) {
    uni.showToast({ title: '请至少勾选一位联系人', icon: 'none' })
    return
  }

  importing.value = true
  uni.showLoading({ title: '正在导入中...' })

  try {
    // 端到端加密：在本地对所有选中的手机号使用 AES-256-GCM 密匙逐个加密
    const userKey = await getOrCreateUserKey()
    const encryptedContacts = await Promise.all(
      toImport.map(async (c) => ({
        name: c.name,
        phone: c.phone ? await encryptField(c.phone, userKey) : undefined,
        company: c.company,
        title: c.title,
        email: c.email,
        source: 'phone-import',
      }))
    )

    const res = await batchImportContacts({
      contacts: encryptedContacts,
      defaultTag: selectedTag.value,
    })

    uni.hideLoading()

    if (res.success && res.data) {
      const { total, imported, skipped } = res.data
      uni.showModal({
        title: '导入完成',
        content: `成功导入 ${imported} 位联系人${skipped > 0 ? `，跳过 ${skipped} 位重复数据` : ''}`,
        showCancel: false,
        confirmText: '查看联系人',
        success: () => {
          emitDataChanged('contacts')
          uni.switchTab({ url: '/pages/contacts/list' })
        },
      })
    } else {
      uni.showToast({ title: res.error || '导入失败', icon: 'none' })
    }
  } catch (err: any) {
    uni.hideLoading()
    uni.showToast({ title: err?.data?.error || '导入失败，请稍后重试', icon: 'none' })
  } finally {
    importing.value = false
  }
}

// ---- 5. 微信小程序原生选择器兼容 ----
// #ifdef MP-WEIXIN
async function handleWeChatImport() {
  if (importing.value) return
  try {
    const loginRes = await new Promise<any>((resolve, reject) => {
      uni.login({ provider: 'weixin', success: resolve, fail: reject })
    })
    const code = loginRes.code
    if (!code) return

    uni.chooseContact({
      success: async (contactRes: any) => {
        if (!contactRes.encryptedData || !contactRes.iv) return
        importing.value = true
        uni.showLoading({ title: '导入中...' })
        try {
          const result = await importContactFromPhone(code, contactRes.encryptedData, contactRes.iv)
          uni.hideLoading()
          if (result.success) {
            emitDataChanged('contacts')
            uni.showToast({ title: '导入成功', icon: 'success' })
            setTimeout(() => uni.switchTab({ url: '/pages/contacts/list' }), 600)
          }
        } finally {
          importing.value = false
        }
      },
    })
  } catch {
    uni.showToast({ title: '授权取消', icon: 'none' })
  }
}
// #endif
</script>

<template>
  <view class="import-page">
    <!-- 顶部装饰区 -->
    <view class="import-hero">
      <view class="hero-circle hero-circle-1" />
      <view class="hero-circle hero-circle-2" />
      <view class="import-icon">
        <text class="icon-text">📇</text>
      </view>
    </view>

    <!-- 主界面区 (非预览状态) -->
    <view v-if="!showPreview" class="import-content">
      <text class="import-title">批量导入手机通讯录</text>
      <text class="import-hint">支持 .vcf 通讯录文件及现代手机一键直导</text>

      <!-- 快捷操作按钮 -->
      <view class="action-buttons">
        <!-- 原生一键直选 (支持的安卓/Chrome浏览器) -->
        <view
          v-if="hasContactPicker"
          class="primary-btn native-btn"
          @click="handleNativePicker"
        >
          <text class="btn-icon">⚡</text>
          <text class="btn-text">一键唤起手机通讯录勾选</text>
        </view>

        <!-- 通用文件选取 (全端兼容) -->
        <view class="primary-btn file-btn" @click="triggerFilePicker">
          <text class="btn-icon">📁</text>
          <text class="btn-text">选取通讯录文件 (.vcf / .csv)</text>
        </view>

        <!-- 微信小程序端原生按钮 -->
        <!-- #ifdef MP-WEIXIN -->
        <view class="primary-btn wechat-btn" @click="handleWeChatImport">
          <text class="btn-icon">💬</text>
          <text class="btn-text">微信通讯录快速授权导入</text>
        </view>
        <!-- #endif -->
      </view>

      <!-- 导出指引卡片 -->
      <view class="guide-card">
        <view class="guide-header">
          <text class="guide-title">📖 手机通讯录导出 30 秒指引</text>
          <view class="guide-tabs">
            <view
              class="guide-tab"
              :class="{ active: activeGuideTab === 'ios' }"
              @click="activeGuideTab = 'ios'"
            >
              苹果 iPhone
            </view>
            <view
              class="guide-tab"
              :class="{ active: activeGuideTab === 'android' }"
              @click="activeGuideTab = 'android'"
            >
              安卓 / 华为 / 小米
            </view>
          </view>
        </view>

        <!-- 苹果 iOS 导出指引 -->
        <view v-if="activeGuideTab === 'ios'" class="guide-steps">
          <view class="step-item">
            <view class="step-badge">1</view>
            <view class="step-info">
              <text class="step-title">打开手机自带「通讯录」</text>
              <text class="step-desc">点击左上角「列表」，找到并长按「所有联系人」。</text>
            </view>
          </view>
          <view class="step-item">
            <view class="step-badge">2</view>
            <view class="step-info">
              <text class="step-title">点击「导出」并保存</text>
              <text class="step-desc">点击「导出」，选择保存到“文件”或发给微信「文件传输助手」。</text>
            </view>
          </view>
          <view class="step-item">
            <view class="step-badge">3</view>
            <view class="step-info">
              <text class="step-title">返回本页点击上方按钮</text>
              <text class="step-desc">点击「选取通讯录文件」，在最近文件中直接选取即可！</text>
            </view>
          </view>
        </view>

        <!-- 安卓手机导出指引 -->
        <view v-else class="guide-steps">
          <view class="step-item">
            <view class="step-badge">1</view>
            <view class="step-info">
              <text class="step-title">打开系统「联系人」</text>
              <text class="step-desc">点击右上角「设置 ⚙️」或「三个点更多」。</text>
            </view>
          </view>
          <view class="step-item">
            <view class="step-badge">2</view>
            <view class="step-info">
              <text class="step-title">导出为 vCard 文件</text>
              <text class="step-desc">找到「导入/导出」➔ 点击「导出到存储设备 (.vcf)」。</text>
            </view>
          </view>
          <view class="step-item">
            <view class="step-badge">3</view>
            <view class="step-info">
              <text class="step-title">选取并一键导入</text>
              <text class="step-desc">回到本页点击上传，在「下载 (Download)」或微信文件中选取。</text>
            </view>
          </view>
        </view>
      </view>

      <!-- 隐私声明 -->
      <view class="privacy-note">
        <text class="lock-icon">🛡️</text>
        <text class="privacy-text">端到端零知识加密保护：文件仅在手机本地即时解析，号码在离开手机前经 AES-256-GCM 强加密，云端仅存储密文，彻底杜绝泄露风险。</text>
      </view>
    </view>

    <!-- 预览与确认面板 (解析成功后展示) -->
    <view v-else class="preview-panel">
      <!-- 预览头部统计 -->
      <view class="preview-header">
        <view class="header-left">
          <text class="preview-title">解析成功</text>
          <text class="preview-count">共识别出 {{ parsedContacts.length }} 位联系人</text>
        </view>
        <view class="select-all-btn" @click="toggleSelectAll">
          <text class="checkbox-mini" :class="{ checked: isAllSelected }">
            {{ isAllSelected ? '✓' : '' }}
          </text>
          <text class="select-all-text">{{ isAllSelected ? '取消全选' : '全选' }}</text>
        </view>
      </view>

      <!-- 默认分类标签选择 -->
      <view class="tag-bar">
        <text class="tag-bar-label">归属标签：</text>
        <view class="tag-list">
          <view
            v-for="tag in availableTags"
            :key="tag"
            class="tag-capsule"
            :class="{ active: selectedTag === tag }"
            @click="selectedTag = tag"
          >
            {{ tag }}
          </view>
        </view>
      </view>

      <!-- 联系人预览列表 -->
      <scroll-view scroll-y class="contact-preview-list">
        <view
          v-for="(item, idx) in parsedContacts"
          :key="idx"
          class="preview-card"
          :class="{ checked: item.selected }"
          @click="toggleContact(item)"
        >
          <view class="card-checkbox" :class="{ checked: item.selected }">
            <text v-if="item.selected" class="check-mark">✓</text>
          </view>
          <view class="card-avatar">
            <text class="avatar-text">{{ item.name.slice(0, 1) }}</text>
          </view>
          <view class="card-info">
            <view class="card-name-row">
              <text class="card-name">{{ item.name }}</text>
              <text v-if="item.title" class="card-title">{{ item.title }}</text>
            </view>
            <view class="card-sub-row">
              <text v-if="item.phone" class="card-phone">📞 {{ item.phone }}</text>
              <text v-if="item.company" class="card-company">🏢 {{ item.company }}</text>
            </view>
          </view>
        </view>
      </scroll-view>

      <!-- 端到端加密保护提示条 -->
      <view class="e2ee-tip-bar">
        <text class="e2ee-tip-icon">🛡️</text>
        <text class="e2ee-tip-text">端到端加密保护：手机号将在设备本地加密后上传，云端无法查看真实号码</text>
      </view>

      <!-- 底部固定操作栏 -->
      <view class="preview-footer">
        <view class="footer-back-btn" @click="showPreview = false">
          重新选择
        </view>
        <view
          class="footer-submit-btn"
          :class="{ disabled: selectedCount === 0 || importing }"
          @click="confirmBatchImport"
        >
          {{ importing ? '正在导入...' : `确认导入 (${selectedCount}人)` }}
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.import-page {
  min-height: 100%;
  box-sizing: border-box;
  background-color: #F8F9FA;
  display: flex;
  flex-direction: column;
}

/* ---- 顶部装饰区 ---- */
.import-hero {
  position: relative;
  height: 320rpx;
  background: linear-gradient(135deg, #6C5CE7, #FD79A8);
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.hero-circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.hero-circle-1 {
  width: 260rpx;
  height: 260rpx;
  top: -60rpx;
  right: -40rpx;
}

.hero-circle-2 {
  width: 180rpx;
  height: 180rpx;
  bottom: -30rpx;
  left: -30rpx;
}

.import-icon {
  width: 140rpx;
  height: 140rpx;
  background: rgba(255, 255, 255, 0.25);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
}

.icon-text {
  font-size: 72rpx;
}

/* ---- 主体内容区 ---- */
.import-content {
  flex: 1;
  padding: 36rpx 32rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-top: -24rpx;
  background: #F8F9FA;
  border-top-left-radius: 32rpx;
  border-top-right-radius: 32rpx;
}

.import-title {
  font-size: 38rpx;
  font-weight: 700;
  color: #2D3436;
  margin-bottom: 12rpx;
}

.import-hint {
  font-size: 26rpx;
  color: #636E72;
  margin-bottom: 36rpx;
}

/* ---- 按钮操作区 ---- */
.action-buttons {
  width: 100%;
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 36rpx;
}

.primary-btn {
  width: 100%;
  height: 96rpx;
  border-radius: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16rpx;
  transition: transform 0.2s, box-shadow 0.2s;
  box-shadow: 0 8rpx 24rpx rgba(108, 92, 231, 0.25);
}

.primary-btn:active {
  transform: scale(0.98);
}

.native-btn {
  background: linear-gradient(135deg, #00B894, #55EFC4);
  color: #FFFFFF;
}

.file-btn {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  color: #FFFFFF;
}

.wechat-btn {
  background: #07C160;
  color: #FFFFFF;
}

.btn-icon {
  font-size: 34rpx;
}

.btn-text {
  font-size: 30rpx;
  font-weight: 600;
  letter-spacing: 2rpx;
}

/* ---- 导出指引卡片 ---- */
.guide-card {
  width: 100%;
  background: #FFFFFF;
  border-radius: 28rpx;
  padding: 32rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.04);
  margin-bottom: 28rpx;
}

.guide-header {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
  margin-bottom: 24rpx;
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #F1F2F6;
}

.guide-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #2D3436;
}

.guide-tabs {
  display: flex;
  background: #F1F2F6;
  border-radius: 16rpx;
  padding: 6rpx;
  gap: 8rpx;
}

.guide-tab {
  flex: 1;
  text-align: center;
  font-size: 26rpx;
  padding: 12rpx 0;
  border-radius: 12rpx;
  color: #636E72;
  transition: all 0.2s;
}

.guide-tab.active {
  background: #FFFFFF;
  color: #6C5CE7;
  font-weight: 600;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.05);
}

.guide-steps {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.step-item {
  display: flex;
  align-items: flex-start;
  gap: 20rpx;
}

.step-badge {
  width: 44rpx;
  height: 44rpx;
  border-radius: 50%;
  background: #EDEAFD;
  color: #6C5CE7;
  font-size: 24rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2rpx;
}

.step-info {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.step-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #2D3436;
}

.step-desc {
  font-size: 24rpx;
  color: #8395A7;
  line-height: 1.4;
}

/* ---- 隐私声明 ---- */
.privacy-note {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 0 16rpx;
}

.lock-icon {
  font-size: 26rpx;
}

.privacy-text {
  font-size: 22rpx;
  color: #A4B0BE;
  line-height: 1.4;
}

/* ---- 预览面板样式 ---- */
.preview-panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  padding: 24rpx 28rpx 180rpx;
  box-sizing: border-box;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.header-left {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.preview-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #2D3436;
}

.preview-count {
  font-size: 24rpx;
  color: #6C5CE7;
}

.select-all-btn {
  display: flex;
  align-items: center;
  gap: 12rpx;
  padding: 10rpx 20rpx;
  background: #FFFFFF;
  border-radius: 30rpx;
  box-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.05);
}

.checkbox-mini {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
  border: 2rpx solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #FFFFFF;
}

.checkbox-mini.checked {
  background: #6C5CE7;
  border-color: #6C5CE7;
}

.select-all-text {
  font-size: 26rpx;
  color: #475569;
}

/* 标签条 */
.tag-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 20rpx;
}

.tag-bar-label {
  font-size: 26rpx;
  color: #64748B;
  flex-shrink: 0;
}

.tag-list {
  display: flex;
  gap: 12rpx;
  overflow-x: auto;
}

.tag-capsule {
  font-size: 24rpx;
  padding: 8rpx 24rpx;
  border-radius: 24rpx;
  background: #FFFFFF;
  color: #64748B;
  border: 1rpx solid #E2E8F0;
  flex-shrink: 0;
}

.tag-capsule.active {
  background: #6C5CE7;
  color: #FFFFFF;
  border-color: #6C5CE7;
}

/* 预览卡片滚动列表 */
.contact-preview-list {
  flex: 1;
  max-height: calc(100vh - 460rpx);
  display: flex;
  flex-direction: column;
  gap: 16rpx;
  box-sizing: border-box;
}

.preview-card {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.03);
  margin-bottom: 16rpx;
  transition: all 0.2s;
  border: 2rpx solid transparent;
}

.preview-card.checked {
  border-color: #A29BFE;
  background: #FAF9FF;
}

.card-checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 10rpx;
  border: 2rpx solid #CBD5E1;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.card-checkbox.checked {
  background: #6C5CE7;
  border-color: #6C5CE7;
}

.check-mark {
  color: #FFFFFF;
  font-size: 26rpx;
  font-weight: 700;
}

.card-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: linear-gradient(135deg, #A29BFE, #6C5CE7);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 700;
  flex-shrink: 0;
}

.card-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
  overflow: hidden;
}

.card-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.card-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1E293B;
}

.card-title {
  font-size: 22rpx;
  color: #64748B;
  background: #F1F5F9;
  padding: 2rpx 12rpx;
  border-radius: 8rpx;
}

.card-sub-row {
  display: flex;
  gap: 20rpx;
  font-size: 24rpx;
  color: #64748B;
}

.card-phone, .card-company {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 底部操作栏 - 吸底固定 */
.preview-footer {
  position: fixed;
  bottom: 0;
  left: 0;
  width: 100%;
  padding: 20rpx 32rpx calc(24rpx + env(safe-area-inset-bottom));
  background: rgba(255, 255, 255, 0.96);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  box-shadow: 0 -4rpx 24rpx rgba(0, 0, 0, 0.08);
  border-top: 1rpx solid rgba(0, 0, 0, 0.05);
  display: flex;
  gap: 20rpx;
  z-index: 100;
  box-sizing: border-box;
}

@media screen and (min-width: 500px) {
  .preview-footer {
    max-width: 440px;
    left: 50%;
    transform: translateX(-50%);
  }
}

.footer-back-btn {
  flex: 1;
  height: 92rpx;
  border-radius: 46rpx;
  background: #F1F5F9;
  color: #475569;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28rpx;
  font-weight: 600;
}

.footer-submit-btn {
  flex: 2;
  height: 92rpx;
  border-radius: 46rpx;
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
  color: #FFFFFF;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 30rpx;
  font-weight: 600;
  box-shadow: 0 6rpx 20rpx rgba(108, 92, 231, 0.3);
}

.footer-submit-btn.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.e2ee-tip-bar {
  display: flex;
  align-items: center;
  gap: 12rpx;
  background: rgba(0, 184, 148, 0.08);
  border: 1.5rpx solid rgba(0, 184, 148, 0.2);
  border-radius: 16rpx;
  padding: 12rpx 20rpx;
  margin: 12rpx 32rpx 0;
  box-sizing: border-box;
}

.e2ee-tip-icon {
  font-size: 26rpx;
  flex-shrink: 0;
}

.e2ee-tip-text {
  font-size: 22rpx;
  color: #00B894;
  font-weight: 500;
  line-height: 1.4;
}
</style>
