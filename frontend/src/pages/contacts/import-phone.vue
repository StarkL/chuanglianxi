<script setup lang="ts">
import { ref } from 'vue'
import { importContactFromPhone } from '../../api/contacts'

const importing = ref(false)

async function handleImport() {
  try {
    const loginRes = await new Promise<any>((resolve, reject) => {
      uni.login({
        provider: 'weixin',
        success: resolve,
        fail: reject,
      })
    })

    const code = loginRes.code
    if (!code) {
      uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
      return
    }

    uni.chooseContact({
      success: async (res: any) => {
        importing.value = true
        uni.showLoading({ title: '导入中...' })
        try {
          const result = await importContactFromPhone(code, res.encryptedData, res.iv)
          uni.hideLoading()
          if (result.success) {
            if (result.duplicate) {
              uni.showModal({
                title: '提示',
                content: '该联系人已存在',
                showCancel: false,
              })
            } else {
              uni.showToast({ title: '导入成功', icon: 'success' })
              setTimeout(() => uni.navigateBack(), 500)
            }
          } else {
            uni.showToast({ title: '导入失败', icon: 'none' })
          }
        } catch {
          uni.hideLoading()
          uni.showToast({ title: '导入失败', icon: 'none' })
        } finally {
          importing.value = false
        }
      },
      fail: (err: any) => {
        if (err.errMsg && err.errMsg.includes('permission')) {
          uni.showToast({ title: '需要通讯录权限', icon: 'none' })
        } else {
          uni.showToast({ title: '取消选择', icon: 'none' })
        }
      },
    })
  } catch {
    uni.showToast({ title: '获取登录凭证失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="import-page">
    <view class="import-icon">
      <text class="icon-text">📇</text>
    </view>
    <text class="import-title">从手机通讯录导入</text>
    <text class="import-hint">选择联系人后自动创建档案</text>

    <button
      class="import-btn"
      :loading="importing"
      :disabled="importing"
      @click="handleImport"
    >
      选择联系人
    </button>
  </view>
</template>

<style scoped>
.import-page {
  min-height: 100vh;
  background-color: #f5f5f5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 32rpx;
}

.import-icon {
  width: 160rpx;
  height: 160rpx;
  background-color: #e8f8ef;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 48rpx;
}

.icon-text {
  font-size: 80rpx;
}

.import-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.import-hint {
  font-size: 28rpx;
  color: #999;
  margin-bottom: 96rpx;
}

.import-btn {
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
