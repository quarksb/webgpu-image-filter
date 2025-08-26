/**
 * 资源管理核心功能测试 - 使用真实WebGPU
 */

import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { Manager } from '../../src/webgpu/resource/manager';
import { 
    getSharedGPUDevice, 
    setupTestEnvironment, 
    generateTestData,
    verifyResourceIsolation,
    verifyPerformanceMetrics,
    cleanupSharedDevice
} from './test-utils';

setupTestEnvironment();

describe('资源管理核心功能 - 真实WebGPU', () => {
    let gpuDevice: any;
    let manager: Manager;

    beforeEach(async () => {
        gpuDevice = await getSharedGPUDevice();
        manager = new Manager(gpuDevice);
    });

    afterEach(() => {
        // 每个测试后清理，但保持设备共享
        if (manager) {
            // 清理所有作用域
            const debugInfo = manager.getDebugInfo();
            const scopes = Object.keys(debugInfo.scopedResources || {});
            scopes.forEach(namespace => {
                try {
                    manager.cleanupScope({ namespace } as any);
                } catch (e) {
                    // 忽略清理错误
                }
            });
        }
    });

    describe('基础功能', () => {
        it('应该能够创建资源作用域', () => {
            const scope = manager.createFilterScope('test_filter', 0, 'blur');
            
            expect(scope).toBeDefined();
            expect(scope.filterId).toBe('test_filter');
            expect(scope.passIndex).toBe(0);
            expect(scope.namespace).toBeDefined();
            expect(scope.filterType).toBe('blur');
        });

        it('应该能够创建和更新缓冲区资源', () => {
            const scope = manager.createFilterScope('buffer_test', 0, 'test');
            const testData = generateTestData(4);
            
            expect(() => {
                manager.updateScopedBuffer(scope, 'test_buffer', testData);
            }).not.toThrow();

            const resource = manager.getResource(scope, 'test_buffer');
            expect(resource).toBeDefined();
        });

        it('应该正确隔离不同作用域的资源', () => {
            const scope1 = manager.createFilterScope('isolation_1', 0, 'blur');
            const scope2 = manager.createFilterScope('isolation_2', 0, 'brightness');
            
            const data1 = generateTestData(4);
            const data2 = generateTestData(4);
            
            manager.updateScopedBuffer(scope1, 'shared_name', data1);
            manager.updateScopedBuffer(scope2, 'shared_name', data2);
            
            const resource1 = manager.getResource(scope1, 'shared_name');
            const resource2 = manager.getResource(scope2, 'shared_name');
            
            const isolation = verifyResourceIsolation(
                resource1, 
                resource2, 
                { scope1: scope1.namespace, scope2: scope2.namespace }
            );
            
            expect(isolation.passed).toBe(true);
            expect(isolation.issues).toHaveLength(0);
        });
    });

    describe('生命周期管理', () => {
        it('应该支持资源清理', () => {
            const scope = manager.createFilterScope('cleanup_test', 0, 'test');
            manager.updateScopedBuffer(scope, 'cleanup_buffer', generateTestData(4));
            
            expect(manager.getResource(scope, 'cleanup_buffer')).toBeDefined();
            
            const beforeStats = manager.getPerformanceStats();
            manager.cleanupScope(scope);
            const afterStats = manager.getPerformanceStats();
            
            expect(afterStats.totalScopes).toBeLessThan(beforeStats.totalScopes);
        });

        it('应该支持多Pass滤镜', () => {
            const filterId = 'multipass_test';
            const scopes: Array<any> = [];
            
            for (let pass = 0; pass < 3; pass++) {
                const scope = manager.createFilterScope(filterId, pass, 'blur');
                manager.updateScopedBuffer(scope, `pass_${pass}_data`, generateTestData(4));
                scopes.push(scope);
            }
            
            // 验证每个Pass都有独立的资源
            for (let i = 0; i < scopes.length; i++) {
                const resource = manager.getResource(scopes[i], `pass_${i}_data`);
                expect(resource).toBeDefined();
                
                // 验证不能访问其他Pass的资源
                for (let j = 0; j < scopes.length; j++) {
                    if (i !== j) {
                        const otherResource = manager.getResource(scopes[i], `pass_${j}_data`);
                        expect(otherResource).toBeUndefined();
                    }
                }
            }
        });
    });

    describe('性能和健康检查', () => {
        it('应该提供准确的性能统计', () => {
            const initialStats = manager.getPerformanceStats();
            
            // 创建一些资源
            const scopes: Array<any> = [];
            for (let i = 0; i < 5; i++) {
                const scope = manager.createFilterScope(`perf_${i}`, 0, 'test');
                manager.updateScopedBuffer(scope, 'perf_buffer', generateTestData(8));
                scopes.push(scope);
            }
            
            const finalStats = manager.getPerformanceStats();
            
            const metrics = verifyPerformanceMetrics(finalStats, {
                maxScopes: 100,  // 更宽松的限制
                maxResources: 100, 
                maxMemoryMB: 50
            });
            
            expect(metrics.passed).toBe(true);
            expect(finalStats.totalScopes).toBeGreaterThan(initialStats.totalScopes);
            expect(finalStats.totalResources).toBeGreaterThan(initialStats.totalResources);
        });

        it('应该提供健康检查功能', () => {
            // 创建正常数量的资源
            for (let i = 0; i < 3; i++) {
                const scope = manager.createFilterScope(`health_${i}`, 0, 'test');
                manager.updateScopedBuffer(scope, 'health_buffer', generateTestData(4));
            }
            
            const health = manager.healthCheck();
            
            expect(health).toBeDefined();
            expect(typeof health.isHealthy).toBe('boolean');
            expect(Array.isArray(health.issues)).toBe(true);
            expect(Array.isArray(health.recommendations)).toBe(true);
        });
    });

    // 全局清理
    afterAll(() => {
        cleanupSharedDevice();
    });
});
