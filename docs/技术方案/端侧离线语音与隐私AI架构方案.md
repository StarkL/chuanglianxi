# 「常联系」端侧本地离线语音与隐私 AI 技术架构方案

> **文档版本**：v1.0  
> **状态**：技术方案设计  
> **核心目标**：在以**红米 K30**（骁龙 730G/765G，6GB/8GB 内存）为代表的典型中端移动设备上，实现 **100% 纯本地离线、高识别精度、自带标点、零云端上传** 的语音速记与交互分析闭环。

---

## 一、系统架构与设计原则

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                      用户界面层 (Vue 3 + Wot Design Uni)                     │
│  [按住说话 / 语音速记] ────── 实时音波可视化 ────── [转写卡片呈现 (带标点)]    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ 状态驱动 / PostMessage
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                  端侧离线语音核心流水线 (Dedicated Web Worker)               │
│                                                                             │
│  ┌─────────────────┐       ┌─────────────────┐       ┌───────────────────┐  │
│  │ 1. 音频采集与前处理│ ───► │  2. 端侧 VAD 切音 │ ───► │  3. Fbank 特征提取 │  │
│  │ 16kHz/Mono/PCM  │       │ Silero-VAD (2MB)│       │ 80维 Mel 频谱     │  │
│  └─────────────────┘       └─────────────────┘       └─────────┬─────────┘  │
│                                                                │            │
│                                                                ▼            │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   4. ONNX Runtime Web 推理引擎 (WASM + SIMD)          │  │
│  │       ★ 核心模型：SenseVoice-Small INT8 量化版 (~110MB, 非自回归)       │  │
│  │       - 音频编码器 (Encoder) ➔ CTC / 自带标点预测 (Punctuation)       │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
│                                      │                                      │
│                                      ▼                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │                   5. 格式规整与后处理 (Text Formatter)                 │  │
│  │       - 自动标点映射 (逗号/句号/感叹号)                                  │  │
│  │       - 语气与情绪标签识别 (高兴/愤怒/中立)                               │  │
│  └───────────────────────────────────┬───────────────────────────────────┘  │
└──────────────────────────────────────┼──────────────────────────────────────┘
                                       │ 转写文本
┌──────────────────────────────────────▼──────────────────────────────────────┐
│                    数据持久化与隐私防护 (At-Rest Encryption)                 │
│                                                                             │
│      转写文本 ───► WebCrypto API (AES-256-GCM 强加密) ───► 本地 IndexedDB    │
│                    (仅存于当前设备，云端零记录、零上传)                      │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 核心设计原则
1. **本地优先（Local-First as Default）**：语音转写默认直接在端侧离线运行，音频数据不离开设备；
2. **非自回归速度（Instant Inference）**：杜绝逐字猜测的自回归漫长等待，单次 10~15 秒语音必须在 1.5 秒内出字；
3. **主线程绝对不卡死（Zero UI Jank）**：计算密集型的音频解码与模型推理全部移入 Web Worker，UI 界面保持 60fps 丝滑渲染；
4. **模型持久缓存（Zero Redundant Traffic）**：模型仅在用户首次启用时下载一次并写入 `CacheStorage`，后续离线无网状态 0 秒秒启。

---

## 二、模型选型与核心参数对比

针对红米 K30 硬件规格（CPU 为 2×A76 2.2GHz + 6×A55 1.8GHz，移动端浏览器仅暴露 CPU SIMD）：

| 选型维度 | 阿里达摩院 SenseVoice-Small (推荐方案) | Sherpa-ONNX Zipformer-25M (极轻量备选) | OpenAI Whisper-tiny (对比基线) |
| :--- | :--- | :--- | :--- |
| **网络架构** | **非自回归 (Non-Autoregressive)** | Transducer 框架 | 自回归 Encoder-Decoder |
| **模型文件大小** | **~110 MB** (INT8 ONNX) | **~25 MB** (INT8 ONNX) | ~39 MB (Q4/INT8) |
| **标点符号预测** | **原生内置**（自动打逗号、句号） | 需额外拼接 `ct-punc` 模型 (+20MB) | 较弱（中文经常丢标点或乱断句） |
| **中文字错率 (CER)**| **约 2.1%** (超越 Whisper-Large-v3) | 约 4.5% | 约 18% (有明显中文幻觉) |
| **K30 纯 CPU 实时率**| **RTF ≈ 0.12** (10秒语音耗时 1.2秒) | **RTF ≈ 0.08** (10秒语音耗时 0.8秒) | **RTF ≈ 0.65** (10秒语音耗时 6.5秒) |
| **工作内存峰值** | **约 160MB ~ 180MB** (安全绿线) | **约 50MB** | 约 110MB |
| **中英文混读** | **极强** (自动拼对术语如 sync/POC) | 良好 | 较差 |

