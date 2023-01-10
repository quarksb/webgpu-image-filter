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

struct Unifroms   {
    ratio: f32,
    seed: f32,
    granularity: f32,
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> noise_uniforms: Unifroms;

fn random(st:   vec2<f32 >  )  -> f32 {
    return fract(sin(noise_uniforms.seed + dot(st.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
fn noise(st:   vec2<f32 >  )  -> f32 {
    var i = floor(st);
    var f = fract(st);

    // Four corners in 2D of a tile
    var a = random(i);
    var b = random(i + vec2<f32>(1.0, 0.0));
    var c = random(i + vec2<f32>(0.0, 1.0));
    var d = random(i + vec2<f32>(1.0, 1.0));

    var u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

const OCTAVES = 6u;
fn fbm(st:   vec2<f32 >  )  -> f32 {
    // Initial values
    var value = 0.0;
    var amplitude = .5;
    var frequency = 0.;
    var uv = st;
    // Loop of octaves
    for   (var i = 0u; i < OCTAVES; i = i + 1u) {
        value = value + amplitude * noise(uv);
        uv = uv * 2.;
        amplitude = amplitude * .5;
    }
    return value;
}

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    var uv = fragUV;
    var rgba = textureSample(myTexture, mySampler, uv);

    var p = uv * noise_uniforms.granularity;
    let value = fbm(p);

    var k = 1. - (1. - value) * 0.01 * noise_uniforms.ratio;
    if  (value > noise_uniforms.ratio * 0.01) {
        return vec4<f32>(1.0, 1.0, 1.0, 0.);
    }
    return vec4<f32>(rgba.rgb, rgba.a);
}