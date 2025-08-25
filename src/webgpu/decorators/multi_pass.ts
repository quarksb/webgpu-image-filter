import type { FilterParam } from "../utils/type";

// Pass配置接口
export interface PassConfig {
    uniforms?: Record<string, Float32Array | number[]>;
    resources?: Record<string, any>;
    debug?: boolean;
}

// Pass配置提供者函数类型
export type PassConfigProvider = (passIndex: number, properties: any[], filterParam: FilterParam) => PassConfig;

// 装饰器选项
export interface MultiPassOptions {
    debug?: boolean;
    profiler?: boolean;
    errorFallback?: boolean;
}

// 多Pass装饰器实现
export function multiPass(
    passCount: number,
    configProvider: PassConfigProvider,
    options: MultiPassOptions = {}
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

            try {
                // 执行原始方法的基础逻辑
                if (options.debug) {
                    console.log(`[MultiPass] Executing base logic for ${methodName}`);
                }
                originalMethod.call(this, commandEncoder, filterParam);

                // 执行多Pass渲染
                const pipelineData = this.getPipelineData({
                    filterType: filterParam.filterType,
                    code: this.filterCodeMap.get(filterParam.filterType)
                });

                for (let passIndex = 0; passIndex < passCount; passIndex++) {
                    if (options.debug) {
                        console.log(`[MultiPass] Executing pass ${passIndex + 1}/${passCount} for ${methodName}`);
                    }

                    // 获取当前Pass的配置
                    const passConfig = configProvider(passIndex, filterParam.properties, filterParam);

                    // 更新Pass特定的uniforms
                    if (passConfig.uniforms) {
                        Object.entries(passConfig.uniforms).forEach(([key, value]) => {
                            try {
                                if (options.debug) {
                                    console.log(`[MultiPass] Updating uniform "${key}" for pass ${passIndex}`, value);
                                }
                                
                                if (value instanceof Float32Array) {
                                    // 检查是否为数组类型的buffer (如direction)
                                    if (key === 'direction') {
                                        // direction需要用数组方式更新，passIndex选择对应的数组元素
                                        const bufferBinding = this.resourceMap.get(key);
                                        if (bufferBinding && Array.isArray(bufferBinding)) {
                                            const targetBuffer = bufferBinding[passIndex];
                                            if (targetBuffer && targetBuffer.buffer) {
                                                this.device.queue.writeBuffer(targetBuffer.buffer, 0, value);
                                                if (options.debug) {
                                                    console.log(`[MultiPass] Updated direction buffer for pass ${passIndex}:`, Array.from(value));
                                                }
                                            } else {
                                                console.warn(`[MultiPass] Direction buffer not found for pass ${passIndex}`);
                                            }
                                        } else {
                                            console.warn(`[MultiPass] Direction buffer binding not found or not array`);
                                        }
                                    } else {
                                        this.updateBuffer(key, value);
                                    }
                                } else if (Array.isArray(value)) {
                                    if (key === 'direction') {
                                        const bufferBinding = this.resourceMap.get(key);
                                        if (bufferBinding && Array.isArray(bufferBinding)) {
                                            const targetBuffer = bufferBinding[passIndex];
                                            if (targetBuffer && targetBuffer.buffer) {
                                                this.device.queue.writeBuffer(targetBuffer.buffer, 0, new Float32Array(value));
                                                if (options.debug) {
                                                    console.log(`[MultiPass] Updated direction buffer for pass ${passIndex}:`, value);
                                                }
                                            }
                                        }
                                    } else {
                                        this.updateBuffer(key, new Float32Array(value));
                                    }
                                }
                            } catch (error) {
                                console.error(`[MultiPass] Failed to update uniform "${key}" for pass ${passIndex}:`, error);
                                if (options.debug) {
                                    console.log(`[MultiPass] Available resources:`, Array.from(this.resourceMap.keys()));
                                    console.log(`[MultiPass] Resource details for "${key}":`, this.resourceMap.get(key));
                                }
                            }
                        });
                    }

                    // 更新Pass特定的资源
                    if (passConfig.resources) {
                        this.updateResource(
                            Object.entries(passConfig.resources).map(([name, resource]) => ({
                                name,
                                resource
                            }))
                        );
                    }

                    // 执行渲染Pass
                    const { inputTexture, targetTexture } = this.getTexture();

                    this.setCommandBuffer({
                        commandEncoder,
                        pipelineData,
                        inputTexture,
                        targetTexture,
                        index: passIndex
                    });
                }

                if (options.profiler) {
                    const endTime = performance.now();
                    console.log(`[MultiPass] ${methodName} completed in ${endTime - startTime}ms`);
                }
            } catch (error) {
                console.error(`[MultiPass] Error in ${methodName}:`, error);
                
                if (options.errorFallback) {
                    // 执行单Pass回退逻辑
                    console.warn(`[MultiPass] Falling back to single pass for ${methodName}`);
                    const { inputTexture, targetTexture } = this.getTexture();
                    const pipelineData = this.getPipelineData({
                        filterType: filterParam.filterType,
                        code: this.filterCodeMap.get(filterParam.filterType)
                    });

                    this.setCommandBuffer({
                        commandEncoder,
                        pipelineData,
                        inputTexture,
                        targetTexture,
                        index: 0
                    });
                } else {
                    throw error;
                }
            }
        };

        return descriptor;
    };
}

// 预定义的常用装饰器配置
export const BlurDecorator = (options?: MultiPassOptions) =>
    multiPass(
        2,
        (passIndex: number) => ({
            uniforms: {
                direction: new Float32Array(passIndex === 0 ? [1, 0] : [0, 1])
            }
        }),
        { profiler: true, errorFallback: true, ...options }
    );

// 双向模糊装饰器（可用于运动模糊等效果）
export const DualDirectionDecorator = (
    direction1: [number, number],
    direction2: [number, number],
    options?: MultiPassOptions
) =>
    multiPass(
        2,
        (passIndex: number) => ({
            uniforms: {
                direction: new Float32Array(passIndex === 0 ? direction1 : direction2)
            }
        }),
        options
    );

// 多级模糊装饰器（金字塔模糊）
export const PyramidBlurDecorator = (levels: number, options?: MultiPassOptions) =>
    multiPass(
        levels,
        (passIndex: number, properties: any) => {
            const baseIntensity = properties[0]?.value || 1;
            const levelMultiplier = Math.pow(0.5, passIndex); // 每级强度递减
            return {
                uniforms: {
                    blur_uniforms: new Float32Array([baseIntensity * levelMultiplier]),
                    direction: new Float32Array(passIndex % 2 === 0 ? [1, 0] : [0, 1])
                }
            };
        },
        options
    );
