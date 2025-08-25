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
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> vignette_uniforms: Uniforms;

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // Calculate distance from center
    let center = vec2<f32>(0.5, 0.5);
    let distance = length(fragUV - center);
    
    // Create vignette effect
    let vignette = smoothstep(vignette_uniforms.radius, 0.0, distance);
    let factor = mix(1.0 - vignette_uniforms.intensity, 1.0, vignette);
    
    return vec4<f32>(rgba.rgb * factor, rgba.a);
}
