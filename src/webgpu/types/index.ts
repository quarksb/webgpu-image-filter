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

type BaseData = number | number[];
export interface Property {
    key: string;
    value: BaseData;
}

export interface FilterParam {
    filterType: string;
    enable?: boolean;
    code?: string
    properties?: Property[];
}

export interface NoiseFilterParam extends FilterParam {
    filterType: 'noise';
    properties: [
        { key: 'ratio', value: number },
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
        { key: 'angle', value: number },
        { key: 'center', value: number[] },
    ];
}
export interface BlurFilterParam extends FilterParam {
    filterType: 'blur';
    properties: [
        { key: 'value', value: number },
    ];
}

export interface SaturationFilterParam extends FilterParam {
    filterType: 'saturation';
    properties: [
        { key: 'saturation', value: number },
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

export type CommonArray = Float32Array<ArrayBuffer> | Uint32Array<ArrayBuffer>;