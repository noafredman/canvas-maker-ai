# Canvas Maker Integration API

This document provides a complete guide for integrating the Canvas Maker system into other applications as a tldraw replacement.

## Architecture Overview

The canvas system is built around a `CanvasMaker` class that manages:
- **Infinite canvas** with zoom/pan capabilities
- **Multi-layered rendering** (paths, shapes, text, nested canvases)
- **Interactive tools** (select, drag, resize, draw)
- **Component lifecycle** (create, select, modify, delete)

## Quick Start Integration

### 1. Basic Setup
```javascript
// Access the global canvas instance
const canvas = window.canvasMaker;

// Or create a new instance
const canvas = new CanvasMaker();
```

### 2. Adding Components

#### Shapes (Rectangles, Circles)
```javascript
// Add a rectangle
canvas.activeCanvasContext.shapes.push({
  type: 'rectangle',
  x: 100,           // World X coordinate
  y: 100,           // World Y coordinate  
  width: 200,       // Width in pixels
  height: 150,      // Height in pixels
  strokeColor: '#333333',
  fillColor: 'transparent'
});

// Add a circle
canvas.activeCanvasContext.shapes.push({
  type: 'circle',
  x: 300,           // Center X
  y: 300,           // Center Y
  radius: 50,       // Radius in pixels
  strokeColor: '#ff0000',
  fillColor: '#ffcccc'
});

// Trigger redraw
canvas.redrawCanvas();
```

#### Freehand Paths
```javascript
// Add a freehand drawing path
canvas.activeCanvasContext.paths.push({
  points: [
    {x: 10, y: 10},
    {x: 20, y: 15},
    {x: 30, y: 20},
    {x: 40, y: 10}
  ],
  strokeColor: '#0000ff'
});

canvas.redrawCanvas();
```

#### Text Elements
```javascript
// Add text
canvas.activeCanvasContext.texts.push({
  text: 'Hello World',
  x: 150,
  y: 200,
  fontSize: 16,
  color: '#333333'
});

canvas.redrawCanvas();
```

#### Nested Canvases
```javascript
// Add a nested canvas component
canvas.activeCanvasContext.nestedCanvases.push({
  x: 400,
  y: 200,
  width: 300,
  height: 200,
  id: 'nested_1',    // Unique identifier
  strokeColor: '#666666'
});

canvas.redrawCanvas();
```

## Component Selection & Interaction

### Programmatic Selection
```javascript
// Select specific elements by type and index
canvas.selectedElements = [
  { type: 'shape', index: 0 },      // First shape
  { type: 'text', index: 1 }        // Second text element
];

// Clear selection
canvas.selectedElements = [];

canvas.redrawCanvas();
```

### Automatic Tool Interaction
All components added to the data arrays automatically support:
- **Click selection** (via select tool)
- **Multi-selection** (drag selection box)
- **Dragging** (click and drag selected elements)
- **Resize handles** (single selected elements)
- **Keyboard shortcuts** (Delete, Ctrl+C, Ctrl+V, Ctrl+X)

## Tool Management

### Switch Tools Programmatically
```javascript
// Available tools: 'select', 'pen', 'rectangle', 'circle', 'text', 'nested-canvas'
canvas.currentTool = 'select';
canvas.updateCanvasCursor();

// Update toolbar UI to reflect tool change
document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
document.getElementById('select-tool').classList.add('active');
```

### Tool Behavior
- **select**: Click to select, drag to move, box select for multiple
- **pen**: Freehand drawing that creates path elements
- **rectangle/circle**: Click and drag to create shapes
- **text**: Click to place text input
- **nested-canvas**: Click and drag to create nested canvas areas

## Camera & Viewport

### Programmatic Camera Control
```javascript
// Access camera properties
const camera = canvas.activeCanvasContext.camera;

// Pan to specific world coordinates
camera.x = 500;  // Move viewport center to world X: 500
camera.y = 300;  // Move viewport center to world Y: 300

// Zoom control
camera.zoom = 1.5;  // 150% zoom
canvas.updateZoomIndicator();

// Zoom methods (maintain viewport center during zoom)
canvas.zoomIn();    // Zoom in by 20%
canvas.zoomOut();   // Zoom out by 20%
canvas.resetZoom(); // Reset to 100% zoom

// Recenter to origin
canvas.recenterCanvas();

canvas.redrawCanvas();
```

