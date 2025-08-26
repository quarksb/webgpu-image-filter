/**
 * 资源管理系统测试工具库 - 真实WebGPU版本
 * 使用真实的WebGPU API进行测试
 */

import { vi, beforeEach } from 'vitest';

// ==================== 真实WebGPU测试工具 ====================

let sharedGPUDevice: GPUDevice | null = null;

/**
 * 获取共享的GPU设备（单例模式）
 */
export async function getSharedGPUDevice(): Promise<GPUDevice> {
    if (sharedGPUDevice) {
        return sharedGPUDevice;
    }

    if (!navigator.gpu) {
        throw new Error('WebGPU not supported in this environment');
    }

    const adapter = await navigator.gpu.requestAdapter();
    if (!adapter) {
        throw new Error('Failed to get GPU adapter');
    }

    sharedGPUDevice = await adapter.requestDevice();
    if (!sharedGPUDevice) {
        throw new Error('Failed to get GPU device');
    }

    return sharedGPUDevice;
}

/**
 * 设置测试环境
 */
export function setupTestEnvironment() {
    // 基本的环境设置
    beforeEach(() => {
        // 清理任何可能的状态
        vi.clearAllMocks();
    });
}

// ==================== 测试数据生成器 ====================

/**
 * 生成测试数据
 */
export function generateTestData(size: number): Float32Array {
    const data = new Float32Array(size);
    for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1; // -1 到 1 之间的随机数
    }
    return data;
}

/**
 * 生成复杂的滤镜链测试数据
 */
export function generateComplexFilterChain() {
    const filterTypes = ['blur', 'brightness', 'contrast', 'saturation', 'sepia', 'vignette'];
    const filters = [];

    for (let i = 0; i < 15; i++) {
        const filterType = filterTypes[i % filterTypes.length];
        filters.push({
            filterType,
            enable: Math.random() > 0.2, // 80%启用概率
            properties: Array.from({ length: Math.floor(Math.random() * 4) + 1 }, (_, j) => ({
                key: `param_${j}`,
                value: Math.random() * 2
            }))
        });
    }

    return filters;
}

// ==================== 验证工具 ====================

/**
 * 验证资源隔离
 */
export function verifyResourceIsolation(
    resource1: any,
    resource2: any,
    context: { scope1: string; scope2: string }
): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    // 基本隔离检查
    if (resource1 === resource2) {
        issues.push(`Resources should be isolated but are identical (scopes: ${context.scope1} vs ${context.scope2})`);
    }

    // 检查是否都是有效的WebGPU对象
    if (!resource1 || typeof resource1 !== 'object') {
        issues.push(`Resource 1 is not a valid object (scope: ${context.scope1})`);
    }

    if (!resource2 || typeof resource2 !== 'object') {
        issues.push(`Resource 2 is not a valid object (scope: ${context.scope2})`);
    }

    return {
        passed: issues.length === 0,
        issues
    };
}

/**
 * 验证性能指标
 */
export function verifyPerformanceMetrics(
    stats: any,
    thresholds: {
        maxScopes?: number;
        maxResources?: number;
        maxMemoryMB?: number;
    }
): { passed: boolean; issues: string[] } {
    const issues: string[] = [];

    if (thresholds.maxScopes && stats.totalScopes > thresholds.maxScopes) {
        issues.push(`Too many scopes: ${stats.totalScopes} > ${thresholds.maxScopes}`);
    }

    if (thresholds.maxResources && stats.totalResources > thresholds.maxResources) {
        issues.push(`Too many resources: ${stats.totalResources} > ${thresholds.maxResources}`);
    }

    if (thresholds.maxMemoryMB) {
        const memoryMB = stats.memoryEstimate / (1024 * 1024);
        if (memoryMB > thresholds.maxMemoryMB) {
            issues.push(`Memory usage too high: ${memoryMB.toFixed(2)}MB > ${thresholds.maxMemoryMB}MB`);
        }
    }

    return {
        passed: issues.length === 0,
        issues
    };
}

// ==================== 并发测试工具 ====================

/**
 * 运行并发测试
 */
export async function runConcurrentTest<T>(
    testFunction: () => Promise<T>,
    concurrency: number,
    iterations: number
): Promise<T[]> {
    const results: T[] = [];
    const batches = Math.ceil(iterations / concurrency);

    for (let batch = 0; batch < batches; batch++) {
        const batchSize = Math.min(concurrency, iterations - batch * concurrency);
        const promises = Array.from({ length: batchSize }, () => testFunction());
        
        const batchResults = await Promise.all(promises);
        results.push(...batchResults);
    }

    return results;
}

// ==================== 资源清理工具 ====================

/**
 * 清理GPU资源
 */
export function cleanupGPUResources(...resources: Array<{ destroy?: () => void }>): void {
    for (const resource of resources) {
        if (resource && typeof resource.destroy === 'function') {
            try {
                resource.destroy();
            } catch (error) {
                console.warn('Failed to destroy resource:', error);
            }
        }
    }
}

/**
 * 在测试结束时清理共享设备
 */
export function cleanupSharedDevice(): void {
    if (sharedGPUDevice) {
        sharedGPUDevice.destroy();
        sharedGPUDevice = null;
    }
}
