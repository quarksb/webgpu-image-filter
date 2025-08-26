import { Pane } from "tweakpane";
import { uploadFile, download, getImageBitmap } from "./utils";
import { defaultCustomFilters, getGPUDevice } from "../src";
import { ImageUrls } from "./assets";
import { 
    NoiseFilterParam, 
    WarpFilterParam,
    FilterRenderer, 
    BlurFilterParam, 
    FilterParam, 
    SaturationFilterParam,
    CustomFilterManager
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

let renderer: FilterRenderer;
let customFilterManager: CustomFilterManager;

async function render() {
    if (!renderer) {
        console.log("🔧 Initializing WebGPU device...");
        
        try {
        } catch (error) {
            console.error("❌ Failed to get WebGPU device:", error);
            alert("WebGPU initialization failed. Please check console for details.");
            return;
        }
        
        console.log("🎨 Creating BasicRenderer...");
        renderer = new FilterRenderer(device);
        console.log("✅ BasicRenderer created");
        
        // 初始化renderer
        console.log("🚀 Initializing renderer...");
        await renderer.init(basicCanvas);
        console.log("✅ Renderer initialized");
        
        // 初始化自定义滤镜管理器
        customFilterManager = new CustomFilterManager();
        defaultCustomFilters.forEach(filter => {
            customFilterManager.registerFilter(filter);
        });
        console.log("✅ Custom filters registered");
    }

    const { width, height } = imgBitmap;
    basicCanvas.width = width;
    basicCanvas.height = height;

    const noiseParam: NoiseFilterParam = {
        filterType: "noise",
        enable: true,
        properties: [
            { key: "ratio", value: (100 - PARAMS.noise) / 100.0 },
            { key: "seed", value: PARAMS.seed },
            { key: "granularity", value: PARAMS.granularity },
        ],
    };

    const warpParam: WarpFilterParam = {
        filterType: "warp",
        enable: true,
        properties: [
            { key: "angle", value: PARAMS.warp },
            { key: "center", value: [PARAMS.center.x * 0.01 + 0.5, PARAMS.center.y * 0.01 + 0.5] },
        ],
    };

    const blurParam: BlurFilterParam = {
        filterType: "blur",
        enable: true,
        properties: [{ key: "value", value: PARAMS.blur }],
    };

    const saturationParam: SaturationFilterParam = {
        filterType: "saturation",
        enable: true,
        properties: [{ key: "saturation", value: PARAMS.saturation }],
    };

    const dataArray: FilterParam[] = [noiseParam, warpParam, blurParam, saturationParam];

    // 添加自定义滤镜（仅在参数不为默认值时）
    if (PARAMS.contrast !== 1.0) {
        dataArray.push(customFilterManager.createFilterParam('contrast', [
            { key: "contrast", value: PARAMS.contrast }
        ]));
    }

    if (PARAMS.brightness !== 0.0) {
        dataArray.push(customFilterManager.createFilterParam('brightness', [
            { key: "brightness", value: PARAMS.brightness }
        ]));
    }

    if (PARAMS.hue_shift !== 0.0) {
        dataArray.push(customFilterManager.createFilterParam('hue_shift', [
            { key: "hue_shift", value: PARAMS.hue_shift }
        ]));
    }

    if (PARAMS.sepia_intensity > 0.0) {
        dataArray.push(customFilterManager.createFilterParam('sepia', [
            { key: "intensity", value: PARAMS.sepia_intensity }
        ]));
    }

    if (PARAMS.vignette_intensity > 0.0) {
        dataArray.push(customFilterManager.createFilterParam('vignette', [
            { key: "intensity", value: PARAMS.vignette_intensity },
            { key: "radius", value: PARAMS.vignette_radius }
        ]));
    }

    console.time("render");
    console.log("🚀 About to render with filters:", dataArray.map(f => f.filterType));
    console.log("📊 Image bitmap size:", imgBitmap.width, "x", imgBitmap.height);
    console.log("🎯 Canvas size:", basicCanvas.width, "x", basicCanvas.height);
    
    try {
        const outCanvas = renderer.render(imgBitmap, dataArray, url);
        console.timeEnd("render");
        console.log("✅ Render completed, output canvas:", outCanvas.width, "x", outCanvas.height);

        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(outCanvas, 0, 0);
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

// 滤镜编辑器变量
let editorCustomFilterManager: CustomFilterManager;
let userCustomFilters = new Map<string, any>();

// 编辑器元素
const filterNameInput = document.getElementById('filterName') as HTMLInputElement;
const filterDisplayNameInput = document.getElementById('filterDisplayName') as HTMLInputElement;
const wgslCodeInput = document.getElementById('wgslCode') as HTMLTextAreaElement;
const parametersContainer = document.getElementById('parametersContainer') as HTMLElement;
const editorStatus = document.getElementById('editor-status') as HTMLElement;

// 添加参数字段
function addParameterField() {
    const paramDiv = document.createElement('div');
    paramDiv.className = 'parameter-field';
    paramDiv.innerHTML = `
        <div class="param-row">
            <input type="text" class="param-key" placeholder="parameter_name">
            <input type="text" class="param-display" placeholder="Display Name">
            <button type="button" class="remove-param">Remove</button>
        </div>
        <div class="param-details">
            <input type="number" class="param-default" placeholder="Default" step="0.01">
            <input type="number" class="param-min" placeholder="Min" step="0.01">
            <input type="number" class="param-max" placeholder="Max" step="0.01">
        </div>
    `;

    const removeBtn = paramDiv.querySelector('.remove-param') as HTMLButtonElement;
    removeBtn.addEventListener('click', () => paramDiv.remove());

    parametersContainer.appendChild(paramDiv);
}

// 获取滤镜配置
function getFilterConfig() {
    const name = filterNameInput.value.trim();
    const displayName = filterDisplayNameInput.value.trim();
    const wgslCode = wgslCodeInput.value.trim();

    if (!name || !displayName || !wgslCode) {
        editorStatus.innerHTML = '❌ Please fill in all required fields';
        editorStatus.style.background = '#ffebee';
        editorStatus.style.borderLeftColor = '#f44336';
        return null;
    }

    const parameters: any[] = [];
    const paramFields = parametersContainer.querySelectorAll('.parameter-field');

    paramFields.forEach(field => {
        const key = (field.querySelector('.param-key') as HTMLInputElement).value.trim();
        const paramDisplayName = (field.querySelector('.param-display') as HTMLInputElement).value.trim();
        const defaultValue = parseFloat((field.querySelector('.param-default') as HTMLInputElement).value) || 0;
        const min = parseFloat((field.querySelector('.param-min') as HTMLInputElement).value) || undefined;
        const max = parseFloat((field.querySelector('.param-max') as HTMLInputElement).value) || undefined;

        if (key && paramDisplayName) {
            parameters.push({
                key,
                displayName: paramDisplayName,
                type: 'float',
                defaultValue,
                min,
                max,
                step: 0.01
            });
        }
    });

    return {
        name,
        displayName,
        wgslCode,
        parameters
    };
}

// 预览滤镜
async function previewCustomFilter() {
    const config = getFilterConfig();
    if (!config) return;

    try {
        // 注册自定义滤镜
        if (!editorCustomFilterManager) {
            editorCustomFilterManager = new CustomFilterManager();
        }
        
        editorCustomFilterManager.registerFilter(config);
        userCustomFilters.set(config.name, config);
        
        // 创建滤镜参数
        const paramValues: any = {};
        config.parameters.forEach((param: any) => {
            paramValues[param.key] = param.defaultValue;
        });
        
        
        const filterParam = editorCustomFilterManager.createFilterParam(config.name, paramValues);
        
        // 应用滤镜预览
        const testFilters = [filterParam];
        
        const { width, height } = imgBitmap;
        basicCanvas.width = width;
        basicCanvas.height = height;

        console.time("custom filter render");
        const outCanvas = renderer.render(imgBitmap, testFilters, `custom_${config.name}`);
        console.timeEnd("custom filter render");

        const ctx = basicCanvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(outCanvas, 0, 0);
        
        editorStatus.innerHTML = `✅ Custom filter "${config.displayName}" applied successfully!`;
        editorStatus.style.background = '#e8f5e8';
        editorStatus.style.borderLeftColor = '#4CAF50';
        
    } catch (error: any) {
        editorStatus.innerHTML = `❌ Error: ${error.message}`;
        editorStatus.style.background = '#ffebee';
        editorStatus.style.borderLeftColor = '#f44336';
        console.error('Custom filter error:', error);
    }
}

// 导出滤镜配置
function exportFilterConfig() {
    const config = getFilterConfig();
    if (!config) return;

    const json = JSON.stringify(config, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${config.name}_filter.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    editorStatus.innerHTML = `💾 Filter config exported as "${config.name}_filter.json"`;
    editorStatus.style.background = '#e3f2fd';
    editorStatus.style.borderLeftColor = '#2196F3';
}

// 加载模板
function loadTemplate() {
    const templates = [
        {
            name: 'sepia',
            displayName: 'Sepia Tone',
            wgslCode: `struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) TexCoord: vec2<f32>,
};

@vertex
fn vert_main(@location(0) vertexPosition: vec2<f32>, @location(1) vertexTexCoord: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.Position = vec4<f32>(vertexPosition, 0.0, 1.0);
    output.TexCoord = vertexTexCoord;
    return output;
}

struct Uniforms {
    intensity: f32,
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> sepia_uniforms: Uniforms;

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // Sepia effect
    let sepia_r = (rgba.r * 0.393) + (rgba.g * 0.769) + (rgba.b * 0.189);
    let sepia_g = (rgba.r * 0.349) + (rgba.g * 0.686) + (rgba.b * 0.168);
    let sepia_b = (rgba.r * 0.272) + (rgba.g * 0.534) + (rgba.b * 0.131);
    
    let sepia = vec3<f32>(sepia_r, sepia_g, sepia_b);
    let result = mix(rgba.rgb, sepia, sepia_uniforms.intensity);
    
    return vec4<f32>(result, rgba.a);
}`,
            parameters: [
                { key: 'intensity', displayName: 'Intensity', defaultValue: 1.0, min: 0.0, max: 1.0 }
            ]
        },
        {
            name: 'vignette',
            displayName: 'Vignette Effect',
            wgslCode: `struct VertexOutput {
    @builtin(position) Position: vec4<f32>,
    @location(0) TexCoord: vec2<f32>,
};

@vertex
fn vert_main(@location(0) vertexPosition: vec2<f32>, @location(1) vertexTexCoord: vec2<f32>) -> VertexOutput {
    var output: VertexOutput;
    output.Position = vec4<f32>(vertexPosition, 0.0, 1.0);
    output.TexCoord = vertexTexCoord;
    return output;
}

struct Uniforms {
    intensity: f32,
    radius: f32,
}

@group(0) @binding(0) var mySampler: sampler;
@group(0) @binding(1) var myTexture: texture_2d<f32>;
@group(1) @binding(0) var<uniform> vignette_uniforms: Uniforms;

@fragment
fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
    let rgba = textureSample(myTexture, mySampler, fragUV);
    
    // Calculate distance from center
    let center = vec2<f32>(0.5, 0.5);
    let distance = length(fragUV - center);
    
    // Create vignette effect
    let vignette = smoothstep(vignette_uniforms.radius, 0.0, distance);
    let factor = mix(1.0 - vignette_uniforms.intensity, 1.0, vignette);
    
    return vec4<f32>(rgba.rgb * factor, rgba.a);
}`,
            parameters: [
                { key: 'intensity', displayName: 'Intensity', defaultValue: 0.5, min: 0.0, max: 1.0 },
                { key: 'radius', displayName: 'Radius', defaultValue: 0.7, min: 0.1, max: 1.0 }
            ]
        }
    ];

    const templateNames = templates.map((t, i) => `${i + 1}. ${t.displayName}`).join('\n');
    const choice = prompt(`Choose a template:\n${templateNames}\n\nEnter number (1-${templates.length}):`);
    
    if (choice) {
        const index = parseInt(choice) - 1;
        if (index >= 0 && index < templates.length) {
            const template = templates[index];
            
            // 填充模板数据
            filterNameInput.value = template.name;
            filterDisplayNameInput.value = template.displayName;
            wgslCodeInput.value = template.wgslCode;
            
            // 清空现有参数
            parametersContainer.innerHTML = '';
            
            // 添加模板参数
            template.parameters.forEach((param: any) => {
                addParameterField();
                const paramField = parametersContainer.lastElementChild as HTMLElement;
                (paramField.querySelector('.param-key') as HTMLInputElement).value = param.key;
                (paramField.querySelector('.param-display') as HTMLInputElement).value = param.displayName;
                (paramField.querySelector('.param-default') as HTMLInputElement).value = param.defaultValue.toString();
                (paramField.querySelector('.param-min') as HTMLInputElement).value = (param.min || 0).toString();
                (paramField.querySelector('.param-max') as HTMLInputElement).value = (param.max || 1).toString();
            });
            
            editorStatus.innerHTML = `📝 Loaded template: ${template.displayName}`;
            editorStatus.style.background = '#e3f2fd';
            editorStatus.style.borderLeftColor = '#2196F3';
        }
    }
}

// 绑定编辑器事件
document.getElementById('addParameter')!.addEventListener('click', addParameterField);
document.getElementById('previewFilter')!.addEventListener('click', previewCustomFilter);
document.getElementById('saveFilter')!.addEventListener('click', exportFilterConfig);
document.getElementById('loadTemplate')!.addEventListener('click', loadTemplate);

// 初始化
deepRender();
