# Canvas Maker Integration API

This document provides a complete guide for integrating the Canvas Maker system into other applications as a tldraw replacement.

## Recent Updates (v1.8.5)

### Enhanced Content Analysis & Resize Flexibility
- ✅ **Structural HTML analysis** - Intelligent sizing based on element composition (paragraphs, list items, forms) rather than hardcoded component types
- ✅ **Generous resize constraints** - Auto-detected content can be manually resized up to 1.5x detected size (capped at 1000px width, 600px height)
- ✅ **Smart navigation handling** - Navigation bars with many list items get appropriate height estimates (assumes horizontal layout)
- ✅ **Improved size caps** - Content-derived dimensions capped at 800×500px instead of restrictive 375×650px mobile defaults
- ✅ **Full-width support** - Components can now display and resize to their intended widths without aggressive mobile-first capping

### Previous Updates (v1.8.4)

### Automatic HTML Content Analysis  
- ✅ **Intelligent size detection** - System now automatically analyzes HTML content to extract dimensions from inline styles and CSS
- ✅ **Multiple detection methods** - Supports inline `style="width: 558px; height: 212px"`, CSS rules, and content-based estimation
- ✅ **Content type awareness** - Different estimation algorithms for forms, tables, images, and text content
- ✅ **Seamless integration** - Works with existing resize constraint system and size capping logic
- ✅ **No external dependencies** - Pure HTML/CSS parsing without requiring external size measurement

### Previous Updates (v1.8.3)

### Enhanced Size Capping and Resize Logic
- ✅ **Initial size capping with resize memory** - Components with explicit dimensions larger than defaults (e.g., 558×212) are initially capped at default maximums (375×212) but remember original requested dimensions for resize limits
- ✅ **Content-aware vs manual constraint distinction** - System now properly distinguishes between default type constraints and individual manual constraints, preventing unwanted override behavior
- ✅ **Optimal resize limits** - Components can resize up to `max(originalRequested + buffer, contentSize + buffer)`, enabling proper growth beyond initial caps
- ✅ **Cleaner constraint priority** - Individual shape constraints override content-aware logic, while default type constraints do not
- 🐛 **Fixed default constraint interference** - Default `reactComponent` maxWidth/maxHeight no longer incorrectly treated as manual constraints

### Previous Updates (v1.8.2)

### Enhanced Content-Aware Resize System
- ✅ **Configurable content buffer** - Default 10px buffer beyond content size, customizable via API
- ✅ **Absolute maximum limits** - Manual constraints capped at content size × multiplier (default 3x) 
- ✅ **Auto-sizing components** - Components without specified dimensions auto-resize to content on creation
- ✅ **Configurable defaults** - Default component size now 375×650px (mobile-friendly), customizable
- ✅ **Smart content measurement** - Components resize when content differs significantly from defaults

### Previous Updates (v1.8.1)

### Content-Aware Resize Constraints - Bug Fix
- 🐛 **Fixed manual constraint override bug** - Manual constraints now properly take precedence over content-based limits
- ✅ **Respects setResizeConstraints() calls** - Components can now be resized beyond content size when manually configured
- ✅ **Conditional constraint application** - Content-based limits only apply when no manual constraints are set
- ✅ **Maintains backward compatibility** - Existing behavior preserved for components without manual constraints

### Content-Aware Resize Constraints (Original)
- ✅ **Automatic content-based resize limits** - HTML components cannot be resized larger than content size + 10px when no manual override exists
- ✅ **Smart constraint integration** - Works alongside existing resize constraint system
- ✅ **Real-time content measurement** - Uses existing overflow detection system for accurate sizing
- ✅ **Prevents UI bloat** - Maintains clean, content-appropriate component dimensions
- ✅ **Seamless UX** - Users cannot drag resize handles beyond content boundaries

### HTML Component Selection & Hit Detection
- ✅ **Native selection system compatibility** - HTML components fully integrated into CanvasMaker's selection system
- ✅ **First-class shape treatment** - HTML components handled identically to rectangles, circles, and other primitives
- ✅ **Multi-selection support** - HTML components can be selected alongside other elements
- ✅ **Proper hit testing** - Accurate click detection for HTML component boundaries
- ✅ **No external event handlers required** - Selection works out-of-the-box without additional setup

### Previous Updates (v1.7)

### Component Layering & Context Menu System
- ✅ **Right-click context menu** - Modern context menu with bring to front/back, duplicate, and delete options
- ✅ **Layer management system** - Bring components to front/back by manipulating render order in arrays
- ✅ **Keyboard shortcuts** - `Ctrl/Cmd + ]` (front), `Ctrl/Cmd + [` (back), `Ctrl/Cmd + D` (duplicate)
- ✅ **Component duplication** - Create copies of any element including HTML components with DOM cloning
- ✅ **Enhanced deletion** - Context menu and keyboard deletion with proper cleanup

### Method Export Fixes & API Improvements  
- 🐛 **Fixed removeReactComponent() accessibility** - Method now accepts both ID strings and shape objects
- ✅ **Enhanced dual-layer cleanup** - Complete removal from canvas layer, HTML layer, and registry
- ✅ **Added clearAllReactComponents()** - Efficiently remove all HTML components at once
- ✅ **Method accessibility verified** - All React component methods properly exported on instance
- 🐛 **Fixed clearAllReactComponents() DOM cleanup** - Now properly removes visible DOM elements from page
- ✅ **Added forceVisualClear() method** - Clears cached visual state and forces complete canvas redraw

### Toolbar Positioning Enhancements
- ✅ **Added initialToolbarPosition constructor option** - Position toolbar at exact coordinates from creation
- 🐛 **Fixed toolbar drag after external position changes** - Maintains draggability when moved programmatically
- ✅ **Enhanced SVG icon rendering** - Robust cross-environment compatibility with explicit namespaces
- ✅ **No visual flash/jump** - Toolbar appears at intended position without repositioning animation

### Previous Updates (v1.6)

### Clear Method Bug Fixes & Integration Requirements
- 🐛 **Fixed clear() reactComponent persistence bug** - `clear()` method now properly removes all reactComponent container shapes
- 🐛 **Fixed clearHTMLComponents() shape filtering** - Method now correctly preserves regular canvas shapes while removing only HTML components
- ✅ **Added addHTMLComponent() alias** - Backward compatibility method for external applications
- ✅ **Enhanced clear method reliability** - All granular clear methods now handle reactComponent shapes correctly
- ⚠️ **CRITICAL: External app persistence integration** - Apps using persistence must clear stored state when calling clear methods

### Previous Updates (v1.5)

#### Resize Constraints System
- ✅ **Configurable resize limits** - Prevent content distortion with min/max size bounds
- ✅ **External API control** - Outer apps can modify constraints with validation warnings
- ✅ **Individual component constraints** - Set custom limits per component
- ✅ **Intelligent validation** - Automatic warnings for concerning constraint values
- ✅ **Safe defaults** - Reasonable limits prevent UI issues while allowing flexibility

### Previous Updates (v1.4)

#### Enhanced Persistence System
- ✅ **Complete state export/import** - Full canvas state including HTML components, camera, and tool state
- ✅ **Individual component data access** - Get/set data for specific HTML components
- ✅ **Persistence filtering hooks** - Custom filters to control what gets saved/loaded
- ✅ **Granular clear methods** - Separate methods for clearing shapes vs HTML components
- ✅ **Component recreation** - Restore HTML components from serialized data

### Previous Updates (v1.3)

#### HTML Component Scrolling
- ✅ **Scrollable HTML content** - Components with overflow content show scrollbars when in edit mode
- ✅ **Double-click activation** - Scrolling is enabled automatically when entering edit mode
- ✅ **External size configuration** - Outer apps can set custom scrollable container sizes
- ✅ **Overflow detection** - API methods to check and analyze content overflow
- ✅ **Enhanced clear() method** - Complete state cleanup including HTML components and selection boxes

### Previous Updates (v1.2)