### Camera Constraints (Virtual Bounds)
```javascript
// Set invisible boundaries that limit camera movement
canvas.setCameraConstraints({
  bounds: { x: -1000, y: -1000, width: 2000, height: 2000 },
  behavior: 'contain'  // or 'inside' or 'free'
});

// Different constraint behaviors:
// 'contain': Viewport cannot go outside bounds
// 'inside': Camera center must stay within bounds  
// 'free': No constraints (infinite canvas)

// Get current constraints
const constraints = canvas.getCameraConstraints();

// Remove all constraints (back to infinite)
canvas.clearCameraConstraints();
```

### Content-Based Dynamic Constraints
```javascript
// Automatically set constraints based on your content
function updateConstraintsToContent() {
  const shapes = canvas.activeCanvasContext.shapes;
  const texts = canvas.activeCanvasContext.texts;
  
  if (shapes.length === 0 && texts.length === 0) {
    canvas.clearCameraConstraints();
    return;
  }
  
  // Calculate bounding box of all content
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  
  shapes.forEach(shape => {
    minX = Math.min(minX, shape.x);
    minY = Math.min(minY, shape.y);
    maxX = Math.max(maxX, shape.x + shape.width);
    maxY = Math.max(maxY, shape.y + shape.height);
  });
  
  texts.forEach(text => {
    minX = Math.min(minX, text.x);
    minY = Math.min(minY, text.y);
    maxX = Math.max(maxX, text.x + 200); // Approximate text width
    maxY = Math.max(maxY, text.y + text.fontSize);
  });
  
  // Add padding around content
  const padding = 500;
  canvas.setCameraConstraints({
    bounds: {
      x: minX - padding,
      y: minY - padding, 
      width: (maxX - minX) + (padding * 2),
      height: (maxY - minY) + (padding * 2)
    },
    behavior: 'contain'
  });
}

// Call after adding/removing content
updateConstraintsToContent();
```

### World vs Screen Coordinates
```javascript
// Convert screen coordinates to world coordinates
const worldPos = canvas.screenToWorld(screenX, screenY);

// Convert world coordinates to screen coordinates  
const screenPos = canvas.worldToScreen(worldX, worldY);
```

## Data Management

### Export Canvas Data
```javascript
// Get all canvas data
const canvasData = {
  paths: canvas.activeCanvasContext.paths,
  shapes: canvas.activeCanvasContext.shapes, 
  texts: canvas.activeCanvasContext.texts,
  nestedCanvases: canvas.activeCanvasContext.nestedCanvases,
  camera: {
    x: canvas.activeCanvasContext.camera.x,
    y: canvas.activeCanvasContext.camera.y,
    zoom: canvas.activeCanvasContext.camera.zoom
  }
};

const jsonData = JSON.stringify(canvasData);
```

### Import Canvas Data
```javascript
// Load canvas data
const canvasData = JSON.parse(jsonData);

canvas.activeCanvasContext.paths = canvasData.paths || [];
canvas.activeCanvasContext.shapes = canvasData.shapes || [];
canvas.activeCanvasContext.texts = canvasData.texts || [];
canvas.activeCanvasContext.nestedCanvases = canvasData.nestedCanvases || [];

if (canvasData.camera) {
  canvas.activeCanvasContext.camera.x = canvasData.camera.x;
  canvas.activeCanvasContext.camera.y = canvasData.camera.y;
  canvas.activeCanvasContext.camera.zoom = canvasData.camera.zoom;
  canvas.updateZoomIndicator();
}

canvas.redrawCanvas();
```

### Clear Canvas
```javascript
canvas.clearCanvas(); // Clears all elements and resets camera
```

## Custom Component Integration

### Overview
The Canvas Maker system supports integrating custom components that work seamlessly with all canvas functionality (zoom, pan, selection, drag, etc.). There are multiple approaches depending on your needs.

