# 🎨 自定义滤镜开发指南

## 🚀 快速开始

自定义滤镜让你能够创建独特的视觉效果，只需要编写WGSL着色器代码和参数配置。

### 最简单的自定义滤镜

```typescript
import { CustomFilterConfig } from '@webgpu-image-filter';

const sepiaFilter: CustomFilterConfig = {
    name: 'sepia',
    displayName: 'Sepia Tone',
    wgslCode: `
        #include vert.wgsl;
        
        struct Uniforms {
            intensity: f32,
        }
        
        @group(0) @binding(0) var mySampler: sampler;
        @group(0) @binding(1) var myTexture: texture_2d<f32>;
        @group(1) @binding(0) var<uniform> sepia_uniforms: Uniforms;
        
        @fragment
        fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
            let rgba = textureSample(myTexture, mySampler, fragUV);
            
            let sepia_r = (rgba.r * 0.393) + (rgba.g * 0.769) + (rgba.b * 0.189);
            let sepia_g = (rgba.r * 0.349) + (rgba.g * 0.686) + (rgba.b * 0.168);
            let sepia_b = (rgba.r * 0.272) + (rgba.g * 0.534) + (rgba.b * 0.131);
            
            let sepia = vec3<f32>(sepia_r, sepia_g, sepia_b);
            let result = mix(rgba.rgb, sepia, sepia_uniforms.intensity);
            
            return vec4<f32>(result, rgba.a);
        }
    `,
    parameters: [{
        key: 'intensity',
        displayName: 'Intensity',
        type: 'float',
        defaultValue: 1.0,
        min: 0.0,
        max: 1.0,
        step: 0.1
    }]
};
```

## 📋 配置接口详解

### CustomFilterConfig 接口

```typescript
interface CustomFilterConfig {
    name: string;           // 滤镜内部标识符（唯一）
    displayName: string;    // 显示名称
    wgslCode: string;       // WGSL着色器代码
    parameters: ParameterConfig[];  // 参数配置数组
}

interface ParameterConfig {
    key: string;            // 参数名（对应uniform变量名）
    displayName: string;    // 参数显示名称
    type: 'float' | 'vec2' | 'vec3' | 'int';  // 参数类型
    defaultValue: number | number[];  // 默认值
    min?: number;           // 最小值（可选）
    max?: number;           // 最大值（可选）
    step?: number;          // 步长（可选）
}
```

## 🎨 常见滤镜效果实现

### 1. 颜色调整类滤镜

#### 对比度调整
```wgsl
struct Uniforms {
    contrast: f32,
}

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // 对比度调整: (color - 0.5) * contrast + 0.5
    let adjusted = (rgba.rgb - 0.5) * contrast_uniforms.contrast + 0.5;
    
    return vec4<f32>(clamp(adjusted, vec3<f32>(0.0), vec3<f32>(1.0)), rgba.a);
}
```

#### 色相偏移
```wgsl
struct Uniforms {
    hue_shift: f32,
}

// RGB转HSV
fn rgb_to_hsv(rgb: vec3<f32>) -> vec3<f32> {
    let max_val = max(max(rgb.r, rgb.g), rgb.b);
    let min_val = min(min(rgb.r, rgb.g), rgb.b);
    let delta = max_val - min_val;
    
    var h: f32 = 0.0;
    if (delta > 0.0) {
        if (max_val == rgb.r) {
            h = (rgb.g - rgb.b) / delta;
        } else if (max_val == rgb.g) {
            h = 2.0 + (rgb.b - rgb.r) / delta;
        } else {
            h = 4.0 + (rgb.r - rgb.g) / delta;
        }
        h = h / 6.0;
        if (h < 0.0) { h = h + 1.0; }
    }
    
    let s = select(0.0, delta / max_val, max_val > 0.0);
    let v = max_val;
    
    return vec3<f32>(h, s, v);
}

// HSV转RGB
fn hsv_to_rgb(hsv: vec3<f32>) -> vec3<f32> {
    let h = hsv.x * 6.0;
    let s = hsv.y;
    let v = hsv.z;
    
    let c = v * s;
    let x = c * (1.0 - abs((h % 2.0) - 1.0));
    let m = v - c;
    
    var rgb: vec3<f32>;
    if (h < 1.0) {
        rgb = vec3<f32>(c, x, 0.0);
    } else if (h < 2.0) {
        rgb = vec3<f32>(x, c, 0.0);
    } else if (h < 3.0) {
        rgb = vec3<f32>(0.0, c, x);
    } else if (h < 4.0) {
        rgb = vec3<f32>(0.0, x, c);
    } else if (h < 5.0) {
        rgb = vec3<f32>(x, 0.0, c);
    } else {
        rgb = vec3<f32>(c, 0.0, x);
    }
    
    return rgb + m;
}

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    let hsv = rgb_to_hsv(rgba.rgb);
    let shifted_h = (hsv.x + hue_uniforms.hue_shift) % 1.0;
    let shifted_hsv = vec3<f32>(shifted_h, hsv.y, hsv.z);
    let result = hsv_to_rgb(shifted_hsv);
    
    return vec4<f32>(result, rgba.a);
}
```

