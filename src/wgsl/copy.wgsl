@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;

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

@fragment
fn frag_main(@location(0) TexCoord: vec2<f32>) -> @location(0) vec4<f32> {
    var rgba = textureSample(myTexture, mySampler, TexCoord);
    return rgba;
}

