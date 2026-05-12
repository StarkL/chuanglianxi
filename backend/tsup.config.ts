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
    'dotenv',
    'pg',
    'pg-native',
    'openai',
    'baidu-aip-sdk',
    'node-schedule',
    '@types/node-schedule',
    'jose',
    'fastify',
    '@fastify/cors',
    '@fastify/swagger',
    '@fastify/swagger-ui',
    'env-schema',
    'zod',
  ],
  splitting: false,
})