### Approach 1: Custom Shape Types (Recommended)

Add your custom components as new shape types that get rendered by the canvas:

```javascript
// 1. Add your custom component as a shape
canvas.activeCanvasContext.shapes.push({
  type: 'myCustomComponent',
  x: 100, y: 100,
  width: 200, height: 150,
  // Your custom properties
  data: { 
    title: 'My Component',
    value: 42,
    config: {...}
  }
});

// 2. Extend the drawing logic
const originalRedraw = canvas.redrawCanvas.bind(canvas);
canvas.redrawCanvas = function() {
  originalRedraw();
  this.drawCustomComponents();
};

canvas.drawCustomComponents = function() {
  const ctx = this.activeCanvasContext.ctx;
  const camera = this.activeCanvasContext.camera;
  const shapes = this.activeCanvasContext.shapes;
  
  // Apply camera transforms
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.scale(camera.zoom, camera.zoom);
  ctx.translate(camera.x, camera.y);
  
  shapes.forEach(shape => {
    if (shape.type === 'myCustomComponent') {
      this.drawMyCustomComponent(ctx, shape);
    }
  });
  
  ctx.restore();
};

canvas.drawMyCustomComponent = function(ctx, shape) {
  // Your custom drawing logic
  ctx.fillStyle = '#e3f2fd';
  ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
  
  ctx.strokeStyle = '#2196f3';
  ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
  
  // Draw your component content
  ctx.fillStyle = '#333';
  ctx.font = '16px Arial';
  ctx.fillText(shape.data.title, shape.x + 10, shape.y + 25);
};

// 3. Extend hit detection for selection
const originalGetElement = canvas.getElementAtPointForContext.bind(canvas);
canvas.getElementAtPointForContext = function(x, y, canvasContext) {
  // Check custom components first
  for (let i = canvasContext.shapes.length - 1; i >= 0; i--) {
    const shape = canvasContext.shapes[i];
    if (shape.type === 'myCustomComponent') {
      if (x >= shape.x && x <= shape.x + shape.width &&
          y >= shape.y && y <= shape.y + shape.height) {
        return { type: 'shape', element: shape };
      }
    }
  }
  
  // Fall back to original detection
  return originalGetElement(x, y, canvasContext);
};
```

### Approach 2: Safe Hook System (Recommended for External Components)

**NEW**: Canvas Maker now includes built-in redraw loop protection and a safe hook system for component integration:

```javascript
// Safe integration with built-in loop protection
const integration = canvas.integrateExternalComponent({
  onCameraChange: ({ camera, canvas }) => {
    // Called only when camera actually changes (zoom, pan)
    // Safe to update DOM elements here
    updateAllMyComponents(camera);
  },
  
  onSelectionChange: ({ selectedElements }) => {
    // Called when selection changes
    highlightSelectedComponents(selectedElements);
  },
  
  onBeforeRedraw: (canvasContext) => {
    // Called before each redraw cycle
    // Good for preparing data
  },
  
  onAfterRedraw: (canvasContext) => {
    // Called after each redraw cycle
    // Safe zone for DOM updates that don't trigger more redraws
    syncExternalDOMElements();
  }
});

// Always clean up when your component unmounts
integration.cleanup();
```

**Example: Complete External Component Sync**

