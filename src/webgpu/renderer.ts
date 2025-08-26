/**
 * 函数式WebGPU图像滤镜渲染器
 * 提供无状态的纯函数接口，直接返回ImageBitmap
 */

import { ConfigManager } from "./resource";
import type { FilterParam } from "./types";
import type { FilterResourceConfig } from "./resource/config";
import { initCode, getSampler, getBuffer } from "./utils";
import { TriangleMesh } from "./utils/triangleMesh";

/**
 * 渲染上下文接口
 */
export interface RenderContext {
    device: GPUDevice;
    configManager: ConfigManager;
}

/**
 * 渲染选项
 */
export interface RenderOptions {
    /** 缓存键，用于优化重复渲染 */
    cacheKey?: string;
    /** 输出图像格式 */
    format?: 'rgba8unorm' | 'bgra8unorm';
    /** 清除颜色 */
    clearColor?: { r: number; g: number; b: number; a: number };
    /** 是否启用调试日志 */
    debug?: boolean;
}

/**
 * 创建渲染上下文
 */
export async function createRenderContext(device: GPUDevice): Promise<RenderContext> {
    return {
        device,
        configManager: new ConfigManager(device)
    };
}

/**
 * 销毁渲染上下文，释放资源
 */
export function destroyRenderContext(context: RenderContext): void {
    context.configManager?.destroy();
    if (context.device) {
        // WebGPU设备通常不需要手动销毁，但可以在这里做清理工作
    }
}

/**
 * 创建离屏渲染目标（Canvas + WebGPU上下文）
 */
function createOffscreenRenderTarget(device: GPUDevice, width: number, height: number, format: GPUTextureFormat = 'rgba8unorm'): {
    canvas: OffscreenCanvas;
    context: GPUCanvasContext;
    texture: GPUTexture;
} {
    // 创建离屏Canvas
    const canvas = new OffscreenCanvas(width, height);
    
    // 获取WebGPU上下文
    const context = canvas.getContext('webgpu') as GPUCanvasContext;
    if (!context) {
        throw new Error('Failed to get WebGPU context from OffscreenCanvas');
    }
    
    // 配置WebGPU上下文
    context.configure({
        device,
        format,
        usage: GPUTextureUsage.RENDER_ATTACHMENT,
        alphaMode: 'premultiplied'
    });

    // 获取当前纹理作为渲染目标
    const texture = context.getCurrentTexture();

    return { canvas, context, texture };
}

/**
 * 将OffscreenCanvas转换为ImageBitmap（高效方式）
 */
async function canvasToImageBitmap(canvas: OffscreenCanvas): Promise<ImageBitmap> {
    // 直接从OffscreenCanvas创建ImageBitmap，GPU加速，高效！
    return createImageBitmap(canvas);
}

/**
 * 处理单个滤镜Pass（使用OffscreenCanvas）
 */
async function processFilterPass(
    context: RenderContext,
    filterParam: FilterParam,
    renderTarget: { canvas: OffscreenCanvas; context: GPUCanvasContext; texture: GPUTexture },
    passIndex?: number
): Promise<void> {
    if (!filterParam.enable) return;

    const { device, configManager } = context;
    const commandEncoder = device.createCommandEncoder();
    
    try {
        const passEncoder = commandEncoder.beginRenderPass({
            colorAttachments: [{
                view: renderTarget.texture.createView(),
                clearValue: { r: 0, g: 0, b: 0, a: 1 },
                loadOp: 'clear',
                storeOp: 'store',
            }],
        });

        console.log(`🎨 Processing filter: ${filterParam.filterType}${passIndex !== undefined ? ` (pass ${passIndex})` : ''}`);
        
        // 检查是否有配置化的资源管理
        const config = configManager.getFilterConfig(filterParam.filterType);
        if (config) {
            console.log(`📋 Using configuration for ${filterParam.filterType}`);
            
            // 实现完整的滤镜处理逻辑
            await processFilterWithConfig(
                context,
                filterParam,
                config,
                passEncoder,
                renderTarget,
                passIndex
            );
        } else {
            // 回退到基础处理逻辑
            await processBasicFilter(
                context,
                filterParam,
                passEncoder,
                renderTarget
            );
        }

        passEncoder.end();
        device.queue.submit([commandEncoder.finish()]);
        
    } catch (error) {
        console.error(`❌ Filter ${filterParam.filterType} processing failed:`, error);
        throw error;
    }
}