#### Enhanced UI/UX
- ✅ **Fixed invisible shapes bug** - All shapes now always have visible strokes
- ✅ **Group drag support** - Multiple selected elements can be dragged as a group
- ✅ **Nested canvas improvements** - Clean floating toolbar with drag support
- ✅ **Grid system** - Infinite grid background for better visual reference
- ✅ **Fixed toolbar icons** - Line and arrow tools now display correctly

#### Nested Canvas Features
- ✅ **Floating toolbar** - Draggable tool palette within nested canvas
- ✅ **Complete toolset** - Pen, rectangle, circle, line, arrow, text, select, clear tools
- ✅ **No PNG overlays** - Fixed browser extension interference issues
- ✅ **Grid-free nested canvas** - Clean workspace without grid distractions

## Architecture Overview

The canvas system is built around a `CanvasMaker` class that manages:
- **Infinite canvas** with zoom/pan capabilities
- **Multi-layered rendering** (paths, shapes, text, nested canvases)
- **Interactive tools** (select, drag, resize, draw)
- **Component lifecycle** (create, select, modify, delete)

### HTML Component Selection System

CanvasMaker's native selection system fully supports HTML components without requiring additional event handlers:

- **Integrated hit detection** - HTML components are treated as first-class shapes in `getElementAtPoint()`
- **Unified selection API** - Same selection events and methods work for all element types
- **Multi-selection compatible** - HTML components can be selected with other shapes
- **Standard resize/drag behavior** - Full manipulation support using existing systems
- **No external setup required** - Works out-of-the-box when you add HTML components

```javascript
// HTML components automatically participate in selection
const component = canvas.addReactComponentWithHTML(content, x, y, w, h);

// Standard selection events work
canvas.on('selectionChange', ({ selectedElements }) => {
    // selectedElements may include HTML components alongside other shapes
    console.log('Selected:', selectedElements);
});

// Click to select, drag to move, resize handles - all work automatically
```

## Quick Start Integration

### 1. Basic Setup

#### CSS Import
Copy `styles.css` to your project and import it:
```html
<link rel="stylesheet" href="./CanvasMaker.css">
```
Or in a bundler:
```javascript
import './CanvasMaker.css';
```

#### Canvas Initialization
```javascript
// Create container element
const container = document.getElementById('canvas-container');

// Create canvas instance with TLDraw-style options
const canvas = new CanvasMaker(container, {
    createToolbar: true,           // Enable floating toolbar
    toolbarPosition: 'top-left',   // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
    width: container.clientWidth,
    height: container.clientHeight,
    showGrid: true                 // Optional: show grid background
});

// Set TLDraw-style virtual bounds (prevents infinite canvas)
canvas.setCameraConstraints({
    bounds: { x: -1000, y: -1000, width: 2000, height: 2000 },
    behavior: 'contain'  // 'contain', 'inside', or 'free'
});
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

## Toolbar Positioning API (v1.7)

CanvasMaker provides comprehensive control over floating toolbar positioning to prevent visual jumps and enable precise placement.

### Constructor Options

```javascript
// Option 1: Position toolbar at exact coordinates from creation (RECOMMENDED)
const canvas = new CanvasMaker('#container', {
    initialToolbarPosition: { x: 300, y: 150 }
});
// ✅ Toolbar appears at (300, 150) immediately - no flash or jump

// Option 2: Use named positions (legacy)
const canvas = new CanvasMaker('#container', {
    toolbarPosition: 'top-right' // 'top-left', 'top-right', 'bottom-left', 'bottom-right'
});
// ⚠️ May cause visual jump if repositioned later
```

### Programmatic Positioning

```javascript
// Move toolbar to specific coordinates (maintains draggability)
canvas.setToolbarPosition(400, 200);

// Get current toolbar position
const position = canvas.getToolbarPosition();
console.log(`Toolbar at: ${position.x}, ${position.y}`);

// The toolbar remains draggable after programmatic positioning
```

### Best Practices

**For Outer Apps:**
```javascript
// ✅ GOOD: Position immediately during creation
const canvas = new CanvasMaker('#container', {
    initialToolbarPosition: { x: 100, y: 50 }  // No visual jump
});

// ❌ AVOID: Create then reposition (causes flash)
const canvas = new CanvasMaker('#container');
canvas.setToolbarPosition(100, 50);  // Visible jump from default position
```

**Responsive Positioning:**
```javascript
// Position relative to viewport size
const canvas = new CanvasMaker('#container', {
    initialToolbarPosition: { 
        x: window.innerWidth - 250,  // 250px from right edge
        y: 20                         // 20px from top
    }
});
```

### Integration Notes

- **Coordinate System**: Absolute pixel coordinates from top-left of viewport
- **Viewport Constraints**: Automatically constrained to prevent off-screen positioning  
- **Drag Compatibility**: All positioning methods maintain toolbar draggability
- **Visual Performance**: `initialToolbarPosition` prevents layout shifts and visual jumps

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

Canvas Maker supports three coordinate systems for component placement:

```javascript
// 1. World coordinates (default) - absolute position on infinite canvas
const shape1 = canvas.addReactComponentWithHTML(100, 200, 300, 150, htmlContent);
// Places component at world position (100, 200) - doesn't change when user pans/zooms

// 2. Screen/canvas coordinates - position relative to visible canvas area  
const shape2 = canvas.addReactComponentWithHTML(50, 50, 300, 150, htmlContent, {
    coordinateSystem: 'screen'
});
// Places component 50px from top-left corner of visible canvas

// 3. Center coordinates - position relative to viewport center
const shape3 = canvas.addReactComponentWithHTML(0, -100, 300, 150, htmlContent, {
    coordinateSystem: 'center' 
});
// Places component 100px above the center of current viewport

// Helper methods for easier placement
const centerShape = canvas.addReactComponentAtCenter(300, 150, htmlContent);
const screenShape = canvas.addReactComponentAtScreenPos(50, 50, 300, 150, htmlContent);

// Backward compatibility alias (v1.6+)
const legacyShape = canvas.addHTMLComponent(100, 200, 300, 150, htmlContent);
// Same as addReactComponentWithHTML() - provided for external applications

// Converting between coordinate systems manually
const worldPos = { x: 100, y: 200 };
const screenPos = canvas.worldToCanvas(worldPos.x, worldPos.y);
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

### Dynamic Toolbar Customization

External apps can easily add, remove, and customize toolbar tools:

```javascript
// Add a custom tool
canvas.addTool({
    id: 'my-custom-tool',
    tool: 'customTool',
    icon: 'M12 2l2 7h7l-5.5 4 2 7-5.5-4-5.5 4 2-7L2 9h7l2-7z',
    title: 'My Custom Tool',
    customHandler: () => {
        console.log('Custom tool clicked!');
        // Your custom logic here
    }
}, 2); // Insert at position 2

// Remove a tool
canvas.removeTool('text-tool'); // Remove text tool

// Add a custom action button
canvas.addAction({
    id: 'export-btn',
    icon: 'M19 12v7H5v-7M12 2v10m5-5l-5 5-5-5',
    title: 'Export',
    class: 'export-btn',
    customHandler: () => {
        // Export functionality
        exportCanvas();
    }
});

// Remove an action
canvas.removeAction('make-real-btn'); // Remove Make Real button

// Complete toolbar reconfiguration
canvas.setToolbarConfig({
    tools: [
        { id: 'pen-tool', tool: 'pen', icon: '...', title: 'Pen' },
        { id: 'select-tool', tool: 'select', icon: '...', title: 'Select', active: true }
    ],
    actions: [
        { id: 'save-btn', icon: '...', title: 'Save', customHandler: save },
        { id: 'load-btn', icon: '...', title: 'Load', customHandler: load }
    ]
});

// Get current toolbar configuration
const config = canvas.getToolbarConfig();
console.log('Current toolbar:', config);

// Listen for toolbar changes
canvas.on('toolbarChange', (event) => {
    console.log('Toolbar changed:', event.type, event);
    // event.type: 'toolAdded', 'toolRemoved', 'actionAdded', 'actionRemoved', 'configChanged'
});
```

