import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'

export default defineConfig({
    plugins: [
        vue(),
        vuetify({ autoImport: true }),
    ],
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            '@nomari/ts-proto': path.resolve(__dirname, '../../packages/ts-proto'),
            '@nomari/game-tree/game-tree': path.resolve(__dirname, '../../packages/game-tree/game-tree.ts'),
            '@nomari/game-tree': path.resolve(__dirname, '../../packages/game-tree/game-tree.ts'),
            '@nomari/game-tree-builder/game-tree-builder': path.resolve(__dirname, '../../packages/game-tree-builder/game-tree-builder.ts'),
            '@nomari/game-tree-builder': path.resolve(__dirname, '../../packages/game-tree-builder/game-tree-builder.ts'),
        },
    },
    worker: {
        format: 'es',
    },
})
