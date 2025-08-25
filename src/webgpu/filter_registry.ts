import type { FilterParam } from "./utils/type";

/**
 * 滤镜配置接口
 */
export interface FilterConfig {
    /** 滤镜唯一标识符 */
    name: string;
    /** 显示名称 */
    displayName: string;
    /** WGSL着色器代码 */
    wgslCode: string;
    /** 滤镜参数定义 */
    parameters: {
        key: string;
        displayName: string;
        type: 'float' | 'vec2' | 'vec3' | 'vec4' | 'int' | 'bool';
        defaultValue: number | number[] | boolean;
        min?: number;
        max?: number;
        step?: number;
        description?: string;
    }[];
    /** 滤镜类别 */
    category?: 'blur' | 'color' | 'distortion' | 'noise' | 'artistic' | 'other';
    /** 是否是多Pass滤镜 */
    multiPass?: boolean;
    /** 自定义处理函数（可选，用于特殊滤镜如blur） */
    customProcessor?: string;
}

/**
 * 滤镜执行器接口
 */
export interface FilterProcessor {
    (commandEncoder: GPUCommandEncoder, filterParam: FilterParam): void;
}

/**
 * 滤镜注册表类
 */
export class FilterRegistry {
    private filters: Map<string, FilterConfig> = new Map();
    private processors: Map<string, FilterProcessor> = new Map();

    /**
     * 注册滤镜
     */
    registerFilter(config: FilterConfig, processor?: FilterProcessor) {
        this.filters.set(config.name, config);
        if (processor) {
            this.processors.set(config.name, processor);
        }
    }

    /**
     * 批量注册滤镜
     */
    registerFilters(configs: FilterConfig[], processors?: Map<string, FilterProcessor>) {
        configs.forEach(config => {
            this.filters.set(config.name, config);
            if (processors?.has(config.name)) {
                this.processors.set(config.name, processors.get(config.name)!);
            }
        });
    }

    /**
     * 取消注册滤镜
     */
    unregisterFilter(name: string) {
        this.filters.delete(name);
        this.processors.delete(name);
    }

    /**
     * 获取滤镜配置
     */
    getFilter(name: string): FilterConfig | undefined {
        return this.filters.get(name);
    }

    /**
     * 获取滤镜处理器
     */
    getProcessor(name: string): FilterProcessor | undefined {
        return this.processors.get(name);
    }

    /**
     * 获取所有滤镜
     */
    getAllFilters(): FilterConfig[] {
        return Array.from(this.filters.values());
    }

    /**
     * 根据类别获取滤镜
     */
    getFiltersByCategory(category: string): FilterConfig[] {
        return Array.from(this.filters.values()).filter(filter => filter.category === category);
    }

    /**
     * 检查滤镜是否已注册
     */
    hasFilter(name: string): boolean {
        return this.filters.has(name);
    }

    /**
     * 获取滤镜的WGSL代码
     */
    getWgslCode(name: string): string | undefined {
        return this.filters.get(name)?.wgslCode;
    }

    /**
     * 创建滤镜参数
     */
    createFilterParam(name: string, paramValues: { [key: string]: number | number[] | boolean }): FilterParam {
        const config = this.getFilter(name);
        if (!config) {
            throw new Error(`Filter "${name}" not found`);
        }

        const properties = config.parameters.map(param => {
            const value = paramValues[param.key] ?? param.defaultValue;
            // 确保boolean类型转换为number（0或1）
            const processedValue = typeof value === 'boolean' ? (value ? 1 : 0) : value;
            return {
                key: param.key,
                value: processedValue as number | number[]
            };
        });

        return {
            filterType: name,
            enable: true,
            properties,
            code: config.wgslCode
        };
    }

    /**
     * 验证滤镜参数
     */
    validateFilterParam(filterParam: FilterParam): boolean {
        const config = this.getFilter(filterParam.filterType);
        if (!config) {
            console.warn(`Filter "${filterParam.filterType}" not found`);
            return false;
        }

        // 验证参数数量和类型
        if (filterParam.properties) {
            for (const property of filterParam.properties) {
                const paramDef = config.parameters.find(p => p.key === property.key);
                if (!paramDef) {
                    console.warn(`Parameter "${property.key}" not found in filter "${filterParam.filterType}"`);
                    return false;
                }

                // 验证值的范围
                if (paramDef.min !== undefined && typeof property.value === 'number' && property.value < paramDef.min) {
                    console.warn(`Parameter "${property.key}" value ${property.value} is below minimum ${paramDef.min}`);
                    return false;
                }

                if (paramDef.max !== undefined && typeof property.value === 'number' && property.value > paramDef.max) {
                    console.warn(`Parameter "${property.key}" value ${property.value} is above maximum ${paramDef.max}`);
                    return false;
                }
            }
        }

        return true;
    }

    /**
     * 获取滤镜列表（用于UI显示）
     */
    getFilterList(): { name: string; displayName: string; category: string }[] {
        return Array.from(this.filters.values()).map(filter => ({
            name: filter.name,
            displayName: filter.displayName,
            category: filter.category || 'other'
        }));
    }

    /**
     * 搜索滤镜
     */
    searchFilters(query: string): FilterConfig[] {
        const lowercaseQuery = query.toLowerCase();
        return Array.from(this.filters.values()).filter(filter => 
            filter.name.toLowerCase().includes(lowercaseQuery) ||
            filter.displayName.toLowerCase().includes(lowercaseQuery) ||
            (filter.category && filter.category.toLowerCase().includes(lowercaseQuery))
        );
    }

    /**
     * 清空所有滤镜
     */
    clear() {
        this.filters.clear();
        this.processors.clear();
    }

    /**
     * 获取注册滤镜数量
     */
    size(): number {
        return this.filters.size;
    }
}
