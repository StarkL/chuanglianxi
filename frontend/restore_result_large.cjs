const fs = require('fs')
const path = require('path')

const logPath = 'C:/Users/29093/.gemini/antigravity-ide/brain/1446229c-6cb3-4753-95df-3623f5479704/.system_generated/logs/transcript.jsonl'
const resultVuePath = 'f:/document/pf/IT/projects/chuanglianxi/frontend/src/pages/ocr/result/result.vue'

try {
  const content = fs.readFileSync(logPath, 'utf8')
  const lines = content.split('\n')
  
  let targetReplacement = null
  
  for (const line of lines) {
    if (!line.trim()) continue
    try {
      const data = JSON.parse(line)
      if (data.tool_calls) {
        for (const call of data.tool_calls) {
          if (call.name === 'replace_file_content' && call.args.TargetFile.includes('result.vue')) {
            const repl = call.args.ReplacementContent
            // We want the large one containing templates and scss styles
            if (repl.includes('<template>') && repl.includes('lang="scss"') && repl.length > 5000) {
              targetReplacement = repl
            }
          }
        }
      }
    } catch (e) {
      // Ignore
    }
  }
  
  if (targetReplacement) {
    let code = targetReplacement
    if (code.startsWith('"') && code.endsWith('"')) {
      code = JSON.parse(code)
    }
    fs.writeFileSync(resultVuePath, code, 'utf8')
    console.log('Successfully restored the optimized result.vue!')
  } else {
    console.log('Could not find the large optimized result.vue replacement in logs')
  }
} catch (err) {
  console.error('Error:', err)
}
