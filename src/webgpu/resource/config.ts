/**
 * 声明式资源配置系统
 * 通过配置文件定义资源的创建和管理规则，消除硬编码逻辑
 */

import type { CommonArray } from "../types";

/**
 * 资源配置类型枚举
 */
export enum ResourceConfigType {
    SINGLE_BUFFER = 'single_buffer',     // 单一缓冲区
    MULTI_BUFFER = 'multi_buffer',       // 多缓冲区数组
    COMPUTED_BUFFER = 'computed_buffer', // 动态计算的缓冲区
    TEXTURE = 'texture',                 // 纹理资源
    SAMPLER = 'sampler'                  // 采样器资源
}

/**
 * 资源上下文（用于动态计算）
 */
export interface ResourceContext {
    device: GPUDevice;
    width?: number;
    height?: number;
    passIndex?: number;
    filterType: string;
    params?: Record<string, any>;
    [key: string]: any;
}

/**
 * 基础资源配置
 */
export interface BaseResourceConfig {
    type: ResourceConfigType;
    description?: string;
}

/**
 * 单一缓冲区配置
 */
export interface SingleBufferConfig extends BaseResourceConfig {
    type: ResourceConfigType.SINGLE_BUFFER;
    size: number;
    usage?: GPUBufferUsageFlags;
    initialData?: CommonArray;
}

/**
 * 多缓冲区配置
 */
export interface MultiBufferConfig extends BaseResourceConfig {
    type: ResourceConfigType.MULTI_BUFFER;
    count: number;
    usage?: GPUBufferUsageFlags;
    generator: (passIndex: number, context?: ResourceContext) => CommonArray;
}

/**
 * 计算缓冲区配置
 */
export interface ComputedBufferConfig extends BaseResourceConfig {
    type: ResourceConfigType.COMPUTED_BUFFER;
    usage?: GPUBufferUsageFlags;
    computer: (context: ResourceContext) => CommonArray | CommonArray[];
    cacheKey?: (context: ResourceContext) => string;
    dependencies?: string[];
}

/**
 * 纹理配置
 */
export interface TextureConfig extends BaseResourceConfig {
    type: ResourceConfigType.TEXTURE;
    format: GPUTextureFormat;
    width?: number;
    height?: number;
    textureUsage?: GPUTextureUsageFlags;
}

/**
 * 采样器配置
 */
export interface SamplerConfig extends BaseResourceConfig {
    type: ResourceConfigType.SAMPLER;
    descriptor: GPUSamplerDescriptor;
}

/**
 * 资源配置联合类型
 */
export type ResourceConfig = 
    | SingleBufferConfig 
    | MultiBufferConfig 
    | ComputedBufferConfig
    | TextureConfig 
    | SamplerConfig;

/**
 * 滤镜资源配置
 */
export interface FilterResourceConfig {
    /** 滤镜类型 */
    filterType: string;
    /** 通道数量 */
    passCount?: number;
    /** 资源配置映射 */
    resources: Record<string, ResourceConfig>;
}

/**
 * 预定义的滤镜资源配置
 */
export const FILTER_RESOURCE_CONFIGS: Record<string, FilterResourceConfig> = {
    // 模糊滤镜配置
    blur: {
        filterType: 'blur',
        passCount: 2,
        resources: {
            direction: {
                type: ResourceConfigType.MULTI_BUFFER,
                count: 2,
                generator: (passIndex: number) => {
                    return passIndex === 0 
                        ? new Float32Array([1.0, 0.0])  // 水平
                        : new Float32Array([0.0, 1.0]); // 垂直
                }
            }
        }
    },

    // 运动模糊配置
    motionBlur: {
        filterType: 'motionBlur',
        passCount: 1,
        resources: {
            direction: {
                type: ResourceConfigType.SINGLE_BUFFER,
                size: 2,
                initialData: new Float32Array([1.0, 0.0])
            }
        }
    },

    // 交叉模糊配置
    crossBlur: {
        filterType: 'crossBlur',
        passCount: 4,
        resources: {
            direction: {
                type: ResourceConfigType.MULTI_BUFFER,
                count: 4,
                generator: (passIndex: number) => {
                    const directions = [
                        [1.0, 0.0],     // 水平
                        [0.0, 1.0],     // 垂直  
                        [0.707, 0.707], // 对角线1
                        [-0.707, 0.707] // 对角线2
                    ];
                    return new Float32Array(directions[passIndex]);
                }
            }
        }
    },

    // 径向模糊配置
    radialBlur: {
        filterType: 'radialBlur',
        passCount: 1,
        resources: {
            center: {
                type: ResourceConfigType.SINGLE_BUFFER,
                size: 2,
                initialData: new Float32Array([0.5, 0.5])
            }
        }
    },

    // 噪声滤镜配置
    noise: {
        filterType: 'noise',
        passCount: 1,
        resources: {
            time: {
                type: ResourceConfigType.COMPUTED_BUFFER,
                computer: (_context: ResourceContext) => new Float32Array([Date.now() / 1000])
            }
        }
    },

    // 基础滤镜
    brightness: {
        filterType: 'brightness',
        resources: {
            brightness_uniforms: {
                type: ResourceConfigType.SINGLE_BUFFER,
                size: 1,
                initialData: new Float32Array([1.0])
            }
        }
    },

    contrast: {
        filterType: 'contrast',
        resources: {
            contrast_uniforms: {
                type: ResourceConfigType.SINGLE_BUFFER,
                size: 1,
                initialData: new Float32Array([1.0])
            }
        }
    },

    saturation: {
        filterType: 'saturation',
        resources: {
            saturation_uniforms: {
                type: ResourceConfigType.SINGLE_BUFFER,
                size: 1,
                initialData: new Float32Array([1.0])
            }
        }
    }
};