### 2. 几何变换类滤镜

#### 暗角效果
```wgsl
struct Uniforms {
    intensity: f32,
    radius: f32,
}

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // 计算距中心的距离
    let center = vec2<f32>(0.5, 0.5);
    let distance = length(fragUV - center);
    
    // 创建暗角效果
    let vignette = smoothstep(vignette_uniforms.radius, 0.0, distance);
    let factor = mix(1.0 - vignette_uniforms.intensity, 1.0, vignette);
    
    return vec4<f32>(rgba.rgb * factor, rgba.a);
}
```

#### 扭曲效果
```wgsl
struct Uniforms {
    strength: f32,
    center: vec2<f32>,
}

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let center = warp_uniforms.center;
    let strength = warp_uniforms.strength;
    
    let offset = fragUV - center;
    let distance = length(offset);
    let angle = atan2(offset.y, offset.x);
    
    // 螺旋扭曲
    let spiral = angle + strength * distance;
    let distorted_offset = vec2<f32>(
        cos(spiral) * distance,
        sin(spiral) * distance
    );
    
    let distorted_uv = center + distorted_offset;
    
    return textureSample(myTexture, mySampler, distorted_uv);
}
```

### 3. 噪声和纹理滤镜

#### 随机噪声
```wgsl
struct Uniforms {
    intensity: f32,
    seed: f32,
}

// 简单的随机数生成器
fn random(st: vec2<f32>) -> f32 {
    return fract(sin(dot(st.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    let noise = random(fragUV + noise_uniforms.seed) - 0.5;
    let noisy_color = rgba.rgb + noise * noise_uniforms.intensity;
    
    return vec4<f32>(clamp(noisy_color, vec3<f32>(0.0), vec3<f32>(1.0)), rgba.a);
}
```

## 🛠️ 开发工作流程

### 1. 设计滤镜效果
- 确定滤镜的视觉效果目标
- 分析需要哪些可调参数
- 选择合适的数学模型或算法

### 2. 编写WGSL着色器
```wgsl
#include vert.wgsl;  // 包含顶点着色器

// 定义uniform结构体
struct Uniforms {
    param1: f32,
    param2: vec2<f32>,
    // ... 其他参数
}

// 绑定资源
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> your_filter_uniforms: Uniforms;

// 片段着色器主函数
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    // 实现滤镜逻辑
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // ... 滤镜处理 ...
    
    return processed_rgba;
}
```

### 3. 配置参数

```typescript
const myFilter: CustomFilterConfig = {
    name: 'my_filter',
    displayName: 'My Awesome Filter',
    wgslCode: myFilterWgsl,
    parameters: [
        {
            key: 'intensity',
            displayName: 'Effect Intensity',
            type: 'float',
            defaultValue: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.05
        },
        {
            key: 'center',
            displayName: 'Effect Center',
            type: 'vec2',
            defaultValue: [0.5, 0.5],
            min: 0.0,
            max: 1.0,
            step: 0.01
        }
    ]
};
```

### 4. 注册和使用

```typescript
// 注册滤镜
const customFilterManager = new CustomFilterManager();
customFilterManager.registerFilter(myFilter);
renderer.registerCustomFilter(myFilter);

// 使用滤镜
const filterParam = customFilterManager.createFilterParam('my_filter', {
    intensity: 0.8,
    center: [0.3, 0.7]
});

const filters = [filterParam];
const result = renderer.render(image, filters);
```

## 🔍 调试和测试

### 1. 着色器调试技巧

```wgsl
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // 调试技巧1: 可视化UV坐标
    // return vec4<f32>(fragUV, 0.0, 1.0);
    
    // 调试技巧2: 可视化某个计算值
    // let debug_value = some_calculation();
    // return vec4<f32>(debug_value, debug_value, debug_value, 1.0);
    
    // 调试技巧3: 分段显示不同区域
    // if (fragUV.x < 0.5) {
    //     return rgba;  // 左半边显示原图
    // } else {
    //     return processed_rgba;  // 右半边显示处理后的图
    // }
    
    return processed_rgba;
}
```