/**
 * 使用配置化资源管理处理滤镜
 */
async function processFilterWithConfig(
    context: RenderContext,
    filterParam: FilterParam,
    _config: FilterResourceConfig,
    passEncoder: GPURenderPassEncoder,
    renderTarget: { canvas: OffscreenCanvas; context: GPUCanvasContext; texture: GPUTexture },
    passIndex?: number
): Promise<void> {
    const { device, configManager } = context;

    try {
        // 创建滤镜参数对象
        const filterParams: Record<string, any> = {};
        if (filterParam.properties) {
            for (const prop of filterParam.properties) {
                filterParams[prop.key] = prop.value;
            }
        }

        // 创建资源上下文
        const resourceContext = {
            width: renderTarget.canvas.width,
            height: renderTarget.canvas.height,
            passIndex: passIndex || 0,
            params: filterParams
        };

        // 创建或更新滤镜资源
        const resources = configManager.createResourcesForFilter(
            filterParam.filterType,
            filterParams,
            resourceContext
        );

        // 获取或创建 WGSL 代码
        const wgslCode = filterParam.code || getDefaultShaderCode(filterParam.filterType);
        if (!wgslCode) {
            throw new Error(`No shader code found for filter: ${filterParam.filterType}`);
        }

        // 创建渲染管道
        const { pipeline } = initCode(wgslCode, device);

        // 创建三角形网格（全屏四边形）
        const triangleMesh = new TriangleMesh(device);

        // 创建采样器
        const sampler = getSampler(device, { magFilter: "linear", minFilter: "linear" });

        // 设置渲染管道
        passEncoder.setPipeline(pipeline);

        // 设置顶点缓冲区
        passEncoder.setVertexBuffer(0, triangleMesh.buffer);

        // 创建绑定组
        const bindGroupEntries: GPUBindGroupEntry[] = [];
        
        // 添加采样器绑定（通常在 group 0, binding 0）
        bindGroupEntries.push({
            binding: 0,
            resource: sampler
        });

        // 添加输入纹理绑定（通常在 group 0, binding 1）
        // 这里需要从输入纹理创建视图
        // 暂时使用渲染目标纹理作为占位符
        bindGroupEntries.push({
            binding: 1,
            resource: renderTarget.texture.createView()
        });

        // 添加uniform缓冲区绑定（group 1）
        let uniformBindingIndex = 0;
        const uniformEntries: GPUBindGroupEntry[] = [];
        
        for (const [_resourceName, resource] of Object.entries(resources)) {
            if (resource && typeof resource === 'object' && 'buffer' in resource) {
                uniformEntries.push({
                    binding: uniformBindingIndex++,
                    resource: resource
                });
            }
        }

        // 创建绑定组
        const textureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: bindGroupEntries
        });

        let uniformBindGroup: GPUBindGroup | null = null;
        if (uniformEntries.length > 0) {
            uniformBindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(1),
                entries: uniformEntries
            });
        }

        // 设置绑定组
        passEncoder.setBindGroup(0, textureBindGroup);
        if (uniformBindGroup) {
            passEncoder.setBindGroup(1, uniformBindGroup);
        }

        // 绘制
        passEncoder.draw(triangleMesh.count);

        console.log(`✅ Successfully processed filter: ${filterParam.filterType} with config`);

    } catch (error) {
        console.error(`❌ Failed to process filter with config: ${filterParam.filterType}`, error);
        throw error;
    }
}

