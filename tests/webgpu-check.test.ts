/**
 * WebGPU环境检查测试
 * 确定是否需要Mock WebGPU API还是可以使用真实的WebGPU
 */

import { describe, it, expect } from 'vitest';

describe('WebGPU环境检查', () => {
    it('应该检查浏览器是否支持WebGPU', async () => {
        console.log('🔍 检查WebGPU支持情况...');
        
        // 检查navigator.gpu是否存在
        const hasNavigatorGpu = 'gpu' in navigator;
        console.log('navigator.gpu存在:', hasNavigatorGpu);
        
        if (hasNavigatorGpu) {
            try {
                // 尝试请求GPU适配器
                const gpu = (navigator as any).gpu;
                const adapter = await gpu.requestAdapter();
                console.log('GPU适配器:', adapter ? '✅ 可用' : '❌ 不可用');
                
                if (adapter) {
                    // 尝试请求设备
                    const device = await adapter.requestDevice();
                    console.log('GPU设备:', device ? '✅ 可用' : '❌ 不可用');
                    
                    if (device) {
                        console.log('🎉 WebGPU完全可用，不需要Mock!');
                        console.log('设备限制:', device.limits);
                        console.log('支持的功能:', Array.from(device.features));
                    }
                }
            } catch (error) {
                console.log('❌ WebGPU访问失败:', error);
                console.log('💡 需要使用Mock WebGPU');
            }
        } else {
            console.log('❌ navigator.gpu不存在');
            console.log('💡 需要使用Mock WebGPU');
        }
        
        // 检查WebGPU常量
        console.log('GPUBufferUsage:', typeof (globalThis as any).GPUBufferUsage !== 'undefined' ? '✅ 存在' : '❌ 不存在');
        console.log('GPUTextureUsage:', typeof (globalThis as any).GPUTextureUsage !== 'undefined' ? '✅ 存在' : '❌ 不存在');
        
        // 这个测试总是通过，只是用来输出信息
        expect(true).toBe(true);
    });
    
    it('应该检查Chrome flags设置', () => {
        console.log('🏁 检查可能需要的Chrome flags:');
        console.log('--enable-unsafe-webgpu: 启用WebGPU (可能需要)');
        console.log('--disable-web-security: 禁用web安全限制');
        console.log('--enable-features=Vulkan: 启用Vulkan后端');
        console.log('--use-angle=vulkan: 使用ANGLE Vulkan');
        
        // 检查user agent信息
        console.log('User Agent:', navigator.userAgent);
        
        expect(true).toBe(true);
    });
});
