const waveGridSize = 1024;
const waveGridBufferSize = waveGridSize * waveGridSize * 3 * Float32Array.BYTES_PER_ELEMENT;
const waveGridVertexBuffer = gpuDevice.createBuffer({
    size: waveGridBufferSize,
    usage: GPUBufferUsage.VERTEX | GPUBufferUsage.COPY_DST,
});
const waveGridStagingBuffers = [];

// Updates a grid of vertices on the X, Y plane with wave-like motion
function updateWaveGrid(time) {
    // Get a new or re-used staging buffer that's already mapped.
    let stagingBuffer;
    if (waveGridStagingBuffers.length) {
        stagingBuffer = waveGridStagingBuffers.pop();
    } else {
        stagingBuffer = gpuDevice.createBuffer({
            size: waveGridBufferSize,
            usage: GPUBufferUsage.MAP_WRITE | GPUBufferUsage.COPY_SRC,
            mappedAtCreation: true,
        });
    }

    // Fill in the vertex grid values.
    const vertexPositions = new Float32Array(stagingBuffer.getMappedRange()),
    for (let y = 0; y < height; ++y) {
        for (let x = 0; x < width; ++x) {
            const vertexIndex = y * width + x;
            const offset = vertexIndex * 3;

            vertexPositions[offset + 0] = x;
            vertexPositions[offset + 1] = y;
            vertexPositions[offset + 2] = Math.sin(time + (x + y) * 0.1);
        }
    }
    stagingBuffer.unmap();

    // Copy the staging buffer contents to the vertex buffer.
    const commandEncoder = gpuDevice.createCommandEncoder({});
    commandEncoder.copyBufferToBuffer(stagingBuffer, 0, waveGridVertexBuffer, 0, waveGridBufferSize);
    gpuDevice.queue.submit([commandEncoder.finish()]);

    // Immediately after copying, re-map the buffer. Push onto the list of staging buffers when the
    // mapping completes.
    stagingBuffer.mapAsync(GPUMapMode.WRITE).then(() => {
        waveGridStagingBuffers.push(stagingBuffer);
    });
}