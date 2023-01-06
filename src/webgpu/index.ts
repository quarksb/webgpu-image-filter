import { TriangleMesh } from "../utils/triangle_mesh";
import { getTexture, getRenderPassEncoder, getCanvas, getOffTexture, getBuffer } from "../utils/utils";
import noiseCode from '../wgsl/noise.wgsl';
import warpCode from '../wgsl/warp.wgsl';
import copyCode from '../wgsl/copy.wgsl';
import blurCode from '../wgsl/blur.wgsl';
import { BindingData, BindingType, BindingTypeInfos, BlurParam, NoiseParam, WarpParam } from "./type";

interface Props {
    source: ImageBitmap | HTMLCanvasElement;
}
let render: (sb: Props) => void;

const format = 'bgra8unorm';

let clock = 0;

export class BasicRenderer {
    cacheKey: String | undefined;
    canvas = getCanvas(1, 1);
    ctx = this.canvas.getContext('webgpu')!;
    device: GPUDevice;
    width = 1;
    height = 1;
    inputTexture: GPUTexture | undefined;
    offTexture0: GPUTexture | undefined;
    offTexture1: GPUTexture | undefined;
    resourceMap: Map<string, GPUBindingResource>;
    pipelineDataMap: Map<string, pipelineData> = new Map();
    activeIndex = -1;
    constructor (device: GPUDevice) {
        this.device = device;

        this.resourceMap = new Map();
        const triangleMesh: TriangleMesh = new TriangleMesh(this.device);
        this.resourceMap.set('vertex', { buffer: triangleMesh.buffer });
        this.resourceMap.set('mySampler', getSampler(device, {}));

        const config: GPUCanvasConfiguration = {
            device,
            alphaMode: 'premultiplied',
            format,
        }
        this.ctx.configure(config);
    }

    load(sourceImage: GPUImageCopyExternalImage["source"], cacheKey?: string) {
        if (cacheKey !== this.cacheKey || !cacheKey) {
            this.cacheKey = cacheKey;
            // todo texture size 不够大
            const { width, height } = sourceImage;
            const usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT;
            const texture = getTexture(this.device, { width, height, usage })
            this.device.queue.copyExternalImageToTexture({ source: sourceImage },
                { texture }, { width, height });

            this.canvas.width = width;
            this.canvas.height = height;
            this.width = width;
            this.height = height;
            this.inputTexture = texture;
            this.resourceMap.set('myTexture', texture.createView());

            this.offTexture0 = getOffTexture(this.device, { width, height, format });
            this.offTexture1 = getOffTexture(this.device, { width, height, format });
        }
        this.activeIndex = -1;
    }

    getOutTexture() {
        if (this.activeIndex === 1) {
            this.activeIndex = 0;
            return this.offTexture0!;
        }
        else {
            this.activeIndex = 1;
            return this.offTexture1!;
        }
    }

    getTexture() {
        if (this.activeIndex === 0) {
            this.activeIndex = 1;
            return { inputTexture: this.offTexture0!, targetTexture: this.offTexture1! };
        } else if (this.activeIndex === 1) {
            this.activeIndex = 0;
            return { inputTexture: this.offTexture1!, targetTexture: this.offTexture0! };
        } else {
            this.activeIndex = 0;
            return { inputTexture: this.inputTexture!, targetTexture: this.offTexture0! };
        }
    }

    updateResource(resources: { name: string, resource: GPUBindingResource }[]) {
        resources.forEach(({ name, resource }) => {
            this.resourceMap.set(name, resource)
        })
    }

    getBindGroups(groupInfos: GroupInfo[], pipeline: GPURenderPipeline) {
        return groupInfos.map(({ groupIndex, groupLayoutDescriptor }) => {
            const entries: GPUBindGroupEntry[] = [];
            for (let { binding, name } of groupLayoutDescriptor.entries) {
                let resource: GPUBindingResource = this.resourceMap.get(name)!;

                if (!resource) {
                    console.error(`“${name}” 没有赋值`);
                }
                entries.push({ binding, resource });
            }
            const groupDescriptor: GPUBindGroupDescriptor = {
                layout: pipeline.getBindGroupLayout(groupIndex)!,
                entries: entries
            };

            return {
                groupIndex,
                bindGroup: this.device.createBindGroup(groupDescriptor)
            }
        });
    }

    setCommandBuffer(commandEncoder: GPUCommandEncoder, pipelineData: pipelineData, inputTexture: GPUTexture, targetTexture: GPUTexture) {
        const { groupInfos, pipeline } = pipelineData;
        const passEncoder = getRenderPassEncoder(commandEncoder, targetTexture.createView());
        passEncoder.setPipeline(pipeline);
        this.resourceMap.set('myTexture', inputTexture.createView());
        const bindGroups = this.getBindGroups(groupInfos, pipeline);
        bindGroups.forEach(({ groupIndex, bindGroup }) => passEncoder.setBindGroup(groupIndex, bindGroup));
        passEncoder.setVertexBuffer(0, (this.resourceMap.get('vertex') as GPUBufferBinding).buffer);
        passEncoder.draw(3, 1, 0, 0);
        passEncoder.end();
    }

