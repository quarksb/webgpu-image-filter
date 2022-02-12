[[block]] struct Unifroms{
    angle: f32;
    center: vec2<f32>;
};

[[group(0) ,binding(0)]] var mySampler: sampler;
[[group(0) ,binding(1)]] var myTexture: texture_2d<f32>;
[[group(1) ,binding(0)]] var<uniform> uniforms: Unifroms;
[[stage(fragment)]]
fn frag_main([[location(0)]] fragUV: vec2<f32>) -> [[location(0)]] vec4<f32> {
    let center = uniforms.center;
    // let center = vec2<f32>(0.5, 0.5);
    let uv0 = fragUV - center;
    var l = length(uv0);
    l = clamp(1. - l, 0., 1.);
    let theta = l * uniforms.angle;
    let s = sin(theta);
    let c = cos(theta);
    let matrix2 = mat2x2<f32>(c, s, -s, c);
    let uv = matrix2 * uv0 + center;
    let rgba = textureSample(myTexture, mySampler, uv);
    // wgpu bug ?
    return vec4<f32>(rgba.rgb * rgba.a, rgba.a);
}