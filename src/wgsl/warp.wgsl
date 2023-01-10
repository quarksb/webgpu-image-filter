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

struct Unifroms {
    angle: f32,
    center: vec2<f32>,
};

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> warp_uniforms: Unifroms;

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    var center = warp_uniforms.center;
    // var center = vec2<f32>(0.5, 0.5);
    let offset = TexCoord - center;
    var l = length(offset) * 2.;
    l = clamp(1. - l, 0., 1.);
    var theta = l * warp_uniforms.angle;
    var s = sin(theta);
    var c = cos(theta);
    var matrix2 = mat2x2<f32>(c, s, -s, c);
    var uv = matrix2 * offset + center;
    var rgba = textureSample(myTexture, mySampler, uv);
    // wgpu bug ?
    return vec4<f32>(rgba.rgb * rgba.a, rgba.a);
}