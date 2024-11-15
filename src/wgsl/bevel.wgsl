// this is a wgsl shader that draws a bevel effect on a texture

#include vert.wgsl;
struct BevelUnifroms {
    light_dir: vec3<f32>,
    light_color: vec4<f32>,
    shadow_color: vec4<f32>,
    depth: f32,
    size: f32,
    soft: f32,
    contour: f32,
};


@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> bevel_uniforms: BevelUnifroms;
@group(2) @binding(0) var sdf: texture_2d<f32>;
@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let uv = fragUV;
    let x = uv.x * 2.0 - 1.0;
    let y = uv.y * 2.0 - 1.0;
    let d = length(vec2<f32>(x, y));

    let canvasSize = vec2<f32>(textureDimensions(myTexture));
    let rgba = textureSample(myTexture, mySampler, uv);

    let size = bevel_uniforms.size;
    let dist = textureSample(sdf, mySampler, uv).r;


    const k: f32 = 20.0;
    const angle = 160;
    let theta = radians(angle);
    let upLeftUv = uv + vec2<f32>(cos(theta) * k / canvasSize.x, sin(theta) * k / canvasSize.y);
    let curColor = textureSample(myTexture, mySampler, uv);
    let upLeftColor = textureSample(myTexture, mySampler, upLeftUv);
    let colorDiff = curColor - upLeftColor;

    let luminance = abs(colorDiff.a);

    let a = rgba.a - luminance * 0.2;
    return vec4<f32>(rgba.rgb, a);
    // return vec4<f32>(0,0,1, rgba.a);

}