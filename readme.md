# WebGPU image filter

[Preview online](https://quarksb.github.io/webgpu-image-filter/)

This is a project to demonstrate the application of webgpu in image processing with support for custom filters.

## Features

### Built-in Filters
- **Noise/Ablation**: Add film grain and texture effects
- **Warp/Twist**: Geometric distortion and rotation effects  
- **Blur**: Gaussian blur with adjustable intensity
- **Saturation**: Color saturation adjustment

### Custom Filters
- **Contrast**: Adjust image contrast
- **Brightness**: Control image brightness
- **Hue Shift**: Rotate colors in HSV space
- **Custom Filter Editor**: Visual interface for creating new filters

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

For detailed custom filter development guide, see [CUSTOM_FILTERS_GUIDE.md](./CUSTOM_FILTERS_GUIDE.md)

## Project Structure

```
├── src/                          # Core WebGPU filter engine
│   └── webgpu/
│       ├── renderer.ts           # Main rendering pipeline
│       ├── custom_filter.ts      # Custom filter management
│       ├── utils/                # Utilities and type definitions
│       └── wgsl/                 # Shader files
├── demo/                         # Demo application
│   ├── index.ts                  # All-in-one demo with integrated editor
│   ├── index.css                 # Styles
│   └── utils.ts                  # Demo utilities
├── index.html                    # Single page application
└── lib/                          # Compiled output
```

## LightSpot
- WGSL shader auto parsing
- Free combination of filter chains  
- Visual custom filter editor
- Real-time filter preview
- Type-safe filter parameters

## To be realized
- Unified resource management, using only a small amount of memory, copying and transferring data only when needed for updates
- Video processing support
- Mobile device optimization
- More built-in filter presets

## Browser Support

Requires a browser with WebGPU support:
- Chrome 113+
- Edge 113+
- Firefox with `dom.webgpu.enabled` flag

## Info
If you want to see more webgpu related materials please check [awesome-webgpu](https://github.com/mikbry/awesome-webgpu)
