import { TriangleMesh } from "../utils/triangle_mesh";
import { getTexture, getRenderPassEncoder, getCanvas, getOffTexture, getBuffer, getSampler, DefaultFormat as format, initCode } from "../utils/utils";
import noiseCode from '../wgsl/noise.wgsl';
import warpCode from '../wgsl/warp.wgsl';
import copyCode from '../wgsl/copy.wgsl';
import blurCode from '../wgsl/blur.wgsl';
import computeBlur from '../wgsl/compute_blur.wgsl';
import type { BlurParam, CommonArray, GroupInfo, NoiseParam, pipelineData, WarpParam } from "../utils/type";


interface CommandData {
    commandEncoder: GPUCommandEncoder;
    pipelineData: pipelineData;
    targetTexture: GPUTexture;
    inputTexture: GPUTexture;
    index?: number;
}

interface VertexData {
    count: number;
    buffer: GPUBuffer;
}

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
    resourceMap: Map<string, GPUBindingResource | GPUBindingResource[] | VertexData>;
    pipelineDataMap: Map<string, pipelineData> = new Map();
    activeIndex = -1;
    constructor (device: GPUDevice) {
        this.device = device;

        this.resourceMap = new Map();
        const triangleMesh: TriangleMesh = new TriangleMesh(this.device);
        this.resourceMap.set('vertex', { buffer: triangleMesh.buffer, count: triangleMesh.count });
        this.resourceMap.set('mySampler', getSampler(device, {}));
        this.updateBuffer('direction', [new Float32Array([1, 0]), new Float32Array([0, 1])]);

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
            const texture = getTexture(this.device, { width, height, format, usage })
            this.device.queue.copyExternalImageToTexture({ source: sourceImage }, { texture }, { width, height });

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

    getBindGroups(groupInfos: GroupInfo[], pipeline: GPURenderPipeline, index: number) {

        return groupInfos.map(({ groupIndex, groupLayoutDescriptor }) => {
            const entries: GPUBindGroupEntry[] = [];
            for (let { binding, name } of groupLayoutDescriptor.entries) {
                let resource: GPUBindingResource | GPUBindingResource[] = this.resourceMap.get(name)!;

                if (!resource) {
                    console.error(`“${name}” 没有赋值`);
                }
                if (resource instanceof Array) {
                    resource = resource[index];
                }
                entries.push({ binding, resource });
            }
            const groupDescriptor: GPUBindGroupDescriptor = {
                layout: pipeline.getBindGroupLayout(groupIndex)!,
                entries: entries
            };

            const bindGroup = this.device.createBindGroup(groupDescriptor);
            return {
                groupIndex,
                bindGroup
            }
        });
    }

    setCommandBuffer({ commandEncoder, pipelineData, targetTexture, inputTexture, index = 0 }: CommandData) {
        const { groupInfos, pipeline } = pipelineData;
        const passEncoder = getRenderPassEncoder(commandEncoder, targetTexture.createView());
        passEncoder.setPipeline(pipeline);
        this.resourceMap.set('myTexture', inputTexture.createView());
        const bindGroups = this.getBindGroups(groupInfos, pipeline, index);

        const isRenderPipeline = pipeline instanceof GPURenderPipeline;
        if (isRenderPipeline) {
            bindGroups.forEach(({ groupIndex, bindGroup }) => passEncoder.setBindGroup(groupIndex, bindGroup));
            const vertexData = this.resourceMap.get('vertex') as VertexData;
            passEncoder.setVertexBuffer(0, vertexData.buffer);
            passEncoder.draw(vertexData.count);
            passEncoder.end();
        }
        else {
            const passEncoder: GPUComputePassEncoder = commandEncoder.beginComputePass();
            passEncoder.setPipeline(pipeline);
            bindGroups.forEach(({ groupIndex, bindGroup }) => passEncoder.setBindGroup(groupIndex, bindGroup));
            passEncoder.dispatchWorkgroups(this.canvas.width, this.canvas.height, 1);
            passEncoder.end();
        }
    }

    updateBuffer(key: string, arr: CommonArray | CommonArray[], usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST) {
        const bufferBinding = this.resourceMap.get(key) as GPUBufferBinding | GPUBufferBinding[] | undefined;
        if (arr instanceof Array) {
            const createBuffer = (bufferBindings: GPUBufferBinding[], data: CommonArray, bufferBinding?: GPUBufferBinding) => {
                if (!bufferBinding) {
                    const buffer = getBuffer(this.device, data, usage);
                    bufferBinding = { buffer };
                } else {
                    this.device.queue.writeBuffer(bufferBinding.buffer, 0, data);
                }
                bufferBindings.push(bufferBinding);
            }
            const bufferBindings: GPUBufferBinding[] = [];
            if (!bufferBinding) {
                arr.forEach(data => createBuffer(bufferBindings, data));
            } else {
                if (!(bufferBinding instanceof Array)) {
                    this.device.queue.writeBuffer((bufferBinding as GPUBufferBinding).buffer, 0, arr[0]);
                    bufferBindings.push(bufferBinding as GPUBufferBinding);
                    for (let index = 1; index < arr.length; index++) {
                        createBuffer(bufferBindings, arr[index])
                    }
                } else {
                    createBuffer(bufferBindings, arr[0], bufferBinding[0]);
                    for (let index = 1; index < arr.length; index++) {
                        createBuffer(bufferBindings, arr[index], bufferBinding[index])
                    }
                }
            }

            this.resourceMap.set(key, bufferBindings);
        } else {
            if (!bufferBinding) {
                const buffer = getBuffer(this.device, arr, usage);
                this.resourceMap.set(key, { buffer });
            } else {
                this.device.queue.writeBuffer((bufferBinding as GPUBufferBinding).buffer, 0, arr);
            }
        }
    }

    getPipelineData({ name, code }: { name: string, code: string }) {
        const shaderCode = code;
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
        const pipelineData = this.getPipelineData({ name: 'noise', code: noiseCode });
        const { inputTexture, targetTexture } = this.getTexture();

        this.setCommandBuffer({ commandEncoder, pipelineData, targetTexture, inputTexture });
    }

    warp(commandEncoder: GPUCommandEncoder, { value, center }: WarpParam) {
        // 注意在 value 后的占位数 0, value 和 center 数据大小一致
        const arr = new Float32Array([value, 0, center.x * 0.01 + 0.5, center.y * 0.01 + 0.5]);
        this.updateBuffer('warp_uniforms', arr);

        const pipelineData = this.getPipelineData({ name: 'warp', code: warpCode });
        const { inputTexture, targetTexture } = this.getTexture();
        this.setCommandBuffer({ commandEncoder, pipelineData, targetTexture, inputTexture });
    }

    blur(commandEncoder: GPUCommandEncoder, params: BlurParam) {
        const { value } = params;
        // 注意在 value 后的占位数 0, value 和 center 数据大小一致
        this.updateBuffer('blur_uniforms', new Float32Array([value, 0, this.width, this.height]));

        const pipelineData = this.getPipelineData({ name: 'blur', code: blurCode });
        for (let i = 0; i < 2; i++) {
            const { inputTexture, targetTexture } = this.getTexture();
            this.setCommandBuffer({ commandEncoder, pipelineData, inputTexture, targetTexture, index: i });
        }
    }

    // blur2(commandEncoder: GPUCommandEncoder, params: BlurParam) {
    //     const { value } = params;
    //     // 注意在 value 后的占位数 0, value 和 center 数据大小一致

    //     this.updateBuffer('flip', new Uint32Array([0, 1]));
    //     const tileDim = 128;
    //     const filterSize = 10;
    //     const blockDim = tileDim - (filterSize - 1);
    //     this.updateBuffer('params', new Uint32Array([filterSize, blockDim]));
    //     const pipelineData = this.getPipelineData({ name: 'blur2', code: computeBlur });
    //     this.resourceMap.set('outputTex', this.offTexture.createView());
    //     for (let i = 0; i < 2; i++) {
    //         const { inputTexture, targetTexture } = this.getTexture();
    //         this.setCommandBuffer({ commandEncoder, pipelineData, inputTexture, targetTexture, index: i });
    //     }
    // }

    copy(commandEncoder: GPUCommandEncoder, texture?: GPUTexture) {
        const pipelineData = this.getPipelineData({ name: 'copy', code: copyCode });
        const { inputTexture, targetTexture } = this.getTexture();
        const target = texture || targetTexture;
        this.setCommandBuffer({ commandEncoder, pipelineData, targetTexture: target, inputTexture });
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

