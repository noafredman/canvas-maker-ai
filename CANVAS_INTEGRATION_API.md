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

// Recenter to origin
canvas.recenterCanvas();

canvas.redrawCanvas();
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