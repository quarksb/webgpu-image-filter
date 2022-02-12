[[block]] struct Unifroms{
    ratio: f32;
    seed: f32;
    granularity: f32;
};

[[group(0) ,binding(0)]] var mySampler: sampler;
[[group(0) ,binding(1)]] var myTexture: texture_2d<f32>;
[[group(1) ,binding(0)]] var<uniform> uniforms: Unifroms;

fn random(st:vec2<f32>)->f32 {
    return fract(sin(uniforms.seed + dot(st.xy, vec2<f32>(12.9898, 78.233))) * 43758.5453123);
}

// Based on Morgan McGuire @morgan3d
// https://www.shadertoy.com/view/4dS3Wd
fn noise(st:vec2<f32>)->f32 {
    let i = floor(st);
    let f = fract(st);

    // Four corners in 2D of a tile
    let a = random(i);
    let b = random(i + vec2<f32>(1.0, 0.0));
    let c = random(i + vec2<f32>(0.0, 1.0));
    let d = random(i + vec2<f32>(1.0, 1.0));

    let u = f * f * (3.0 - 2.0 * f);

    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
}

let OCTAVES = 6u;
fn fbm(st:vec2<f32>)->f32 {
    // Initial values
    var value = 0.0;
    var amplitude = .5;
    let frequency = 0.;
    var uv = st;
    // Loop of octaves
    for(var i = 0u; i < OCTAVES; i = i + 1u) {
        value = value + amplitude * noise(uv);
        uv = uv * 2.;
        amplitude = amplitude * .5;
    }
    return value;
}

[[stage(fragment)]]
fn frag_main([[location(0)]] fragUV: vec2<f32>) -> [[location(0)]] vec4<f32> {
    let uv = fragUV;
    let rgba = textureSample(myTexture, mySampler, uv);

    let p = uv * uniforms.granularity;
    let value = fbm(p);

    let k = 1. - (1. - value) * 0.01 * uniforms.ratio;
    if(value > uniforms.ratio * 0.01) {
        return vec4<f32>(0.);
    }
    return vec4<f32>(rgba.rgb, rgba.a);
}