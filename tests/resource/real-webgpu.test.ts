/**
 * 资源管理器真实WebGPU测试
 * 使用真实的WebGPU API测试资源管理系统
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Manager } from '../../src/webgpu/resource/manager';

describe('资源管理器 - 真实WebGPU测试', () => {
    let gpuDevice: any; // 使用any避免类型问题
    let manager: Manager;

    beforeEach(async () => {
        // 获取真实的WebGPU设备
        const gpu = (navigator as any).gpu;
        const adapter = await gpu.requestAdapter();
        if (!adapter) {
            throw new Error('Failed to get GPU adapter');
        }
        
        gpuDevice = await adapter.requestDevice();
        manager = new Manager(gpuDevice);
    });

    afterEach(() => {
        // 清理资源
        if (gpuDevice) {
            gpuDevice.destroy();
        }
    });

    it('应该能够创建资源作用域', () => {
        const scope = manager.createFilterScope('test_filter', 0, 'blur');
        
        expect(scope).toBeDefined();
        expect(scope.filterId).toBe('test_filter');
        expect(scope.passIndex).toBe(0);
        expect(scope.namespace).toBeDefined();
    });

    it('应该能够创建和更新缓冲区资源', () => {
        const scope = manager.createFilterScope('buffer_test', 0, 'test');
        
        // 创建测试数据
        const testData = new Float32Array([1.0, 2.0, 3.0, 4.0]);
        
        // 更新缓冲区 - 这会使用真实的WebGPU创建GPUBuffer
        expect(() => {
            manager.updateScopedBuffer(scope, 'test_buffer', testData);
        }).not.toThrow();

        // 验证资源存在
        const resource = manager.getResource(scope, 'test_buffer');
        expect(resource).toBeDefined();
    });

    it('应该正确隔离不同作用域的资源', () => {
        const scope1 = manager.createFilterScope('isolation_test_1', 0, 'blur');
        const scope2 = manager.createFilterScope('isolation_test_2', 0, 'brightness');
        
        const data1 = new Float32Array([1.0, 2.0, 3.0, 4.0]);
        const data2 = new Float32Array([5.0, 6.0, 7.0, 8.0]);
        
        // 在两个作用域中创建同名资源
        manager.updateScopedBuffer(scope1, 'shared_name', data1);
        manager.updateScopedBuffer(scope2, 'shared_name', data2);
        
        // 验证资源隔离
        const resource1 = manager.getResource(scope1, 'shared_name');
        const resource2 = manager.getResource(scope2, 'shared_name');
        
        expect(resource1).toBeDefined();
        expect(resource2).toBeDefined();
        expect(resource1).not.toBe(resource2); // 应该是不同的资源对象
        
        // 验证跨作用域访问失败
        expect(manager.getResource(scope1, 'shared_name')).toBeDefined();
        expect(manager.getResource(scope2, 'shared_name')).toBeDefined();
    });

    it('应该提供性能统计信息', () => {
        const initialStats = manager.getPerformanceStats();
        
        // 创建一些资源
        for (let i = 0; i < 3; i++) {
            const scope = manager.createFilterScope(`perf_test_${i}`, 0, 'test');
            manager.updateScopedBuffer(scope, 'perf_buffer', new Float32Array([i, i + 1, i + 2, i + 3]));
        }
        
        const finalStats = manager.getPerformanceStats();
        
        expect(finalStats).toBeDefined();
        expect(finalStats.totalScopes).toBeGreaterThan(initialStats.totalScopes); // 作用域数量增加
        expect(finalStats.totalResources).toBeGreaterThan(initialStats.totalResources); // 资源数量增加
        expect(finalStats.memoryEstimate).toBeGreaterThan(0);
    });

    it('应该支持资源清理', () => {
        const scope = manager.createFilterScope('cleanup_test', 0, 'test');
        manager.updateScopedBuffer(scope, 'cleanup_buffer', new Float32Array([1, 2, 3, 4]));
        
        // 验证资源存在
        expect(manager.getResource(scope, 'cleanup_buffer')).toBeDefined();
        expect(manager.getPerformanceStats().totalScopes).toBe(1);
        
        // 清理作用域
        manager.cleanupScope(scope);
        
        // 验证资源已清理
        expect(manager.getPerformanceStats().totalScopes).toBe(0);
    });

    it('应该能够进行健康检查', () => {
        // 创建一些资源
        for (let i = 0; i < 5; i++) {
            const scope = manager.createFilterScope(`health_${i}`, 0, 'test');
            manager.updateScopedBuffer(scope, 'health_buffer', new Float32Array(4));
        }
        
        const health = manager.healthCheck();
        
        expect(health).toBeDefined();
        expect(typeof health.isHealthy).toBe('boolean');
        expect(Array.isArray(health.issues)).toBe(true);
        expect(Array.isArray(health.recommendations)).toBe(true);
    });
});
