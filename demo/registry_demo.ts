import { Pane } from "tweakpane";
import { uploadFile, download, getImageBitmap } from "./utils";
import { getGpuDevice } from "../src";
import { ImageUrls } from "./assets";
import { 
    BasicRenderer, 
    FilterParam, 
    FilterConfig,
    FilterProcessor
} from "../src";
import type { BindingApi } from "@tweakpane/core";
import "./index.css";

const basicCanvas = <HTMLCanvasElement>document.getElementById("canvas")!;
const w = 1200;
const h = 675;

basicCanvas.width = w;
basicCanvas.height = h;

// 使用新的滤镜注册系统的参数结构
const PARAMS = {
    // 内置滤镜参数
    blur: 2.0,
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    hue_shift: 0.0,
    sepia_intensity: 0.0,
    vignette_intensity: 0.5,
    vignette_radius: 0.7,
    noise_intensity: 0.5,
    noise_seed: 42.0,
    noise_granularity: 100.0,
    warp_intensity: 1.0,
    warp_center_x: 0.5,
    warp_center_y: 0.5,
    
    // UI控制参数
    backgroundColor: "#88ddff",
    imageIndex: 0,
    
    // 自定义滤镜示例参数
    custom_negative_enabled: false,
    custom_glow_enabled: false,
    custom_glow_intensity: 1.0,
    custom_glow_radius: 3.0
};

// 创建Tweakpane实例
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer });

let device: any; // GPUDevice type
let renderer: BasicRenderer;
let imgBitmap: ImageBitmap;
let renderTimer: number | null = null;

// 自定义滤镜配置示例
const customFilters: FilterConfig[] = [
    // 负片效果滤镜
    {
        name: 'negative',
        displayName: '负片效果',
        category: 'artistic',
        wgslCode: `
            struct VertexOutput {
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

            @group(0) @binding(0) var mySampler: sampler;
            @group(0) @binding(1) var myTexture: texture_2d<f32>;

            @fragment
            fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
                let rgba = textureSample(myTexture, mySampler, fragUV);
                return vec4<f32>(1.0 - rgba.rgb, rgba.a);
            }
        `,
        parameters: []
    },
    
    // 发光效果滤镜
    {
        name: 'glow',
        displayName: '发光效果',
        category: 'artistic',
        wgslCode: `
            struct VertexOutput {
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
            @group(1) @binding(0) var<uniform> glow_uniforms: Uniforms;

            @fragment
            fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
                let rgba = textureSample(myTexture, mySampler, fragUV);
                
                // 简单的发光效果实现
                let luminance = dot(rgba.rgb, vec3<f32>(0.299, 0.587, 0.114));
                let glow = smoothstep(0.3, 0.8, luminance);
                
                let glowColor = rgba.rgb + glow * glow_uniforms.intensity * vec3<f32>(1.0, 0.8, 0.6);
                
                return vec4<f32>(clamp(glowColor, vec3<f32>(0.0), vec3<f32>(1.0)), rgba.a);
            }
        `,
        parameters: [
            {
                key: 'intensity',
                displayName: '发光强度',
                type: 'float',
                defaultValue: 1.0,
                min: 0.0,
                max: 3.0,
                step: 0.1
            },
            {
                key: 'radius',
                displayName: '发光半径',
                type: 'float',
                defaultValue: 3.0,
                min: 0.0,
                max: 10.0,
                step: 0.5
            }
        ]
    }
];

// 初始化函数
async function init() {
    try {
        device = await getGpuDevice();
        renderer = new BasicRenderer(device);
        
        // 注册自定义滤镜
        customFilters.forEach(filterConfig => {
            renderer.registerFilter(filterConfig);
        });
        
        // 显示所有可用滤镜
        console.log('所有可用滤镜:', renderer.getAvailableFilters());
        console.log('颜色调整滤镜:', renderer.getFiltersByCategory('color'));
        console.log('艺术效果滤镜:', renderer.getFiltersByCategory('artistic'));
        
        // 加载默认图像
        await loadImage(0);
        
        // 设置UI控件
        setupUI();
        
        console.log("WebGPU Image Filter Demo initialized with new registry system!");
        
    } catch (error) {
        console.error("Failed to initialize WebGPU:", error);
        alert("WebGPU初始化失败。请确保您的浏览器支持WebGPU。");
    }
}

