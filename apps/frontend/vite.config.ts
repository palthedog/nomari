import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@mari/ts-proto': path.resolve(__dirname, '../../packages/ts-proto'),
            '@mari/game-tree/game-tree': path.resolve(__dirname, '../../packages/game-tree/game-tree.ts'),
            '@mari/game-tree': path.resolve(__dirname, '../../packages/game-tree/game-tree.ts'),
            '@mari/game-tree-builder/game-tree-builder': path.resolve(__dirname, '../../packages/game-tree-builder/game-tree-builder.ts'),
            '@mari/game-tree-builder': path.resolve(__dirname, '../../packages/game-tree-builder/game-tree-builder.ts'),
            '@mari/solver/cfr': path.resolve(__dirname, '../../packages/solver/cfr.ts'),
            '@mari/solver': path.resolve(__dirname, '../../packages/solver/cfr.ts'),
        },
    },
    worker: {
        format: 'es',
    },
})
