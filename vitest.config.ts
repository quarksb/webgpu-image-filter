import { defineConfig } from "vitest/config";
import glsl from "vite-plugin-glsl";

export default defineConfig({
    plugins: [glsl({ compress: false })],
    test: {
        browser: {
            enabled: true,
            provider: "playwright",
            instances: [
                {
                    browser: "chromium"
                }
            ],
            headless: false,
            screenshotFailures: false
        },
        globals: true,
        setupFiles: ['./tests/setup.ts'],
        // 排除 demo 文件夹，避免 Vue 文件解析问题
        exclude: ["**/node_modules/**", "**/dist/**", "**/demo/**", "**/.{idea,git,cache,output,temp}/**"]
    }
});
