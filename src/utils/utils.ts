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
        size: Math.max(Math.ceil(arr.byteLength / 4) * 4, 16),
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

export function getTexture(device: GPUDevice, { width = 1, height = 1, format = 'bgra8unorm',
    usage = GPUTextureUsage.COPY_DST | GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT }:
    { width?: number, height?: number, format?: GPUTextureFormat, usage?: GPUTextureDescriptor['usage'] }): GPUTexture {
    return device.createTexture({ size: { width, height }, format, usage });
}

export function getOffTexture(device: GPUDevice, { width, height, format }: { width: number, height: number, format: GPUTextureFormat }): GPUTexture {
    const usage = GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.RENDER_ATTACHMENT
    return getTexture(device, { usage, width, height, format })
}

export function getRenderPassEncoder(commandEncoder: GPUCommandEncoder, view: GPUTextureView): GPURenderPassEncoder {

    return commandEncoder.beginRenderPass({
        colorAttachments: [
            {
                view,
                loadOp: 'clear',
                storeOp: 'store'
            }
        ]
    })!;
}


export function getCanvas(width: number, height: number): OffscreenCanvas
export function getCanvas(width: number, height: number, isOnScreen: true): HTMLCanvasElement
export function getCanvas(width: number = 1, height: number = 1, isOnScreen?: boolean): HTMLCanvasElement | OffscreenCanvas {
    // @ts-ignore
    if (!isOnScreen && window.OffscreenCanvas) {
        // @ts-ignore
        const canvas = new OffscreenCanvas(width, height);
        return canvas;
    }
    else {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        return canvas;
    }
}