    updateBuffer(key: string, arr: Float32Array, isNeedToCreate = false) {
        let buffer = this.resourceMap.get(key);
        if (isNeedToCreate || !buffer) {
            const usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST;
            const buffer = getBuffer(this.device, arr, usage);
            this.resourceMap.set(key, { buffer });
        } else {
            this.device.queue.writeBuffer((buffer as GPUBufferBinding).buffer, 0, arr);
        }
    }

    getPipelineData({ name, code }: { name: string, code?: string }) {
        const shaderCode = code || { noise: noiseCode, warp: warpCode, copy: copyCode, blur: blurCode }[name];
        let pipelineData = this.pipelineDataMap.get(name);
        if (!pipelineData) {
            pipelineData = initCode(shaderCode!, this.device);
            this.pipelineDataMap.set(name, pipelineData);
        }
        return pipelineData;
    }

    noise(commandEncoder: GPUCommandEncoder, { value, seed, granularity }: NoiseParam) {
        const arr = new Float32Array([value, seed, granularity])
        this.updateBuffer('noise_uniforms', arr);
        const pipelineData = this.getPipelineData({ name: 'noise' });
        const { inputTexture, targetTexture } = this.getTexture();
        this.setCommandBuffer(commandEncoder, pipelineData, inputTexture, targetTexture);
    }

    warp(commandEncoder: GPUCommandEncoder, { value, center }: WarpParam) {
        // 注意在 value 后的占位数 0, value 和 center 数据大小一致
        const arr = new Float32Array([value, 0, center.x * 0.01 + 0.5, center.y * 0.01 + 0.5]);
        this.updateBuffer('warp_uniforms', arr);

        const pipelineData = this.getPipelineData({ name: 'warp' });
        const { inputTexture, targetTexture } = this.getTexture();
        this.setCommandBuffer(commandEncoder, pipelineData, inputTexture, targetTexture);
    }

    blur(commandEncoder: GPUCommandEncoder, { value, k }: BlurParam) {
        // 注意在 value 后的占位数 0, value 和 center 数据大小一致
        const arr = new Float32Array([value, 0, this.width, this.height]);
        this.updateBuffer('blur_uniforms', arr);

        const pipelineData = this.getPipelineData({ name: 'blur' });
        {
            this.updateBuffer('direction', new Float32Array([1, 0]));
            const { inputTexture, targetTexture } = this.getTexture();
            this.setCommandBuffer(commandEncoder, pipelineData, inputTexture, targetTexture);
        }

        {
            this.updateBuffer('direction', new Float32Array([0, 1]), true);
            const { inputTexture, targetTexture } = this.getTexture();
            this.setCommandBuffer(commandEncoder, pipelineData, inputTexture, targetTexture);
        }
    }

    copy(commandEncoder: GPUCommandEncoder, texture?: GPUTexture) {
        const pipelineData = this.getPipelineData({ name: 'copy' });
        const { inputTexture, targetTexture } = this.getTexture();
        this.setCommandBuffer(commandEncoder, pipelineData, inputTexture, texture || targetTexture);
    }


    render(sourceImage: GPUImageCopyExternalImage["source"], datas: { type: string, enable: boolean, params: any }[], cacheKey: string) {
        this.load(sourceImage, cacheKey);

        const commandEncoder = this.device.createCommandEncoder();

        for (let i = 0; i < datas.length; i++) {
            const data = datas[i];
            if (data.enable) {
                const { type, params } = data;
                switch (type) {
                    case 'noise': this.noise(commandEncoder, params); break;
                    case 'warp': this.warp(commandEncoder, params); break;
                    case 'blur': this.blur(commandEncoder, params); break;
                }
            }
        };

        this.copy(commandEncoder, this.ctx.getCurrentTexture());
        this.device.queue.submit([commandEncoder.finish()]);
        return this.canvas
    }
}


function getResources(datas: ({ name: string } & BindingData)[]) {
    return datas.map(getBindingResource);
}

interface pipelineData {
    groupInfos: GroupInfo[],
    pipeline: GPURenderPipeline
}

