# 滤镜注册系统迁移指南

## 概述

WebGPU Image Filter 已经从硬编码的滤镜系统升级到了灵活的滤镜注册系统。本指南将帮助您从旧版本迁移到新版本。

## 🔄 主要变更

### 之前 (硬编码系统)
- 滤镜在渲染器构造函数中硬编码
- 自定义滤镜和内置滤镜分别处理
- 需要修改源代码添加新滤镜
- switch语句处理不同滤镜类型

### 现在 (注册系统)  
- 所有滤镜通过统一的注册系统管理
- 运行时动态注册和注销滤镜
- 统一的API处理所有滤镜类型
- 自动参数验证和类型检查

## 📋 迁移步骤

### 1. 更新导入语句

**之前:**
```typescript
import { 
    BasicRenderer,
    CustomFilterManager,
    defaultCustomFilters
} from 'webgpu-image-filter';
```

**现在:**
```typescript
import { 
    BasicRenderer,
    FilterRegistry,
    FilterConfig,
    builtinFilters
} from 'webgpu-image-filter';
```

### 2. 渲染器初始化

**之前:**
```typescript
const renderer = new BasicRenderer(device);
// 内置滤镜自动可用，但需要在构造函数中硬编码
```

**现在:**
```typescript
const renderer = new BasicRenderer(device);
// 所有内置滤镜已自动注册，无需额外代码
```

### 3. 滤镜参数创建

**之前:**
```typescript
// 内置滤镜
const blurParam: BlurFilterParam = {
    filterType: 'blur',
    enable: true,
    properties: [
        { key: 'value', value: 5.0 }
    ]
};

// 自定义滤镜
const customManager = new CustomFilterManager();
const contrastParam = customManager.createFilterParam('contrast', {
    contrast: 1.5
});
```

**现在:**
```typescript
// 统一的创建方式
const blurParam = renderer.createFilterParam('blur', {
    value: 5.0
});

const contrastParam = renderer.createFilterParam('contrast', {
    contrast: 1.5
});
```

### 4. 自定义滤镜注册

**之前:**
```typescript
const customManager = new CustomFilterManager();
customManager.registerFilter({
    name: 'my_filter',
    displayName: 'My Filter',
    wgslCode: '...',
    parameters: [...]
});
```

**现在:**
```typescript
const customFilter: FilterConfig = {
    name: 'my_filter',
    displayName: 'My Filter',
    category: 'color', // 新增：滤镜分类
    wgslCode: '...',
    parameters: [...]
};

renderer.registerFilter(customFilter);
```

### 5. 获取可用滤镜

**之前:**
```typescript
// 需要分别处理内置和自定义滤镜
const customFilters = customManager.getAllFilters();
// 内置滤镜列表需要硬编码
```

**现在:**
```typescript
// 统一获取所有滤镜
const allFilters = renderer.getAvailableFilters();

// 按类别获取滤镜
const colorFilters = renderer.getFiltersByCategory('color');
const blurFilters = renderer.getFiltersByCategory('blur');

// 搜索滤镜
const searchResults = renderer.searchFilters('contrast');
```

## 🔧 API 对照表

| 功能 | 旧API | 新API |
|------|-------|-------|
| 创建滤镜参数 | 手动构造FilterParam对象 | `renderer.createFilterParam()` |
| 注册自定义滤镜 | `customManager.registerFilter()` | `renderer.registerFilter()` |
| 获取所有滤镜 | `customManager.getAllFilters()` | `renderer.getAvailableFilters()` |
| 检查滤镜存在 | 手动检查 | `renderer.filterRegistry.hasFilter()` |
| 参数验证 | 无自动验证 | `renderer.filterRegistry.validateFilterParam()` |
| 取消注册滤镜 | 不支持 | `renderer.unregisterFilter()` |

## 📝 完整示例对比

