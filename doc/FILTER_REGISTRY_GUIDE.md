# 滤镜注册机制使用指南

## 概述

WebGPU Image Filter 现在支持完整的滤镜注册机制，允许开发者动态注册、管理和使用各种图像滤镜，包括内置滤镜和自定义滤镜。

## 核心特性

- ✅ **统一的滤镜管理**: 所有滤镜（内置和自定义）都通过统一的注册系统管理
- ✅ **动态注册**: 运行时动态注册和注销滤镜
- ✅ **参数验证**: 自动验证滤镜参数的类型和范围
- ✅ **分类管理**: 支持按类别组织滤镜
- ✅ **搜索功能**: 支持名称和类别搜索
- ✅ **自定义处理器**: 支持为特殊滤镜（如多Pass滤镜）注册自定义处理逻辑
- ✅ **向后兼容**: 保持与现有API的兼容性

## 基本使用

### 创建渲染器

```typescript
import { BasicRenderer } from 'webgpu-image-filter';

// 获取WebGPU设备
const adapter = await navigator.gpu.requestAdapter();
const device = await adapter.requestDevice();

// 创建渲染器（自动注册内置滤镜）
const renderer = new BasicRenderer(device);
```

### 查看可用滤镜

```typescript
// 获取所有可用滤镜
const allFilters = renderer.getAvailableFilters();
console.log('可用滤镜:', allFilters);

// 按类别获取滤镜
const colorFilters = renderer.getFiltersByCategory('color');
const blurFilters = renderer.getFiltersByCategory('blur');

// 搜索滤镜
const noiseFilters = renderer.searchFilters('noise');
```

### 使用内置滤镜

```typescript
// 方式1: 使用预设参数
const blurParam = renderer.createFilterParam('blur', {
    value: 5.0  // 模糊半径
});

// 方式2: 手动创建参数
const contrastParam = {
    filterType: 'contrast',
    enable: true,
    properties: [
        { key: 'contrast', value: 1.5 }
    ]
};

// 渲染图像
const canvas = renderer.render(imageSource, [blurParam, contrastParam], 'cache-key');
```

## 注册自定义滤镜

### 简单滤镜

```typescript
import { FilterConfig } from 'webgpu-image-filter';

// 定义自定义滤镜配置
const customFilter: FilterConfig = {
    name: 'negative',
    displayName: '负片效果',
    category: 'color',
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

        @group(0) @binding(0) var mySampler: sampler;
        @group(0) @binding(1) var myTexture: texture_2d<f32>;

        @fragment
        fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
            let rgba = textureSample(myTexture, mySampler, fragUV);
            return vec4<f32>(1.0 - rgba.rgb, rgba.a);
        }
    `,
    parameters: [] // 无参数
};

// 注册滤镜
renderer.registerFilter(customFilter);

// 使用自定义滤镜
const negativeParam = renderer.createFilterParam('negative', {});
```

### 带参数的滤镜

```typescript
const vignetteFilter: FilterConfig = {
    name: 'custom_vignette',
    displayName: '自定义晕影',
    category: 'artistic',
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
            radius: f32,
            color: vec3<f32>,
        }

        @group(0) @binding(0) var mySampler: sampler;
        @group(0) @binding(1) var myTexture: texture_2d<f32>;
        @group(1) @binding(0) var<uniform> custom_vignette_uniforms: Uniforms;

        @fragment
        fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
            let rgba = textureSample(myTexture, mySampler, fragUV);
            
            let center = vec2<f32>(0.5, 0.5);
            let dist = distance(fragUV, center);
            let vignette = smoothstep(custom_vignette_uniforms.radius, 0.0, dist);
            vignette = 1.0 - custom_vignette_uniforms.intensity * (1.0 - vignette);
            
            let result = rgba.rgb * vignette + custom_vignette_uniforms.color * (1.0 - vignette);
            
            return vec4<f32>(result, rgba.a);
        }
    `,
    parameters: [
        {
            key: 'intensity',
            displayName: '强度',
            type: 'float',
            defaultValue: 0.5,
            min: 0.0,
            max: 1.0,
            step: 0.1
        },
        {
            key: 'radius',
            displayName: '半径',
            type: 'float',
            defaultValue: 0.8,
            min: 0.1,
            max: 1.0,
            step: 0.05
        },
        {
            key: 'color',
            displayName: '晕影颜色',
            type: 'vec3',
            defaultValue: [0.0, 0.0, 0.0] // 黑色
        }
    ]
};

renderer.registerFilter(vignetteFilter);

// 使用带参数的滤镜
const vignetteParam = renderer.createFilterParam('custom_vignette', {
    intensity: 0.7,
    radius: 0.6,
    color: [0.2, 0.1, 0.0] // 深褐色
});
```