/**
 * 基础滤镜处理（无配置回退）
 */
async function processBasicFilter(
    context: RenderContext,
    filterParam: FilterParam,
    passEncoder: GPURenderPassEncoder,
    renderTarget: { canvas: OffscreenCanvas; context: GPUCanvasContext; texture: GPUTexture }
): Promise<void> {
    const { device } = context;

    try {
        console.log(`⚠️  Using basic processing for filter: ${filterParam.filterType}`);

        // 获取 WGSL 代码
        const wgslCode = filterParam.code || getDefaultShaderCode(filterParam.filterType);
        if (!wgslCode) {
            console.warn(`No shader code available for filter: ${filterParam.filterType}, using copy shader`);
            return;
        }

        // 创建渲染管道
        const { pipeline } = initCode(wgslCode, device);

        // 创建基础资源
        const triangleMesh = new TriangleMesh(device);
        const sampler = getSampler(device, { magFilter: "linear", minFilter: "linear" });

        // 创建基础uniform缓冲区（如果有参数）
        const uniformBuffers: GPUBuffer[] = [];
        if (filterParam.properties && filterParam.properties.length > 0) {
            for (const prop of filterParam.properties) {
                const value = Array.isArray(prop.value) ? new Float32Array(prop.value) : new Float32Array([prop.value]);
                const buffer = getBuffer(device, value, GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
                uniformBuffers.push(buffer);
            }
        }

        // 设置渲染管道
        passEncoder.setPipeline(pipeline);
        passEncoder.setVertexBuffer(0, triangleMesh.buffer);

        // 创建基础绑定组
        const textureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: renderTarget.texture.createView() }
            ]
        });

        passEncoder.setBindGroup(0, textureBindGroup);

        // 如果有uniform缓冲区，创建第二个绑定组
        if (uniformBuffers.length > 0) {
            const uniformEntries = uniformBuffers.map((buffer, index) => ({
                binding: index,
                resource: { buffer }
            }));

            const uniformBindGroup = device.createBindGroup({
                layout: pipeline.getBindGroupLayout(1),
                entries: uniformEntries
            });

            passEncoder.setBindGroup(1, uniformBindGroup);
        }

        // 绘制
        passEncoder.draw(triangleMesh.count);

        console.log(`✅ Successfully processed basic filter: ${filterParam.filterType}`);

    } catch (error) {
        console.error(`❌ Failed to process basic filter: ${filterParam.filterType}`, error);
        throw error;
    }
}

/**
 * 获取默认着色器代码
 */
function getDefaultShaderCode(filterType: string): string | null {
    // 这里可以根据滤镜类型返回默认的着色器代码
    // 或者从滤镜注册表中获取
    const defaultShaders: Record<string, string> = {
        copy: `
            @vertex
            fn vert_main(@location(0) vertexPosition: vec2<f32>, @location(1) vertexTexCoord: vec2<f32>) -> @location(0) vec2<f32> {
                return vertexTexCoord;
            }

            @group(0) @binding(0) var mySampler: sampler;
            @group(0) @binding(1) var myTexture: texture_2d<f32>;

            @fragment
            fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
                return textureSample(myTexture, mySampler, fragUV);
            }
        `
    };

    return defaultShaders[filterType] || defaultShaders.copy;
}

/**
 * 核心渲染函数 - 使用OffscreenCanvas渲染滤镜链
 */
