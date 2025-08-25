# 自定义滤镜使用指南

本项目现已支持自定义滤镜功能，您可以通过多种方式来添加和使用自定义的图像滤镜效果。

## 功能特点

- ✨ 支持动态添加自定义滤镜
- 🎨 可视化滤镜编辑器
- 🔧 灵活的参数配置系统
- 📝 WGSL着色器代码编辑
- 💾 滤镜配置导入导出
- 🎯 实时预览功能

## 添加自定义滤镜的方法

### 方法一：使用预定义滤镜类型

1. **创建WGSL着色器文件**
   ```wgsl
   #include vert.wgsl;

   struct Uniforms {
       intensity: f32,
   }

   @group(0) @binding(0) var mySampler: sampler;
   @group(0) @binding(1) var myTexture: texture_2d<f32>;
   @group(1) @binding(0) var<uniform> my_filter_uniforms: Uniforms;

   @fragment
   fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
       let rgba = textureSample(myTexture, mySampler, fragUV);
       
       // 添加您的自定义滤镜逻辑
       let result = rgba.rgb * my_filter_uniforms.intensity;
       
       return vec4<f32>(result, rgba.a);
   }
   ```

2. **在类型定义中添加接口**
   ```typescript
   export interface MyCustomFilterParam extends FilterParam {
       filterType: 'my_custom';
       properties: [
           { key: 'intensity', value: number },
       ];
   }
   ```

3. **在渲染器中注册滤镜**
   ```typescript
   import myCustomCode from "./wgsl/my_custom.wgsl";
   
   // 在构造函数中
   this.filterCodeMap.set("my_custom", myCustomCode);
   ```

### 方法二：使用自定义滤镜管理系统

1. **创建滤镜配置**
   ```typescript
   import { CustomFilterManager } from '../src';

   const customFilter = {
       name: 'vintage',
       displayName: 'Vintage Effect',
       wgslCode: `
           #include vert.wgsl;
           // ... WGSL代码
       `,
       parameters: [
           {
               key: 'intensity',
               displayName: 'Intensity',
               type: 'float',
               defaultValue: 1.0,
               min: 0.0,
               max: 2.0,
               step: 0.1
           }
       ]
   };
   ```

2. **注册和使用滤镜**
   ```typescript
   const manager = new CustomFilterManager();
   manager.registerFilter(customFilter);

   // 创建滤镜参数
   const filterParam = manager.createFilterParam('vintage', {
       intensity: 1.5
   });

   // 应用滤镜
   renderer.render(image, [filterParam], 'cache_key');
   ```

### 方法三：使用可视化编辑器

1. **打开滤镜编辑器**
   - 在浏览器中打开 `demo/custom_filter_editor.html`
   - 或访问在线版本

2. **编辑滤镜**
   - 填写滤镜名称和显示名称
   - 在代码编辑器中编写WGSL着色器代码
   - 添加参数配置
   - 点击"Preview Filter"预览效果

3. **保存和使用**
   - 点击"Save Filter"导出配置文件
   - 在代码中导入并使用配置

## WGSL着色器编写指南

### 基本结构

每个自定义滤镜都需要遵循以下基本结构：

```wgsl
#include vert.wgsl;

struct Uniforms {
    // 定义您的参数
    parameter1: f32,
    parameter2: vec2<f32>,
    parameter3: vec3<f32>,
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> your_filter_uniforms: Uniforms;

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // 在这里实现您的滤镜逻辑
    
    return vec4<f32>(result_rgb, rgba.a);
}
```

### 常用滤镜效果示例

#### 1. 颜色调整
```wgsl
// 亮度调整
let brightened = rgba.rgb + brightness_uniforms.brightness;

// 对比度调整
let contrasted = (rgba.rgb - 0.5) * contrast_uniforms.contrast + 0.5;

// 饱和度调整
let luminance = dot(rgba.rgb, vec3<f32>(0.299, 0.587, 0.114));
let desaturated = vec3<f32>(luminance);
let saturated = mix(desaturated, rgba.rgb, saturation_uniforms.saturation);
```

