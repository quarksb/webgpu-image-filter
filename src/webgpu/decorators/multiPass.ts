/**
 * 支持资源隔离的多Pass装饰器
 * 解决滤镜参数相互覆盖的问题
 */

import type { FilterParam } from "../types";
import type { Manager, FilterResourceScope } from "../resource";

// Pass配置接口
export interface IsolatedPassConfig {
    uniforms?: Record<string, Float32Array | number[]>;
    resources?: Record<string, any>;
    debug?: boolean;
}

// Pass配置提供者函数类型（支持资源隔离）
export type IsolatedPassConfigProvider = (
    passIndex: number, 
    properties: any[], 
    filterParam: FilterParam,
    scope: FilterResourceScope
) => IsolatedPassConfig;

// 装饰器选项
export interface IsolatedMultiPassOptions {
    debug?: boolean;
    profiler?: boolean;
    errorFallback?: boolean;
    /** 强制创建独立的作用域，即使是相同的滤镜类型 */
    forceIsolation?: boolean;
}

// 滤镜实例计数器
const filterInstanceCounter = new Map<string, number>();

/**
 * 支持资源隔离的多Pass装饰器
 */
export function isolatedMultiPass(
    passCount: number,
    configProvider: IsolatedPassConfigProvider,
    options: IsolatedMultiPassOptions = {}
): MethodDecorator {
    return function (
        _target: any,
        propertyName: string | symbol,
        descriptor: PropertyDescriptor
    ) {
        const originalMethod = descriptor.value;
        const methodName = String(propertyName);

        descriptor.value = function (
            this: any,
            commandEncoder: GPUCommandEncoder,
            filterParam: FilterParam
        ) {
            const startTime = options.profiler ? performance.now() : 0;
            
            // 生成唯一的滤镜实例ID
            const baseId = `${filterParam.filterType}_${methodName}`;
            const instanceCount = (filterInstanceCounter.get(baseId) || 0) + 1;
            filterInstanceCounter.set(baseId, instanceCount);
            
            const filterId = options.forceIsolation 
                ? `${baseId}_${instanceCount}_${Date.now()}`
                : baseId;

            const resourceManager = this.resourceManager as Manager;
            if (!resourceManager) {
                throw new Error('ResourceManager not found. Please ensure renderer uses ResourceManager.');
            }

            let filterScope: FilterResourceScope | null = null;

            try {
                // 创建滤镜作用域
                filterScope = resourceManager.createFilterScope(filterId);

                if (options.debug) {
                    console.log(`[IsolatedMultiPass] Created scope ${filterScope.namespace} for ${methodName}`);
                }

                // 执行原始方法的基础逻辑
                if (options.debug) {
                    console.log(`[IsolatedMultiPass] Executing base logic for ${methodName}`);
                }
                originalMethod.call(this, commandEncoder, filterParam, filterScope);

                // 获取pipeline数据
                const pipelineData = this.getPipelineData({
                    filterType: filterParam.filterType,
                    code: this.filterRegistry.getWgslCode(filterParam.filterType)
                });

                // 执行多Pass渲染
                for (let passIndex = 0; passIndex < passCount; passIndex++) {
                    if (options.debug) {
                        console.log(`[IsolatedMultiPass] Executing pass ${passIndex + 1}/${passCount} for ${methodName}`);
                    }

                    // 创建Pass特定的作用域
                    const passScope = resourceManager.createFilterScope(filterId, passIndex);

                    // 获取当前Pass的配置
                    const passConfig = configProvider(passIndex, filterParam.properties, filterParam, passScope);

                    // 更新Pass特定的uniforms（隔离版本）
                    if (passConfig.uniforms) {
                        for (const [key, value] of Object.entries(passConfig.uniforms)) {
                            try {
                                if (options.debug) {
                                    console.log(`[IsolatedMultiPass] Updating scoped uniform "${key}" for pass ${passIndex}`, value);
                                }

                                if (value instanceof Float32Array) {
                                    if (key === 'direction') {
                                        // 使用作用域隔离的方向缓冲区更新
                                        resourceManager.updateDirectionBuffer(passScope, passIndex, value);
                                    } else {
                                        const newArray = new Float32Array(value.length);
                                        newArray.set(value);
                                        resourceManager.updateScopedBuffer(passScope, key, newArray);
                                    }
                                } else if (Array.isArray(value)) {
                                    if (key === 'direction') {
                                        resourceManager.updateDirectionBuffer(passScope, passIndex, new Float32Array(value));
                                    } else {
                                        resourceManager.updateScopedBuffer(passScope, key, new Float32Array(value));
                                    }
                                }
                            } catch (error) {
                                console.error(`[IsolatedMultiPass] Failed to update scoped uniform "${key}" for pass ${passIndex}:`, error);
                                if (options.debug) {
                                    const debugInfo = resourceManager.getDebugInfo();
                                    console.log(`[IsolatedMultiPass] Resource debug info:`, debugInfo);
                                }
                            }
                        }
                    }

                    // 更新Pass特定的资源（隔离版本）
                    if (passConfig.resources) {
                        for (const [name, resource] of Object.entries(passConfig.resources)) {
                            resourceManager.setScopedResource(passScope, name, resource);
                        }
                    }

                    // 执行渲染Pass（使用隔离的资源）
                    const { inputTexture, targetTexture } = this.getTexture();

                    this.setCommandBufferWithScope({
                        commandEncoder,
                        pipelineData,
                        inputTexture,
                        targetTexture,
                        passIndex,
                        resourceScope: passScope
                    });
                }

                if (options.profiler) {
                    const endTime = performance.now();
                    console.log(`[IsolatedMultiPass] ${methodName} completed in ${endTime - startTime}ms with scope ${filterScope.namespace}`);
                }

            } catch (error) {
                console.error(`[IsolatedMultiPass] Error in ${methodName}:`, error);
                
                if (options.errorFallback && filterScope) {
                    // 执行单Pass回退逻辑
                    console.warn(`[IsolatedMultiPass] Falling back to single pass for ${methodName}`);
                    try {
                        const { inputTexture, targetTexture } = this.getTexture();
                        const pipelineData = this.getPipelineData({
                            filterType: filterParam.filterType,
                            code: this.filterRegistry.getWgslCode(filterParam.filterType)
                        });

                        this.setCommandBufferWithScope({
                            commandEncoder,
                            pipelineData,
                            inputTexture,
                            targetTexture,
                            passIndex: 0,
                            resourceScope: filterScope
                        });
                    } catch (fallbackError) {
                        console.error(`[IsolatedMultiPass] Fallback also failed:`, fallbackError);
                        throw error; // 抛出原始错误
                    }
                } else {
                    throw error;
                }
            } finally {
                // 清理资源作用域（可选，也可以延迟清理）
                if (filterScope && !options.forceIsolation) {
                    // 对于普通滤镜，可以延迟清理以便复用
                    setTimeout(() => {
                        if (filterScope) {
                            resourceManager.cleanupScope(filterScope);
                        }
                    }, 1000);
                }
            }
        };

        return descriptor;
    };
}