### Real-World Examples

**Example 1: Minimal Drawing App**
```javascript
// Keep only essential tools
canvas.setToolbarConfig({
    tools: [
        { id: 'pen-tool', tool: 'pen', icon: 'M3 17.25V21h3.75...', title: 'Draw', active: true },
        { id: 'select-tool', tool: 'select', icon: 'M2 2v6h2V4h4V2...', title: 'Select' }
    ],
    actions: [
        { id: 'clear-btn', action: 'clearCanvas', icon: 'M19 6.41L17.59...', title: 'Clear', class: 'clear-btn' }
    ]
});
```

**Example 2: Add Custom Tools**
```javascript
// Add a custom eraser tool
canvas.addTool({
    id: 'eraser-tool',
    tool: 'eraser',
    icon: 'M16.24 3.56l4.95 4.94c.78.79.78 2.05 0 2.84L12 20.53a4 4 0 0 1-5.66 0L2.81 17c-.78-.79-.78-2.05 0-2.84l8.48-8.48c.79-.78 2.05-.78 2.84 0l2.11 2.12zm-1.41 1.41L12.7 7.1 16.9 11.3l2.12-2.12-4.19-4.2z',
    title: 'Eraser',
    customHandler: () => {
        canvas.currentTool = 'eraser';
        // Implement eraser logic
    }
}, 1); // Insert after pen tool

// Add a layers button
canvas.addAction({
    id: 'layers-btn',
    icon: 'M12 16l4-4H8l4 4zm0-8L8 4h8l-4 4z',
    title: 'Layers',
    customHandler: () => {
        showLayersPanel();
    }
});
```

**Example 3: Context-Sensitive Toolbar**
```javascript
// Change toolbar based on selection
canvas.on('selectionChange', ({ selectedElements }) => {
    if (selectedElements.length > 0) {
        // Show editing tools
        if (!canvas.getToolbarConfig().actions.find(a => a.id === 'delete-btn')) {
            canvas.addAction({
                id: 'delete-btn',
                icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z',
                title: 'Delete',
                customHandler: () => deleteSelected()
            });
        }
    } else {
        // Hide editing tools
        canvas.removeAction('delete-btn');
    }
});
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

---

## React Integration Guide

### Container-Based Initialization

Canvas Maker now supports container-based initialization for better framework integration:

```javascript
// Traditional initialization (creates own canvas)
const canvas = new CanvasMaker('#my-container', {
  createCanvas: true,
  createToolbar: true,
  width: 1200,
  height: 800
});

// React-friendly initialization (use existing elements)
const canvas = new CanvasMaker(canvasElement, {
  createCanvas: false,
  createToolbar: false
});
```

### React Component Examples

#### Basic React Canvas Component

```jsx
import React, { useRef, useEffect, useState } from 'react';

const CanvasComponent = ({ onCanvasReady, children }) => {
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const [canvasMaker, setCanvasMaker] = useState(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize Canvas Maker with container
    const canvas = new CanvasMaker(containerRef.current, {
      createCanvas: true,
      createToolbar: false, // We'll create our own toolbar
      width: 1200,
      height: 800
    });

    setCanvasMaker(canvas);
    onCanvasReady?.(canvas);

    return () => {
      // Cleanup if needed
      canvas.destroy?.();
    };
  }, []);

  return (
    <div className="canvas-wrapper">
      <div ref={containerRef} className="canvas-container" />
      {children}
    </div>
  );
};
```

#### Enhanced React Integration with Event System

```jsx
import React, { useRef, useEffect, useState, useCallback } from 'react';

const EnhancedCanvasComponent = () => {
  const [canvasMaker, setCanvasMaker] = useState(null);
  const [cameraState, setCameraState] = useState({ x: 0, y: 0, zoom: 1 });
  const [selection, setSelection] = useState([]);
  const [isPanning, setIsPanning] = useState(false);
  const [isZooming, setIsZooming] = useState(false);

  const handleCanvasReady = useCallback((canvas) => {
    setCanvasMaker(canvas);

    // Enhanced pan/zoom event listeners
    canvas.on('beforePan', ({ camera }) => {
      setIsPanning(true);
    });

    canvas.on('duringPan', ({ camera, delta }) => {
      setCameraState(camera);
      // Update any React components that need real-time pan feedback
    });

    canvas.on('afterPan', ({ camera, startCamera }) => {
      setIsPanning(false);
      setCameraState(camera);
      // Trigger any cleanup or final updates
    });

    canvas.on('beforeZoom', ({ camera, oldZoom, newZoom, zoomCenter }) => {
      setIsZooming(true);
    });

    canvas.on('duringZoom', ({ camera, oldZoom, newZoom, zoomCenter }) => {
      setCameraState(camera);
      // Real-time zoom feedback for React components
    });

    canvas.on('afterZoom', ({ camera, oldZoom, newZoom, zoomCenter }) => {
      setIsZooming(false);
      setCameraState(camera);
    });

    // Selection events
    canvas.on('selectionChange', ({ selectedElements, count }) => {
      setSelection(selectedElements);
    });

    // Camera change events (for any camera movement)
    canvas.on('cameraChange', (cameraData) => {
      setCameraState(cameraData);
    });
  }, []);

  return (
    <div className="enhanced-canvas-wrapper">
      <CanvasComponent onCanvasReady={handleCanvasReady}>
        <div className="canvas-info">
          <div>Camera: x={cameraState.x.toFixed(2)}, y={cameraState.y.toFixed(2)}, zoom={cameraState.zoom.toFixed(2)}</div>
          <div>Selection: {selection.length} items</div>
          <div>State: {isPanning ? 'Panning' : isZooming ? 'Zooming' : 'Idle'}</div>
        </div>
      </CanvasComponent>
    </div>
  );
};
```

#### React Component Registration System

```jsx
import React, { useRef, useEffect } from 'react';

const SyncedCanvasOverlay = ({ canvasMaker, type = 'overlay' }) => {
  const componentRef = useRef(null);
  const componentId = useRef(`overlay-${Math.random().toString(36).substr(2, 9)}`);

  useEffect(() => {
    if (!canvasMaker) return;

    // Register this React component with Canvas Maker
    const registration = canvasMaker.registerExternalComponent(
      componentId.current,
      {
        // Component interface for Canvas Maker
        handleCanvasEvent: (eventData) => {
          switch (eventData.type) {
            case 'cameraChange':
              // Update component based on camera changes
              if (componentRef.current) {
                const { camera, viewport } = eventData;
                componentRef.current.style.transform = 
                  `translate(${-camera.x * camera.zoom}px, ${-camera.y * camera.zoom}px) scale(${camera.zoom})`;
              }
              break;
            case 'selectionChange':
              // React to selection changes
              console.log('Selection changed:', eventData.selectedElements);
              break;
          }
        }
      },
      {
        type,
        syncWithCamera: true,
        syncWithSelection: true,
        layer: 1
      }
    );

    return () => {
      // Cleanup: unregister component
      canvasMaker.unregisterExternalComponent(componentId.current);
    };
  }, [canvasMaker, type]);

  return (
    <div 
      ref={componentRef}
      className="synced-overlay"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        transformOrigin: '0 0'
      }}
    >
      <div className="overlay-content">
        Synced React Overlay
      </div>
    </div>
  );
};
```

### Advanced Coordinate Conversion Utilities

```jsx
import React, { useState, useEffect } from 'react';