### 旧版本代码
```typescript
import { 
    BasicRenderer,
    CustomFilterManager,
    BlurFilterParam,
    FilterParam
} from 'webgpu-image-filter';

async function oldWay() {
    const device = await getGpuDevice();
    const renderer = new BasicRenderer(device);
    const customManager = new CustomFilterManager();
    
    // 注册自定义滤镜
    customManager.registerFilter({
        name: 'my_filter',
        displayName: 'My Filter',
        wgslCode: '...',
        parameters: [...]
    });
    
    // 创建滤镜参数（不同方式）
    const blurParam: BlurFilterParam = {
        filterType: 'blur',
        enable: true,
        properties: [{ key: 'value', value: 3.0 }]
    };
    
    const customParam = customManager.createFilterParam('my_filter', {
        intensity: 1.5
    });
    
    // 需要处理不同类型的参数
    const filters = [blurParam, customParam];
    
    const result = renderer.render(imageSource, filters, 'cache-key');
}
```

### 新版本代码
```typescript
import { 
    BasicRenderer,
    FilterConfig,
    getGpuDevice
} from 'webgpu-image-filter';

async function newWay() {
    const device = await getGpuDevice();
    const renderer = new BasicRenderer(device);
    
    // 注册自定义滤镜
    const customFilter: FilterConfig = {
        name: 'my_filter',
        displayName: 'My Filter',
        category: 'color',
        wgslCode: '...',
        parameters: [...]
    };
    renderer.registerFilter(customFilter);
    
    // 统一的参数创建方式
    const blurParam = renderer.createFilterParam('blur', {
        value: 3.0
    });
    
    const customParam = renderer.createFilterParam('my_filter', {
        intensity: 1.5
    });
    
    // 所有滤镜参数都是相同类型
    const filters = [blurParam, customParam];
    
    const result = renderer.render(imageSource, filters, 'cache-key');
}
```

## 🆕 新增功能

新的滤镜注册系统带来了许多新功能：

### 1. 滤镜发现
```typescript
// 列出所有可用滤镜
console.log('所有滤镜:', renderer.getAvailableFilters());

// 按类别浏览
const categories = ['color', 'blur', 'artistic', 'distortion'];
categories.forEach(category => {
    const filters = renderer.getFiltersByCategory(category);
    console.log(`${category}滤镜:`, filters);
});

// 搜索功能
const searchResults = renderer.searchFilters('blur');
```

### 2. 参数验证
```typescript
// 自动验证参数
try {
    const param = renderer.createFilterParam('contrast', {
        contrast: -1 // 无效值
    });
} catch (error) {
    console.error('参数无效:', error.message);
}

// 手动验证
const isValid = renderer.filterRegistry.validateFilterParam(someParam);
```

### 3. 动态管理
```typescript
// 检查滤镜是否存在
if (renderer.filterRegistry.hasFilter('my_filter')) {
    console.log('滤镜已注册');
}

// 取消注册滤镜
renderer.unregisterFilter('old_filter');

// 重新注册更新的滤镜
renderer.registerFilter(updatedFilter);
```

## 🐛 常见问题

### Q: 我的自定义滤镜不工作了
A: 检查是否更新了导入语句和注册方式。确保使用新的 `FilterConfig` 接口。

### Q: 参数创建方式改变了吗？
A: 是的，现在使用统一的 `createFilterParam()` 方法，而不是手动构造对象。

### Q: 旧的CustomFilterManager还能用吗？
A: 建议迁移到新系统，旧的CustomFilterManager已被弃用。

### Q: 如何获取内置滤镜列表？
A: 使用 `renderer.getAvailableFilters()` 获取所有滤镜，或按类别获取特定滤镜。

## ⚡ 性能提升

新系统带来的性能改进：

1. **Pipeline缓存**: GPU管道自动缓存，避免重复编译
2. **参数验证缓存**: 验证结果缓存，减少重复检查
3. **按需加载**: 只加载实际使用的滤镜
4. **内存优化**: 更高效的滤镜存储和管理

## 🎯 最佳实践

1. **使用类别组织滤镜**: 为自定义滤镜设置合适的category
2. **参数验证**: 设置合理的min、max和step值
3. **描述信息**: 为参数添加description帮助用户理解
4. **错误处理**: 使用try-catch处理滤镜注册和参数创建
5. **性能监控**: 利用内置的性能分析工具

## 📞 需要帮助？

如果在迁移过程中遇到问题：

1. 查看 [滤镜注册机制使用指南](./FILTER_REGISTRY_GUIDE.md)
2. 参考新的demo代码示例
3. 检查控制台错误信息
4. 使用内置的测试工具验证配置

新的滤镜注册系统为 WebGPU Image Filter 带来了更强的可扩展性和更好的开发体验！
