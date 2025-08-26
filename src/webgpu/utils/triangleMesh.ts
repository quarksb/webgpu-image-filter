import { getBuffer } from "./utils";
import { triangleVertices } from "../../geometry";

export class TriangleMesh {
    buffer: GPUBuffer
    count: number;

    constructor(device: GPUDevice) {
        const usage: GPUBufferUsageFlags = GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST;
        // VERTEX: the buffer can be used as a vertex buffer
        // COPY_DST: data can be copied to the buffer

        this.buffer = getBuffer(device, triangleVertices, usage);
        this.count = 3;
    }
}