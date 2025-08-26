/**
 * PassContext: 抽象 ping-pong 纹理读写与交换逻辑
 */
export interface IPassContext {
    beginPass(): { read: GPUTexture; write: GPUTexture };
    endPass(): void; // 完成一次 pass 后交换读写
    getReadTexture(): GPUTexture;
    dispose(): void;
}

export interface PassContextOptions {
    device: GPUDevice;
    width: number;
    height: number;
    format: GPUTextureFormat;
    initialRead: GPUTexture; // 初始输入（源图像）
}

export class PassContext implements IPassContext {
    private device: GPUDevice;
    private width: number;
    private height: number;
    private format: GPUTextureFormat;
    private ping: GPUTexture;
    private pong: GPUTexture;
    private readTex: GPUTexture; // 当前 read
    private writeTex: GPUTexture; // 当前 write（beginPass 决定）
    private passIndex = 0;
    private disposed = false;

    constructor(opts: PassContextOptions) {
        const { device, width, height, format, initialRead } = opts;
        this.device = device;
        this.width = width;
        this.height = height;
        this.format = format;
        this.readTex = initialRead;
        this.ping = this.createIntermediate();
        this.pong = this.createIntermediate();
        this.writeTex = this.ping; // placeholder
    }

    private createIntermediate(): GPUTexture {
        return this.device.createTexture({
            size: { width: this.width, height: this.height },
            format: this.format,
            usage: GPUTextureUsage.RENDER_ATTACHMENT | GPUTextureUsage.TEXTURE_BINDING | GPUTextureUsage.COPY_SRC
        });
    }

    beginPass(): { read: GPUTexture; write: GPUTexture } {
        if (this.disposed) throw new Error("PassContext disposed");
        // 偶数 pass 写入 ping，奇数 pass 写入 pong（与当前 readTex 不同即可）
        this.writeTex =
            this.passIndex % 2 === 0 ? (this.readTex === this.ping ? this.pong : this.ping) : this.readTex === this.ping ? this.pong : this.ping;
        return { read: this.readTex, write: this.writeTex };
    }

    endPass(): void {
        this.readTex = this.writeTex; // 将刚写完的作为下一轮 read
        this.passIndex++;
    }

    getReadTexture(): GPUTexture {
        return this.readTex;
    }

    dispose(): void {
        if (this.disposed) return;
        // 不销毁 initialRead，由外部负责。销毁内部 ping/pong。
        this.ping.destroy();
        this.pong.destroy();
        this.disposed = true;
    }
}
