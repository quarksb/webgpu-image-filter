import { getBuffer } from "./utils";

export class TriangleMesh {

    buffer: GPUBuffer
    count: number;

    constructor(device: GPUDevice) {
        const vertices: Float32Array = new Float32Array(
            // posx posy texcordx texcordy
            [
                0.0, 3.0, 0.5, -1.0,
                -2.0, -1.0, -0.5, 1.0,
                2.0, -1.0, 1.5, 1.0
            ]
        );

        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        // VERTEX: the buffer can be used as a vertex buffer
        // COPY_DST: data can be copied to the buffer

        this.buffer = getBuffer(device, vertices, usage);
        this.count = 3;
    }
}