/**
 * 配置驱动的资源管理器
 * 整合Manager和Factory，实现完全声明式的资源管理
 */

import { Manager, type FilterResourceScope } from "./manager";
import { FactoryManager } from "./factory";
import { FILTER_RESOURCE_CONFIGS, type ResourceContext, type FilterResourceConfig } from "./config";

/**
 * 配置驱动的资源管理器
 */
export class ConfigManager {
    private resourceManager: Manager;
    private factoryManager: FactoryManager;

    constructor(device: GPUDevice) {
        this.resourceManager = new Manager(device);
        this.factoryManager = new FactoryManager();
    }

    /**
     * 根据滤镜名称创建资源作用域
     */
    private createFilterScope(filterName: string, passIndex?: number): FilterResourceScope {
        return this.resourceManager.createFilterScope(
            `${filterName}_${passIndex || 0}`,
            passIndex,
            filterName
        );
    }

    /**
     * 根据滤镜名称创建资源
     */
    createResourcesForFilter(
        filterName: string,
        params: Record<string, any>,
        context: Omit<ResourceContext, 'device' | 'filterType'>
    ): Record<string, any> {
        const filterConfig = FILTER_RESOURCE_CONFIGS[filterName];
        if (!filterConfig) {
            throw new Error(`No resource configuration found for filter: ${filterName}`);
        }

        const fullContext: ResourceContext = {
            ...context,
            device: this.resourceManager['device'], // 访问私有属性
            filterType: filterName,
            params
        };

        const resources: Record<string, any> = {};

        // 创建配置中定义的所有资源
        for (const [resourceName, resourceConfig] of Object.entries(filterConfig.resources)) {
            try {
                const resource = this.factoryManager.createResource(resourceConfig, fullContext);
                resources[resourceName] = resource;
                
                // 注册到ResourceManager
                const scope = this.createFilterScope(filterName, context.passIndex);
                this.resourceManager.setScopedResource(scope, resourceName, resource);
            } catch (error) {
                console.error(`Failed to create resource ${resourceName} for filter ${filterName}:`, error);
                throw error;
            }
        }

        return resources;
    }

    /**
     * 更新资源参数
     */
    updateResourceParameter(
        filterName: string,
        resourceName: string,
        newValue: any,
        context: Omit<ResourceContext, 'device' | 'filterType'>
    ): any {
        const filterConfig = FILTER_RESOURCE_CONFIGS[filterName];
        if (!filterConfig) {
            throw new Error(`No resource configuration found for filter: ${filterName}`);
        }
        
        if (!filterConfig.resources[resourceName]) {
            throw new Error(`Resource ${resourceName} not found in filter ${filterName}`);
        }

        const resourceConfig = filterConfig.resources[resourceName];
        const fullContext: ResourceContext = {
            ...context,
            device: this.resourceManager['device'],
            filterType: filterName,
            params: context.params
        };

        const scope = this.createFilterScope(filterName, context.passIndex);
        const existing = this.resourceManager.getResource(scope, resourceName);

        if (!existing) {
            // 如果不存在，直接创建新的
            const newResource = this.factoryManager.createResource(resourceConfig, fullContext);
            this.resourceManager.setScopedResource(scope, resourceName, newResource);
            return newResource;
        }

        // 更新现有资源
        const updated = this.factoryManager.updateResource(resourceConfig, existing, newValue, fullContext);
        
        // 重新设置资源
        this.resourceManager.setScopedResource(scope, resourceName, updated);
        
        return updated;
    }

    /**
     * 为多通道滤镜创建所有通道的资源
     */
    createMultiPassResources(
        filterName: string,
        params: Record<string, any>,
        context: Omit<ResourceContext, 'device' | 'filterType' | 'passIndex'>
    ): Record<number, Record<string, any>> {
        const filterConfig = FILTER_RESOURCE_CONFIGS[filterName];
        if (!filterConfig) {
            throw new Error(`No resource configuration found for filter: ${filterName}`);
        }

        const passCount = filterConfig.passCount || 1;
        const allPassResources: Record<number, Record<string, any>> = {};

        for (let passIndex = 0; passIndex < passCount; passIndex++) {
            const passContext = {
                ...context,
                passIndex,
                params
            };

            const passResources = this.createResourcesForFilter(filterName, params, passContext);
            allPassResources[passIndex] = passResources;
        }

        return allPassResources;
    }

    /**
     * 获取滤镜的资源配置
     */
    getFilterConfig(filterName: string): FilterResourceConfig | undefined {
        return FILTER_RESOURCE_CONFIGS[filterName];
    }

    /**
     * 检查滤镜是否为多通道滤镜
     */
    isMultiPassFilter(filterName: string): boolean {
        const config = this.getFilterConfig(filterName);
        return (config?.passCount || 1) > 1;
    }

    /**
     * 获取滤镜的通道数量
     */
    getPassCount(filterName: string): number {
        const config = this.getFilterConfig(filterName);
        return config?.passCount || 1;
    }

    /**
     * 获取特定通道的资源
     */
    getPassResource(filterName: string, passIndex: number, resourceName: string): any {
        const scope = this.createFilterScope(filterName, passIndex);
        return this.resourceManager.getResource(scope, resourceName);
    }

    /**
     * 清理滤镜的所有资源 
     * 注意：ResourceManager没有直接的清理方法，这里主要清理缓存
     */
    cleanupFilterResources(filterName: string): void {
        // 主要清理工厂缓存
        this.clearCaches();
        
        console.log(`Cleaned up resources for filter: ${filterName}`);
    }

    /**
     * 批量清理资源缓存
     */
    clearCaches(): void {
        this.factoryManager.clearCaches();
    }

    /**
     * 获取Manager实例（用于高级操作）
     */
    getResourceManager(): Manager {
        return this.resourceManager;
    }

    /**
     * 获取工厂管理器实例（用于扩展）
     */
    getFactoryManager(): FactoryManager {
        return this.factoryManager;
    }

    /**
     * 销毁管理器
     */
    destroy(): void {
        this.clearCaches();
        console.log('ConfigurableResourceManager destroyed');
    }
}
