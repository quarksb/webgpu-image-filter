import type { BindingType, BindingTypeInfos, GPUBindGroupLayoutEntryInfo, GroupInfo, pipelineData } from "./type";

let adapter: GPUAdapter;
let device: GPUDevice;
export async function getGpuDevice() {
    if (device) {
        return { adapter, device };
    } else {
        try {
            adapter = (await navigator.gpu.requestAdapter())!;
            device = (await adapter!.requestDevice())!;
        } catch (e) {
            alert("your browser don‘t support webgpu\n你的浏览器不支持 webgpu, 请使用 chrome 113+ 或者 edge 113+");
            open("https://www.google.com/chrome/");
        }
        return { adapter, device };
    }
}

export const DefaultFormat: GPUTextureFormat = "bgra8unorm";

export function getBuffer(device: GPUDevice, arr: Float32Array | Uint32Array, usage = GPUBufferUsage.STORAGE) {
    const desc = {
        size: Math.max(Math.ceil(arr.byteLength / 4) * 4, 16),
        usage,
        mappedAtCreation: true,
    };
    const buffer = device.createBuffer(desc);
    const mappedRange = buffer.getMappedRange();
    const writeArray = arr instanceof Uint32Array ? new Uint32Array(mappedRange) : new Float32Array(mappedRange);
    writeArray.set(arr);
    buffer.unmap();
    return buffer;
}

export function getUniformBuffer(device: GPUDevice, type = "float", value = 0, usage = GPUBufferUsage.UNIFORM, size = 4) {
    const buffer = device.createBuffer({ size, mappedAtCreation: true, usage });
    const mappedRange = buffer.getMappedRange();
    switch (type) {
        case "uint":
            new Uint32Array(mappedRange)[0] = value;
            break;
        case "int":
            new Int32Array(mappedRange)[0] = value;
            break;
        default:
            new Float32Array(mappedRange)[0] = value;
    }
    buffer.unmap();
    return buffer;
}

export function getTexture(
    device: GPUDevice,
    {
        width = 1,
        height = 1,
        format,
        usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT,
    }: {
        width?: number;
        height?: number;
        format: GPUTextureFormat;
        usage?: GPUTextureDescriptor["usage"];
    }
): GPUTexture {
    return device.createTexture({
        label: `w:${Math.ceil(width)} x h:${Math.ceil(height)}`,
        size: { width, height },
        format,
        usage,
    });
}

export function getOffTexture(device: GPUDevice, { width, height, format }: { width: number; height: number; format: GPUTextureFormat }): GPUTexture {
    const usage = GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT;
    return getTexture(device, { usage, width, height, format });
}

export function getRenderPassEncoder(commandEncoder: GPUCommandEncoder, view: GPUTextureView): GPURenderPassEncoder {
    return commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view,
                loadOp: "clear",
                storeOp: "store",
            },
        ],
    })!;
}

