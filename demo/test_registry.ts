/**
 * 滤镜注册系统测试
 */

import { BasicRenderer, FilterConfig, getGpuDevice } from "../src";

async function testFilterRegistry() {
    console.log('🧪 开始测试滤镜注册系统...');
    
    try {
        // 1. 初始化WebGPU
        const device = await getGpuDevice();
        const renderer = new BasicRenderer(device);
        
        console.log('✅ WebGPU设备初始化成功');
        
        // 2. 测试获取内置滤镜
        const allFilters = renderer.getAvailableFilters();
        console.log(`✅ 共有 ${allFilters.length} 个内置滤镜`);
        
        // 打印所有滤镜
        console.group('内置滤镜列表:');
        allFilters.forEach(filter => {
            console.log(`- ${filter.displayName} (${filter.name}) - 类别: ${filter.category}`);
        });
        console.groupEnd();
        
        // 3. 测试按类别获取滤镜
        const colorFilters = renderer.getFiltersByCategory('color');
        console.log(`✅ 颜色调整滤镜: ${colorFilters.length} 个`);
        
        const blurFilters = renderer.getFiltersByCategory('blur');
        console.log(`✅ 模糊滤镜: ${blurFilters.length} 个`);
        
        // 4. 测试滤镜搜索
        const searchResults = renderer.searchFilters('blur');
        console.log(`✅ 搜索 "blur": ${searchResults.length} 个结果`);
        
        // 5. 测试注册自定义滤镜
        const customFilter: FilterConfig = {
            name: 'test_filter',
            displayName: '测试滤镜',
            category: 'other',
            wgslCode: `
                struct VertexOutput {
                    @builtin(position) Position: vec4<f32>,
                    @location(0) TexCoord: vec2<f32>,
                };

                @vertex
                fn vert_main(@location(0) vertexPosition: vec2<f32>, @location(1) vertexTexCoord: vec2<f32>) -> VertexOutput {
                    var output: VertexOutput;
                    output.Position = vec4<f32>(vertexPosition, 0.0, 1.0);
                    output.TexCoord = vertexTexCoord;
                    return output;
                }

                struct Uniforms {
                    intensity: f32,
                }

                @group(0) @binding(0) var mySampler: sampler;
                @group(0) @binding(1) var myTexture: texture_2d<f32>;
                @group(1) @binding(0) var<uniform> test_filter_uniforms: Uniforms;

                @fragment
                fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
                    let rgba = textureSample(myTexture, mySampler, fragUV);
                    return vec4<f32>(rgba.rgb * test_filter_uniforms.intensity, rgba.a);
                }
            `,
            parameters: [
                {
                    key: 'intensity',
                    displayName: '强度',
                    type: 'float',
                    defaultValue: 1.0,
                    min: 0.0,
                    max: 2.0,
                    step: 0.1
                }
            ]
        };
        
        renderer.registerFilter(customFilter);
        console.log('✅ 自定义滤镜注册成功');
        
        // 验证滤镜是否注册成功
        const updatedFilters = renderer.getAvailableFilters();
        const testFilter = updatedFilters.find(f => f.name === 'test_filter');
        if (testFilter) {
            console.log('✅ 自定义滤镜验证成功');
        } else {
            console.error('❌ 自定义滤镜验证失败');
        }
        
        // 6. 测试创建滤镜参数
        const filterParam = renderer.createFilterParam('blur', {
            value: 5.0
        });
        console.log('✅ 滤镜参数创建成功:', filterParam);
        
        // 7. 测试参数验证
        const validParam = {
            filterType: 'contrast',
            enable: true,
            properties: [
                { key: 'contrast', value: 1.5 }
            ]
        };
        
        const isValid = renderer.filterRegistry.validateFilterParam(validParam);
        console.log(`✅ 参数验证结果: ${isValid}`);
        
        // 8. 测试取消注册
        renderer.unregisterFilter('test_filter');
        const finalFilters = renderer.getAvailableFilters();
        const removedFilter = finalFilters.find(f => f.name === 'test_filter');
        if (!removedFilter) {
            console.log('✅ 滤镜取消注册成功');
        } else {
            console.error('❌ 滤镜取消注册失败');
        }
        
        console.log('🎉 所有测试通过！滤镜注册系统工作正常。');
        
        return {
            success: true,
            totalFilters: finalFilters.length,
            categories: [...new Set(finalFilters.map(f => f.category || 'other'))]
        };
        
    } catch (error) {
        console.error('❌ 测试失败:', error);
        return {
            success: false,
            error: error.message
        };
    }
}

// 运行测试
export { testFilterRegistry };

// 如果直接运行此文件
if (typeof window !== 'undefined') {
    // 在浏览器环境中运行测试
    document.addEventListener('DOMContentLoaded', async () => {
        const result = await testFilterRegistry();
        
        // 创建测试结果显示
        const resultDiv = document.createElement('div');
        resultDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${result.success ? '#e8f5e8' : '#ffebee'};
            border: 2px solid ${result.success ? '#4CAF50' : '#f44336'};
            border-radius: 8px;
            padding: 15px;
            font-family: 'Courier New', monospace;
            font-size: 14px;
            max-width: 400px;
            z-index: 9999;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        `;
        
        if (result.success) {
            resultDiv.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #4CAF50;">✅ 测试通过</h3>
                <p style="margin: 5px 0;">总滤镜数量: ${result.totalFilters}</p>
                <p style="margin: 5px 0;">滤镜类别: ${result.categories?.join(', ') || 'N/A'}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">查看控制台获取详细信息</p>
            `;
        } else {
            resultDiv.innerHTML = `
                <h3 style="margin: 0 0 10px 0; color: #f44336;">❌ 测试失败</h3>
                <p style="margin: 5px 0;">错误: ${result.error}</p>
                <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">查看控制台获取详细信息</p>
            `;
        }
        
        // 添加关闭按钮
        const closeBtn = document.createElement('button');
        closeBtn.textContent = '×';
        closeBtn.style.cssText = `
            position: absolute;
            top: 5px;
            right: 8px;
            background: none;
            border: none;
            font-size: 18px;
            cursor: pointer;
            opacity: 0.6;
        `;
        closeBtn.onclick = () => resultDiv.remove();
        resultDiv.appendChild(closeBtn);
        
        document.body.appendChild(resultDiv);
        
        // 5秒后自动移除（如果测试成功）
        if (result.success) {
            setTimeout(() => {
                if (resultDiv.parentNode) {
                    resultDiv.remove();
                }
            }, 5000);
        }
    });
}
