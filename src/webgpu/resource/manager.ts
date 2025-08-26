/**
 * WebGPU资源管理器
 * 解决滤镜链中同名uniform参数相互覆盖的问题，为每个滤镜实例提供独立的资源空间
 * 
 * 核心解决的问题：
 * 1. 多个滤镜使用相同uniform名称时的参数覆盖
 * 2. 多Pass滤镜中不同Pass的参数隔离
 * 3. 滤镜链执行时的资源生命周期管理
 */

import type { CommonArray } from "../types";
import { getBuffer, getSampler } from "../utils/utils";

export interface VertexData {
    count: number;
    buffer: GPUBuffer;
}

export interface FilterResourceScope {
    /** 滤镜实例ID */
    filterId: string;
    /** Pass索引 */
    passIndex?: number;
    /** 资源命名空间前缀 */
    namespace: string;
    /** 滤镜类型（用于调试和资源优化） */
    filterType?: string;
    /** 作用域创建时间戳 */
    createdAt?: number;
}

/**
 * 资源类型枚举
 */
export enum ResourceType {
    BUFFER = 'buffer',
    ARRAY_BUFFER = 'array_buffer', 
    TEXTURE = 'texture',
    SAMPLER = 'sampler',
    VERTEX = 'vertex'
}

/**
 * 资源描述符
 */
export interface ResourceDescriptor {
    type: ResourceType;
    isShared: boolean; // 是否为共享资源
    autoCleanup: boolean; // 是否自动清理
    description?: string; // 资源描述
}

/**
 * 资源更新策略接口
 */
export interface ResourceUpdateStrategy {
    canHandle(resourceType: ResourceType, value: any): boolean;
    update(device: GPUDevice, existing: any, value: any, options?: any): any;
}

/**
 * 单一缓冲区更新策略
 */
export class BufferStrategy implements ResourceUpdateStrategy {
    canHandle(resourceType: ResourceType, value: any): boolean {
        return resourceType === ResourceType.BUFFER && !(value instanceof Array);
    }

    update(device: GPUDevice, existing: GPUBufferBinding | undefined, value: CommonArray, options?: any): GPUBufferBinding {
        const usage = options?.usage || (GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        
        if (!existing) {
            const buffer = getBuffer(device, value, usage);
            return { buffer };
        } else {
            device.queue.writeBuffer(existing.buffer, 0, value);
            return existing;
        }
    }
}

/**
 * 数组缓冲区更新策略
 */
export class ArrayStrategy implements ResourceUpdateStrategy {
    canHandle(resourceType: ResourceType, value: any): boolean {
        return resourceType === ResourceType.ARRAY_BUFFER || 
               (resourceType === ResourceType.BUFFER && value instanceof Array);
    }

    update(device: GPUDevice, existing: GPUBufferBinding[] | undefined, value: CommonArray[], options?: any): GPUBufferBinding[] {
        const usage = options?.usage || (GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
        const passIndex = options?.passIndex;
        
        if (!existing) {
            // 创建新的缓冲区数组
            return value.map(data => ({
                buffer: getBuffer(device, data, usage)
            }));
        } else {
            // 更新现有缓冲区
            if (passIndex !== undefined && existing[passIndex]) {
                // 更新特定索引的缓冲区
                device.queue.writeBuffer(existing[passIndex].buffer, 0, value[0] || value);
                return existing;
            } else {
                // 更新所有缓冲区
                for (let i = 0; i < Math.min(existing.length, value.length); i++) {
                    device.queue.writeBuffer(existing[i].buffer, 0, value[i]);
                }
                
                // 如果新数据更多，创建额外的缓冲区
                if (value.length > existing.length) {
                    const additionalBuffers = value.slice(existing.length).map(data => ({
                        buffer: getBuffer(device, data, usage)
                    }));
                    return [...existing, ...additionalBuffers];
                }
                
                return existing;
            }
        }
    }
}

/**
 * 增强的资源管理器类
 * 提供完整的滤镜链资源隔离和生命周期管理
 */
export class Manager {
    private device: GPUDevice;
    private globalResources: Map<string, GPUBindingResource | GPUBindingResource[] | VertexData> = new Map();
    private scopedResources: Map<string, Map<string, GPUBindingResource | GPUBindingResource[] | VertexData>> = new Map();
    private resourceScopes: Map<string, FilterResourceScope> = new Map();
    private resourceDescriptors: Map<string, ResourceDescriptor> = new Map();
    private updateStrategies: ResourceUpdateStrategy[] = [];
    private activeScopes: Set<string> = new Set(); // 跟踪活跃的作用域
    private resourceUsageStats: Map<string, { accessCount: number; lastAccess: number }> = new Map();

