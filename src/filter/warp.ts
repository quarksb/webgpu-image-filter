import { getRenderPipeline, getTexture, getRenderPassEncoder, getGpuDevice, getBuffer } from "../utils/utils";
import code from './basic.wgsl';
import fragCode from './warp.wgsl';

let canvas: HTMLCanvasElement;
let ctx: GPUCanvasContext;
let adapter: GPUAdapter;
let device: GPUDevice;
let format: GPUTextureFormat;
interface Props {
    source: ImageBitmap;
    value: number;
    center: [number, number];
}
let render: (sb: Props) => void;

async function initRenderer() {
    const data = await getGpuDevice();
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('webgpu')!;
    adapter = data.adapter;
    device = data.device;
    format = ctx.getPreferredFormat(adapter);

    const pipeline = getRenderPipeline({ device, code, fragCode });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear' });
    const uniformsBuffer = getBuffer(device, new Float32Array([0, 0, 0, 0]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    render = ({ source, value, center }) => {
        const { width, height } = source;
        canvas.width = width;
        canvas.height = height;
        const texture = getTexture(device, width, height);
        device.queue.copyExternalImageToTexture({ source }, { texture }, { width: width, height: height });
        const dpx = 1;
        const size = [canvas.width * dpx, canvas.height * dpx];
        ctx.configure({ device, format, size });
        device.queue.writeBuffer(uniformsBuffer, 0, new Float32Array([value, 0, ...center]));
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
        passEncoder.draw(6);
        passEncoder.end();
        device.queue.submit([commandEncoder?.finish()]);
    }
}

export async function warpImage(imgBitmap: ImageBitmap, { value, center }: { value: number, center: { x: number, y: number } }) {
    if (isNaN(value)) return imgBitmap;
    if (!render) await initRenderer();
    render({ source: imgBitmap, value: value * Math.PI / 36, center: [center.x / 200 + 0.5, center.y / 200 + 0.5] });
    return canvas;
}
