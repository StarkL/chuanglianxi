import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts'],
  format: ['esm'],
  dts: true,
  clean: true,
  noExternal: [],
  external: [
    '@prisma/client',
    '@prisma/runtime-library',
    'prisma',
  ],
  splitting: false,
})
