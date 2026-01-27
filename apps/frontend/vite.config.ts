import { defineConfig, type Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import vuetify from 'vite-plugin-vuetify'
import path from 'path'
import fs from 'fs'

const PUBLIC_DIR = path.resolve(__dirname, 'public');

// Middleware that returns 404 for missing static files
function staticFileMiddleware(
    req: { url?: string },
    res: {
        statusCode: number;
        end: (msg: string) => void;
    },
    next: () => void
) {
    if (!req.url?.startsWith('/static/')) {
        next();
        return;
    }
    const filePath = path.join(PUBLIC_DIR, req.url);
    if (fs.existsSync(filePath)) {
        next();
        return;
    }
    res.statusCode = 404;
    res.end('Not Found');
}

// Plugin to disable SPA fallback for /static/ paths
// If file doesn't exist, return 404 instead of falling back to index.html
function staticNoFallback(): Plugin {
    return {
        name: 'static-no-fallback',
        configureServer(server) {
            server.middlewares.use(staticFileMiddleware);
        },
        configurePreviewServer(server) {
            server.middlewares.use(staticFileMiddleware);
        },
    };
}

export default defineConfig({
    plugins: [
        vue(),
        vuetify({
            autoImport: true,
        }),
        staticNoFallback(),
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
