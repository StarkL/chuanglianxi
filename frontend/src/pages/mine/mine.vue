<script setup lang="ts">
import { ref, onMounted, computed } from 'vue'
import { getUserInfo, setUserInfo, type UserInfo } from '../../utils/auth'
import { updateProfile } from '../../api/auth'
import { isPwaInstalled } from '../../utils/pwa'
import { requestNotificationPermission, requestLocationPermission } from '../../utils/permissions'
import PwaInstallModal from '../../components/pwa-install-modal.vue'

const userInfo = ref<UserInfo | null>(null)
const version = 'v0.1.0'
const showNicknameModal = ref(false)
const showPwaModal = ref(false)
const isInstalled = computed(() => isPwaInstalled.value)
const newNickname = ref('')
const nicknameModalError = ref('')
const NICKNAME_REGEX = /^[一-龥a-zA-Z0-9$+_]+$/u

onMounted(() => {
  const info = getUserInfo()
  userInfo.value = info
})

async function handleCheckPermissions() {
  const notif = await requestNotificationPermission()
  const loc = await requestLocationPermission()
  const notifText = notif === 'granted' ? '✅ 已允许' : notif === 'denied' ? '❌ 已拒绝' : '⚠️ 未授权'
  const locText = loc ? `✅ 已获取定位 (${loc.latitude.toFixed(2)}, ${loc.longitude.toFixed(2)})` : '⚠️ 未授权/未开启'
  uni.showModal({
    title: '系统权限设置',
    content: `🔔 消息推送通知：${notifText}\n📍 同城人脉定位：${locText}\n\n用于根据手机定位变化，自动感知同城人脉并推送关怀提醒。`,
    showCancel: false
  })
}

function goPrivacy() {
  uni.navigateTo({ url: '/pages/privacy/privacy' })
}

function goAgreement() {
  uni.navigateTo({ url: '/pages/agreement/agreement' })
}

function goScan() {
  uni.navigateTo({ url: '/pages/ocr/scan/scan' })
}

function goCards() {
  uni.navigateTo({ url: '/pages/ocr/cards/cards' })
}

function goChangePassword() {
  uni.navigateTo({ url: '/pages/password/change/change' })
}

function showEditNickname() {
  newNickname.value = userInfo.value?.nickname || ''
  nicknameModalError.value = ''
  showNicknameModal.value = true
}

function closeNicknameModal() {
  showNicknameModal.value = false
}

async function confirmNickname() {
  const nickname = newNickname.value.trim()
  if (!nickname || nickname.length < 2 || nickname.length > 20) {
    nicknameModalError.value = '昵称长度为 2-20 个字符'
    return
  }
  if (!NICKNAME_REGEX.test(nickname)) {
    nicknameModalError.value = '昵称只能包含中文、字母、数字和 $+_'
    return
  }
  try {
    const result = await updateProfile({ nickname })
    if (result.success && result.data) {
      const updated: UserInfo = { id: userInfo.value?.id, nickname: result.data.nickname, avatar: userInfo.value?.avatar ?? null }
      setUserInfo(updated)
      userInfo.value = updated
      uni.showToast({ title: '修改成功', icon: 'success' })
      showNicknameModal.value = false
    } else {
      nicknameModalError.value = result.error || '修改失败'
    }
  } catch (err: any) {
    nicknameModalError.value = err?.data?.error || '网络错误'
  }
}