export function getCanvas(width: number, height: number): OffscreenCanvas;
export function getCanvas(width: number, height: number, isOnScreen: true): HTMLCanvasElement;
export function getCanvas(width: number = 1, height: number = 1, isOnScreen?: boolean): HTMLCanvasElement | OffscreenCanvas {
    // @ts-ignore
    if (!isOnScreen && window.OffscreenCanvas) {
        // @ts-ignore
        const canvas = new OffscreenCanvas(width, height);
        return canvas;
    } else {
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
}

export function initCode(code: string, device: GPUDevice, stage = GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT): pipelineData {
    const { vertexEntryPoint, fragmentEntryPoint, bindingTypeInfos } = parseWGSL(code);
    const groupInfos = getGroupInfos(bindingTypeInfos);

    // const bindGroupLayoutMap = new Map<number, GPUBindGroupLayout>();
    groupInfos.forEach(({ groupLayoutDescriptor }) => {
        const entries: GPUBindGroupLayoutEntry[] = [];
        for (let entry of groupLayoutDescriptor.entries) {
            const { bindingType, binding, visibility } = entry;
            let entryFilled: GPUBindGroupLayoutEntry = {
                binding,
                visibility,
                [`${bindingType}`]: {},
            };
            entries.push(entryFilled);
        }
        // const bindGroupLayout = device.createBindGroupLayout({ entries });
        // bindGroupLayoutMap.set(groupIndex, bindGroupLayout);
    });

    // todo analyzing from code
    const bufferLayout: GPUVertexBufferLayout = {
        arrayStride: 4 * 4,
        attributes: [
            {
                shaderLocation: 0,
                format: "float32x2",
                offset: 0,
            },
            {
                shaderLocation: 1,
                format: "float32x2",
                offset: 4 * 2,
            },
        ],
    };

    // const bindGroupLayouts = bindGroupLayoutMap.values();
    // const pipelineLayout = device.createPipelineLayout({ bindGroupLayouts });
    const module = device.createShaderModule({ code });
    const descriptor: GPURenderPipelineDescriptor = {
        // layout: pipelineLayout,
        layout: "auto",
        vertex: {
            module,
            entryPoint: vertexEntryPoint,
            buffers: [bufferLayout],
        },
        fragment: {
            module,
            entryPoint: fragmentEntryPoint,
            targets: [{ format: DefaultFormat }],
        },
        primitive: {
            topology: "triangle-list",
            frontFace: "ccw", // ccw（counter clock wise 逆时针） or cw （clock wise 顺时针）
            cullMode: "back", // none or front or back
        },
    };
    const pipeline = device.createRenderPipeline(descriptor);

    return { groupInfos, pipeline };
}

export function getSampler(device: GPUDevice, { magFilter = "linear", minFilter = "linear" }: GPUSamplerDescriptor) {
    return device.createSampler({ magFilter, minFilter });
}

export function getGroupInfos(bindingTypeInfos: BindingTypeInfos) {
    let groupInfos: GroupInfo[] = [];
    bindingTypeInfos.forEach(({ groupIndex, bindingIndex, bindingType, name }) => {
        let groupInfo = groupInfos.find((groupInfo) => groupInfo.groupIndex === groupIndex);
        if (typeof groupInfo === "undefined") {
            groupInfo = {
                groupIndex,
                groupLayoutDescriptor: {
                    entries: [],
                },
            };
            groupInfos.push(groupInfo);
        }

        (groupInfo.groupLayoutDescriptor.entries as GPUBindGroupLayoutEntryInfo[]).push({
            binding: bindingIndex,
            // todo 自动根据 code 分析出 visibility
            visibility: GPUShaderStage.VERTEX | GPUShaderStage.FRAGMENT,
            bindingType,
            name,
        });
    });
    return groupInfos;
}

export function parseWGSL(code: string) {
    // todo 正则表达式不完善，没有 cover 所有场景
    const computeEntryData = code.matchAll(/@compute\s*@workgroup_size\(\s?([0-9]*),\s?([0-9]*)\s?,\s?([0-9]*)\s?\)\s*fn\s*(\w+)\(/g).next().value;

    let vertexEntryPoint = "";
    let fragmentEntryPoint = "";
    let computeEntryPoint = "";
    let visibility: number = 0;
    let workgroupSize: number[] = [];

    if (!computeEntryData) {
        const vertexEntryData = code.matchAll(/@vertex\s*fn (\w+)\(/g).next().value;

        if (!vertexEntryData) {
            console.error("no vertex entry point");
        } else {
            vertexEntryPoint = vertexEntryData[1];
            visibility |= GPUShaderStage.VERTEX;
        }

        const fragmentEntryData = code.matchAll(/@fragment\s*fn (\w+)\(/g).next().value;

        if (!vertexEntryData) {
            console.error("no fragment entry point");
        } else {
            fragmentEntryPoint = fragmentEntryData[1];
            visibility |= GPUShaderStage.FRAGMENT;
        }
    } else {
        const getInt = (i: number) => parseInt(computeEntryData[i]);
        workgroupSize = [getInt(1), getInt(2), getInt(3)];
        computeEntryPoint = computeEntryData[4];
        visibility |= GPUShaderStage.COMPUTE;
    }

    const datas = code.matchAll(/@group\(([0-9])\)\s+@binding\(([0-9])\)\s+var(<\w+\s*(,\s*\w+\s*)*>)?\s+(\w+)\s*:\s*(\w+)(<\s*(\w+)(\s*,\s*\w+)?>)?;/g);

    const bindingTypeInfos: BindingTypeInfos = [];
    for (let data of datas) {
        const groupIndex = parseInt(data[1]);
        const bindingIndex = parseInt(data[2]);
        const isUniform = !!data[3];
        const name = data[5];
        const type = data[6];

        // console.log("isUniform:", isUniform);
        // console.log("     name:", name);
        // console.log("     type:", type);

        let bindingType: BindingType | undefined;
        let viewDimension: GPUTextureViewDimension = "2d";
        let textureFormat: GPUTextureFormat = DefaultFormat;
        if (type === "sampler") {
            bindingType = "sampler";
        } else if (type.includes("texture")) {
            const arr = type.split("_");
            if (arr[1] === "storage") {
                bindingType = "storageTexture";
            } else {
                bindingType = "texture";
            }
            viewDimension = arr[arr.length - 1] as GPUTextureViewDimension;
            textureFormat = data[8] as GPUTextureFormat;
        } else if (isUniform) {
            bindingType = "buffer";
        } else {
            console.error(`can't analyze @group(${groupIndex} @binding(${bindingIndex}) in your wgsl`);
            console.error("your wgsl: ", code);
        }
        if (bindingType) {
            bindingTypeInfos.push({
                groupIndex,
                bindingIndex,
                bindingType,
                name,
                visibility,
                viewDimension,
                format: textureFormat,
            });
        }
    }
    return {
        computeEntryPoint,
        vertexEntryPoint,
        fragmentEntryPoint,
        bindingTypeInfos,
        workgroupSize,
    };
}
