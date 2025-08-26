# Roadmap & Task Breakdown

> 优先级分为: P0(最高) / P1 / P2，状态初始均为 TODO。完成后更新为 DOING / DONE，并补充负责人与日期。

## Legend
- 状态: TODO | DOING | DONE | BLOCKED
- 负责人: 填 GitHub ID
- 复杂度: S (≤0.5d) / M (0.5~2d) / L (>2d)
- 标签: perf / arch / api / test / infra / doc

---
## P0 高优先 (核心正确性 & 稳定性)

### 1. 真正的纹理管线 (Ping-Pong) 完善
- [x] 基础 ping-pong 实现 (srcTexture + ping/pong)  — 已初步完成
- [x] 抽象 `PassContext`，封装 read/write 交换逻辑 (2025-08-26)
- [x] 支持 0 滤镜时直接 copy（走 copy pass） (2025-08-26)
- [ ] 加入可选中间 texture 格式 (auto derive from source / user override)

### 2. Pipeline / Sampler / Mesh 缓存
- [ ] 建 `cache/pipelineCache.ts`，Key: hash(shader) + format + vertexLayout
- [ ] 使用 `device.createPipelineAsync` (可用时) 预热
- [ ] Sampler Key: JSON(mag/min/addressMode)
- [ ] TriangleMesh 全局懒加载单例
- [ ] 增加缓存命中/miss 统计接口

### 3. 统一 Uniform 打包系统
- [ ] 设计 `UniformSchema` (字段名+类型+对齐)
- [ ] 生成 WGSL struct & CPU 端打包器 (std140-ish 对齐: 16B vec4/矩阵 boundary)
- [ ] 支持动态更新 (脏区域 -> queue.writeBuffer)
- [ ] 替换现有多 buffer 逻辑
- [ ] 单元测试: 不同字段组合下 offset 正确性

### 4. 文档与实现差异修复
- [ ] 若不存在 `BasicRenderer` 则实现 (封装 createContext + renderOnce)
- [ ] 或更新 README: 替换为新 API (`renderFilters` / `renderOnce`)
- [ ] 标注“实验性”模块
- [ ] 增补架构图：管线 & 资源流

### 5. 输出验证测试 (像素级)
- [ ] 引入辅助：创建 4x4 固定 pattern (棋盘 / 渐变)
- [ ] Copy pass 结果 = 输入
- [ ] 亮度 +0.25: clamp 后逐像素断言 (容差 1 LSB)
- [ ] 链式：亮度 -> 对比度 -> 饱和度（预计算期望）
- [ ] 提供 `approxEqualColor(a,b, tolerance=1)` 工具
- [ ] CI 中运行（无浏览器依赖，使用 headless WebGPU polyfill 若需要）

### 6. Copy Pass 完成
- [ ] 新建 `src/webgpu/wgsl/copy_fullscreen.wgsl`
- [ ] Vertex: 全屏三角 / Fragment: 直接 sample
- [ ] 通过缓存系统复用
- [ ] 无滤镜时直接执行 copy pass

### 7. 工程质量工具链
- [ ] ESLint + @typescript-eslint + import/order 规则
- [ ] Prettier + 一致化配置
- [ ] tsconfig 开启 `strict`, `noUncheckedIndexedAccess` 等
- [ ] GitHub Actions: lint + build + test matrix (bun + node) / OS (ubuntu, macOS)
- [ ] 添加 `sideEffects` 字段至 package.json（评估 tree-shaking 行为）

---
## P1 中期 (健壮性 & 性能提升)

### 8. WGSL 解析健壮化
- [ ] 支持多行与注释过滤
- [ ] 容错: 未找到 entry 给出明确错误对象
- [ ] 解析 `@fragment @blend` 等组合 attribute
- [ ] 输出结构增加 `warnings: string[]`
- [ ] 回退策略: 失败时使用 layout: "auto"

### 9. 资源生命周期策略
- [ ] 增加 frame tick (`beginFrame/endFrame`) 统计引用
- [ ] LRU 释放未使用 pipeline / sampler / uniform buffer
- [ ] `ConfigManager.cleanupAll()`
- [ ] 内存占用快照 (统计纹理字节数 = width*height*bytesPerPixel)

### 10. 性能指标采集
- [ ] `Profiler`：记录 submit 前后 `performance.now()`
- [ ] 统计 avg / p95 / max
- [ ] 暴露 `getPerformanceReport()` API
- [ ] Demo 面板实时显示

### 11. Compute Pass 支持
- [ ] 在解析阶段识别 computeEntryPoint
- [ ] 构建 `ComputePipeline` 并执行 dispatch
- [ ] 允许图形 pass 与 compute pass 混合链
- [ ] 新增示例：Compute blur

### 12. Filter Graph 拓扑
- [ ] 定义节点/边模型 (输入=纹理句柄数组)
- [ ] 拓扑排序 + 重复子图合并
- [ ] 支持多输入合成（如混合 / 叠加）
- [ ] 回退：线性链模式

---
## P2 后续 (扩展 & 体验)

### 13. Video / Streaming 支持
- [ ] 接入 `VideoFrame`/HTMLVideoElement 纹理更新
- [ ] 帧率自适应（跳帧策略）
- [ ] 帧缓存 + 同步

### 14. Shader 热替换
- [ ] Dev 模式 hash diff 触发 pipeline 重建
- [ ] 保留旧 pipeline 直至新 pipeline 可用 (无闪烁)

### 15. 可视化调试
- [ ] Pass 图 (SVG/Canvas)
- [ ] 资源列表 + GPU 内存估算
- [ ] 单 Pass 输出快速预览

### 16. 高级特性
- [ ] 多格式目标 (rgba16float / rg11b10float)
- [ ] Tone mapping / 色彩空间 (sRGB, Display P3 flags)
- [ ] HDR 路径探索

---
## 任务模板
```
- [ ] 标题 (标签) P? 复杂度:? 负责人:? 截止:YYYY-MM-DD
  描述:
  验收标准:
```

## 里程碑建议
- M1: 完成 P0（基础可验证 & CI）
- M2: 完成 P1（性能 & 计算扩展）
- M3: 完成 P2（生态与高级特性）

## 依赖与注意事项
- Compute 支持需浏览器稳定 WebGPU (Chrome 113+)
- Pixel 测试可能需 polyfill 或跳过 CI 无 GPU 环境 → 可加环境变量开关
- 对齐策略需文档化，防止 WGSL struct 与 JS 打包不匹配

## 后续动作入口
- 在 PR 模板中引用任务编号
- 每周生成一次进度快照 (脚本统计 DONE 数量)