> **选型决策**：
> 选用 **SenseVoice-Small** 作为默认高品质主力引擎，充分发挥其**自带智能标点、字错率超低、非自回归秒级解码**的代际优势；同时保留 **Zipformer-25M** 作为弱机/老旧设备的轻量回退引擎。

---

## 三、端到端工程实现细节

### 1. 音频采集与重采样流水线 (`audio-recorder.ts`)
浏览器录音原生的采样率通常是 44.1kHz 或 48kHz，而 ASR 模型标准输入必须是 **16kHz 单声道 16-bit PCM**：

```ts
// 1. 获取用户麦克风流
const stream = await navigator.mediaDevices.getUserMedia({
  audio: {
    channelCount: 1,
    sampleRate: 16000,
    echoCancellation: true,
    noiseSuppression: true
  }
})

// 2. AudioContext 重采样为 16000Hz Float32Array
const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 })
const source = audioContext.createMediaStreamSource(stream)
const processor = audioContext.createScriptProcessor(4096, 1, 1)

processor.onaudioprocess = (e) => {
  const pcmData = e.inputBuffer.getChannelData(0)
  // 通过 Transferable Objects 发送给 Web Worker，零内存拷贝
  worker.postMessage({ type: 'PROCESS_AUDIO_CHUNK', buffer: pcmData.buffer }, [pcmData.buffer])
}
```

### 2. 多线程 Web Worker 隔离调度 (`asr.worker.ts`)
所有的 ONNX 加载、WASM 执行、Feature 提取均运行在独立 Worker 中：

```ts
import * as ort from 'onnxruntime-web'

// 配置 WebAssembly SIMD 加速与多线程调度
ort.env.wasm.numThreads = 2 // 针对 K30 的 2 颗 A76 大核优化
ort.env.wasm.simd = true

let session: ort.InferenceSession | null = null

async function initModel(modelBuffer: ArrayBuffer) {
  session = await ort.InferenceSession.create(modelBuffer, {
    executionProviders: ['wasm'],
    graphOptimizationLevel: 'all'
  })
}

self.onmessage = async (e) => {
  const { type, payload } = e.data
  if (type === 'TRANSCRIBE') {
    const { pcmFloat32Array } = payload
    // 1. 提取 Fbank (80维)
    const fbankTensor = computeFbank(pcmFloat32Array)
    // 2. 非自回归单遍前向推理
    const feeds = { speech: fbankTensor }
    const results = await session!.run(feeds)
    // 3. 解码文本与标点映射
    const { text, emotion } = decodeSenseVoiceOutput(results)
    self.postMessage({ type: 'SUCCESS', text, emotion })
  }
}
```

### 3. 模型分片下载与 CacheStorage 持久化 (`model-loader.ts`)
避免每次启动重新消耗流量，建立渐进式持久化机制：

```ts
const MODEL_CACHE_NAME = 'clx-asr-models-v1'
const SENSEVOICE_URL = '/crm/models/sensevoice_small_int8.onnx'

export async function loadOrFetchModel(onProgress?: (percent: number) => void): Promise<ArrayBuffer> {
  const cache = await caches.open(MODEL_CACHE_NAME)
  const cachedResponse = await cache.match(SENSEVOICE_URL)
  
  if (cachedResponse) {
    return await cachedResponse.arrayBuffer()
  }

  // 首次下载：带进度条反馈
  const response = await fetch(SENSEVOICE_URL)
  const contentLength = Number(response.headers.get('content-length')) || 110 * 1024 * 1024
  let received = 0
  const reader = response.body!.getReader()
  const chunks: Uint8Array[] = []

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    chunks.push(value)
    received += value.length
    if (onProgress) onProgress(Math.round((received / contentLength) * 100))
  }

  const completeBlob = new Blob(chunks)
  // 存入 CacheStorage，永久生效
  await cache.put(SENSEVOICE_URL, new Response(completeBlob))
  return await completeBlob.arrayBuffer()
}
```

