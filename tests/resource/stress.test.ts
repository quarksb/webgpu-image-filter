/**
 * 并发和压力测试 - 简化版本
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Manager } from '../../src/webgpu/resource/manager';
import { getSharedGPUDevice, setupTestEnvironment } from './test-utils';

setupTestEnvironment();

describe('并发和压力测试', () => {
    let manager: Manager;
    let device: any;

    beforeEach(async () => {
        device = await getSharedGPUDevice();
        manager = new Manager(device);
    });

    it('应该处理大量作用域创建', () => {
        const scopes = [];
        
        // 创建大量作用域
        for (let i = 0; i < 50; i++) {
            const scope = manager.createFilterScope(`stress_${i}`, 0, 'test');
            manager.updateScopedBuffer(scope, 'test_param', new Float32Array([i]));
            scopes.push(scope);
        }

        // 验证所有作用域都正常创建
        scopes.forEach((scope, index) => {
            const resource = manager.getResource(scope, 'test_param');
            expect(resource).toBeDefined();
        });

        // 清理所有作用域
        scopes.forEach(scope => manager.cleanupScope(scope));
    });

    it('应该处理快速创建和销毁循环', () => {
        for (let cycle = 0; cycle < 20; cycle++) {
            const scope = manager.createFilterScope(`cycle_${cycle}`, 0, 'test');
            manager.updateScopedBuffer(scope, 'cycle_param', new Float32Array([cycle]));
            
            const resource = manager.getResource(scope, 'cycle_param');
            expect(resource).toBeDefined();
            
            manager.cleanupScope(scope);
        }
    });

    it('应该处理复杂的多Pass场景', () => {
        const filterName = 'complex_multipass';
        const scopes = [];
        
        // 创建多个Pass
        for (let pass = 0; pass < 8; pass++) {
            const scope = manager.createFilterScope(filterName, pass, 'blur');
            manager.updateScopedBuffer(scope, `pass_${pass}_data`, new Float32Array([pass, pass * 2]));
            scopes.push(scope);
        }

        // 验证每个Pass都有独立的资源
        scopes.forEach((scope, passIndex) => {
            const resource = manager.getResource(scope, `pass_${passIndex}_data`);
            expect(resource).toBeDefined();
        });

        // 清理所有Pass
        scopes.forEach(scope => manager.cleanupScope(scope));
    });

    it('应该处理大数据缓冲区', () => {
        const scope = manager.createFilterScope('large_buffer', 0, 'test');
        
        // 创建较大的数据缓冲区
        const largeData = new Float32Array(1000);
        for (let i = 0; i < largeData.length; i++) {
            largeData[i] = Math.sin(i * 0.1);
        }
        
        manager.updateScopedBuffer(scope, 'large_data', largeData);
        const resource = manager.getResource(scope, 'large_data');
        
        expect(resource).toBeDefined();
        
        manager.cleanupScope(scope);
    });

    it('应该监控性能指标', () => {
        const scopes = [];
        
        // 创建一定数量的资源
        for (let i = 0; i < 20; i++) {
            const scope = manager.createFilterScope(`perf_monitor_${i}`, 0, 'test');
            manager.updateScopedBuffer(scope, 'monitor_param', new Float32Array([i]));
            scopes.push(scope);
        }

        const stats = manager.getPerformanceStats();
        expect(stats).toBeDefined();
        expect(stats.totalResources).toBeGreaterThan(15);
        expect(stats.activeScopes).toBeGreaterThan(15);

        // 清理资源
        scopes.forEach(scope => manager.cleanupScope(scope));
        
        // 验证清理后的统计
        const statsAfter = manager.getPerformanceStats();
        expect(statsAfter.totalResources).toBeLessThan(stats.totalResources);
    });
});