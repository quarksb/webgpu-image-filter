/**
 * Manager - 资源管理器测试 - 简化版本
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Manager } from '../../src/webgpu/resource/manager';
import { getSharedGPUDevice, setupTestEnvironment } from './test-utils';

setupTestEnvironment();

describe('Manager - 资源管理器测试', () => {
    let manager: Manager;
    let device: any;

    beforeEach(async () => {
        device = await getSharedGPUDevice();
        manager = new Manager(device);
    });

    describe('作用域管理', () => {
        it('应该能够创建作用域', () => {
            const scope = manager.createFilterScope('test', 0, 'blur');
            expect(scope).toBeDefined();
            expect(typeof scope).toBe('object'); // scope 是一个对象，不是字符串
            
            manager.cleanupScope(scope);
        });

        it('应该支持作用域隔离', () => {
            const scope1 = manager.createFilterScope('test1', 0, 'blur');
            const scope2 = manager.createFilterScope('test2', 0, 'blur');
            
            manager.updateScopedBuffer(scope1, 'test_param', new Float32Array([1.0]));
            manager.updateScopedBuffer(scope2, 'test_param', new Float32Array([2.0]));
            
            const resource1 = manager.getResource(scope1, 'test_param');
            const resource2 = manager.getResource(scope2, 'test_param');
            
            expect(resource1).toBeDefined();
            expect(resource2).toBeDefined();
            expect(resource1).not.toBe(resource2);
            
            manager.cleanupScope(scope1);
            manager.cleanupScope(scope2);
        });
    });

    describe('资源更新', () => {
        it('应该支持缓冲区更新', () => {
            const scope = manager.createFilterScope('buffer_test', 0, 'test');
            
            manager.updateScopedBuffer(scope, 'test_buffer', new Float32Array([1.0, 2.0, 3.0, 4.0]));
            const resource = manager.getResource(scope, 'test_buffer');
            
            expect(resource).toBeDefined();
            
            manager.cleanupScope(scope);
        });

        it('应该处理多次更新', () => {
            const scope = manager.createFilterScope('multi_update', 0, 'test');
            
            // 第一次更新
            manager.updateScopedBuffer(scope, 'dynamic_param', new Float32Array([1.0]));
            let resource = manager.getResource(scope, 'dynamic_param');
            expect(resource).toBeDefined();
            
            // 第二次更新
            manager.updateScopedBuffer(scope, 'dynamic_param', new Float32Array([2.0]));
            resource = manager.getResource(scope, 'dynamic_param');
            expect(resource).toBeDefined();
            
            manager.cleanupScope(scope);
        });
    });

    describe('性能监控', () => {
        it('应该提供性能统计', () => {
            const scope1 = manager.createFilterScope('perf1', 0, 'test');
            const scope2 = manager.createFilterScope('perf2', 0, 'test');
            
            manager.updateScopedBuffer(scope1, 'param1', new Float32Array([1.0]));
            manager.updateScopedBuffer(scope2, 'param2', new Float32Array([2.0]));
            
            const stats = manager.getPerformanceStats();
            expect(stats).toBeDefined();
            expect(stats.totalResources).toBeGreaterThan(0);
            expect(stats.activeScopes).toBeGreaterThan(0);
            
            manager.cleanupScope(scope1);
            manager.cleanupScope(scope2);
        });

        it('应该提供健康检查', () => {
            const debugInfo = manager.getDebugInfo();
            expect(debugInfo).toBeDefined();
        });
    });

    describe('调试信息', () => {
        it('应该提供调试信息', () => {
            const scope = manager.createFilterScope('debug_test', 0, 'test');
            manager.updateScopedBuffer(scope, 'debug_param', new Float32Array([1.0]));
            
            const debugInfo = manager.getDebugInfo();
            expect(debugInfo).toBeDefined();
            
            manager.cleanupScope(scope);
        });
    });
});