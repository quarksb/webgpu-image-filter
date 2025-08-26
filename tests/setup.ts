/**
 * Vitest 测试环境配置
 * 基础环境设置，使用真实的WebGPU API
 */

import { vi } from 'vitest';

// 基础控制台支持（通常不需要，但作为备用）
if (!globalThis.console) {
  globalThis.console = {
    log: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    debug: vi.fn(),
  } as any;
}

// 基础性能API支持（通常不需要，但作为备用）
if (!globalThis.performance) {
  globalThis.performance = {
    now: () => Date.now(),
  } as any;
}
