/**
 * 资源工厂系统
 * 根据配置创建和管理各种类型的GPU资源
 */

import type { CommonArray } from "../types";
import { getBuffer, getSampler } from "../utils/utils";
import { 
    ResourceConfigType,
    type ResourceConfig, 
    type SingleBufferConfig, 
    type MultiBufferConfig,
    type ComputedBufferConfig,
    type TextureConfig,
    type SamplerConfig,
    type ResourceContext
} from "./config";

/**
 * 资源工厂接口
 */
export interface ResourceFactory {
    canHandle(config: ResourceConfig): boolean;
    create(config: ResourceConfig, context: ResourceContext): any;
    update?(existing: any, newValue: any, context: ResourceContext): any;
}

/**
 * 单一缓冲区工厂
 */
export class BufferFactory implements ResourceFactory {
    canHandle(config: ResourceConfig): boolean {
        return config.type === ResourceConfigType.SINGLE_BUFFER;
    }

    create(config: SingleBufferConfig, context: ResourceContext): GPUBufferBinding {
        const usage = config.usage || (GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        
        const initialData = config.initialData || new Float32Array(config.size);
        const buffer = getBuffer(context.device, initialData, usage);
        
        return { buffer };
    }

    update(existing: GPUBufferBinding, newValue: CommonArray, context: ResourceContext): GPUBufferBinding {
        context.device.queue.writeBuffer(existing.buffer, 0, newValue);
        return existing;
    }
}

/**
 * 多缓冲区工厂
 */
export class ArrayFactory implements ResourceFactory {
    canHandle(config: ResourceConfig): boolean {
        return config.type === ResourceConfigType.MULTI_BUFFER;
    }

    create(config: MultiBufferConfig, context: ResourceContext): GPUBufferBinding[] {
        const usage = config.usage || (GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        const buffers: GPUBufferBinding[] = [];
        
        for (let i = 0; i < config.count; i++) {
            const data = config.generator(i, context);
            const buffer = getBuffer(context.device, data, usage);
            buffers.push({ buffer });
        }
        
        return buffers;
    }

    update(existing: GPUBufferBinding[], newValue: CommonArray | CommonArray[], context: ResourceContext): GPUBufferBinding[] {
        if (Array.isArray(newValue)) {
            // 更新多个缓冲区
            for (let i = 0; i < Math.min(existing.length, newValue.length); i++) {
                context.device.queue.writeBuffer(existing[i].buffer, 0, newValue[i]);
            }
        } else {
            // 更新特定索引的缓冲区
            const passIndex = context.passIndex || 0;
            if (existing[passIndex]) {
                context.device.queue.writeBuffer(existing[passIndex].buffer, 0, newValue);
            }
        }
        return existing;
    }
}

/**
 * 计算缓冲区工厂
 */
export class ComputedFactory implements ResourceFactory {
    private cache: Map<string, any> = new Map();

    canHandle(config: ResourceConfig): boolean {
        return config.type === ResourceConfigType.COMPUTED_BUFFER;
    }

    create(config: ComputedBufferConfig, context: ResourceContext): GPUBufferBinding | GPUBufferBinding[] {
        // 检查缓存
        if (config.cacheKey) {
            const cacheKey = config.cacheKey(context);
            const cached = this.cache.get(cacheKey);
            if (cached) {
                return cached;
            }
        }

        // 计算数据
        const computedData = config.computer(context);
        const usage = config.usage || (GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        
        let result: GPUBufferBinding | GPUBufferBinding[];
        
        if (Array.isArray(computedData)) {
            // 创建多个缓冲区
            result = computedData.map(data => ({
                buffer: getBuffer(context.device, data, usage)
            }));
        } else {
            // 创建单个缓冲区
            result = {
                buffer: getBuffer(context.device, computedData, usage)
            };
        }

        // 缓存结果
        if (config.cacheKey) {
            const cacheKey = config.cacheKey(context);
            this.cache.set(cacheKey, result);
        }

        return result;
    }

    update(_existing: any, _newValue: any, context: ResourceContext): any {
        // 计算缓冲区通常重新创建而不是更新
        const config = context.config as ComputedBufferConfig;
        return this.create(config, context);
    }

    clearCache() {
        this.cache.clear();
    }
}

/**
 * 纹理工厂
 */
export class TextureFactory implements ResourceFactory {
    canHandle(config: ResourceConfig): boolean {
        return config.type === ResourceConfigType.TEXTURE;
    }

    create(config: TextureConfig, context: ResourceContext): GPUTextureView {
        const descriptor: GPUTextureDescriptor = {
            size: {
                width: config.width || context.width || 1,
                height: config.height || context.height || 1
            },
            format: config.format,
            usage: config.textureUsage || (GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST)
        };

        const texture = context.device.createTexture(descriptor);
        return texture.createView();
    }
}

/**
 * 采样器工厂
 */
export class SamplerFactory implements ResourceFactory {
    canHandle(config: ResourceConfig): boolean {
        return config.type === ResourceConfigType.SAMPLER;
    }

    create(config: SamplerConfig, context: ResourceContext): GPUSampler {
        return getSampler(context.device, config.descriptor);
    }
}

/**
 * 资源工厂管理器
 */
export class FactoryManager {
    private factories: ResourceFactory[] = [];

    constructor() {
        // 注册默认工厂
        this.factories = [
            new BufferFactory(),
            new ArrayFactory(),
            new ComputedFactory(),
            new TextureFactory(),
            new SamplerFactory()
        ];
    }

    /**
     * 注册自定义工厂
     */
    registerFactory(factory: ResourceFactory) {
        this.factories.push(factory);
    }

    /**
     * 根据配置创建资源
     */
    createResource(config: ResourceConfig, context: ResourceContext): any {
        const factory = this.factories.find(f => f.canHandle(config));
        if (!factory) {
            throw new Error(`No factory found for resource type: ${config.type}`);
        }

        try {
            return factory.create(config, { ...context, config });
        } catch (error) {
            console.error(`Failed to create resource of type ${config.type}:`, error);
            throw error;
        }
    }

    /**
     * 更新现有资源
     */
    updateResource(config: ResourceConfig, existing: any, newValue: any, context: ResourceContext): any {
        const factory = this.factories.find(f => f.canHandle(config));
        if (!factory || !factory.update) {
            // 如果不支持更新，则重新创建
            return this.createResource(config, context);
        }

        try {
            return factory.update(existing, newValue, { ...context, config });
        } catch (error) {
            console.error(`Failed to update resource of type ${config.type}:`, error);
            // 更新失败时回退到重新创建
            return this.createResource(config, context);
        }
    }

    /**
     * 清理工厂缓存
     */
    clearCaches() {
        this.factories.forEach(factory => {
            if (factory instanceof ComputedFactory) {
                factory.clearCache();
            }
        });
    }
}