// 预定义的隔离装饰器配置
export const IsolatedBlurDecorator = (options?: IsolatedMultiPassOptions) =>
    isolatedMultiPass(
        2,
        (passIndex: number, _properties: any[], _filterParam: FilterParam, _scope: FilterResourceScope) => ({
            uniforms: {
                direction: new Float32Array(passIndex === 0 ? [1, 0] : [0, 1])
            },
            debug: options?.debug && passIndex === 0 // 只在第一个pass输出调试信息
        }),
        { profiler: true, errorFallback: true, ...options }
    );

// 双向隔离装饰器
export const IsolatedDualDirectionDecorator = (
    direction1: [number, number],
    direction2: [number, number],
    options?: IsolatedMultiPassOptions
) =>
    isolatedMultiPass(
        2,
        (passIndex: number) => ({
            uniforms: {
                direction: new Float32Array(passIndex === 0 ? direction1 : direction2)
            }
        }),
        options
    );

// 金字塔隔离装饰器
export const IsolatedPyramidBlurDecorator = (levels: number, options?: IsolatedMultiPassOptions) =>
    isolatedMultiPass(
        levels,
        (passIndex: number, properties: any[], _filterParam: FilterParam, scope: FilterResourceScope) => {
            const baseIntensity = properties[0]?.value || 1;
            const levelMultiplier = Math.pow(0.5, passIndex);
            const scopedUniformsKey = `blur_uniforms_${scope.namespace}`;
            
            return {
                uniforms: {
                    [scopedUniformsKey]: new Float32Array([baseIntensity * levelMultiplier]),
                    direction: new Float32Array(passIndex % 2 === 0 ? [1, 0] : [0, 1])
                },
                debug: passIndex === 0 && options?.debug
            };
        },
        options
    );

/**
 * 自动清理过期的滤镜实例计数器
 */
export function cleanupFilterInstanceCounters() {
    filterInstanceCounter.clear();
}

/**
 * 获取当前滤镜实例统计
 */
export function getFilterInstanceStats(): Map<string, number> {
    return new Map(filterInstanceCounter);
}
