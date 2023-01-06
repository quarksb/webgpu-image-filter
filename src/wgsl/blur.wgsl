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

struct Unifroms{
    sigma: f32,
    canvasSize: vec2<f32>, // 图片大小
};
struct Direction{
    value: vec2<f32>, // 图片大小
};

// 卷积范围 k 为标准差系数 r = k * sigma, 区间（μ-3σ, μ+3σ）内的面积为99.73%, 所以卷积范围一般取 3
const k = 3.0;
const maxKernelSize = 1000.0;
@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> blur_uniforms: Unifroms;
@group(2) @binding(0) var<uniform> direction: Direction;
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    var uv = fragUV;
    var kernelRadius = blur_uniforms.sigma * k;
    var scale2X = -0.5 / (blur_uniforms.sigma * blur_uniforms.sigma); // 后续高斯表达式中使用

    // 中心点颜色和权重
    var rgba = textureSample(myTexture, mySampler, uv);
    var weightSum:f32 = 1.0;
    // 充分利用线性采样 https://www.rastergrid.com/blog/2010/09/efficient-gaussian-blur-with-linear-sampling/
    for(var y:f32 = 0.; y < maxKernelSize; y = y + 2.) {
        if(y >= kernelRadius) { break; }
        var offset1 = y + 1.;
        var offset2 = y + 2.;
        var x1 = scale2X * offset1 * offset1;
        var x2 = scale2X * offset2 * offset2;
        var weight1 = exp(x1);
        var weight2 = exp(x2);

        var weight = weight1 + weight2;
        var offset = (weight1 * offset1 + weight2 * offset2) / weight;
        var offsetVec = direction.value * offset;

        var srcTmp = textureSample(myTexture, mySampler, uv + offsetVec/blur_uniforms.canvasSize);
        weightSum = weightSum + weight;
        rgba = rgba + srcTmp * weight;

        // 由于高斯函数对称性，偏移相反的位置权重相等
        srcTmp = textureSample(myTexture, mySampler, uv - offsetVec/blur_uniforms.canvasSize);
        weightSum = weightSum + weight;
        rgba = rgba + srcTmp * weight;
    }

    var sb = textureSample(myTexture, mySampler, uv);
    // var color = sb;
    var color = clamp(rgba / weightSum, vec4<f32>(0.), vec4<f32>(1.));
    return color;
}