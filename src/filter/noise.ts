import { getRenderPipeline, getTexture, getRenderPassEncoder, getGpuDevice, getBuffer, safeEnd } from "../utils/utils";
import code from './basic.wgsl';
import fragCode from './noise.wgsl';
import { rectVertexArray, rectVertexSize, rectPositionOffset, rectUVOffset } from './rect'

let canvas: HTMLCanvasElement;
let ctx: GPUCanvasContext;
let adapter: GPUAdapter;
let device: GPUDevice;
let format: GPUTextureFormat;
interface Props {
    source: ImageBitmap;
    ratio: number;
    seed: number;
    granularity: number;
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
        device, code, fragCode, vertexBuffers: [{
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
    const uniformsBuffer = getBuffer(device, new Float32Array(new Array(3)), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    render = ({ source, ratio, seed, granularity }) => {
        const { width, height } = source;
        canvas.width = width;
        canvas.height = height;
        const texture = getTexture(device, width, height);
        device.queue.copyExternalImageToTexture({ source }, { texture }, { width, height });
        const dpx = 1;
        const size = [canvas.width * dpx, canvas.height * dpx];
        ctx.configure({ device, format, size });
        device.queue.writeBuffer(uniformsBuffer, 0, new Float32Array([ratio, seed, granularity]));
        const textureBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture.createView() }
            ]
        });
        const uniformBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                { binding: 0, resource: { buffer: uniformsBuffer } }
            ]
        })
        const commandEncoder = device.createCommandEncoder();
        const passEncoder = getRenderPassEncoder(commandEncoder, ctx);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, textureBindGroup);
        passEncoder.setBindGroup(1, uniformBindGroup);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.draw(6);
        safeEnd(passEncoder);
        device.queue.submit([commandEncoder?.finish()]);
    }
}

export async function noiseImage(imgBitmap: ImageBitmap, { value = 0, seed = 0, granularity = 50 }: { value: number, seed?: number, granularity?: number }) {
    if (isNaN(value)) return imgBitmap;
    if (!render) await initRenderer();
    render({ source: imgBitmap, ratio: value, seed, granularity });
    return canvas;
}