```javascript
class SafeExternalComponentSync {
  constructor(canvas) {
    this.canvas = canvas;
    this.components = new Map();
    
    // Use the safe hook system instead of directly hooking redraw
    this.integration = canvas.integrateExternalComponent({
      onCameraChange: this.handleCameraChange.bind(this),
      onAfterRedraw: this.handleAfterRedraw.bind(this)
    });
  }
  
  handleCameraChange({ camera, canvas }) {
    // Only called when camera actually changes - prevents unnecessary updates
    this.components.forEach((comp, id) => {
      this.updateComponent(id, camera);
    });
  }
  
  handleAfterRedraw(canvasContext) {
    // Safe zone for any additional DOM updates
    this.cullOffscreenComponents();
  }
  
  addComponent(id, worldX, worldY, domElement) {
    this.components.set(id, {
      worldX, worldY, element: domElement,
      originalWidth: domElement.offsetWidth,
      originalHeight: domElement.offsetHeight
    });
    
    // Initial positioning
    const camera = this.canvas.activeCanvasContext.camera;
    this.updateComponent(id, camera);
  }
  
  updateComponent(id, camera) {
    const comp = this.components.get(id);
    if (!comp) return;
    
    // Convert world to screen coordinates
    const screenPos = this.canvas.worldToCanvas(comp.worldX, comp.worldY);
    
    // Update DOM element position and scale
    comp.element.style.position = 'absolute';
    comp.element.style.left = screenPos.x + 'px';
    comp.element.style.top = screenPos.y + 'px';
    comp.element.style.transform = `scale(${camera.zoom})`;
    comp.element.style.transformOrigin = 'top left';
  }
  
  cullOffscreenComponents() {
    // Hide components that are off-screen for performance
    const canvas = this.canvas.activeCanvasContext.canvas;
    const camera = this.canvas.activeCanvasContext.camera;
    
    this.components.forEach((comp, id) => {
      const screenPos = this.canvas.worldToCanvas(comp.worldX, comp.worldY);
      const scaledWidth = comp.originalWidth * camera.zoom;
      const scaledHeight = comp.originalHeight * camera.zoom;
      
      const isVisible = screenPos.x + scaledWidth > 0 &&
                       screenPos.y + scaledHeight > 0 &&
                       screenPos.x < canvas.width &&
                       screenPos.y < canvas.height;
                       
      comp.element.style.display = isVisible ? 'block' : 'none';
    });
  }
  
  removeComponent(id) {
    const comp = this.components.get(id);
    if (comp && comp.element.parentNode) {
      comp.element.parentNode.removeChild(comp.element);
    }
    this.components.delete(id);
  }
  
  destroy() {
    // Clean up all components and hooks
    this.components.forEach((comp, id) => {
      this.removeComponent(id);
    });
    this.integration.cleanup();
  }
}

// Usage:
const sync = new SafeExternalComponentSync(canvas);
sync.addComponent('react1', 200, 300, document.getElementById('myReactComponent'));

// When your app unmounts:
sync.destroy();
```

### Approach 3: Legacy DOM Element Synchronization

For React/Vue/Angular components that exist as DOM elements outside the canvas (legacy approach - use Approach 2 instead):

```javascript
class ExternalComponentSync {
  constructor(canvas) {
    this.canvas = canvas;
    this.components = new Map();
    this.setupSync();
  }
  
  setupSync() {
    // Hook into canvas redraw
    const originalRedraw = this.canvas.redrawCanvas.bind(this.canvas);
    this.canvas.redrawCanvas = function() {
      originalRedraw();
      this.syncExternalComponents();
    }.bind(this);
  }
  
  addComponent(id, worldX, worldY, domElement) {
    // Store component with world coordinates
    this.components.set(id, {
      worldX, worldY, 
      element: domElement,
      originalWidth: domElement.offsetWidth,
      originalHeight: domElement.offsetHeight
    });
    
    // Initial positioning
    this.updateComponent(id);
  }
  
  updateComponent(id) {
    const comp = this.components.get(id);
    if (!comp) return;
    
    // Convert world to screen coordinates
    const screenPos = this.canvas.worldToCanvas(comp.worldX, comp.worldY);
    const zoom = this.canvas.activeCanvasContext.camera.zoom;
    
    // Position and scale the DOM element
    comp.element.style.position = 'absolute';
    comp.element.style.left = screenPos.x + 'px';
    comp.element.style.top = screenPos.y + 'px';
    comp.element.style.transform = `scale(${zoom})`;
    comp.element.style.transformOrigin = 'top left';
    
    // Optional: Hide when out of viewport
    const canvas = this.canvas.activeCanvasContext.canvas;
    const isVisible = screenPos.x + (comp.originalWidth * zoom) > 0 &&
                     screenPos.y + (comp.originalHeight * zoom) > 0 &&
                     screenPos.x < canvas.width &&
                     screenPos.y < canvas.height;
    comp.element.style.display = isVisible ? 'block' : 'none';
  }
  
  syncExternalComponents() {
    this.components.forEach((comp, id) => {
      this.updateComponent(id);
    });
  }
  
  removeComponent(id) {
    this.components.delete(id);
  }
}

// Usage example:
const sync = new ExternalComponentSync(canvas);

// Add a React component
const myReactDiv = document.getElementById('myReactComponent');
sync.addComponent('react1', 200, 300, myReactDiv);

// The component will now move and zoom with the canvas!
```

