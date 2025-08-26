import type { FilterParam, Property } from "../webgpu/types";
import { WGSL_BRIGHTNESS, WGSL_CONTRAST, WGSL_HUE_SHIFT, WGSL_SEPIA, WGSL_VIGNETTE } from "../webgpu";

export interface CustomFilterConfig {
    name: string;
    displayName: string;
    wgslCode: string;
    parameters: {
        key: string;
        displayName: string;
        type: "float" | "vec2" | "vec3" | "int";
        defaultValue: number | number[];
        min?: number;
        max?: number;
        step?: number;
    }[];
}

export interface CustomFilterParam extends FilterParam {
    filterType: "custom";
    customFilterName: string;
    enable?: boolean;
}

export class CustomFilterManager {
    private customFilters: Map<string, CustomFilterConfig> = new Map();

    registerFilter(config: CustomFilterConfig) {
        this.customFilters.set(config.name, config);
    }

    getFilter(name: string): CustomFilterConfig | undefined {
        return this.customFilters.get(name);
    }

    getAllFilters(): CustomFilterConfig[] {
        return Array.from(this.customFilters.values());
    }

    createFilterParam(name: string, paramValues: Property[]): CustomFilterParam {
        const config = this.getFilter(name);
        if (!config) {
            throw new Error(`Custom filter "${name}" not found`);
        }

        const properties = config.parameters.map(param => ({
            key: param.key,
            value: paramValues.find(p => p.key === param.key)?.value ?? param.defaultValue
        }));

        return {
            filterType: "custom",
            customFilterName: name,
            enable: true,
            properties,
            code: config.wgslCode
        };
    }
}

// 预定义一些自定义滤镜示例
export const defaultCustomFilters: CustomFilterConfig[] = [
    {
        name: "contrast",
        displayName: "Contrast",
        wgslCode: WGSL_CONTRAST,
        parameters: [
            {
                key: "contrast",
                displayName: "Contrast",
                type: "float",
                defaultValue: 1.0,
                min: 0.0,
                max: 3.0,
                step: 0.1
            }
        ]
    },
    {
        name: "brightness",
        displayName: "Brightness",
        wgslCode: WGSL_BRIGHTNESS,
        parameters: [
            {
                key: "brightness",
                displayName: "Brightness",
                type: "float",
                defaultValue: 0.0,
                min: -1.0,
                max: 1.0,
                step: 0.05
            }
        ]
    },
    {
        name: "hue_shift",
        displayName: "Hue Shift",
        wgslCode: WGSL_HUE_SHIFT,
        parameters: [
            {
                key: "hue_shift",
                displayName: "Hue Shift",
                type: "float",
                defaultValue: 0.0,
                min: 0.0,
                max: 1.0,
                step: 0.01
            }
        ]
    },
    {
        name: "sepia",
        displayName: "Sepia Tone",
        wgslCode: WGSL_SEPIA,
        parameters: [
            {
                key: "intensity",
                displayName: "Intensity",
                type: "float",
                defaultValue: 1.0,
                min: 0.0,
                max: 1.0,
                step: 0.1
            }
        ]
    },
    {
        name: "vignette",
        displayName: "Vignette Effect",
        wgslCode: WGSL_VIGNETTE,
        parameters: [
            {
                key: "intensity",
                displayName: "Intensity",
                type: "float",
                defaultValue: 0.5,
                min: 0.0,
                max: 1.0,
                step: 0.05
            },
            {
                key: "radius",
                displayName: "Radius",
                type: "float",
                defaultValue: 0.7,
                min: 0.1,
                max: 1.0,
                step: 0.05
            }
        ]
    }
];
