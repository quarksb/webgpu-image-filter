[[group(0), binding(0)]] var mySampler: sampler;
[[group(0), binding(1)]] var myTexture: texture_2d<f32>;

[[block]] struct VertexOutput {
    [[builtin(position)]] Position: vec4<f32>;
    [[location(0)]] fragUV: vec2<f32>;
};

let pos = array<vec2<f32>, 6>(
    vec2<f32>(1.0, 1.0),
    vec2<f32>(1.0, -1.0),
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(-1.0, -1.0),
    vec2<f32>(-1.0, 1.0)
);

let uv = array<vec2<f32>, 6>(
    vec2<f32>(1.0, 0.0),
    vec2<f32>(1.0, 1.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(1.0, 0.0),
    vec2<f32>(0.0, 1.0),
    vec2<f32>(0.0, 0.0)
);

// [[stage(vertex)]]
// fn vert_main([[builtin(vertex_index)]] VertexIndex: u32) -> VertexOutput {
//     var output: VertexOutput;
//     // let index:u32 = VertexIndex;
//     var index:u32 = VertexIndex + 0u;
//     // var index:u32 = 
//     let sb = pos[u32(0u+1u)];
//     output.Position = vec4<f32>(pos[index], 0.0, 1.0);
//     output.fragUV = uv[index];
//     return output;
// }

[[stage(vertex)]]
fn vert_main([[location(0)]] position : vec4<f32>,
        [[location(1)]] uv : vec2<f32>) -> VertexOutput {
    var output : VertexOutput;
    output.Position =  position;
    output.fragUV = uv;
  return output;
}

[[stage(fragment)]]
fn frag_main([[location(0)]] fragUV: vec2<f32>) -> [[location(0)]] vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    return rgba;
}