### Approach 3: Hybrid Integration (Canvas + DOM)

Combine canvas rendering with DOM overlays for interactive components:

```javascript
class HybridComponent {
  constructor(canvas, x, y, width, height) {
    this.canvas = canvas;
    
    // Add to canvas shapes for hit detection and basic rendering
    this.shape = {
      type: 'hybrid',
      x, y, width, height,
      id: 'hybrid_' + Date.now(),
      domElement: null
    };
    
    canvas.activeCanvasContext.shapes.push(this.shape);
    
    // Create DOM overlay when selected
    this.setupInteraction();
  }
  
  setupInteraction() {
    const originalMouseDown = this.canvas.handleMouseDown.bind(this.canvas);
    this.canvas.handleMouseDown = function(e) {
      const pos = this.getMousePos(e);
      const element = this.getElementAtPointForContext(pos.x, pos.y, this.activeCanvasContext);
      
      if (element && element.element && element.element.type === 'hybrid') {
        // Show interactive DOM overlay
        this.showHybridOverlay(element.element);
        return;
      }
      
      // Hide any active overlays
      this.hideHybridOverlays();
      originalMouseDown(e);
    }.bind(this.canvas);
  }
}
```

### Complete Integration Example: Chart Component

```javascript
// Full example: Integrating a chart library with canvas
class CanvasChartComponent {
  constructor(canvas, chartData) {
    this.canvas = canvas;
    this.chartData = chartData;
    this.init();
  }
  
  init() {
    // 1. Register as custom shape
    const chartShape = {
      type: 'chart',
      x: 100, y: 100,
      width: 400, height: 300,
      data: this.chartData,
      id: 'chart_' + Date.now()
    };
    
    this.canvas.activeCanvasContext.shapes.push(chartShape);
    
    // 2. Extend canvas drawing
    this.extendDrawing();
    
    // 3. Add interactive features
    this.addInteractivity();
    
    // 4. Refresh canvas
    this.canvas.redrawCanvas();
  }
  
  extendDrawing() {
    if (!this.canvas.drawCharts) {
      const originalRedraw = this.canvas.redrawCanvas.bind(this.canvas);
      this.canvas.redrawCanvas = function() {
        originalRedraw();
        this.drawAllCharts();
      };
      
      this.canvas.drawAllCharts = function() {
        const ctx = this.activeCanvasContext.ctx;
        const camera = this.activeCanvasContext.camera;
        const shapes = this.activeCanvasContext.shapes;
        
        ctx.save();
        ctx.translate(this.activeCanvasContext.canvas.width / 2, 
                      this.activeCanvasContext.canvas.height / 2);
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(camera.x, camera.y);
        
        shapes.forEach(shape => {
          if (shape.type === 'chart') {
            this.renderChart(ctx, shape);
          }
        });
        
        ctx.restore();
      }.bind(this.canvas);
    }
  }
  
  addInteractivity() {
    // Make charts selectable, draggable, resizable
    const shape = this.canvas.activeCanvasContext.shapes[this.canvas.activeCanvasContext.shapes.length - 1];
    
    // Charts participate in selection
    shape.isSelectable = true;
    shape.isDraggable = true;
    shape.isResizable = true;
  }
}

// Usage:
const chart = new CanvasChartComponent(canvas, {
  type: 'bar',
  labels: ['Q1', 'Q2', 'Q3', 'Q4'],
  data: [30, 45, 60, 35]
});
```

### Built-in Redraw Loop Protection