async function handleLogout() {
  try {
    const { logout } = await import('../../api/auth')
    await logout()
  } catch {
    // Server may be unreachable, clear local session anyway
  } finally {
    const { clearSession } = await import('../../utils/auth')
    clearSession()
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

function confirmLogout() {
  uni.showModal({
    title: '确认退出？',
    content: '退出后需要重新授权登录',
    cancelText: '取消',
    confirmText: '确定',
    confirmColor: '#e03131',
    success: (res) => {
      if (res.confirm) {
        handleLogout()
      }
    },
  })
}

import { exportUserKey, importUserKey } from '../../utils/crypto'

function goImport() {
  uni.navigateTo({ url: '/pages/contacts/import-phone' })
}

const showCryptoModal = ref(false)
const currentKey = ref('')
const importKeyInput = ref('')

async function handleOpenCryptoModal() {
  try {
    currentKey.value = await exportUserKey(userInfo.value?.id)
  } catch (err) {
    console.error('获取端到端密钥失败:', err)
  }
  showCryptoModal.value = true
}

function copyKey() {
  if (!currentKey.value) return
  uni.setClipboardData({
    data: currentKey.value,
    success: () => {
      uni.showToast({ title: '密钥已复制', icon: 'success' })
    }
  })
}

async function handleImportKey() {
  const k = importKeyInput.value.trim()
  if (!k) {
    uni.showToast({ title: '请输入有效密钥', icon: 'none' })
    return
  }
  try {
    await importUserKey(k, userInfo.value?.id)
    currentKey.value = k
    importKeyInput.value = ''
    uni.showToast({ title: '密钥已更新', icon: 'success' })
  } catch {
    uni.showToast({ title: '密钥格式错误', icon: 'none' })
  }
}
</script>

<template>
  <view class="mine">
    <!-- 用户信息卡片 -->
    <view class="user-card">
      <view class="user-avatar">
        <text v-if="userInfo?.avatar" class="avatar-img">{{ userInfo.avatar }}</text>
        <text v-else class="avatar-placeholder">{{ (userInfo?.nickname || 'U').charAt(0).toUpperCase() }}</text>
      </view>
      <view class="user-info">
        <text class="user-name">{{ userInfo?.nickname || '常联系用户' }}</text>
        <text class="user-role">你的人脉管理助手</text>
      </view>
      <view class="edit-btn" @click="showEditNickname">
        <wd-icon name="edit" size="20px" color="#FFFFFF" />
      </view>
      <view class="card-decoration" />
    </view>

    <!-- 修改昵称弹窗 -->
    <view v-if="showNicknameModal" class="modal-overlay" @click.self="closeNicknameModal">
      <view class="modal-content">
        <text class="modal-title">修改昵称</text>
        <input
          class="modal-input"
          v-model="newNickname"
          placeholder="请输入新昵称（2-20位）"
          @input="nicknameModalError = ''"
        />
        <text v-if="nicknameModalError" class="modal-error">{{ nicknameModalError }}</text>
        <view class="modal-actions">
          <view class="modal-btn cancel-btn" @click="closeNicknameModal">
            <text>取消</text>
          </view>
          <view class="modal-btn confirm-btn" @click="confirmNickname">
            <text>确定</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 快捷操作 -->
    <view class="quick-actions">
      <view class="action-item" @click="goScan">
        <view class="action-icon scan-icon">
          <wd-icon name="scan" size="24px" color="#FFFFFF" />
        </view>
        <text class="action-label">扫描名片</text>
      </view>
      <view class="action-item" @click="goCards">
        <view class="action-icon star-icon">
          <wd-icon name="star" size="24px" color="#FFFFFF" />
        </view>
        <text class="action-label">名片墙</text>
      </view>
      <view class="action-item" @click="goImport">
        <view class="action-icon import-icon">
          <text class="quick-emoji">📥</text>
        </view>
        <text class="action-label">导入通讯录</text>
      </view>
    </view>

    <!-- 设置分组 -->
    <view class="settings-card">
      <view class="settings-item" @click="goImport">
        <view class="settings-icon-wrap import-setting-icon">
          <text class="setting-emoji">📇</text>
        </view>
        <text class="settings-label">批量导入手机通讯录</text>
        <text class="settings-arrow">›</text>
      </view>
      <view class="settings-item" @click="handleOpenCryptoModal">
        <view class="settings-icon-wrap crypto-icon">
          <text class="setting-emoji">🛡️</text>
        </view>
        <text class="settings-label">端到端加密与密钥管理</text>
        <text class="settings-arrow">›</text>
      </view>
      <!-- #ifdef H5 -->
      <view class="settings-item pwa-item" @click="showPwaModal = true">
        <view class="settings-icon-wrap pwa-icon">
          <wd-icon name="mobile" size="18px" />
        </view>
        <text class="settings-label">安装到手机桌面 (App)</text>
        <view class="pwa-status-tag" v-if="isInstalled">已安装</view>
        <text v-else class="settings-arrow">›</text>
      </view>
      <view class="settings-item" @click="handleCheckPermissions">
        <view class="settings-icon-wrap location-icon">
          <wd-icon name="location" size="18px" />
        </view>
        <text class="settings-label">系统权限 (通知 / 同城定位)</text>
        <text class="settings-arrow">›</text>
      </view>
      <!-- #endif -->
      <view class="settings-item" @click="goChangePassword">
        <view class="settings-icon-wrap password-icon">
          <wd-icon name="lock-off" size="18px" />
        </view>
        <text class="settings-label">修改密码</text>
        <text class="settings-arrow">›</text>
      </view>
      <view class="settings-item" @click="goPrivacy">
        <view class="settings-icon-wrap privacy-icon">
          <wd-icon name="lock-on" size="18px" />
        </view>
        <text class="settings-label">隐私政策</text>
        <text class="settings-arrow">›</text>
      </view>
      <view class="settings-item" @click="goAgreement">
        <view class="settings-icon-wrap agreement-icon">
          <wd-icon name="check-circle" size="18px" />
        </view>
        <text class="settings-label">用户协议</text>
        <text class="settings-arrow">›</text>
      </view>
      <view class="settings-item">
        <view class="settings-icon-wrap about-icon">
          <wd-icon name="info-circle" size="18px" />
        </view>
        <text class="settings-label">关于常联系</text>
        <text class="settings-value">{{ version }}</text>
      </view>
    </view>

    <!-- 退出按钮 -->
    <view class="logout-area">
      <button class="logout-btn" @click="confirmLogout">退出登录</button>
    </view>

    <!-- PWA 安装模态框 -->
    <!-- #ifdef H5 -->
    <PwaInstallModal v-model="showPwaModal" />
    <!-- #endif -->

    <!-- 端到端加密密钥管理弹窗 -->
    <view v-if="showCryptoModal" class="modal-overlay" @click.self="showCryptoModal = false">
      <view class="modal-content crypto-modal-content">
        <text class="modal-title">🛡️ 端到端隐私加密 (E2EE)</text>
        <text class="crypto-desc">
          您的手机号等隐私数据在离开设备前均通过 AES-256-GCM 本地加密，云端仅存储不可逆密文，实现零知识隐私保护。
        </text>

        <view class="crypto-key-section">
          <text class="crypto-label">当前设备本地密钥：</text>
          <view class="crypto-key-box" @click="copyKey">
            <text class="crypto-key-text">{{ currentKey || '正在获取...' }}</text>
            <view class="crypto-copy-btn">复制</view>
          </view>
          <text class="crypto-subhint">⚠️ 密钥仅保存在当前设备本地。若换新手机或更换浏览器，可复制此密钥并在新设备上导入恢复。</text>
        </view>

        <view class="crypto-import-section">
          <text class="crypto-label">导入换机密钥：</text>
          <input
            class="modal-input"
            v-model="importKeyInput"
            placeholder="粘贴来自其他设备的密钥"
          />
          <view class="crypto-import-btn" @click="handleImportKey">
            <text>导入并替换当前密钥</text>
          </view>
        </view>

        <view class="modal-actions">
          <view class="modal-btn confirm-btn" @click="showCryptoModal = false">
            <text>完成</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
.mine {
  min-height: 100%;
  box-sizing: border-box;
  background-color: #F8F9FA;
  padding: 0;
  display: flex;
  flex-direction: column;
}

/* ---- 用户信息卡片 ---- */
.user-card {
  position: relative;
  overflow: hidden;
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 60%, #74B9FF 100%);
  padding: 80rpx 40rpx 48rpx;
  display: flex;
  align-items: center;
  gap: 28rpx;
}

.card-decoration {
  position: absolute;
  right: -40rpx;
  top: -40rpx;
  width: 200rpx;
  height: 200rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
}

.user-avatar {
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 4rpx solid rgba(255, 255, 255, 0.4);
  flex-shrink: 0;
}

.avatar-img {
  font-size: 60rpx;
}

.avatar-placeholder {
  font-size: 48rpx;
  font-weight: 700;
  color: #FFFFFF;
}

.user-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  z-index: 1;
}

.user-name {
  font-size: 36rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.user-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.75);
}

