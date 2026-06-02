/**
 * 页面数据变更事件总线
 *
 * 解决 uni-app SPA 路由返回时数据不刷新的问题。
 * 子页面修改数据后广播事件，父页面监听后按需刷新。
 *
 * 优势：
 * - 按需刷新：只在数据真正变化时请求 API
 * - 零依赖：uni-app 内置事件系统，无需额外库
 * - 类型安全：集中定义事件名，避免拼写错误
 *
 * 使用示例：
 *   // 子页面（修改数据后）：
 *   import { emitDataChanged } from '../utils/events'
 *   emitDataChanged('contacts')
 *
 *   // 父页面（监听刷新）：
 *   import { onDataChanged } from '../utils/events'
 *   onDataChanged('contacts', () => { loadContacts() })
 *
 * 注意：在 onUnmounted 中调用 removeDataChangedListener 清理事件监听
 */

/** 数据变更事件名 */
export type DataChangeKey =
  | 'contacts' // 联系人增删改
  | 'interactions' // 交互记录增删改
  | 'reminders' // 提醒增删改
  | 'businessCards' // 名片增删改

/** 数据变更事件负载 */
export interface DataChangeEvent {
  key: DataChangeKey
  action: 'create' | 'update' | 'delete'
  id?: string
  timestamp: number
}

/**
 * 广播数据变更事件
 * @param key - 数据域
 * @param action - 操作类型
 * @param id - 变更的数据 ID（可选）
 */
export function emitDataChanged(
  key: DataChangeKey,
  action: DataChangeEvent['action'],
  id?: string
) {
  const event: DataChangeEvent = {
    key,
    action,
    id,
    timestamp: Date.now()
  }
  uni.$emit('dataChanged', event)
}

/**
 * 监听数据变更事件
 * @param key - 要监听的数据域
 * @param callback - 变更回调
 * @returns 取消监听的函数
 */
export function onDataChanged(key: DataChangeKey, callback: (event: DataChangeEvent) => void) {
  const handler = (event: DataChangeEvent) => {
    if (event.key === key) {
      callback(event)
    }
  }
  uni.$on('dataChanged', handler)
  // 返回取消监听的函数
  return () => {
    uni.$off('dataChanged', handler)
  }
}

/**
 * 移除所有数据变更监听（在页面销毁时调用）
 */
export function removeAllDataChangedListeners() {
  uni.$off('dataChanged')
}
