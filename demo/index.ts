import { Pane } from "tweakpane";
import { uploadFile, getImageBitmap } from "./utils";
import { getGpuDevice } from "../src";
import { ImageUrls } from "./assets";
import { 
    BasicRenderer, 
    FilterParam
} from "../src";
import "./index.css";

const basicCanvas = <HTMLCanvasElement>document.getElementById("canvas")!;
const w = 1200;
const h = 675;

basicCanvas.width = w;
basicCanvas.height = h;

// 使用新滤镜注册系统的简化参数
const PARAMS = {
    // 基础滤镜参数
    brightness: 0.0,
    contrast: 1.0,
    saturation: 1.0,
    hue_shift: 0.0,
    
    // 特效滤镜
    blur: 0.0,
    sepia_intensity: 0.0,
    vignette_intensity: 0.0,
    vignette_radius: 0.7,
    
    // 噪声和扭曲
    noise_intensity: 0.0,
    noise_seed: 42.0,
    noise_granularity: 100.0,
    warp_intensity: 0.0,
    warp_center_x: 0.5,
    warp_center_y: 0.5,
    
    // UI参数
    imageIndex: 0,
    backgroundColor: "#88ddff",
};

// 创建Tweakpane实例
const paneContainer = document.getElementById("tweakpane-container")!;
const pane = new Pane({ container: paneContainer });

let device: any;
let renderer: BasicRenderer;
let imgBitmap: ImageBitmap;
let renderTimer: number | null = null;

// 初始化函数
async function init() {
    try {
        device = (await getGpuDevice()).device;
        renderer = new BasicRenderer(device);
        
        console.log('WebGPU Image Filter initialized!');
        console.log('Available filters:', renderer.getAvailableFilters().map(f => f.name));
        
        await loadImage(0);
        setupUI();
        
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

    imageFolder.addButton({ title: '上传图像' }).on('click', () => {
        uploadFile((file) => loadImageFile(file));
    });

    // 颜色调整
    const colorFolder = pane.addFolder({ title: '颜色调整', expanded: true });
    
    colorFolder.addBinding(PARAMS, 'brightness', {
        label: '亮度',
        min: -1.0,
        max: 1.0,
        step: 0.05
    }).on('change', debouncedRender);

    colorFolder.addBinding(PARAMS, 'contrast', {
        label: '对比度',
        min: 0.0,
        max: 3.0,
        step: 0.1
    }).on('change', debouncedRender);

    colorFolder.addBinding(PARAMS, 'saturation', {
        label: '饱和度',
        min: 0.0,
        max: 3.0,
        step: 0.1
    }).on('change', debouncedRender);

    colorFolder.addBinding(PARAMS, 'hue_shift', {
        label: '色相偏移',
        min: 0.0,
        max: 1.0,
        step: 0.01
    }).on('change', debouncedRender);

    // 特效滤镜
    const effectsFolder = pane.addFolder({ title: '特效滤镜', expanded: true });
    
    effectsFolder.addBinding(PARAMS, 'blur', {
        label: '模糊',
        min: 0.0,
        max: 20.0,
        step: 0.5
    }).on('change', debouncedRender);

    effectsFolder.addBinding(PARAMS, 'sepia_intensity', {
        label: '棕褐色调',
        min: 0.0,
        max: 1.0,
        step: 0.1
    }).on('change', debouncedRender);

    // 晕影效果
    const vignetteFolder = effectsFolder.addFolder({ title: '晕影效果' });
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

    // 噪声和扭曲
    const distortionFolder = pane.addFolder({ title: '噪声与扭曲' });
    
    const noiseFolder = distortionFolder.addFolder({ title: '噪声效果' });
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

    const warpFolder = distortionFolder.addFolder({ title: '扭曲效果' });
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

    // 操作按钮
    const actionsFolder = pane.addFolder({ title: '操作', expanded: true });
    
    actionsFolder.addButton({ title: '重置所有参数' }).on('click', resetFilters);
    actionsFolder.addButton({ title: '下载图像' }).on('click', downloadImage);
    actionsFolder.addButton({ title: '显示滤镜信息' }).on('click', showFilterInfo);
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

    const { width, height } = imgBitmap;
    basicCanvas.width = width;
    basicCanvas.height = height;

    // 构建滤镜链
    const filters: FilterParam[] = [];

    // 颜色调整滤镜
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

    // 特效滤镜
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

    // 模糊（最后应用）
    if (PARAMS.blur > 0.0) {
        filters.push(renderer.createFilterParam('blur', { value: PARAMS.blur }));
    }

    console.time("render");
    
    try {
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
    return () => {
        if (renderTimer) {
            clearTimeout(renderTimer);
        }
        renderTimer = window.setTimeout(render, 50);
    };
})();

// 重置滤镜
function resetFilters() {
    PARAMS.brightness = 0.0;
    PARAMS.contrast = 1.0;
    PARAMS.saturation = 1.0;
    PARAMS.hue_shift = 0.0;
    PARAMS.blur = 0.0;
    PARAMS.sepia_intensity = 0.0;
    PARAMS.vignette_intensity = 0.0;
    PARAMS.vignette_radius = 0.7;
    PARAMS.noise_intensity = 0.0;
    PARAMS.noise_seed = 42.0;
    PARAMS.noise_granularity = 100.0;
    PARAMS.warp_intensity = 0.0;
    PARAMS.warp_center_x = 0.5;
    PARAMS.warp_center_y = 0.5;
    
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

// 显示滤镜信息
function showFilterInfo() {
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
