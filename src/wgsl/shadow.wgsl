struct Unifroms{
    ratio: f32,
    seed: f32,
    granularity: f32,
};

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(1) var<uniform> uniforms: Unifroms;

fn getHalfAngle(lightPos: vec3<f32>, pos: vec3<f32>) -> vec3<f32>{
    return  normalize(normalize(lightPos - pos) + vec3<f32>(0.,0.,1.));
}

@stage(fragment)
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    var rgba = textureSample(myTexture, mySampler, fragUV);
    // var lightPos = vec3<f32>(1.,1.,1.);
    // var center = vec3<f32>(0.25,0.75,0.);
    // var vector = fragUV - center.xy;
    // const radius = 0.2;
    // var r = length(vector);
    // var z = sqrt(radius*radius-r*r);
    
    // var pos = vec3<f32>(fragUV, z);
    // var normal = normalize(pos - center);
    // var middleAngle = normalize(normalize(light - pos) + vec3<f32>(0.,0.,1.));
    // var val = pow(dot(normal, middleAngle), 4.);

    // if( r < radius){
    //     rgba = vec4<f32>(val, val, val, 1.);
    // }

    // 直线
    // if((fragUV.y - 0.006 * fragUV.x)< 0.197) {
    //     rgba = vec4<f32>(0.,0.,0.,1.);
    // }

    // if((fragUV.y + 0.8 * fragUV.x) < 0.63) {
    //     rgba = vec4<f32>(0.,0.,0.,1.);
    // }

    // kx * x + ky * y + kz * z = 1
    // const kx = 1.;
    // const ky = 1.;
    // const kz = 1.;
    const x = fragUV.x;
    const y = fragUV.y;
    // var z = 1. - x - y;
    // var normal = normalize(vec3<f32>(kx, ky, kz));
    // var pos = vec3<f32>(x,y,z);
    // var middleAngle = getHalfAngle(lightPos, pos);
    // var val = pow(dot(normal, middleAngle), 4.);
    // var dist = distance(pos, lightPos);
    // var lightVal = 1. / (dist * dist);
    // var k = val * lightVal;
    // var shadow: vec4<f32>;
    // if(y<0.5){
    //     shadow = vec4<f32>(k, k, k, 1.);
    // }else{
    //     shadow = vec4<f32>(0.,0.,0.,0.);
    // }
    

    // var rgb = rgba.rgb * rgba.a + (1.-rgba.a) * shadow.rgb;
    // var a = rgba.a + shadow.a - rgba.a * shadow.a;

    // return vec4<f32>(rgb, a);

    // var w = 900.;
    // var h = 1016.;
    // var z = -1;
    // var lightCenter = vec3<f32>(-0.5, 1.5, .5);
    // var lightSize = vec2<f32>(0.2, 0.1);
    // var pos = vec3<f32>(fragUV, .28 - 5.*fragUV.y);
    // var uv = fragUV;
    // var stepCount = 10;
    // var r = stepCount / 2;
    // var texZ = 0.;
    // var valSum = 0.;
    // for (var i: i32 = -r; i < r; i = i + 1) {
    //     for (var j: i32 = -r; j < r; j = j + 1) {
    //         var offset = vec2<f32>(f32(i)/f32(stepCount), f32(j)/f32(stepCount)) * lightSize;
    //         var lightPos = lightCenter + vec3<f32>(offset, 0.);
    //         var ramda = (texZ-pos.z)/(lightPos.z - pos.z);
    //         if(ramda > 0.) {
    //             var texPos = ramda * lightPos + (1.-ramda)*pos;
    //             var val = textureSample(myTexture, mySampler, texPos.xy).a;
    //             valSum = valSum + val;
    //         }
    //     }
    // }
    // valSum = valSum / f32(stepCount * stepCount);
    // var shadow = vec4<f32>(0.,0.,0., valSum);

    // var rgb = rgba.rgb * rgba.a + (1.-rgba.a) * shadow.rgb;
    // var a = rgba.a + shadow.a - rgba.a * shadow.a;

    const a = vec3<f32>(0.5,0.2,0.);
    const b = vec3<f32>(0.5,.8,0.);
    // var val = sdCapsule( vec3<f32>(fragUV, 0.), a, b, .02);
    var val = sdCappedCylinder(vec3<f32>(0., fragUV - vec2<f32>(0.5, 0.5)), 0.3, 0.1);
    if(val<0.){
        rgba = vec4<f32>(vec3<f32>(val), 1.);
    }else{
        rgba = vec4<f32>(0.,0.,0.,0.);
    }
    // return shadow;
    // return vec4<f32>(rgb, a);
    return vec4<f32>(rgba.rgb * rgba.a, rgba.a);
}

fn sdCapsule( p:vec3<f32>,  a:vec3<f32>, b:vec3<f32> , r:f32  )->f32{
  var pa = p - a;
  var ba = b - a;
  var h = clamp( dot(pa,ba)/dot(ba,ba), 0.0, 1.0 );
  return length( pa - ba*h ) - r;
}

fn sdCappedCylinder( p:vec3<f32>, h:f32, r:f32 )->f32{
  var d = abs(vec2(length(p.xz),p.y)) - vec2(h,r);
  return min(max(d.x,d.y),0.0) + length(max(d, vec2<f32>(0.0)));
}