const CoordinateUtilityExample = ({ canvasMaker }) => {
  const [worldPoints, setWorldPoints] = useState([
    { x: 100, y: 100 },
    { x: 200, y: 200 },
    { x: 300, y: 300 }
  ]);
  const [screenPoints, setScreenPoints] = useState([]);
  const [viewportInfo, setViewportInfo] = useState(null);

  useEffect(() => {
    if (!canvasMaker) return;

    const updateCoordinates = () => {
      // Batch convert world coordinates to screen coordinates
      const converted = canvasMaker.worldToBatch(worldPoints);
      setScreenPoints(converted);

      // Get comprehensive viewport information
      const viewport = canvasMaker.getViewportInfo();
      setViewportInfo(viewport);
    };

    // Update on camera changes
    canvasMaker.on('cameraChange', updateCoordinates);
    updateCoordinates(); // Initial update

    return () => {
      canvasMaker.off('cameraChange', updateCoordinates);
    };
  }, [canvasMaker, worldPoints]);

  const addRandomPoint = () => {
    const bounds = canvasMaker?.getViewportBounds();
    if (bounds) {
      const newPoint = {
        x: bounds.left + Math.random() * bounds.width,
        y: bounds.top + Math.random() * bounds.height
      };
      setWorldPoints(prev => [...prev, newPoint]);
    }
  };

  const checkVisibility = (point) => {
    return canvasMaker?.isPointInViewport(point.x, point.y);
  };

  return (
    <div className="coordinate-utility">
      <h3>Coordinate Conversion Example</h3>
      
      <button onClick={addRandomPoint}>Add Random Point</button>
      
      <div className="points-display">
        {worldPoints.map((worldPoint, index) => {
          const screenPoint = screenPoints[index];
          const isVisible = checkVisibility(worldPoint);
          
          return (
            <div key={index} className={`point ${isVisible ? 'visible' : 'hidden'}`}>
              <div>World: ({worldPoint.x.toFixed(2)}, {worldPoint.y.toFixed(2)})</div>
              {screenPoint && (
                <div>Screen: ({screenPoint.x.toFixed(2)}, {screenPoint.y.toFixed(2)})</div>
              )}
              <div>Visible: {isVisible ? 'Yes' : 'No'}</div>
            </div>
          );
        })}
      </div>

      {viewportInfo && (
        <div className="viewport-info">
          <h4>Viewport Info</h4>
          <div>Bounds: {JSON.stringify(viewportInfo.bounds, null, 2)}</div>
          <div>Canvas Size: {viewportInfo.canvasSize.width} x {viewportInfo.canvasSize.height}</div>
          <div>Pixels per World Unit: {viewportInfo.pixelsPerWorldUnit}</div>
        </div>
      )}
    </div>
  );
};
```

### Complete React Integration Example

```jsx
import React, { useState, useRef, useEffect } from 'react';

const CompleteCanvasIntegration = () => {
  const [canvasMaker, setCanvasMaker] = useState(null);
  const [registeredComponents, setRegisteredComponents] = useState(new Map());
  const containerRef = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    // Initialize with container-based approach
    const canvas = new CanvasMaker(containerRef.current, {
      createCanvas: true,
      createToolbar: true,
      toolbarPosition: 'top-left',
      width: 1200,
      height: 800
    });

    // Set up component lifecycle tracking
    const unsubscribeMountCallback = canvas.onComponentMount((component) => {
      console.log('Component mounted:', component);
      setRegisteredComponents(prev => new Map(prev).set(component.id, component));
    });

    const unsubscribeUnmountCallback = canvas.onComponentUnmount((component) => {
      console.log('Component unmounted:', component);
      setRegisteredComponents(prev => {
        const newMap = new Map(prev);
        newMap.delete(component.id);
        return newMap;
      });
    });

    setCanvasMaker(canvas);

    return () => {
      unsubscribeMountCallback();
      unsubscribeUnmountCallback();
      canvas.destroy?.();
    };
  }, []);

  const addShape = () => {
    if (!canvasMaker) return;
    
    const viewport = canvasMaker.getViewportBounds();
    canvasMaker.activeCanvasContext.shapes.push({
      type: 'rectangle',
      x: viewport.center.x - 50,
      y: viewport.center.y - 25,
      width: 100,
      height: 50,
      strokeColor: '#333',
      fillColor: '#f0f0f0'
    });
    canvasMaker.redrawCanvas();
  };

  return (
    <div className="complete-integration">
      <div className="controls">
        <button onClick={addShape}>Add Shape at Viewport Center</button>
        <div>Registered Components: {registeredComponents.size}</div>
      </div>
      
      <div className="canvas-area">
        <div ref={containerRef} className="canvas-container" />
        
        {/* React overlays that sync with canvas */}
        {canvasMaker && (
          <>
            <SyncedCanvasOverlay canvasMaker={canvasMaker} type="debug" />
            <CoordinateUtilityExample canvasMaker={canvasMaker} />
          </>
        )}
      </div>
    </div>
  );
};

export default CompleteCanvasIntegration;
```

### React Component Edit Mode

Canvas Maker supports interactive edit mode for React components:

```javascript
// Double-click any React component to enter edit mode
// This makes the HTML content interactive while showing selection handles

// Programmatically enter/exit edit mode
canvas.enterComponentEditMode(shape);  // Enable HTML interaction
canvas.exitComponentEditMode(shape);   // Return to selection/drag mode

// Check if component is in edit mode
const isEditing = canvas.editingComponentId === shape.id;

// Listen for edit mode changes
canvas.on('componentEditMode', ({ shapeId, isEditing }) => {
    console.log(`Component ${shapeId} edit mode: ${isEditing}`);
});
```

**Edit Mode Behavior:**
- **Selection mode**: Component shows resize handles, can be dragged/resized
- **Edit mode**: HTML content becomes interactive, can click buttons/forms inside
- **Toggle**: Double-click component to switch between modes
- **Visual feedback**: Slight opacity change indicates current mode

## Canvas and HTML Content Management

### Clearing Canvas Content

The canvas system manages both canvas-drawn content and HTML DOM elements. To properly clear everything:

```javascript
// ✅ Correct way - clears everything visible
canvas.clear();

// What clear() does:
// - Removes all shapes from canvas layer
// - Clears all HTML elements from HTML rendering layer  
// - Hides selection boxes and resize handles
// - Resets all interaction states (drawing, dragging, selecting, etc.)
// - Clears temporary visual elements and CSS classes
// - Forces complete redraw of both layers

// ❌ Incorrect way - only clears canvas, leaves HTML elements
canvas.clearCanvas(); // Internal method, use clear() instead

// ✅ Complete cleanup when removing canvas instance
canvas.dispose(); // Clears content + removes event listeners + cleans up DOM
```

**Why Canvas and HTML Don't Act as One Unit:**

The system uses two separate rendering layers:
1. **Canvas layer**: For drawn shapes (paths, rectangles, circles, etc.)
2. **HTML layer**: For interactive React components and DOM elements

Both layers are synchronized for positioning/transformations, but they exist as separate DOM elements. The `clear()` method ensures both layers are cleaned up together.

### HTML Component Scrolling API

Canvas Maker supports automatic scrolling for HTML components with content larger than their container:

```javascript
// Scrolling is automatically enabled when:
// 1. Component content overflows its container dimensions
// 2. User double-clicks the component to enter edit mode
// 3. Scrollbars appear automatically for overflow content

// Check if a component has overflow content
const hasOverflow = canvas.hasComponentOverflow(shapeId);
console.log('Has overflow:', hasOverflow); // true/false

// Get detailed overflow information
const overflowInfo = canvas.getComponentOverflowInfo(shapeId);
if (overflowInfo) {
    console.log('Content size:', overflowInfo.scrollWidth, 'x', overflowInfo.scrollHeight);
    console.log('Container size:', overflowInfo.clientWidth, 'x', overflowInfo.clientHeight);
    console.log('Horizontal overflow:', overflowInfo.horizontal);
    console.log('Vertical overflow:', overflowInfo.vertical);
}

// Set custom scrollable container size (allows external app control)
const success = canvas.setComponentScrollableSize(shapeId, 300, 200); // width, height
console.log('Size update:', success ? 'succeeded' : 'failed');

// Reset to auto size (null removes custom sizing)
canvas.setComponentScrollableSize(shapeId, null, null);