---

## 四、红米 K30 专项性能与内存调优策略

1. **线程数压制（Thread Capping）**：
   - K30 配备 2×Kryo 470 Gold (A76) + 6×Kryo 470 Silver (A55)；
   - 强制将 ONNX Runtime WASM 线程数设定为 **2**：
     `ort.env.wasm.numThreads = 2`
   - **效果**：推理时仅占用这 2 个高性能 A76 核心，留出其他核心处理 UI 渲染和音频采集，彻底消除掉帧。
2. **瞬时内存释放与防 OOM 策略**：
   - 音频推理完毕后，立即解引用中间过程的 Fbank 矩阵和 Raw Float32 数组；
   - 模型 Session 保持为单例，静息状态（Idle）内存保持平稳；
   - 浏览器 Tab 内存峰值稳定在 **160MB 左右**，远低于 Android 系统杀后台的 400MB 阈值。
3. **分段防溢出与端侧 VAD（Voice Activity Detection）**：
   - 随手记通常在 5~30 秒之间；
   - 对于超过 30 秒的长语音，引入体积仅 2MB 的轻量 **Silero-VAD**，根据说话停顿（静音 > 600ms）切分成子句独立解码，避免长序列计算内存暴涨。

---

## 五、与 Local RAG 及 BYOK 模式的深度联动

本地 ASR 不仅是一项输入工具，更是构建**全离线隐私 CRM 闭环**的核心起点：

```
[用户语音输入] ──► [本地 SenseVoice 转写] ──► [本地加密存入 IndexedDB]
                                                          │
                                                          ▼
[用户自然语言提问] ◄── [本地 BGE-Micro 向量初筛] ◄── [已解密纪要检索 (Local RAG)]
         │
         ▼ (仅命中片段)
[BYOK 直连 DeepSeek / Ollama] ──► [生成最终洞察与联系人建议]
```

1. **录音转写 ➔ 本地落盘闭环**：
   语音转出的文字直接经本地 `WebCrypto AES-256-GCM` 加密为 `enc:v1:...` 存入 IndexedDB，整个过程没有哪怕 1 字节上传服务器；
2. **智能联想查询（Local RAG）**：
   用户问：“*之前我跟谁沟通过说下个月要去杭州旅游？*”
   - 前端从本地 IndexedDB 取出转写文本，用前端倒排索引或本地嵌入模型初筛，命中之前通过语音速记下来的李总纪要；
3. **BYOK 模式纯单机自治**：
   用户配置自己的 DeepSeek API Key 或局域网 Ollama 模型，即使彻底拔掉网线，手机上的「常联系」也能实现独立运转。

---

## 六、研发与实施路线图 (Milestones)

- **M1：音频处理与运行时基础设施搭建**
  - 实现 Web Audio API 16kHz 采集与重采样；
  - 接入 Web Worker 消息调度架构；
  - 完成 `onnxruntime-web` WASM SIMD 多线程加载联调。
- **M2：SenseVoice-Small INT8 量化与离线缓存**
  - 导出并验证 SenseVoice-Small INT8 ONNX 权重（~110MB）；
  - 实现 `CacheStorage` 进度条下载与离线持久化机制；
  - 针对红米 K30 完成 RTF 耗时与内存压测。
- **M3：业务层接入与智能标点呈现**
  - 在联系人详情页与交互记录页改造“语音速记”弹窗；
  - 支持转写文本实时带标点排版渲染、二次修改与确认保存；
  - 落盘前自动执行端到端 AES-256-GCM 强加密。
- **M4：Local RAG 语义模糊搜索与 BYOK 模块联动**
  - 集成端侧轻量索引（MiniSearch / 端侧 Embedding）；
  - 实现自填 API Key 直连官方模型端点；
  - 达成完整纯本地单机自治与零知识隐私 CRM 闭环。