Canvas Maker automatically prevents infinite redraw loops through:

```javascript
// Built into the core redrawCanvas method
redrawCanvas(canvasContext) {
    if (this.isRedrawing) {
        // Queue the redraw request instead of executing immediately
        this.redrawRequested = true;
        return;
    }
    
    // Execute hooks safely with error handling
    // Uses requestAnimationFrame for queued redraws
}
```

**What this means for integrators:**
- No more infinite redraw loops when integrating external components
- Safe to call `canvas.redrawCanvas()` from within hook callbacks
- Automatic error handling prevents one component from breaking others
- Better performance through intelligent redraw queueing

### React Integration with Event Emitter API

**NEW**: Canvas Maker now includes a traditional event emitter API perfect for React components:

```javascript
// React Hook for Canvas Camera
import { useState, useEffect } from 'react';

function useCanvasCamera(canvasMaker) {
  const [camera, setCamera] = useState({ x: 0, y: 0, zoom: 1 });
  
  useEffect(() => {
    if (!canvasMaker) return;
    
    const handleCameraChange = (cameraData) => {
      setCamera(cameraData);
    };
    
    // Subscribe to camera changes
    canvasMaker.on('cameraChange', handleCameraChange);
    
    // Get initial camera state
    const initialCamera = canvasMaker.activeCanvasContext.camera;
    setCamera({ x: initialCamera.x, y: initialCamera.y, zoom: initialCamera.zoom });
    
    // Cleanup on unmount
    return () => canvasMaker.off('cameraChange', handleCameraChange);
  }, [canvasMaker]);
  
  return camera;
}

// React Hook for Selection
function useCanvasSelection(canvasMaker) {
  const [selection, setSelection] = useState({ selectedElements: [], count: 0 });
  
  useEffect(() => {
    if (!canvasMaker) return;
    
    const handleSelectionChange = (selectionData) => {
      setSelection(selectionData);
    };
    
    canvasMaker.on('selectionChange', handleSelectionChange);
    
    return () => canvasMaker.off('selectionChange', handleSelectionChange);
  }, [canvasMaker]);
  
  return selection;
}

// React Component Example
function MyCanvasOverlay({ canvasMaker }) {
  const camera = useCanvasCamera(canvasMaker);
  const selection = useCanvasSelection(canvasMaker);
  
  // Your React components will automatically re-render when camera or selection changes
  return (
    <div className="canvas-overlay">
      <div className="camera-info">
        Camera: {camera.x.toFixed(1)}, {camera.y.toFixed(1)} 
        Zoom: {(camera.zoom * 100).toFixed(0)}%
      </div>
      <div className="selection-info">
        Selected: {selection.count} elements
      </div>
      
      {/* Position components based on camera */}
      <MyWidget 
        style={{
          left: canvasMaker?.worldToCanvas(100, 100).x + 'px',
          top: canvasMaker?.worldToCanvas(100, 100).y + 'px',
          transform: `scale(${camera.zoom})`
        }}
      />
    </div>
  );
}
```

### Event Emitter API Reference

```javascript
// Subscribe to events
canvas.on('cameraChange', (camera) => {
  // camera: { x, y, zoom }
  console.log('Camera changed:', camera);
});

canvas.on('selectionChange', (selection) => {
  // selection: { selectedElements: [], count: number }
  console.log('Selection changed:', selection);
});

// Unsubscribe from events
canvas.off('cameraChange', callbackFunction);

// Available events:
// - 'cameraChange': Emitted when camera position or zoom changes
// - 'selectionChange': Emitted when selection changes
// - 'toolbarMove': Emitted when floating toolbar is moved by user
```

### Hook System API Reference (Advanced)

