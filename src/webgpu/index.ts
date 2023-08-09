import { TriangleMesh } from "../utils/triangle_mesh";
import { getTexture, getRenderPassEncoder, getCanvas, getOffTexture, getBuffer, getSampler, DefaultFormat as format, initCode } from "../utils/utils";
import noiseCode from "../wgsl/noise.wgsl";
import warpCode from "../wgsl/warp.wgsl";
import copyCode from "../wgsl/copy.wgsl";
import blurCode from "../wgsl/blur.wgsl";
import type { BlurFilterParam, CommonArray, FilterParam, GroupInfo, NoiseFilterParam, pipelineData, WarpFilterParam } from "../utils/type";
import { getTextureSize } from "../utils/texture";

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
    ctx = this.canvas.getContext("webgpu")!;
    device: GPUDevice;
    width = 1;
    height = 1;
    inputTexture: GPUTexture | undefined;
    offTexture0: GPUTexture | undefined;
    offTexture1: GPUTexture | undefined;
    resourceMap: Map<string, GPUBindingResource | GPUBindingResource[] | VertexData>;
    pipelineDataMap: Map<string, pipelineData> = new Map();
    filterCodeMap: Map<string, string> = new Map();
    activeIndex = -1;
    constructor(device: GPUDevice) {
        this.device = device;

        this.resourceMap = new Map();
        const triangleMesh: TriangleMesh = new TriangleMesh(this.device);
        this.resourceMap.set("vertex", { buffer: triangleMesh.buffer, count: triangleMesh.count });
        this.resourceMap.set("mySampler", getSampler(device, {}));
        this.filterCodeMap.set("noise", noiseCode);
        this.filterCodeMap.set("warp", warpCode);
        this.filterCodeMap.set("copy", copyCode);
        this.filterCodeMap.set("blur", blurCode);
        this.updateBuffer("direction", [new Float32Array([1, 0]), new Float32Array([0, 1])]);

        const config: GPUCanvasConfiguration = {
            device,
            alphaMode: "premultiplied",
            format,
        };
        this.ctx.configure(config);
    }

    load(sourceImage: GPUImageCopyExternalImage["source"], cacheKey?: string) {
        if (cacheKey !== this.cacheKey || !cacheKey) {
            this.cacheKey = cacheKey;
            // TODO: texture size is over the largest texture size
            const { width, height } = getTextureSize(sourceImage);
            const usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT;
            const texture = getTexture(this.device, { width, height, format, usage });
            this.device.queue.copyExternalImageToTexture({ source: sourceImage }, { texture }, { width, height });

            this.canvas.width = width;
            this.canvas.height = height;
            this.width = width;
            this.height = height;
            this.inputTexture = texture;
            this.resourceMap.set("myTexture", texture.createView());

            // TODO: should replace with smarter texture manager
            this.offTexture0 = getOffTexture(this.device, { width, height, format });
            this.offTexture1 = getOffTexture(this.device, { width, height, format });
        }
        this.activeIndex = -1;
    }

    getOutTexture() {
        if (this.activeIndex === 1) {
            this.activeIndex = 0;
            return this.offTexture0!;
        } else {
            this.activeIndex = 1;
            return this.offTexture1!;
        }
    }

    // TODO: should replace with smarter texture manager
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

    updateResource(resources: { name: string; resource: GPUBindingResource }[]) {
        resources.forEach(({ name, resource }) => {
            this.resourceMap.set(name, resource);
        });
    }

    getBindGroups(groupInfos: GroupInfo[], pipeline: GPURenderPipeline, index = 0) {
        return groupInfos.map(({ groupIndex, groupLayoutDescriptor }) => {
            const entries: GPUBindGroupEntry[] = [];
            for (let { binding, name } of groupLayoutDescriptor.entries) {
                let resource: GPUBindingResource | GPUBindingResource[] = this.resourceMap.get(name)!;
                // let resource: GPUBindingResource = this.resourceMap.get(name)!;

                if (!resource) {
                    console.error(`param “${name}” hasn't assigned value`);
                }

                if (resource instanceof Array) {
                    resource = resource[index];
                }

                entries.push({ binding, resource });
            }
            const groupDescriptor: GPUBindGroupDescriptor = {
                layout: pipeline.getBindGroupLayout(groupIndex)!,
                entries: entries,
            };

            const bindGroup = this.device.createBindGroup(groupDescriptor);
            return {
                groupIndex,
                bindGroup,
            };
        });
    }

    setCommandBuffer({ commandEncoder, pipelineData, targetTexture, inputTexture, index }: CommandData) {
        const { groupInfos, pipeline } = pipelineData;

        const passEncoder = getRenderPassEncoder(commandEncoder, targetTexture.createView());
        passEncoder.setPipeline(pipeline);
        this.resourceMap.set("myTexture", inputTexture.createView());
        const bindGroups = this.getBindGroups(groupInfos, pipeline, index);

        const isRenderPipeline = pipeline instanceof GPURenderPipeline;
        if (isRenderPipeline) {
            bindGroups.forEach(({ groupIndex, bindGroup }) => passEncoder.setBindGroup(groupIndex, bindGroup));
            const vertexData = this.resourceMap.get("vertex") as VertexData;
            passEncoder.setVertexBuffer(0, vertexData.buffer);
            passEncoder.draw(vertexData.count);
            passEncoder.end();
        } else {
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
            };
            const bufferBindings: GPUBufferBinding[] = [];
            if (!bufferBinding) {
                arr.forEach((data) => createBuffer(bufferBindings, data));
            } else {
                if (!(bufferBinding instanceof Array)) {
                    this.device.queue.writeBuffer((bufferBinding as GPUBufferBinding).buffer, 0, arr[0]);
                    bufferBindings.push(bufferBinding as GPUBufferBinding);
                    for (let index = 1; index < arr.length; index++) {
                        createBuffer(bufferBindings, arr[index]);
                    }
                } else {
                    for (let index = 0; index < arr.length; index++) {
                        createBuffer(bufferBindings, arr[index], bufferBinding[index]);
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

    getPipelineData({ filterType, code }: { filterType: string; code: string | undefined }) {
        let filterCode: string | undefined = code;
        if (!filterCode) {
            filterCode = this.filterCodeMap.get(filterType);
            if (!filterCode) {
                throw new Error(`filter ${filterType} code is not exist`);
            }
        } else {
            this.filterCodeMap.set(filterType, filterCode);
        }
        let pipelineData = this.pipelineDataMap.get(filterType);
        if (!pipelineData) {
            pipelineData = initCode(filterCode!, this.device);
            this.pipelineDataMap.set(filterType, pipelineData);
        }
        return pipelineData;
    }

    blur(commandEncoder: GPUCommandEncoder, filterParam: BlurFilterParam) {
        const { filterType, properties } = filterParam;
        const warpFilterParam: FilterParam = { filterType, code: blurCode, properties };
        this.filter(commandEncoder, warpFilterParam);

        const { value } = properties[0];
        // 注意在 value 后的占位数 0, value 和 center 数据大小一致
        this.updateBuffer("blur_uniforms", new Float32Array([value, 0, this.width, this.height]));

        const pipelineData = this.getPipelineData({ filterType: "blur", code: blurCode });
        for (let i = 0; i < 2; i++) {
            const { inputTexture, targetTexture } = this.getTexture();
            this.setCommandBuffer({ commandEncoder, pipelineData, inputTexture, targetTexture, index: i });
        }
    }

    filter(commandEncoder: GPUCommandEncoder, filterParams: FilterParam) {
        const { filterType, code, properties } = filterParams;

        if (properties) {
            let BaseDataLength = 1;
            properties.forEach(({ value }) => {
                if (value instanceof Array) {
                    BaseDataLength = Math.max(BaseDataLength, value.length);
                }
            });
            const arr = new Float32Array(BaseDataLength * properties.length);

            properties.forEach(({ value }, index) => {
                if (value instanceof Array) {
                    arr.set(value, BaseDataLength * index);
                } else {
                    arr[index] = value;
                }
            });
            this.updateBuffer(`${filterType}_uniforms`, arr);
        }

        if (filterType) {
            const pipelineData = this.getPipelineData({ filterType, code });
            this.setCommandBuffer({ commandEncoder, pipelineData, ...this.getTexture() });
        }
    }

    copy(commandEncoder: GPUCommandEncoder, texture?: GPUTexture) {
        const pipelineData = this.getPipelineData({ filterType: "copy", code: copyCode });
        const { inputTexture, targetTexture } = this.getTexture();
        const target = texture || targetTexture;
        this.setCommandBuffer({ commandEncoder, pipelineData, targetTexture: target, inputTexture });
    }

    render(sourceImage: GPUImageCopyExternalImage["source"], params: FilterParam[], cacheKey: string) {
        this.load(sourceImage, cacheKey);
        const commandEncoder = this.device.createCommandEncoder();

        for (let i = 0; i < params.length; i++) {
            const filterParam = params[i];
            if (filterParam.enable) {
                const { filterType } = filterParam;
                switch (filterType) {
                    case "blur":
                        this.blur(commandEncoder, filterParam as BlurFilterParam);
                        break;
                    default:
                        this.filter(commandEncoder, filterParam);
                }
            }
        }

        this.copy(commandEncoder, this.ctx.getCurrentTexture());
        this.device.queue.submit([commandEncoder.finish()]);
        return this.canvas;
    }
}
