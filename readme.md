# WebGPU Image Filter

[Preview online](https://quarksb.github.io/webgpu-image-filter/)

A powerful and extensible WebGPU-based image processing framework with a comprehensive filter registry system and support for custom filters.

## 🚀 Features

### 🎯 Core Architecture
- **Dynamic Filter Registry**: Register, manage, and use filters at runtime
- **Unified Filter System**: Consistent API for both built-in and custom filters  
- **Type-Safe Parameters**: Automatic parameter validation with TypeScript support
- **Category Organization**: Filters organized by type (blur, color, artistic, etc.)
- **Search & Discovery**: Find filters by name, category, or functionality

### 🎨 Built-in Filters

#### Color Adjustment
- **Brightness**: Adjust image brightness (-1.0 to 1.0)
- **Contrast**: Control image contrast (0.0 to 3.0)
- **Saturation**: Color saturation adjustment (0.0 to 3.0)
- **Hue Shift**: Rotate colors in HSV space (0.0 to 1.0)

#### Blur Effects
- **Gaussian Blur**: Multi-pass blur with decorator pattern (0.0 to 20.0px)

#### Artistic Effects
- **Sepia**: Classic sepia tone effect (0.0 to 1.0 intensity)
- **Vignette**: Darkening effect around edges with customizable radius
- **Noise**: Film grain and texture effects with seed control

#### Distortion
- **Warp**: Geometric distortion with adjustable center point

### 🛠️ Advanced Features
- **Decorator Pattern**: Elegant multi-pass filter architecture
- **Custom Processors**: Special handling for complex filters
- **Pipeline Caching**: Automatic GPU pipeline optimization
- **WGSL Modules**: Modular shader system
- **Performance Monitoring**: Built-in profiling and debugging
- **Backward Compatibility**: Maintains existing API compatibility

## 📖 Quick Start

### Basic Usage

```typescript
import { BasicRenderer, getGpuDevice } from 'webgpu-image-filter';

// Initialize WebGPU
const device = await getGpuDevice();
const renderer = new BasicRenderer(device);

// Create filter parameters using the new registry system
const filters = [
    renderer.createFilterParam('brightness', { brightness: 0.2 }),
    renderer.createFilterParam('contrast', { contrast: 1.3 }),
    renderer.createFilterParam('blur', { value: 3.0 })
];

// Apply filters to image
const canvas = renderer.render(imageSource, filters, 'cache-key');
```

### Filter Discovery

```typescript
// Get all available filters
const allFilters = renderer.getAvailableFilters();
console.log('Available filters:', allFilters);

// Get filters by category
const colorFilters = renderer.getFiltersByCategory('color');
const artisticFilters = renderer.getFiltersByCategory('artistic');

// Search filters
const blurFilters = renderer.searchFilters('blur');
```

### Custom Filter Registration

```typescript
import { FilterConfig } from 'webgpu-image-filter';

const customFilter: FilterConfig = {
    name: 'negative',
    displayName: 'Negative Effect',
    category: 'artistic',
    wgslCode: `
        @group(0) @binding(0) var mySampler: sampler;
        @group(0) @binding(1) var myTexture: texture_2d<f32>;

        @fragment
        fn frag_main(@location(0) fragUV: vec2<f32>) -> @location(0) vec4<f32> {
            let rgba = textureSample(myTexture, mySampler, fragUV);
            return vec4<f32>(1.0 - rgba.rgb, rgba.a);
        }
    `,
    parameters: []
};

// Register the custom filter
renderer.registerFilter(customFilter);

// Use the custom filter
const negativeParam = renderer.createFilterParam('negative', {});
const result = renderer.render(imageSource, [negativeParam], 'negative-effect');
```

## 🎮 Interactive Demo

### All-in-One Interface
1. Open `index.html` in a WebGPU-supported browser
2. **Filter Controls**: Use the comprehensive control panel with all built-in filters
3. **Custom Filters**: Create your own filters with the WGSL editor
4. **Real-time Preview**: See changes instantly as you adjust parameters
5. **Export/Import**: Save and load filter configurations

### Filter Categories in Demo
- **Basic Filters**: Brightness, Contrast, Saturation, Hue Shift
- **Artistic Effects**: Sepia, Vignette, Custom Glow, Negative
- **Blur Effects**: Gaussian Blur with multi-pass support
- **Distortion**: Warp effects with center point control
- **Noise**: Film grain with seed and granularity control

## 📚 Documentation

For detailed guides and technical documentation, visit the [**doc folder**](./doc/):

- **[📖 Documentation Index](./doc/README.md)** - Complete documentation overview
- **[🎭 Decorator Guide](./doc/DECORATOR_GUIDE.md)** - Modern filter development with decorators
- **[🎨 Custom Filter Development](./doc/CUSTOM_FILTER_DEVELOPMENT.md)** - Create your own filters
- **[🔧 WGSL Shader Guide](./doc/WGSL_SHADER_GUIDE.md)** - WebGPU shader programming
- **[📊 API Design Analysis](./doc/API_DESIGN_ANALYSIS.md)** - Architecture and design patterns
- **[🔄 Multi-Pass Architecture](./doc/MULTI_PASS_ARCHITECTURE.md)** - Advanced filter techniques

## Project Structure

```
├── src/                          # Core WebGPU filter engine
│   └── webgpu/
│       ├── renderer.ts           # Main rendering pipeline
│       ├── custom_filter.ts      # Custom filter management
│       ├── decorators/           # Decorator pattern implementation
│       │   ├── multi_pass.ts     # Multi-pass decorators
│       │   └── demo.ts          # Usage examples
│       ├── utils/                # Utilities and type definitions
│       └── wgsl/                 # Individual shader files
├── demo/                         # Demo application
│   ├── index.ts                  # All-in-one demo with integrated editor
│   ├── index.css                 # Styles
│   └── utils.ts                  # Demo utilities
├── doc/                          # 📚 Comprehensive documentation
├── index.html                    # Single page application
└── lib/                          # Compiled output
```

## ✨ LightSpot
- **Modern Architecture**: Decorator pattern for elegant multi-pass filters
- **WGSL Modules**: Individual shader files with hot-reload support
- **Type Safety**: Full TypeScript integration with comprehensive type definitions
- **Visual Editor**: Integrated custom filter development environment
- **Performance Monitoring**: Built-in profiling and debugging capabilities
- **Free Combination**: Flexible filter chain composition
- **Real-time Preview**: Instant feedback during filter development

## 🚀 To be realized
- Unified resource management, using only a small amount of memory, copying and transferring data only when needed for updates
- Video processing support
- Mobile device optimization
- More built-in filter presets
- WebGPU compute shader integration
- Advanced debugging tools

## Browser Support

Requires a browser with WebGPU support:
- Chrome 113+
- Edge 113+
- Firefox with `dom.webgpu.enabled` flag

## 🛠️ Development

```bash
# Install dependencies
bun install

# Development server
bun run dev

# Build library
bun run build:lib

# Build demo
bun run build:demo
```

## Info
If you want to see more webgpu related materials please check [awesome-webgpu](https://github.com/mikbry/awesome-webgpu)
