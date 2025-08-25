# 🎨 WGSL着色器编写指南

## 🚀 WGSL简介

WGSL (WebGPU Shading Language) 是WebGPU的官方着色器语言，语法类似于Rust，专为GPU并行计算设计。

## 📖 基础语法

### 数据类型

```wgsl
// 标量类型
var my_bool: bool = true;
var my_int: i32 = 42;
var my_uint: u32 = 42u;
var my_float: f32 = 3.14;

// 向量类型
var vec2_f: vec2<f32> = vec2<f32>(1.0, 2.0);
var vec3_i: vec3<i32> = vec3<i32>(1, 2, 3);
var vec4_u: vec4<u32> = vec4<u32>(1u, 2u, 3u, 4u);

// 矩阵类型
var mat2x2: mat2x2<f32> = mat2x2<f32>(
    1.0, 0.0,
    0.0, 1.0
);
var mat4x4: mat4x4<f32> = mat4x4<f32>(
    1.0, 0.0, 0.0, 0.0,
    0.0, 1.0, 0.0, 0.0,
    0.0, 0.0, 1.0, 0.0,
    0.0, 0.0, 0.0, 1.0
);

// 数组类型
var fixed_array: array<f32, 4> = array<f32, 4>(1.0, 2.0, 3.0, 4.0);
var runtime_array: array<f32>; // 运行时大小数组
```

### 结构体

```wgsl
struct Vertex {
    position: vec3<f32>,
    normal: vec3<f32>,
    uv: vec2<f32>,
}

struct Uniforms {
    model_matrix: mat4x4<f32>,
    view_matrix: mat4x4<f32>,
    projection_matrix: mat4x4<f32>,
    time: f32,
}
```

## 🎯 图像滤镜开发模板

### 标准滤镜结构

```wgsl
// 1. 包含顶点着色器
#include vert.wgsl;

// 2. 定义uniform结构体
struct FilterUniforms {
    param1: f32,
    param2: vec2<f32>,
    param3: vec4<f32>,
}

// 3. 资源绑定
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> filter_uniforms: FilterUniforms;

// 4. 片段着色器主函数
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let input_color = textureSample(myTexture, mySampler, fragUV);
    
    // 滤镜处理逻辑
    let output_color = process_filter(input_color, fragUV);
    
    return output_color;
}
```

### 顶点着色器 (vert.wgsl)

```wgsl
struct VertexInput {
    @location(0) position: vec3<f32>,
    @location(1) uv: vec2<f32>,
}

struct VertexOutput {
    @builtin(position) position: vec4<f32>,
    @location(0) uv: vec2<f32>,
}

@vertex
fn vert_main(input: VertexInput) -> VertexOutput {
    var output: VertexOutput;
    output.position = vec4<f32>(input.position, 1.0);
    output.uv = input.uv;
    return output;
}
```

## 🎨 常用滤镜算法实现

### 1. 颜色空间转换

#### RGB ↔ HSV转换

```wgsl
fn rgb_to_hsv(rgb: vec3<f32>) -> vec3<f32> {
    let max_val = max(max(rgb.r, rgb.g), rgb.b);
    let min_val = min(min(rgb.r, rgb.g), rgb.b);
    let delta = max_val - min_val;
    
    // 色相 (Hue)
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
    
    // 饱和度 (Saturation)
    let s = select(0.0, delta / max_val, max_val > 0.0);
    
    // 明度 (Value)
    let v = max_val;
    
    return vec3<f32>(h, s, v);
}

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
```

#### RGB ↔ YUV转换

```wgsl
fn rgb_to_yuv(rgb: vec3<f32>) -> vec3<f32> {
    let y = 0.299 * rgb.r + 0.587 * rgb.g + 0.114 * rgb.b;
    let u = -0.147 * rgb.r - 0.289 * rgb.g + 0.436 * rgb.b;
    let v = 0.615 * rgb.r - 0.515 * rgb.g - 0.100 * rgb.b;
    return vec3<f32>(y, u, v);
}

fn yuv_to_rgb(yuv: vec3<f32>) -> vec3<f32> {
    let r = yuv.x + 1.140 * yuv.z;
    let g = yuv.x - 0.394 * yuv.y - 0.581 * yuv.z;
    let b = yuv.x + 2.032 * yuv.y;
    return vec3<f32>(r, g, b);
}
```

### 2. 几何变换

#### 旋转变换

```wgsl
fn rotate_uv(uv: vec2<f32>, angle: f32, center: vec2<f32>) -> vec2<f32> {
    let cos_a = cos(angle);
    let sin_a = sin(angle);
    let rotation_matrix = mat2x2<f32>(
        cos_a, -sin_a,
        sin_a, cos_a
    );
    
    let centered_uv = uv - center;
    let rotated_uv = rotation_matrix * centered_uv;
    return rotated_uv + center;
}
```

#### 缩放变换

```wgsl
fn scale_uv(uv: vec2<f32>, scale: vec2<f32>, center: vec2<f32>) -> vec2<f32> {
    let centered_uv = uv - center;
    let scaled_uv = centered_uv / scale;
    return scaled_uv + center;
}
```