function initCode(code: string, device: GPUDevice, stage = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT): pipelineData {
    const { vertexEntryPoint, fragmentEntryPoint, bindingTypeInfos } = parseWGSL(code);
    const groupInfos = getGroupInfos(bindingTypeInfos);

    const bindGroupLayoutMap = new Map<number, GPUBindGroupLayout>();
    groupInfos.forEach(({ groupIndex, groupLayoutDescriptor }) => {
        const entries: GPUBindGroupLayoutEntry[] = [];
        for (let entry of groupLayoutDescriptor.entries) {
            const { bindingType, binding, visibility } = entry;
            let entryFilled: GPUBindGroupLayoutEntry = { binding, visibility, [`${bindingType}`]: {} };
            entries.push(entryFilled);
        }
        const bindGroupLayout = device.createBindGroupLayout({ entries });
        bindGroupLayoutMap.set(groupIndex, bindGroupLayout);
    });

    const bindGroupLayouts = bindGroupLayoutMap.values();
    const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts });

    const bufferLayout: GPUVertexBufferLayout = {
        arrayStride: 4 * 4,
        attributes: [
            {
                shaderLocation: 0,
                format: "float32x2",
                offset: 0
            },
            {
                shaderLocation: 1,
                format: "float32x2",
                offset: 4 * 2
            },
        ]
    }

    const descriptor: GPURenderPipelineDescriptor = {
        layout: pipelineLayout,
        vertex: {
            module: device.createShaderModule({ code }),
            entryPoint: vertexEntryPoint,
            buffers: [bufferLayout]
        },
        fragment: {
            module: device.createShaderModule({ code }),
            entryPoint: fragmentEntryPoint,
            targets: [{ format: format }],
        },
        primitive: {
            topology: 'triangle-list',
            frontFace: 'ccw', // ccw（counter clock wise 逆时针） or cw （clock wise 顺时针）
            cullMode: 'none', // none or front or back
        },
    }
    const pipeline = device.createRenderPipeline(descriptor);

    return { groupInfos, pipeline }
}


export function getSampler(device: GPUDevice, { magFilter = 'linear', minFilter = 'linear' }: GPUSamplerDescriptor) {
    return device.createSampler({ magFilter, minFilter })
}

export function getBindingResource(bindingData: BindingData): GPUBindingResource {
    switch (bindingData.type) {
        case 'sampler': return bindingData.sampler;
        case 'texture': return bindingData.texture.createView();
        // todo buffer support offset?: GPUSize64; and size?: GPUSize64; 
        case 'buffer': return { buffer: bindingData.buffer };
    }
}

interface GPUBindGroupLayoutEntryInfo extends GPUBindGroupLayoutEntry {
    bindingType: BindingType;
    name: string;
}

interface GroupInfo {
    groupIndex: number;
    groupLayoutDescriptor: {
        entries: GPUBindGroupLayoutEntryInfo[]
    }
}

export function getGroupInfos(bindingTypeInfos: BindingTypeInfos) {
    let groupInfos: GroupInfo[] = [];
    bindingTypeInfos.forEach(({ groupIndex, bindingIndex, bindingType, name }) => {
        let groupInfo = groupInfos.find(groupInfo => groupInfo.groupIndex === groupIndex);
        if (typeof groupInfo === 'undefined') {
            groupInfo = {
                groupIndex,
                groupLayoutDescriptor: {
                    entries: []
                }
            }
            groupInfos.push(groupInfo)
        }

        (groupInfo.groupLayoutDescriptor.entries as GPUBindGroupLayoutEntryInfo[]).push({
            binding: bindingIndex,
            // todo 自动根据 code 分析出 visibility
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            bindingType,
            name
        });
    });
    return groupInfos;
}


export function parseWGSL(code: string) {
    // todo 正则表达式不完善，没有 cover 所有场景

    const vertexEntryData = (code.matchAll(/@vertex\s*fn (\w+)\(/g)).next().value;
    let vertexEntryPoint = 'vert_main';
    if (!vertexEntryData) {
        console.error('no vertex entry point');
    } else {
        vertexEntryPoint = vertexEntryData[1];
    }

    const fragmentEntryData = (code.matchAll(/@fragment\s*fn (\w+)\(/g)).next().value;
    let fragmentEntryPoint = 'frag_main';
    if (!vertexEntryData) {
        console.error('no fragment entry point');
    } else {
        fragmentEntryPoint = fragmentEntryData[1];
    }

    const datas = code.matchAll(/@group\(([0-9])\)\s+@binding\(([0-9])\)\s+var(<uniform>)?\s+(\w+):\s+(\w+)(<\w+>)?;/g);


    const bindingTypeInfos: BindingTypeInfos = [];
    for (let data of datas) {
        const groupIndex = parseInt(data[1]);
        const bindingIndex = parseInt(data[2]);
        const isUniform = !!(data[3]);
        const name = data[4];
        const type = data[5];

        let bindingType: BindingType | undefined;
        if (type === 'sampler') {
            bindingType = 'sampler';
        } else if (type.includes("texture")) {
            bindingType = 'texture';
        } else if (isUniform) {
            bindingType = 'buffer';
        } else {
            console.error(`can't analyze @group(${groupIndex} @binding(${bindingIndex}) in your wgsl`);
            console.error('your wgsl: ', code);
        }
        if (bindingType) {
            bindingTypeInfos.push({ groupIndex, bindingIndex, bindingType, name })
        }
    }
    return {
        vertexEntryPoint,
        fragmentEntryPoint,
        bindingTypeInfos
    }
}

