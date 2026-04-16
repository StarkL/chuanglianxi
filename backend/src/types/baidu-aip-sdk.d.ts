declare module 'baidu-aip-sdk' {
  interface AipOcrClientOptions {
    timeout?: number
  }

  interface OcrResult {
    error_code?: number
    error_msg?: string
    words_result?: Array<{ key: string; value?: string }>
    [key: string]: unknown
  }

  export class AipOcrClient {
    constructor(appId: string, apiKey: string, secretKey: string, options?: AipOcrClientOptions)
    businessCard(image: string, options?: Record<string, unknown>): Promise<OcrResult>
  }
}
