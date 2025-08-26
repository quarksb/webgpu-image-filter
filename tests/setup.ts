/**
 * Vitest 测试环境配置
 * 为WebGPU资源管理器测试提供必要的全局设置和Mock
 */

import { vi } from 'vitest';

// Mock WebGPU 全局常量
Object.defineProperty(globalThis, 'GPUBufferUsage', {
  value: {
    UNIFORM: 64,
    COPY_DST: 8,
    VERTEX: 32,
    INDEX: 16,
    STORAGE: 128,
    INDIRECT: 256,
    QUERY_RESOLVE: 512,
    COPY_SRC: 4,
    MAP_READ: 1,
    MAP_WRITE: 2
  },
  writable: false,
  enumerable: true,
  configurable: false
});

Object.defineProperty(globalThis, 'GPUTextureUsage', {
  value: {
    COPY_SRC: 1,
    COPY_DST: 2,
    TEXTURE_BINDING: 4,
    STORAGE_BINDING: 8,
    RENDER_ATTACHMENT: 16
  },
  writable: false,
  enumerable: true,
  configurable: false
});

// Mock console methods if needed
if (!globalThis.console) {
  globalThis.console = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as any;
}

// 设置全局 performance
if (!globalThis.performance) {
  globalThis.performance = {
    now: vi.fn(() => Date.now()),
  } as any;
}
