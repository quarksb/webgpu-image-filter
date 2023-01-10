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

export type BindingType = 'buffer' | 'sampler' | 'texture';
export interface BindingTypeInfo {
    groupIndex: number;
    bindingIndex: number;
    bindingType: BindingType;
    name: string;
}
export type BindingTypeInfos = BindingTypeInfo[];

export interface NoiseParam {
    value: number;
    seed: number;
    granularity: number;
}
export interface Point {
    x: number;
    y: number;
}
export interface WarpParam {
    value: number,
    center: Point,
}
export interface BlurParam {
    value: number;
    k: number;
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



