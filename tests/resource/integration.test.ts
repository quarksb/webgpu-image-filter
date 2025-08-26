/**
 * 集成测试 - 简化版本
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { Manager } from '../../src/webgpu/resource/manager';
import { ConfigManager } from '../../src/webgpu/resource/config_manager';
import { FactoryManager } from '../../src/webgpu/resource/factory';
import { getSharedGPUDevice, setupTestEnvironment } from './test-utils';

setupTestEnvironment();

describe('资源管理系统 - 集成测试', () => {
    let device: any;
    let manager: Manager;
    let configManager: ConfigManager;
    let factoryManager: FactoryManager;

    beforeEach(async () => {
        device = await getSharedGPUDevice();
        manager = new Manager(device);
        configManager = new ConfigManager(device);
        factoryManager = new FactoryManager();
    });

    it('应该能够创建完整的资源管理系统', () => {
        expect(manager).toBeDefined();
        expect(configManager).toBeDefined();
        expect(factoryManager).toBeDefined();
    });

    it('应该能够创建和管理作用域', () => {
        const scope = manager.createFilterScope('integration_test');
        expect(scope).toBeDefined();
        expect(scope.filterId).toBe('integration_test');
        manager.cleanupScope(scope);
    });

    it('应该能够处理基本的缓冲区更新', () => {
        const scope = manager.createFilterScope('buffer_test');
        const testData = new Float32Array([1, 2, 3, 4]);
        
        manager.updateScopedBuffer(scope, 'test_buffer', testData);
        const resource = manager.getResource(scope, 'test_buffer');
        expect(resource).toBeDefined();
        
        manager.cleanupScope(scope);
    });

    it('应该能够隔离不同作用域的资源', () => {
        const scope1 = manager.createFilterScope('isolation_test_1');
        const scope2 = manager.createFilterScope('isolation_test_2');
        
        const data1 = new Float32Array([1, 2, 3, 4]);
        const data2 = new Float32Array([5, 6, 7, 8]);
        
        manager.updateScopedBuffer(scope1, 'shared_name', data1);
        manager.updateScopedBuffer(scope2, 'shared_name', data2);
        
        const scope1Resource = manager.getResource(scope1, 'shared_name');
        const scope2Resource = manager.getResource(scope2, 'shared_name');
        
        expect(scope1Resource).toBeDefined();
        expect(scope2Resource).toBeDefined();
        expect(scope1Resource).not.toBe(scope2Resource);
        
        manager.cleanupScope(scope1);
        manager.cleanupScope(scope2);
    });
});
