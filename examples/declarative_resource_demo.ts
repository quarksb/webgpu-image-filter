/**
 * 声明式资源配置系统使用示例
 * 展示如何通过配置文件而非硬编码来管理滤镜资源
 */

import { ConfigManager } from "../src/webgpu/resource";
import { FILTER_RESOURCE_CONFIGS } from "../src/webgpu/resource";

// 模拟WebGPU设备
class MockDevice {
    createBuffer(desc: any) {
        return {
            size: desc.size,
            usage: desc.usage,
            getMappedRange: () => new ArrayBuffer(desc.size || 16),
            unmap: () => {},
        };
    }
    queue = { writeBuffer: () => {} };
}

/**
 * 演示：声明式配置vs硬编码方式
 */
function demonstrateDeclarativeApproach() {
    console.log("=== 声明式资源配置系统演示 ===\\n");
    
    const mockDevice = new MockDevice() as any;
    const manager = new ConfigManager(mockDevice);
    
    // 1. 查看可用的滤镜配置
    console.log("📋 可用的滤镜配置:");
    Object.keys(FILTER_RESOURCE_CONFIGS).forEach(filterName => {
        const config = FILTER_RESOURCE_CONFIGS[filterName];
        console.log(`  - ${filterName} (${config.passCount || 1} passes): ${Object.keys(config.resources).join(', ')}`);
    });
    
    // 2. 创建单通道滤镜资源
    console.log("\\n🔧 创建亮度滤镜资源:");
    const brightnessResources = manager.createResourcesForFilter('brightness', {
        brightness: 1.5
    }, {
        width: 1024,
        height: 768
    });
    console.log("  创建的资源:", Object.keys(brightnessResources));
    
    // 3. 创建多通道滤镜资源
    console.log("\\n🔧 创建模糊滤镜资源 (双通道):");
    const blurResources = manager.createMultiPassResources('blur', {
        sigma: 2.0
    }, {
        width: 1024,
        height: 768
    });
    console.log("  创建的通道资源:", Object.keys(blurResources));
    console.log("  第0通道资源:", Object.keys(blurResources[0] || {}));
    console.log("  第1通道资源:", Object.keys(blurResources[1] || {}));
    
    // 4. 动态计算资源演示
    console.log("\\n🔧 创建噪声滤镜资源 (动态计算):");
    const noiseResources = manager.createResourcesForFilter('noise', {
        intensity: 0.1
    }, {
        width: 1024,
        height: 768
    });
    console.log("  创建的资源:", Object.keys(noiseResources));
    
    // 5. 更新资源参数
    console.log("\\n🔄 更新资源参数:");
    const updatedResource = manager.updateResourceParameter(
        'brightness',
        'brightness_uniforms', 
        new Float32Array([2.0]),
        { width: 1024, height: 768 }
    );
    console.log("  更新完成");
    
    // 6. 滤镜配置查询
    console.log("\\n❓ 滤镜配置查询:");
    console.log("  blur是多通道滤镜:", manager.isMultiPassFilter('blur'));
    console.log("  crossBlur通道数量:", manager.getPassCount('crossBlur'));
    console.log("  brightness是多通道滤镜:", manager.isMultiPassFilter('brightness'));
    
    console.log("\\n✅ 声明式配置系统演示完成!");
    console.log("\\n💡 优势总结:");
    console.log("  - 无需硬编码direction参数处理逻辑");
    console.log("  - 通过配置文件定义资源创建规则");
    console.log("  - 支持动态计算和缓存策略");
    console.log("  - 完全的类型安全和扩展性");
    
    return manager;
}

/**
 * 展示如何扩展配置系统
 */
function demonstrateExtensibility() {
    console.log("\\n=== 配置系统扩展性演示 ===\\n");
    
    // 展示如何添加新的滤镜配置
    console.log("📝 添加新的滤镜配置:");
    console.log(`
// 在resource_config.ts中添加新配置:
customWave: {
    filterType: 'customWave',
    passCount: 3,
    resources: {
        waveParams: {
            type: ResourceConfigType.COMPUTED_BUFFER,
            computer: (context) => {
                const time = Date.now() / 1000;
                return new Float32Array([
                    Math.sin(time), 
                    Math.cos(time), 
                    context.passIndex || 0
                ]);
            }
        }
    }
}
    `);
    
    console.log("✨ 无需修改核心逻辑，即可支持新的滤镜类型!");
}

// 运行演示
if (typeof window === 'undefined') {
    // Node.js环境
    demonstrateDeclarativeApproach();
    demonstrateExtensibility();
}

export { demonstrateDeclarativeApproach, demonstrateExtensibility };