### 2. 参数验证

```typescript
function validateFilterConfig(config: CustomFilterConfig): string[] {
    const errors: string[] = [];
    
    if (!config.name || config.name.trim() === '') {
        errors.push('Filter name is required');
    }
    
    if (!config.wgslCode || config.wgslCode.trim() === '') {
        errors.push('WGSL code is required');
    }
    
    config.parameters.forEach((param, index) => {
        if (!param.key) {
            errors.push(`Parameter ${index}: key is required`);
        }
        
        if (param.min !== undefined && param.max !== undefined && param.min >= param.max) {
            errors.push(`Parameter ${param.key}: min must be less than max`);
        }
    });
    
    return errors;
}
```

### 3. 性能测试

```typescript
function benchmarkFilter(filterConfig: CustomFilterConfig, testImage: ImageBitmap) {
    const iterations = 100;
    const times: number[] = [];
    
    for (let i = 0; i < iterations; i++) {
        const startTime = performance.now();
        
        // 应用滤镜
        const filterParam = customFilterManager.createFilterParam(filterConfig.name, {
            // 使用默认参数
        });
        renderer.render(testImage, [filterParam]);
        
        const endTime = performance.now();
        times.push(endTime - startTime);
    }
    
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    
    console.log(`Filter "${filterConfig.name}" performance:`);
    console.log(`Average: ${avgTime.toFixed(2)}ms`);
    console.log(`Min: ${minTime.toFixed(2)}ms`);
    console.log(`Max: ${maxTime.toFixed(2)}ms`);
    
    return { avgTime, minTime, maxTime };
}
```

## 🎯 高级技巧

### 1. 使用装饰器模式的自定义滤镜

```typescript
class AdvancedRenderer extends BasicRenderer {
    @multiPass(3, (passIndex: number, properties: any[]) => {
        // 三重效果处理
        const configs = [
            { direction: [1, 0], strength: 0.8 },    // 水平
            { direction: [0, 1], strength: 0.6 },    // 垂直  
            { direction: [0.707, 0.707], strength: 0.4 } // 对角
        ];
        
        return {
            uniforms: {
                direction: new Float32Array(configs[passIndex].direction),
                strength: new Float32Array([configs[passIndex].strength])
            }
        };
    })
    tripleEffect(commandEncoder: GPUCommandEncoder, filterParam: FilterParam) {
        // 基础设置
        this.updateBuffer("effect_uniforms", baseUniforms);
    }
}
```

### 2. 动态参数计算

```typescript
const dynamicFilter: CustomFilterConfig = {
    name: 'dynamic_effect',
    displayName: 'Dynamic Effect',
    wgslCode: effectWgsl,
    parameters: [
        {
            key: 'time',
            displayName: 'Animation Time',
            type: 'float',
            defaultValue: 0.0,
            get dynamicValue() {
                return (Date.now() % 10000) / 10000; // 0-1 循环
            }
        }
    ]
};
```

### 3. 滤镜组合和链式调用

```typescript
class FilterChain {
    private filters: Array<{ config: CustomFilterConfig; params: any }> = [];
    
    add(filterName: string, params: any): FilterChain {
        const config = customFilterManager.getFilter(filterName);
        if (config) {
            this.filters.push({ config, params });
        }
        return this;
    }
    
    apply(image: ImageBitmap): HTMLCanvasElement {
        const filterParams = this.filters.map(({ config, params }) =>
            customFilterManager.createFilterParam(config.name, params)
        );
        
        return renderer.render(image, filterParams);
    }
}

// 使用示例
const result = new FilterChain()
    .add('sepia', { intensity: 0.7 })
    .add('vignette', { intensity: 0.5, radius: 0.8 })
    .add('noise', { intensity: 0.1 })
    .apply(inputImage);
```

## 📚 参考资源

### WGSL语法参考
- [WGSL规范](https://www.w3.org/TR/WGSL/)
- [WebGPU基础教程](https://webgpufundamentals.org/)
- [GPU Gems着色器技巧](https://developer.nvidia.com/gpugems)

### 图像处理算法
- [数字图像处理 - 冈萨雷斯](https://www.imageprocessingplace.com/)
- [Real-Time Rendering](https://www.realtimerendering.com/)
- [Shadertoy社区](https://www.shadertoy.com/) - 着色器效果参考

### 最佳实践文章
- [WebGPU最佳实践](https://toji.github.io/webgpu-best-practices/)
- [GPU性能优化指南](https://developer.nvidia.com/gpu-performance-optimization)

通过遵循这些指南和最佳实践，你可以创建出高效、美观的自定义图像滤镜！