#### 透视变换

```wgsl
fn perspective_warp(uv: vec2<f32>, strength: f32) -> vec2<f32> {
    let center = vec2<f32>(0.5, 0.5);
    let offset = uv - center;
    let distance = length(offset);
    
    let warp_factor = 1.0 + strength * distance * distance;
    return center + offset * warp_factor;
}
```

### 3. 卷积操作

#### 3x3卷积核

```wgsl
fn convolve3x3(uv: vec2<f32>, kernel: array<f32, 9>) -> vec3<f32> {
    let texel_size = 1.0 / vec2<f32>(textureDimensions(myTexture));
    
    var result = vec3<f32>(0.0);
    var kernel_index = 0;
    
    for (var y = -1; y <= 1; y = y + 1) {
        for (var x = -1; x <= 1; x = x + 1) {
            let sample_uv = uv + vec2<f32>(f32(x), f32(y)) * texel_size;
            let sample_color = textureSample(myTexture, mySampler, sample_uv).rgb;
            result = result + sample_color * kernel[kernel_index];
            kernel_index = kernel_index + 1;
        }
    }
    
    return result;
}

// 边缘检测 Sobel算子
fn sobel_edge_detection(uv: vec2<f32>) -> f32 {
    let sobel_x = array<f32, 9>(-1.0, 0.0, 1.0, -2.0, 0.0, 2.0, -1.0, 0.0, 1.0);
    let sobel_y = array<f32, 9>(-1.0, -2.0, -1.0, 0.0, 0.0, 0.0, 1.0, 2.0, 1.0);
    
    let gx = convolve3x3(uv, sobel_x);
    let gy = convolve3x3(uv, sobel_y);
    
    let gradient_magnitude = length(gx) + length(gy);
    return gradient_magnitude;
}
```

### 4. 噪声生成

#### 伪随机数生成

```wgsl
fn random(st: vec2<f32>) -> f32 {
    return fract(sin(dot(st.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

fn random2(st: vec2<f32>) -> vec2<f32> {
    let x = random(st);
    let y = random(st + vec2<f32>(1.0, 1.0));
    return vec2<f32>(x, y);
}
```

#### Perlin噪声近似

```wgsl
fn noise(st: vec2<f32>) -> f32 {
    let i = floor(st);
    let f = fract(st);
    
    let a = random(i);
    let b = random(i + vec2<f32>(1.0, 0.0));
    let c = random(i + vec2<f32>(0.0, 1.0));
    let d = random(i + vec2<f32>(1.0, 1.0));
    
    let u = f * f * (3.0 - 2.0 * f);
    
    return mix(a, b, u.x) + 
           (c - a) * u.y * (1.0 - u.x) + 
           (d - b) * u.x * u.y;
}

fn fractal_noise(st: vec2<f32>, octaves: i32) -> f32 {
    var value = 0.0;
    var amplitude = 0.5;
    var frequency = 1.0;
    
    for (var i = 0; i < octaves; i = i + 1) {
        value = value + amplitude * noise(st * frequency);
        amplitude = amplitude * 0.5;
        frequency = frequency * 2.0;
    }
    
    return value;
}
```

### 5. 高级效果

#### Bloom效果

```wgsl
fn bright_pass(color: vec3<f32>, threshold: f32) -> vec3<f32> {
    let brightness = dot(color, vec3<f32>(0.2126, 0.7152, 0.0722));
    return select(vec3<f32>(0.0), color, brightness > threshold);
}

fn gaussian_blur_sample(uv: vec2<f32>, direction: vec2<f32>, strength: f32) -> vec3<f32> {
    let texel_size = 1.0 / vec2<f32>(textureDimensions(myTexture));
    let blur_direction = direction * texel_size * strength;
    
    var result = vec3<f32>(0.0);
    let samples = 9;
    let half_samples = f32(samples / 2);
    
    for (var i = 0; i < samples; i = i + 1) {
        let offset = (f32(i) - half_samples) / half_samples;
        let sample_uv = uv + blur_direction * offset;
        let weight = exp(-0.5 * offset * offset) / sqrt(2.0 * 3.14159);
        result = result + textureSample(myTexture, mySampler, sample_uv).rgb * weight;
    }
    
    return result / f32(samples);
}
```

#### 色差(Chromatic Aberration)

```wgsl
fn chromatic_aberration(uv: vec2<f32>, strength: f32) -> vec3<f32> {
    let center = vec2<f32>(0.5, 0.5);
    let offset = (uv - center) * strength;
    
    let r = textureSample(myTexture, mySampler, uv + offset).r;
    let g = textureSample(myTexture, mySampler, uv).g;
    let b = textureSample(myTexture, mySampler, uv - offset).b;
    
    return vec3<f32>(r, g, b);
}
```

## 🔧 性能优化技巧

### 1. 减少纹理采样次数

