# Canvas Maker Integration API

This document provides a complete guide for integrating the Canvas Maker system into other applications as a tldraw replacement.

## Current Version: v1.8.14

### HTML Component Features

- **Edit Mode**: Double-click HTML components to enable content interaction
  - Resize handles hidden during editing
  - Exit with ESC or click outside
- **Selection**: Components show immediate visual feedback during selection
- **Resizing**: Viewport-style resizing where content stays fixed
- **Constraints**: Pixel-perfect sizing with zero buffer by default
- **Scaling Modes**: Two content display modes available
  - **Viewport mode** (default): Content maintains original size, scrollable when larger than component
  - **Fit mode**: Content scales to fit component size, maintaining aspect ratio (like tldraw/Figma)
  - Change modes via `setComponentScalingMode()` method or during component creation
- **Content Overflow**: Automatic scrollbars when content exceeds component bounds
  - Works in both edit and selection modes (viewport mode only)
  - Maintains proper component boundaries
- **Unified Layering**: HTML components and canvas elements can be layered together
  - Bring to front/back operations work across both types
  - Canvas elements can appear above HTML components when brought to front

### Canvas Features

- **Minimap Navigation**: Interactive minimap for canvas overview and navigation
  - Toggle with MAP button in zoom controls: [-] [100%] [+] [MAP] [recenter] [zoom100]
  - Displays all shape types: rectangles, circles, arrows, lines, pen strokes, text, nested canvases
  - Click/drag navigation with viewport indicator
  - Automatic content bounds detection
- **Multi-Element Support**: Full resize functionality for all element types
  - Text elements: Resizable with minimum 50x20 dimensions
  - Nested canvases: Resizable with minimum 100x100 dimensions
  - Shape elements: Full resize handle support with constraints
- **Pen Drawing**: Free-form drawing with path tracking
- **Nested Canvas**: Canvas-in-canvas functionality with independent tool states

---

## Core API

### Basic Integration

```javascript
// Create canvas instance
const canvas = new CanvasMaker(container, {
    width: 1200,
    height: 800,
    toolbarPosition: 'top-left'
});

// Add HTML component
const component = canvas.addReactComponentWithHTML(
    x, y, width, height, htmlContent, {
        scalingMode: 'viewport', // 'viewport' (default) or 'fit'
        ...options
    }
);
```

### HTML Component Methods

```javascript
// Enter edit mode
canvas.enterComponentEditMode(component);

// Set resize constraints  
canvas.setResizeConstraints(componentId, {
    maxWidth: 800,
    maxHeight: 600
});

// Configure content settings
canvas.setContentResizeSettings({
    buffer: 0,                    // Buffer around content (default: 0)
    maxMultiplier: 3,             // Max size = content × multiplier
    defaultWidth: 375,            // Default component width
    defaultHeight: 650,           // Default component height
    contentAnalysisMaxWidth: 375, // Max auto-detected width
    contentAnalysisMaxHeight: 650 // Max auto-detected height
});

// Change scaling mode for existing component
canvas.setComponentScalingMode(componentId, 'fit'); // or 'viewport'
```

### Event Handling

```javascript
// Selection changes
canvas.on('selectionChange', (data) => {
    console.log('Selected elements:', data.selectedElements);
});

// Component interactions
canvas.on('beforeResize', (data) => {
    console.log('Resizing:', data.element);
});
```

### Advanced Features

#### Scaling Modes
```javascript
// Viewport mode - content stays original size, scrollable
const viewportComponent = canvas.addReactComponentWithHTML(
    x, y, 300, 200, htmlContent, { scalingMode: 'viewport' }
);

// Fit mode - content scales to fit component (like tldraw/Figma)
const fitComponent = canvas.addReactComponentWithHTML(
    x, y, 300, 200, htmlContent, { scalingMode: 'fit' }
);

// Toggle scaling mode on existing component
canvas.setComponentScalingMode(componentId, 'fit');

// Behavior differences:
// - Viewport: Content maintains original size, shows scrollbars if needed
// - Fit: Content scales proportionally to fill component bounds
// - Fit mode preserves aspect ratio and scales from top-left origin
// - HTML content size remains unchanged when copied/extracted
```

#### Auto-sizing Components
```javascript
// Auto-size to content (no dimensions specified)
const autoComponent = canvas.addReactComponentWithHTML(
    x, y, null, null, htmlContent
);
```

#### Custom Constraints
```javascript
// Per-component constraints
canvas.setResizeConstraints(componentId, {
    minWidth: 100,
    minHeight: 50,
    maxWidth: 1000,
    maxHeight: 800
});

// Global constraints
canvas.setGlobalResizeConstraints({
    maxWidth: 1200,
    maxHeight: 900
});
```

#### Content Analysis
```javascript
// Disable content analysis caps for unlimited sizing
canvas.setContentResizeSettings({
    contentAnalysisMaxWidth: null,
    contentAnalysisMaxHeight: null
});
```

---

## Options Reference

### Constructor Options
```javascript
{
    width: 1200,              // Canvas width
    height: 800,              // Canvas height
    toolbarPosition: 'top-left', // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    initialToolbarPosition: {x: 20, y: 20}, // Custom toolbar position
    contentResizeBuffer: 0,   // Default buffer around content
    maxContentMultiplier: 3   // Maximum content size multiplier
}
```

### Component Options
```javascript
{
    id: 'unique-id',          // Component identifier
    backgroundColor: 'white', // Background color
    coordinateSystem: 'world', // 'world' or 'center'
    scalingMode: 'viewport'   // 'viewport' (default) or 'fit'
}
```

---

## Migration Guide

### From tldraw
Replace tldraw shape creation with CanvasMaker HTML components:

```javascript
// tldraw
editor.createShape({
    type: 'html',
    props: { html: content, w: width, h: height }
});

// CanvasMaker
canvas.addReactComponentWithHTML(x, y, width, height, content);
```

### Key Differences
- **Coordinate System**: World coordinates vs. tldraw's shape coordinates
- **Content Constraints**: Automatic content-aware sizing
- **Edit Modes**: Built-in edit/select mode separation
- **Selection**: Integrated multi-selection with other canvas elements