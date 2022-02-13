import { getRenderPipeline, getTexture, getBuffer, getRenderPassEncoder, getGpuDevice } from "../utils/utils";
import code from './basic.wgsl';
import { rectVertexArray, rectVertexSize, rectPositionOffset, rectUVOffset } from './rect'

let canvas: HTMLCanvasElement;
let ctx: GPUCanvasContext;
let adapter: GPUAdapter;
let device: GPUDevice;
let format: GPUTextureFormat;
interface Props {
    source: ImageBitmap | HTMLCanvasElement;
}
let render: (sb: Props) => void;

async function initRenderer() {
    const data = await getGpuDevice();
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('webgpu')!;
    adapter = data.adapter;
    device = data.device;
    format = ctx.getPreferredFormat(adapter);

    const pipeline = getRenderPipeline({
        device, code, vertexBuffers: [{
            arrayStride: rectVertexSize,
            attributes: [
                {
                    shaderLocation: 0,
                    offset: rectPositionOffset,
                    format: 'float32x4',
                },
                {
                    shaderLocation: 1,
                    offset: rectUVOffset,
                    format: 'float32x2',
                },
            ],
        }],
    });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    const verticesBuffer = getBuffer(device, rectVertexArray, GPUBufferUsage.VERTEX);
    render = ({ source }) => {
        const { width, height } = source;
        canvas.width = width;
        canvas.height = height;
        const texture = getTexture(device, width, height);
        device.queue.copyExternalImageToTexture({ source }, { texture }, { width, height });
        const dpx = 1;
        const size = [canvas.width * dpx, canvas.height * dpx];

        // webgpu bug compositingAlphaMode useless ?https://github.com/gpuweb/gpuweb/issues/1847
        ctx.configure({ device, format, size });
        const textureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() }
            ]
        });

        const commandEncoder = device.createCommandEncoder();
        const passEncoder = getRenderPassEncoder(commandEncoder, ctx);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, textureBindGroup);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.draw(6);
        if (passEncoder.end) {
            passEncoder.end();
        } else {
            passEncoder.endPass();
        }

        device.queue.submit([commandEncoder?.finish()]);
    }
}

export async function copyImage(imgBitmap: ImageBitmap | HTMLCanvasElement) {
    if (!render) await initRenderer();
    render({ source: imgBitmap });
    return canvas;
}
