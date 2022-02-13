let adapter: GPUAdapter;
let device: GPUDevice;
export async function getGpuDevice() {
    if (device) {
        return { adapter, device }
    } else {
        try {
            adapter = (await navigator.gpu.requestAdapter())!;
            device = (await adapter!.requestDevice())!;
        } catch (e) {
            alert('your browser don‘t support webgpu')
        }
        return { adapter, device };
    }

}

export function getBuffer(device: GPUDevice, arr: Float32Array | Uint32Array, usage = GPUBufferUsage.STORAGE) {
    const desc = {
        // 负数在计算机中的表示为相应的正数取反 + 1, 下面计算等效于 Math.ceil(inputNum/4)*4
        size: (arr.byteLength + 3) & -0b100,
        usage,
        mappedAtCreation: true
    };
    const buffer = device.createBuffer(desc);
    const mappedRange = buffer.getMappedRange();
    const writeArray = arr instanceof Uint32Array ? new Uint32Array(mappedRange) : new Float32Array(mappedRange);
    writeArray.set(arr);
    buffer.unmap();
    return buffer;
}

export function getUniformBuffer(device: GPUDevice, type = 'float', value = 0, usage = GPUBufferUsage.UNIFORM, size = 4) {
    const buffer = device.createBuffer({ size, mappedAtCreation: true, usage });
    const mappedRange = buffer.getMappedRange();
    switch (type) {
        case 'uint': new Uint32Array(mappedRange)[0] = value;
        case 'int': new Int32Array(mappedRange)[0] = value;
        default: new Float32Array(mappedRange)[0] = value;
    }
    buffer.unmap();
    return buffer;
}

export function getRenderPipeline({
    device,
    code,
    fragCode,
    layout,
    format,
    vertexEntryPoint,
    vertexBuffers,
    fragEntryPoint,
    primitive,
}: {
    device: GPUDevice,
    code: string,
    fragCode?: string,
    layout?: GPUPipelineLayout,
    format?: GPUTextureFormat,
    vertexEntryPoint?: string,
    vertexBuffers?: Iterable<GPUVertexBufferLayout>
    fragEntryPoint?: string,
    primitive?: GPUPrimitiveState
}) {
    const descriptor: GPURenderPipelineDescriptor = {
        layout,
        vertex: {
            module: device.createShaderModule({ code }),
            entryPoint: vertexEntryPoint || 'vert_main',
            buffers: vertexBuffers
        },
        fragment: {
            module: device.createShaderModule({ code: fragCode || code }),
            entryPoint: fragEntryPoint || 'frag_main',
            targets: [{ format: format || 'bgra8unorm' }],
        },
        primitive: primitive || {
            topology: 'triangle-list',
            frontFace: 'ccw', // ccw（counter clock wise 逆时针） or cw （clock wise 顺时针）
            cullMode: 'none', // none or front or back
        }
    }
    return device.createRenderPipeline(descriptor);
}

export function getTexture(device: GPUDevice, width = 1, height = 1, format: GPUTextureFormat = 'rgba8unorm',
    usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT) {
    return device.createTexture({ size: { width, height }, format, usage });
}

export function getRenderPassEncoder(commandEncoder: GPUCommandEncoder, ctx: GPUCanvasContext): GPURenderPassEncoder {
    return commandEncoder.beginRenderPass({
        // @ts-ignore
        colorAttachments: [
            {
                view: ctx.getCurrentTexture().createView(),
                loadValue: 'load',
                loadOp: 'load',
                storeOp: 'store'
            }
        ]
    })!;
}

export function safeEnd(passEncoder: GPURenderPassEncoder) {
    if (passEncoder.end) {
        passEncoder.end();
    } else {
        passEncoder.endPass();
    }
}