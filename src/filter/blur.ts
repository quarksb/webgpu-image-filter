import { getRenderPipeline, getTexture, getRenderPassEncoder, getGpuDevice, getBuffer, safeEnd } from "../utils/utils";
import code from './basic.wgsl';
import fragCode from './blur.wgsl';
import { rectVertexArray, rectVertexSize, rectPositionOffset, rectUVOffset } from './rect'

let canvas: HTMLCanvasElement;
let ctx: GPUCanvasContext;
let adapter: GPUAdapter;
let device: GPUDevice;
let format: GPUTextureFormat;
interface Props {
    source: ImageBitmap;
    blur: number;
}
let render: (sb: Props) => void;

async function initRenderer() {
    const data = await getGpuDevice();
    canvas = document.createElement('canvas');
    ctx = canvas.getContext('webgpu')!;
    adapter = data.adapter;
    device = data.device;
    format = navigator.gpu.getPreferredCanvasFormat();

    const pipeline = getRenderPipeline({
        device, code, fragCode
    });
    const sampler = device.createSampler({ magFilter: 'linear', minFilter: 'linear', });
    // const textures = 


    const uniformsBuffer = getBuffer(device, new Float32Array(new Array(4)), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
    const directionBuffer0 = getBuffer(device, new Float32Array([1, 0, 0, 0]), GPUBufferUsage.UNIFORM);
    const directionBuffer1 = getBuffer(device, new Float32Array([0, 1, 0, 0]), GPUBufferUsage.UNIFORM);
    const directionBindGroup0 = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(2),
        entries: [
            { binding: 0, resource: { buffer: directionBuffer0 } }
        ]
    })
    const directionBindGroup1 = device.createBindGroup({
        layout: pipeline.getBindGroupLayout(2),
        entries: [
            { binding: 0, resource: { buffer: directionBuffer1 } }
        ]
    });
    const verticesBuffer = getBuffer(device, rectVertexArray, GPUBufferUsage.VERTEX);
    render = ({ source, blur }) => {
        const { width, height } = source;
        canvas.width = width;
        canvas.height = height;
        const dpx = 1;
        const size = [canvas.width * dpx, canvas.height * dpx];
        const presentationSize = { width, height }

        // const texture = getTexture(device, width, height);
        // const texture2 = getTexture(device, width, height);
        const texture1 = device.createTexture({
            size: presentationSize,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.COPY_DST | GPUTextureUsage.TEXTURE_BINDING,
        });
        const texture2 = device.createTexture({
            size: presentationSize,
            format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.COPY_SRC | GPUTextureUsage.TEXTURE_BINDING,
        });

        device.queue.copyExternalImageToTexture({ source, flipY: true }, { texture: texture1 }, presentationSize);
        // device.importExternalTexture({ source, flipY: true });
        ctx.configure({ device, format, size, compositingAlphaMode: 'opaque' });
        const renderPassDescriptor: GPURenderPassDescriptor = {
            // @ts-ignore
            colorAttachments: [
                {
                    // view: ctx.getCurrentTexture().createView(),
                    view: texture2.createView(),
                    loadValue: 'load',
                    loadOp: 'load',
                    storeOp: 'store',
                },
            ],
        };

        // 同步数据
        device.queue.writeBuffer(uniformsBuffer, 0, new Float32Array([blur, 0, width, height]));
        const textureBindGroup0 = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture1.createView() }
            ]
        });
        const textureBindGroup1 = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(0),
            entries: [
                { binding: 0, resource: sampler },
                { binding: 1, resource: texture2.createView() }
            ]
        });
        const uniformBindGroup = device.createBindGroup({
            layout: pipeline.getBindGroupLayout(1),
            entries: [
                { binding: 0, resource: { buffer: uniformsBuffer } }
            ]
        });

        const commandEncoder = device.createCommandEncoder();
        let passEncoder = commandEncoder.beginRenderPass(renderPassDescriptor);
        // const passEncoder = getRenderPassEncoder(commandEncoder, ctx);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, textureBindGroup0);
        passEncoder.setBindGroup(1, uniformBindGroup);
        passEncoder.setBindGroup(2, directionBindGroup0);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.draw(6);
        safeEnd(passEncoder);
        // 结果转印
        // commandEncoder.copyTextureToTexture({ texture: texture2 }, { texture: texture1 }, { width, height });
        passEncoder = getRenderPassEncoder(commandEncoder, ctx);
        passEncoder.setPipeline(pipeline);
        passEncoder.setBindGroup(0, textureBindGroup1);
        passEncoder.setBindGroup(1, uniformBindGroup);
        passEncoder.setBindGroup(2, directionBindGroup1);
        passEncoder.setVertexBuffer(0, verticesBuffer);
        passEncoder.draw(6);
        safeEnd(passEncoder);

        device.queue.submit([commandEncoder.finish()]);
    }
}

export async function blurImage(imgBitmap: ImageBitmap, { value = 0 }: { value: number }) {
    if (isNaN(value)) return imgBitmap;
    if (!render) await initRenderer();
    render({ source: imgBitmap, blur: value, });
    return canvas;
}