// Example: Create component with large content that will scroll
const largeFormHTML = `
    <div style="padding: 20px; background: white;">
        <h3>Large Form</h3>
        <p>This form has more content than can fit in the container...</p>
        <!-- Multiple form fields that exceed container height -->
        <input type="text" placeholder="Field 1" style="width: 100%; margin: 10px 0;">
        <textarea rows="5" style="width: 100%; margin: 10px 0;"></textarea>
        <select style="width: 100%; margin: 10px 0;">...</select>
        <!-- More content... -->
    </div>
`;

const shape = canvas.addReactComponentWithHTML(0, 0, 250, 150, largeFormHTML, {
    id: 'scrollable-form',
    coordinateSystem: 'center'
});

// The component will automatically show scrollbars when double-clicked for editing
```

**Scrolling Behavior:**
- **Automatic detection**: Overflow is detected when content exceeds container dimensions
- **Edit mode activation**: Double-click component to enable scrolling (along with HTML interaction)
- **Visual indicators**: Scrollable components show subtle border in edit mode
- **External control**: Outer applications can set custom scrollable container sizes
- **Responsive**: Scrollbars appear only for the overflow direction (horizontal/vertical)

**Use Cases:**
- Large forms that don't fit in fixed containers
- Rich text content with variable length
- Data tables or lists with many items
- Complex UI components with nested scrollable areas

### Component Layering & Context Menu API

Canvas Maker includes a complete layering system with right-click context menus for managing component order and duplication:

#### Context Menu Features
```javascript
// Context menu automatically appears on right-click over any element
// Available options:
// - Bring to Front (Ctrl/Cmd + ])
// - Send to Back (Ctrl/Cmd + [)  
// - Duplicate (Ctrl/Cmd + D)
// - Delete (Delete key)

// The context menu handles all element types:
// - Canvas shapes (rectangles, circles)
// - Text elements
// - Path elements (pen drawings)
// - HTML components (reactComponent shapes)
```

#### Programmatic Layering Methods
```javascript
// Bring element to front (moves to end of render array)
canvas.bringToFront(element);

// Send element to back (moves to beginning of render array)  
canvas.sendToBack(element);

// Duplicate any element with automatic offset
canvas.duplicateElement(element);

// Delete element with proper cleanup
canvas.deleteElement(element);

// All methods trigger automatic canvas redraw
```

#### Layer Management with Selection
```javascript
// Work with selected elements
if (canvas.selectedElements.length > 0) {
    // Bring all selected to front
    canvas.selectedElements.forEach(element => {
        canvas.bringToFront(element);
    });
    
    // Duplicate all selected elements
    canvas.selectedElements.forEach(element => {
        canvas.duplicateElement(element);
    });
    
    canvas.redraw(); // Update display
}
```

### Enhanced React Component API (v1.7)

Fixed method export issues - all React component methods are now properly accessible:

#### Core React Component Methods
```javascript
// Add HTML component (both signatures work)
const shape = canvas.addReactComponent(domElement, x, y, width, height, options);
const shape = canvas.addHTMLComponent(domElement, x, y, width, height, options); // Alias

// Remove component by ID or shape object (FIXED in v1.7)
canvas.removeReactComponent(componentId);        // ✅ Now works with ID string
canvas.removeReactComponent(shapeObject);        // ✅ Also works with shape object

// Position component in world coordinates
canvas.positionReactComponent(shape, camera, canvas);

// Clear all HTML components at once (NEW in v1.7, FIXED DOM cleanup)
const removedCount = canvas.clearAllReactComponents();
console.log(`Removed ${removedCount} components`);

// This method now performs complete cleanup:
// 1. Removes visible DOM elements from page (.remove())
// 2. Clears htmlComponents Map
// 3. Removes reactComponent shapes from canvas
// 4. Disconnects observers and cleans registry
// 5. Forces complete visual canvas clearing (NEW)

// Force visual clearing to match empty state (NEW in v1.7)
canvas.forceVisualClear();

// This method ensures visual canvas matches internal state:
// - Clears all canvas pixels with ctx.clearRect()
// - Resets cached visual state and canvas properties
// - Forces complete redraw from current (empty) state
// - Handles multiple canvas contexts (active, main, nested, root)
```

#### Enhanced Dual-Layer Cleanup
```javascript
// removeReactComponent() performs complete cleanup:
// 1. Removes from shapes array (canvas layer)
// 2. Removes DOM element from document 
// 3. Cleans HTML rendering layer
// 4. Disconnects mutation observers
// 5. Clears component registry
// 6. Triggers canvas redraw

const success = canvas.removeReactComponent('component-123');
console.log('Cleanup successful:', success); // true/false

// clearAllReactComponents() performs bulk cleanup (ENHANCED v1.7):
// 1. Removes ALL visible DOM elements from page first
// 2. Clears htmlComponents Map completely
// 3. Removes all reactComponent shapes from canvas
// 4. Disconnects all observers and cleans registry
// 5. Forces complete visual canvas clearing (NEW)

const count = canvas.clearAllReactComponents();
console.log('Total components removed:', count);

// forceVisualClear() ensures visual consistency (NEW v1.7):
// - Clears all canvas contexts (active, main, nested, root)
// - Resets canvas state (transforms, alpha, composite operations)
// - Clears cached visual state if available
// - Reapplies camera transforms after clearing
// - Forces complete redraw from current state

canvas.forceVisualClear(); // Use when visual state doesn't match internal arrays
```

### Enhanced Persistence and State Management

Canvas Maker provides comprehensive state management for both canvas elements and HTML components:

#### Complete State Export/Import

```javascript
// Export complete canvas state including HTML components
const state = canvas.exportState();
console.log('Exported state:', {
    version: state.version,
    timestamp: state.timestamp,
    shapes: state.shapes.length,
    htmlComponents: state.htmlComponents.length,
    camera: state.camera,
    currentTool: state.currentTool
});

// Import previously exported state
const success = canvas.importState(state);
console.log('Import success:', success);

// State includes:
// - All canvas shapes (rectangles, circles, paths, etc.)
// - All HTML components with their content and properties
// - Camera position and zoom level
// - Current tool selection
// - Active component edit mode
// - Selection states
```

#### Individual Component Data Access

```javascript
// Get data for a specific HTML component
const componentData = canvas.getHTMLComponentData('my-component-id');
if (componentData) {
    console.log('Component data:', {
        id: componentData.id,
        position: { x: componentData.x, y: componentData.y },
        size: { width: componentData.width, height: componentData.height },
        content: componentData.htmlContent,
        hasOverflow: componentData.hasOverflow,
        scrollableSize: componentData.scrollableSize
    });
}

// Get all HTML components data for bulk operations
const allComponents = canvas.getAllHTMLComponentsData();
console.log(`Found ${allComponents.length} HTML components`);

// Recreate component from saved data
const restoredComponent = canvas.createHTMLComponentFromData(componentData);
console.log('Component restored:', restoredComponent ? 'success' : 'failed');
```

#### Persistence Filtering Hooks

```javascript
// Set up custom persistence filter
canvas.setPersistenceFilter((item, type) => {
    // Filter out temporary or sensitive components
    if (type === 'htmlComponent') {
        // Don't persist temporary components
        if (item.id && item.id.startsWith('temp-')) {
            console.log('Filtering out temporary component:', item.id);
            return false;
        }
        
        // Don't persist components with sensitive data
        if (item.customProperties && item.customProperties.containsSensitiveData) {
            return false;
        }
    }
    
    // Filter out certain shape types
    if (type === 'shape' && item.type === 'reactComponent') {
        // Don't auto-save reactComponent shapes (save as htmlComponent instead)
        return false;
    }
    
    // Include everything else
    return true;
});

// Export with filtering applied
const filteredState = canvas.exportState();

// Clear filter (pass null to remove)
canvas.setPersistenceFilter(null);
```

#### Granular Clear Methods

```javascript
// Clear only canvas shapes (keep HTML components)
canvas.clearShapes();
console.log('Cleared rectangles, circles, paths, text - HTML components remain');

// Clear only HTML components (keep canvas shapes) - Fixed in v1.6
canvas.clearHTMLComponents();
console.log('Cleared HTML components - canvas shapes remain');
// Bug fix: Now correctly preserves regular canvas shapes like circles, rectangles

