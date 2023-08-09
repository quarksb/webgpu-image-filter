export function getTextureSize(source: GPUImageCopyExternalImage["source"]) {
    let width = 1;
    let height = 1;

    if (source instanceof HTMLCanvasElement || source instanceof ImageBitmap || source instanceof OffscreenCanvas || source instanceof HTMLImageElement) {
        width = source.width;
        height = source.height;
    } else if (source instanceof HTMLVideoElement) {
        width = source.videoWidth;
        height = source.videoHeight;
    } else {
        throw new Error("Invalid source type");
    }

    return { width, height };
}

// Defining this as a separate function because we'll be re-using it a lot.
export function webGPUTextureFromImageBitmapOrCanvas(gpuDevice: GPUDevice, source: GPUImageCopyExternalImage["source"]) {
    const size = getTextureSize(source);

    const textureDescriptor: GPUTextureDescriptor = {
        // Unlike in WebGL, the size of our texture must be set at texture creation time.
        // This means we have to wait until the image is loaded to create the texture, since we won't
        // know the size until then.
        label: 'Texture from image',
        size,
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    };
    const texture = gpuDevice.createTexture(textureDescriptor);

    gpuDevice.queue.copyExternalImageToTexture({ source }, { texture }, textureDescriptor.size);

    return texture;
}

// Note that this is an async function
export async function webGPUTextureFromImageUrl(gpuDevice: GPUDevice, url: string) {
    const response = await fetch(url);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    return webGPUTextureFromImageBitmapOrCanvas(gpuDevice, imgBitmap);
}