```wgsl
// ❌ 低效: 多次采样同一位置
let color1 = textureSample(myTexture, mySampler, uv).rgb;
let alpha1 = textureSample(myTexture, mySampler, uv).a;

// ✅ 高效: 一次采样，多次使用
let color_sample = textureSample(myTexture, mySampler, uv);
let color1 = color_sample.rgb;
let alpha1 = color_sample.a;
```

### 2. 使用内置函数

```wgsl
// ❌ 手动实现
fn manual_clamp(value: f32, min_val: f32, max_val: f32) -> f32 {
    return min(max(value, min_val), max_val);
}

// ✅ 使用内置函数
let result = clamp(value, min_val, max_val);
```

### 3. 避免分支

```wgsl
// ❌ 使用if分支
if (condition) {
    result = value_a;
} else {
    result = value_b;
}

// ✅ 使用select函数
result = select(value_b, value_a, condition);

// ✅ 使用mix函数
result = mix(value_b, value_a, f32(condition));
```

### 4. 预计算常量

```wgsl
// ❌ 运行时计算常量
let pi = 3.14159265359;
let angle = pi / 4.0;

// ✅ 预计算常量
const PI: f32 = 3.14159265359;
const QUARTER_PI: f32 = 0.78539816339;
```

## 🐛 调试技巧

### 1. 可视化调试

```wgsl
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    // 原始处理
    let original_color = process_filter(fragUV);
    
    // 调试模式开关
    if (debug_uniforms.mode == 1) {
        // 显示UV坐标
        return vec4<f32>(fragUV, 0.0, 1.0);
    } else if (debug_uniforms.mode == 2) {
        // 显示某个中间值
        let debug_value = some_intermediate_calculation(fragUV);
        return vec4<f32>(debug_value, debug_value, debug_value, 1.0);
    } else if (debug_uniforms.mode == 3) {
        // 左右对比
        if (fragUV.x < 0.5) {
            return textureSample(myTexture, mySampler, fragUV); // 原图
        } else {
            return original_color; // 处理后
        }
    }
    
    return original_color;
}
```

### 2. 分步验证

```wgsl
fn debug_step_by_step(uv: vec2<f32>) -> vec4<f32> {
    let input = textureSample(myTexture, mySampler, uv);
    
    // 步骤1: 颜色空间转换
    let step1 = rgb_to_hsv(input.rgb);
    if (debug_step == 1) {
        return vec4<f32>(step1, 1.0);
    }
    
    // 步骤2: 处理
    let step2 = process_hsv(step1);
    if (debug_step == 2) {
        return vec4<f32>(step2, 1.0);
    }
    
    // 步骤3: 转换回RGB
    let final_result = hsv_to_rgb(step2);
    return vec4<f32>(final_result, input.a);
}
```

## 📚 最佳实践

### 1. 代码组织

```wgsl
// 将通用函数放在文件顶部
fn utility_function() -> f32 { /* ... */ }
fn color_conversion() -> vec3<f32> { /* ... */ }

// 主要的滤镜逻辑函数
fn apply_filter(color: vec3<f32>, uv: vec2<f32>) -> vec3<f32> {
    // 滤镜逻辑
}

// 片段着色器主函数简洁明了
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let input_color = textureSample(myTexture, mySampler, fragUV);
    let filtered_color = apply_filter(input_color.rgb, fragUV);
    return vec4<f32>(filtered_color, input_color.a);
}
```

### 2. 参数命名规范

```wgsl
// ✅ 描述性命名
struct BlurUniforms {
    blur_strength: f32,
    blur_direction: vec2<f32>,
    sample_count: u32,
}

// ❌ 简写命名
struct BlurUniforms {
    str: f32,
    dir: vec2<f32>,
    cnt: u32,
}
```

### 3. 错误处理

```wgsl
fn safe_sample(uv: vec2<f32>) -> vec4<f32> {
    // 确保UV在有效范围内
    let clamped_uv = clamp(uv, vec2<f32>(0.0), vec2<f32>(1.0));
    return textureSample(myTexture, mySampler, clamped_uv);
}

fn safe_divide(a: f32, b: f32, fallback: f32) -> f32 {
    return select(fallback, a / b, abs(b) > 0.001);
}
```

## 🎯 学习资源

### 官方文档
- [WGSL语言规范](https://www.w3.org/TR/WGSL/)
- [WebGPU API文档](https://gpuweb.github.io/gpuweb/)

### 教程和示例
- [WebGPU基础教程](https://webgpufundamentals.org/)
- [Learn WebGPU](https://eliemichel.github.io/LearnWebGPU/)
- [WebGPU示例集合](https://webgpu.github.io/webgpu-samples/)

### 着色器学习
- [Shadertoy](https://www.shadertoy.com/) - 在线着色器编辑器
- [The Book of Shaders](https://thebookofshaders.com/) - 着色器艺术教程
- [Inigo Quilez](https://iquilezles.org/) - 数学和着色器技巧

通过掌握这些WGSL技能，你可以创建出令人惊叹的图像滤镜效果！
