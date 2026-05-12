import { defineConfig } from 'tsup'
import { readFileSync } from 'fs'
import { join } from 'path'

// Externalize all node_modules to avoid bundling issues with CJS modules
const pkg = JSON.parse(readFileSync(join(__dirname, 'package.json'), 'utf8'))
const allDeps = { ...pkg.dependencies, ...pkg.devDependencies }

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  external: Object.keys(allDeps),
  splitting: false,
})
