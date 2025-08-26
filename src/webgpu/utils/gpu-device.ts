import packageJson from "../../../package.json";

/**
 * Singleton manager for WebGPU device access
 * Handles initialization, error cases, and device loss
 */
class GPUDeviceManager {
    private static instance: GPUDeviceManager;
    private device: GPUDevice | null = null;
    private hasLogError = false;
    private isWebGPUSupported = true;
    private deviceInitPromise: Promise<GPUDevice | null> | null = null;

    private constructor() {}

    static getInstance(): GPUDeviceManager {
        if (!this.instance) {
            this.instance = new GPUDeviceManager();
        }
        return this.instance;
    }

    /**
     * Get or initialize a GPU device
     * @returns Promise resolving to a GPUDevice or null if not supported
     */
    async getDevice(): Promise<GPUDevice | null> {
        // Return existing device if available
        if (this.device) return this.device;

        // Return null if WebGPU is known to be unsupported
        if (!this.isWebGPUSupported) return null;

        // Use existing initialization promise if one is in progress
        if (!this.deviceInitPromise) {
            this.deviceInitPromise = this.initializeDevice();
        }

        return this.deviceInitPromise;
    }

    /**
     * Initialize the WebGPU device
     * @private
     */
    private async initializeDevice(): Promise<GPUDevice | null> {
        try {
            // Check for WebGPU support
            if (!navigator.gpu) {
                return this.handleError("navigator.gpu is not available");
            }

            // Request adapter
            const adapter = await navigator.gpu.requestAdapter();
            if (!adapter) {
                return this.handleError("gpu.requestAdapter is not available");
            }

            // Request device
            this.device = await adapter.requestDevice({
                label: "render-shader"
            });

            // Setup device loss handler
            this.setupDeviceLossHandler();

            return this.device;
        } catch (error) {
            return this.handleError(`Error getting GPU device: ${error}`);
        }
    }

    /**
     * Handle device loss events
     * @private
     */
    private setupDeviceLossHandler(): void {
        if (!this.device) return;

        this.device.lost
            .then(info => {
                this.device = null;
                this.deviceInitPromise = null;
                this.isWebGPUSupported = false;
                this.handleError(`Device lost: ${info.message}`);
                // Future: Could implement device recreation logic here
            })
            .catch(error => this.handleError(`Device loss handling error: ${error}`));
    }

    /**
     * Log error and mark WebGPU as unsupported
     * @private
     */
    private handleError(message: string): null {
        if (!this.hasLogError) {
            this.isWebGPUSupported = false;
            this.hasLogError = true;
            console.error(`WebGPU is not available: ${message}, render-shader:${packageJson.version}`);
        }
        return null;
    }
}

/**
 * Get a WebGPU device instance
 * @returns Promise resolving to a GPUDevice or null if WebGPU is not supported
 */
export async function getGPUDevice(): Promise<GPUDevice | null> {
    return GPUDeviceManager.getInstance().getDevice();
}

/**
 * 选择最优的渲染后端
 * @param options - 渲染选项
 * @returns 渲染后端信息
 */
export async function selectRenderBackend(options: { useWebGL?: boolean }): Promise<{
    useWebGL: boolean;
    device?: GPUDevice;
    reason: string;
}> {
    // 如果强制使用 WebGL
    if (options.useWebGL === true) {
        return {
            useWebGL: true,
            reason: "Forced to use WebGL via useWebGL option"
        };
    }

    // 检查 WebGPU 支持
    const device = await getGPUDevice();

    if (device) {
        // WebGPU 可用，且未强制使用 WebGL
        return {
            useWebGL: false,
            device,
            reason: "WebGPU is available and not forced to use WebGL"
        };
    } else {
        // WebGPU 不可用，回退到 WebGL
        return {
            useWebGL: true,
            reason: "WebGPU not available, fallback to WebGL"
        };
    }
}