```javascript
// Available hooks for complex integrations
const integration = canvas.integrateExternalComponent({
  onCameraChange: ({ camera, canvas }) => {
    // Triggered when: zoom, pan, recenter, resetZoom
    // camera: { x, y, zoom }
    // canvas: canvas DOM element
  },
  
  onSelectionChange: ({ selectedElements, canvas }) => {
    // Triggered when: selection changes
    // selectedElements: array of selected elements
  },
  
  onBeforeRedraw: (canvasContext) => {
    // Triggered before each redraw
    // Good for: preparing data, measurements
  },
  
  onAfterRedraw: (canvasContext) => {
    // Triggered after each redraw
    // Good for: DOM updates, external component sync
    // canvasContext: { canvas, ctx, camera, shapes, texts, paths, etc. }
  }
});

// Manual hook management
canvas.addHook('onCameraChange', callback);
canvas.removeHook('onCameraChange', callback);

// Cleanup (important!)
integration.cleanup();
```

### Migration from Legacy Integration

**❌ Old way (causes infinite loops):**
```javascript
const originalRedraw = canvas.redrawCanvas.bind(canvas);
canvas.redrawCanvas = function() {
    originalRedraw();
    updateMyComponents(); // Risky - might trigger more redraws
};
```

**✅ New way (safe and efficient):**
```javascript
const integration = canvas.integrateExternalComponent({
    onCameraChange: ({ camera }) => updateMyComponents(camera),
    onAfterRedraw: () => syncDOMElements()
});
```

### Best Practices

1. **Use the hook system** - Prefer `integrateExternalComponent()` over direct method hooking
2. **Always use world coordinates** - Store positions in world space, not screen space
3. **Clean up properly** - Always call `integration.cleanup()` when components unmount
4. **Implement hit detection** - Make your components selectable and interactive
5. **Handle zoom scaling** - Components should scale appropriately with zoom
6. **Consider performance** - Use viewport culling to hide off-screen components
7. **Error handling** - Wrap hook callbacks in try-catch for robustness
8. **Debounce expensive operations** - Use `onCameraChange` which only fires on actual changes

### Coordinate System Reference

```javascript
// Converting between coordinate systems
const worldPos = { x: 100, y: 200 };

// World to screen (for positioning DOM elements)
const screenPos = canvas.worldToCanvas(worldPos.x, worldPos.y);

// Screen to world (for mouse interactions)
const mouseWorld = canvas.canvasToWorld(mouseX, mouseY);

// Access current camera state
const camera = canvas.activeCanvasContext.camera;
console.log('Camera:', { x: camera.x, y: camera.y, zoom: camera.zoom });
```

## Floating Toolbar API

Canvas Maker includes a floating, draggable toolbar that external applications can control:

```javascript
// Control toolbar position
canvas.setToolbarPosition(100, 50); // Move toolbar to x:100, y:50

// Get current toolbar position
const position = canvas.getToolbarPosition();
console.log(position); // { x: 100, y: 50 }

// Hide/show toolbar
canvas.hideToolbar();
canvas.showToolbar();

// Listen for toolbar movements by user
canvas.on('toolbarMove', ({ x, y }) => {
    console.log('User moved toolbar to:', x, y);
    // Save position to localStorage, sync with other components, etc.
});

// Example: Remember toolbar position
function saveToolbarPosition() {
    const pos = canvas.getToolbarPosition();
    localStorage.setItem('toolbarPosition', JSON.stringify(pos));
}

function restoreToolbarPosition() {
    const saved = localStorage.getItem('toolbarPosition');
    if (saved) {
        const pos = JSON.parse(saved);
        canvas.setToolbarPosition(pos.x, pos.y);
    }
}

// Save position when user moves it
canvas.on('toolbarMove', saveToolbarPosition);

// Restore on page load
restoreToolbarPosition();
```

## Event Handling

### Custom Event Listeners
```javascript
// Listen for selection changes
let lastSelectionLength = 0;
setInterval(() => {
  if (canvas.selectedElements.length !== lastSelectionLength) {
    console.log('Selection changed:', canvas.selectedElements);
    lastSelectionLength = canvas.selectedElements.length;
  }
}, 100);

// Listen for tool changes
let lastTool = canvas.currentTool;
setInterval(() => {
  if (canvas.currentTool !== lastTool) {
    console.log('Tool changed to:', canvas.currentTool);
    lastTool = canvas.currentTool;
  }
}, 100);
```

## Advanced Features