// 设置UI控件
function setupUI() {
    // 图像选择
    const imageFolder = pane.addFolder({ title: '图像选择', expanded: true });
    imageFolder.addBinding(PARAMS, 'imageIndex', {
        label: '图像',
        options: ImageUrls.map((url, index) => ({ text: `图像 ${index + 1}`, value: index }))
    }).on('change', (ev) => loadImage(ev.value));

    // 上传按钮
    imageFolder.addButton({ title: '上传图像' }).on('click', () => {
        uploadFile((file) => loadImageFile(file));
    });

    // 基础滤镜控制
    const basicFilters = pane.addFolder({ title: '基础滤镜', expanded: true });
    
    // 模糊
    basicFilters.addBinding(PARAMS, 'blur', {
        label: '模糊',
        min: 0.0,
        max: 20.0,
        step: 0.5
    }).on('change', debouncedRender);

    // 亮度
    basicFilters.addBinding(PARAMS, 'brightness', {
        label: '亮度',
        min: -1.0,
        max: 1.0,
        step: 0.05
    }).on('change', debouncedRender);

    // 对比度
    basicFilters.addBinding(PARAMS, 'contrast', {
        label: '对比度',
        min: 0.0,
        max: 3.0,
        step: 0.1
    }).on('change', debouncedRender);

    // 饱和度
    basicFilters.addBinding(PARAMS, 'saturation', {
        label: '饱和度',
        min: 0.0,
        max: 3.0,
        step: 0.1
    }).on('change', debouncedRender);

    // 色相偏移
    basicFilters.addBinding(PARAMS, 'hue_shift', {
        label: '色相偏移',
        min: 0.0,
        max: 1.0,
        step: 0.01
    }).on('change', debouncedRender);

    // 艺术效果
    const artisticFilters = pane.addFolder({ title: '艺术效果', expanded: true });
    
    // 棕褐色调
    artisticFilters.addBinding(PARAMS, 'sepia_intensity', {
        label: '棕褐色调',
        min: 0.0,
        max: 1.0,
        step: 0.1
    }).on('change', debouncedRender);

    // 晕影效果
    const vignetteFolder = artisticFilters.addFolder({ title: '晕影效果' });
    vignetteFolder.addBinding(PARAMS, 'vignette_intensity', {
        label: '强度',
        min: 0.0,
        max: 1.0,
        step: 0.05
    }).on('change', debouncedRender);
    
    vignetteFolder.addBinding(PARAMS, 'vignette_radius', {
        label: '半径',
        min: 0.1,
        max: 1.0,
        step: 0.05
    }).on('change', debouncedRender);

    // 噪声效果
    const noiseFolder = pane.addFolder({ title: '噪声效果' });
    noiseFolder.addBinding(PARAMS, 'noise_intensity', {
        label: '强度',
        min: 0.0,
        max: 2.0,
        step: 0.01
    }).on('change', debouncedRender);
    
    noiseFolder.addBinding(PARAMS, 'noise_seed', {
        label: '种子',
        min: 0.0,
        max: 1000.0,
        step: 1.0
    }).on('change', debouncedRender);
    
    noiseFolder.addBinding(PARAMS, 'noise_granularity', {
        label: '粒度',
        min: 1.0,
        max: 500.0,
        step: 1.0
    }).on('change', debouncedRender);

    // 扭曲效果
    const warpFolder = pane.addFolder({ title: '扭曲效果' });
    warpFolder.addBinding(PARAMS, 'warp_intensity', {
        label: '强度',
        min: 0.0,
        max: 5.0,
        step: 0.1
    }).on('change', debouncedRender);
    
    warpFolder.addBinding(PARAMS, 'warp_center_x', {
        label: '中心点X',
        min: 0.0,
        max: 1.0,
        step: 0.01
    }).on('change', debouncedRender);
    
    warpFolder.addBinding(PARAMS, 'warp_center_y', {
        label: '中心点Y',
        min: 0.0,
        max: 1.0,
        step: 0.01
    }).on('change', debouncedRender);

    // 自定义滤镜
    const customFiltersFolder = pane.addFolder({ title: '自定义滤镜', expanded: true });
    
    // 负片效果
    customFiltersFolder.addBinding(PARAMS, 'custom_negative_enabled', {
        label: '负片效果'
    }).on('change', debouncedRender);

    // 发光效果
    customFiltersFolder.addBinding(PARAMS, 'custom_glow_enabled', {
        label: '发光效果'
    }).on('change', debouncedRender);
    
    customFiltersFolder.addBinding(PARAMS, 'custom_glow_intensity', {
        label: '发光强度',
        min: 0.0,
        max: 3.0,
        step: 0.1
    }).on('change', debouncedRender);

    // 操作按钮
    const actionsFolder = pane.addFolder({ title: '操作', expanded: true });
    
    actionsFolder.addButton({ title: '重置所有参数' }).on('click', resetFilters);
    actionsFolder.addButton({ title: '下载图像' }).on('click', downloadImage);
    actionsFolder.addButton({ title: '列出所有滤镜' }).on('click', listAllFilters);
    
    // 性能信息
    const performanceFolder = pane.addFolder({ title: '性能信息' });
    // performanceFolder.addMonitor(PARAMS, 'imageIndex', { label: '当前图像索引' });
}

// 加载图像
async function loadImage(index: number) {
    try {
        PARAMS.imageIndex = index;
        imgBitmap = await getImageBitmap(ImageUrls[index]);
        render();
    } catch (error) {
        console.error("Failed to load image:", error);
    }
}

// 加载用户上传的图像文件
async function loadImageFile(file: File) {
    try {
        const url = URL.createObjectURL(file);
        imgBitmap = await getImageBitmap(url);
        URL.revokeObjectURL(url);
        render();
    } catch (error) {
        console.error("Failed to load uploaded image:", error);
    }
}

