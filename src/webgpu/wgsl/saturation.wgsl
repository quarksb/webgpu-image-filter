#include vert.wgsl;

struct Uniforms {
    saturation: f32,
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> saturation_uniforms: Uniforms;

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // Convert to grayscale using luminance
    let luminance = dot(rgba.rgb, vec3<f32>(0.299, 0.587, 0.114));
    
    // Mix between grayscale and original based on saturation
    let desaturated = vec3<f32>(luminance, luminance, luminance);
    let result = mix(desaturated, rgba.rgb, saturation_uniforms.saturation);
    
    return vec4<f32>(result, rgba.a);
}