// Clear everything (equivalent to clear() but more explicit)
canvas.clearAll();
console.log('Cleared all content - both shapes and HTML components');

// The original clear() method still works and calls clearAll() - Fixed in v1.6
canvas.clear(); // Same as clearAll()
// Bug fix: Now properly removes reactComponent container shapes in React integrations
```

## ⚠️ **CRITICAL: Persistence Integration Warning**

**If your external application uses persistence** (localStorage, sessionStorage, database, etc.), you **MUST** clear the stored state when calling CanvasMaker clear methods. **The clear methods only clear the active CanvasMaker instance - they do not clear your app's persistence layer.**

### Common Integration Mistake
```javascript
// ❌ WRONG: This will restore cleared content immediately!
canvas.clear();                    // Clears CanvasMaker ✅
loadPersistedCanvasState();        // Restores everything back ❌
// Result: HTML components and containers still visible
```

### Correct Integration Patterns

**Pattern 1: Clear persistence first**
```javascript
// ✅ CORRECT: Clear persistence, then CanvasMaker
localStorage.removeItem('your-canvas-persistence-key');
sessionStorage.removeItem('your-canvas-state');
canvas.clear(); // Now stays cleared
```

**Pattern 2: Prevent restoration after clear**
```javascript
// ✅ CORRECT: Clear CanvasMaker, prevent restoration
canvas.clear();
this.skipNextPersistenceLoad = true; // Your app's flag
// Don't call your persistence restoration logic
```

**Pattern 3: Clear both simultaneously**
```javascript
// ✅ CORRECT: Clear both CanvasMaker and persistence
await Promise.all([
    canvas.clear(),
    clearPersistentStorage(), // Your persistence clearing function
    yourDatabase.clearCanvasState() // If using database
]);
```

### Debug Clear Issues

If components/containers still appear after `canvas.clear()`:

```javascript
// 1. Check if your app is restoring persistence
console.log('Before clear:', canvas.activeCanvasContext.shapes.length);
canvas.clear();
console.log('After clear:', canvas.activeCanvasContext.shapes.length); // Should be 0

setTimeout(() => {
    console.log('After timeout:', canvas.activeCanvasContext.shapes.length);
    // If this is > 0, your app is restoring persistence!
}, 100);

// 2. Check localStorage/sessionStorage
console.log('Stored state:', localStorage.getItem('your-persistence-key'));
// If this contains canvas data, clear it!

// 3. Verify HTML components are cleared
console.log('HTML components:', canvas.htmlComponents.size); // Should be 0
```

### Integration Checklist

When implementing clear functionality:
- [ ] ✅ Call `canvas.clear()` or granular clear methods
- [ ] ✅ Clear your app's localStorage/sessionStorage canvas data
- [ ] ✅ Clear your app's database/API stored canvas state  
- [ ] ✅ Prevent automatic persistence restoration after clear
- [ ] ✅ Test that components/containers disappear completely
- [ ] ✅ Verify `canvas.activeCanvasContext.shapes.length === 0` after clear
- [ ] ✅ Verify `canvas.htmlComponents.size === 0` after clear

#### Understanding Auto-Created Shapes

**Important:** When you add an HTML component using `addReactComponentWithHTML()`, Canvas Maker automatically creates a corresponding `reactComponent` shape in the shapes array. This is by design to:

1. **Unified Selection System**: HTML components can be selected alongside canvas shapes
2. **Consistent Positioning**: Both use the same coordinate system and camera transforms
3. **Integrated Persistence**: Components are included in standard canvas operations

```javascript
// When you create an HTML component:
const shape = canvas.addReactComponentWithHTML(0, 0, 200, 100, htmlContent, {
    id: 'my-component'
});

// Canvas Maker automatically:
// 1. Creates a reactComponent shape in the shapes array
// 2. Creates corresponding HTML element in the DOM
// 3. Links them via the same ID for synchronization

// You can access both:
const shapeData = canvas.getHTMLComponentData('my-component'); // HTML component data
const shapeIndex = canvas.activeCanvasContext.shapes.findIndex(s => s.id === 'my-component'); // Shape index

// The persistence filter can control this behavior:
canvas.setPersistenceFilter((item, type) => {
    // Don't persist auto-created reactComponent shapes if you only want HTML data
    if (type === 'shape' && item.type === 'reactComponent') {
        return false; // Will be saved as htmlComponent instead
    }
    return true;
});
```

### Resize Constraints and Content Protection

Canvas Maker includes a comprehensive resize constraints system to prevent component distortion and ensure good user experience:

### Content-Aware Resize Constraints (v1.8.2)

HTML components now feature a sophisticated content-aware resize system with configurable settings and absolute limits:

#### Basic Usage

```javascript
// AUTO-SIZING: Don't specify dimensions, let component auto-size to content
const autoComponent = canvas.addReactComponentWithHTML(x, y, null, null, content);
// Component auto-sizes to content + buffer, capped at default size (375×650px max)

// EXPLICIT SIZING: Specify dimensions as before
const fixedComponent = canvas.addReactComponentWithHTML(x, y, 400, 300, content);
// Component uses specified size, subject to content constraints

// MANUAL OVERRIDE: Set larger constraints when needed
canvas.setResizeConstraints(component.id, {
    maxWidth: 800,   // Larger than content width
    maxHeight: 600   // Larger than content height
});
// User can resize up to 800×600, but capped at content × maxMultiplier
```

#### Configuration API

```javascript
// Configure content-aware resize behavior
canvas.setContentResizeSettings({
    buffer: 15,              // px beyond content size (default: 10)
    maxMultiplier: 2.5,      // Max size = content × multiplier (default: 3)
    defaultWidth: 400,       // Default width when no size specified (default: 375)
    defaultHeight: 500       // Default height when no size specified (default: 650)
});

// Get current settings
const settings = canvas.getContentResizeSettings();
console.log(`Buffer: ${settings.buffer}px, Max: ${settings.maxMultiplier}x`);

// Constructor configuration
const canvas = new CanvasMaker('#container', {
    contentResizeBuffer: 20,
    maxContentMultiplier: 4,
    defaultComponentWidth: 320,
    defaultComponentHeight: 568
});
```

#### Advanced Examples

```javascript
// Mobile-first responsive component
const mobileComponent = canvas.addReactComponentWithHTML(
    x, y, null, null,  // Let it auto-size
    `<div style="width: 300px">Mobile content</div>`
);
// Auto-sizes to ~310×[content height + buffer], max 375×650px

// Content larger than container
const wideComponent = canvas.addReactComponentWithHTML(x, y, 300, 200, 
    `<div style="width: 500px; height: 150px">Wide content</div>`
);
// User can resize container, but limited by content constraints

// Override for special cases
canvas.setResizeConstraints(wideComponent.id, { maxWidth: 800 });
// Can now resize up to 800px width (but capped at 500 × 3 = 1500px absolute max)
```

**Key Benefits:**
- **Auto-sizing components** - No need to guess component dimensions, auto-sizes to content
- **Configurable behavior** - Buffer size, max multiplier, and defaults all customizable
- **Absolute safety limits** - Manual constraints capped to prevent excessive resizing
- **Mobile-first defaults** - 375×650px default size works well for mobile content
- **Backward compatible** - Existing explicit sizing behavior unchanged

**Technical Details (v1.8.2):**
- **Auto-sizing logic**: Components with `null` dimensions auto-resize to content + buffer, capped at default size
- **Absolute maximum limits**: Manual constraints capped at `contentSize × maxContentMultiplier`
- **Auto-size cap**: Auto-sized components cannot exceed default dimensions (375×650px by default)
- **Configurable settings**: All behavior customizable via constructor options or runtime API
- Applied in both `performResize()` and `performResizeForContext()` functions

**Constraint Priority Logic (v1.8.3):**
1. **Absolute maximum limit** (content × multiplier) - Ultimate ceiling, cannot be exceeded
2. **Individual manual constraints** (via `setResizeConstraints()` on specific components) - Respected but capped by #1
3. **Content-aware constraints** - Applied when no individual manual constraints exist:
   - Uses `max(originalRequested + buffer, contentSize + buffer)` 
   - Remembers originally requested dimensions even if initially capped
   - Example: 558×212 component → initially 375×212, resizable up to 568×222
4. **Default type constraints** (reactComponent defaults) - Do not override content-aware logic
5. **Minimum constraints** - Floor values to prevent components becoming too small

**Configuration Options:**
- `contentResizeBuffer`: Pixels beyond content size (default: 10)
- `maxContentMultiplier`: Maximum size as multiple of content (default: 3)
- `defaultComponentWidth`: Default width when null specified (default: 375)
- `defaultComponentHeight`: Default height when null specified (default: 650)

**Example: Size Capping with Resize Memory (v1.8.3)**

```javascript
// Component with explicit dimensions larger than defaults
const component = canvas.addReactComponentWithHTML(x, y, 558, 212, content);

