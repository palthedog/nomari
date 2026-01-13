import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig({
    plugins: [vue()],
    resolve: {
        alias: {
            '@mari/game-definition/types': path.resolve(__dirname, '../../packages/game-definition/types.ts'),
            '@mari/game-definition': path.resolve(__dirname, '../../packages/game-definition/types.ts'),
            '@mari/game-tree/game-tree': path.resolve(__dirname, '../../packages/game-tree/game-tree.ts'),
            '@mari/game-tree': path.resolve(__dirname, '../../packages/game-tree/game-tree.ts'),
            '@mari/game-tree-builder/game-tree-builder': path.resolve(__dirname, '../../packages/game-tree-builder/game-tree-builder.ts'),
            '@mari/game-tree-builder': path.resolve(__dirname, '../../packages/game-tree-builder/game-tree-builder.ts'),
        },
    },
})
