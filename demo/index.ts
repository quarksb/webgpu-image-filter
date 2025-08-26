import { Pane } from "tweakpane";
import { uploadFile, download, getImageBitmap } from "./utils";
import { defaultCustomFilters, getGPUDevice } from "../src";
import { ImageUrls } from "./assets";
import { 
    renderOnce,
    createRenderContext,
    RenderContext,
    FilterParam, 
    FilterRegistry,
    builtinFilters
} from "../src";
import type { BindingApi } from "@tweakpane/core";
import "./index.css";

console.log("🚀 Demo script starting...");
console.log("📦 Imports loaded successfully");

const basicCanvas = <HTMLCanvasElement>document.getElementById("canvas")!;
const w = 1200;
const h = 675;

console.log("🎯 Canvas element found:", basicCanvas);

basicCanvas.width = w;
basicCanvas.height = h;

const PARAMS = {
    blur: 10,
    warp: 1,
    seed: 0,
    noise: 40,
    granularity: 10,
    shadow: 10,
    saturation: 1.0,
    // 自定义滤镜参数
    contrast: 1.0,
    brightness: 0.0,
    hue_shift: 0.0,
    sepia_intensity: 0.0,
    vignette_intensity: 0.0,
    vignette_radius: 0.7,
    center: { x: 0, y: 0 },
    backgroundColor: "#88ddff",
    imageIndex: 0,
};

// 创建Tweakpane实例并挂载到指定容器
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer });

const bacInputs: BindingApi[] = [];
const baseInputs: BindingApi[] = [];

const f1 = pane.addFolder({ title: "background" });
bacInputs.push(f1.addBinding(PARAMS, "backgroundColor", { view: "color" }));

const f2 = pane.addFolder({ title: "Ablation" });
const f3 = pane.addFolder({ title: "Blur" });
const f4 = pane.addFolder({ title: "Twist" });
const f5 = pane.addFolder({ title: "Saturation" });
const f6 = pane.addFolder({ title: "Custom Filters" });

baseInputs.push(f2.addBinding(PARAMS, "noise", { label: "strength", min: 0, max: 100 }));
baseInputs.push(f2.addBinding(PARAMS, "granularity", { label: "scale", min: 0, max: 100 }));
baseInputs.push(f2.addBinding(PARAMS, "seed", { label: "seed", min: 0, max: 1 }));
baseInputs.push(f3.addBinding(PARAMS, "blur", { label: "strength", min: 0, max: 300 }));
baseInputs.push(f4.addBinding(PARAMS, "warp", { label: "strength", min: -100, max: 100 }));
baseInputs.push(f5.addBinding(PARAMS, "saturation", { label: "saturation", min: 0, max: 2, step: 0.1 }));

// 添加自定义滤镜控制
baseInputs.push(f6.addBinding(PARAMS, "contrast", { label: "contrast", min: 0, max: 3, step: 0.1 }));
baseInputs.push(f6.addBinding(PARAMS, "brightness", { label: "brightness", min: -1, max: 1, step: 0.05 }));
baseInputs.push(f6.addBinding(PARAMS, "hue_shift", { label: "hue shift", min: 0, max: 1, step: 0.01 }));
baseInputs.push(f6.addBinding(PARAMS, "sepia_intensity", { label: "sepia", min: 0, max: 1, step: 0.1 }));
baseInputs.push(f6.addBinding(PARAMS, "vignette_intensity", { label: "vignette", min: 0, max: 1, step: 0.05 }));
baseInputs.push(f6.addBinding(PARAMS, "vignette_radius", { label: "vignette radius", min: 0.1, max: 1, step: 0.05 }));

baseInputs.push(
    f4.addBinding(PARAMS, "center", {
        label: "center",
        picker: "inline",
        expanded: true,
        x: { step: 1, min: -100, max: 100 },
        y: { step: 1, min: -100, max: 100 },
    })
);

const imageInputs: BindingApi[] = [];
imageInputs.push(pane.addBinding(PARAMS, "imageIndex", { label: "image", min: 0, max: ImageUrls.length - 1, step: 1 }));
const button1 = pane.addButton({ title: "upload image" });
const button2 = pane.addButton({ title: "download image" });