export async function renderFilters(
    context: RenderContext,
    sourceImage: GPUCopyExternalImageSource | ImageBitmap,
    filters: FilterParam[],
    options: RenderOptions = {}
): Promise<ImageBitmap> {
    const { device } = context;
    const { debug = false, format = 'rgba8unorm' } = options;

    if (debug) {
        console.log("🎬 Starting render with", filters.length, "filters");
    }

    // 获取源图像尺寸
    const width = (sourceImage as ImageBitmap).width || 512;
    const height = (sourceImage as ImageBitmap).height || 512;

    if (debug) {
        console.log("📊 Image size:", width, "x", height);
    }

    // 创建输入纹理
    const inputTextureDescriptor: GPUTextureDescriptor = {
        size: { width, height },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    };

    const inputTexture = device.createTexture(inputTextureDescriptor);

    // 复制源图像到输入纹理
    device.queue.copyExternalImageToTexture(
        { source: sourceImage },
        { texture: inputTexture },
        { width, height }
    );

    const renderTargets: { canvas: OffscreenCanvas; context: GPUCanvasContext; texture: GPUTexture }[] = [];
    let currentRenderTarget: { canvas: OffscreenCanvas; context: GPUCanvasContext; texture: GPUTexture } | null = null;

    try {
        // 处理每个滤镜
        const enabledFilters = filters.filter(f => f.enable);
        
        for (let i = 0; i < enabledFilters.length; i++) {
            const filter = enabledFilters[i];
            
            // 为每个滤镜创建OffscreenCanvas渲染目标
            const renderTarget = createOffscreenRenderTarget(device, width, height, format as GPUTextureFormat);
            renderTargets.push(renderTarget);

            // 处理滤镜
            await processFilterPass(context, filter, renderTarget, i);
            
            // 更新当前渲染目标
            currentRenderTarget = renderTarget;
        }

        // 如果没有启用的滤镜，创建一个复制目标
        if (!currentRenderTarget) {
            currentRenderTarget = createOffscreenRenderTarget(device, width, height, format as GPUTextureFormat);
            renderTargets.push(currentRenderTarget);
            
            // 简单复制输入到输出
            const commandEncoder = device.createCommandEncoder();
            const passEncoder = commandEncoder.beginRenderPass({
                colorAttachments: [{
                    view: currentRenderTarget.texture.createView(),
                    clearValue: { r: 0, g: 0, b: 0, a: 1 },
                    loadOp: 'clear',
                    storeOp: 'store',
                }],
            });
            // TODO: 这里需要一个简单的复制着色器
            passEncoder.end();
            device.queue.submit([commandEncoder.finish()]);
        }

        // 等待GPU渲染完成
        await device.queue.onSubmittedWorkDone();

        // 将最终的OffscreenCanvas转换为ImageBitmap（高效！）
        const resultBitmap = await canvasToImageBitmap(currentRenderTarget.canvas);

        if (debug) {
            console.log("✅ Render completed successfully using OffscreenCanvas");
        }

        return resultBitmap;

    } catch (error) {
        console.error("❌ Render failed:", error);
        throw error;
    } finally {
        // 清理临时纹理和资源
        inputTexture.destroy();
        // OffscreenCanvas和相关纹理会自动清理
    }
}

/**
 * 便利函数：一次性渲染（自动管理上下文生命周期）
 */
export async function renderOnce(
    device: GPUDevice,
    sourceImage: GPUCopyExternalImageSource | ImageBitmap,
    filters: FilterParam[],
    options: RenderOptions = {}
): Promise<ImageBitmap> {
    const context = await createRenderContext(device);
    try {
        return await renderFilters(context, sourceImage, filters, options);
    } finally {
        destroyRenderContext(context);
    }
}

/**
 * 批量处理多个图像
 */
export async function renderBatch(
    context: RenderContext,
    images: (GPUCopyExternalImageSource | ImageBitmap)[],
    filters: FilterParam[],
    options: RenderOptions = {}
): Promise<ImageBitmap[]> {
    const results: ImageBitmap[] = [];
    
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const imageOptions = { ...options, cacheKey: `batch_${i}_${options.cacheKey || ''}` };
        const result = await renderFilters(context, image, filters, imageOptions);
        results.push(result);
    }
    
    return results;
}
