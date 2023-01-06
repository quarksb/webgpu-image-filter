// Defining this as a separate function because we'll be re-using it a lot.
export function webGPUTextureFromImageBitmapOrCanvas(gpuDevice: GPUDevice, source: GPUImageCopyExternalImage["source"]) {
    const textureDescriptor: GPUTextureDescriptor = {
        // Unlike in WebGL, the size of our texture must be set at texture creation time.
        // This means we have to wait until the image is loaded to create the texture, since we won't
        // know the size until then.
        size: { width: source.width, height: source.height },
        format: 'rgba8unorm',
        usage: GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_DST
    };
    const texture = gpuDevice.createTexture(textureDescriptor);

    gpuDevice.queue.copyExternalImageToTexture({ source }, { texture }, textureDescriptor.size);

    return texture;
}

export async function webGPUTextureFromImageUrl(gpuDevice: GPUDevice, url: string) { // Note that this is an async function
    const response = await fetch(url);
    const blob = await response.blob();
    const imgBitmap = await createImageBitmap(blob);

    return webGPUTextureFromImageBitmapOrCanvas(gpuDevice, imgBitmap);
}