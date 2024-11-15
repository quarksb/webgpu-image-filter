export enum Name {
    sigma = 'sigma',
    canvasSize = 'canvasSize',
    direction = 'direction',
    texture = "img"
}

export interface Blur {
    direction: Vec2
}

export interface TexTure {
    textureSize: Vec2,
}

export type Vec2 = [number, number];
export type Vec3 = [number, number, number];

// todo external GPUTexture
export type BindingData = { type: 'buffer', buffer: GPUBuffer } | { type: 'sampler', sampler: GPUSampler } | { type: 'texture', texture: GPUTexture };
export interface BindingInfo {
    groupIndex: number;
    bindingIndex: number;
    bindingData: BindingData;
}
export type BindingInfos = BindingInfo[];

export type BindingType = 'buffer' | 'sampler' | 'texture' | 'storageTexture';
export interface BindingTypeInfo {
    groupIndex: number;
    bindingIndex: number;
    bindingType: BindingType;
    name: string;
    visibility: number;
    viewDimension: GPUTextureViewDimension;
    format: GPUTextureFormat;
}
export type BindingTypeInfos = BindingTypeInfo[];

export type vec2 = [number, number];
export type vec3 = [number, number, number];
export type vec4 = [number, number, number, number];

type BaseData = number | vec2 | vec3 | vec4;
interface Property {
    key: string;
    value: BaseData;
}

export interface FilterParam {
    filterType: string;
    enable?: boolean;
    code?: string
    properties: Property[];
}

export interface NoiseFilterParam extends FilterParam {
    filterType: 'noise';
    properties: [
        { key: 'intensity', value: number },
        { key: 'seed', value: number },
        { key: 'granularity', value: number }
    ];
}

export interface Point {
    x: number;
    y: number;
}

export interface WarpFilterParam extends FilterParam {
    filterType: 'warp';
    properties: [
        { key: 'intensity', value: number },
        { key: 'center', value: vec2 },
    ];
}
export interface BlurFilterParam extends FilterParam {
    filterType: 'blur';
    properties: [
        { key: 'intensity', value: number },
    ];
}

// light_dir: vec3<f32>,
//     light_color: vec4<f32>,
//     shadow_color: vec4<f32>,
//     depth: f32,
//     size: f32,
//     soft: f32,
//     contour: f32,

export interface BevelFilterParam extends FilterParam {
    filterType: 'bevel';
    properties: [
        { key: 'lightDir', value: vec3 },
        { key: 'lightColor', value: vec4 },
        { key: 'shadowColor', value: vec4 },
        { key: 'depth', value: vec3 },
        { key: 'size', value: number },
        { key: 'soft', value: number },
        { key: 'contour', value: number },
    ];
}
export interface GPUBindGroupLayoutEntryInfo extends GPUBindGroupLayoutEntry {
    bindingType: BindingType;
    name: string;
}

export interface GroupInfo {
    groupIndex: number;
    groupLayoutDescriptor: {
        entries: GPUBindGroupLayoutEntryInfo[]
    }
}
export interface pipelineData {
    groupInfos: GroupInfo[],
    pipeline: GPURenderPipeline
}

export type CommonArray = Float32Array | Uint32Array;