.edit-btn {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.2);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border: 2rpx solid rgba(255, 255, 255, 0.3);
  position: relative;
  z-index: 2;
}

/* ---- 快捷操作 ---- */
.quick-actions {
  display: flex;
  gap: 20rpx;
  padding: 32rpx;
  margin-top: -24rpx;
  position: relative;
  z-index: 2;
}

.action-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 32rpx 16rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
}

.action-icon {
  width: 80rpx;
  height: 80rpx;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.scan-icon {
  background: linear-gradient(135deg, #6C5CE7, #A29BFE);
}

.star-icon {
  background: linear-gradient(135deg, #FD79A8, #FDCB6E);
}

.import-icon {
  background: linear-gradient(135deg, #00B894, #55EFC4);
}

.quick-emoji {
  font-size: 38rpx;
  line-height: 1;
}

.action-label {
  font-size: 26rpx;
  font-weight: 500;
  color: #2D3436;
}

/* ---- 设置分组 ---- */
.settings-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  margin: 0 32rpx 32rpx;
  box-shadow: 0 4rpx 24rpx rgba(108, 92, 231, 0.08);
  overflow: hidden;
}

.settings-item {
  display: flex;
  align-items: center;
  gap: 20rpx;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #F0F0F0;
}

.settings-item:last-child {
  border-bottom: none;
}

.settings-icon-wrap {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.password-icon {
  background: rgba(253, 121, 168, 0.1);
  color: #FD79A8;
}

.privacy-icon {
  background: rgba(108, 92, 231, 0.1);
  color: #6C5CE7;
}

.agreement-icon {
  background: rgba(0, 184, 148, 0.1);
  color: #00B894;
}

.about-icon {
  background: rgba(116, 185, 255, 0.1);
  color: #74B9FF;
}

.settings-label {
  flex: 1;
  font-size: 28rpx;
  color: #2D3436;
}

.settings-value {
  font-size: 24rpx;
  color: #B2BEC3;
}

.settings-arrow {
  font-size: 32rpx;
  color: #B2BEC3;
}

/* ---- 退出按钮 ---- */
.logout-area {
  padding: 0 32rpx calc(var(--window-bottom, 50px) + 64rpx);
}

.logout-btn {
  height: 88rpx;
  line-height: 88rpx;
  background: rgba(225, 112, 85, 0.08);
  color: #E17055;
  font-size: 30rpx;
  font-weight: 500;
  border-radius: 24rpx;
  border: none;
}

.logout-btn::after {
  border: none;
}

/* ---- 修改昵称弹窗 ---- */
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 80%;
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx 32rpx 32rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.15);
}

.modal-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #2D3436;
  text-align: center;
  margin-bottom: 28rpx;
}

.modal-input {
  width: 100%;
  height: 80rpx;
  background: #F8FAFC;
  border: 2rpx solid #E2E8F0;
  border-radius: 16rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #1E293B;
  box-sizing: border-box;
  margin-bottom: 16rpx;
}

.modal-error {
  display: block;
  font-size: 24rpx;
  color: #EF4444;
  margin-bottom: 20rpx;
  text-align: center;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 8rpx;
}

.modal-btn {
  flex: 1;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16rpx;
  font-size: 28rpx;
  font-weight: 500;
}

.cancel-btn {
  background: #F1F2F6;
  color: #636E72;
}

.confirm-btn {
  background: linear-gradient(135deg, #6C5CE7 0%, #A29BFE 100%);
  color: #FFFFFF;
}

.pwa-icon {
  background: #F0EEFF;
}

.import-setting-icon {
  background: #E8F8F5;
}

.setting-emoji {
  font-size: 32rpx;
  line-height: 1;
}

.location-icon {
  background: #E6FFFA;
}

.pwa-status-tag {
  font-size: 22rpx;
  color: #276749;
  background: #EBFEEB;
  padding: 4rpx 14rpx;
  border-radius: 12rpx;
  font-weight: 500;
}

.crypto-icon {
  background: rgba(0, 184, 148, 0.1);
  color: #00B894;
}

.crypto-modal-content {
  width: 88%;
  max-width: 680rpx;
  box-sizing: border-box;
}

.crypto-desc {
  font-size: 24rpx;
  color: #64748B;
  line-height: 1.5;
  display: block;
  margin-bottom: 24rpx;
  text-align: justify;
}

.crypto-key-section,
.crypto-import-section {
  margin-bottom: 24rpx;
}

.crypto-label {
  font-size: 26rpx;
  font-weight: 600;
  color: #334155;
  display: block;
  margin-bottom: 12rpx;
}

.crypto-key-box {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F1F5F9;
  border: 1rpx dashed #94A3B8;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  gap: 16rpx;
}

.crypto-key-text {
  font-size: 20rpx;
  font-family: monospace;
  color: #475569;
  word-break: break-all;
  flex: 1;
}

.crypto-copy-btn {
  background: #6C5CE7;
  color: #FFFFFF;
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  flex-shrink: 0;
}

.crypto-subhint {
  font-size: 20rpx;
  color: #E17055;
  display: block;
  margin-top: 10rpx;
  line-height: 1.4;
}

.crypto-import-btn {
  background: #00B894;
  color: #FFFFFF;
  height: 68rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 12rpx;
  font-size: 24rpx;
  font-weight: 500;
  margin-top: 8rpx;
}
</style>
