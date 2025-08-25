import { defineConfig } from "vite";
import glsl from "vite-plugin-glsl";

export default defineConfig(({ mode }) => {
    const isLib = mode === "lib";
    
    if (isLib) {
        // Library build configuration
        return {
            plugins: [glsl({ compress: false })],
            build: {
                lib: {
                    entry: "src/index.ts",
                    name: "WebGPUImageFilter",
                    fileName: "webgpu-image-filter",
                    formats: ["es"]
                },
                rollupOptions: {
                    external: ["@webgpu/types"],
                    output: {
                        globals: {
                            "@webgpu/types": "WebGPUTypes"
                        }
                    }
                },
                sourcemap: true,
                minify: false,
                outDir: "lib"
            },
            define: {
                "process.env.NODE_ENV": '"production"'
            }
        };
    }
    
    // Demo/development build configuration
    return {
        plugins: [glsl({ compress: false })],
        root: "./",
        base: "./",
        build: {
            outDir: "dist"
        }
    };
});
