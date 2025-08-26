/**
 * 简化的WebGPU渲染器
 * 提供基本的渲染功能，支持新的配置系统
 */

import { ConfigManager } from "./resource";
import type { FilterParam } from "./types";

export class FilterRenderer {
    private device: GPUDevice;
    private canvas!: HTMLCanvasElement;
    private context!: GPUCanvasContext;
    private configurableManager: ConfigManager;
    private inputTexture?: GPUTexture;

    constructor(device: GPUDevice) {
        this.device = device;
        this.configurableManager = new ConfigManager(device);
    }

    async init(canvas: HTMLCanvasElement): Promise<boolean> {
        try {
            this.canvas = canvas;
            this.context = canvas.getContext('webgpu') as GPUCanvasContext;
            
            if (!this.context) {
                throw new Error('WebGPU not supported');
            }

            this.context.configure({
                device: this.device,
                format: 'bgra8unorm',
                alphaMode: 'premultiplied',
            });

            console.log("✅ BasicRenderer initialized successfully");
            return true;
        } catch (error) {
            console.error("❌ Failed to initialize BasicRenderer:", error);
            return false;
        }
    }

    load(sourceImage: GPUCopyExternalImageSource, _cacheKey: string) {
        // 创建输入纹理
        const textureDescriptor: GPUTextureDescriptor = {
            size: {
                width: (sourceImage as ImageBitmap).width || 512,
                height: (sourceImage as ImageBitmap).height || 512,
            },
            format: 'bgra8unorm',
            usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST | GPUTextureUsage.RENDER_ATTACHMENT
        };

        this.inputTexture = this.device.createTexture(textureDescriptor);

        // 复制源图像到纹理
        this.device.queue.copyExternalImageToTexture(
            { source: sourceImage },
            { texture: this.inputTexture },
            textureDescriptor.size
        );
    }

    render(sourceImage: GPUCopyExternalImageSource, params: FilterParam[], cacheKey: string): HTMLCanvasElement {
        console.log("🎬 Starting render with", params.length, "filters");
        
        this.load(sourceImage, cacheKey);
        
        if (!this.inputTexture) {
            console.error("No input texture available");
            return this.canvas;
        }

        const commandEncoder = this.device.createCommandEncoder();
        
        try {
            // 简化的渲染逻辑 - 目前只是复制输入到输出
            const outputTexture = this.context.getCurrentTexture();
            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: outputTexture.createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            });
            
            // 这里应该有滤镜处理逻辑，目前是占位符
            for (let i = 0; i < params.length; i++) {
                const filterParam = params[i];
                if (filterParam.enable) {
                    console.log(`🎨 Processing filter ${i + 1}:`, filterParam.filterType);
                    
                    // 检查是否有配置化的资源管理
                    const config = this.configurableManager.getFilterConfig(filterParam.filterType);
                    if (config) {
                        console.log(`📋 Using configuration for ${filterParam.filterType}`);
                        // 这里可以使用配置化的资源管理
                    }
                }
            }
            
            passEncoder.end();
            this.device.queue.submit([commandEncoder.finish()]);
            
            console.log("✅ Render completed");
        } catch (error) {
            console.error("❌ Render failed:", error);
        }
        
        return this.canvas;
    }

    destroy() {
        this.configurableManager?.destroy();
        console.log("🗑️ BasicRenderer destroyed");
    }
}

// 导出资源管理系统
export * from "./resource";

// 创建渲染器工厂函数
export function createRenderer(device: GPUDevice): FilterRenderer {
    return new FilterRenderer(device);
}