    constructor(device: GPUDevice) {
        this.device = device;
        this.initializeUpdateStrategies();
        this.initializeResourceDescriptors();
        this.initializeGlobalResources();
    }

    /**
     * 初始化资源更新策略
     */
    private initializeUpdateStrategies() {
        this.updateStrategies = [
            new BufferStrategy(),
            new ArrayStrategy()
        ];
    }

    /**
     * 初始化资源描述符
     */
    private initializeResourceDescriptors() {
        // 全局共享资源
        this.resourceDescriptors.set("mySampler", {
            type: ResourceType.SAMPLER,
            isShared: true,
            autoCleanup: false,
            description: "Global texture sampler"
        });

        this.resourceDescriptors.set("myTexture", {
            type: ResourceType.TEXTURE,
            isShared: true,
            autoCleanup: false,
            description: "Input texture binding"
        });

        this.resourceDescriptors.set("vertex", {
            type: ResourceType.VERTEX,
            isShared: true,
            autoCleanup: false,
            description: "Vertex buffer for full-screen quad"
        });

        // 常见的滤镜专用资源
        this.resourceDescriptors.set("direction", {
            type: ResourceType.ARRAY_BUFFER,
            isShared: false,
            autoCleanup: true,
            description: "Direction vectors for multi-pass blur"
        });

        // 通用uniform缓冲区模式
        const commonUniforms = [
            "blur_uniforms", "brightness_uniforms", "contrast_uniforms", 
            "saturation_uniforms", "noise_uniforms", "warp_uniforms",
            "hue_shift_uniforms", "sepia_uniforms", "vignette_uniforms"
        ];

        commonUniforms.forEach(name => {
            this.resourceDescriptors.set(name, {
                type: ResourceType.BUFFER,
                isShared: false,
                autoCleanup: true,
                description: `Uniform buffer for ${name.replace('_uniforms', '')} filter`
            });
        });
    }

