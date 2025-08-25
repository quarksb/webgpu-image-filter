import type { FilterConfig } from "../common";
import noiseWgsl from "./wgsl/noise.wgsl";
import warpWgsl from "./wgsl/warp.wgsl";
import copyWgsl from "./wgsl/copy.wgsl";
import blurWgsl from "./wgsl/blur.wgsl";
import saturationWgsl from "./wgsl/saturation.wgsl";
import contrastWgsl from "./wgsl/contrast.wgsl";
import brightnessWgsl from "./wgsl/brightness.wgsl";
import hueShiftWgsl from "./wgsl/hue_shift.wgsl";
import sepiaWgsl from "./wgsl/sepia.wgsl";
import vignetteWgsl from "./wgsl/vignette.wgsl";

/**
 * 内置滤镜配置
 */
export const builtinFilters: FilterConfig[] = [
    // 基础滤镜
    {
        name: 'copy',
        displayName: 'Copy',
        wgslCode: copyWgsl,
        parameters: [],
        category: 'other'
    },

    // 噪声滤镜
    {
        name: 'noise',
        displayName: 'Noise',
        wgslCode: noiseWgsl,
        parameters: [
            {
                key: 'ratio',
                displayName: 'Noise Ratio',
                type: 'float',
                defaultValue: 0.5,
                min: 0.0,
                max: 2.0,
                step: 0.01,
                description: 'Noise intensity ratio'
            },
            {
                key: 'seed',
                displayName: 'Seed',
                type: 'float',
                defaultValue: 42.0,
                min: 0.0,
                max: 1000.0,
                step: 1.0,
                description: 'Random seed for noise generation'
            },
            {
                key: 'granularity',
                displayName: 'Granularity',
                type: 'float',
                defaultValue: 100.0,
                min: 1.0,
                max: 500.0,
                step: 1.0,
                description: 'Noise granularity (frequency)'
            }
        ],
        category: 'noise'
    },

    // 扭曲滤镜
    {
        name: 'warp',
        displayName: 'Warp Distortion',
        wgslCode: warpWgsl,
        parameters: [
            {
                key: 'intensity',
                displayName: 'Intensity',
                type: 'float',
                defaultValue: 1.0,
                min: 0.0,
                max: 5.0,
                step: 0.1,
                description: 'Warp distortion intensity'
            },
            {
                key: 'center',
                displayName: 'Center',
                type: 'vec2',
                defaultValue: [0.5, 0.5],
                description: 'Center point of warp effect (normalized coordinates)'
            }
        ],
        category: 'distortion'
    },

    // 模糊滤镜（多Pass）
    {
        name: 'blur',
        displayName: 'Gaussian Blur',
        wgslCode: blurWgsl,
        parameters: [
            {
                key: 'value',
                displayName: 'Blur Radius',
                type: 'float',
                defaultValue: 2.0,
                min: 0.0,
                max: 20.0,
                step: 0.5,
                description: 'Blur radius in pixels'
            }
        ],
        category: 'blur',
        multiPass: true,
        customProcessor: 'blur' // 使用自定义处理器
    },

    // 饱和度滤镜
    {
        name: 'saturation',
        displayName: 'Saturation',
        wgslCode: saturationWgsl,
        parameters: [
            {
                key: 'saturation',
                displayName: 'Saturation',
                type: 'float',
                defaultValue: 1.0,
                min: 0.0,
                max: 3.0,
                step: 0.1,
                description: 'Color saturation level (1.0 = normal, 0.0 = grayscale)'
            }
        ],
        category: 'color'
    },

    // 对比度滤镜
    {
        name: 'contrast',
        displayName: 'Contrast',
        wgslCode: contrastWgsl,
        parameters: [
            {
                key: 'contrast',
                displayName: 'Contrast',
                type: 'float',
                defaultValue: 1.0,
                min: 0.0,
                max: 3.0,
                step: 0.1,
                description: 'Contrast adjustment (1.0 = normal)'
            }
        ],
        category: 'color'
    },

    // 亮度滤镜
    {
        name: 'brightness',
        displayName: 'Brightness',
        wgslCode: brightnessWgsl,
        parameters: [
            {
                key: 'brightness',
                displayName: 'Brightness',
                type: 'float',
                defaultValue: 0.0,
                min: -1.0,
                max: 1.0,
                step: 0.05,
                description: 'Brightness adjustment (0.0 = normal, negative = darker, positive = brighter)'
            }
        ],
        category: 'color'
    },

    // 色相偏移滤镜
    {
        name: 'hue_shift',
        displayName: 'Hue Shift',
        wgslCode: hueShiftWgsl,
        parameters: [
            {
                key: 'hue_shift',
                displayName: 'Hue Shift',
                type: 'float',
                defaultValue: 0.0,
                min: 0.0,
                max: 1.0,
                step: 0.01,
                description: 'Hue shift amount (0.0-1.0 represents 0-360 degrees)'
            }
        ],
        category: 'color'
    },

    // 棕褐色调滤镜
    {
        name: 'sepia',
        displayName: 'Sepia Tone',
        wgslCode: sepiaWgsl,
        parameters: [
            {
                key: 'intensity',
                displayName: 'Intensity',
                type: 'float',
                defaultValue: 1.0,
                min: 0.0,
                max: 1.0,
                step: 0.1,
                description: 'Sepia effect intensity (0.0 = no effect, 1.0 = full sepia)'
            }
        ],
        category: 'artistic'
    },

    // 晕影效果滤镜
    {
        name: 'vignette',
        displayName: 'Vignette Effect',
        wgslCode: vignetteWgsl,
        parameters: [
            {
                key: 'intensity',
                displayName: 'Intensity',
                type: 'float',
                defaultValue: 0.5,
                min: 0.0,
                max: 1.0,
                step: 0.05,
                description: 'Vignette intensity'
            },
            {
                key: 'radius',
                displayName: 'Radius',
                type: 'float',
                defaultValue: 0.7,
                min: 0.1,
                max: 1.0,
                step: 0.05,
                description: 'Vignette radius'
            }
        ],
        category: 'artistic'
    }
];
