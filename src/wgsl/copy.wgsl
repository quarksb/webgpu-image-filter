#include vert.wgsl;

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    var rgba = textureSample(myTexture, mySampler, TexCoord);
    return rgba;
}

