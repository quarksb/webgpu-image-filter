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
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> sepia_uniforms: Uniforms;

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // Sepia effect
    let sepia_r = (rgba.r * 0.393) + (rgba.g * 0.769) + (rgba.b * 0.189);
    let sepia_g = (rgba.r * 0.349) + (rgba.g * 0.686) + (rgba.b * 0.168);
    let sepia_b = (rgba.r * 0.272) + (rgba.g * 0.534) + (rgba.b * 0.131);
    
    let sepia = vec3<f32>(sepia_r, sepia_g, sepia_b);
    let result = mix(rgba.rgb, sepia, sepia_uniforms.intensity);
    
    return vec4<f32>(result, rgba.a);
}