// 渲染函数
function render() {
    if (!imgBitmap || !renderer) return;

    // 构建滤镜链
    const filters: FilterParam[] = [];

    // 基础滤镜
    if (PARAMS.brightness !== 0.0) {
        filters.push(renderer.createFilterParam('brightness', { brightness: PARAMS.brightness }));
    }
    
    if (PARAMS.contrast !== 1.0) {
        filters.push(renderer.createFilterParam('contrast', { contrast: PARAMS.contrast }));
    }
    
    if (PARAMS.saturation !== 1.0) {
        filters.push(renderer.createFilterParam('saturation', { saturation: PARAMS.saturation }));
    }
    
    if (PARAMS.hue_shift !== 0.0) {
        filters.push(renderer.createFilterParam('hue_shift', { hue_shift: PARAMS.hue_shift }));
    }

    // 艺术效果
    if (PARAMS.sepia_intensity > 0.0) {
        filters.push(renderer.createFilterParam('sepia', { intensity: PARAMS.sepia_intensity }));
    }
    
    if (PARAMS.vignette_intensity > 0.0) {
        filters.push(renderer.createFilterParam('vignette', { 
            intensity: PARAMS.vignette_intensity,
            radius: PARAMS.vignette_radius
        }));
    }

    // 噪声效果
    if (PARAMS.noise_intensity > 0.0) {
        filters.push(renderer.createFilterParam('noise', {
            ratio: PARAMS.noise_intensity,
            seed: PARAMS.noise_seed,
            granularity: PARAMS.noise_granularity
        }));
    }

    // 扭曲效果
    if (PARAMS.warp_intensity > 0.0) {
        filters.push(renderer.createFilterParam('warp', {
            intensity: PARAMS.warp_intensity,
            center: [PARAMS.warp_center_x, PARAMS.warp_center_y]
        }));
    }

    // 自定义滤镜
    if (PARAMS.custom_negative_enabled) {
        filters.push(renderer.createFilterParam('negative', {}));
    }
    
    if (PARAMS.custom_glow_enabled) {
        filters.push(renderer.createFilterParam('glow', {
            intensity: PARAMS.custom_glow_intensity,
            radius: PARAMS.custom_glow_radius
        }));
    }

    // 模糊（最后应用）
    if (PARAMS.blur > 0.0) {
        filters.push(renderer.createFilterParam('blur', { value: PARAMS.blur }));
    }

    console.time("render");
    
    try {
        const { width, height } = imgBitmap;
        basicCanvas.width = width;
        basicCanvas.height = height;

        const outCanvas = renderer.render(imgBitmap, filters, `demo_${Date.now()}`);
        
        const ctx = basicCanvas.getContext("2d")!;
        ctx.clearRect(0, 0, width, height);
        ctx.drawImage(outCanvas, 0, 0);
        
        console.timeEnd("render");
        
    } catch (error) {
        console.error("Render error:", error);
        console.timeEnd("render");
    }
}

// 防抖渲染
const debouncedRender = (() => {
    let timeout: number;
    return () => {
        if (renderTimer) {
            clearTimeout(renderTimer);
        }
        renderTimer = window.setTimeout(render, 50);
    };
})();

// 重置滤镜
function resetFilters() {
    PARAMS.blur = 0.0;
    PARAMS.brightness = 0.0;
    PARAMS.contrast = 1.0;
    PARAMS.saturation = 1.0;
    PARAMS.hue_shift = 0.0;
    PARAMS.sepia_intensity = 0.0;
    PARAMS.vignette_intensity = 0.0;
    PARAMS.vignette_radius = 0.7;
    PARAMS.noise_intensity = 0.0;
    PARAMS.noise_seed = 42.0;
    PARAMS.noise_granularity = 100.0;
    PARAMS.warp_intensity = 0.0;
    PARAMS.warp_center_x = 0.5;
    PARAMS.warp_center_y = 0.5;
    PARAMS.custom_negative_enabled = false;
    PARAMS.custom_glow_enabled = false;
    PARAMS.custom_glow_intensity = 1.0;
    
    pane.refresh();
    render();
}

// 下载图像
function downloadImage() {
    const dataUrl = basicCanvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.download = `filtered_image_${Date.now()}.png`;
    link.href = dataUrl;
    link.click();
}

// 列出所有滤镜
function listAllFilters() {
    const allFilters = renderer.getAvailableFilters();
    console.group('所有可用滤镜:');
    
    const categories = new Set(allFilters.map(f => f.category || 'other'));
    categories.forEach(category => {
        const categoryFilters = allFilters.filter(f => (f.category || 'other') === category);
        console.group(`${category} (${categoryFilters.length} 个滤镜):`);
        categoryFilters.forEach(filter => {
            console.log(`- ${filter.displayName} (${filter.name})`);
        });
        console.groupEnd();
    });
    
    console.groupEnd();
    
    alert(`总共有 ${allFilters.length} 个可用滤镜。请查看控制台获取详细信息。`);
}

// 启动应用
init().catch(console.error);