### Nested Canvas Support
```javascript
// Check if nested canvas is open
if (canvas.isNestedCanvasOpen) {
  // Work with nested canvas context
  const nestedContext = canvas.nestedCanvasContext;
  
  // Add elements to nested canvas
  nestedContext.shapes.push({
    type: 'rectangle',
    x: 50, y: 50,
    width: 100, height: 80,
    strokeColor: '#ff00ff'
  });
  
  canvas.redrawCanvas();
}

// Open specific nested canvas
canvas.openNestedCanvas('nested_1');

// Close nested canvas
canvas.closeNestedCanvas();
```

### Clipboard Operations
```javascript
// Copy selected elements
if (canvas.selectedElements.length > 0) {
  canvas.copySelectedElements();
}

// Paste clipboard elements
canvas.pasteElements();

// Cut selected elements  
canvas.cutSelectedElements();
```

### Custom Component Types

To add support for new component types, extend the rendering system:

```javascript
// Add custom component type to data arrays
canvas.activeCanvasContext.customComponents = canvas.activeCanvasContext.customComponents || [];

// Add custom component
canvas.activeCanvasContext.customComponents.push({
  type: 'arrow',
  startX: 100, startY: 100,
  endX: 200, endY: 150,
  color: '#00ff00'
});

// Extend the drawCanvasContent function to render custom components
const originalDrawContent = canvas.drawCanvasContent;
canvas.drawCanvasContent = function(canvasContext) {
  // Call original drawing
  originalDrawContent.call(this, canvasContext);
  
  // Draw custom components
  const { customComponents = [] } = canvasContext;
  customComponents.forEach((component, index) => {
    if (component.type === 'arrow') {
      // Custom arrow rendering logic
      const ctx = canvasContext.ctx;
      ctx.beginPath();
      ctx.moveTo(component.startX, component.startY);
      ctx.lineTo(component.endX, component.endY);
      ctx.strokeStyle = component.color;
      ctx.stroke();
    }
  });
};
```

## Performance Considerations

- Call `redrawCanvas()` only when necessary (after adding/modifying elements)
- Large numbers of elements (>1000) may impact performance
- Use `canvas.activeCanvasContext` to work with the current context (main or nested)
- Avoid frequent camera changes during interactions

## Integration Checklist

1. ✅ Include `canvas.js` and `styles.css` in your project
2. ✅ Set up HTML structure with canvas element and selection box
3. ✅ Initialize CanvasMaker instance
4. ✅ Add components to appropriate data arrays
5. ✅ Call `redrawCanvas()` after modifications
6. ✅ Handle tool switching and selection as needed
7. ✅ Implement data export/import for persistence
8. ✅ Test interaction with select, drag, and resize functionality

## Example: Complete Integration

```javascript
// Initialize canvas
const canvas = new CanvasMaker();

// Add some initial components
canvas.activeCanvasContext.shapes.push({
  type: 'rectangle',
  x: 100, y: 100, width: 200, height: 150,
  strokeColor: '#333', fillColor: 'transparent'
});

canvas.activeCanvasContext.texts.push({
  text: 'Click to select and drag me!',
  x: 150, y: 175,
  fontSize: 14, color: '#666'
});

// Switch to select tool
canvas.currentTool = 'select';
canvas.updateCanvasCursor();

// Redraw to show components
canvas.redrawCanvas();

// Export data function
function exportCanvas() {
  const data = {
    shapes: canvas.activeCanvasContext.shapes,
    texts: canvas.activeCanvasContext.texts,
    camera: canvas.activeCanvasContext.camera
  };
  return JSON.stringify(data, null, 2);
}

// Import data function
function importCanvas(jsonData) {
  const data = JSON.parse(jsonData);
  canvas.activeCanvasContext.shapes = data.shapes || [];
  canvas.activeCanvasContext.texts = data.texts || [];
  Object.assign(canvas.activeCanvasContext.camera, data.camera || {});
  canvas.redrawCanvas();
}
```

This API provides everything needed to integrate the canvas system as a tldraw replacement while maintaining full compatibility with the existing drag, select, and resize functionality.