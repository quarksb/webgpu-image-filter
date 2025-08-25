import { BasicRenderer } from "../renderer";
import { multiPass, BlurDecorator } from "../decorators/multi_pass";
import type { FilterParam, BlurFilterParam } from "../utils/type";

/**
 * 演示装饰器滤镜的测试类
 * 展示不同装饰器的使用场景和效果
 */
export class DecoratorFilterDemo {
    private renderer: BasicRenderer;

    constructor(device: GPUDevice) {
        this.renderer = new BasicRenderer(device);
    }

    /**
     * 测试标准blur装饰器
     */
    async testBlurDecorator() {
        console.log('=== 测试 Blur 装饰器 ===');
        
        const blurParam: BlurFilterParam = {
            filterType: 'blur',
            properties: [{ key: 'intensity', value: 5 }]
        };

        const commandEncoder = this.renderer.device.createCommandEncoder();
        
        // 使用装饰器版本的blur - 自动执行水平+垂直两个Pass
        this.renderer.blur(commandEncoder, blurParam);
        
        console.log('Blur 装饰器测试完成');
    }

    /**
     * 测试运动模糊装饰器
     */
    async testMotionBlur() {
        console.log('=== 测试 Motion Blur 装饰器 ===');
        
        const motionParam: FilterParam = {
            filterType: 'motionBlur',
            properties: [{ key: 'intensity', value: 3 }]
        };

        const commandEncoder = this.renderer.device.createCommandEncoder();
        
        // 使用双方向装饰器 - 自动执行两个特定方向的模糊
        this.renderer.motionBlur(commandEncoder, motionParam);
        
        console.log('Motion Blur 装饰器测试完成');
    }

    /**
     * 测试交叉模糊装饰器
     */
    async testCrossBlur() {
        console.log('=== 测试 Cross Blur 装饰器 ===');
        
        const crossParam: FilterParam = {
            filterType: 'crossBlur',
            properties: [{ key: 'intensity', value: 2.5 }]
        };

        const commandEncoder = this.renderer.device.createCommandEncoder();
        
        // 使用自定义多Pass装饰器 - 执行水平、垂直、对角线三个方向
        this.renderer.crossBlur(commandEncoder, crossParam);
        
        console.log('Cross Blur 装饰器测试完成');
    }

    /**
     * 测试渐进式模糊装饰器
     */
    async testProgressiveBlur() {
        console.log('=== 测试 Progressive Blur 装饰器 ===');
        
        const progressiveParam: FilterParam = {
            filterType: 'progressiveBlur',
            properties: [{ key: 'intensity', value: 4 }]
        };

        const commandEncoder = this.renderer.device.createCommandEncoder();
        
        // 使用渐进强度装饰器 - 执行强度递减的4个Pass
        this.renderer.progressiveBlur(commandEncoder, progressiveParam);
        
        console.log('Progressive Blur 装饰器测试完成');
    }

    /**
     * 运行所有装饰器测试
     */
    async runAllTests() {
        console.log('🎭 开始装饰器滤镜演示\n');
        
        await this.testBlurDecorator();
        console.log('');
        
        await this.testMotionBlur();
        console.log('');
        
        await this.testCrossBlur();
        console.log('');
        
        await this.testProgressiveBlur();
        console.log('');
        
        console.log('✅ 所有装饰器测试完成！');
        
        this.printDecoratorsComparison();
    }

    /**
     * 输出装饰器方案与传统方案的对比
     */
    private printDecoratorsComparison() {
        console.log('\n📊 装饰器方案 vs 传统方案对比：\n');
        
        console.log('🔴 传统方案 (blur方法):');
        console.log(`
        blur(commandEncoder, filterParam) {
            // 1. 基础设置
            this.filter(commandEncoder, filterParam);
            this.updateBuffer("blur_uniforms", new Float32Array([value, 0, width, height]));
            
            // 2. 手动多Pass循环
            for (let i = 0; i < 2; i++) {
                const { inputTexture, targetTexture } = this.getTexture();
                this.setCommandBuffer({
                    commandEncoder, pipelineData, inputTexture, targetTexture, index: i
                });
            }
        }`);

        console.log('\n🟢 装饰器方案 (blur方法):');
        console.log(`
        @BlurDecorator({ profiler: true })
        blur(commandEncoder, filterParam) {
            // 只关心核心业务逻辑
            const { value } = filterParam.properties[0];
            this.updateBuffer("blur_uniforms", new Float32Array([value]));
            
            // 多Pass逻辑完全由装饰器处理 ✨
        }`);

        console.log('\n📈 优势总结:');
        console.log('  ✅ 代码减少 70%+ 行数');
        console.log('  ✅ 关注点完全分离');  
        console.log('  ✅ 可复用多种装饰器');
        console.log('  ✅ 声明式配置');
        console.log('  ✅ 类型安全');
        console.log('  ✅ 易于测试和调试');
    }
}

// 装饰器使用示例和最佳实践
export class DecoratorBestPractices {
    
    /**
     * 示例1: 创建自定义装饰器
     */
    static createCustomDecorator() {
        // 径向模糊装饰器
        const RadialBlurDecorator = multiPass(
            6, // 6个Pass
            (passIndex: number, properties: any[]) => {
                const intensity = properties[0]?.value || 1;
                const angle = (passIndex * Math.PI * 2) / 6; // 每个Pass 60度
                const direction = [Math.cos(angle), Math.sin(angle)];
                
                return {
                    uniforms: {
                        blur_uniforms: new Float32Array([intensity * 0.8]),
                        direction: new Float32Array(direction)
                    }
                };
            },
            { profiler: true, debug: false }
        );

        return RadialBlurDecorator;
    }

    /**
     * 示例2: 装饰器组合
     */
    static combineDecorators() {
        // 可以通过工厂函数组合多个装饰器
        const AdvancedBlurDecorator = (options: any) => {
            const baseDecorator = BlurDecorator(options);
            
            // 可以添加额外的逻辑
            return function(target: any, propertyName: string, descriptor: PropertyDescriptor) {
                // 先应用基础装饰器
                baseDecorator(target, propertyName, descriptor);
                
                // 然后添加自定义逻辑
                const originalMethod = descriptor.value;
                descriptor.value = function(...args: any[]) {
                    console.log(`[Advanced] Starting ${propertyName}`);
                    const result = originalMethod.apply(this, args);
                    console.log(`[Advanced] Finished ${propertyName}`);
                    return result;
                };
            };
        };

        return AdvancedBlurDecorator;
    }

    /**
     * 示例3: 条件装饰器
     */
    static createConditionalDecorator() {
        const ConditionalBlurDecorator = (condition: () => boolean) =>
            multiPass(
                condition() ? 2 : 1, // 根据条件决定Pass数量
                (passIndex: number) => ({
                    uniforms: {
                        direction: new Float32Array(passIndex === 0 ? [1, 0] : [0, 1])
                    }
                })
            );

        return ConditionalBlurDecorator;
    }
}
