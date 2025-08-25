# WebGPU image filter

[Preview online](https://quarksb.github.io/webgpu-image-filter/)

This is a project to demonstrate the application of webgpu in image processing with support for custom filters.

## Features

### Built-in Filters
- **Noise/Ablation**: Add film grain and texture effects
- **Warp/Twist**: Geometric distortion and rotation effects  
- **Blur**: Gaussian blur with adjustable intensity (Multi-Pass with Decorator Pattern)
- **Saturation**: Color saturation adjustment

### Custom Filters
- **Contrast**: Adjust image contrast
- **Brightness**: Control image brightness
- **Hue Shift**: Rotate colors in HSV space
- **Sepia**: Classic sepia tone effect
- **Vignette**: Darkening effect around edges
- **Custom Filter Editor**: Visual interface for creating new filters

### Advanced Features
- **Decorator Pattern**: Elegant multi-pass filter architecture
- **WGSL Modules**: Individual shader files for better maintainability
- **Type Safety**: Full TypeScript support with comprehensive type definitions
- **Performance Monitoring**: Built-in profiling and debugging tools

## How to use

### All-in-One Interface
1. Open `index.html` in a WebGPU-supported browser
2. **Filters Tab**: Use the control panel to adjust built-in and custom filter parameters
3. **Custom Editor Tab**: Create your own filters with WGSL shader code
4. Upload your own images or use the built-in samples
5. Download the processed result

### Custom Filter Development
1. Switch to the "Custom Editor" tab in the interface
2. Write WGSL shader code for your custom effect
3. Configure filter parameters with the visual editor
4. Click "Preview Filter" to test your creation
5. Export your filter configuration for future use

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