#### 2. 几何变换
```wgsl
// 旋转
let center = vec2<f32>(0.5, 0.5);
let offset = fragUV - center;
let s = sin(rotation_uniforms.angle);
let c = cos(rotation_uniforms.angle);
let rotated = vec2<f32>(
    offset.x * c - offset.y * s,
    offset.x * s + offset.y * c
) + center;
```

#### 3. 模糊效果
```wgsl
// 简单模糊
var sum = vec3<f32>(0.0);
let blur_size = blur_uniforms.size;
for (var x = -2; x <= 2; x++) {
    for (var y = -2; y <= 2; y++) {
        let offset = vec2<f32>(f32(x), f32(y)) * blur_size;
        sum += textureSample(myTexture, mySampler, fragUV + offset).rgb;
    }
}
let blurred = sum / 25.0;
```

## 高级功能

### 1. 多通道滤镜
```typescript
// 自定义滤镜可以支持多次渲染通道
class MultiPassFilter {
    applyFilter(renderer, image) {
        // 第一通道
        const pass1 = renderer.filter(image, firstPassParams);
        // 第二通道
        const result = renderer.filter(pass1, secondPassParams);
        return result;
    }
}
```

### 2. 动态参数
```typescript
// 支持动画参数
const animatedFilter = {
    updateParameters(time) {
        return {
            intensity: Math.sin(time * 0.001) * 0.5 + 1.0,
            rotation: time * 0.01
        };
    }
};
```

### 3. 滤镜链组合
```typescript
// 组合多个滤镜
const filterChain = [
    manager.createFilterParam('brightness', { brightness: 0.1 }),
    manager.createFilterParam('contrast', { contrast: 1.2 }),
    manager.createFilterParam('vintage', { intensity: 0.8 })
];

renderer.render(image, filterChain, 'combined_effect');
```

## 性能优化建议

1. **着色器优化**
   - 避免复杂的循环和条件语句
   - 使用内建函数而不是自定义计算
   - 合理使用纹理采样

2. **参数管理**
   - 缓存着色器编译结果
   - 复用uniform buffer
   - 批量更新参数

3. **资源管理**
   - 及时释放不用的纹理
   - 使用对象池管理临时资源
   - 避免频繁的GPU/CPU数据传输

## 故障排除

### 常见问题

1. **着色器编译错误**
   - 检查WGSL语法
   - 确保变量类型匹配
   - 验证binding和group索引

2. **参数不生效**
   - 检查uniform结构体定义
   - 确认参数名称匹配
   - 验证数据类型转换

3. **性能问题**
   - 简化着色器逻辑
   - 减少纹理采样次数
   - 优化循环结构

### 调试技巧

1. **使用浏览器开发工具**
   ```javascript
   // 启用WebGPU调试
   const adapter = await navigator.gpu.requestAdapter({
       powerPreference: 'high-performance'
   });
   const device = await adapter.requestDevice({
       requiredFeatures: ['timestamp-query'] // 如果支持
   });
   ```

2. **着色器调试**
   - 使用颜色输出调试值
   - 分段测试滤镜效果
   - 记录中间计算结果

## 示例项目

项目中包含了多个完整的示例：

- `demo/index.ts` - 基础滤镜使用示例
- `demo/custom_filter_demo.ts` - 自定义滤镜演示
- `demo/custom_filter_editor.html` - 可视化滤镜编辑器

## 扩展开发

如果您想要扩展更多功能，可以考虑：

1. **计算着色器支持**
   - 添加compute shader类型的滤镜
   - 支持大规模并行处理

2. **3D效果滤镜**
   - 添加深度缓冲区支持
   - 实现3D变换效果

3. **实时视频处理**
   - 支持视频流处理
   - WebRTC集成

4. **移动设备优化**
   - 低功耗模式
   - 触摸手势控制

## 贡献指南

欢迎提交新的滤镜效果和改进建议！

1. Fork项目
2. 创建功能分支
3. 添加您的自定义滤镜
4. 提交Pull Request

---

有任何问题或建议，请在项目的GitHub页面提出Issue。