const ctx = basicCanvas.getContext("2d")!;
let imgBitmap: ImageBitmap;

let url = ImageUrls[PARAMS.imageIndex];
const input: HTMLInputElement = document.createElement("input");
input.type = "file";
input.accept = "image/png";
input.style.display = "none";

input.addEventListener("change", async () => {
    const files = input.files;
    if (files && files.length) {
        const { url: currentUrl } = await uploadFile(files[0]);
        url = currentUrl;
        deepRender();
    }
});

button1.on("click", () => {
    input.click();
});

button2.on("click", () => {
    download(basicCanvas);
});

let renderContext: RenderContext | null = null;
let filterRegistry: FilterRegistry;
let gpuDevice: any;

// 统一的滤镜创建函数
function createFilter(type: string, params: Record<string, any>): FilterParam {
    return filterRegistry.createFilterParam(type, Object.entries(params).map(([key, value]) => ({
        key,
        value
    })));
}

async function render() {
    if (!renderContext) {
        console.log("🔧 Initializing WebGPU device...");
        
        try {
            gpuDevice = await getGPUDevice();
            console.log("✅ WebGPU device created");
            
            // 创建渲染上下文
            renderContext = await createRenderContext(gpuDevice);
            console.log("✅ Render context created");
        } catch (error) {
            console.error("❌ Failed to initialize WebGPU:", error);
            alert("WebGPU initialization failed. Please check console for details.");
            return;
        }
        
        // 初始化滤镜注册系统
        filterRegistry = new FilterRegistry();
        
        // 注册内置滤镜
        builtinFilters.forEach(filter => {
            filterRegistry.registerFilter(filter);
        });
        
        // 注册自定义滤镜
        defaultCustomFilters.forEach(filter => {
            filterRegistry.registerFilter(filter);
        });
        
        console.log("✅ Filters registered:", filterRegistry.size());
    }

    const { width, height } = imgBitmap;
    basicCanvas.width = width;
    basicCanvas.height = height;

    // 简化示例：演示 0 滤镜路径（触发 copy pass）
    // 如需恢复滤镜链测试，可重新填充 filters 数组
    const filters: FilterParam[] = [];
    console.log("ℹ️ Zero-filter demo: will trigger direct copy pass.");

    console.time("render");
    console.log("🚀 About to render with filters:", filters.map(f => f.filterType));
    console.log("📊 Image bitmap size:", imgBitmap.width, "x", imgBitmap.height);
    
    try {
        // 使用新的函数式API渲染
        const resultBitmap = await renderOnce(gpuDevice, imgBitmap, filters, { 
            cacheKey: url,
            debug: true 
        });
        console.timeEnd("render");
        console.log("✅ Render completed, result bitmap:", resultBitmap.width, "x", resultBitmap.height);

        // 将结果绘制到canvas上
        const ctx = basicCanvas.getContext("2d")!;
        basicCanvas.width = imgBitmap.width;
        basicCanvas.height = imgBitmap.height;
        ctx.clearRect(0, 0, imgBitmap.width, imgBitmap.height);
        ctx.drawImage(resultBitmap, 0, 0);
        console.log("✅ Image drawn to canvas");
    } catch (error) {
        console.timeEnd("render");
        console.error("❌ Render failed:", error);
    }
}

async function deepRender() {
    console.log("🚀 Deep render starting...");
    url = ImageUrls[PARAMS.imageIndex];
    console.log("📷 Loading image from:", url);
    try {
        imgBitmap = await getImageBitmap(url);
        console.log("✅ Image loaded successfully:", imgBitmap.width, "x", imgBitmap.height);
        render();
    } catch (error) {
        console.error("❌ Error in deepRender:", error);
    }
}

const body = document.querySelector("body")!;
bacInputs.forEach((input) => {
    input.on("change", () => {
        body.style.backgroundColor = PARAMS.backgroundColor;
    });
});

baseInputs.forEach((input) => {
    input.on("change", () => {
        render();
    });
});

imageInputs.forEach((input) => {
    input.on("change", () => {
        deepRender();
    });
});

// 初始化
deepRender();
