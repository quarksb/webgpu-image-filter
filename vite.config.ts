import { defineConfig } from 'vite';
import typescript from '@rollup/plugin-typescript';
import vitePluginString from 'vite-plugin-string';

const libOutDir = 'dist';
// https://vitejs.dev/config/
enum BUILD_MODE {
    LIB = 'lib',
    DEMO = 'demo',
}

export default ({ mode, command }) => {
    const commonConfig = defineConfig({
        root: './',
        optimizeDeps: {
            exclude: [
            ],
        },
        plugins: [
            vitePluginString({ compress: false }), // 着色器默认移除换行符注释等，如需保留加入参数  { compress: false }
        ],
    });

    if (command === 'build') {
        return {
            [BUILD_MODE.LIB]: defineConfig({
                ...commonConfig,
                root: './src',
                build: {
                    outDir: libOutDir,
                    lib: {
                        name: 'wgpu-learn',
                        entry: './',
                    },
                    rollupOptions: {
                        plugins: [
                            typescript({ outDir: libOutDir, declarationDir: libOutDir, declaration: true, sourceMap: false }),
                        ],
                        output: {
                            dir: libOutDir,
                        },
                    },
                },
            }),
            [BUILD_MODE.DEMO]: defineConfig({
                ...commonConfig,
                base: './',
                build: {
                    // assetsDir: 's-context/resources',
                    target: 'es2020',
                },
            }),
        }[mode];
    }
    return commonConfig;
};
