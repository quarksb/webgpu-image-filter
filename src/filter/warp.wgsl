struct Unifroms{
    angle: f32,
    center: vec2<f32>,
};

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> uniforms: Unifroms;
@stage(fragment)
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    var center = uniforms.center;
    // var center = vec2<f32>(0.5, 0.5);
    var uv0 = fragUV - center;
    var l = length(uv0) * 2.;
    l = clamp(1. - l, 0., 1.);
    var theta = l * uniforms.angle;
    var s = sin(theta);
    var c = cos(theta);
    var matrix2 = mat2x2<f32>(c, s, -s, c);
    var uv = matrix2 * uv0 + center;
    var rgba = textureSample(myTexture, mySampler, uv);
    // wgpu bug ?
    return vec4<f32>(rgba.rgb * rgba.a, rgba.a);
}