### 自定义处理器（高级）

```typescript
// 为需要特殊处理的滤镜注册自定义处理器
const specialProcessor: FilterProcessor = (commandEncoder, filterParam) => {
    // 自定义处理逻辑
    console.log('执行特殊处理:', filterParam.filterType);
    
    // 可以调用renderer的其他方法
    // 注意：这里需要访问renderer实例
};

renderer.registerFilter(customFilterConfig, specialProcessor);
```

## 滤镜链组合

```typescript
// 创建复合滤镜效果
const filterChain = [
    renderer.createFilterParam('brightness', { brightness: 0.1 }),
    renderer.createFilterParam('contrast', { contrast: 1.2 }),
    renderer.createFilterParam('saturation', { saturation: 1.3 }),
    renderer.createFilterParam('blur', { value: 1.0 }),
    renderer.createFilterParam('vignette', { intensity: 0.3, radius: 0.8 })
];

// 应用滤镜链
const result = renderer.render(imageSource, filterChain, 'complex-effect');
```

## 动态滤镜管理

```typescript
// 检查滤镜是否存在
if (renderer.hasFilter('my_filter')) {
    console.log('滤镜已存在');
}

// 注销滤镜
renderer.unregisterFilter('old_filter');

// 重新注册更新的滤镜
renderer.registerFilter(updatedFilterConfig);
```

## 参数验证

```typescript
// 创建滤镜参数时会自动验证
try {
    const param = renderer.createFilterParam('blur', {
        value: -1 // 无效值（小于最小值）
    });
} catch (error) {
    console.error('参数验证失败:', error.message);
}

// 手动验证参数
const filterParam = {
    filterType: 'contrast',
    enable: true,
    properties: [
        { key: 'contrast', value: 2.5 }
    ]
};

const isValid = renderer.filterRegistry.validateFilterParam(filterParam);
if (!isValid) {
    console.warn('参数验证失败');
}
```

## 内置滤镜类别

- **blur**: 模糊效果 (`blur`)
- **color**: 颜色调整 (`brightness`, `contrast`, `saturation`, `hue_shift`)
- **distortion**: 扭曲效果 (`warp`)
- **noise**: 噪声效果 (`noise`)
- **artistic**: 艺术效果 (`sepia`, `vignette`)
- **other**: 其他 (`copy`)

## 性能优化

1. **Pipeline缓存**: 滤镜的GPU Pipeline会自动缓存，避免重复编译
2. **参数验证缓存**: 已验证的参数不会重复验证
3. **按需注册**: 只注册实际使用的滤镜以节省内存

## 错误处理

```typescript
// 捕获滤镜注册错误
try {
    renderer.registerFilter(invalidFilterConfig);
} catch (error) {
    console.error('滤镜注册失败:', error.message);
}

// 捕获滤镜应用错误
const filterParam = {
    filterType: 'nonexistent_filter',
    enable: true,
    properties: []
};

// 渲染器会自动跳过无效的滤镜并输出警告
const canvas = renderer.render(imageSource, [filterParam], 'test');
```

## 与装饰器的结合

新的滤镜注册机制与现有的装饰器系统完全兼容：

```typescript
// 在渲染器类中使用装饰器
class CustomRenderer extends BasicRenderer {
    @BlurDecorator({ debug: true })
    customBlur(commandEncoder: GPUCommandEncoder, filterParam: FilterParam) {
        // 自定义模糊逻辑
    }
}
```

## 总结

新的滤镜注册机制提供了：

- **灵活性**: 动态注册和管理滤镜
- **可扩展性**: 轻松添加新的滤镜类型
- **可维护性**: 统一的滤镜管理接口
- **性能**: 自动缓存和优化
- **类型安全**: TypeScript类型检查和参数验证

这个系统让WebGPU Image Filter变成了一个真正可扩展的滤镜框架，支持任意复杂的图像处理流水线。
