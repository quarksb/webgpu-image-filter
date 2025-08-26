/**
 * 工厂管理器测试 - 简化版本
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { FactoryManager } from '../../src/webgpu/resource/factory';
import { ResourceConfigType } from '../../src/webgpu/resource/config';
import { getSharedGPUDevice, setupTestEnvironment } from './test-utils';

setupTestEnvironment();

describe('FactoryManager - 工厂管理器测试', () => {
    let factoryManager: FactoryManager;
    let device: any;

    beforeEach(async () => {
        device = await getSharedGPUDevice();
        factoryManager = new FactoryManager();
    });

    it('应该能够创建工厂管理器实例', () => {
        expect(factoryManager).toBeDefined();
        expect(factoryManager.createResource).toBeDefined();
        expect(factoryManager.updateResource).toBeDefined();
    });

    it('应该能够处理单一缓冲区配置', () => {
        const config = {
            type: ResourceConfigType.SINGLE_BUFFER as const,
            usage: 80,
            size: 16,
            initialData: new Float32Array([1, 2, 3, 4])
        };

        const mockContext = {
            device,
            width: 512,
            height: 512,
            passIndex: 0,
            filterType: 'test',
            params: { value: 1.0 }
        };

        const result = factoryManager.createResource(config, mockContext);
        expect(result).toBeDefined();
    });

    it('应该能够处理纹理配置', () => {
        const config = {
            type: ResourceConfigType.TEXTURE as const,
            usage: 20,
            width: 512,
            height: 512,
            format: 'rgba8unorm' as const
        };

        const mockContext = {
            device,
            width: 512,
            height: 512,
            passIndex: 0,
            filterType: 'test',
            params: { value: 1.0 }
        };

        const result = factoryManager.createResource(config, mockContext);
        expect(result).toBeDefined();
    });

    it('应该能够处理采样器配置', () => {
        const config = {
            type: ResourceConfigType.SAMPLER as const,
            descriptor: {
                magFilter: 'linear' as const,
                minFilter: 'linear' as const,
                addressModeU: 'clamp-to-edge' as const,
            }
        };

        const mockContext = {
            device,
            width: 512,
            height: 512,
            passIndex: 0,
            filterType: 'test',
            params: { value: 1.0 }
        };

        const result = factoryManager.createResource(config, mockContext);
        expect(result).toBeDefined();
    });
});