// Initial state:
// - Displayed at: 375×212 (width capped at default, height preserved)
// - Stored requested: 558×212 (for resize calculations)

// During resize:
// - Content measured as: 397×194
// - Max resize width: max(558+10, 397+10) = 568
// - Max resize height: max(212+10, 194+10) = 222
// - Component resizable up to: 568×222

// Without individual manual constraints, content-aware logic applies
// Default type constraints (reactComponent: maxWidth 1500) do not interfere
```

### Automatic HTML Content Analysis (v1.8.4)

Canvas Maker now automatically analyzes HTML content to detect dimensions, eliminating the need for external size measurement:

#### How It Works

The system analyzes HTML content using multiple methods to extract dimensions:

1. **Inline Style Detection** - Extracts `width` and `height` from `style` attributes
2. **CSS Rule Analysis** - Parses `<style>` tags for container dimensions  
3. **Content-Based Estimation** - Estimates sizes based on content type and length

```javascript
// Example: HTML with inline dimensions
const htmlContent = `
    <div style="width: 558px; height: 212px; background: #ff6b6b; padding: 20px;">
        <h2>Netflix Navigation</h2>
        <p>This content has explicit dimensions that will be detected automatically</p>
    </div>
`;

// Create component WITHOUT specifying dimensions - let content analysis handle it
const component = canvas.addReactComponentWithHTML(x, y, null, null, htmlContent);

// System automatically:
// 1. Analyzes content and detects 558×212 dimensions
// 2. Applies size capping: initially displayed as 375×212 (width capped)
// 3. Stores original 558×212 for resize limits
// 4. Allows resizing up to 568×222 (detected size + buffer)
```

#### Supported Detection Methods

**Method 1: Inline Styles** *(Highest Priority)*
```javascript
// Automatically detects 400×300
const content1 = `<div style="width: 400px; height: 300px;">Content</div>`;
const comp1 = canvas.addReactComponentWithHTML(x, y, null, null, content1);
```

**Method 2: CSS Rules** *(Second Priority)*
```javascript
// Automatically detects 500×250 from .container class
const content2 = `
    <style>
        .container { width: 500px; height: 250px; background: #fff; }
    </style>
    <div class="container">Content with CSS styling</div>
`;
const comp2 = canvas.addReactComponentWithHTML(x, y, null, null, content2);
```

**Method 3: Content-Based Estimation** *(Fallback)*
```javascript
// No explicit dimensions - estimates based on content type
const content3 = `
    <form>
        <input type="text" placeholder="Name">
        <input type="email" placeholder="Email">
        <textarea placeholder="Message"></textarea>
        <button>Submit</button>
    </form>
`;
const comp3 = canvas.addReactComponentWithHTML(x, y, null, null, content3);
// Estimates ~350×200 based on form content pattern
```

#### Integration with Existing Systems

Content analysis seamlessly integrates with all existing resize constraint features:

```javascript
// 1. DETECTED DIMENSIONS: Content analysis finds 558×200
const htmlWithDimensions = `<div style="width: 558px; height: 200px;">...</div>`;
const component = canvas.addReactComponentWithHTML(x, y, null, null, htmlWithDimensions);

// 2. SIZE CAPPING: Initially displayed as 375×200 (width capped at default)
console.log(`Initial size: ${component.width}×${component.height}`); // 375×200

// 3. RESIZE MEMORY: Can resize up to detected size + buffer
// Max resize: max(558+10, measuredContent+10) = 568×[content+10]

// 4. MANUAL OVERRIDE: Still works with setResizeConstraints()
canvas.setResizeConstraints(component.id, {
    maxWidth: 700,  // Overrides content analysis limits
    maxHeight: 400
});
```

#### Structural Intelligence (v1.8.5)

The system analyzes HTML structure to make intelligent size estimates based on element composition:

**Width Estimation Logic:**
- Base width calculated from content density and text length
- Adjusted for horizontal elements (many list items suggest horizontal layout)
- Increased for tables based on expected column count
- **Range: 250-500px** depending on content complexity
- **Content-derived cap: 800px** (much more generous than 375px mobile default)

**Height Estimation Logic:**
- Calculated by intelligently stacking vertical elements:
  - Paragraphs: ~25px each
  - Headings: ~35px each  
  - Form inputs: ~40px each
  - Buttons: ~45px each
  - **List items: Smart horizontal detection** - If >4 items, assumes some are horizontal (like navigation)
  - Table rows: ~35px each
- Plus base padding/margin space (~20px, reduced from 40px)
- **Range: 50-400px** based on element count and intelligent layout detection
- **Content-derived cap: 500px**

**Manual Resize Flexibility:**
- Auto-detected content can be manually resized up to **1.5x the larger of (detected size, initial size)**
- **Width limit: 1000px** for generous manual expansion
- **Height limit: 600px** for reasonable vertical growth
- Explicit dimensions still respect original size capping behavior

```javascript
// Navigation with list items - analyzed structurally (v1.8.5)
const navHTML = `
    <nav>
        <a href="#" class="logo">Netflix</a>
        <ul>
            <li><a href="#">Home</a></li>
            <li><a href="#">Movies</a></li>
            <li><a href="#">TV Shows</a></li>
        </ul>
    </nav>
`;
// Analysis: 5 list items detected - smart horizontal layout assumed
// Width: max(base_width, 5 * 60px) = ~300px
// Height: ceil(5/4) vertical items * 30px + 20px base = ~110px (much better!)
// Manual resize: Up to ~450px width, ~165px height (1.5x multiplier)

// Form with multiple inputs - counted structurally
const formHTML = `
    <form>
        <input type="email" placeholder="Email">
        <input type="password" placeholder="Password">
        <button>Sign In</button>
    </form>
`;
// Analysis: 2 inputs + 1 button stacked vertically
// Height: 2 * 40px + 1 * 45px + 40px base = ~165px

// Table with rows - counted structurally
const tableHTML = `
    <table>
        <tr><th>Name</th><th>Age</th><th>City</th></tr>
        <tr><td>John</td><td>30</td><td>NYC</td></tr>
    </table>
`;
// Analysis: 2 table rows detected
// Width: 400 + (2 * 20px) = ~440px
// Height: 2 * 35px + 40px base = ~110px