    /**
     * 初始化全局共享资源（如顶点缓冲区、采样器等）
     */
    private initializeGlobalResources() {
        // 这些资源是所有滤镜共享的
        this.globalResources.set("mySampler", getSampler(this.device, {}));
        
        // 初始化方向缓冲区（每个滤镜都需要独立的实例）
        this.globalResources.set("direction_template", [
            { buffer: getBuffer(this.device, new Float32Array([1, 0]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST) },
            { buffer: getBuffer(this.device, new Float32Array([0, 1]), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST) }
        ]);
    }

    /**
     * 创建滤镜资源作用域
     */
    createFilterScope(filterId: string, passIndex?: number, filterType?: string): FilterResourceScope {
        const namespace = passIndex !== undefined 
            ? `${filterId}_pass_${passIndex}` 
            : filterId;
            
        const scope: FilterResourceScope = {
            filterId,
            passIndex,
            namespace,
            filterType,
            createdAt: Date.now()
        };

        // 创建作用域专用的资源映射
        if (!this.scopedResources.has(namespace)) {
            this.scopedResources.set(namespace, new Map());
            this.initializeScopeResources(namespace);
        }

        this.resourceScopes.set(namespace, scope);
        this.activeScopes.add(namespace);
        return scope;
    }

    /**
     * 为作用域初始化必要的资源
     */
    private initializeScopeResources(namespace: string) {
        const scopeMap = this.scopedResources.get(namespace)!;
        
        // 复制方向缓冲区模板为每个作用域创建独立实例
        const directionTemplate = this.globalResources.get("direction_template") as GPUBufferBinding[];
        if (directionTemplate) {
            const scopedDirection = directionTemplate.map(() => ({
                buffer: getBuffer(this.device, new Float32Array(2), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST)
            }));
            scopeMap.set("direction", scopedDirection);
        }

        // 预创建常用的uniform缓冲区
        const commonUniforms = ["blur_uniforms", "brightness_uniforms", "contrast_uniforms"];
        commonUniforms.forEach(uniformName => {
            const buffer = getBuffer(this.device, new Float32Array(4), GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST);
            scopeMap.set(uniformName, { buffer });
        });
    }

    /**
     * 设置资源（带作用域隔离）
     */
    setScopedResource(scope: FilterResourceScope, name: string, resource: GPUBindingResource | GPUBindingResource[] | VertexData) {
        const scopeMap = this.scopedResources.get(scope.namespace);
        if (!scopeMap) {
            throw new Error(`Resource scope ${scope.namespace} not found`);
        }
        
        scopeMap.set(name, resource);
    }

    /**
     * 获取资源（按作用域查找，回退到全局资源）
     */
    getResource(scope: FilterResourceScope, name: string): GPUBindingResource | GPUBindingResource[] | VertexData | undefined {
        // 记录资源访问统计
        this.recordResourceAccess(name);
        
        console.log("🔍 Getting resource:", name, "for scope:", scope.namespace);

        // 首先在作用域中查找
        const scopeMap = this.scopedResources.get(scope.namespace);
        if (scopeMap) {
            console.log("🔍 Resource name:", name, "available scoped resources:", Array.from(scopeMap.keys()));

            // 先直接名称
            if (scopeMap.has(name)) {
                console.log("✅ Found scoped resource:", name);
                return scopeMap.get(name);
            }
            // 再尝试作用域前缀版本（因为 updateScopedBuffer 使用了前缀）
            const prefixed = `${scope.namespace}_${name}`;
            if (scopeMap.has(prefixed)) {
                console.log("✅ Found prefixed scoped resource:", prefixed);
                return scopeMap.get(prefixed);
            }
        }

        // 回退到全局资源
        const globalResource = this.globalResources.get(name);
        if (globalResource) {
            console.log("✅ Found global resource:", name);
        } else {
            console.log("❌ Resource not found:", name);
        }
        return globalResource;
    }

    /**
     * 记录资源访问统计
     */
    private recordResourceAccess(resourceName: string) {
        const current = this.resourceUsageStats.get(resourceName) || { accessCount: 0, lastAccess: 0 };
        current.accessCount++;
        current.lastAccess = Date.now();
        this.resourceUsageStats.set(resourceName, current);
    }

    /**
     * 智能资源更新 - 根据资源类型自动选择策略
     */
    updateResourceSmart(scope: FilterResourceScope, key: string, value: any, options?: any) {
        const descriptor = this.resourceDescriptors.get(key);
        const resourceType = descriptor?.type || this.inferResourceType(key, value);
        
        // 查找合适的更新策略
        const strategy = this.updateStrategies.find(s => s.canHandle(resourceType, value));
        if (!strategy) {
            console.warn(`No update strategy found for resource ${key} of type ${resourceType}`);
            return;
        }

        const scopeMap = this.scopedResources.get(scope.namespace);
        if (!scopeMap) {
            throw new Error(`Resource scope ${scope.namespace} not found`);
        }

        const scopedKey = this.getScopedKey(scope, key);
        const existing = scopeMap.get(scopedKey);
        
        try {
            const updated = strategy.update(this.device, existing, value, options);
            scopeMap.set(scopedKey, updated);
            
            console.log(`✅ Updated resource ${key} in scope ${scope.namespace}`);
        } catch (error) {
            console.error(`❌ Failed to update resource ${key}:`, error);
            throw error;
        }
    }

    /**
     * 推断资源类型
     */
    private inferResourceType(key: string, value: any): ResourceType {
        if (key === 'direction' || value instanceof Array) {
            return ResourceType.ARRAY_BUFFER;
        }
        if (key.includes('texture')) {
            return ResourceType.TEXTURE;
        }
        if (key.includes('sampler')) {
            return ResourceType.SAMPLER;
        }
        if (key === 'vertex') {
            return ResourceType.VERTEX;
        }
        return ResourceType.BUFFER;
    }

    /**
     * 更新缓冲区（作用域隔离）
     */
    updateScopedBuffer(
        scope: FilterResourceScope, 
        key: string, 
        arr: CommonArray | CommonArray[], 
        usage = GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST
    ) {
        // 生成作用域专用的缓冲区键名
        const scopedKey = this.getScopedKey(scope, key);
        
        const scopeMap = this.scopedResources.get(scope.namespace);
        if (!scopeMap) {
            throw new Error(`Resource scope ${scope.namespace} not found`);
        }

        const bufferBinding = scopeMap.get(scopedKey) as GPUBufferBinding | GPUBufferBinding[] | undefined;

        if (arr instanceof Array) {
            const createBuffer = (bufferBindings: GPUBufferBinding[], data: CommonArray, bufferBinding?: GPUBufferBinding) => {
                if (!bufferBinding) {
                    const buffer = getBuffer(this.device, data, usage);
                    bufferBinding = { buffer };
                } else {
                    this.device.queue.writeBuffer(bufferBinding.buffer, 0, data);
                }
                bufferBindings.push(bufferBinding);
            };

            const bufferBindings: GPUBufferBinding[] = [];
            if (!bufferBinding) {
                arr.forEach(data => createBuffer(bufferBindings, data));
            } else {
                if (!(bufferBinding instanceof Array)) {
                    this.device.queue.writeBuffer((bufferBinding as GPUBufferBinding).buffer, 0, arr[0]);
                    bufferBindings.push(bufferBinding as GPUBufferBinding);
                    for (let index = 1; index < arr.length; index++) {
                        createBuffer(bufferBindings, arr[index]);
                    }
                } else {
                    for (let index = 0; index < arr.length; index++) {
                        createBuffer(bufferBindings, arr[index], bufferBinding[index]);
                    }
                }
            }

            scopeMap.set(scopedKey, bufferBindings);
        } else {
            if (!bufferBinding) {
                const buffer = getBuffer(this.device, arr, usage);
                scopeMap.set(scopedKey, { buffer });
            } else {
                this.device.queue.writeBuffer((bufferBinding as GPUBufferBinding).buffer, 0, arr);
            }
        }
    }

    /**
     * 更新特定Pass的方向缓冲区
     */
    updateDirectionBuffer(scope: FilterResourceScope, passIndex: number, direction: Float32Array) {
        const scopeMap = this.scopedResources.get(scope.namespace);
        if (!scopeMap) {
            throw new Error(`Resource scope ${scope.namespace} not found`);
        }

        const directionBuffers = scopeMap.get("direction") as GPUBufferBinding[];
        if (directionBuffers && directionBuffers[passIndex]) {
            this.device.queue.writeBuffer(directionBuffers[passIndex].buffer, 0, direction.buffer);
        } else {
            console.warn(`Direction buffer not found for pass ${passIndex} in scope ${scope.namespace}`);
        }
    }

    /**
     * 生成作用域专用的键名
     */
    private getScopedKey(scope: FilterResourceScope, key: string): string {
        // 对于一些通用资源，不需要作用域前缀
        const globalKeys = ['myTexture', 'vertex', 'mySampler'];
        if (globalKeys.includes(key)) {
            return key;
        }

        return `${scope.namespace}_${key}`;
    }

    /**
     * 清理作用域资源
     */
    cleanupScope(scope: FilterResourceScope) {
        const scopeMap = this.scopedResources.get(scope.namespace);
        if (scopeMap) {
            // 销毁作用域中的所有GPU资源
            for (const [, resource] of scopeMap) {
                this.destroyResource(resource);
            }
            this.scopedResources.delete(scope.namespace);
        }
        this.resourceScopes.delete(scope.namespace);
        this.activeScopes.delete(scope.namespace);
        
        console.log(`🗑️ Cleaned up scope: ${scope.namespace}`);
    }

    /**
     * 批量清理非活跃作用域
     */
    cleanupInactiveScopes(maxAge: number = 60000) { // 默认1分钟
        const now = Date.now();
        const scopesToClean: FilterResourceScope[] = [];
        
        for (const scope of this.resourceScopes.values()) {
            if (scope.createdAt && (now - scope.createdAt) > maxAge && !this.activeScopes.has(scope.namespace)) {
                scopesToClean.push(scope);
            }
        }
        
        scopesToClean.forEach(scope => this.cleanupScope(scope));
        console.log(`🗑️ Cleaned up ${scopesToClean.length} inactive scopes`);
    }

    /**
     * 标记作用域为活跃状态
     */
    markScopeActive(namespace: string) {
        this.activeScopes.add(namespace);
    }

    /**
     * 标记作用域为非活跃状态
     */
    markScopeInactive(namespace: string) {
        this.activeScopes.delete(namespace);
    }

    /**
     * 销毁GPU资源
     */
    private destroyResource(resource: GPUBindingResource | GPUBindingResource[] | VertexData) {
        if (Array.isArray(resource)) {
            resource.forEach(r => this.destroyResource(r));
        } else if ('buffer' in resource && resource.buffer) {
            try {
                resource.buffer.destroy();
            } catch (e) {
                // Buffer已经被销毁或无效
            }
        } else if ('count' in resource && 'buffer' in resource) {
            // VertexData
            try {
                resource.buffer.destroy();
            } catch (e) {
                // Buffer已经被销毁或无效
            }
        }
    }

    /**
     * 获取所有资源的调试信息
     */
    getDebugInfo(): { 
        globalResources: string[], 
        scopedResources: Record<string, string[]>,
        activeScopes: string[],
        resourceUsageStats: Record<string, { accessCount: number; lastAccess: number }>,
        resourceDescriptors: Record<string, ResourceDescriptor>
    } {
        const result = {
            globalResources: Array.from(this.globalResources.keys()),
            scopedResources: {} as Record<string, string[]>,
            activeScopes: Array.from(this.activeScopes),
            resourceUsageStats: Object.fromEntries(this.resourceUsageStats.entries()),
            resourceDescriptors: Object.fromEntries(this.resourceDescriptors.entries())
        };

        for (const [namespace, scopeMap] of this.scopedResources) {
            result.scopedResources[namespace] = Array.from(scopeMap.keys());
        }

        return result;
    }

    /**
     * 获取性能统计信息
     */
    getPerformanceStats(): {
        totalScopes: number;
        activeScopes: number;
        totalResources: number;
        memoryEstimate: number; // 估算的内存使用量（字节）
    } {
        let totalResources = this.globalResources.size;
        let memoryEstimate = 0;

        // 计算作用域资源
        for (const scopeMap of this.scopedResources.values()) {
            totalResources += scopeMap.size;
        }

        // 粗略估算内存使用（每个buffer按4KB计算）
        memoryEstimate = totalResources * 4096;

        return {
            totalScopes: this.resourceScopes.size,
            activeScopes: this.activeScopes.size,
            totalResources,
            memoryEstimate
        };
    }

    /**
     * 检查资源健康状态
     */
    healthCheck(): {
        isHealthy: boolean;
        issues: string[];
        recommendations: string[];
    } {
        const issues: string[] = [];
        const recommendations: string[] = [];

        // 检查是否有过多的非活跃作用域
        const inactiveScopes = this.resourceScopes.size - this.activeScopes.size;
        if (inactiveScopes > 10) {
            issues.push(`Too many inactive scopes: ${inactiveScopes}`);
            recommendations.push('Run cleanupInactiveScopes() to free memory');
        }

        // 检查内存使用
        const stats = this.getPerformanceStats();
        if (stats.memoryEstimate > 100 * 1024 * 1024) { // 100MB
            issues.push(`High memory usage estimated: ${Math.round(stats.memoryEstimate / 1024 / 1024)}MB`);
            recommendations.push('Consider reducing filter chain length or cleanup frequency');
        }

        // 检查资源泄漏迹象
        if (stats.totalScopes > 50) {
            issues.push(`Potential memory leak: ${stats.totalScopes} scopes created`);
            recommendations.push('Check if all scopes are properly cleaned up');
        }

        return {
            isHealthy: issues.length === 0,
            issues,
            recommendations
        };
    }

    /**
     * 设置全局资源（如纹理、采样器等）
     */
    setGlobalResource(name: string, resource: GPUBindingResource | GPUBindingResource[] | VertexData) {
        this.globalResources.set(name, resource);
        
        // 如果是共享纹理，也要更新到所有作用域
    if (name === 'myTexture') {
            for (const scopeMap of this.scopedResources.values()) {
                scopeMap.set(name, resource);
            }
        }
    }

    /**
     * 清理所有资源
     */
    destroy() {
        // 清理所有作用域
        for (const scope of this.resourceScopes.values()) {
            this.cleanupScope(scope);
        }

        // 清理全局资源
        for (const resource of this.globalResources.values()) {
            this.destroyResource(resource);
        }

        this.globalResources.clear();
        this.scopedResources.clear();
        this.resourceScopes.clear();
    }
}
