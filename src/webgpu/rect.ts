export const rectVertexSize = 4 * 6; // Byte size of one rect vertex.
export const rectPositionOffset = 0;
export const rectUVOffset = 4 * 4;
export const rectVertexCount = 6;

// prettier-ignore
export const rectVertexArray = new Float32Array([
    // float4 position, float4 color, float2 uv,
    1, 1, 0, 1, 1, 1,
    -1, 1, 0, 1, 0, 1,
    -1, -1, 0, 1, 0, 0,
    1, -1, 0, 1, 1, 0,
    1, 1, 0, 1, 1, 1,
    -1, -1, 0, 1, 0, 0,
]);