// All auto-size based on structural analysis
const navComp = canvas.addReactComponentWithHTML(x, y, null, null, navHTML);
const formComp = canvas.addReactComponentWithHTML(x, y+200, null, null, formHTML);
const tableComp = canvas.addReactComponentWithHTML(x, y+380, null, null, tableHTML);
```

#### Benefits

- ✅ **No external measurement needed** - Pure HTML/CSS parsing
- ✅ **Maintains existing behavior** - All size capping and constraints work as before  
- ✅ **Progressive enhancement** - Falls back gracefully when no dimensions detected
- ✅ **Performance optimized** - Lightweight regex-based parsing
- ✅ **Works with complex HTML** - Handles nested structures and multiple style sources

### Traditional Resize Constraints

#### Default Resize Constraints

Canvas Maker ships with sensible default constraints:

```javascript
// Default constraints for all components
const defaults = {
    minWidth: 20,           // Prevent unreadable content
    minHeight: 20,
    maxWidth: 2000,         // Prevent performance issues  
    maxHeight: 2000,
    
    // HTML components have stricter defaults
    reactComponent: {
        minWidth: 50,       // Ensure HTML content is readable
        minHeight: 30,
        maxWidth: 1500,     // Reasonable max sizes
        maxHeight: 1000
    },
    
    // Other shape types
    circle: { minRadius: 5, maxRadius: 500 },
    text: { minWidth: 30, minHeight: 20, maxWidth: 1000, maxHeight: 800 }
};
```

#### External API: Configure Global Constraints

```javascript
// Set constraints for HTML components with validation
canvas.setHTMLComponentConstraints({
    minWidth: 100,
    minHeight: 60,
    maxWidth: 800,
    maxHeight: 600
});
// Console: ℹ️ [RESIZE-CONSTRAINTS] Updating reactComponent resize constraints

// Set global constraints affecting all shapes
canvas.setGlobalResizeConstraints({
    minWidth: 30,
    maxWidth: 3000
});

// Get current constraints for inspection
const current = canvas.getCurrentResizeConstraints('reactComponent');
console.log('Current HTML constraints:', current);
```

#### External API: Remove Constraints (with warnings)

```javascript
// Remove constraints - shows comprehensive warnings
canvas.removeResizeConstraints('reactComponent');
// Console: ⚠️ [RESIZE-CONSTRAINTS] REMOVING RESIZE CONSTRAINTS FOR REACTCOMPONENT
//          This may lead to:
//          • Component distortion and poor user experience
//          • HTML content becoming unreadable when too small
//          • Performance issues with very large components
//          • UI layout problems and content overflow
//          • Accessibility issues for users

// Suppress warnings if you know what you're doing
canvas.removeResizeConstraints('reactComponent', { suppressWarnings: true });
```

#### Individual Component Constraints

```javascript
// Set constraints when creating components
const component = canvas.addReactComponentWithHTML(0, 0, 200, 100, htmlContent, {
    id: 'my-component',
    resizeConstraints: {
        minWidth: 150,      // Custom min size for this component
        minHeight: 80,
        maxWidth: 400,      // Custom max size
        maxHeight: 300
    }
});

// Update constraints for existing components
canvas.setComponentResizeConstraints('my-component', {
    minWidth: 120,
    maxHeight: 250
});

// Individual constraints override global defaults
const constraints = canvas.getResizeConstraints('reactComponent', component);
// Returns: merged global + individual constraints
```

#### Intelligent Validation and Warnings

Canvas Maker provides helpful warnings for problematic constraint values:

```javascript
// Setting concerning values triggers warnings
canvas.setHTMLComponentConstraints({
    minWidth: 5,        // ⚠️ Very small - content may become unreadable
    minHeight: 3,       // ⚠️ Very small - content may become unreadable  
    maxWidth: 3000,     // ⚠️ Very large - may cause performance issues
    maxHeight: 2500     // ⚠️ Very large - may cause performance issues
});

// Invalid ranges show errors
canvas.setHTMLComponentConstraints({
    minWidth: 200,
    maxWidth: 150       // ❌ minWidth >= maxWidth - invalid range
});

// Suppress all validation messages
canvas.setHTMLComponentConstraints({
    minWidth: 1,
    maxWidth: 5000
}, { suppressWarnings: true });
```

#### Best Practices for Resize Constraints

**✅ Recommended:**
- Keep minimum sizes above 30x20 for readable content
- Set maximum sizes below 1500x1000 for good performance
- Test constraints with real content to ensure usability
- Use individual constraints for components with special needs

**❌ Avoid:**
- Removing constraints entirely unless absolutely necessary
- Setting minimums below 10px (content becomes unreadable)
- Setting maximums above 2000px (performance impact)
- Creating invalid ranges where min >= max

**🔧 Integration Example:**
```javascript
// Production-ready constraint setup
const canvas = new CanvasMaker(container);

// Set app-specific constraints
canvas.setHTMLComponentConstraints({
    minWidth: 80,       // Large enough for UI elements
    minHeight: 50,      // Tall enough for buttons/text
    maxWidth: 1200,     // Fits most screens
    maxHeight: 800      // Reasonable max height
});

// For special components (e.g., forms, cards)
canvas.setComponentResizeConstraints('user-profile-card', {
    minWidth: 200,      // Profile cards need more space
    minHeight: 150,
    maxWidth: 400,      // But not too large
    maxHeight: 500
});

// Monitor constraint violations in production
canvas.on('constraintViolation', ({ componentId, attempted, applied }) => {
    console.log(`Component ${componentId} resize constrained:`, {
        attempted: attempted,
        applied: applied
    });
});
```

### Best Practices for React Integration

1. **Use Container-Based Initialization**: Let Canvas Maker create the canvas element for better compatibility.

2. **Leverage Enhanced Events**: Use the granular pan/zoom events for smooth React state synchronization.

3. **Register React Components**: Use the component registration system for automatic notifications.

4. **Batch Coordinate Conversions**: Use `worldToBatch()` and `canvasToBatch()` for efficient coordinate operations.

5. **Monitor Viewport Changes**: Use `getViewportInfo()` and `getViewportBounds()` for responsive React components.

6. **Clean Up Properly**: Always unregister components and remove event listeners in useEffect cleanup.

7. **Use Throttled Events**: For high-frequency updates, rely on the built-in throttling in `duringPan` and `duringZoom` events.

8. **Handle Edit Mode**: Design components to work in both selection and edit modes for better UX.

### DOM Element Synchronization

Canvas Maker can synchronize external DOM elements (like React components) with the canvas coordinate system:

```jsx
import React, { useEffect, useRef } from 'react';

const SynchronizedReactComponent = ({ canvasMaker }) => {
  const componentRef = useRef(null);
  const shapeRef = useRef(null);

  useEffect(() => {
    if (!canvasMaker || !componentRef.current) return;

    // Add the React component as a canvas shape that syncs with camera
    const shape = canvasMaker.addReactComponent(
      componentRef.current, // DOM element
      100, 200,             // x, y world coordinates
      200, 150,             // width, height
      {
        label: 'React Component',
        interactive: true,   // Can be selected and moved
        strokeColor: '#3b82f6'
      }
    );

    shapeRef.current = shape;

    return () => {
      // Cleanup when component unmounts
      if (shapeRef.current) {
        canvasMaker.removeReactComponent(shapeRef.current);
      }
    };
  }, [canvasMaker]);

  return (
    <div
      ref={componentRef}
      style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        color: 'white',
        padding: '20px',
        borderRadius: '8px',
        boxShadow: '0 4px 8px rgba(0,0,0,0.1)'
      }}
    >
      <h3>Synchronized React Component</h3>
      <p>This component moves with canvas pan/zoom operations!</p>
      <button onClick={() => alert('Button clicked!')}>
        Interactive Button
      </button>
    </div>
  );
};
```

### Manual React Component Integration

For more control, you can manually create reactComponent shapes:

```jsx
// Create a React component shape manually
const reactShape = {
  type: 'reactComponent',
  x: 300,
  y: 300,
  width: 250,
  height: 100,
  domElement: myDomElement,
  interactive: true,
  label: 'Custom Component'
};

// Add to canvas
canvasMaker.activeCanvasContext.shapes.push(reactShape);
canvasMaker.redrawCanvas();

// The DOM element will automatically sync with camera movements
```

### Migration from Other Canvas Libraries

Canvas Maker provides a modern, React-friendly alternative to tldraw and other canvas libraries:

- **Container-based initialization** instead of requiring specific DOM structure
- **Enhanced event system** with granular before/during/after events
- **Component registration system** for automatic React component synchronization
- **DOM element synchronization** for seamless React component integration
- **Batch coordinate operations** for efficient updates
- **Comprehensive viewport utilities** for responsive design

This API provides everything needed to integrate the canvas system as a tldraw replacement while maintaining full compatibility with the existing drag, select, and resize functionality.