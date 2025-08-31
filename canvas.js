// Clear any old test data from localStorage
if (typeof localStorage !== 'undefined') {
    localStorage.removeItem('canvasMakerData');
    localStorage.removeItem('nestedCanvasData');
}

class CanvasMaker {
    constructor(containerOrCanvas = null, options = {}) {
        const instanceId = Math.random().toString(36).substr(2, 9);
        // console.log(`[CONSTRUCTOR-${instanceId}] Creating new CanvasMaker instance`);
        
        // Parse constructor arguments
        this.instanceId = instanceId;
        this.options = {
            createCanvas: true,
            createToolbar: true,
            toolbarPosition: 'top-left',
            initialToolbarPosition: null, // { x: number, y: number } for specific coordinates
            width: 1200,
            height: 800,
            // Content-aware resize settings
            contentResizeBuffer: 0, // px buffer beyond content size (0 for pixel-perfect)
            maxContentMultiplier: 3, // Max size = content size * multiplier
            defaultComponentWidth: 375, // Default width when no size provided
            defaultComponentHeight: 650, // Default height when no size provided
            ...options
        };
        
        // Handle container-based or canvas-based initialization
        if (typeof containerOrCanvas === 'string') {
            this.container = document.querySelector(containerOrCanvas);
        } else if (containerOrCanvas && containerOrCanvas.nodeType === Node.ELEMENT_NODE) {
            // Check if it's a canvas or container
            if (containerOrCanvas.tagName === 'CANVAS') {
                this.canvas = containerOrCanvas;
                this.container = containerOrCanvas.parentElement;
                this.options.createCanvas = false;
            } else {
                this.container = containerOrCanvas;
            }
        } else {
            // Fallback to existing elements
            this.canvas = document.getElementById('canvas');
            this.container = this.canvas?.parentElement || document.body;
            this.options.createCanvas = false;
        }
        
        // Create DOM structure if needed
        if (this.options.createCanvas && this.container) {
            this.setupDOMStructure();
        }
        
        // Initialize canvas references
        this.canvas = this.canvas || (this.container ? this.container.querySelector('canvas') : null);
        if (!this.canvas) {
            throw new Error('Could not find or create canvas element');
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // Make instance globally accessible for testing
        window.canvasMaker = this;
        this.currentTool = 'select'; // Default to select tool
        this.showOriginMarker = false; // Hide origin marker by default, set to true for testing
        this.isDrawing = false;
        this.isSelecting = false;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.justFinishedResize = false;
        this.startX = 0;
        this.startY = 0;
        // Initialize arrays that will be used in main canvas context
        this._currentPath = [];
        this._paths = [];
        this._shapes = [];
        this._texts = [];
        this._selectedElements = [];
        this._previewSelectedElements = []; // Elements that would be selected during drag
        this._hoveredElement = null;
        this.hoveredResizeHandle = null;
        this.dragOffset = { x: 0, y: 0 };
        this.clipboard = [];
        
        // Preview shape coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Camera/viewport system for infinite canvas
        this._camera = {
            x: 0,
            y: 0,
            zoom: 1,
            minZoom: 0.1,
            maxZoom: 5
        };
        
                 // Expose camera on window for external component access          
     window.canvasCamera = this._camera;         
        // Optional camera constraints (null = infinite canvas)
        this.cameraConstraints = null;
        // Track the original center position for recenter functionality
        this.originalCenter = { x: 0, y: 0 };
        this.isPanning = false;
        
        // Redraw loop protection
        this.isRedrawing = false;
        this.redrawRequested = false;
        
        // Component integration hooks
        this.hooks = {
            beforeRedraw: [],
            afterRedraw: [],
            onCameraChange: [],
            onSelectionChange: []
        };
        
        // Traditional event emitter system for React integration
        this.eventListeners = {};
        
        // Enhanced event system for React
        this.panState = { isPanning: false, startCamera: null };
        this.zoomState = { isZooming: false, startCamera: null };
        this.throttledEvents = new Map();
        
        // Toolbar configuration
        this.toolbarConfig = {
            tools: [
                { id: 'pen-tool', tool: 'pen', icon: 'M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z', title: 'Pen Tool' },
                { id: 'rectangle-tool', tool: 'rectangle', icon: 'M3 3v18h18V3H3zm16 16H5V5h14v14z', title: 'Rectangle Tool' },
                { id: 'circle-tool', tool: 'circle', icon: 'M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z', title: 'Circle Tool' },
                { id: 'line-tool', tool: 'line', icon: 'M2 11h20v2H2v-2z', title: 'Line Tool', transform: 'rotate(45 12 12)' },
                { id: 'arrow-tool', tool: 'arrow', icon: 'M4 11h12v2H4v-2zm12-2l4 3-4 3v-2H4v-2h12v-2z', title: 'Arrow Tool' },
                { id: 'text-tool', tool: 'text', icon: 'M5 4v3h5.5v12h3V7H19V4z', title: 'Text Tool' },
                { id: 'select-tool', tool: 'select', icon: 'M2 2v6h2V4h4V2H2zm0 16v-6h2v4h4v2H2zm20 0h-6v2h4v-4h2v6zm0-16V2h-6v2h4v4h2V6z', title: 'Select Tool', active: true },
                { id: 'nested-canvas-tool', tool: 'nested-canvas', icon: 'M4 4h16v16H4V4zm2 2v12h12V6H6zm2 2h8v8H8V8zm2 2v4h4v-4h-4z', title: 'Nested Canvas Tool' }
            ],
            actions: [
                { id: 'make-real-btn', action: 'makeReal', icon: 'M12 2l3.09 8.26L22 12l-6.91 1.74L12 22l-3.09-8.26L2 12l6.91-1.74L12 2z', title: 'Make Real', class: 'make-real-btn' },
                { id: 'clear-btn', action: 'clearCanvas', icon: 'M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z', title: 'Clear Canvas', class: 'clear-btn' }
            ]
        };
        
        // Touch gesture state
        this.touches = [];
        this.lastTouchDistance = 0;
        
        this.selectionBox = document.getElementById('selection-box');
        this.zoomIndicator = document.getElementById('zoom-indicator');
        this.recenterBtn = document.getElementById('recenter-btn');
        
        // Nested canvas elements
        this.nestedCanvasOverlay = document.getElementById('nested-canvas-overlay');
        this.nestedCanvas = document.getElementById('nested-canvas');
        this.nestedCtx = this.nestedCanvas ? this.nestedCanvas.getContext('2d') : null;
        this.closeNestedCanvasBtn = document.getElementById('close-nested-canvas');
        this.nestedSelectionBox = document.getElementById('nested-selection-box');
        this.nestedZoomIndicator = document.getElementById('nested-zoom-indicator');
        this.nestedRecenterBtn = document.getElementById('nested-recenter-btn');
        
        // Nested canvas state
        this._nestedCanvases = []; // Array to store nested canvas shapes
        this.isNestedCanvasOpen = false;
        
        // HTML rendering layer for React components
        this.htmlRenderingLayer = null;
        this.htmlComponents = new Map(); // Map of shape.id -> DOM element
        this.editingComponentId = null; // Track which component is in edit mode
        this.currentNestedCanvasId = null;
        this.nestedCanvasData = new Map(); // Store individual nested canvas data
        
        // Unified layering system for HTML and canvas elements
        this.canvasLayers = null; // Map of z-index -> elements for that layer
        this.additionalCanvasLayers = null; // Map of z-index -> {canvas, ctx} for additional layers
        
        // React component registration system
        this.externalComponents = new Map(); // Store external React components
        this.componentCallbacks = {
            onMount: [],
            onUnmount: [],
            onUpdate: []
        };

        // Initialize resize constraints
        this.resizeConstraints = {
            // Default constraints for all shapes
            minWidth: 20,
            minHeight: 20,
            maxWidth: 2000,
            maxHeight: 2000,
            // Specific constraints by shape type
            reactComponent: {
                minWidth: 50,
                minHeight: 30,
                maxWidth: 1500,
                maxHeight: 1000
            },
            circle: {
                minRadius: 5,
                maxRadius: 500
            },
            text: {
                minWidth: 30,
                minHeight: 20,
                maxWidth: 1000,
                maxHeight: 800
            }
        };
        
        // Main canvas context structure
        this.mainCanvasContext = {
            canvas: this.canvas,
            ctx: this.ctx,
            camera: this._camera,
            paths: this._paths,
            shapes: this._shapes,
            texts: this._texts,
            nestedCanvases: this._nestedCanvases,
            selectedElements: this._selectedElements,
            previewSelectedElements: this._previewSelectedElements,
            hoveredElement: this._hoveredElement,
            currentPath: this._currentPath,
            selectionBox: this.selectionBox
        };
        
        // Current active canvas context (main or nested)
        this.activeCanvasContext = this.mainCanvasContext;
        
        if (!this.selectionBox) {
            console.error('Selection box element not found!');
        }
        if (!this.zoomIndicator) {
            console.error('Zoom indicator element not found!');
        }
        if (!this.recenterBtn) {
            console.error('Recenter button element not found!');
        }
        if (!this.nestedCanvasOverlay) {
            console.error('Nested canvas overlay element not found!');
        }
        
        // Ensure HTML rendering layer is created
        this.ensureHTMLRenderingLayer();
        
        this.setupCanvas();
        this.setupEventListeners();
        // Always setup toolbar event listeners for existing HTML elements
        this.setupToolbar();
        
        if (this.options.createToolbar) {
            this.setupFloatingToolbar();
            this.rebuildToolbar(); // Build toolbar from config
        }
        this.updateZoomIndicator();
        this.updateRecenterButton();
        this.updateCanvasCursor();
        
        // Reset canvas transform initially
        this.canvas.style.transform = 'none';
        this.canvas.style.transformOrigin = '0 0';
        
        this.redrawCanvas();
    }
    
    ensureHTMLRenderingLayer() {
        // Create HTML rendering layer if it doesn't exist
        if (!this.htmlRenderingLayer) {
            const canvasParent = this.canvas.parentElement;
            
            // Check if rendering layer already exists
            this.htmlRenderingLayer = canvasParent.querySelector('.html-rendering-layer');
            
            if (!this.htmlRenderingLayer) {
                // Create the HTML rendering layer
                this.htmlRenderingLayer = document.createElement('div');
                this.htmlRenderingLayer.className = 'html-rendering-layer';
                this.htmlRenderingLayer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 1;
                    overflow: hidden;
                    transform-origin: top left;
                `;
                
                // Insert after canvas
                canvasParent.style.position = 'relative';
                if (this.canvas.nextSibling) {
                    canvasParent.insertBefore(this.htmlRenderingLayer, this.canvas.nextSibling);
                } else {
                    canvasParent.appendChild(this.htmlRenderingLayer);
                }
                
                // console.log('[HTML-RENDER] Created HTML rendering layer');
            }
        }
    }
    
    setupDOMStructure() {
        if (!this.container) return;
        
        // Create canvas container structure
        this.container.style.position = 'relative';
        this.container.style.overflow = 'hidden';
        
        // Create canvas element
        this.canvas = document.createElement('canvas');
        this.canvas.id = 'canvas';
        this.canvas.width = this.options.width;
        this.canvas.height = this.options.height;
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        this.canvas.style.display = 'block';
        
        // Create canvas controls
        const canvasContainer = document.createElement('div');
        canvasContainer.className = 'canvas-container';
        canvasContainer.appendChild(this.canvas);
        
        // Create selection box
        const selectionBox = document.createElement('div');
        selectionBox.id = 'selection-box';
        selectionBox.className = 'selection-box';
        canvasContainer.appendChild(selectionBox);
        
        // Create zoom controls
        const canvasControls = document.createElement('div');
        canvasControls.className = 'canvas-controls';
        canvasControls.innerHTML = `
            <div class="zoom-controls">
                <button id="zoom-out-btn" class="zoom-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13H5v-2h14v2z"/>
                    </svg>
                </button>
                <div id="zoom-indicator" class="zoom-indicator">100%</div>
                <button id="zoom-in-btn" class="zoom-btn">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/>
                    </svg>
                </button>
            </div>
            <button id="recenter-btn" class="recenter-btn" style="display: none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" stroke-width="2" fill="none"/>
                    <circle cx="12" cy="12" r="6" stroke="currentColor" stroke-width="2" fill="none"/>
                    <circle cx="12" cy="12" r="2" fill="currentColor"/>
                </svg>
            </button>
            <button id="reset-zoom-btn" class="recenter-btn" style="display: none;">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M15.5 14h-.79l-.28-.27C15.41 12.59 16 11.11 16 9.5 16 5.91 13.09 3 9.5 3S3 5.91 3 9.5 5.91 16 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
                    <text x="9.5" y="11" text-anchor="middle" font-size="6" font-weight="bold" fill="currentColor">100</text>
                </svg>
            </button>
        `;
        canvasContainer.appendChild(canvasControls);
        
        this.container.appendChild(canvasContainer);
        
        // Create floating toolbar if requested
        if (this.options.createToolbar) {
            const toolbar = document.createElement('div');
            toolbar.id = 'floating-toolbar';
            toolbar.className = 'floating-toolbar';
            
            // Set up absolute positioning for drag compatibility
            toolbar.style.position = 'absolute';
            
            // Use initialToolbarPosition if provided, otherwise fall back to toolbarPosition
            let finalPosition;
            
            if (this.options.initialToolbarPosition && 
                typeof this.options.initialToolbarPosition.x === 'number' && 
                typeof this.options.initialToolbarPosition.y === 'number') {
                // Use exact coordinates provided
                finalPosition = {
                    x: this.options.initialToolbarPosition.x,
                    y: this.options.initialToolbarPosition.y
                };
            } else {
                // Fall back to named positions
                const positions = {
                    'top-left': { x: 20, y: 20 },
                    'top-right': { x: window.innerWidth - 200, y: 20 }, // Estimate toolbar width
                    'bottom-left': { x: 20, y: window.innerHeight - 100 }, // Estimate toolbar height
                    'bottom-right': { x: window.innerWidth - 200, y: window.innerHeight - 100 }
                };
                finalPosition = positions[this.options.toolbarPosition] || positions['top-left'];
            }
            
            // Constrain to viewport to prevent off-screen placement
            const constrainedX = Math.max(0, Math.min(window.innerWidth - 50, finalPosition.x));
            const constrainedY = Math.max(0, Math.min(window.innerHeight - 50, finalPosition.y));
            
            toolbar.style.left = constrainedX + 'px';
            toolbar.style.top = constrainedY + 'px';
            
            // If no initial position was provided, mark toolbar as positioned
            // (prevents hiding behavior in setToolbarPosition)
            this._toolbarPositioned = !!this.options.initialToolbarPosition;
            
            toolbar.innerHTML = `
                <div class="toolbar-drag-handle" id="toolbar-drag-handle">
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                        <circle cx="5" cy="7" r="1"/>
                        <circle cx="12" cy="7" r="1"/>
                        <circle cx="19" cy="7" r="1"/>
                        <circle cx="5" cy="12" r="1"/>
                        <circle cx="12" cy="12" r="1"/>
                        <circle cx="19" cy="12" r="1"/>
                        <circle cx="5" cy="17" r="1"/>
                        <circle cx="12" cy="17" r="1"/>
                        <circle cx="19" cy="17" r="1"/>
                    </svg>
                </div>
                <div class="toolbar-content"></div>
            `;
            
            this.container.appendChild(toolbar);
        }
        
        // Create nested canvas overlay (simplified version)
        const nestedOverlay = document.createElement('div');
        nestedOverlay.id = 'nested-canvas-overlay';
        nestedOverlay.className = 'nested-canvas-overlay';
        nestedOverlay.style.display = 'none';
        this.container.appendChild(nestedOverlay);
    }
    
    setupCanvas() {
        // Try different approaches to detect actual available space
        const toolbar = document.querySelector('.toolbar');
        const toolbarHeight = toolbar ? toolbar.getBoundingClientRect().height : 0;
        
        // Method 1: Use document.documentElement client dimensions
        let availableWidth = document.documentElement.clientWidth;
        let availableHeight = document.documentElement.clientHeight - toolbarHeight;
        
        // Method 2: If that doesn't work, try visual viewport API
        if (window.visualViewport) {
            availableWidth = Math.min(availableWidth, window.visualViewport.width);
            availableHeight = Math.min(availableHeight, window.visualViewport.height - toolbarHeight);
        }
        
        // Method 3: Fallback to body dimensions
        if (availableWidth <= 0 || availableHeight <= 0) {
            const body = document.body;
            const bodyRect = body.getBoundingClientRect();
            availableWidth = bodyRect.width;
            availableHeight = bodyRect.height - toolbarHeight;
        }
        
        
        // Set canvas size to match the available viewport
        this.canvas.width = availableWidth;
        this.canvas.height = availableHeight;
        
        // Center the world origin (0,0) on the screen using unified setup
        this.setupCanvasContext(this.mainCanvasContext, availableWidth, availableHeight);
        
        // Update the app and container to use the calculated size
        const app = document.querySelector('.app');
        const container = this.canvas.parentElement;
        
        if (app) {
            app.style.width = availableWidth + 'px';
            app.style.height = (availableHeight + toolbarHeight) + 'px';
        }
        if (container) {
            container.style.width = availableWidth + 'px';
            container.style.height = availableHeight + 'px';
        }
        
        // Ensure canvas fills the container
        this.canvas.style.width = '100%';
        this.canvas.style.height = '100%';
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#333';
        this.ctx.fillStyle = 'transparent';
        
        // Redraw content after resize
        this.redrawCanvas();
    }
    
    setupCanvasContext(canvasContext, width, height) {
        // Unified canvas setup for consistent behavior across main and nested canvases
        const { camera, canvas, ctx } = canvasContext;
        
        // Set canvas dimensions
        canvas.width = width;
        canvas.height = height;
        
        // Set CSS size to match (with !important to override CSS rules)
        canvas.style.width = width + 'px';
        canvas.style.height = height + 'px';
        canvas.style.setProperty('width', width + 'px', 'important');
        canvas.style.setProperty('height', height + 'px', 'important');
        
        // For nested canvas, use fixed positioning relative to viewport as last resort
        if (canvas.id === 'nested-canvas') {
            // Clear all camera CSS variables that might interfere
            canvas.style.removeProperty('--camera-x');
            canvas.style.removeProperty('--camera-y'); 
            canvas.style.removeProperty('--camera-zoom');
            canvas.style.removeProperty('--camera-transform');
            
            // Keep canvas in its container instead of moving to body to avoid browser extension interference
            canvas.style.position = 'relative';
            canvas.style.top = '0';
            canvas.style.left = '0';
            canvas.style.transform = 'none';
            canvas.style.zIndex = '1';
            
            // Set dimensions normally
            canvas.setAttribute('width', width);
            canvas.setAttribute('height', height);
            canvas.style.width = `${width}px`;
            canvas.style.height = `${height}px`;
            
        }
        
        // With CSS transforms: camera coordinates represent the world position at screen center
        // Start with world origin (0,0) at screen center
        camera.x = 0;
        camera.y = 0;
        camera.zoom = 1;
        
        // Ensure camera has proper zoom bounds
        camera.minZoom = camera.minZoom || 0.1;
        camera.maxZoom = camera.maxZoom || 5;
        
        // Set context properties
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        // Update original center for main canvas
        if (canvasContext === this.mainCanvasContext) {
            this.originalCenter.x = width / 2;
            this.originalCenter.y = height / 2;
        }
    }
    
    setupEventListeners() {
        // console.log(`[SETUP-${this.instanceId}] Setting up event listeners on canvas:`, !!this.canvas);
        // console.log(`[SETUP-${this.instanceId}] handleMouseDown method exists:`, typeof this.handleMouseDown);
        
        // Remove existing listeners to prevent duplicates
        if (this.boundMouseDown) {
            this.canvas.removeEventListener('mousedown', this.boundMouseDown);
            // console.log(`[SETUP-${this.instanceId}] Removed existing mousedown listener`);
        }
        
        this.boundMouseDown = (e) => {
            // console.log(`[WRAPPER-${this.instanceId}] mousedown event received!`);
            return this.handleMouseDown(e);
        };
        // console.log(`[SETUP-${this.instanceId}] handleMouseDown wrapped:`, typeof this.boundMouseDown);
        this.canvas.addEventListener('mousedown', this.boundMouseDown);
        
        // Remove and re-add other event listeners to prevent duplicates
        if (this.boundMouseMove) {
            this.canvas.removeEventListener('mousemove', this.boundMouseMove);
        }
        this.boundMouseMove = this.handleMouseMove.bind(this);
        this.canvas.addEventListener('mousemove', this.boundMouseMove);
        
        if (this.boundMouseUp) {
            this.canvas.removeEventListener('mouseup', this.boundMouseUp);
        }
        this.boundMouseUp = this.handleMouseUp.bind(this);
        this.canvas.addEventListener('mouseup', this.boundMouseUp);
        
        if (this.boundClick) {
            this.canvas.removeEventListener('click', this.boundClick);
        }
        this.boundClick = (e) => {
            // console.log(`[EVENT] Click event received on canvas at`, e.clientX, e.clientY);
            // console.log(`[EVENT] Event target:`, e.target);
            return this.handleClick(e);
        };
        this.canvas.addEventListener('click', this.boundClick);
        
        // Fix: Add click handler to canvas-container to forward clicks to canvas
        const canvasContainer = this.canvas.parentElement;
        if (canvasContainer && canvasContainer.classList.contains('canvas-container')) {
            canvasContainer.addEventListener('click', (e) => {
                // If click is on the container itself (not a child element), forward to canvas
                if (e.target === canvasContainer) {
                    // console.log('[CONTAINER-CLICK] Forwarding click from container to canvas');
                    // Create a new click event and dispatch it to the canvas
                    const forwardedEvent = new MouseEvent('click', {
                        bubbles: e.bubbles,
                        cancelable: e.cancelable,
                        clientX: e.clientX,
                        clientY: e.clientY,
                        button: e.button,
                        buttons: e.buttons,
                        relatedTarget: e.relatedTarget
                    });
                    this.canvas.dispatchEvent(forwardedEvent);
                }
            });
        }
        
        // Add debug click listener to document to see what's getting clicked
        document.addEventListener('click', (e) => {
            // console.log(`[DOC-CLICK] Document click on:`, e.target.tagName, e.target.className);
        });
        
        window.addEventListener('resize', () => {
            // Use requestAnimationFrame + setTimeout to ensure DOM has updated
            requestAnimationFrame(() => {
                setTimeout(() => {
                    this.setupCanvas();
                }, 10);
            });
        });
        
        // Also listen for visual viewport changes (for mobile and inspector)
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', () => {
                requestAnimationFrame(() => {
                    setTimeout(() => {
                        this.setupCanvas();
                    }, 10);
                });
            });
        }
        window.addEventListener('keydown', this.handleKeyDown.bind(this));
        this.canvas.addEventListener('wheel', this.handleWheel.bind(this));
        
        // Touch gestures for mobile
        this.canvas.addEventListener('touchstart', this.handleTouchStart.bind(this));
        this.canvas.addEventListener('touchmove', this.handleTouchMove.bind(this));
        this.canvas.addEventListener('touchend', this.handleTouchEnd.bind(this));
        
        // Context menu for components
        this.canvas.addEventListener('contextmenu', this.handleContextMenu.bind(this));
        
        // Recenter button
        if (this.recenterBtn) {
            this.recenterBtn.addEventListener('click', this.recenterCanvas.bind(this));
        }
        
        // Reset zoom button
        const resetZoomBtn = document.getElementById('reset-zoom-btn');
        if (resetZoomBtn) {
            resetZoomBtn.addEventListener('click', this.resetZoom.bind(this));
        }
        
        // Zoom buttons
        const zoomInBtn = document.getElementById('zoom-in-btn');
        const zoomOutBtn = document.getElementById('zoom-out-btn');
        
        if (zoomInBtn) {
            zoomInBtn.addEventListener('click', this.zoomIn.bind(this));
        }
        
        if (zoomOutBtn) {
            zoomOutBtn.addEventListener('click', this.zoomOut.bind(this));
        }
        
        // Nested canvas event listeners
        if (this.closeNestedCanvasBtn) {
            this.closeNestedCanvasBtn.addEventListener('click', this.closeNestedCanvas.bind(this));
        }
        
        // Double-click on main canvas to open nested canvas or edit text
        this.canvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Overlay click to close nested canvas
        if (this.nestedCanvasOverlay) {
            this.nestedCanvasOverlay.addEventListener('click', (e) => {
                if (e.target === this.nestedCanvasOverlay) {
                    this.closeNestedCanvas();
                }
            });
        }
    }
    
    setupToolbar() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        const makeRealBtn = document.getElementById('make-real-btn');
        const clearBtn = document.getElementById('clear-btn');
        const closeModal = document.getElementById('close-modal');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Check if clicking the already active tool
                if (btn.classList.contains('active') && btn.dataset.tool === this.currentTool) {
                    // Deselect the tool and return to pan mode
                    btn.classList.remove('active');
                    this.currentTool = null;
                } else {
                    // Select the new tool
                    toolButtons.forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    this.currentTool = btn.dataset.tool;
                }
                this.updateCanvasCursor();
            });
        });
        
        if (makeRealBtn) {
            makeRealBtn.addEventListener('click', this.makeReal.bind(this));
        }
        if (clearBtn) {
            clearBtn.addEventListener('click', this.clearCanvas.bind(this));
        }
        if (closeModal) {
            closeModal.addEventListener('click', this.closeModal.bind(this));
        }
        
    }
    
    setupFloatingToolbar() {
        const toolbar = document.getElementById('floating-toolbar');
        const dragHandle = document.getElementById('toolbar-drag-handle');
        
        if (!toolbar || !dragHandle) return;
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        // Store initial position from toolbar's actual style values
        this.toolbarPosition = { 
            x: parseInt(toolbar.style.left) || 20, 
            y: parseInt(toolbar.style.top) || 20
        };
        
        
        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            
            const rect = toolbar.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            toolbar.style.transition = 'none';
            document.body.style.userSelect = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const x = e.clientX - dragOffset.x;
            const y = e.clientY - dragOffset.y;
            
            // Constrain to viewport
            const maxX = window.innerWidth - toolbar.offsetWidth;
            const maxY = window.innerHeight - toolbar.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(maxX, x));
            const constrainedY = Math.max(0, Math.min(maxY, y));
            
            toolbar.style.left = constrainedX + 'px';
            toolbar.style.top = constrainedY + 'px';
            
            // Update stored position
            this.toolbarPosition.x = constrainedX;
            this.toolbarPosition.y = constrainedY;
            
            // Emit event for external apps
            this.emit('toolbarMove', { x: constrainedX, y: constrainedY });
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            toolbar.style.transition = 'all 0.2s ease';
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }
    
    // API methods for external apps to control toolbar
    setToolbarPosition(x, y) {
        const toolbar = document.getElementById('floating-toolbar');
        if (!toolbar) return;
        
        // Constrain to viewport
        const maxX = window.innerWidth - toolbar.offsetWidth;
        const maxY = window.innerHeight - toolbar.offsetHeight;
        
        const constrainedX = Math.max(0, Math.min(maxX, x));
        const constrainedY = Math.max(0, Math.min(maxY, y));
        
        // Clear any existing positioning properties to avoid conflicts
        toolbar.style.right = '';
        toolbar.style.bottom = '';
        
        // Set absolute positioning for drag compatibility
        toolbar.style.position = 'absolute';
        toolbar.style.left = constrainedX + 'px';
        toolbar.style.top = constrainedY + 'px';
        
        // Update stored position
        this.toolbarPosition.x = constrainedX;
        this.toolbarPosition.y = constrainedY;
        
        
        // Re-setup drag functionality to ensure it works after position change
        this.ensureToolbarDragReady();
    }
    
    // Ensure drag functionality is ready after external position changes
    ensureToolbarDragReady() {
        const toolbar = document.getElementById('floating-toolbar');
        const dragHandle = document.getElementById('toolbar-drag-handle');
        
        if (!toolbar || !dragHandle) return;
        
        // Ensure toolbar has proper positioning context for dragging
        if (toolbar.style.position !== 'absolute') {
            toolbar.style.position = 'absolute';
        }
        
        // Verify drag handle is still interactive
        dragHandle.style.cursor = 'move';
        dragHandle.style.userSelect = 'none';
        
    }
    
    getToolbarPosition() {
        return { ...this.toolbarPosition };
    }
    
    // Add a React component as a shape that syncs with camera movements
    addReactComponent(domElement, x, y, width, height, options = {}) {
        const shape = {
            type: 'reactComponent',
            id: options.id || Date.now() + Math.random(),
            x: x,
            y: y,
            width: width,
            height: height,
            domElement: domElement,
            interactive: options.interactive !== false, // Default to true
            label: options.label || null,
            strokeColor: options.strokeColor || '#333',
            fillColor: options.fillColor || 'transparent',
            ...options
        };
        
        // Add to active canvas context
        this.activeCanvasContext.shapes.push(shape);
        
        // Register component for canvas-based rendering and interaction
        this.registerCanvasComponent(shape);
        
        // Component will be rendered on next redraw
        
        // Return the shape for external reference
        return shape;
    }
    
    // Add a React component with HTML/React content for HTML rendering
    //
    // COORDINATE SYSTEMS:
    // • 'world' (default): World coordinates - absolute position on the infinite canvas
    //   - (0,0) is the origin of the canvas world
    //   - Coordinates don't change when user pans/zooms
    //   - Use this for placing components at fixed world positions
    //
    // • 'screen': Screen/canvas pixel coordinates
    //   - (0,0) is top-left corner of the visible canvas element
    //   - Coordinates are in canvas pixels (not affected by zoom/pan)
    //   - Use this for UI elements that should appear at specific screen positions
    //
    // • 'center': Viewport center relative coordinates
    //   - (0,0) is the current center of the viewport
    //   - Coordinates are offsets from viewport center in world units
    //   - Use this for placing components relative to what user is currently viewing
    //
    
    // Analyze HTML content to extract sizing information
    analyzeHTMLContent(content) {
        if (!content || typeof content !== 'string') {
            return { width: null, height: null, analysis: 'No content provided' };
        }
        
        const analysis = {
            width: null,
            height: null,
            analysis: 'Content analyzed'
        };
        
        // Extract inline styles from the root element
        const inlineStyleMatch = content.match(/<[^>]+style\s*=\s*["']([^"']*)["']/i);
        if (inlineStyleMatch) {
            const styles = inlineStyleMatch[1];
            
            // Extract width from inline styles
            const widthMatch = styles.match(/width\s*:\s*(\d+)px/i);
            if (widthMatch) {
                analysis.width = parseInt(widthMatch[1], 10);
            }
            
            // Extract height from inline styles
            const heightMatch = styles.match(/height\s*:\s*(\d+)px/i);
            if (heightMatch) {
                analysis.height = parseInt(heightMatch[1], 10);
            }
        }
        
        // Extract CSS styles from <style> tags
        const styleTagMatch = content.match(/<style[^>]*>([\s\S]*?)<\/style>/i);
        if (styleTagMatch) {
            const cssContent = styleTagMatch[1];
            
            // Look for container/wrapper styles that might define dimensions
            const containerRules = cssContent.match(/\.container[^{]*\{([^}]*)\}/i) ||
                                  cssContent.match(/\.wrapper[^{]*\{([^}]*)\}/i) ||
                                  cssContent.match(/body[^{]*\{([^}]*)\}/i);
            
            if (containerRules) {
                const rules = containerRules[1];
                
                // Extract width from CSS rules
                const widthMatch = rules.match(/width\s*:\s*(\d+)px/i);
                if (widthMatch && !analysis.width) {
                    analysis.width = parseInt(widthMatch[1], 10);
                }
                
                // Extract height from CSS rules
                const heightMatch = rules.match(/height\s*:\s*(\d+)px/i);
                if (heightMatch && !analysis.height) {
                    analysis.height = parseInt(heightMatch[1], 10);
                }
            }
        }
        
        // Content-based size estimation when no explicit sizing found
        if (!analysis.width || !analysis.height) {
            // Analyze HTML structure more intelligently
            const textContent = content.replace(/<[^>]*>/g, '').trim();
            const contentLength = textContent.length;
            
            // Count different types of elements for better estimation
            const elementCounts = {
                divs: (content.match(/<div/gi) || []).length,
                paragraphs: (content.match(/<p\b/gi) || []).length,
                headings: (content.match(/<h[1-6]\b/gi) || []).length,
                lists: (content.match(/<[uo]l\b/gi) || []).length,
                listItems: (content.match(/<li\b/gi) || []).length,
                inputs: (content.match(/<input\b/gi) || []).length,
                buttons: (content.match(/<button\b/gi) || []).length,
                images: (content.match(/<img\b/gi) || []).length,
                tables: (content.match(/<table\b/gi) || []).length,
                tableRows: (content.match(/<tr\b/gi) || []).length
            };
            
            // Estimate based on structural analysis rather than hardcoded types
            if (!analysis.width) {
                // Base width on content density and structure
                let baseWidth = Math.min(400, Math.max(250, Math.sqrt(contentLength) * 15));
                
                // Adjust based on horizontal elements
                if (elementCounts.listItems > 3) {
                    // Many list items might be horizontal
                    baseWidth = Math.max(baseWidth, elementCounts.listItems * 60);
                }
                
                if (elementCounts.tables > 0) {
                    // Tables need more width
                    baseWidth = Math.max(baseWidth, 400 + (elementCounts.tableRows * 20));
                }
                
                analysis.width = Math.min(500, baseWidth);
            }
            
            if (!analysis.height) {
                // Base height on vertical stack of elements
                let baseHeight = Math.max(50, elementCounts.paragraphs * 25 + elementCounts.headings * 35);
                
                // Add height for form elements (they stack vertically)
                baseHeight += elementCounts.inputs * 40 + elementCounts.buttons * 45;
                
                // Add height for list items - but be smart about horizontal vs vertical layouts
                if (elementCounts.listItems > 0) {
                    // If many list items, assume some might be horizontal (like navigation)
                    const assumedVerticalItems = elementCounts.listItems > 4 ? Math.ceil(elementCounts.listItems / 4) : elementCounts.listItems;
                    baseHeight += assumedVerticalItems * 30;
                }
                
                // Add height for table rows
                baseHeight += elementCounts.tableRows * 35;
                
                // Add some base padding/margin space
                baseHeight += 20; // Reduced from 40px
                
                analysis.height = Math.min(400, Math.max(50, baseHeight)); // Reduced minimum from 60px
            }
            
            analysis.analysis += ` (estimated from structure: ${contentLength} chars, ${elementCounts.divs} divs, ${elementCounts.paragraphs} paragraphs, ${elementCounts.listItems} list items)`;
        }
        
        return analysis;
    }
    
    addReactComponentWithHTML(x, y, width = null, height = null, content, options = {}) {
        // Handle coordinate system based on options
        let finalX = x;
        let finalY = y;
        
        if (options.coordinateSystem === 'screen') {
            // Convert screen/canvas coordinates to world coordinates
            // Input: (x,y) in canvas pixels from top-left corner of canvas
            // Output: world coordinates at that screen position
            const worldPos = this.canvasToWorld(x, y);
            finalX = worldPos.x;
            finalY = worldPos.y;
        } else if (options.coordinateSystem === 'center') {
            // Position relative to current viewport center (world coordinates)
            // Input: (x,y) as offset from viewport center
            // Output: world coordinates accounting for current camera position
            const camera = this.activeCanvasContext.camera;
            const canvas = this.activeCanvasContext.canvas;
            
            // Get viewport center in world coordinates
            const canvasCenterX = canvas.width / 2;
            const canvasCenterY = canvas.height / 2;
            // console.log(`[COORD-DEBUG] Canvas center pixels: ${canvasCenterX}, ${canvasCenterY}`);
            
            const viewportCenterWorld = this.canvasToWorld(canvasCenterX, canvasCenterY);
            // console.log(`[COORD-DEBUG] canvasToWorld(${canvasCenterX}, ${canvasCenterY}) = (${viewportCenterWorld.x}, ${viewportCenterWorld.y})`);
            
            // console.log(`[COORD-DEBUG] Canvas size: ${canvas.width}x${canvas.height}`);
            // console.log(`[COORD-DEBUG] Canvas center: ${canvas.width/2}, ${canvas.height/2}`);
            // console.log(`[COORD-DEBUG] Viewport center world: ${viewportCenterWorld.x}, ${viewportCenterWorld.y}`);
            // console.log(`[COORD-DEBUG] Camera: x=${camera.x}, y=${camera.y}, zoom=${camera.zoom}`);
            
            // Apply offset and center the component  
            // console.log(`[COORD-DEBUG] Input offset: x=${x}, y=${y}`);
            // console.log(`[COORD-DEBUG] Viewport center world: ${viewportCenterWorld.x}, ${viewportCenterWorld.y}`);
            
            finalX = viewportCenterWorld.x + x;
            finalY = viewportCenterWorld.y + y;
            
            // console.log(`[COORD-DEBUG] Calculation: ${viewportCenterWorld.x} + ${x} = ${finalX}`);
            // console.log(`[COORD-DEBUG] Calculation: ${viewportCenterWorld.y} + ${y} = ${finalY}`);
            // console.log(`[COORD-DEBUG] Final position: ${finalX}, ${finalY}`);
        }
        // Default: use coordinates as-is (world coordinates)
        // Input: (x,y) in world coordinate units
        // Output: same world coordinates
        
        // Analyze HTML content to determine appropriate sizing
        const contentAnalysis = this.analyzeHTMLContent(content);
        
        // Use content-derived sizes or provided dimensions, and cap explicit sizes at defaults
        let finalWidth, finalHeight;
        
        if (width !== null) {
            // Use provided width, capped at default maximum
            finalWidth = Math.min(width, this.options.defaultComponentWidth);
        } else if (contentAnalysis.width) {
            // Use content-derived width - cap at configurable maximum (or no cap if disabled)
            const contentAnalysisMaxWidth = this.options.contentAnalysisMaxWidth;
            if (contentAnalysisMaxWidth === null || contentAnalysisMaxWidth === Infinity) {
                // Caps disabled - use content width without limit
                finalWidth = contentAnalysis.width;
            } else {
                // Apply configurable cap (defaults to defaultComponentWidth if not set)
                const effectiveCap = contentAnalysisMaxWidth || this.options.defaultComponentWidth;
                finalWidth = Math.min(contentAnalysis.width, effectiveCap);
            }
        } else {
            // Use default width
            finalWidth = this.options.defaultComponentWidth;
        }
        
        if (height !== null) {
            // Use provided height, capped at default maximum  
            finalHeight = Math.min(height, this.options.defaultComponentHeight);
        } else if (contentAnalysis.height) {
            // Use content-derived height - cap at configurable maximum (or no cap if disabled)
            const contentAnalysisMaxHeight = this.options.contentAnalysisMaxHeight;
            if (contentAnalysisMaxHeight === null || contentAnalysisMaxHeight === Infinity) {
                // Caps disabled - use content height without limit
                finalHeight = contentAnalysis.height;
            } else {
                // Apply configurable cap (defaults to defaultComponentHeight if not set)
                const effectiveCap = contentAnalysisMaxHeight || this.options.defaultComponentHeight;
                finalHeight = Math.min(contentAnalysis.height, effectiveCap);
            }
        } else {
            // Use default height
            finalHeight = this.options.defaultComponentHeight;
        }
        
        // Store original requested sizes for resize limits (content-derived takes priority)
        const requestedWidth = width !== null ? width : (contentAnalysis.width || null);
        const requestedHeight = height !== null ? height : (contentAnalysis.height || null);
        
        // Only auto-size if width or height was not provided
        const needsAutoSizing = width === null || height === null;
        
        
        const shape = {
            type: 'reactComponent',
            id: options.id || Date.now() + Math.random(),
            x: finalX,
            y: finalY,
            width: finalWidth,
            height: finalHeight,
            pendingContentMeasurement: needsAutoSizing, // Flag to indicate we need to measure content
            requestedWidth: requestedWidth, // Store original requested width for resize limits
            requestedHeight: requestedHeight, // Store original requested height for resize limits
            fillColor: options.fill || options.fillColor || 'transparent',
            strokeColor: options.stroke || options.strokeColor || '#333',
            htmlContent: typeof content === 'string' ? content : null,
            reactContent: typeof content !== 'string' ? content : null,
            ...options
        };
        
        
        // Add to active canvas context
        this.activeCanvasContext.shapes.push(shape);
        
        // Element will be positioned on next redraw
        
        // Apply constraints immediately after measurement completes
        // This ensures initial size respects content bounds even with explicit dimensions
        setTimeout(() => {
            if (shape.overflowInfo) {
                this.applyHTMLComponentConstraints(shape);
                // Redraw will happen automatically
            }
        }, 100);
        
        // Return the shape for external reference
        return shape;
    }
    
    // Helper method to add component at viewport center
    // Uses world coordinates - positions relative to the current viewport center
    addReactComponentAtCenter(width, height, content, options = {}) {
        // Position at viewport center (0, 0 offset from center)
        return this.addReactComponentWithHTML(0, 0, width, height, content, {
            coordinateSystem: 'center',
            ...options
        });
    }
    
    // Helper method to add component at screen coordinates
    // Uses screen/canvas pixel coordinates - useful for UI elements
    addReactComponentAtScreenPos(screenX, screenY, width, height, content, options = {}) {
        return this.addReactComponentWithHTML(screenX, screenY, width, height, content, {
            coordinateSystem: 'screen',
            ...options
        });
    }
    
    // Alias for backward compatibility - addHTMLComponent
    addHTMLComponent(x, y, width, height, content, options = {}) {
        return this.addReactComponentWithHTML(x, y, width, height, content, options);
    }
    
    // Configure content-aware resize settings
    setContentResizeSettings(settings = {}) {
        if (settings.buffer !== undefined) {
            this.options.contentResizeBuffer = Math.max(0, settings.buffer);
        }
        if (settings.maxMultiplier !== undefined) {
            this.options.maxContentMultiplier = Math.max(1, settings.maxMultiplier);
        }
        if (settings.defaultWidth !== undefined) {
            this.options.defaultComponentWidth = Math.max(50, settings.defaultWidth);
        }
        if (settings.defaultHeight !== undefined) {
            this.options.defaultComponentHeight = Math.max(30, settings.defaultHeight);
        }
        if (settings.contentAnalysisMaxWidth !== undefined) {
            // Allow null or Infinity to disable caps, otherwise enforce minimum
            if (settings.contentAnalysisMaxWidth === null || settings.contentAnalysisMaxWidth === Infinity) {
                this.options.contentAnalysisMaxWidth = settings.contentAnalysisMaxWidth;
            } else {
                this.options.contentAnalysisMaxWidth = Math.max(100, settings.contentAnalysisMaxWidth);
            }
        }
        if (settings.contentAnalysisMaxHeight !== undefined) {
            // Allow null or Infinity to disable caps, otherwise enforce minimum
            if (settings.contentAnalysisMaxHeight === null || settings.contentAnalysisMaxHeight === Infinity) {
                this.options.contentAnalysisMaxHeight = settings.contentAnalysisMaxHeight;
            } else {
                this.options.contentAnalysisMaxHeight = Math.max(50, settings.contentAnalysisMaxHeight);
            }
        }
        
        return {
            buffer: this.options.contentResizeBuffer,
            maxMultiplier: this.options.maxContentMultiplier,
            defaultWidth: this.options.defaultComponentWidth,
            defaultHeight: this.options.defaultComponentHeight,
            contentAnalysisMaxWidth: this.options.contentAnalysisMaxWidth || this.options.defaultComponentWidth,
            contentAnalysisMaxHeight: this.options.contentAnalysisMaxHeight || this.options.defaultComponentHeight
        };
    }
    
    // Get current content-aware resize settings
    getContentResizeSettings() {
        return {
            buffer: this.options.contentResizeBuffer,
            maxMultiplier: this.options.maxContentMultiplier,
            defaultWidth: this.options.defaultComponentWidth,
            defaultHeight: this.options.defaultComponentHeight,
            contentAnalysisMaxWidth: this.options.contentAnalysisMaxWidth || this.options.defaultComponentWidth,
            contentAnalysisMaxHeight: this.options.contentAnalysisMaxHeight || this.options.defaultComponentHeight
        };
    }
    
    // Set scrollable container size for HTML component (allows overflow scrolling)
    setComponentScrollableSize(shapeId, width = null, height = null) {
        const shape = this.activeCanvasContext.shapes.find(s => s.id === shapeId);
        if (!shape || shape.type !== 'reactComponent') {
            console.warn(`[SCROLLABLE-SIZE] Shape ${shapeId} not found or not a reactComponent`);
            return false;
        }
        
        // Set the scrollable size configuration
        shape.scrollableSize = { width, height };
        
        // Update the existing HTML element if it exists
        const element = this.htmlComponents.get(shapeId);
        if (element) {
            const contentWrapper = element.querySelector('div');
            if (contentWrapper) {
                // Update the size immediately
                contentWrapper.style.width = width ? `${width}px` : '100%';
                contentWrapper.style.height = height ? `${height}px` : '100%';
                
                // Recheck overflow
                if (contentWrapper._checkContentOverflow) {
                    contentWrapper._checkContentOverflow();
                }
                
                // Update pointer events if in edit mode
                if (contentWrapper._updatePointerEvents) {
                    contentWrapper._updatePointerEvents();
                }
            }
        }
        
        return true;
    }

    // Get overflow information for an HTML component
    getComponentOverflowInfo(shapeId) {
        const shape = this.activeCanvasContext.shapes.find(s => s.id === shapeId);
        if (!shape || shape.type !== 'reactComponent') {
            return null;
        }
        
        return shape.overflowInfo || null;
    }

    // Check if an HTML component has overflow
    hasComponentOverflow(shapeId) {
        const shape = this.activeCanvasContext.shapes.find(s => s.id === shapeId);
        if (!shape || shape.type !== 'reactComponent') {
            return false;
        }
        
        return shape.hasOverflow || false;
    }

    // Set resize constraints for specific shape types or globally
    setResizeConstraints(type, constraints, options = {}) {
        // Validate constraints and provide warnings
        this._validateResizeConstraints(constraints, options);
        
        if (type === 'default' || type === 'global') {
            // Set default constraints for all shapes
            Object.assign(this.resizeConstraints, constraints);
        } else if (this.resizeConstraints[type]) {
            // Set constraints for specific shape type
            Object.assign(this.resizeConstraints[type], constraints);
        } else {
            // Create new constraints for custom shape type
            this.resizeConstraints[type] = constraints;
        }
    }

    // External API: Set global resize constraints with validation and warnings
    setGlobalResizeConstraints(constraints, options = {}) {
        const { suppressWarnings = false } = options;
        
        if (!suppressWarnings) {
            this._warnAboutConstraintChanges(constraints, 'global');
        }
        
        return this.setResizeConstraints('global', constraints, { suppressWarnings });
    }

    // External API: Set constraints for HTML components specifically
    setHTMLComponentConstraints(constraints, options = {}) {
        const { suppressWarnings = false } = options;
        
        if (!suppressWarnings) {
            this._warnAboutConstraintChanges(constraints, 'reactComponent');
        }
        
        return this.setResizeConstraints('reactComponent', constraints, { suppressWarnings });
    }

    // External API: Remove all resize constraints (allow unlimited resizing)
    removeResizeConstraints(type = 'reactComponent', options = {}) {
        const { suppressWarnings = false } = options;
        
        if (!suppressWarnings) {
            console.warn(`⚠️  [RESIZE-CONSTRAINTS] REMOVING RESIZE CONSTRAINTS FOR ${type.toUpperCase()}`);
            console.warn('   This may lead to:');
            console.warn('   • Component distortion and poor user experience');
            console.warn('   • HTML content becoming unreadable when too small');
            console.warn('   • Performance issues with very large components');
            console.warn('   • UI layout problems and content overflow');
            console.warn('   • Accessibility issues for users');
            console.warn('   Consider setting reasonable min/max bounds instead.');
        }
        
        if (type === 'global' || type === 'default') {
            this.resizeConstraints.minWidth = 1;
            this.resizeConstraints.minHeight = 1;
            this.resizeConstraints.maxWidth = 10000;
            this.resizeConstraints.maxHeight = 10000;
        } else if (this.resizeConstraints[type]) {
            this.resizeConstraints[type] = {
                minWidth: 1,
                minHeight: 1,
                maxWidth: 10000,
                maxHeight: 10000
            };
        }
        
        return true;
    }

    // Private method to validate constraints and show warnings
    _validateResizeConstraints(constraints, options = {}) {
        const { suppressWarnings = false } = options;
        
        if (!constraints || typeof constraints !== 'object') return;
        
        // Check for concerning values
        const issues = [];
        
        if (constraints.minWidth !== undefined && constraints.minWidth < 10) {
            issues.push(`minWidth (${constraints.minWidth}) is very small - content may become unreadable`);
        }
        
        if (constraints.minHeight !== undefined && constraints.minHeight < 10) {
            issues.push(`minHeight (${constraints.minHeight}) is very small - content may become unreadable`);
        }
        
        if (constraints.maxWidth !== undefined && constraints.maxWidth > 2000) {
            issues.push(`maxWidth (${constraints.maxWidth}) is very large - may cause performance issues`);
        }
        
        if (constraints.maxHeight !== undefined && constraints.maxHeight > 2000) {
            issues.push(`maxHeight (${constraints.maxHeight}) is very large - may cause performance issues`);
        }
        
        if (constraints.minWidth !== undefined && constraints.maxWidth !== undefined && 
            constraints.minWidth >= constraints.maxWidth) {
            issues.push(`minWidth (${constraints.minWidth}) >= maxWidth (${constraints.maxWidth}) - invalid range`);
        }
        
        if (constraints.minHeight !== undefined && constraints.maxHeight !== undefined && 
            constraints.minHeight >= constraints.maxHeight) {
            issues.push(`minHeight (${constraints.minHeight}) >= maxHeight (${constraints.maxHeight}) - invalid range`);
        }
        
        // Show warnings if issues found and not suppressed
        if (issues.length > 0 && !suppressWarnings) {
            console.warn('⚠️  [RESIZE-CONSTRAINTS] Potential issues with constraint values:');
            issues.forEach(issue => console.warn(`   • ${issue}`));
        }
    }

    // Private method to warn about constraint changes
    _warnAboutConstraintChanges(constraints, type) {
        const hasMinChanges = constraints.minWidth !== undefined || constraints.minHeight !== undefined;
        const hasMaxChanges = constraints.maxWidth !== undefined || constraints.maxHeight !== undefined;
        
        if (hasMinChanges || hasMaxChanges) {
            console.info(`ℹ️  [RESIZE-CONSTRAINTS] Updating ${type} resize constraints:`);
            
            if (hasMinChanges) {
                console.info('   • Changing minimum size limits');
                if ((constraints.minWidth !== undefined && constraints.minWidth < 20) ||
                    (constraints.minHeight !== undefined && constraints.minHeight < 20)) {
                    console.warn('   ⚠️  Very small minimum sizes may cause content distortion');
                }
            }
            
            if (hasMaxChanges) {
                console.info('   • Changing maximum size limits');
                if ((constraints.maxWidth !== undefined && constraints.maxWidth > 1500) ||
                    (constraints.maxHeight !== undefined && constraints.maxHeight > 1000)) {
                    console.warn('   ⚠️  Very large maximum sizes may impact performance');
                }
            }
            
            console.info('   • Use { suppressWarnings: true } to hide these messages');
        }
    }

    // Get current resize constraints for a shape type or specific shape
    getResizeConstraints(type, shape = null) {
        const specificConstraints = this.resizeConstraints[type] || {};
        const defaultConstraints = {
            minWidth: this.resizeConstraints.minWidth,
            minHeight: this.resizeConstraints.minHeight,
            maxWidth: this.resizeConstraints.maxWidth,
            maxHeight: this.resizeConstraints.maxHeight
        };
        
        // If a specific shape is provided and has individual constraints, use those
        if (shape && shape.resizeConstraints) {
            return { ...defaultConstraints, ...specificConstraints, ...shape.resizeConstraints };
        }
        
        return { ...defaultConstraints, ...specificConstraints };
    }

    // Set resize constraints for a specific component
    setComponentResizeConstraints(componentId, constraints) {
        const shape = this.activeCanvasContext.shapes.find(s => s.id === componentId);
        if (shape) {
            shape.resizeConstraints = { ...shape.resizeConstraints, ...constraints };
            return true;
        }
        console.warn(`[RESIZE-CONSTRAINTS] Component ${componentId} not found`);
        return false;
    }

    // External API: Get current resize constraints for inspection
    getCurrentResizeConstraints(type = 'reactComponent') {
        if (type === 'global' || type === 'default') {
            return {
                minWidth: this.resizeConstraints.minWidth,
                minHeight: this.resizeConstraints.minHeight,
                maxWidth: this.resizeConstraints.maxWidth,
                maxHeight: this.resizeConstraints.maxHeight
            };
        }
        
        const constraints = this.getResizeConstraints(type);
        return { ...constraints };
    }

    // Get HTML component data for persistence
    getHTMLComponentData(componentId) {
        const shape = this.activeCanvasContext.shapes.find(s => s.id === componentId && s.type === 'reactComponent');
        if (!shape) {
            return null;
        }

        return {
            id: shape.id,
            x: shape.x,
            y: shape.y,
            width: shape.width,
            height: shape.height,
            htmlContent: shape.htmlContent,
            reactContent: shape.reactContent,
            domElement: shape.domElement ? {
                tagName: shape.domElement.tagName,
                innerHTML: shape.domElement.innerHTML,
                className: shape.domElement.className,
                attributes: Array.from(shape.domElement.attributes || []).map(attr => ({
                    name: attr.name,
                    value: attr.value
                }))
            } : null,
            coordinateSystem: shape.coordinateSystem || 'world',
            fill: shape.fill,
            strokeColor: shape.strokeColor,
            scrollableSize: shape.scrollableSize,
            hasOverflow: shape.hasOverflow,
            overflowInfo: shape.overflowInfo,
            customProperties: shape.customProperties || {}
        };
    }

    // Get all HTML components data
    getAllHTMLComponentsData() {
        const reactShapes = this.activeCanvasContext.shapes.filter(s => s.type === 'reactComponent');
        return reactShapes.map(shape => this.getHTMLComponentData(shape.id)).filter(data => data !== null);
    }

    // Create HTML component from data
    createHTMLComponentFromData(componentData) {
        if (!componentData || !componentData.id) {
            console.warn('[CREATE-FROM-DATA] Invalid component data provided');
            return null;
        }

        let content = null;
        if (componentData.htmlContent) {
            content = componentData.htmlContent;
        } else if (componentData.reactContent) {
            content = componentData.reactContent;
        } else if (componentData.domElement) {
            // Recreate DOM element from serialized data
            const element = document.createElement(componentData.domElement.tagName);
            element.innerHTML = componentData.domElement.innerHTML;
            element.className = componentData.domElement.className;
            
            if (componentData.domElement.attributes) {
                componentData.domElement.attributes.forEach(attr => {
                    element.setAttribute(attr.name, attr.value);
                });
            }
            content = element;
        }

        if (!content) {
            console.warn('[CREATE-FROM-DATA] No valid content found in component data');
            return null;
        }

        const options = {
            id: componentData.id,
            coordinateSystem: componentData.coordinateSystem || 'world',
            fill: componentData.fill,
            strokeColor: componentData.strokeColor,
            customProperties: componentData.customProperties || {}
        };

        const shape = this.addReactComponentWithHTML(
            componentData.x, 
            componentData.y, 
            componentData.width, 
            componentData.height, 
            content, 
            options
        );

        // Restore additional properties
        if (componentData.scrollableSize) {
            shape.scrollableSize = componentData.scrollableSize;
            this.setComponentScrollableSize(componentData.id, 
                componentData.scrollableSize.width, 
                componentData.scrollableSize.height);
        }

        return shape;
    }

    // Set persistence filter function for custom state control
    setPersistenceFilter(filterFn) {
        this.persistenceFilter = filterFn;
    }

    // Export complete canvas state including HTML components
    exportState() {
        const context = this.activeCanvasContext;
        
        // Apply persistence filter if set
        const applyFilter = (item, type) => {
            if (this.persistenceFilter) {
                return this.persistenceFilter(item, type);
            }
            return true;
        };

        const state = {
            version: '1.3',
            timestamp: Date.now(),
            camera: {
                x: context.camera.x,
                y: context.camera.y,
                zoom: context.camera.zoom
            },
            canvas: {
                width: context.canvas.width,
                height: context.canvas.height
            },
            paths: context.paths.filter(path => applyFilter(path, 'path')),
            shapes: context.shapes.filter(shape => applyFilter(shape, 'shape')),
            texts: context.texts.filter(text => applyFilter(text, 'text')),
            nestedCanvases: context.nestedCanvases.filter(nested => applyFilter(nested, 'nestedCanvas')),
            htmlComponents: this.getAllHTMLComponentsData().filter(component => applyFilter(component, 'htmlComponent')),
            selectedElements: context.selectedElements.filter(element => applyFilter(element, 'selectedElement')),
            currentTool: this.currentTool,
            editingComponentId: this.editingComponentId
        };

        return state;
    }

    // Import canvas state including HTML components
    importState(state) {
        if (!state || !state.version) {
            console.warn('[IMPORT-STATE] Invalid state data provided');
            return false;
        }

        try {
            // Clear current content first
            this.clearAll();

            const context = this.activeCanvasContext;

            // Restore camera
            if (state.camera) {
                context.camera.x = state.camera.x || 0;
                context.camera.y = state.camera.y || 0;
                context.camera.zoom = state.camera.zoom || 1;
            }

            // Restore canvas dimensions
            if (state.canvas) {
                context.canvas.width = state.canvas.width || context.canvas.width;
                context.canvas.height = state.canvas.height || context.canvas.height;
            }

            // Restore paths
            if (state.paths) {
                context.paths = [...state.paths];
            }

            // Restore shapes (excluding reactComponents - they'll be restored as HTML components)
            if (state.shapes) {
                context.shapes = state.shapes.filter(shape => shape.type !== 'reactComponent');
            }

            // Restore texts
            if (state.texts) {
                context.texts = [...state.texts];
            }

            // Restore nested canvases
            if (state.nestedCanvases) {
                context.nestedCanvases = [...state.nestedCanvases];
            }

            // Restore HTML components
            if (state.htmlComponents) {
                state.htmlComponents.forEach(componentData => {
                    this.createHTMLComponentFromData(componentData);
                });
            }

            // Restore selected elements (validate they still exist)
            if (state.selectedElements) {
                context.selectedElements = state.selectedElements.filter(element => {
                    if (element.type === 'shape') {
                        return element.index < context.shapes.length;
                    } else if (element.type === 'text') {
                        return element.index < context.texts.length;
                    } else if (element.type === 'path') {
                        return element.index < context.paths.length;
                    }
                    return false;
                });
            }

            // Restore tool state
            if (state.currentTool) {
                this.setTool(state.currentTool);
            }

            // Restore editing component
            if (state.editingComponentId) {
                const shape = context.shapes.find(s => s.id === state.editingComponentId);
                if (shape && shape.type === 'reactComponent') {
                    this.enterComponentEditMode(shape);
                }
            }

            // Force redraw
            this.redrawCanvas();

            return true;

        } catch (error) {
            console.error('[IMPORT-STATE] Failed to import state:', error);
            return false;
        }
    }
    
    // Remove a React component shape
    removeReactComponent(shapeOrId) {
        // Handle both shape object and ID parameters
        let shape;
        if (typeof shapeOrId === 'string' || typeof shapeOrId === 'number') {
            // Find shape by ID
            shape = this.activeCanvasContext.shapes.find(s => s.id === shapeOrId);
            if (!shape) {
                console.warn(`[REMOVE] No reactComponent found with ID: ${shapeOrId}`);
                return false;
            }
        } else {
            // Direct shape object
            shape = shapeOrId;
        }
        
        const shapes = this.activeCanvasContext.shapes;
        const index = shapes.indexOf(shape);
        if (index > -1) {
            shapes.splice(index, 1);
            // console.log('[REMOVE] Shape removed from shapes array');
            
            // Clean up canvas renderer
            if (shape.canvasRenderer) {
                // Stop observing DOM changes
                if (shape.canvasRenderer.observer) {
                    shape.canvasRenderer.observer.disconnect();
                }
                
                // Remove from canvas components registry
                if (this.canvasComponents) {
                    for (const [id, registeredShape] of this.canvasComponents) {
                        if (registeredShape === shape) {
                            this.canvasComponents.delete(id);
                            break;
                        }
                    }
                }
            }
            
            // Remove DOM element from document
            if (shape.domElement && shape.domElement.parentElement) {
                shape.domElement.parentElement.removeChild(shape.domElement);
            }
            
            // Clean up from HTML rendering layer
            if (this.htmlRenderingLayer) {
                const htmlElement = this.htmlRenderingLayer.querySelector(`[data-component-id="${shape.id}"]`);
                if (htmlElement) {
                    htmlElement.remove();
                }
            }
            
            this.redrawCanvas();
            return true;
        }
        return false;
    }
    
    // Clear all React components from both layers
    clearAllReactComponents() {
        const shapes = this.activeCanvasContext.shapes;
        let removedCount = 0;
        
        // FIRST: Remove DOM elements from htmlComponents Map before clearing internal state
        const htmlComponentEntries = Array.from(this.htmlComponents.entries());
        
        for (const [shapeId, domElement] of htmlComponentEntries) {
            if (domElement && domElement.remove) {
                domElement.remove(); // Remove from DOM
            }
        }
        
        // Clear the htmlComponents Map
        this.htmlComponents.clear();
        
        // SECOND: Clean up reactComponent shapes from shapes array
        const reactShapes = shapes.filter(shape => shape.type === 'reactComponent');
        
        for (const shape of reactShapes) {
            // Clean up canvas renderer
            if (shape.canvasRenderer) {
                // Stop observing DOM changes
                if (shape.canvasRenderer.observer) {
                    shape.canvasRenderer.observer.disconnect();
                }
                
                // Remove from canvas components registry
                if (this.canvasComponents) {
                    for (const [id, registeredShape] of this.canvasComponents) {
                        if (registeredShape === shape) {
                            this.canvasComponents.delete(id);
                            break;
                        }
                    }
                }
            }
            
            // Remove DOM element from document (backup cleanup)
            if (shape.domElement && shape.domElement.parentElement) {
                shape.domElement.parentElement.removeChild(shape.domElement);
            }
            
            // Clean up from HTML rendering layer
            if (this.htmlRenderingLayer) {
                const htmlElement = this.htmlRenderingLayer.querySelector(`[data-component-id="${shape.id}"]`);
                if (htmlElement) {
                    htmlElement.remove();
                }
            }
            
            removedCount++;
        }
        
        // Remove all reactComponent shapes from the shapes array
        this.activeCanvasContext.shapes = shapes.filter(shape => shape.type !== 'reactComponent');
        
        
        // Force visual clearing to ensure canvas matches empty state
        this.forceVisualClear();
        
        return removedCount;
    }
    
    // Force complete visual clearing of canvas to match empty state
    forceVisualClear() {
        
        // Get all available canvas contexts for comprehensive clearing
        const contexts = [
            { name: 'active', ctx: this.activeCanvasContext?.ctx, canvas: this.activeCanvasContext?.canvas },
            { name: 'main', ctx: this.mainCanvasContext?.ctx, canvas: this.mainCanvasContext?.canvas },
            { name: 'nested', ctx: this.nestedCanvasContext?.ctx, canvas: this.nestedCanvasContext?.canvas },
            { name: 'root', ctx: this.canvas?.getContext('2d'), canvas: this.canvas }
        ].filter(c => c.ctx && c.canvas);
        
        
        // Clear all canvas pixels multiple times to ensure complete clearing
        for (let pass = 0; pass < 3; pass++) {
            contexts.forEach(({ name, ctx, canvas }) => {
                try {
                    // Clear entire canvas area
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    
                    // Reset canvas state
                    ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transforms
                    ctx.globalAlpha = 1; // Reset alpha
                    ctx.globalCompositeOperation = 'source-over'; // Reset composite
                    
                    if (pass === 0) {
                    }
                } catch (error) {
                    console.warn(`[FORCE-CLEAR] Error clearing ${name} canvas:`, error);
                }
            });
        }
        
        // Clear any cached visual state
        if (this.clearVisualCache && typeof this.clearVisualCache === 'function') {
            this.clearVisualCache();
        }
        
        // Reset camera transform on active canvas
        if (this.activeCanvasContext?.ctx && this.activeCanvasContext?.camera) {
            const { ctx, camera } = this.activeCanvasContext;
            ctx.setTransform(camera.zoom, 0, 0, camera.zoom, -camera.x * camera.zoom, -camera.y * camera.zoom);
        }
        
        // Force complete redraw from current (empty) state
        this.redrawCanvas();
        
    }
    
    // React Component Registration System
    
    // Register an external React component for tracking
    registerExternalComponent(componentId, componentRef, metadata = {}) {
        const componentInfo = {
            id: componentId,
            ref: componentRef,
            metadata: {
                type: metadata.type || 'unknown',
                layer: metadata.layer || 0,
                syncWithCamera: metadata.syncWithCamera !== false, // Default true
                syncWithSelection: metadata.syncWithSelection !== false, // Default true
                ...metadata
            },
            registeredAt: Date.now()
        };
        
        this.externalComponents.set(componentId, componentInfo);
        
        // Notify component mount callbacks
        this.componentCallbacks.onMount.forEach(callback => {
            try {
                callback(componentInfo);
            } catch (error) {
                console.error('Error in component mount callback:', error);
            }
        });
        
        // Emit event for external listeners
        this.emit('componentRegistered', componentInfo);
        
        return componentInfo;
    }
    
    // Unregister an external React component
    unregisterExternalComponent(componentId) {
        const componentInfo = this.externalComponents.get(componentId);
        if (!componentInfo) {
            console.warn(`Component ${componentId} not found for unregistration`);
            return false;
        }
        
        // Notify component unmount callbacks
        this.componentCallbacks.onUnmount.forEach(callback => {
            try {
                callback(componentInfo);
            } catch (error) {
                console.error('Error in component unmount callback:', error);
            }
        });
        
        // Emit event for external listeners
        this.emit('componentUnregistered', componentInfo);
        
        this.externalComponents.delete(componentId);
        return true;
    }
    
    // Update component metadata
    updateComponentMetadata(componentId, metadata) {
        const componentInfo = this.externalComponents.get(componentId);
        if (!componentInfo) {
            console.warn(`Component ${componentId} not found for update`);
            return false;
        }
        
        const oldMetadata = { ...componentInfo.metadata };
        componentInfo.metadata = { ...componentInfo.metadata, ...metadata };
        
        // Notify component update callbacks
        this.componentCallbacks.onUpdate.forEach(callback => {
            try {
                callback(componentInfo, oldMetadata);
            } catch (error) {
                console.error('Error in component update callback:', error);
            }
        });
        
        // Emit event for external listeners
        this.emit('componentUpdated', { component: componentInfo, oldMetadata });
        
        return true;
    }
    
    // Get all registered components
    getRegisteredComponents() {
        return new Map(this.externalComponents);
    }
    
    // Get a specific registered component
    getRegisteredComponent(componentId) {
        return this.externalComponents.get(componentId);
    }
    
    // Bulk notify components based on criteria
    notifyComponents(criteria, eventData) {
        this.externalComponents.forEach((component, id) => {
            // Check if component matches criteria
            let shouldNotify = true;
            
            if (criteria.type && component.metadata.type !== criteria.type) {
                shouldNotify = false;
            }
            
            if (criteria.syncWithCamera !== undefined && component.metadata.syncWithCamera !== criteria.syncWithCamera) {
                shouldNotify = false;
            }
            
            if (criteria.syncWithSelection !== undefined && component.metadata.syncWithSelection !== criteria.syncWithSelection) {
                shouldNotify = false;
            }
            
            if (criteria.layer !== undefined && component.metadata.layer !== criteria.layer) {
                shouldNotify = false;
            }
            
            if (shouldNotify && component.ref && typeof component.ref.handleCanvasEvent === 'function') {
                try {
                    component.ref.handleCanvasEvent(eventData);
                } catch (error) {
                    console.error(`Error notifying component ${id}:`, error);
                }
            }
        });
    }
    
    // Add component lifecycle callbacks
    onComponentMount(callback) {
        this.componentCallbacks.onMount.push(callback);
        return () => {
            const index = this.componentCallbacks.onMount.indexOf(callback);
            if (index > -1) this.componentCallbacks.onMount.splice(index, 1);
        };
    }
    
    onComponentUnmount(callback) {
        this.componentCallbacks.onUnmount.push(callback);
        return () => {
            const index = this.componentCallbacks.onUnmount.indexOf(callback);
            if (index > -1) this.componentCallbacks.onUnmount.splice(index, 1);
        };
    }
    
    onComponentUpdate(callback) {
        this.componentCallbacks.onUpdate.push(callback);
        return () => {
            const index = this.componentCallbacks.onUpdate.indexOf(callback);
            if (index > -1) this.componentCallbacks.onUpdate.splice(index, 1);
        };
    }
    
    // API method for external apps to clear everything (canvas + HTML)
    clear() {
        this.clearCanvas();
    }

    // Granular clear methods for different content types
    clearShapes() {
        const context = this.activeCanvasContext;
        
        // Clear only canvas shapes (excluding HTML components)
        context.paths.length = 0;
        context.shapes = context.shapes.filter(shape => shape.type === 'reactComponent');
        context.texts.length = 0;
        context.nestedCanvases.length = 0;
        
        // Clear shape-related selections
        context.selectedElements = context.selectedElements.filter(element => 
            element.type !== 'shape' && element.type !== 'text' && element.type !== 'path'
        );
        
        // Hide selection boxes for shapes
        this.hideSelectionBox();
        
        this.redrawCanvas();
    }

    clearHTMLComponents() {
        const context = this.activeCanvasContext;
        
        // First, clean up HTML elements and renderers for all reactComponent shapes
        const htmlShapes = context.shapes.filter(s => s.type === 'reactComponent');
        htmlShapes.forEach(shape => {
            // Clean up canvas renderer
            if (shape.canvasRenderer) {
                // Stop observing DOM changes
                if (shape.canvasRenderer.observer) {
                    shape.canvasRenderer.observer.disconnect();
                }
                
                // Unmount the component
                if (shape.canvasRenderer.unmount) {
                    shape.canvasRenderer.unmount();
                }
            }
            
            // Remove HTML element
            const element = this.htmlComponents.get(shape.id);
            if (element) {
                element.remove();
                this.htmlComponents.delete(shape.id);
            }
        });
        
        // Then filter out all reactComponent shapes from the shapes array
        context.shapes = context.shapes.filter(s => s.type !== 'reactComponent');
        
        // Clear HTML-related selections
        context.selectedElements = context.selectedElements.filter(element => {
            if (element.type === 'shape') {
                const shape = context.shapes[element.index];
                return shape && shape.type !== 'reactComponent';
            }
            return true;
        });
        
        // Exit component edit mode if active
        if (this.editingComponentId) {
            this.exitComponentEditMode();
        }
        
        this.redrawCanvas();
    }

    clearAll() {
        // Clear everything - equivalent to clear() but more explicit
        this.clearCanvas();
    }
    
    // API method to properly dispose of the canvas instance
    dispose() {
        // Clear all content first
        this.clear();
        
        // Remove event listeners
        if (this.boundMouseDown) {
            this.canvas.removeEventListener('mousedown', this.boundMouseDown);
        }
        if (this.boundMouseMove) {
            document.removeEventListener('mousemove', this.boundMouseMove);
        }
        if (this.boundMouseUp) {
            document.removeEventListener('mouseup', this.boundMouseUp);
        }
        if (this.boundClick) {
            this.canvas.removeEventListener('click', this.boundClick);
        }
        
        // Remove HTML rendering layer
        if (this.htmlRenderingLayer && this.htmlRenderingLayer.parentElement) {
            this.htmlRenderingLayer.parentElement.removeChild(this.htmlRenderingLayer);
        }
        
        // Clear component callbacks
        this.componentCallbacks = { onUpdate: [], onRemove: [] };
        
        // Reset instance
        this.canvas = null;
        this.ctx = null;
        this.htmlRenderingLayer = null;
    }
    
    hideToolbar() {
        const toolbar = document.getElementById('floating-toolbar');
        if (toolbar) toolbar.style.display = 'none';
    }
    
    showToolbar() {
        const toolbar = document.getElementById('floating-toolbar');
        if (toolbar) toolbar.style.display = 'flex';
    }
    
    // Dynamic Toolbar Configuration API
    addTool(toolConfig, position = -1) {
        // toolConfig: { id, tool, icon, title, active?, customHandler? }
        if (position === -1) {
            this.toolbarConfig.tools.push(toolConfig);
        } else {
            this.toolbarConfig.tools.splice(position, 0, toolConfig);
        }
        this.rebuildToolbar();
        this.emit('toolbarChange', { type: 'toolAdded', tool: toolConfig });
    }
    
    removeTool(toolId) {
        const index = this.toolbarConfig.tools.findIndex(t => t.id === toolId);
        if (index > -1) {
            const removed = this.toolbarConfig.tools.splice(index, 1)[0];
            this.rebuildToolbar();
            this.emit('toolbarChange', { type: 'toolRemoved', tool: removed });
            return removed;
        }
        return null;
    }
    
    addAction(actionConfig, position = -1) {
        // actionConfig: { id, action, icon, title, class?, customHandler? }
        if (position === -1) {
            this.toolbarConfig.actions.push(actionConfig);
        } else {
            this.toolbarConfig.actions.splice(position, 0, actionConfig);
        }
        this.rebuildToolbar();
        this.emit('toolbarChange', { type: 'actionAdded', action: actionConfig });
    }
    
    removeAction(actionId) {
        const index = this.toolbarConfig.actions.findIndex(a => a.id === actionId);
        if (index > -1) {
            const removed = this.toolbarConfig.actions.splice(index, 1)[0];
            this.rebuildToolbar();
            this.emit('toolbarChange', { type: 'actionRemoved', action: removed });
            return removed;
        }
        return null;
    }
    
    setToolbarConfig(config) {
        // Complete toolbar reconfiguration
        this.toolbarConfig = { ...config };
        this.rebuildToolbar();
        this.emit('toolbarChange', { type: 'configChanged', config: this.toolbarConfig });
    }
    
    getToolbarConfig() {
        return JSON.parse(JSON.stringify(this.toolbarConfig));
    }
    
    rebuildToolbar() {
        const toolbar = document.getElementById('floating-toolbar');
        if (!toolbar) return;
        
        // Find the toolbar content container
        const toolbarContent = toolbar.querySelector('.toolbar-content');
        if (!toolbarContent) return;
        
        // Clear existing content
        toolbarContent.innerHTML = '';
        
        // Build tools section
        if (this.toolbarConfig.tools.length > 0) {
            const toolsSection = document.createElement('div');
            toolsSection.className = 'toolbar-section';
            
            this.toolbarConfig.tools.forEach(tool => {
                const button = document.createElement('button');
                button.id = tool.id;
                button.className = `tool-btn ${tool.active ? 'active' : ''}`;
                button.setAttribute('data-tool', tool.tool);
                button.title = tool.title;
                
                button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: block; fill: currentColor;">
                    <path d="${tool.icon}" fill="currentColor" stroke="none" vector-effect="non-scaling-stroke"${tool.transform ? ` transform="${tool.transform}"` : ''}/>
                </svg>`;
                
                // Add event listener
                if (tool.customHandler) {
                    button.addEventListener('click', tool.customHandler);
                } else {
                    button.addEventListener('click', (e) => {
                        // Default tool selection logic
                        if (tool.tool) {
                            const toolButtons = document.querySelectorAll('.tool-btn');
                            toolButtons.forEach(b => b.classList.remove('active'));
                            button.classList.add('active');
                            this.currentTool = tool.tool;
                            this.updateCanvasCursor();
                        }
                    });
                }
                
                toolsSection.appendChild(button);
            });
            
            toolbarContent.appendChild(toolsSection);
        }
        
        // Add divider if we have both tools and actions
        if (this.toolbarConfig.tools.length > 0 && this.toolbarConfig.actions.length > 0) {
            const divider = document.createElement('div');
            divider.className = 'toolbar-divider';
            toolbarContent.appendChild(divider);
        }
        
        // Build actions section
        if (this.toolbarConfig.actions.length > 0) {
            const actionsSection = document.createElement('div');
            actionsSection.className = 'toolbar-section';
            
            this.toolbarConfig.actions.forEach(action => {
                const button = document.createElement('button');
                button.id = action.id;
                button.className = action.class || 'tool-btn';
                button.title = action.title;
                
                // Robust SVG rendering for outer app environments
                button.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style="display: block; fill: currentColor;">
                    <path d="${action.icon}" fill="currentColor" stroke="none" vector-effect="non-scaling-stroke"/>
                </svg>`;
                
                
                // Add event listener
                if (action.customHandler) {
                    button.addEventListener('click', action.customHandler);
                } else if (action.action && this[action.action]) {
                    button.addEventListener('click', this[action.action].bind(this));
                }
                
                actionsSection.appendChild(button);
            });
            
            toolbarContent.appendChild(actionsSection);
        }
    }
    
    
    updateCanvasCursor() {
        const container = document.querySelector('.canvas-container');
        if (!container) return;
        container.className = 'canvas-container';
        
        // Only add tool cursor if a tool is selected
        if (this.currentTool) {
            container.classList.add(`${this.currentTool}-cursor`);
        }
        
        // console.log('updateCanvasCursor - currentTool:', this.currentTool, 'classes will be:', container.className);
        
        // Add state-specific classes
        if (this.isDrawing) {
            container.classList.add('drawing');
        }
        if (this.isSelecting) {
            container.classList.add('selecting');
        }
        if (this.isDragging) {
            container.classList.add('grabbing');
        }
        if (this.isResizing) {
            container.classList.add('resizing');
            // Also add the specific resize handle type during active resizing
            if (this.resizeHandle) {
                container.classList.add(`resize-${this.resizeHandle}`);
            }
        }
        
        // Check for resize handle hover first
        if (this.hoveredResizeHandle) {
            container.classList.add('resize-handle-hover');
            // Add specific resize cursor based on handle type
            container.classList.add(`resize-${this.hoveredResizeHandle}`);
        } else if (this.hoveredElement) {
            container.classList.add('hovering');
            // Show can-grab cursor when hovering over any draggable element
            if (!this.isDragging && !this.isResizing) {
                container.classList.add('can-grab');
            }
        }
        
        // console.log('updateCanvasCursor final - currentTool:', this.currentTool, 'final classes:', container.className, 'isDragging:', this.isDragging);
    }
    
    // Unified getters that work with active context
    get paths() { return this.activeCanvasContext.paths; }
    get shapes() { return this.activeCanvasContext.shapes; }
    get texts() { return this.activeCanvasContext.texts; }
    get nestedCanvases() { return this.activeCanvasContext.nestedCanvases; }
    get selectedElements() { return this.activeCanvasContext.selectedElements; }
    set selectedElements(value) { this.activeCanvasContext.selectedElements = value; }
    get hoveredElement() { return this.activeCanvasContext.hoveredElement; }
    set hoveredElement(value) { this.activeCanvasContext.hoveredElement = value; }
    get currentPath() { return this.activeCanvasContext.currentPath; }
    set currentPath(value) { this.activeCanvasContext.currentPath = value; }
    get camera() { return this.activeCanvasContext.camera; }
    
    getMousePos(e) {
        const canvas = this.activeCanvasContext.canvas;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Transform canvas coordinates to world coordinates
        // Note: canvasX/Y are already in CSS pixels, no DPR scaling needed here
        return this.canvasToWorld(canvasX, canvasY);
    }
    
    canvasToWorld(canvasX, canvasY, canvasContext = this.activeCanvasContext) {
        // Convert screen coordinates to world coordinates with Canvas2D transforms
        const camera = canvasContext.camera;
        const canvas = canvasContext.canvas;
        
        // console.log(`[CANVAS-TO-WORLD] Input: (${canvasX}, ${canvasY}) Camera: x=${camera.x}, y=${camera.y}, zoom=${camera.zoom}`);
        
        // Inverse transform: account for centering, then zoom, then camera offset
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Step 1: Remove canvas centering
        const centeredX = canvasX - centerX;
        const centeredY = canvasY - centerY;
        // console.log(`[CANVAS-TO-WORLD] After centering: (${centeredX}, ${centeredY})`);
        
        // Step 2: Remove zoom scaling
        const unzoomedX = centeredX / camera.zoom;
        const unzoomedY = centeredY / camera.zoom;
        // console.log(`[CANVAS-TO-WORLD] After unzoom: (${unzoomedX.toFixed(1)}, ${unzoomedY.toFixed(1)})`);
        
        // Step 3: Remove camera translation (inverse of canvas transform)
        const worldX = unzoomedX - camera.x;
        const worldY = unzoomedY - camera.y;
        // console.log(`[CANVAS-TO-WORLD] Final world: (${worldX.toFixed(1)}, ${worldY.toFixed(1)})`);
        
        return { x: worldX, y: worldY };
    }
    
    worldToCanvas(worldX, worldY, canvasContext = this.activeCanvasContext) {
        // Convert world coordinates to screen coordinates with Canvas2D transforms
        const camera = canvasContext.camera;
        const canvas = canvasContext.canvas;
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Apply transform: remove camera translation, then zoom, then canvas centering
        const translatedX = worldX - camera.x;
        const translatedY = worldY - camera.y;
        
        const zoomedX = translatedX * camera.zoom;
        const zoomedY = translatedY * camera.zoom;
        
        const screenX = zoomedX + centerX;
        const screenY = zoomedY + centerY;
        
        return { x: screenX, y: screenY };
    }
    
    // Enhanced coordinate conversion utilities for React integration
    
    // Batch convert multiple world coordinates to canvas coordinates
    worldToBatch(worldPoints) {
        return worldPoints.map(point => this.worldToCanvas(point.x, point.y));
    }
    
    // Batch convert multiple canvas coordinates to world coordinates  
    canvasToBatch(canvasPoints) {
        return canvasPoints.map(point => this.canvasToWorld(point.x, point.y));
    }
    
    // Get the current viewport bounds in world coordinates
    getViewportBounds() {
        const canvas = this.activeCanvasContext.canvas;
        const topLeft = this.canvasToWorld(0, 0);
        const bottomRight = this.canvasToWorld(canvas.width, canvas.height);
        
        return {
            left: topLeft.x,
            top: topLeft.y,
            right: bottomRight.x,
            bottom: bottomRight.y,
            width: bottomRight.x - topLeft.x,
            height: bottomRight.y - topLeft.y,
            center: {
                x: (topLeft.x + bottomRight.x) / 2,
                y: (topLeft.y + bottomRight.y) / 2
            }
        };
    }
    
    // Get viewport info including zoom and camera state
    getViewportInfo() {
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        const bounds = this.getViewportBounds();
        
        return {
            camera: { ...camera },
            bounds,
            canvasSize: { width: canvas.width, height: canvas.height },
            pixelsPerWorldUnit: camera.zoom
        };
    }
    
    // Check if a world coordinate is visible in the current viewport
    isPointInViewport(worldX, worldY, margin = 0) {
        const bounds = this.getViewportBounds();
        return worldX >= bounds.left - margin && 
               worldX <= bounds.right + margin && 
               worldY >= bounds.top - margin && 
               worldY <= bounds.bottom + margin;
    }
    
    // Check if a world rectangle intersects with the viewport
    isRectInViewport(worldX, worldY, worldWidth, worldHeight, margin = 0) {
        const bounds = this.getViewportBounds();
        return !(worldX + worldWidth < bounds.left - margin || 
                worldX > bounds.right + margin || 
                worldY + worldHeight < bounds.top - margin || 
                worldY > bounds.bottom + margin);
    }
    
    applyCSSTransform(canvasContext) {
        // Expose camera transformation as CSS custom properties for external components
        // Don't apply CSS transform to canvas - we'll handle transforms in drawing code
        const { camera, canvas } = canvasContext;
        
        
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const translateX = centerX + (camera.x * camera.zoom);
        const translateY = centerY + (camera.y * camera.zoom);
        
        const transform = `translate(${translateX}px, ${translateY}px) scale(${camera.zoom})`;
        
        // Set CSS custom properties for external components to read
        canvas.style.setProperty('--camera-x', camera.x);
        canvas.style.setProperty('--camera-y', camera.y);
        canvas.style.setProperty('--camera-zoom', camera.zoom);
        canvas.style.setProperty('--camera-transform', transform);
        
        // Expose on window for component access
        window.canvasCSSTransform = {
            x: camera.x,
            y: camera.y, 
            zoom: camera.zoom,
            transform: transform
        };
        
        // Update additional canvas layer CSS custom properties
        if (this.additionalCanvasLayers) {
            this.additionalCanvasLayers.forEach((layer) => {
                layer.canvas.style.setProperty('--camera-x', camera.x);
                layer.canvas.style.setProperty('--camera-y', camera.y);
                layer.canvas.style.setProperty('--camera-zoom', camera.zoom);
                layer.canvas.style.setProperty('--camera-transform', transform);
            });
        }
    }
    
    // Camera Constraints API
    setCameraConstraints(constraints) {
        // Set camera constraints: { bounds: {x, y, width, height}, behavior: 'free'|'contain'|'inside' }
        this.cameraConstraints = constraints;
        
        // Apply constraints to current camera position
        if (constraints) {
            this.applyCameraConstraints();
        }
        
        this.redrawCanvas();
    }
    
    getCameraConstraints() {
        return this.cameraConstraints;
    }
    
    clearCameraConstraints() {
        this.cameraConstraints = null;
        this.redrawCanvas();
    }
    
    applyCameraConstraints() {
        if (!this.cameraConstraints) return;
        
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        const { bounds, behavior = 'contain' } = this.cameraConstraints;
        
        if (!bounds) return;
        
        const viewportWidth = canvas.width / camera.zoom;
        const viewportHeight = canvas.height / camera.zoom;
        
        if (behavior === 'contain') {
            // Camera must stay within bounds - viewport cannot go outside bounds
            const minCameraX = bounds.x + viewportWidth / 2;
            const maxCameraX = bounds.x + bounds.width - viewportWidth / 2;
            const minCameraY = bounds.y + viewportHeight / 2;
            const maxCameraY = bounds.y + bounds.height - viewportHeight / 2;
            
            camera.x = Math.max(minCameraX, Math.min(maxCameraX, camera.x));
            camera.y = Math.max(minCameraY, Math.min(maxCameraY, camera.y));
            
        } else if (behavior === 'inside') {
            // Camera center must stay within bounds
            camera.x = Math.max(bounds.x, Math.min(bounds.x + bounds.width, camera.x));
            camera.y = Math.max(bounds.y, Math.min(bounds.y + bounds.height, camera.y));
            
        } else if (behavior === 'free') {
            // No constraints applied
            return;
        }
    }
    
    handleMouseDown(e) {
        // console.log(`[HANDLEmousedown] START - Event received`, e);
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        
        // Log React components state with context info
        const reactShapes = this.shapes.filter(s => s.type === 'reactComponent');
        const allContextShapes = {
            main: this.mainCanvasContext.shapes.filter(s => s.type === 'reactComponent').length,
            active: this.activeCanvasContext.shapes.filter(s => s.type === 'reactComponent').length,
            isMain: this.activeCanvasContext === this.mainCanvasContext
        };
        // console.log(`[HANDLEmousedown] React components: ${reactShapes.length}`, reactShapes);
        // console.log(`[HANDLEMOUSEDOWN] All contexts:`, allContextShapes);
        // console.log(`[HANDLEMOUSEDOWN] Component details:`, reactShapes.map(s => ({ 
        //     id: s.id, 
        //     hasRenderer: !!s.canvasRenderer,
        //     hasElement: !!s.domElement,
        //     inDOM: !!(s.domElement && s.domElement.parentElement)
        // })));
        
        // Check for panning (middle mouse button)
        if (e.button === 1) {
            this.isPanning = true;
            this.panState.isPanning = true;
            this.panState.startCamera = { ...this.activeCanvasContext.camera };
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            this.emit('beforePan', { camera: this.panState.startCamera });
            return;
        }
        
        // If no tool is selected, act like select tool for object interaction or pan for empty areas
        if (!this.currentTool) {
            // First try to detect element at click position
            const clickedElement = this.getElementAtPoint(pos.x, pos.y);
            // console.log('Pan mode click - hoveredElement:', this.hoveredElement, 'clickedElement:', clickedElement);
            
            // Use hoveredElement if available, otherwise use clickedElement
            const targetElement = this.hoveredElement || clickedElement;
            
            if (targetElement) {
                // Check if the clicked element is already selected - if so, start dragging
                const isAlreadySelected = this.selectedElements.some(sel => {
                    if (targetElement.type === 'shape') {
                        return sel.type === 'shape' && sel.index === targetElement.index;
                    } else if (targetElement.type === 'text') {
                        return sel.type === 'text' && sel.index === targetElement.index;
                    } else if (targetElement.type === 'path') {
                        return sel.type === 'path' && sel.index === targetElement.index;
                    } else if (targetElement.type === 'nested-canvas') {
                        return sel.type === 'nested-canvas' && sel.index === targetElement.index;
                    }
                    return false;
                });
                
                if (isAlreadySelected) {
                    // Start dragging the selected elements (all of them)
                    this.isDragging = true;
                    this.dragOffset.x = pos.x;
                    this.dragOffset.y = pos.y;
                } else {
                    // Select the clicked element and start dragging (single element)
                    this.selectedElements = [targetElement];
                    this.isDragging = true;
                    this.dragOffset.x = pos.x;
                    this.dragOffset.y = pos.y;
                }
                this.updateCanvasCursor();
                return;
            }
            
            // Check if clicking on resize handle
            const resizeHandle = this.getResizeHandleForContext(pos.x, pos.y, this.activeCanvasContext);
            if (resizeHandle) {
                this.isResizing = true;
                this.resizeHandle = resizeHandle;
                
                // Calculate the actual handle center position to avoid jump
                const handleCenter = this.getResizeHandleCenter(resizeHandle, this.activeCanvasContext);
                if (handleCenter) {
                    // For rectangles/HTML components - store offset from handle center
                    this.resizeOffset = {
                        x: pos.x - handleCenter.x,
                        y: pos.y - handleCenter.y
                    };
                } else {
                    // For circles - store initial radius to maintain consistent offset
                    if (this.activeCanvasContext.selectedElements.length === 1) {
                        const element = this.activeCanvasContext.selectedElements[0];
                        if (element.type === 'shape') {
                            const shape = this.activeCanvasContext.shapes[element.index];
                            if (shape.type === 'circle') {
                                // For circles, store the initial radius and click position
                                const centerX = shape.x;
                                const centerY = shape.y;
                                const initialDistance = Math.sqrt(
                                    Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
                                );
                                this.initialCircleRadius = shape.radius;
                                this.initialCircleClickDistance = initialDistance;
                                this.resizeOffset = { x: 0, y: 0 };
                            } else {
                                this.resizeOffset = { x: 0, y: 0 };
                            }
                        }
                    } else {
                        this.resizeOffset = { x: 0, y: 0 };
                    }
                }
                
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                this.dragStartX = pos.x;
                this.dragStartY = pos.y;
                
                // Store original shape state for line-middle dragging
                if (this.activeCanvasContext.selectedElements.length === 1 && this.activeCanvasContext.selectedElements[0].type === 'shape') {
                    const shape = this.activeCanvasContext.shapes[this.activeCanvasContext.selectedElements[0].index];
                    if ((shape.type === 'line' || shape.type === 'arrow') && resizeHandle === 'line-middle') {
                        this.originalShapeState = {
                            x1: shape.x1,
                            y1: shape.y1,
                            x2: shape.x2,
                            y2: shape.y2
                        };
                    }
                }
                
                this.updateCanvasCursor();
                return;
            }
            
            // If we didn't click on a hovered element or resize handle, check if we clicked on any element
            const fallbackElement = this.getElementAtPoint(pos.x, pos.y);
            if (fallbackElement) {
                // Select and start dragging the clicked element
                // console.log('Clicked on element (not hovered):', fallbackElement);
                this.selectedElements = [fallbackElement];
                this.isDragging = true;
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                this.updateCanvasCursor();
                return;
            } else {
                // Clicking on empty area - deselect and start panning
                this.selectedElements = [];
                this.isPanning = true;
                this.panState.isPanning = true;
                this.panState.startCamera = { ...this.activeCanvasContext.camera };
                this.dragOffset.x = e.clientX;
                this.dragOffset.y = e.clientY;
                this.emit('beforePan', { camera: this.panState.startCamera });
                this.redrawCanvas();
                return;
            }
        }
        
        // Check if clicking on an element (prioritize component interaction over drawing)
        if (this.hoveredElement) {
            // Check if the clicked element is already selected - if so, start dragging
            const isAlreadySelected = this.selectedElements.some(sel => {
                if (this.hoveredElement.type === 'shape') {
                    return sel.type === 'shape' && sel.index === this.hoveredElement.index;
                } else if (this.hoveredElement.type === 'text') {
                    return sel.type === 'text' && sel.index === this.hoveredElement.index;
                } else if (this.hoveredElement.type === 'path') {
                    return sel.type === 'path' && sel.index === this.hoveredElement.index;
                } else if (this.hoveredElement.type === 'nested-canvas') {
                    return sel.type === 'nested-canvas' && sel.index === this.hoveredElement.index;
                }
                return false;
            });
            
            // If not already selected, select the element first
            if (!isAlreadySelected) {
                this.selectedElements = [this.hoveredElement];
                // Redraw will happen in drag loop
            }
            
            // Start dragging immediately regardless of current tool
            this.isDragging = true;
            this.dragOffset.x = pos.x;
            this.dragOffset.y = pos.y;
            this.updateCanvasCursor();
            return;
        }
        
        // Clear any previous preview coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        if (this.currentTool === 'pen') {
            this.isDrawing = true;
            this.currentPath = [{ x: pos.x, y: pos.y }];
        } else if (this.currentTool === 'select') {
            // Check if clicking on a resize handle
            const resizeHandle = this.getResizeHandleForContext(pos.x, pos.y, this.activeCanvasContext);
            if (resizeHandle) {
                this.isResizing = true;
                this.resizeHandle = resizeHandle;
                
                // Calculate the actual handle center position to avoid jump
                const handleCenter = this.getResizeHandleCenter(resizeHandle, this.activeCanvasContext);
                if (handleCenter) {
                    // Store the offset between click and handle center
                    this.resizeOffset = {
                        x: pos.x - handleCenter.x,
                        y: pos.y - handleCenter.y
                    };
                } else {
                    this.resizeOffset = { x: 0, y: 0 };
                }
                
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                this.dragStartX = pos.x;
                this.dragStartY = pos.y;
                
                // Store original shape state for line-middle dragging
                if (this.activeCanvasContext.selectedElements.length === 1 && this.activeCanvasContext.selectedElements[0].type === 'shape') {
                    const shape = this.activeCanvasContext.shapes[this.activeCanvasContext.selectedElements[0].index];
                    if ((shape.type === 'line' || shape.type === 'arrow') && resizeHandle === 'line-middle') {
                        this.originalShapeState = {
                            x1: shape.x1,
                            y1: shape.y1,
                            x2: shape.x2,
                            y2: shape.y2
                        };
                    }
                }
                return; // Important: return here to prevent drag mode from starting
            }
            // Check if clicking on any element (hovered or selected)
            else {
                const clickedElement = this.getElementAtPoint(pos.x, pos.y);
                
                if (clickedElement) {
                    // Check if the clicked element is already selected
                    const isAlreadySelected = this.selectedElements.some(sel => 
                        sel.type === clickedElement.type && sel.index === clickedElement.index);
                    
                    
                    if (isAlreadySelected) {
                        // Start dragging if already selected
                        this.isDragging = true;
                        this.dragOffset.x = pos.x;
                        this.dragOffset.y = pos.y;
                    } else {
                        // Select the clicked element
                        this.selectedElements = [clickedElement];
                        this.redrawCanvas();
                    }
                } else {
                    // If clicking on empty space, clear selection and start box selection
                    this.selectedElements = [];
                    this.isSelecting = true;
                    this.showSelectionBox(pos.x, pos.y, 0, 0);
                    this.redrawCanvas();
                }
            }
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'nested-canvas' || this.currentTool === 'text' || this.currentTool === 'line' || this.currentTool === 'arrow') {
            // Initialize drawing state for shape tools
            this.isDrawing = true;
        }
        
        this.updateCanvasCursor();
    }
    
    handleMouseMove(e) {
        // Handle panning
        if (this.isPanning) {
            const camera = this.activeCanvasContext.camera;
            const deltaX = e.clientX - this.dragOffset.x;
            const deltaY = e.clientY - this.dragOffset.y;
            
            camera.x += deltaX / camera.zoom;
            camera.y += deltaY / camera.zoom;
            
            // Apply camera constraints
            this.applyCameraConstraints();
            
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            
            // Emit during-pan event (throttled)
            this.emitThrottled('duringPan', { 
                camera: { x: camera.x, y: camera.y, zoom: camera.zoom },
                delta: { x: deltaX, y: deltaY }
            });
            
            // Force immediate DOM updates for smooth React component movement
            this.updateReactComponentPositions();
            this.redrawCanvas();
            this.updateRecenterButton();
            return;
        }
        
        const pos = this.getMousePos(e);
        
        // Handle pan mode interactions (when no tool is selected)
        if (!this.currentTool) {
            if (this.isDragging) {
                // Handle dragging elements
                const deltaX = pos.x - this.dragOffset.x;
                const deltaY = pos.y - this.dragOffset.y;
                
                this.selectedElements.forEach(element => {
                    if (element.type === 'shape') {
                        const shape = this.shapes[element.index];
                        shape.x += deltaX;
                        shape.y += deltaY;
                    } else if (element.type === 'text') {
                        const text = this.texts[element.index];
                        text.x += deltaX;
                        text.y += deltaY;
                    } else if (element.type === 'path') {
                        const path = this.paths[element.index];
                        path.forEach(point => {
                            point.x += deltaX;
                            point.y += deltaY;
                        });
                    } else if (element.type === 'nested-canvas') {
                        const nestedCanvas = this.nestedCanvases[element.index];
                        nestedCanvas.x += deltaX;
                        nestedCanvas.y += deltaY;
                    }
                });
                
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                this.redrawCanvas();
                return;
            } else if (this.isResizing && this.resizeHandle) {
                // Handle resizing elements
                this.performResizeForContext(pos.x, pos.y, this.activeCanvasContext);
                this.redrawCanvas();
                return;
            } else if (this.isSelecting) {
                // Handle selection box
                this.updateSelectionBox(this.startX, this.startY, pos.x, pos.y);
                this.updatePreviewSelection(this.startX, this.startY, pos.x, pos.y);
                this.redrawCanvas();
                return;
            } else {
                // Handle hover detection when not in any interaction mode
                this.handleHover(pos);
                return;
            }
        }
        
        // Always handle hover detection for select tool when not in active operations
        if (this.currentTool === 'select' && !this.isDrawing && !this.isDragging && !this.isResizing && !this.isSelecting) {
            this.handleHover(pos);
        }
        
        if (!this.isDrawing && !this.isDragging && !this.isResizing && !this.isSelecting) {
            return;
        }
        
        if (this.currentTool === 'pen' && !this.isDragging && !this.isResizing) {
            this.currentPath.push({ x: pos.x, y: pos.y });
            // Draw using active canvas context (works for both main and nested)
            this.redrawCanvas();
        } else if (this.currentTool === 'select' && this.isSelecting) {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.showSelectionBox(this.startX, this.startY, width, height);
            
            // Update preview selection to show which elements would be selected
            this.activeCanvasContext.previewSelectedElements = this.getElementsInArea(
                this.startX, this.startY, pos.x, pos.y, this.activeCanvasContext
            );
            this.redrawCanvas();
        } else if (this.isResizing) {
            // Resizing selected element
            this.performResizeForContext(pos.x, pos.y, this.activeCanvasContext);
            this.redrawCanvas();
        } else if (this.isDragging) {
            // Dragging selected elements
            const deltaX = pos.x - this.dragOffset.x;
            const deltaY = pos.y - this.dragOffset.y;
            
            this.selectedElements.forEach(element => {
                if (element.type === 'shape') {
                    const shape = this.shapes[element.index];
                    if (shape.type === 'line' || shape.type === 'arrow') {
                        // For lines and arrows, move both endpoints
                        shape.x1 += deltaX;
                        shape.y1 += deltaY;
                        shape.x2 += deltaX;
                        shape.y2 += deltaY;
                    } else {
                        shape.x += deltaX;
                        shape.y += deltaY;
                    }
                } else if (element.type === 'text') {
                    const text = this.texts[element.index];
                    text.x += deltaX;
                    text.y += deltaY;
                } else if (element.type === 'path') {
                    const path = this.paths[element.index];
                    path.forEach(point => {
                        point.x += deltaX;
                        point.y += deltaY;
                    });
                } else if (element.type === 'nested-canvas') {
                    const nestedCanvas = this.nestedCanvases[element.index];
                    nestedCanvas.x += deltaX;
                    nestedCanvas.y += deltaY;
                }
            });
            
            this.dragOffset.x = pos.x;
            this.dragOffset.y = pos.y;
            this.redrawCanvas();
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'nested-canvas' || this.currentTool === 'line' || this.currentTool === 'arrow') {
            // Store preview coordinates for redrawCanvas to use
            this.previewStartX = this.startX;
            this.previewStartY = this.startY;
            this.previewEndX = pos.x;
            this.previewEndY = pos.y;
            this.redrawCanvas();
        } else {
            // Handle hover detection when not in any active state (for drawing tools when just hovering)
            this.handleHover(pos);
        }
    }
    
    handleMouseUp(e) {
        
        // Don't prevent default to allow click events
        // e.preventDefault(); // Removed this if present
        
        // Stop panning
        if (this.isPanning) {
            this.isPanning = false;
            this.panState.isPanning = false;
            this.emit('afterPan', { 
                camera: { ...this.activeCanvasContext.camera },
                startCamera: this.panState.startCamera
            });
            return;
        }
        
        // Handle pan mode interactions (when no tool is selected)
        if (!this.currentTool) {
            const pos = this.getMousePos(e);
            
            if (this.isResizing) {
                // HTML components are already updated in real-time during resize
                
                this.isResizing = false;
                this.resizeHandle = null;
                this.resizeOffset = null;
                this.initialCircleRadius = null;
                this.initialCircleClickDistance = null;
                this.updateCanvasCursor();
                this.redrawCanvas();
                return;
            } else if (this.isDragging) {
                // console.log('Mouse up - stopping drag');
                this.isDragging = false;
                this.updateCanvasCursor();
                this.redrawCanvas();
                return;
            } else if (this.isSelecting) {
                this.isSelecting = false;
                this.hideSelectionBox();
                // Clear preview selection before finalizing the actual selection
                this.activeCanvasContext.previewSelectedElements = [];
                this.selectElementsInArea(this.startX, this.startY, pos.x, pos.y);
                this.justFinishedSelection = true; // Flag to prevent click handler from clearing selection
                this.updateCanvasCursor();
                this.redrawCanvas();
                return;
            } else {
                // Simple click without dragging/selecting - check if clicking empty area to deselect
                const clickedElement = this.getElementAtPoint(pos.x, pos.y);
                if (!clickedElement && this.selectedElements.length > 0) {
                    this.selectedElements = [];
                    this.redrawCanvas();
                }
            }
            return;
        }
        
        const pos = this.getMousePos(e);
        
        // Handle select tool separately as it doesn't use isDrawing
        if (this.currentTool === 'select') {
            if (this.isResizing) {
                // console.log('[RESIZE-END] Ending resize, selected elements:', this.selectedElements.length);
                
                // HTML components are already updated in real-time during resize
                
                this.isResizing = false;
                this.resizeHandle = null;
                this.resizeOffset = null;
                this.initialCircleRadius = null;
                this.initialCircleClickDistance = null;
                this.justFinishedResize = true; // Flag to prevent immediate click deselection
                this.updateCanvasCursor();
                // Keep component selected and redraw to show resize handles
                // console.log('[RESIZE-END] About to redraw with selected elements:', this.selectedElements.length);
                this.redrawCanvas();
                // console.log('[RESIZE-END] Redraw completed, selected elements:', this.selectedElements.length);
            } else if (this.isDragging) {
                // console.log('Select tool - stopping drag');
                this.isDragging = false;
                // Keep selection active after drag - don't clear
                this.updateCanvasCursor();
                this.redrawCanvas();
                return;
            } else if (this.isSelecting) {
                this.isSelecting = false;
                this.hideSelectionBox();
                // Clear preview selection before finalizing the actual selection
                this.activeCanvasContext.previewSelectedElements = [];
                
                // Check if this was a small selection (likely just a click)
                const selectionSize = Math.abs(pos.x - this.startX) + Math.abs(pos.y - this.startY);
                const isSmallSelection = selectionSize < 5; // 5 pixel threshold
                
                if (isSmallSelection) {
                    // For small selections, check if clicking on empty space to deselect
                    const clickedElement = this.getElementAtPoint(pos.x, pos.y);
                    if (!clickedElement) {
                        this.selectedElements = [];
                        this.redrawCanvas();
                        this.updateCanvasCursor();
                        return;
                    }
                }
                
                this.selectElementsInArea(this.startX, this.startY, pos.x, pos.y);
                this.justFinishedSelection = true; // Flag to prevent click handler from clearing selection
                this.redrawCanvas();
            }
            
            this.updateCanvasCursor();
            return;
        }
        
        // Handle dragging with drawing tools (before the isDrawing check)
        if (this.isDragging && (this.currentTool === 'pen' || this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'nested-canvas' || this.currentTool === 'text' || this.currentTool === 'line' || this.currentTool === 'arrow')) {
            this.isDragging = false;
            this.updateCanvasCursor();
            return;
        }
        
        if (!this.isDrawing) return;
        
        this.isDrawing = false;
        
        if (this.currentTool === 'pen' && !this.isDragging && !this.isResizing) {
            this.paths.push([...this.currentPath]);
            this.currentPath = [];
            
            // Auto-switch to select mode after drawing
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            this.updateCanvasCursor();
        } else if (this.currentTool === 'rectangle') {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.shapes.push({
                type: 'rectangle',
                x: this.startX,
                y: this.startY,
                width,
                height
            });
            // Clear preview coordinates
            this.previewStartX = undefined;
            this.previewStartY = undefined;
            this.previewEndX = undefined;
            this.previewEndY = undefined;
            
            // Auto-switch to select mode after drawing
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'circle') {
            // Calculate circle that fits in the bounding box from start to end
            const centerX = (this.startX + pos.x) / 2;
            const centerY = (this.startY + pos.y) / 2;
            const radius = Math.sqrt(
                Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2)
            ) / 2;
            this.shapes.push({
                type: 'circle',
                x: centerX,
                y: centerY,
                radius
            });
            // Clear preview coordinates
            this.previewStartX = undefined;
            this.previewStartY = undefined;
            this.previewEndX = undefined;
            this.previewEndY = undefined;
            
            // Auto-switch to select mode after drawing
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'line') {
            this.shapes.push({
                type: 'line',
                x1: this.startX,
                y1: this.startY,
                x2: pos.x,
                y2: pos.y,
                strokeColor: '#333333',
                lineWidth: 2
            });
            // Clear preview coordinates
            this.previewStartX = undefined;
            this.previewStartY = undefined;
            this.previewEndX = undefined;
            this.previewEndY = undefined;
            
            // Auto-switch to select mode after drawing
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'arrow') {
            this.shapes.push({
                type: 'arrow',
                x1: this.startX,
                y1: this.startY,
                x2: pos.x,
                y2: pos.y,
                strokeColor: '#333333',
                lineWidth: 2,
                arrowSize: 10
            });
            // Clear preview coordinates
            this.previewStartX = undefined;
            this.previewStartY = undefined;
            this.previewEndX = undefined;
            this.previewEndY = undefined;
            
            // Auto-switch to select mode after drawing
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'nested-canvas') {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            const nestedCanvasId = 'nested_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
            
            const nestedCanvasShape = {
                type: 'nested-canvas',
                id: nestedCanvasId,
                x: this.startX,
                y: this.startY,
                width,
                height
            };
            
            this.nestedCanvases.push(nestedCanvasShape);
            
            // Initialize empty data for this nested canvas
            this.nestedCanvasData.set(nestedCanvasId, {
                paths: [],
                shapes: [],
                texts: [],
                camera: { x: 0, y: 0, zoom: 1 }
            });
            
            // Clear preview coordinates
            this.previewStartX = undefined;
            this.previewStartY = undefined;
            this.previewEndX = undefined;
            this.previewEndY = undefined;
            
            // Auto-switch to select mode after drawing
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        }
        
        this.updateCanvasCursor();
    }
    
    handleClick(e) {
        const pos = this.getMousePos(e);
        
        // console.log(`[CLICK] handleClick called at (${pos.x}, ${pos.y}) - editMode: ${this.editingComponentId || 'none'}`);
        
        // Prevent click handling immediately after resize to avoid deselection
        if (this.justFinishedResize) {
            // console.log(`[CLICK] Ignoring click after resize completion`);
            this.justFinishedResize = false;
            return;
        }
        
        // Prevent click handling immediately after drag selection to avoid deselection
        if (this.justFinishedSelection) {
            this.justFinishedSelection = false;
            return;
        }
        
        // Check if clicking on a React component first (for any tool)
        // console.log(`[CLICK] Checking React component click at (${pos.x}, ${pos.y})`);
        if (this.handleReactComponentClick(pos)) {
            // console.log(`[CLICK] React component handled the click`);
            return; // Event was handled by React component
        }
        // console.log(`[CLICK] No React component handled the click`);
        
        if (this.currentTool === 'text') {
            // Create a new text box
            const newTextBox = {
                text: '',
                x: pos.x,
                y: pos.y,
                width: 200,
                height: 40,
                fontSize: 16,
                fontFamily: 'Arial',
                color: '#333',
                isEditing: true,
                id: Date.now() // Unique ID for the text box
            };
            
            this.texts.push(newTextBox);
            
            // Auto-switch to select mode after creating text
            this.currentTool = 'select';
            this.selectedElements = [];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            // Create and show text input for immediate editing
            this.createTextInput(newTextBox, this.texts.length - 1);
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'select' || !this.currentTool) {
            // Handle selection for select tool or no tool selected
            const clickedElement = this.getElementAtPoint(pos.x, pos.y);
            
            // console.log(`[CLICK] Current tool: ${this.currentTool}, getElementAtPoint returned:`, clickedElement);
            
            if (clickedElement) {
                // Select the clicked element
                this.selectedElements = [clickedElement];
                // console.log(`[CLICK] Selected element:`, clickedElement);
            } else {
                // If clicking on empty space, deselect all
                this.selectedElements = [];
                // console.log(`[CLICK] Deselected all - no element at click position`);
            }
            
            this.redrawCanvas();
        }
    }
    
    // Handle clicks on canvas-rendered React components
    handleReactComponentClick(worldPos) {
        // pos is already in world coordinates from getMousePos()
        // console.log(`[REACT-CLICK] Testing click at world (${worldPos.x.toFixed(1)}, ${worldPos.y.toFixed(1)})`);
        
        // Check all React components in shapes array
        const reactShapes = this.activeCanvasContext.shapes.filter(s => s.type === 'reactComponent');
        // console.log(`[REACT-CLICK] Found ${reactShapes.length} React components to test`);
        
        for (const shape of reactShapes) {
            // console.log(`[REACT-CLICK] Testing shape ${shape.id} at (${shape.x.toFixed(1)}, ${shape.y.toFixed(1)}) size ${shape.width}x${shape.height}`);
            
            // Test if click is within component bounds
            const isInBounds = worldPos.x >= shape.x && 
                              worldPos.x <= shape.x + shape.width &&
                              worldPos.y >= shape.y && 
                              worldPos.y <= shape.y + shape.height;
            
            // console.log(`[REACT-CLICK] Click in bounds: ${isInBounds}`);
            
            if (isInBounds) {
                // console.log(`[REACT-CLICK] Component ${shape.id} clicked! Selecting...`);
                
                // Select the component
                this.activeCanvasContext.selectedElements = [{ type: 'shape', index: this.activeCanvasContext.shapes.indexOf(shape) }];
                
                // Check if we're in edit mode for this component
                if (this.editingComponentId === shape.id) {
                    // console.log(`[REACT-CLICK] Component ${shape.id} is in edit mode - allowing HTML interaction`);
                    return false; // Allow HTML element to handle the click
                } else {
                    // console.log(`[REACT-CLICK] Component ${shape.id} selected for dragging/manipulation`);
                    // Selection will be shown on next redraw
                    return true; // We handled the click for selection
                }
            }
        }
        
        // console.log(`[REACT-CLICK] No React component at click position`);
        return false; // No component handled the event
    }
    
    createTextInput(textBox, textIndex) {
        // Remove any existing text input
        this.removeTextInput();
        
        // Convert world coordinates to screen coordinates
        const screenPos = this.worldToCanvas(textBox.x, textBox.y);
        
        // Get the canvas position relative to the viewport
        const canvas = this.activeCanvasContext.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        
        // Create text input element
        const textInput = document.createElement('textarea');
        textInput.id = 'text-input';
        textInput.value = textBox.text;
        textInput.style.position = 'absolute';
        textInput.style.left = (canvasRect.left + screenPos.x) + 'px';
        textInput.style.top = (canvasRect.top + screenPos.y) + 'px';
        textInput.style.width = (textBox.width * this.activeCanvasContext.camera.zoom) + 'px';
        textInput.style.height = (textBox.height * this.activeCanvasContext.camera.zoom) + 'px';
        textInput.style.fontSize = (textBox.fontSize * this.activeCanvasContext.camera.zoom) + 'px';
        textInput.style.fontFamily = textBox.fontFamily;
        textInput.style.color = textBox.color;
        textInput.style.backgroundColor = 'rgba(255, 255, 255, 0.9)';
        textInput.style.border = '2px solid #3b82f6';
        textInput.style.borderRadius = '4px';
        textInput.style.padding = '4px';
        textInput.style.resize = 'none';
        textInput.style.outline = 'none';
        textInput.style.zIndex = '1000';
        textInput.style.overflow = 'hidden';
        
        // Add to document body instead of canvas container for absolute positioning
        document.body.appendChild(textInput);
        
        // Focus and select all text
        textInput.focus();
        textInput.select();
        
        // Store reference
        this.currentTextInput = textInput;
        this.currentTextIndex = textIndex;
        
        // Handle text input events
        textInput.addEventListener('blur', () => this.finishTextEditing());
        textInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.finishTextEditing();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                this.finishTextEditing();
            }
        });
        
        // Auto-resize textarea based on content
        textInput.addEventListener('input', () => {
            textInput.style.height = 'auto';
            textInput.style.height = textInput.scrollHeight + 'px';
            
            // Update text box height in world coordinates
            const newHeight = textInput.scrollHeight / this.activeCanvasContext.camera.zoom;
            this.texts[textIndex].height = Math.max(newHeight, 20);
        });
    }
    
    removeTextInput() {
        if (this.currentTextInput) {
            // Safety check: only remove if element is still connected to DOM
            if (this.currentTextInput.isConnected) {
                this.currentTextInput.remove();
            }
            this.currentTextInput = null;
            this.currentTextIndex = -1;
        }
    }
    
    finishTextEditing() {
        if (this.currentTextInput && this.currentTextIndex >= 0) {
            // Update the text content
            const text = this.currentTextInput.value.trim();
            
            if (text) {
                this.texts[this.currentTextIndex].text = text;
                this.texts[this.currentTextIndex].isEditing = false;
            } else {
                // Remove empty text boxes
                this.texts.splice(this.currentTextIndex, 1);
                this.selectedElements = [];
            }
            
            // Remove the input
            this.removeTextInput();
            
            // Redraw canvas
            this.redrawCanvas();
        }
    }
    
    handleKeyDown(e) {
        // Close nested canvas with ESC key
        if (e.key === 'Escape' && this.isNestedCanvasOpen) {
            e.preventDefault();
            this.closeNestedCanvas();
            return;
        }
        
        // Delete selected elements with Delete or Backspace key
        if ((e.key === 'Delete' || e.key === 'Backspace') && this.selectedElements.length > 0) {
            e.preventDefault();
            this.deleteSelectedElements();
        }
        
        // Use Cmd key on Mac, Ctrl key on PC
        const isModifierPressed = navigator.platform.includes('Mac') ? e.metaKey : e.ctrlKey;
        
        // Copy selected elements with Cmd+C (Mac) or Ctrl+C (PC)
        if (isModifierPressed && e.key === 'c' && this.selectedElements.length > 0) {
            e.preventDefault();
            this.copySelectedElements();
        }
        
        // Cut selected elements with Cmd+X (Mac) or Ctrl+X (PC)
        if (isModifierPressed && e.key === 'x' && this.selectedElements.length > 0) {
            e.preventDefault();
            this.cutSelectedElements();
        }
        
        // Paste elements with Cmd+V (Mac) or Ctrl+V (PC)
        if (isModifierPressed && e.key === 'v' && this.clipboard.length > 0) {
            e.preventDefault();
            this.pasteElements();
        }
        
        // Zoom controls
        if (isModifierPressed && e.key === '=' || e.key === '+') {
            e.preventDefault();
            this.zoomIn();
        }
        
        if (isModifierPressed && e.key === '-') {
            e.preventDefault();
            this.zoomOut();
        }
        
        if (isModifierPressed && e.key === '0') {
            e.preventDefault();
            this.resetZoom();
        }
        
        // Layer management shortcuts
        if (isModifierPressed && e.key === ']' && this.selectedElements.length > 0) {
            e.preventDefault();
            let needsRedraw = false;
            this.selectedElements.forEach(element => {
                if (this.bringToFront(element)) {
                    needsRedraw = true;
                }
            });
            if (needsRedraw) {
                this.redrawCanvas();
            }
        }
        
        if (isModifierPressed && e.key === '[' && this.selectedElements.length > 0) {
            e.preventDefault();
            let needsRedraw = false;
            this.selectedElements.forEach(element => {
                if (this.sendToBack(element)) {
                    needsRedraw = true;
                }
            });
            if (needsRedraw) {
                this.redrawCanvas();
            }
        }
        
        // Duplicate shortcut
        if (isModifierPressed && e.key === 'd' && this.selectedElements.length > 0) {
            e.preventDefault();
            this.selectedElements.forEach(element => {
                this.duplicateElement(element);
            });
            this.redrawCanvas();
        }
    }
    
    handleWheel(e) {
        e.preventDefault();
        
        const canvas = this.activeCanvasContext.canvas;
        const rect = canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Detect pinch-to-zoom vs scroll
        // On trackpad: ctrlKey is true for pinch-to-zoom
        // On trackpad: ctrlKey is false for two-finger scroll
        if (e.ctrlKey || e.metaKey) {
            // Pinch-to-zoom
            const camera = this.activeCanvasContext.camera;
            const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
            const oldZoom = camera.zoom;
            const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, oldZoom * zoomFactor));
            
            if (newZoom !== oldZoom) {
                // Emit beforeZoom event
                this.emit('beforeZoom', { 
                    camera: { ...camera },
                    oldZoom,
                    newZoom,
                    zoomCenter: { x: canvasX, y: canvasY }
                });
                
                // Zoom towards cursor position
                const worldPos = this.canvasToWorld(canvasX, canvasY);
                camera.zoom = newZoom;
                const newWorldPos = this.canvasToWorld(canvasX, canvasY);
                
                camera.x += newWorldPos.x - worldPos.x;
                camera.y += newWorldPos.y - worldPos.y;
                
                // Apply camera constraints
                this.applyCameraConstraints();
                
                // Emit duringZoom event (throttled for smooth wheel zooming)
                this.emitThrottled('duringZoom', { 
                    camera: { ...camera },
                    oldZoom,
                    newZoom,
                    zoomCenter: { x: canvasX, y: canvasY }
                });
                
                // Force immediate DOM updates for smooth React component scaling
                this.updateReactComponentPositions();
                this.redrawCanvas();
                this.updateZoomIndicator();
                this.updateRecenterButton();
                
                // Emit afterZoom event (throttled to avoid spam during wheel zooming)
                this.emitThrottled('afterZoom', { 
                    camera: { ...camera },
                    oldZoom,
                    newZoom,
                    zoomCenter: { x: canvasX, y: canvasY }
                }, 100); // Longer delay for afterZoom to batch rapid wheel events
            }
        } else {
            // Two-finger scroll (pan)
            const camera = this.activeCanvasContext.camera;
            const panSpeed = 1 / camera.zoom;
            camera.x -= e.deltaX * panSpeed;
            camera.y -= e.deltaY * panSpeed;
            
            this.redrawCanvas();
            this.updateRecenterButton();
        }
    }
    
    handleTouchStart(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 2) {
            // Two finger gesture - prepare for pinch/pan
            this.lastTouchDistance = this.getTouchDistance();
        }
    }
    
    handleTouchMove(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);
        
        if (this.touches.length === 2) {
            // Two finger gesture
            const currentDistance = this.getTouchDistance();
            const center = this.getTouchCenter();
            
            if (this.lastTouchDistance > 0) {
                // Pinch to zoom
                const zoomFactor = currentDistance / this.lastTouchDistance;
                const oldZoom = this.camera.zoom;
                const newZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, oldZoom * zoomFactor));
                
                if (newZoom !== oldZoom) {
                    const rect = this.canvas.getBoundingClientRect();
                    const canvasX = center.x - rect.left;
                    const canvasY = center.y - rect.top;
                    
                    const worldPos = this.canvasToWorld(canvasX, canvasY);
                    this.camera.zoom = newZoom;
                    const newWorldPos = this.canvasToWorld(canvasX, canvasY);
                    
                    this.camera.x += newWorldPos.x - worldPos.x;
                    this.camera.y += newWorldPos.y - worldPos.y;
                    
                    this.redrawCanvas();
                    this.updateZoomIndicator();
                }
            }
            
            this.lastTouchDistance = currentDistance;
        }
    }
    
    handleTouchEnd(e) {
        e.preventDefault();
        this.touches = Array.from(e.touches);
        this.lastTouchDistance = 0;
    }
    
    getTouchDistance() {
        if (this.touches.length < 2) return 0;
        
        const dx = this.touches[0].clientX - this.touches[1].clientX;
        const dy = this.touches[0].clientY - this.touches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getTouchCenter() {
        if (this.touches.length < 2) return { x: 0, y: 0 };
        
        return {
            x: (this.touches[0].clientX + this.touches[1].clientX) / 2,
            y: (this.touches[0].clientY + this.touches[1].clientY) / 2
        };
    }
    
    handleContextMenu(e) {
        e.preventDefault(); // Prevent default browser context menu
        
        const pos = this.getMousePos(e);
        const clickedElement = this.getElementAtPoint(pos.x, pos.y);
        
        if (clickedElement) {
            this.showContextMenu(e, clickedElement);
        }
    }
    
    showContextMenu(e, element) {
        // Remove any existing context menu
        this.hideContextMenu();
        
        const contextMenu = document.createElement('div');
        contextMenu.className = 'context-menu';
        contextMenu.innerHTML = `
            <div class="context-menu-item" data-action="bring-to-front">
                <span>Bring to Front</span>
                <span class="context-menu-shortcut">Ctrl+]</span>
            </div>
            <div class="context-menu-item" data-action="send-to-back">
                <span>Send to Back</span>
                <span class="context-menu-shortcut">Ctrl+[</span>
            </div>
            <div class="context-menu-divider"></div>
            <div class="context-menu-item" data-action="duplicate">
                <span>Duplicate</span>
                <span class="context-menu-shortcut">Ctrl+D</span>
            </div>
            <div class="context-menu-item" data-action="delete">
                <span>Delete</span>
                <span class="context-menu-shortcut">Del</span>
            </div>
        `;
        
        // Position menu at cursor
        contextMenu.style.left = e.clientX + 'px';
        contextMenu.style.top = e.clientY + 'px';
        
        // Add to DOM
        document.body.appendChild(contextMenu);
        this.currentContextMenu = contextMenu;
        this.contextMenuElement = element;
        
        // Add event listeners
        contextMenu.addEventListener('click', (e) => {
            const action = e.target.closest('.context-menu-item')?.dataset.action;
            if (action) {
                this.handleContextMenuAction(action, element);
            }
            this.hideContextMenu();
        });
        
        // Hide menu on outside click
        setTimeout(() => {
            document.addEventListener('click', this.hideContextMenu.bind(this), { once: true });
        }, 10);
    }
    
    hideContextMenu() {
        if (this.currentContextMenu) {
            this.currentContextMenu.remove();
            this.currentContextMenu = null;
            this.contextMenuElement = null;
        }
    }
    
    handleContextMenuAction(action, element) {
        let needsRedraw = true;
        
        switch (action) {
            case 'bring-to-front':
                needsRedraw = this.bringToFront(element);
                break;
            case 'send-to-back':
                needsRedraw = this.sendToBack(element);
                break;
            case 'duplicate':
                this.duplicateElement(element);
                break;
            case 'delete':
                this.deleteElement(element);
                break;
        }
        
        // Only redraw if we're not dealing with just HTML component reordering
        if (needsRedraw) {
            this.redrawCanvas();
        }
    }
    
    bringToFront(element) {
        console.log('bringToFront called with:', element);
        const shapes = this.activeCanvasContext.shapes;
        let needsCanvasRedraw = true;
        
        if (element.type === 'shape') {
            const shape = shapes[element.index];
            if (shape) {
                shapes.splice(element.index, 1);
                shapes.push(shape);
                
                // For HTML components, avoid canvas redraw
                if (shape.type === 'reactComponent') {
                    needsCanvasRedraw = false;
                }
            }
        } else if (element.type === 'text') {
            // For text elements, we need to work with the texts array
            const texts = this.activeCanvasContext.texts;
            const text = texts[element.index];
            if (text) {
                texts.splice(element.index, 1);
                texts.push(text);
            }
        } else if (element.type === 'path') {
            // For path elements, work with paths array
            const paths = this.activeCanvasContext.paths;
            const path = paths[element.index];
            if (path) {
                paths.splice(element.index, 1);
                paths.push(path);
            }
        }
        
        // Always update unified layering system after any reordering
        this.updateHTMLComponentZIndices();
        
        // Clear selection to avoid index issues
        this.selectedElements = [];
        
        // Always trigger redraw for layered rendering
        return true;
    }
    
    sendToBack(element) {
        const shapes = this.activeCanvasContext.shapes;
        let needsCanvasRedraw = true;
        
        if (element.type === 'shape') {
            const shape = shapes[element.index];
            if (shape) {
                shapes.splice(element.index, 1);
                shapes.unshift(shape);
                
                // For HTML components, avoid canvas redraw
                if (shape.type === 'reactComponent') {
                    needsCanvasRedraw = false;
                }
            }
        } else if (element.type === 'text') {
            const texts = this.activeCanvasContext.texts;
            const text = texts[element.index];
            if (text) {
                texts.splice(element.index, 1);
                texts.unshift(text);
            }
        } else if (element.type === 'path') {
            const paths = this.activeCanvasContext.paths;
            const path = paths[element.index];
            if (path) {
                paths.splice(element.index, 1);
                paths.unshift(path);
            }
        }
        
        // Always update unified layering system after any reordering
        this.updateHTMLComponentZIndices();
        
        // Clear selection to avoid index issues
        this.selectedElements = [];
        
        // Always trigger redraw for layered rendering
        return true;
    }
    
    duplicateElement(element) {
        if (element.type === 'shape') {
            const shape = this.activeCanvasContext.shapes[element.index];
            if (shape) {
                const duplicate = {
                    ...shape,
                    id: Date.now() + Math.random(),
                    x: shape.x + 20,
                    y: shape.y + 20
                };
                this.activeCanvasContext.shapes.push(duplicate);
                
                // If it's a reactComponent, also duplicate the DOM element
                if (shape.type === 'reactComponent' && shape.domElement) {
                    const clonedElement = shape.domElement.cloneNode(true);
                    duplicate.domElement = clonedElement;
                    duplicate.canvasRenderer = this.createCanvasRenderer(clonedElement);
                    // The duplicated component will be rendered on next redraw
                }
            }
        } else if (element.type === 'text') {
            const text = this.activeCanvasContext.texts[element.index];
            if (text) {
                const duplicate = {
                    ...text,
                    x: text.x + 20,
                    y: text.y + 20
                };
                this.activeCanvasContext.texts.push(duplicate);
            }
        } else if (element.type === 'path') {
            const path = this.activeCanvasContext.paths[element.index];
            if (path) {
                const duplicate = {
                    ...path,
                    points: path.points.map(point => ({ ...point, x: point.x + 20, y: point.y + 20 }))
                };
                this.activeCanvasContext.paths.push(duplicate);
            }
        }
    }
    
    deleteElement(element) {
        if (element.type === 'shape') {
            const shape = this.activeCanvasContext.shapes[element.index];
            if (shape) {
                // If it's a reactComponent, clean up DOM element
                if (shape.type === 'reactComponent') {
                    this.removeReactComponent(shape.id);
                } else {
                    this.activeCanvasContext.shapes.splice(element.index, 1);
                }
            }
        } else if (element.type === 'text') {
            this.activeCanvasContext.texts.splice(element.index, 1);
        } else if (element.type === 'path') {
            this.activeCanvasContext.paths.splice(element.index, 1);
        }
        
        // Clear selection
        this.selectedElements = [];
    }
    
    zoomIn() {
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        
        // Calculate current viewport center in world coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const worldCenter = this.canvasToWorld(centerX, centerY);
        
        const oldZoom = camera.zoom;
        const newZoom = Math.min(camera.maxZoom, oldZoom * 1.2);
        
        // Emit beforeZoom event
        this.emit('beforeZoom', { 
            camera: { ...camera },
            oldZoom,
            newZoom,
            zoomCenter: { x: centerX, y: centerY }
        });
        
        // Adjust camera to keep current viewport center stable during zoom
        camera.zoom = newZoom;
        const newWorldCenter = this.canvasToWorld(centerX, centerY);
        
        camera.x += newWorldCenter.x - worldCenter.x;
        camera.y += newWorldCenter.y - worldCenter.y;
        
        // Emit afterZoom event
        this.emit('afterZoom', { 
            camera: { ...camera },
            oldZoom,
            newZoom,
            zoomCenter: { x: centerX, y: centerY }
        });

        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
        this.notifyCameraChange();
    }
    
    zoomOut() {
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        
        // Calculate current viewport center in world coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const worldCenter = this.canvasToWorld(centerX, centerY);
        
        const oldZoom = camera.zoom;
        const newZoom = Math.max(camera.minZoom, oldZoom / 1.2);
        
        // Emit beforeZoom event
        this.emit('beforeZoom', { 
            camera: { ...camera },
            oldZoom,
            newZoom,
            zoomCenter: { x: centerX, y: centerY }
        });
        
        // Adjust camera to keep current viewport center stable during zoom
        camera.zoom = newZoom;
        const newWorldCenter = this.canvasToWorld(centerX, centerY);
        
        camera.x += newWorldCenter.x - worldCenter.x;
        camera.y += newWorldCenter.y - worldCenter.y;
        
        // Emit afterZoom event
        this.emit('afterZoom', { 
            camera: { ...camera },
            oldZoom,
            newZoom,
            zoomCenter: { x: centerX, y: centerY }
        });

        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
        this.notifyCameraChange();
    }
    
    
    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        
        // First check for React components
        // Check what element was actually clicked (respects layering)
        const clickedElement = this.getElementAtPoint(pos.x, pos.y);
        
        // Check if user double-clicked on a text box
        if (clickedElement && clickedElement.type === 'text') {
            const textBox = this.texts[clickedElement.index];
            textBox.isEditing = true;
            
            // Select the text box
            this.selectedElements = [{ type: 'text', index: clickedElement.index }];
            
            // Create text input for editing
            this.createTextInput(textBox, clickedElement.index);
            
            // Text editor will trigger redraw when complete
        }
        // Check if user double-clicked on a nested canvas
        else if (clickedElement && clickedElement.type === 'nested-canvas') {
            this.openNestedCanvas(clickedElement.index);
        }
        // Check if user double-clicked on a React component
        else if (clickedElement && clickedElement.type === 'shape') {
            const shape = this.shapes[clickedElement.index];
            if (shape.type === 'reactComponent') {
                this.enterComponentEditMode(shape);
            }
            // For other shape types (rectangle, circle, line, arrow), do nothing
        }
    }
    
    openNestedCanvas(index) {
        if (index >= 0 && index < this.nestedCanvases.length) {
            // Check if nested canvas elements exist
            if (!this.nestedCanvasOverlay || !this.nestedCanvas || !this.nestedCtx) {
                console.warn('Nested canvas elements not found in HTML. Cannot open nested canvas.');
                return;
            }
            
            const nestedCanvasShape = this.nestedCanvases[index];
            this.currentNestedCanvasId = nestedCanvasShape.id;
            this.isNestedCanvasOpen = true;
            
            // Show overlay
            this.nestedCanvasOverlay.style.display = 'flex';
            
            // Set up the context and events immediately
            this.setupNestedCanvasContext(nestedCanvasShape);
            
            // Canvas dimensions will be set up after the CSS transition completes
        }
    }
    
    setupNestedCanvasContext(nestedCanvasShape) {
        // Create nested canvas context immediately (before canvas resizing)
        const nestedData = this.loadNestedCanvasData(nestedCanvasShape.id);
        this.nestedCanvasContext = {
            canvas: this.nestedCanvas,
            ctx: this.nestedCtx,
            camera: {
                x: nestedData.camera?.x ?? 0,
                y: nestedData.camera?.y ?? 0,
                zoom: nestedData.camera?.zoom ?? 1,
                minZoom: 0.1,
                maxZoom: 5
            },
            paths: nestedData.paths || [],
            shapes: nestedData.shapes || [],
            texts: nestedData.texts || [],
            nestedCanvases: [], // Nested canvases don't have their own nested canvases for now
            selectedElements: [],
            previewSelectedElements: [],
            hoveredElement: null,
            currentPath: [],
            selectionBox: this.nestedSelectionBox
        };
        
        // Switch to nested canvas context for unified event handling
        this.activeCanvasContext = this.nestedCanvasContext;
        
        // Setup event listeners for nested canvas
        this.setupNestedCanvasEvents();
        
        // Initialize cursor for nested canvas
        this.updateNestedCanvasCursor();
        
        // Draw initial content (will be redrawn after resize)
        this.redrawCanvas(this.activeCanvasContext);
        
        // Update nested canvas UI elements
        this.updateZoomIndicator();
        this.updateRecenterButton();
        
        // Setup nested toolbar dragging
        this.setupNestedToolbarDrag();
        
        // Add show animation
        requestAnimationFrame(() => {
            this.nestedCanvasOverlay.classList.add('show');
            
            // Setup canvas dimensions after the transition
            setTimeout(() => {
                this.setupNestedCanvasDimensions(this.nestedCanvases.find(nc => nc.id === this.currentNestedCanvasId), 0);
            }, 350); // Wait for CSS transition to complete (300ms + buffer)
        });
    }
    
    setupNestedCanvasDimensions(nestedCanvasShape, retryCount = 0) {
        const maxRetries = 20; // Prevent infinite loops
        
        // Use a consistent approach for all nested canvases
        setTimeout(() => {
            const container = this.nestedCanvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            const overlayRect = this.nestedCanvasOverlay.getBoundingClientRect();
            
            // Debug logging (only on first few attempts to avoid spam)
            if (retryCount < 3) {
            } else if (retryCount === 3) {
            }
            
            // Try using overlay dimensions as fallback if container has no dimensions
            let canvasWidth, canvasHeight;
            if (containerRect.width > 0 && containerRect.height > 0) {
                canvasWidth = Math.round(containerRect.width);
                canvasHeight = Math.round(containerRect.height);
            } else if (overlayRect.width > 0 && overlayRect.height > 0) {
                // Use a reasonable portion of the overlay for the canvas
                canvasWidth = Math.round(overlayRect.width - 100); // Account for margins/padding
                canvasHeight = Math.round(overlayRect.height - 100);
            } else {
                if (retryCount >= maxRetries) {
                    console.error(`[NESTED-CANVAS] Failed to get any valid dimensions after ${maxRetries} retries. Aborting.`);
                    return;
                }
                console.warn(`[NESTED-CANVAS] No valid dimensions found, retry ${retryCount + 1}/${maxRetries}`);
                setTimeout(() => this.setupNestedCanvasDimensions(nestedCanvasShape, retryCount + 1), 100);
                return;
            }
            
            
            // Only resize if dimensions have actually changed to avoid coordinate issues
            if (this.nestedCanvas.width !== canvasWidth || this.nestedCanvas.height !== canvasHeight) {
                // Resizing nested canvas
                
                // Check if this is a new canvas (camera at default position)
                const isNewCanvas = this.nestedCanvasContext && 
                                   this.nestedCanvasContext.camera &&
                                   this.nestedCanvasContext.camera.x === 0 && 
                                   this.nestedCanvasContext.camera.y === 0 && 
                                   this.nestedCanvasContext.camera.zoom === 1;
                
                
                if (isNewCanvas) {
  
                    // Use unified setup for new nested canvases
                    this.setupCanvasContext(this.nestedCanvasContext, canvasWidth, canvasHeight);
                } else {
                    // Just resize existing nested canvases without affecting camera
                    this.nestedCanvas.width = canvasWidth;
                    this.nestedCanvas.height = canvasHeight;
                    this.nestedCanvas.style.setProperty('width', canvasWidth + 'px', 'important');
                    this.nestedCanvas.style.setProperty('height', canvasHeight + 'px', 'important');
                    this.nestedCtx.lineCap = 'round';
                    this.nestedCtx.lineJoin = 'round';
                }
                
            }
            
            // Redraw the canvas with the new dimensions
            this.redrawCanvas(this.nestedCanvasContext);
            
            // Force layout recalculation and then check
            setTimeout(() => {
                const canvasRect = this.nestedCanvas.getBoundingClientRect();
                const canvasStyles = window.getComputedStyle(this.nestedCanvas);
            }, 10);
            
            // Force layout reflow by accessing offsetWidth
            const actualWidth = this.nestedCanvas.offsetWidth;
            const actualHeight = this.nestedCanvas.offsetHeight;
            
            // Try to debug what's preventing the canvas from showing
            
            
            
        }, 50);
    }
    
    setupNestedToolbarDrag() {
        const toolbar = document.getElementById('nested-floating-toolbar');
        const dragHandle = document.getElementById('nested-toolbar-drag-handle');
        
        if (!toolbar || !dragHandle) return;
        
        let isDragging = false;
        let dragOffset = { x: 0, y: 0 };
        
        dragHandle.addEventListener('mousedown', (e) => {
            e.preventDefault();
            isDragging = true;
            
            const rect = toolbar.getBoundingClientRect();
            const containerRect = toolbar.parentElement.getBoundingClientRect();
            dragOffset.x = e.clientX - rect.left;
            dragOffset.y = e.clientY - rect.top;
            
            toolbar.style.transition = 'none';
            document.body.style.userSelect = 'none';
            
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        });
        
        const handleMouseMove = (e) => {
            if (!isDragging) return;
            
            const containerRect = toolbar.parentElement.getBoundingClientRect();
            const x = e.clientX - containerRect.left - dragOffset.x;
            const y = e.clientY - containerRect.top - dragOffset.y;
            
            // Constrain to container
            const maxX = containerRect.width - toolbar.offsetWidth;
            const maxY = containerRect.height - toolbar.offsetHeight;
            
            const constrainedX = Math.max(0, Math.min(maxX, x));
            const constrainedY = Math.max(0, Math.min(maxY, y));
            
            toolbar.style.left = constrainedX + 'px';
            toolbar.style.top = constrainedY + 'px';
        };
        
        const handleMouseUp = () => {
            isDragging = false;
            toolbar.style.transition = 'all 0.2s ease';
            document.body.style.userSelect = '';
            
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };
    }
    
    closeNestedCanvas() {
        if (this.isNestedCanvasOpen) {
            // Save current nested canvas data before closing
            this.saveNestedCanvasData();
            
            // Remove nested canvas event listeners
            this.removeNestedCanvasEvents();
            
            // Switch back to main canvas context
            this.activeCanvasContext = this.mainCanvasContext;
            
            // Update main canvas UI elements
            this.updateZoomIndicator();
            this.updateRecenterButton();
            
            // Hide overlay with animation
            this.nestedCanvasOverlay.classList.remove('show');
            setTimeout(() => {
                this.nestedCanvasOverlay.style.display = 'none';
                this.isNestedCanvasOpen = false;
                this.currentNestedCanvasId = null;
                this.nestedCanvasContext = null;
            }, 300); // Match CSS transition duration
        }
    }
    
    setupNestedCanvas() {
        if (!this.nestedCanvas) return;
        
        const container = this.nestedCanvas.parentElement;
        const rect = container.getBoundingClientRect();
        
        // Set canvas size to match container
        this.nestedCanvas.width = rect.width;
        this.nestedCanvas.height = rect.height;
        this.nestedCanvas.style.width = rect.width + 'px';
        this.nestedCanvas.style.height = rect.height + 'px';
        
        // Nested canvas setup
        
        // Clear the canvas
        this.nestedCtx.clearRect(0, 0, this.nestedCanvas.width, this.nestedCanvas.height);
        
        // Set default styles
        this.nestedCtx.lineCap = 'round';
        this.nestedCtx.lineJoin = 'round';
    }
    
    loadNestedCanvasData(canvasId) {
        const data = this.nestedCanvasData.get(canvasId);
        return data || {
            paths: [],
            shapes: [],
            texts: [],
            camera: { x: 0, y: 0, zoom: 1, minZoom: 0.1, maxZoom: 5 }
        };
    }
    
    saveNestedCanvasData() {
        if (this.currentNestedCanvasId && this.nestedCanvasContext) {
            // Save actual drawing data from the nested canvas
            this.nestedCanvasData.set(this.currentNestedCanvasId, {
                paths: [...this.nestedCanvasContext.paths],
                shapes: [...this.nestedCanvasContext.shapes],
                texts: [...this.nestedCanvasContext.texts],
                camera: { ...this.nestedCanvasContext.camera }
            });
        }
    }
    
    setupNestedCanvasEvents() {
        if (!this.nestedCanvas) return;
        
        // Store bound functions for proper event removal - reuse main canvas handlers
        this.nestedMouseHandlers = {
            mousedown: this.handleMouseDown.bind(this),
            mousemove: this.handleMouseMove.bind(this),
            mouseup: this.handleMouseUp.bind(this),
            click: this.handleClick.bind(this)
        };
        
        // Mouse events
        this.nestedCanvas.addEventListener('mousedown', this.nestedMouseHandlers.mousedown);
        this.nestedCanvas.addEventListener('mousemove', this.nestedMouseHandlers.mousemove);
        this.nestedCanvas.addEventListener('mouseup', this.nestedMouseHandlers.mouseup);
        this.nestedCanvas.addEventListener('click', this.nestedMouseHandlers.click);
        this.nestedCanvas.addEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Zoom and pan events for nested canvas - reuse main canvas handler
        this.nestedMouseHandlers.wheel = this.handleWheel.bind(this);
        this.nestedCanvas.addEventListener('wheel', this.nestedMouseHandlers.wheel);
        
        // Touch events for nested canvas - reuse main canvas handlers
        this.nestedMouseHandlers.touchstart = this.handleTouchStart.bind(this);
        this.nestedMouseHandlers.touchmove = this.handleTouchMove.bind(this);
        this.nestedMouseHandlers.touchend = this.handleTouchEnd.bind(this);
        this.nestedCanvas.addEventListener('touchstart', this.nestedMouseHandlers.touchstart);
        this.nestedCanvas.addEventListener('touchmove', this.nestedMouseHandlers.touchmove);
        this.nestedCanvas.addEventListener('touchend', this.nestedMouseHandlers.touchend);
        
        // Toolbar events
        const nestedToolButtons = document.querySelectorAll('#nested-canvas-overlay .tool-btn');
        const nestedClearBtn = document.getElementById('nested-clear-btn');
        
        nestedToolButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const tool = e.currentTarget.getAttribute('data-tool');
                this.setNestedTool(tool);
                
                // Update active button
                nestedToolButtons.forEach(btn => btn.classList.remove('active'));
                e.currentTarget.classList.add('active');
            });
        });
        
        if (nestedClearBtn) {
            nestedClearBtn.addEventListener('click', this.clearNestedCanvas.bind(this));
        }
        
        // Zoom controls for nested canvas
        const nestedZoomInBtn = document.getElementById('nested-zoom-in-btn');
        const nestedZoomOutBtn = document.getElementById('nested-zoom-out-btn');
        const nestedRecenterBtn = document.getElementById('nested-recenter-btn');
        
        if (nestedZoomInBtn) {
            nestedZoomInBtn.addEventListener('click', this.zoomIn.bind(this));
        }
        
        if (nestedZoomOutBtn) {
            nestedZoomOutBtn.addEventListener('click', this.zoomOut.bind(this));
        }
        
        if (nestedRecenterBtn) {
            nestedRecenterBtn.addEventListener('click', this.recenterCanvas.bind(this));
        }
        
        const nestedResetZoomBtn = document.getElementById('nested-reset-zoom-btn');
        if (nestedResetZoomBtn) {
            nestedResetZoomBtn.addEventListener('click', this.resetZoom.bind(this));
        }
    }
    
    removeNestedCanvasEvents() {
        if (!this.nestedCanvas || !this.nestedMouseHandlers) return;
        
        // Remove mouse events using stored handlers
        this.nestedCanvas.removeEventListener('mousedown', this.nestedMouseHandlers.mousedown);
        this.nestedCanvas.removeEventListener('mousemove', this.nestedMouseHandlers.mousemove);
        this.nestedCanvas.removeEventListener('mouseup', this.nestedMouseHandlers.mouseup);
        this.nestedCanvas.removeEventListener('click', this.nestedMouseHandlers.click);
        this.nestedCanvas.removeEventListener('dblclick', this.handleDoubleClick.bind(this));
        
        // Remove zoom/pan events
        if (this.nestedMouseHandlers.wheel) {
            this.nestedCanvas.removeEventListener('wheel', this.nestedMouseHandlers.wheel);
        }
        if (this.nestedMouseHandlers.touchstart) {
            this.nestedCanvas.removeEventListener('touchstart', this.nestedMouseHandlers.touchstart);
            this.nestedCanvas.removeEventListener('touchmove', this.nestedMouseHandlers.touchmove);
            this.nestedCanvas.removeEventListener('touchend', this.nestedMouseHandlers.touchend);
        }
        
        // Clean up stored handlers
        this.nestedMouseHandlers = null;
    }
    
    setNestedTool(tool) {
        this.currentTool = tool;
        this.updateNestedCanvasCursor();
    }
    
    updateNestedCanvasCursor() {
        if (!this.nestedCanvas) return;
        
        const container = this.nestedCanvas.parentElement;
        container.className = 'nested-canvas-content';
        container.classList.add(`${this.currentTool}-cursor`);
        
        // Add state-specific classes
        if (this.nestedCanvasContext) {
            if (this.isDrawing) container.classList.add('drawing');
            if (this.isSelecting) container.classList.add('selecting');
            if (this.isDragging) container.classList.add('grabbing');
            if (this.isResizing) container.classList.add('resizing');
            if (this.nestedCanvasContext.hoveredElement) {
                container.classList.add('hovering');
                // Show can-grab cursor when hovering over any draggable element
                if (!this.isDragging && !this.isResizing) {
                    container.classList.add('can-grab');
                }
            }
        }
    }
    
    clearNestedCanvas() {
        if (this.nestedCanvasContext) {
            this.nestedCanvasContext.paths = [];
            this.nestedCanvasContext.shapes = [];
            this.nestedCanvasContext.texts = [];
            this.nestedCanvasContext.selectedElements = [];
            this.nestedCanvasContext.hoveredElement = null;
            // Auto-save after clearing
            this.saveNestedCanvasData();
            this.redrawCanvas(this.nestedCanvasContext);
        }
    }
    
    // DEPRECATED: Nested canvas mouse event handlers - now using unified handlers above
    // TODO: Remove this entire section after confirming the unified approach works
    handleNestedMouseDown(e) {
        const pos = this.getNestedMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        
        // Check for panning (middle mouse button)
        if (e.button === 1) {
            this.isPanning = true;
            this.panState.isPanning = true;
            this.panState.startCamera = { ...this.activeCanvasContext.camera };
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            this.emit('beforePan', { camera: this.panState.startCamera });
            return;
        }
        
        this.isDrawing = true;
        
        // Clear any previous preview coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Check if clicking on a hovered element (prioritize component interaction over drawing)
        if (this.nestedCanvasContext.hoveredElement) {
            const hoveredElement = this.nestedCanvasContext.hoveredElement;
            const isAlreadySelected = this.nestedCanvasContext.selectedElements.some(sel => {
                return sel.type === hoveredElement.type && sel.index === hoveredElement.index;
            });
            
            // If not already selected, select the element first
            if (!isAlreadySelected) {
                this.nestedCanvasContext.selectedElements = [hoveredElement];
                this.redrawCanvas(this.nestedCanvasContext);
            }
            
            // Start dragging immediately regardless of current tool
            this.isDragging = true;
            this.dragOffset.x = pos.x;
            this.dragOffset.y = pos.y;
            this.updateNestedCanvasCursor();
            return;
        }
        
        if (this.currentTool === 'pen') {
            this.nestedCanvasContext.currentPath = [{ x: pos.x, y: pos.y }];
        } else if (this.currentTool === 'select') {
            // Check if clicking on a resize handle for selected elements
            const resizeHandle = this.getResizeHandleForContext(pos.x, pos.y, this.nestedCanvasContext);
            if (resizeHandle) {
                this.isResizing = true;
                this.resizeHandle = resizeHandle;
                
                // Calculate the actual handle center position to avoid jump
                const handleCenter = this.getResizeHandleCenter(resizeHandle, this.nestedCanvasContext);
                if (handleCenter) {
                    // For rectangles/HTML components - store offset from handle center
                    this.resizeOffset = {
                        x: pos.x - handleCenter.x,
                        y: pos.y - handleCenter.y
                    };
                } else {
                    // For circles - store initial radius to maintain consistent offset
                    if (this.nestedCanvasContext.selectedElements.length === 1) {
                        const element = this.nestedCanvasContext.selectedElements[0];
                        if (element.type === 'shape') {
                            const shape = this.nestedCanvasContext.shapes[element.index];
                            if (shape.type === 'circle') {
                                // For circles, store the initial radius and click position
                                const centerX = shape.x;
                                const centerY = shape.y;
                                const initialDistance = Math.sqrt(
                                    Math.pow(pos.x - centerX, 2) + Math.pow(pos.y - centerY, 2)
                                );
                                this.initialCircleRadius = shape.radius;
                                this.initialCircleClickDistance = initialDistance;
                                this.resizeOffset = { x: 0, y: 0 };
                            } else {
                                this.resizeOffset = { x: 0, y: 0 };
                            }
                        }
                    } else {
                        this.resizeOffset = { x: 0, y: 0 };
                    }
                }
                
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                this.dragStartX = pos.x;
                this.dragStartY = pos.y;
                return;
            }
            
            // Check if clicking on any element
            const clickedElement = this.getElementAtPointForContext(pos.x, pos.y, this.nestedCanvasContext);
            
            if (clickedElement) {
                // Check if the clicked element is already selected
                const isAlreadySelected = this.nestedCanvasContext.selectedElements.some(sel => {
                    return sel.type === clickedElement.type && sel.index === clickedElement.index;
                });
                
                // If not already selected, select the element first
                if (!isAlreadySelected) {
                    this.nestedCanvasContext.selectedElements = [clickedElement];
                    this.redrawCanvas(this.nestedCanvasContext);
                }
                
                // Start dragging immediately (whether it was selected before or just got selected)
                this.isDragging = true;
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
            } else {
                // Start area selection
                this.isSelecting = true;
                this.nestedCanvasContext.selectedElements = [];
                this.redrawCanvas(this.nestedCanvasContext);
            }
        }
        
        this.updateNestedCanvasCursor();
    }
    
    handleNestedMouseMove(e) {
        // Handle panning
        if (this.isPanning && this.nestedCanvasContext && this.nestedCanvasContext.camera) {
            const deltaX = e.clientX - this.dragOffset.x;
            const deltaY = e.clientY - this.dragOffset.y;
            const camera = this.nestedCanvasContext.camera;
            
            camera.x += deltaX / camera.zoom;
            camera.y += deltaY / camera.zoom;
            
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            
            this.redrawCanvas(this.nestedCanvasContext);
            return;
        }
        
        const pos = this.getNestedMousePos(e);
        
        if (!this.isDrawing) {
            // Handle hover detection
            const hoveredElement = this.getElementAtPointForContext(pos.x, pos.y, this.nestedCanvasContext);
            if (hoveredElement !== this.nestedCanvasContext.hoveredElement) {
                this.nestedCanvasContext.hoveredElement = hoveredElement;
                this.redrawCanvas(this.nestedCanvasContext);
                this.updateNestedCanvasCursor();
            }
            return;
        }
        
        if (this.currentTool === 'pen') {
            this.nestedCanvasContext.currentPath.push({ x: pos.x, y: pos.y });
            this.redrawCanvas(this.nestedCanvasContext);
        } else if (this.currentTool === 'select' && this.isSelecting) {
            // Area selection preview
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.showSelectionBox(this.startX, this.startY, width, height);
        } else if (this.isResizing) {
            // Resizing selected element
            this.performResizeForContext(pos.x, pos.y, this.nestedCanvasContext);
            this.redrawCanvas(this.nestedCanvasContext);
        } else if (this.isDragging) {
            // Dragging selected elements
            const deltaX = pos.x - this.dragOffset.x;
            const deltaY = pos.y - this.dragOffset.y;
            
            this.nestedCanvasContext.selectedElements.forEach(element => {
                if (element.type === 'shape') {
                    const shape = this.nestedCanvasContext.shapes[element.index];
                    if (shape.type === 'line' || shape.type === 'arrow') {
                        // For lines and arrows, move both endpoints
                        shape.x1 += deltaX;
                        shape.y1 += deltaY;
                        shape.x2 += deltaX;
                        shape.y2 += deltaY;
                    } else {
                        shape.x += deltaX;
                        shape.y += deltaY;
                    }
                } else if (element.type === 'text') {
                    const text = this.nestedCanvasContext.texts[element.index];
                    text.x += deltaX;
                    text.y += deltaY;
                } else if (element.type === 'path') {
                    const path = this.nestedCanvasContext.paths[element.index];
                    path.forEach(point => {
                        point.x += deltaX;
                        point.y += deltaY;
                    });
                }
            });
            
            this.dragOffset.x = pos.x;
            this.dragOffset.y = pos.y;
            this.redrawCanvas(this.nestedCanvasContext);
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle') {
            this.previewStartX = this.startX;
            this.previewStartY = this.startY;
            this.previewEndX = pos.x;
            this.previewEndY = pos.y;
            this.redrawCanvas(this.nestedCanvasContext);
        }
    }
    
    handleNestedMouseUp(e) {
        // Stop panning
        if (this.isPanning) {
            this.isPanning = false;
            return;
        }
        
        if (!this.isDrawing) return;
        
        const pos = this.getNestedMousePos(e);
        this.isDrawing = false;
        
        if (this.currentTool === 'pen') {
            this.nestedCanvasContext.paths.push([...this.nestedCanvasContext.currentPath]);
            this.nestedCanvasContext.currentPath = [];
        } else if (this.currentTool === 'select') {
            if (this.isResizing) {
                // HTML components are already updated in real-time during resize
                
                this.isResizing = false;
                this.resizeHandle = null;
                this.resizeOffset = null;
                this.initialCircleRadius = null;
                this.initialCircleClickDistance = null;
                // Keep component selected and redraw to show resize handles
                this.redrawCanvas(this.nestedCanvasContext);
            } else if (this.isDragging) {
                this.isDragging = false;
            } else if (this.isSelecting) {
                this.isSelecting = false;
                this.hideSelectionBox();
                // Clear preview selection before finalizing the actual selection
                this.nestedCanvasContext.previewSelectedElements = [];
                this.selectElementsInAreaForContext(this.startX, this.startY, pos.x, pos.y, this.nestedCanvasContext);
                this.redrawCanvas(this.nestedCanvasContext);
            }
        } else if (this.currentTool === 'rectangle') {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.nestedCanvasContext.shapes.push({
                type: 'rectangle',
                x: this.startX,
                y: this.startY,
                width,
                height
            });
            this.clearPreviewCoords();
        } else if (this.currentTool === 'circle') {
            // Calculate circle that fits in the bounding box from start to end (same as main canvas)
            const centerX = (this.startX + pos.x) / 2;
            const centerY = (this.startY + pos.y) / 2;
            const radius = Math.sqrt(
                Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2)
            ) / 2;
            this.nestedCanvasContext.shapes.push({
                type: 'circle',
                x: centerX,
                y: centerY,
                radius
            });
            this.clearPreviewCoords();
        }
        
        // Auto-save after any drawing operation
        this.saveNestedCanvasData();
        this.redrawCanvas(this.nestedCanvasContext);
        this.updateNestedCanvasCursor();
    }
    
    handleNestedClick(e) {
        // Text handling is now unified through handleClick method
        // This method can be removed as it's deprecated
    }
    
    handleNestedWheel(e) {
        e.preventDefault();
        
        // handleNestedWheel called
        
        if (!this.nestedCanvasContext || !this.nestedCanvasContext.camera) return;
        
        const rect = this.nestedCanvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        const camera = this.nestedCanvasContext.camera;
        
        // Ensure camera has proper min/max zoom values
        if (typeof camera.minZoom !== 'number' || isNaN(camera.minZoom)) {
            camera.minZoom = 0.1;
        }
        if (typeof camera.maxZoom !== 'number' || isNaN(camera.maxZoom)) {
            camera.maxZoom = 5;
        }
        
        // Detect pinch-to-zoom vs scroll
        if (e.ctrlKey || e.metaKey) {
            // Pinch-to-zoom
            const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
            const oldZoom = camera.zoom;
            const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, oldZoom * zoomFactor));
            
            // Nested canvas zoom attempt
            
            if (newZoom !== oldZoom && !isNaN(newZoom) && newZoom > 0) {
                // Zoom towards cursor position - exactly like main canvas
                const worldPos = this.canvasToWorld(canvasX, canvasY);
                camera.zoom = newZoom;
                const newWorldPos = this.canvasToWorld(canvasX, canvasY);
                
                // Safety check for valid world positions
                if (!isNaN(worldPos.x) && !isNaN(worldPos.y) && !isNaN(newWorldPos.x) && !isNaN(newWorldPos.y)) {
                    camera.x += newWorldPos.x - worldPos.x;
                    camera.y += newWorldPos.y - worldPos.y;
                    
                    // Clamp camera values to reasonable bounds
                    camera.x = Math.max(-10000, Math.min(10000, camera.x));
                    camera.y = Math.max(-10000, Math.min(10000, camera.y));
                    
                    // Zoom applied successfully
                }
                
                this.redrawCanvas(this.nestedCanvasContext);
            }
        } else {
            // Two-finger scroll (pan)
            const panSpeed = 1 / camera.zoom;
            camera.x -= e.deltaX * panSpeed;
            camera.y -= e.deltaY * panSpeed;
            
            this.redrawCanvas(this.nestedCanvasContext);
        }
    }
    
    handleNestedTouchStart(e) {
        e.preventDefault();
        this.nestedTouches = Array.from(e.touches);
        
        if (this.nestedTouches.length === 2) {
            this.lastNestedTouchDistance = this.getNestedTouchDistance();
        }
    }
    
    handleNestedTouchMove(e) {
        e.preventDefault();
        if (!this.nestedCanvasContext || !this.nestedCanvasContext.camera) return;
        
        this.nestedTouches = Array.from(e.touches);
        const camera = this.nestedCanvasContext.camera;
        
        // Ensure camera has proper min/max zoom values
        if (typeof camera.minZoom !== 'number' || isNaN(camera.minZoom)) {
            camera.minZoom = 0.1;
        }
        if (typeof camera.maxZoom !== 'number' || isNaN(camera.maxZoom)) {
            camera.maxZoom = 5;
        }
        
        if (this.nestedTouches.length === 2) {
            const currentDistance = this.getNestedTouchDistance();
            const center = this.getNestedTouchCenter();
            
            if (this.lastNestedTouchDistance > 0) {
                // Pinch to zoom
                const zoomFactor = currentDistance / this.lastNestedTouchDistance;
                const oldZoom = camera.zoom;
                const newZoom = Math.max(camera.minZoom, Math.min(camera.maxZoom, oldZoom * zoomFactor));
                
                if (newZoom !== oldZoom && !isNaN(newZoom) && newZoom > 0) {
                    const rect = this.nestedCanvas.getBoundingClientRect();
                    const canvasX = center.x - rect.left;
                    const canvasY = center.y - rect.top;
                    
                    // Zoom towards touch center - exactly like main canvas
                    const worldPos = this.canvasToWorld(canvasX, canvasY);
                    camera.zoom = newZoom;
                    const newWorldPos = this.canvasToWorld(canvasX, canvasY);
                    
                    // Safety check for valid world positions
                    if (!isNaN(worldPos.x) && !isNaN(worldPos.y) && !isNaN(newWorldPos.x) && !isNaN(newWorldPos.y)) {
                        camera.x += newWorldPos.x - worldPos.x;
                        camera.y += newWorldPos.y - worldPos.y;
                        
                        // Clamp camera values to reasonable bounds
                        camera.x = Math.max(-10000, Math.min(10000, camera.x));
                        camera.y = Math.max(-10000, Math.min(10000, camera.y));
                    }
                    
                    this.redrawCanvas(this.nestedCanvasContext);
                }
            }
            
            this.lastNestedTouchDistance = currentDistance;
        }
    }
    
    handleNestedTouchEnd(e) {
        e.preventDefault();
        this.nestedTouches = Array.from(e.touches);
        this.lastNestedTouchDistance = 0;
    }
    
    getNestedTouchDistance() {
        if (!this.nestedTouches || this.nestedTouches.length < 2) return 0;
        
        const dx = this.nestedTouches[0].clientX - this.nestedTouches[1].clientX;
        const dy = this.nestedTouches[0].clientY - this.nestedTouches[1].clientY;
        return Math.sqrt(dx * dx + dy * dy);
    }
    
    getNestedTouchCenter() {
        if (!this.nestedTouches || this.nestedTouches.length < 2) return { x: 0, y: 0 };
        
        return {
            x: (this.nestedTouches[0].clientX + this.nestedTouches[1].clientX) / 2,
            y: (this.nestedTouches[0].clientY + this.nestedTouches[1].clientY) / 2
        };
    }
    
    clearPreviewCoords() {
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
    }
    
    getNestedMousePos(e) {
        const rect = this.nestedCanvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Transform canvas coordinates to world coordinates using active canvas camera
        return this.canvasToWorld(canvasX, canvasY);
    }
    
    // ===== HTML COMPONENT DEDICATED METHODS =====
    
    // Dedicated hit detection for HTML components
    isHTMLComponentHit(x, y, htmlShape) {
        // For now, use rectangular hit detection, but this can be enhanced
        return x >= htmlShape.x && x <= htmlShape.x + htmlShape.width &&
               y >= htmlShape.y && y <= htmlShape.y + htmlShape.height;
    }
    
    // Dedicated rendering for HTML components (no rectangle background)
    renderHTMLComponent(ctx, htmlShape, isSelected = false, isPreviewSelected = false, shapeIndex = 0) {
        // HTML components are rendered via DOM elements, not canvas
        // This function handles any canvas-level decorations (selection indicators, etc.)
        
        // Check if this specific component is being resized
        const isBeingResized = this.isResizing && 
                              this.selectedElements.some(sel => 
                                  sel.type === 'shape' && 
                                  this.activeCanvasContext.shapes[sel.index] === htmlShape);
        
        // Only update DOM during resize if this is the component being resized
        // Otherwise, only update if position/size actually changed
        const htmlElement = this.htmlComponents.get(htmlShape.id);
        if (htmlElement) {
            const currentTransform = htmlElement.style.transform || '';
            const expectedTransform = this.calculateHTMLTransform(htmlShape, this.activeCanvasContext.camera);
            
            // Only update DOM if transform actually changed or if being actively resized
            if (isBeingResized || currentTransform !== expectedTransform) {
                this.renderReactComponentHTML(htmlShape, this.activeCanvasContext.camera);
            }
            
            // Set z-index based on shape position in array
            // Start at 100 to leave room for other UI elements
            htmlElement.style.zIndex = (100 + shapeIndex).toString();
            
            // Update selection visual state - show orange border during preview selection
            const isInEditMode = this.editingComponentId === htmlShape.id;
            if (isPreviewSelected && !isInEditMode) {
                htmlElement.classList.add('preview-selected');
            } else {
                htmlElement.classList.remove('preview-selected');
            }
            
        } else {
            // Element doesn't exist yet, create it
            this.renderReactComponentHTML(htmlShape, this.activeCanvasContext.camera);
        }
        
        if (isSelected) {
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 5]);
            ctx.strokeRect(htmlShape.x, htmlShape.y, htmlShape.width, htmlShape.height);
            ctx.restore();
        }
    }
    
    // Calculate the expected transform for an HTML component
    calculateHTMLTransform(shape, camera) {
        // Match the exact calculation from updateHTMLElementTransform
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const translateX = centerX + shape.x * camera.zoom + camera.x * camera.zoom;
        const translateY = centerY + shape.y * camera.zoom + camera.y * camera.zoom;
        
        return `translate(${translateX}px, ${translateY}px) scale(${camera.zoom})`;
    }
    
    // Dedicated bounds calculation for HTML components
    getHTMLComponentBounds(htmlShape) {
        return {
            x: htmlShape.x,
            y: htmlShape.y,
            width: htmlShape.width,
            height: htmlShape.height,
            right: htmlShape.x + htmlShape.width,
            bottom: htmlShape.y + htmlShape.height
        };
    }
    
    // Dedicated resize logic for HTML components
    resizeHTMLComponent(htmlShape, newWidth, newHeight) {
        htmlShape.width = Math.max(50, newWidth);  // Minimum width
        htmlShape.height = Math.max(30, newHeight); // Minimum height
        
        // Trigger HTML element resize
        this.updateHTMLElementSize(htmlShape);
    }
    
    // Update the actual HTML element size
    updateHTMLElementSize(htmlShape) {
        const element = document.querySelector(`[data-shape-id="${htmlShape.id}"]`);
        if (element) {
            element.style.width = `${htmlShape.width}px`;
            element.style.height = `${htmlShape.height}px`;
        }
    }
    
    
    getElementAtPointForContext(x, y, canvasContext) {
        const { shapes, texts, paths } = canvasContext;
        
        // Check shapes first
        for (let i = shapes.length - 1; i >= 0; i--) {
            const shape = shapes[i];
            if (shape.type === 'rectangle') {
                const hit = x >= shape.x && x <= shape.x + shape.width &&
                           y >= shape.y && y <= shape.y + shape.height;
                if (hit) {
                    return { type: 'shape', index: i };
                }
            } else if (shape.type === 'reactComponent') {
                // HTML components have dedicated hit detection  
                if (this.isHTMLComponentHit(x, y, shape)) {
                    return { type: 'shape', index: i, subtype: 'htmlComponent' };
                }
            } else if (shape.type === 'circle') {
                const distance = Math.sqrt(
                    Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2)
                );
                if (distance <= shape.radius) {
                    return { type: 'shape', index: i };
                }
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                // Check if point is near the line (with tolerance for easier clicking)
                const tolerance = 5; // 5px tolerance for line clicking
                const lineLength = Math.sqrt(
                    Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2)
                );
                if (lineLength === 0) continue; // Degenerate line
                
                // Distance from point to line
                const A = x - shape.x1;
                const B = y - shape.y1;
                const C = shape.x2 - shape.x1;
                const D = shape.y2 - shape.y1;
                
                const dot = A * C + B * D;
                const len_sq = C * C + D * D;
                const param = dot / len_sq;
                
                let xx, yy;
                if (param < 0) {
                    xx = shape.x1;
                    yy = shape.y1;
                } else if (param > 1) {
                    xx = shape.x2;
                    yy = shape.y2;
                } else {
                    xx = shape.x1 + param * C;
                    yy = shape.y1 + param * D;
                }
                
                const distance = Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy));
                if (distance <= tolerance) {
                    return { type: 'shape', index: i };
                }
            }
        }
        
        // Check texts (text boxes)
        for (let i = texts.length - 1; i >= 0; i--) {
            const text = texts[i];
            // Check if point is within text box bounds
            if (x >= text.x && x <= text.x + text.width &&
                y >= text.y && y <= text.y + text.height) {
                return { type: 'text', index: i };
            }
        }
        
        // Check paths
        for (let i = paths.length - 1; i >= 0; i--) {
            const path = paths[i];
            for (let j = 0; j < path.length - 1; j++) {
                const p1 = path[j];
                const p2 = path[j + 1];
                const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                if (distance <= 5) {
                    return { type: 'path', index: i };
                }
            }
        }
        
        return null;
    }
    
    deleteSelectedElements() {
        // Sort selected elements by index in descending order to avoid index shifting issues
        const sortedElements = [...this.selectedElements].sort((a, b) => b.index - a.index);
        
        sortedElements.forEach(element => {
            if (element.type === 'path') {
                this.paths.splice(element.index, 1);
            } else if (element.type === 'shape') {
                this.shapes.splice(element.index, 1);
            } else if (element.type === 'text') {
                this.texts.splice(element.index, 1);
            } else if (element.type === 'nested-canvas') {
                const nestedCanvas = this.nestedCanvases[element.index];
                // Delete associated data
                if (nestedCanvas.id) {
                    this.nestedCanvasData.delete(nestedCanvas.id);
                }
                this.nestedCanvases.splice(element.index, 1);
            }
        });
        
        this.selectedElements = [];
        this.hoveredElement = null;
        this.redrawCanvas();
        this.updateCanvasCursor();
    }
    
    copySelectedElements() {
        this.clipboard = [];
        
        this.selectedElements.forEach(element => {
            if (element.type === 'path') {
                const originalPath = this.paths[element.index];
                // Deep copy the path
                this.clipboard.push({
                    type: 'path',
                    data: originalPath.map(point => ({ x: point.x, y: point.y }))
                });
            } else if (element.type === 'shape') {
                const originalShape = this.shapes[element.index];
                // Deep copy the shape
                this.clipboard.push({
                    type: 'shape',
                    data: { ...originalShape }
                });
            } else if (element.type === 'text') {
                const originalText = this.texts[element.index];
                // Deep copy the text
                this.clipboard.push({
                    type: 'text',
                    data: { ...originalText }
                });
            } else if (element.type === 'nested-canvas') {
                const originalNestedCanvas = canvasContext.nestedCanvases[element.index];
                // Deep copy the nested canvas
                this.clipboard.push({
                    type: 'nested-canvas',
                    data: { ...originalNestedCanvas },
                    nestedData: this.nestedCanvasData.get(originalNestedCanvas.id) || {
                        paths: [],
                        shapes: [],
                        texts: [],
                        camera: { x: 0, y: 0, zoom: 1 }
                    }
                });
            }
        });
        
    }
    
    cutSelectedElements() {
        // Copy elements first
        this.copySelectedElements();
        // Then delete them
        this.deleteSelectedElements();
    }
    
    pasteElements() {
        // Clear current selection
        this.selectedElements = [];
        
        // Paste with offset to avoid overlapping
        const offset = 20;
        
        this.clipboard.forEach(item => {
            if (item.type === 'path') {
                // Create new path with offset
                const newPath = item.data.map(point => ({
                    x: point.x + offset,
                    y: point.y + offset
                }));
                this.paths.push(newPath);
                // Select the new path
                this.selectedElements.push({
                    type: 'path',
                    index: this.paths.length - 1
                });
            } else if (item.type === 'shape') {
                // Create new shape with offset
                const newShape = {
                    ...item.data,
                    x: item.data.x + offset,
                    y: item.data.y + offset
                };
                this.shapes.push(newShape);
                // Select the new shape
                this.selectedElements.push({
                    type: 'shape',
                    index: this.shapes.length - 1
                });
            } else if (item.type === 'text') {
                // Create new text with offset
                const newText = {
                    ...item.data,
                    x: item.data.x + offset,
                    y: item.data.y + offset
                };
                this.texts.push(newText);
                // Select the new text
                this.selectedElements.push({
                    type: 'text',
                    index: this.texts.length - 1
                });
            } else if (item.type === 'nested-canvas') {
                // Create new nested canvas with offset and new ID
                const newNestedCanvasId = 'nested_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
                const newNestedCanvas = {
                    ...item.data,
                    id: newNestedCanvasId,
                    x: item.data.x + offset,
                    y: item.data.y + offset
                };
                this.nestedCanvases.push(newNestedCanvas);
                
                // Copy the nested data with the new ID
                if (item.nestedData) {
                    this.nestedCanvasData.set(newNestedCanvasId, {
                        ...item.nestedData
                    });
                }
                
                // Select the new nested canvas
                this.selectedElements.push({
                    type: 'nested-canvas',
                    index: this.nestedCanvases.length - 1
                });
            }
        });
        
        this.redrawCanvas();
        this.updateCanvasCursor();
    }
    
    drawPreviewShape(canvasContext, startX, startY, endX, endY) {
        canvasContext.ctx.strokeStyle = '#3b82f6';
        canvasContext.ctx.setLineDash([5, 5]);
        
        if (this.currentTool === 'rectangle') {
            const width = endX - startX;
            const height = endY - startY;
            canvasContext.ctx.strokeRect(startX, startY, width, height);
        } else if (this.currentTool === 'circle') {
            // Calculate circle that fits in the bounding box from start to end
            const centerX = (startX + endX) / 2;
            const centerY = (startY + endY) / 2;
            const radius = Math.sqrt(
                Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
            ) / 2;
            // Circle preview
            canvasContext.ctx.beginPath();
            canvasContext.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
            canvasContext.ctx.stroke();
        } else if (this.currentTool === 'line') {
            canvasContext.ctx.beginPath();
            canvasContext.ctx.moveTo(startX, startY);
            canvasContext.ctx.lineTo(endX, endY);
            canvasContext.ctx.stroke();
        } else if (this.currentTool === 'arrow') {
            // Draw the main line
            canvasContext.ctx.beginPath();
            canvasContext.ctx.moveTo(startX, startY);
            canvasContext.ctx.lineTo(endX, endY);
            canvasContext.ctx.stroke();
            
            // Draw arrowhead
            const arrowSize = 10;
            const angle = Math.atan2(endY - startY, endX - startX);
            
            // Draw arrowhead lines
            canvasContext.ctx.beginPath();
            canvasContext.ctx.moveTo(endX, endY);
            canvasContext.ctx.lineTo(
                endX - arrowSize * Math.cos(angle - Math.PI / 6),
                endY - arrowSize * Math.sin(angle - Math.PI / 6)
            );
            canvasContext.ctx.moveTo(endX, endY);
            canvasContext.ctx.lineTo(
                endX - arrowSize * Math.cos(angle + Math.PI / 6),
                endY - arrowSize * Math.sin(angle + Math.PI / 6)
            );
            canvasContext.ctx.stroke();
        } else if (this.currentTool === 'nested-canvas') {
            const width = endX - startX;
            const height = endY - startY;
            
            // Draw outer frame
            canvasContext.ctx.strokeRect(startX, startY, width, height);
            
            // Draw nested canvas preview indicator
            canvasContext.ctx.save();
            canvasContext.ctx.setLineDash([]);
            canvasContext.ctx.strokeStyle = '#3b82f6';
            canvasContext.ctx.fillStyle = 'rgba(59, 130, 246, 0.1)';
            canvasContext.ctx.fillRect(startX, startY, width, height);
            
            // Draw icon in center if shape is large enough
            if (Math.abs(width) > 40 && Math.abs(height) > 40) {
                const centerX = startX + width / 2;
                const centerY = startY + height / 2;
                const iconSize = Math.min(24, Math.min(Math.abs(width), Math.abs(height)) / 3);
                
                canvasContext.ctx.strokeRect(centerX - iconSize/2, centerY - iconSize/2 - 5, iconSize, iconSize);
                
                canvasContext.ctx.fillStyle = '#3b82f6';
                canvasContext.ctx.font = '12px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
                canvasContext.ctx.textAlign = 'center';
                canvasContext.ctx.textBaseline = 'middle';
                canvasContext.ctx.fillText('Canvas', centerX, centerY + 10);
            }
            
            canvasContext.ctx.restore();
        }
        
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#333';
    }
    
    updateSelectionBox(startCanvasX, startCanvasY, currentCanvasX, currentCanvasY, canvasContext = this.activeCanvasContext) {
        // Convert canvas coordinates to world coordinates for proper selection box positioning
        const startWorld = this.canvasToWorld(startCanvasX, startCanvasY, canvasContext);
        const currentWorld = this.canvasToWorld(currentCanvasX, currentCanvasY, canvasContext);
        
        // Calculate selection box dimensions in world coordinates
        const worldX = Math.min(startWorld.x, currentWorld.x);
        const worldY = Math.min(startWorld.y, currentWorld.y);
        const worldWidth = Math.abs(currentWorld.x - startWorld.x);
        const worldHeight = Math.abs(currentWorld.y - startWorld.y);
        
        // Show the selection box using world coordinates and context
        this.showSelectionBox(worldX, worldY, worldWidth, worldHeight, canvasContext);
    }
    
    showSelectionBox(worldX, worldY, worldWidth, worldHeight, canvasContext = this.activeCanvasContext) {
        // Use the appropriate selection box based on canvas context
        const isNestedCanvas = canvasContext === this.nestedCanvasContext;
        const selectionBox = isNestedCanvas ? 
            document.getElementById('nested-selection-box') : 
            this.selectionBox;
            
        if (!selectionBox) return;
        
        // Convert world coordinates to screen coordinates for the selection box using provided context
        const topLeft = this.worldToCanvas(worldX, worldY, canvasContext);
        const bottomRight = this.worldToCanvas(worldX + worldWidth, worldY + worldHeight, canvasContext);
        
        // Get canvas position for absolute positioning
        const canvas = canvasContext.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        
        const screenLeft = Math.min(topLeft.x, bottomRight.x);
        const screenTop = Math.min(topLeft.y, bottomRight.y);
        const screenWidth = Math.abs(bottomRight.x - topLeft.x);
        const screenHeight = Math.abs(bottomRight.y - topLeft.y);
        
        // Only show selection box if it's larger than a few pixels (not just a click)
        if (screenWidth < 3 && screenHeight < 3) {
            selectionBox.style.display = 'none';
            return;
        }
        
        selectionBox.style.display = 'block';
        
        if (isNestedCanvas) {
            // For nested canvas, position relative to the nested canvas container (no viewport offset needed)
            selectionBox.style.left = screenLeft + 'px';
            selectionBox.style.top = screenTop + 'px';
        } else {
            // For main canvas, position relative to the canvas container (no viewport offset needed)
            selectionBox.style.left = screenLeft + 'px';
            selectionBox.style.top = screenTop + 'px';
        }
        
        selectionBox.style.width = screenWidth + 'px';
        selectionBox.style.height = screenHeight + 'px';
        selectionBox.style.zIndex = '1000';
    }
    
    hideSelectionBox(canvasContext = this.activeCanvasContext) {
        // Hide the appropriate selection box based on canvas context
        const isNestedCanvas = canvasContext === this.nestedCanvasContext;
        const selectionBox = isNestedCanvas ? 
            document.getElementById('nested-selection-box') : 
            this.selectionBox;
            
        if (selectionBox) {
            selectionBox.style.display = 'none';
        }
    }
    
    handleHover(pos) {
        // Check for resize handles first if elements are selected
        let newHoveredResizeHandle = null;
        if (this.selectedElements.length > 0) {
            newHoveredResizeHandle = this.getResizeHandleForContext(pos.x, pos.y, this.activeCanvasContext);
        }
        
        const hoveredElement = this.getElementAtPoint(pos.x, pos.y);
        
        // Compare elements properly - check if they're the same type and index
        const isSameElement = (a, b) => {
            if (!a && !b) return true;
            if (!a || !b) return false;
            return a.type === b.type && a.index === b.index;
        };
        
        // Check if either element hover or resize handle hover changed
        if (!isSameElement(hoveredElement, this.hoveredElement) || newHoveredResizeHandle !== this.hoveredResizeHandle) {
            // console.log('[HOVER] Hover changed from', this.hoveredElement, 'to', hoveredElement, 'resize handle:', newHoveredResizeHandle);
            
            // If hovering over a resize handle, clear element hover to prevent grab cursor
            if (newHoveredResizeHandle) {
                this.hoveredElement = null;
            } else {
                this.hoveredElement = hoveredElement;
            }
            
            this.hoveredResizeHandle = newHoveredResizeHandle;
            this.redrawCanvas();
            this.updateCanvasCursor();
        }
    }
    
    getElementAtPoint(x, y) {
        // Check nested canvases first (they're on top)
        for (let i = this.nestedCanvases.length - 1; i >= 0; i--) {
            const nestedCanvas = this.nestedCanvases[i];
            const hit = x >= nestedCanvas.x && x <= nestedCanvas.x + nestedCanvas.width &&
                       y >= nestedCanvas.y && y <= nestedCanvas.y + nestedCanvas.height;
            if (hit) {
                return { type: 'nested-canvas', index: i };
            }
        }
        
        // Check shapes (they're on top after nested canvases)
        for (let i = this.shapes.length - 1; i >= 0; i--) {
            const shape = this.shapes[i];
            if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                const hit = x >= shape.x && x <= shape.x + shape.width &&
                           y >= shape.y && y <= shape.y + shape.height;
                if (hit) {
                    return { type: 'shape', index: i };
                }
            } else if (shape.type === 'circle') {
                const distance = Math.sqrt(
                    Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2)
                );
                if (distance <= shape.radius) {
                    return { type: 'shape', index: i };
                }
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                // Check if point is near the line (with tolerance for easier clicking)
                const tolerance = 5; // 5px tolerance for line clicking
                const lineLength = Math.sqrt(
                    Math.pow(shape.x2 - shape.x1, 2) + Math.pow(shape.y2 - shape.y1, 2)
                );
                if (lineLength === 0) continue; // Degenerate line
                
                // Distance from point to line
                const A = x - shape.x1;
                const B = y - shape.y1;
                const C = shape.x2 - shape.x1;
                const D = shape.y2 - shape.y1;
                
                const dot = A * C + B * D;
                const len_sq = C * C + D * D;
                const param = dot / len_sq;
                
                let xx, yy;
                if (param < 0) {
                    xx = shape.x1;
                    yy = shape.y1;
                } else if (param > 1) {
                    xx = shape.x2;
                    yy = shape.y2;
                } else {
                    xx = shape.x1 + param * C;
                    yy = shape.y1 + param * D;
                }
                
                const distance = Math.sqrt((x - xx) * (x - xx) + (y - yy) * (y - yy));
                if (distance <= tolerance) {
                    return { type: 'shape', index: i };
                }
            }
        }
        
        // Check texts (text boxes)
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const text = this.texts[i];
            // Check if point is within text box bounds
            if (x >= text.x && x <= text.x + text.width &&
                y >= text.y && y <= text.y + text.height) {
                return { type: 'text', index: i };
            }
        }
        
        // Check paths (more complex hit testing)
        for (let i = this.paths.length - 1; i >= 0; i--) {
            const path = this.paths[i];
            for (let j = 0; j < path.length - 1; j++) {
                const p1 = path[j];
                const p2 = path[j + 1];
                const distance = this.distanceToLineSegment(x, y, p1.x, p1.y, p2.x, p2.y);
                if (distance <= 5) { // 5px tolerance
                    // Path detected at hover
                    return { type: 'path', index: i };
                }
            }
        }
        
        return null;
    }
    
    distanceToLineSegment(px, py, x1, y1, x2, y2) {
        const A = px - x1;
        const B = py - y1;
        const C = x2 - x1;
        const D = y2 - y1;
        
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) {
            param = dot / lenSq;
        }
        
        let xx, yy;
        if (param < 0) {
            xx = x1;
            yy = y1;
        } else if (param > 1) {
            xx = x2;
            yy = y2;
        } else {
            xx = x1 + param * C;
            yy = y1 + param * D;
        }
        
        const dx = px - xx;
        const dy = py - yy;
        return Math.sqrt(dx * dx + dy * dy);
    }

    // Get elements that would be selected in the given area (without actually selecting them)
    getElementsInArea(x1, y1, x2, y2, canvasContext = this.activeCanvasContext) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        const previewElements = [];
        const { paths, shapes, texts, nestedCanvases } = canvasContext;
        
        // Check paths
        paths.forEach((path, index) => {
            const inSelection = path.some(point => 
                point.x >= minX && point.x <= maxX && 
                point.y >= minY && point.y <= maxY
            );
            if (inSelection) {
                previewElements.push({ type: 'path', index });
            }
        });
        
        // Check shapes
        shapes.forEach((shape, index) => {
            let inSelection = false;
            if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                // Check if rectangles intersect (more permissive - any overlap)
                const rectRight = shape.x + shape.width;
                const rectBottom = shape.y + shape.height;
                inSelection = !(rectRight < minX || shape.x > maxX || 
                               rectBottom < minY || shape.y > maxY);
            } else if (shape.type === 'circle') {
                // Check if circle center is within selection or circle intersects
                const centerInSelection = shape.x >= minX && shape.x <= maxX && 
                                        shape.y >= minY && shape.y <= maxY;
                if (centerInSelection) {
                    inSelection = true;
                } else {
                    // Check if circle intersects with selection rectangle
                    const closestX = Math.max(minX, Math.min(shape.x, maxX));
                    const closestY = Math.max(minY, Math.min(shape.y, maxY));
                    const distance = Math.sqrt(
                        Math.pow(shape.x - closestX, 2) + Math.pow(shape.y - closestY, 2)
                    );
                    inSelection = distance <= shape.radius;
                }
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                // Check if line/arrow is within selection area or intersects with it
                const lineMinX = Math.min(shape.x1, shape.x2);
                const lineMaxX = Math.max(shape.x1, shape.x2);
                const lineMinY = Math.min(shape.y1, shape.y2);
                const lineMaxY = Math.max(shape.y1, shape.y2);
                
                // Check if line bounding box intersects with selection rectangle
                inSelection = !(lineMaxX < minX || lineMinX > maxX || 
                               lineMaxY < minY || lineMinY > maxY);
            } else if (shape.type === 'reactComponent') {
                // Handle React component shapes like rectangles
                const rectRight = shape.x + shape.width;
                const rectBottom = shape.y + shape.height;
                inSelection = !(rectRight < minX || shape.x > maxX || 
                               rectBottom < minY || shape.y > maxY);
            }
            if (inSelection) {
                previewElements.push({ type: 'shape', index });
            }
        });
        
        // Check texts
        texts.forEach((text, index) => {
            if (text.x >= minX && text.x <= maxX && 
                text.y >= minY && text.y <= maxY) {
                previewElements.push({ type: 'text', index });
            }
        });
        
        // Check nested canvases (only for main canvas context)
        if (canvasContext === this.mainCanvasContext) {
            nestedCanvases.forEach((nestedCanvas, index) => {
                // Check if nested canvas intersects with selection rectangle
                const rectRight = nestedCanvas.x + nestedCanvas.width;
                const rectBottom = nestedCanvas.y + nestedCanvas.height;
                const inSelection = !(rectRight < minX || nestedCanvas.x > maxX || 
                                     rectBottom < minY || nestedCanvas.y > maxY);
                if (inSelection) {
                    previewElements.push({ type: 'nested-canvas', index });
                }
            });
        }
        
        return previewElements;
    }

    selectElementsInArea(x1, y1, x2, y2) {
        // Coordinates are already in world coordinates from getMousePos()
        const startWorld = {x: x1, y: y1};
        const endWorld = {x: x2, y: y2};
        
        
        const previewElements = this.getElementsInArea(startWorld.x, startWorld.y, endWorld.x, endWorld.y, this.activeCanvasContext);
        
        this.activeCanvasContext.selectedElements = previewElements;
        
        this.updateCanvasCursor();
        this.redrawCanvas();
        this.notifySelectionChange();
    }
    
    redrawCanvas(canvasContext = this.activeCanvasContext) {
        // Prevent infinite redraw loops
        if (this.isRedrawing) {
            this.redrawRequested = true;
            return;
        }
        
        this.isRedrawing = true;
        
        try {
            // Execute beforeRedraw hooks
            this.executeHooks('beforeRedraw', canvasContext);
            
            this._performRedraw(canvasContext);
            
            // Execute afterRedraw hooks
            this.executeHooks('afterRedraw', canvasContext);
            
        } finally {
            this.isRedrawing = false;
            
            // Handle any redraw requests that came in during this cycle
            if (this.redrawRequested) {
                this.redrawRequested = false;
                // Use requestAnimationFrame to avoid stack overflow
                requestAnimationFrame(() => this.redrawCanvas(canvasContext));
            }
        }
    }
    
    _performRedraw(canvasContext = this.activeCanvasContext) {
        const { canvas, ctx, camera, paths, shapes, texts, nestedCanvases, selectedElements, previewSelectedElements, hoveredElement, currentPath } = canvasContext;
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw infinite grid background (for all canvases)
        this.drawGrid(canvasContext);
        
        // Apply camera transformation via Canvas2D transforms (simpler and more reliable)
        this.applyCSSTransform(canvasContext);
        
        // Apply Canvas2D transforms for camera
        ctx.save();
        ctx.translate(canvas.width / 2, canvas.height / 2); // Center the canvas
        ctx.scale(camera.zoom, camera.zoom);                // Apply zoom
        ctx.translate(camera.x, camera.y);                  // Apply camera offset
        
        // Draw paths (only those on main layer)
        paths.forEach((path, index) => {
            // Skip paths assigned to higher layers
            if (path._layerZIndex && path._layerZIndex > 10) {
                return;
            }
            
            const isHovered = hoveredElement && 
                             hoveredElement.type === 'path' && 
                             hoveredElement.index === index;
            const isSelected = selectedElements.some(sel => 
                              sel.type === 'path' && sel.index === index);
            const isPreviewSelected = previewSelectedElements && previewSelectedElements.some(sel => 
                              sel.type === 'path' && sel.index === index);
            
            // Priority: Selected (red) > Hovered (blue) > Preview Selected (orange) > Default (gray)
            ctx.strokeStyle = isSelected ? '#ef4444' : 
                             (isHovered ? '#3b82f6' : 
                             (isPreviewSelected ? '#f97316' : '#333'));
            ctx.lineWidth = (isSelected || isHovered || isPreviewSelected) ? 3 : 2;
            
            if (path.length > 0) {
                ctx.beginPath();
                ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    ctx.lineTo(path[i].x, path[i].y);
                }
                ctx.stroke();
            }
        });
        
        // Draw current path being drawn
        if (currentPath.length > 0) {
            ctx.strokeStyle = '#333';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.moveTo(currentPath[0].x, currentPath[0].y);
            for (let i = 1; i < currentPath.length; i++) {
                ctx.lineTo(currentPath[i].x, currentPath[i].y);
            }
            ctx.stroke();
        }
        
        // Draw shapes (only those on main layer)
        shapes.forEach((shape, index) => {
            const isHovered = hoveredElement && 
                             hoveredElement.type === 'shape' && 
                             hoveredElement.index === index;
            const isSelected = selectedElements.some(sel => 
                              sel.type === 'shape' && sel.index === index);
            const isPreviewSelected = previewSelectedElements && previewSelectedElements.some(sel => 
                              sel.type === 'shape' && sel.index === index);
            
            // For HTML components, just update z-index and skip canvas drawing
            if (shape.type === 'reactComponent') {
                this.renderHTMLComponent(ctx, shape, isSelected, isPreviewSelected, index);
                return;
            }
            
            // Skip canvas shapes assigned to higher layers
            if (shape._layerZIndex && shape._layerZIndex > 10) {
                return;
            }
            
            // Draw fill for shapes that have fillColor
            if (shape.fillColor && shape.fillColor !== 'transparent') {
                ctx.fillStyle = shape.fillColor;
                if (shape.type === 'rectangle') {
                    ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
                } else if (shape.type === 'circle') {
                    ctx.beginPath();
                    ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                    ctx.fill();
                }
                // Lines and arrows don't have fill, only stroke
            }
            
            // Draw stroke/outline for shapes (always draw stroke for visibility)
            const shouldDrawStroke = true; // Always draw stroke so shapes are visible
            
            if (shouldDrawStroke) {
                // Priority: Selected (red) > Hovered (blue) > Preview Selected (orange) > Shape's strokeColor > Default (gray)
                ctx.strokeStyle = isSelected ? '#ef4444' : 
                                 (isHovered ? '#3b82f6' : 
                                 (isPreviewSelected ? '#f97316' : 
                                 (shape.strokeColor || '#333')));
                ctx.lineWidth = (isSelected || isHovered || isPreviewSelected) ? 3 : 2;
                
                ctx.beginPath();
                if (shape.type === 'rectangle') {
                    ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                } else if (shape.type === 'circle') {
                    ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                    ctx.stroke();
                } else if (shape.type === 'line') {
                    ctx.moveTo(shape.x1, shape.y1);
                    ctx.lineTo(shape.x2, shape.y2);
                    ctx.stroke();
                } else if (shape.type === 'arrow') {
                    // Draw the main line
                    ctx.moveTo(shape.x1, shape.y1);
                    ctx.lineTo(shape.x2, shape.y2);
                    ctx.stroke();
                    
                    // Draw arrowhead
                    const arrowSize = shape.arrowSize || 10;
                    const angle = Math.atan2(shape.y2 - shape.y1, shape.x2 - shape.x1);
                    
                    // Draw arrowhead lines
                    ctx.beginPath();
                    ctx.moveTo(shape.x2, shape.y2);
                    ctx.lineTo(
                        shape.x2 - arrowSize * Math.cos(angle - Math.PI / 6),
                        shape.y2 - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    ctx.moveTo(shape.x2, shape.y2);
                    ctx.lineTo(
                        shape.x2 - arrowSize * Math.cos(angle + Math.PI / 6),
                        shape.y2 - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    ctx.stroke();
                }
            }
        });
        
        // Draw texts (only those on main layer)
        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        texts.forEach((textObj, index) => {
            if (textObj.isEditing) return; // Don't render text that's being edited
            
            // Skip texts assigned to higher layers
            if (textObj._layerZIndex && textObj._layerZIndex > 10) {
                return;
            }
            
            const isHovered = hoveredElement && 
                             hoveredElement.type === 'text' && 
                             hoveredElement.index === index;
            const isSelected = selectedElements.some(sel => 
                              sel.type === 'text' && sel.index === index);
            const isPreviewSelected = previewSelectedElements && previewSelectedElements.some(sel => 
                              sel.type === 'text' && sel.index === index);
            
            // Draw text box background
            if (isSelected || isHovered || isPreviewSelected) {
                ctx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.1)' : 
                               (isHovered ? 'rgba(59, 130, 246, 0.1)' : 
                               'rgba(249, 115, 22, 0.1)'); // Orange for preview
                ctx.fillRect(textObj.x, textObj.y, textObj.width, textObj.height);
                
                // Draw border
                ctx.strokeStyle = isSelected ? '#ef4444' : 
                                 (isHovered ? '#3b82f6' : '#f97316'); // Orange for preview
                ctx.lineWidth = 2;
                ctx.strokeRect(textObj.x, textObj.y, textObj.width, textObj.height);
            }
            
            // Draw text
            if (textObj.text) {
                ctx.fillStyle = textObj.color || '#333';
                ctx.font = `${textObj.fontSize}px ${textObj.fontFamily}`;
                
                // Multi-line text rendering
                const lines = textObj.text.split('\n');
                const lineHeight = textObj.fontSize * 1.2;
                
                lines.forEach((line, lineIndex) => {
                    ctx.fillText(
                        line, 
                        textObj.x + 6, // Small padding
                        textObj.y + textObj.fontSize + (lineIndex * lineHeight) + 6
                    );
                });
            }
            
            // Draw placeholder if empty and selected
            if (!textObj.text && isSelected) {
                ctx.fillStyle = '#999';
                ctx.font = `${textObj.fontSize}px ${textObj.fontFamily}`;
                ctx.fillText('Double-click to edit', textObj.x + 6, textObj.y + textObj.fontSize + 6);
            }
        });
        
        // Draw preview shape if currently drawing rectangle, circle, nested-canvas, line, or arrow
        if ((this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'nested-canvas' || this.currentTool === 'line' || this.currentTool === 'arrow') && 
            this.isDrawing && this.previewStartX !== undefined) {
            this.drawPreviewShape(canvasContext, this.previewStartX, this.previewStartY, this.previewEndX, this.previewEndY);
        }
        
        // Draw nested canvases (before restoring context so they get camera transformation)
        nestedCanvases.forEach((nestedCanvas, index) => {
            const isHovered = hoveredElement && 
                             hoveredElement.type === 'nested-canvas' && 
                             hoveredElement.index === index;
            const isSelected = selectedElements.some(sel => 
                              sel.type === 'nested-canvas' && sel.index === index);
            const isPreviewSelected = previewSelectedElements && previewSelectedElements.some(sel => 
                              sel.type === 'nested-canvas' && sel.index === index);
            
            // Draw the nested canvas frame
            // Priority: Selected (red) > Hovered (blue) > Preview Selected (orange) > Default (gray)
            ctx.strokeStyle = isSelected ? '#ef4444' : 
                             (isHovered ? '#3b82f6' : 
                             (isPreviewSelected ? '#f97316' : '#666'));
            ctx.lineWidth = (isSelected || isHovered || isPreviewSelected) ? 3 : 2;
            ctx.fillStyle = '#f8f9fa';
            
            ctx.fillRect(nestedCanvas.x, nestedCanvas.y, nestedCanvas.width, nestedCanvas.height);
            ctx.strokeRect(nestedCanvas.x, nestedCanvas.y, nestedCanvas.width, nestedCanvas.height);
            
            // Draw nested canvas icon/placeholder
            ctx.save();
            ctx.fillStyle = '#6b7280';
            ctx.font = '16px -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            const centerX = nestedCanvas.x + nestedCanvas.width / 2;
            const centerY = nestedCanvas.y + nestedCanvas.height / 2;
            
            // Draw canvas icon
            const iconSize = Math.min(32, Math.min(Math.abs(nestedCanvas.width), Math.abs(nestedCanvas.height)) / 3);
            ctx.strokeStyle = '#6b7280';
            ctx.lineWidth = 2;
            ctx.strokeRect(centerX - iconSize/2, centerY - iconSize/2 - 10, iconSize, iconSize);
            
            // Draw "Canvas" text
            ctx.fillText('Canvas', centerX, centerY + 15);
            ctx.restore();
        });
        
        // Don't draw resize handles here - they'll be drawn on the appropriate layer
        
        // Restore context before drawing UI elements
        ctx.restore();
        
        // Update HTML component positions and clean up removed ones
        if (canvasContext === this.activeCanvasContext) {
            this.cleanupHTMLComponents(shapes);
            this.updateAllHTMLComponents(canvasContext.camera);
            
            // Render additional canvas layers for unified layering
            if (this.canvasLayers && this.additionalCanvasLayers && !this.isRenderingLayers) {
                this.isRenderingLayers = true;
                try {
                    this.canvasLayers.forEach((elements, layerZIndex) => {
                        if (layerZIndex > 10 && this.additionalCanvasLayers.has(layerZIndex)) {
                            const layer = this.additionalCanvasLayers.get(layerZIndex);
                            this.renderElementsOnLayer(layer.ctx, elements, canvasContext);
                        }
                    });
                } finally {
                    this.isRenderingLayers = false;
                }
            }
            
            // Draw resize handles on main canvas after all layers
            // Apply transform to draw handles in correct position
            const { ctx, camera, canvas } = canvasContext;
            ctx.save();
            ctx.translate(canvas.width / 2, canvas.height / 2);
            ctx.scale(camera.zoom, camera.zoom);
            ctx.translate(camera.x, camera.y);
            this.drawResizeHandles(canvasContext);
            ctx.restore();
        }
    }
    
    drawGrid(canvasContext) {
        const { canvas, ctx, camera } = canvasContext;
        
        const gridSize = 50; // Grid size in world units
        const screenGridSize = gridSize * camera.zoom;
        
        // Only draw if grid is visible (not too small)
        if (screenGridSize < 4) {
            return;
        }
        
        // Calculate opacity based on grid size
        const opacity = Math.min(0.15, Math.max(0.03, screenGridSize / 200));
        ctx.strokeStyle = `rgba(150, 150, 150, ${opacity})`;
        ctx.lineWidth = 1;
        
        // Calculate world bounds that need to be covered by the grid
        // Convert screen edges to world coordinates
        const worldLeft = -camera.x;
        const worldRight = (canvas.width / camera.zoom) - camera.x;
        const worldTop = -camera.y;
        const worldBottom = (canvas.height / camera.zoom) - camera.y;
        
        // Add margin to ensure full coverage
        const margin = gridSize * 2;
        const startX = Math.floor((worldLeft - margin) / gridSize) * gridSize;
        const endX = Math.ceil((worldRight + margin) / gridSize) * gridSize;
        const startY = Math.floor((worldTop - margin) / gridSize) * gridSize;
        const endY = Math.ceil((worldBottom + margin) / gridSize) * gridSize;
        
        // Draw grid lines in screen space without camera transformation
        ctx.save();
        ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        ctx.beginPath();
        
        // Draw origin marker at world (0,0) if enabled (for testing)
        if (this.showOriginMarker) {
            // Transform world origin (0,0) to screen coordinates
            const originScreenX = (0 + camera.x) * camera.zoom;
            const originScreenY = (0 + camera.y) * camera.zoom;
            
            // Draw a red cross at the origin
            ctx.strokeStyle = '#ff0000';
            ctx.lineWidth = 3;
            const crossSize = 20;
            
            // Horizontal line
            ctx.moveTo(originScreenX - crossSize, originScreenY);
            ctx.lineTo(originScreenX + crossSize, originScreenY);
            
            // Vertical line  
            ctx.moveTo(originScreenX, originScreenY - crossSize);
            ctx.lineTo(originScreenX, originScreenY + crossSize);
            
            ctx.stroke();
            
            // Draw a small red square at the exact origin
            ctx.fillStyle = '#ff0000';
            ctx.fillRect(originScreenX - 3, originScreenY - 3, 6, 6);
        }
        
        // Reset stroke style for grid
        ctx.strokeStyle = `rgba(150, 150, 150, ${opacity})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            const screenX = (x + camera.x) * camera.zoom;
            // Only draw lines that are at least partially visible
            if (screenX >= -2 && screenX <= canvas.width + 2) {
                ctx.moveTo(screenX, 0);
                ctx.lineTo(screenX, canvas.height);
            }
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            const screenY = (y + camera.y) * camera.zoom;
            // Only draw lines that are at least partially visible
            if (screenY >= -2 && screenY <= canvas.height + 2) {
                ctx.moveTo(0, screenY);
                ctx.lineTo(canvas.width, screenY);
            }
        }
        
        ctx.stroke();
        ctx.restore();
    }
    
    drawResizeHandles(canvasContext) {
        // console.log('[DRAW-HANDLES] Drawing resize handles, selected elements:', canvasContext.selectedElements.length);
        if (canvasContext.selectedElements.length !== 1) {
            // console.log('[DRAW-HANDLES] Not drawing handles - wrong selection count:', canvasContext.selectedElements.length);
            return; // Only show handles for single selection
        }
        
        // Check if selected element is in edit mode - if so, hide resize handles
        const element = canvasContext.selectedElements[0];
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'reactComponent' && this.editingComponentId === shape.id) {
                // Component is in edit mode - don't draw resize handles
                return;
            }
        }
        let bounds = null;
        
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
            } else if (shape.type === 'circle') {
                // Draw circle-specific resize handles - 4 handles on circumference
                const handleSize = 8;
                canvasContext.ctx.fillStyle = '#3b82f6'; // Blue
                canvasContext.ctx.strokeStyle = '#ffffff'; // White border
                canvasContext.ctx.lineWidth = 2;
                
                // Draw 4 handles at cardinal points on the circumference
                const handles = [
                    { x: shape.x, y: shape.y - shape.radius }, // top
                    { x: shape.x + shape.radius, y: shape.y }, // right  
                    { x: shape.x, y: shape.y + shape.radius }, // bottom
                    { x: shape.x - shape.radius, y: shape.y }  // left
                ];
                
                handles.forEach(handle => {
                    canvasContext.ctx.fillRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
                    canvasContext.ctx.strokeRect(handle.x - handleSize/2, handle.y - handleSize/2, handleSize, handleSize);
                });
                
                return; // Early return since we handled circle drawing
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                // For lines and arrows, draw endpoint handles and middle drag handle
                const handleSize = 8;
                const middleHandleSize = 6;
                
                canvasContext.ctx.fillStyle = '#3b82f6'; // Blue
                canvasContext.ctx.strokeStyle = '#ffffff'; // White border
                canvasContext.ctx.lineWidth = 2;
                
                // Draw start point handle (square)
                canvasContext.ctx.fillRect(shape.x1 - handleSize/2, shape.y1 - handleSize/2, handleSize, handleSize);
                canvasContext.ctx.strokeRect(shape.x1 - handleSize/2, shape.y1 - handleSize/2, handleSize, handleSize);
                
                // Draw end point handle (square)
                canvasContext.ctx.fillRect(shape.x2 - handleSize/2, shape.y2 - handleSize/2, handleSize, handleSize);
                canvasContext.ctx.strokeRect(shape.x2 - handleSize/2, shape.y2 - handleSize/2, handleSize, handleSize);
                
                // Draw middle drag handle (circle) - for dragging the entire line
                const midX = (shape.x1 + shape.x2) / 2;
                const midY = (shape.y1 + shape.y2) / 2;
                canvasContext.ctx.beginPath();
                canvasContext.ctx.arc(midX, midY, middleHandleSize/2, 0, 2 * Math.PI);
                canvasContext.ctx.fill();
                canvasContext.ctx.stroke();
                
                return; // Early return since we handled line/arrow drawing
            } else if (shape.type === 'reactComponent') {
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
            }
        } else if (element.type === 'nested-canvas') {
            const nestedCanvas = canvasContext.nestedCanvases[element.index];
            bounds = {
                x: nestedCanvas.x,
                y: nestedCanvas.y,
                width: nestedCanvas.width,
                height: nestedCanvas.height
            };
        } else if (element.type === 'text') {
            const text = canvasContext.texts[element.index];
            bounds = {
                x: text.x,
                y: text.y,
                width: text.width,
                height: text.height
            };
        }
        
        if (bounds) {
            // console.log('[DRAW-HANDLES] Drawing handles for bounds:', bounds);
            // Draw handles in world space (with camera transformations applied)
            canvasContext.ctx.fillStyle = '#3b82f6'; // Blue
            canvasContext.ctx.strokeStyle = '#ffffff'; // White border
            canvasContext.ctx.lineWidth = 2; // Use base line width, canvas transform handles scaling
            
            // Handle size in world coordinates - use base size, canvas transform handles scaling
            const handleSize = 8;
            
            // Draw corner handles
            const handles = [
                { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2, type: 'nw' },
                { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2, type: 'ne' },
                { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 'sw' },
                { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 'se' },
                { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2, type: 'n' },
                { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 's' },
                { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, type: 'w' },
                { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, type: 'e' }
            ];
            
            handles.forEach(handle => {
                canvasContext.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
                canvasContext.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
            });
        }
    }
    
    getResizeHandle(worldX, worldY) {
        if (this.selectedElements.length !== 1) return null;
        
        const element = this.selectedElements[0];
        let bounds = null;
        
        if (element.type === 'shape') {
            const shape = this.shapes[element.index];
            if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
            } else if (shape.type === 'circle') {
                // For circles, check if click is near any of the 4 cardinal points on circumference
                const tolerance = 10;
                
                const handles = [
                    { x: shape.x, y: shape.y - shape.radius }, // top
                    { x: shape.x + shape.radius, y: shape.y }, // right
                    { x: shape.x, y: shape.y + shape.radius }, // bottom
                    { x: shape.x - shape.radius, y: shape.y }  // left
                ];
                
                for (const handle of handles) {
                    const distance = Math.sqrt(
                        Math.pow(worldX - handle.x, 2) + Math.pow(worldY - handle.y, 2)
                    );
                    if (distance <= tolerance) {
                        return 'circle'; // Return special circle handle type
                    }
                }
                
                return null; // Not near any handle
            } else if (shape.type === 'reactComponent') {
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
            }
        } else if (element.type === 'nested-canvas') {
            const nestedCanvas = this.activeCanvasContext.nestedCanvases[element.index];
            bounds = {
                x: nestedCanvas.x,
                y: nestedCanvas.y,
                width: nestedCanvas.width,
                height: nestedCanvas.height
            };
        }
        
        if (!bounds) return null;
        
        // Work in world coordinates (much simpler and more reliable)
        const handleSize = 8; // Handle size in world coordinates - canvas transform handles scaling
        const tolerance = 10; // 10px radius around resize handles for better touch/click area
        
        // Create handles in world coordinates matching the drawing function
        const handles = [
            { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2, type: 'nw' },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2, type: 'ne' },
            { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 'sw' },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 'se' },
            { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2, type: 'n' },
            { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 's' },
            { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, type: 'w' },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, type: 'e' }
        ];
        
        // Check if worldX, worldY is within any handle bounds
        for (let handle of handles) {
            if (worldX >= handle.x - tolerance && worldX <= handle.x + handleSize + tolerance &&
                worldY >= handle.y - tolerance && worldY <= handle.y + handleSize + tolerance) {
                return handle.type;
            }
        }
        
        // If not on a handle, check if hovering over container edges for edge resizing
        const edgeTolerance = 6; // 6px radius around edges for precise interaction
        
        // Check if near edges (but only allow resize from outside or very close to edge)
        const nearLeft = Math.abs(worldX - bounds.x) <= edgeTolerance;
        const nearRight = Math.abs(worldX - (bounds.x + bounds.width)) <= edgeTolerance;
        const nearTop = Math.abs(worldY - bounds.y) <= edgeTolerance;
        const nearBottom = Math.abs(worldY - (bounds.y + bounds.height)) <= edgeTolerance;
        
        // Only allow edge resizing if we're actually near an edge, not deep inside component
        const isNearAnyEdge = nearLeft || nearRight || nearTop || nearBottom;
        
        if (isNearAnyEdge) {
            // Corner resizing (prioritize corners over edges)
            if (nearLeft && nearTop) return 'nw';
            if (nearRight && nearTop) return 'ne'; 
            if (nearLeft && nearBottom) return 'sw';
            if (nearRight && nearBottom) return 'se';
            
            // Edge resizing - only if close to that specific edge
            if (nearLeft) return 'w';
            if (nearRight) return 'e';
            if (nearTop) return 'n';
            if (nearBottom) return 's';
        }
        
        return null;
    }
    
    performResize(currentX, currentY) {
        if (this.selectedElements.length !== 1 || !this.resizeHandle) return;
        
        const element = this.selectedElements[0];
        if (element.type !== 'shape' && element.type !== 'nested-canvas') return;
        
        const shape = element.type === 'shape' ? this.shapes[element.index] : this.activeCanvasContext.nestedCanvases[element.index];
        const deltaX = currentX - this.dragOffset.x;
        const deltaY = currentY - this.dragOffset.y;
        
        // Check if it's a rectangle shape, reactComponent shape, or a nested canvas (all are rectangular)
        if ((element.type === 'shape' && (shape.type === 'rectangle' || shape.type === 'reactComponent')) || element.type === 'nested-canvas') {
            switch (this.resizeHandle) {
                case 'nw': // top-left
                    shape.x += deltaX;
                    shape.y += deltaY;
                    shape.width -= deltaX;
                    shape.height -= deltaY;
                    break;
                case 'ne': // top-right
                    shape.y += deltaY;
                    shape.width += deltaX;
                    shape.height -= deltaY;
                    break;
                case 'sw': // bottom-left
                    shape.x += deltaX;
                    shape.width -= deltaX;
                    shape.height += deltaY;
                    break;
                case 'se': // bottom-right
                    shape.width += deltaX;
                    shape.height += deltaY;
                    break;
                case 'n': // top
                    shape.y += deltaY;
                    shape.height -= deltaY;
                    break;
                case 's': // bottom
                    shape.height += deltaY;
                    break;
                case 'w': // left
                    shape.x += deltaX;
                    shape.width -= deltaX;
                    break;
                case 'e': // right
                    shape.width += deltaX;
                    break;
            }
            
            // Apply constraints for reactComponent shapes based on content size with absolute limits
            if (element.type === 'shape' && shape.type === 'reactComponent' && shape.overflowInfo) {
                    const buffer = this.options.contentResizeBuffer || 0;
                    const multiplier = this.options.maxContentMultiplier || 3;
                
                const contentMaxWidth = shape.overflowInfo.scrollWidth + buffer;
                const contentMaxHeight = shape.overflowInfo.scrollHeight + buffer;
                
                // Absolute maximum limits (content size * multiplier)
                const absoluteMaxWidth = shape.overflowInfo.scrollWidth * multiplier;
                const absoluteMaxHeight = shape.overflowInfo.scrollHeight * multiplier;
                
                // For content-aware components, only consider individual shape constraints as "manual"
                // Default type constraints should not override content-based logic
                const hasManualMaxWidth = shape.resizeConstraints && shape.resizeConstraints.maxWidth && shape.resizeConstraints.maxWidth < Infinity;
                const hasManualMaxHeight = shape.resizeConstraints && shape.resizeConstraints.maxHeight && shape.resizeConstraints.maxHeight < Infinity;
                
                // Apply constraint priority: Manual → Content-based → Absolute maximum
                let effectiveMaxWidth, effectiveMaxHeight;
                
                if (hasManualMaxWidth) {
                    // Individual manual constraint exists - cap it at absolute maximum
                    effectiveMaxWidth = Math.min(shape.resizeConstraints.maxWidth, absoluteMaxWidth);
                } else {
                    // No individual manual constraint - allow resize up to max(requestedSize, contentSize) + buffer
                    const requestedWidth = shape.requestedWidth || shape.width;
                    const requestedMaxWidth = requestedWidth + buffer;
                    const contentBasedWidth = contentMaxWidth;
                    effectiveMaxWidth = Math.max(requestedMaxWidth, contentBasedWidth);
                }
                
                if (hasManualMaxHeight) {
                    // Individual manual constraint exists - cap it at absolute maximum
                    effectiveMaxHeight = Math.min(shape.resizeConstraints.maxHeight, absoluteMaxHeight);
                } else {
                    // No individual manual constraint - allow resize up to max(requestedSize, contentSize) + buffer
                    const requestedHeight = shape.requestedHeight || shape.height;
                    const contentBasedHeight = contentMaxHeight;
                    effectiveMaxHeight = Math.max(requestedHeight + buffer, contentBasedHeight);
                }
                
                if (shape.width > effectiveMaxWidth) {
                    shape.width = effectiveMaxWidth;
                }
                if (shape.height > effectiveMaxHeight) {
                    shape.height = effectiveMaxHeight;
                }
            }
            
            // Prevent negative dimensions
            if (shape.width < 10) {
                shape.width = 10;
            }
            if (shape.height < 10) {
                shape.height = 10;
            }
        } else if (shape.type === 'circle') {
            // For circles, calculate radius based on distance from center
            const centerX = shape.x;
            const centerY = shape.y;
            const newRadius = Math.sqrt(
                Math.pow(currentX - centerX, 2) + Math.pow(currentY - centerY, 2)
            );
            shape.radius = Math.max(newRadius, 5); // Minimum radius of 5
        }
        
        this.dragOffset.x = currentX;
        this.dragOffset.y = currentY;
        
        // Update HTML component size in real-time during resize for React components
        if (element.type === 'shape' && shape.type === 'reactComponent') {
            this.updateReactComponentHTML(shape);
        }
    }
    
    // Helper function to update React component HTML during resize
    updateReactComponentHTML(shape) {
        const htmlElement = this.htmlComponents.get(shape.id);
        if (htmlElement) {
            // console.log(`[RESIZE-HTML] Updating HTML size to ${shape.width}x${shape.height} for component ${shape.id}`);
            // console.log(`[RESIZE-HTML] Current element size:`, htmlElement.style.width, htmlElement.style.height);
            
            // Use the current active canvas context's camera for transform
            this.updateHTMLElementTransform(htmlElement, shape, this.activeCanvasContext.camera);
            
            // Update overflow info after resize
            const contentWrapper = htmlElement.querySelector('div[style*="overflow"]');
            if (contentWrapper && contentWrapper._checkContentOverflow) {
                contentWrapper._checkContentOverflow();
            }
            
            // console.log(`[RESIZE-HTML] Updated element size:`, htmlElement.style.width, htmlElement.style.height);
            // console.log(`[RESIZE-HTML] Element computed size:`, getComputedStyle(htmlElement).width, getComputedStyle(htmlElement).height);
        }
    }
    
    
    // Register React component for canvas-based rendering and interaction
    registerCanvasComponent(shape) {
        const component = shape.domElement;
        if (!component) return;
        
        // Create a canvas renderer for this component
        shape.canvasRenderer = {
            element: component,
            needsRender: true,
            lastRender: null,
            eventHandlers: new Map()
        };
        
        // Set up component for canvas rendering
        this.setupComponentForCanvas(shape);
        
        // Enable interaction tracking
        this.setupComponentInteraction(shape);
    }
    
    // Set up component for canvas-based rendering
    setupComponentForCanvas(shape) {
        const component = shape.domElement;
        
        // Store original styles if component needs special canvas styling
        shape.originalStyles = {
            position: component.style.position,
            left: component.style.left,
            top: component.style.top,
            width: component.style.width,
            height: component.style.height,
            transform: component.style.transform
        };
        
        // Position component off-screen but keep it in DOM for state management
        component.style.position = 'absolute';
        component.style.left = '-9999px';
        component.style.top = '-9999px';
        component.style.width = shape.width + 'px';
        component.style.height = shape.height + 'px';
        
        // Add to document if not already present (for React state management)
        if (!component.parentElement) {
            document.body.appendChild(component);
        }
        
        // Set up render callback for component updates
        this.observeComponentChanges(shape);
    }
    
    // Set up component interaction system
    setupComponentInteraction(shape) {
        // Store event handlers that will be triggered by canvas events
        shape.canvasRenderer.eventHandlers.set('click', (canvasEvent) => {
            // Convert canvas coordinates to component-relative coordinates
            const componentX = canvasEvent.x - shape.x;
            const componentY = canvasEvent.y - shape.y;
            
            // Check if click is within component bounds
            if (componentX >= 0 && componentX <= shape.width && 
                componentY >= 0 && componentY <= shape.height) {
                
                // Create synthetic event
                const syntheticEvent = new MouseEvent('click', {
                    bubbles: true,
                    cancelable: true,
                    clientX: componentX,
                    clientY: componentY
                });
                
                // Dispatch to component
                shape.domElement.dispatchEvent(syntheticEvent);
                return true; // Event was handled
            }
            return false;
        });
        
        // Store component in global registry for event handling
        if (!this.canvasComponents) {
            this.canvasComponents = new Map();
        }
        this.canvasComponents.set(shape.id || Date.now(), shape);
    }
    
    // Observe component changes for re-rendering
    observeComponentChanges(shape) {
        const component = shape.domElement;
        
        // Use MutationObserver to detect component changes
        const observer = new MutationObserver((mutations) => {
            shape.canvasRenderer.needsRender = true;
            this.requestCanvasUpdate();
        });
        
        observer.observe(component, {
            childList: true,
            subtree: true,
            attributes: true,
            characterData: true
        });
        
        shape.canvasRenderer.observer = observer;
        
        // Also listen for custom render events from React components
        component.addEventListener('canvasRender', () => {
            shape.canvasRenderer.needsRender = true;
            this.requestCanvasUpdate();
        });
    }
    
    // Request canvas update (throttled for performance)
    requestCanvasUpdate() {
        if (this.canvasUpdateRequested) return;
        
        this.canvasUpdateRequested = true;
        requestAnimationFrame(() => {
            this.redrawCanvas();
            this.canvasUpdateRequested = false;
        });
    }
    
    // Render React component directly to canvas
    renderComponentToCanvas(ctx, shape, camera) {
        // console.log(`[RENDER] Rendering React component ${shape.id} at (${shape.x}, ${shape.y}) with zoom ${camera.zoom}`);
        
        const renderer = shape.canvasRenderer;
        const component = renderer.element;
        
        if (!component) {
            console.warn('No component element for shape:', shape.id);
            return;
        }
        
        if (!component.parentElement) {
            console.warn('Component element is not in DOM:', shape.id);
        }
        
        // Save canvas state
        ctx.save();
        
        try {
            // Draw the component with zoom-aware rendering
            this.drawComponentToCanvas(ctx, component, shape.x, shape.y, shape.width, shape.height, camera.zoom);
            // console.log(`[RENDER] Successfully rendered component ${shape.id}`);
            
        } catch (error) {
            console.warn('Failed to render component to canvas:', error);
            // Fallback: draw a placeholder rectangle
            this.drawComponentPlaceholder(ctx, shape);
        }
        
        // Restore canvas state
        ctx.restore();
    }
    
    // Draw component to canvas using DOM-to-canvas rendering
    drawComponentToCanvas(ctx, element, x, y, width, height, zoom = 1) {
        // console.log(`[DRAW-COMPONENT] Rendering with zoom: ${zoom}, font will be: 16px (canvas transform handles scaling)`);
        try {
            // For mock components, we'll use a simplified rendering approach
            if (element.className.includes('mock-react-component')) {
                // Draw gradient background
                const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
                gradient.addColorStop(0, '#667eea');
                gradient.addColorStop(1, '#764ba2');
                ctx.fillStyle = gradient;
                ctx.fillRect(x, y, width, height);
                
                // Draw border - use base line width, canvas transform handles scaling
                ctx.strokeStyle = '#3b82f6';
                ctx.lineWidth = 2;
                ctx.strokeRect(x, y, width, height);
                
                // Draw text content - use base font sizes, canvas transform handles scaling
                ctx.fillStyle = 'white';
                const titleFontSize = 16;
                ctx.font = `bold ${titleFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                // console.log(`[DRAW-COMPONENT] Title font: ${ctx.font}`);
                
                // Extract title and description
                const title = element.querySelector('h3')?.textContent || '';
                const description = element.querySelector('p')?.textContent || '';
                
                if (title) {
                    ctx.fillText(title, x + width/2, y + height/2 - 15);
                }
                if (description) {
                    const descFontSize = 14;
                    ctx.font = `${descFontSize}px Arial`;
                    // console.log(`[DRAW-COMPONENT] Description font: ${ctx.font}`);
                    ctx.fillText(description, x + width/2, y + height/2 + 10);
                }
            } else if (element.className.includes('mock-button-component')) {
                // Draw button
                ctx.fillStyle = '#10b981';
                ctx.fillRect(x, y, width, height);
                
                // Draw text - use base font size, canvas transform handles scaling
                ctx.fillStyle = 'white';
                ctx.font = `bold 14px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                ctx.fillText(element.textContent || '', x + width/2, y + height/2);
            } else {
                // Generic fallback
                this.drawComponentPlaceholder(ctx, { x, y, width, height, label: element.textContent });
            }
        } catch (error) {
            console.error('Error drawing component:', error);
            // Fallback to placeholder
            this.drawComponentPlaceholder(ctx, { x, y, width, height });
        }
    }
    
    // Render React component as actual HTML element
    renderReactComponentHTML(shape, camera) {
        if (!shape.htmlContent && !shape.reactContent && !shape.domElement) {
            console.warn(`[HTML-RENDER] React component ${shape.id} has no content to render`);
            return;
        }
        
        // Get or create HTML element for this shape
        let element = this.htmlComponents.get(shape.id);
        if (!element) {
            element = this.createHTMLElement(shape);
            if (!element) return;
            this.htmlComponents.set(shape.id, element);
        }
        
        // Update element position and size based on canvas transform
        this.updateHTMLElementTransform(element, shape, camera);
    }
    
    // Create HTML element for React component shape
    createHTMLElement(shape) {
        if (!this.htmlRenderingLayer) {
            console.warn('[HTML-RENDER] HTML rendering layer not initialized');
            return null;
        }
        
        let element = document.createElement('div');
        element.className = 'react-component-html';
        element.dataset.shapeId = shape.id;
        element.style.cssText = `
            position: absolute;
            pointer-events: none;
            box-sizing: border-box;
            transform-origin: top left;
            user-select: none;
            -webkit-user-select: none;
            transition: outline 0.15s ease, opacity 0.1s ease;
            overflow: hidden;
            padding: 0;
        `;
        
        // Create content wrapper - make it transparent to mouse events initially
        const contentWrapper = document.createElement('div');
        contentWrapper.style.cssText = `
            width: 100%;
            height: 100%;
            pointer-events: none;
            overflow: hidden;
            position: relative;
        `;
        
        // Function to check if content overflows container
        const checkContentOverflow = () => {
            // Small delay to ensure content is rendered
            setTimeout(() => {
                // Find the stable container that holds the actual content
                const stableContainer = contentWrapper.firstElementChild;
                
                // Get the actual content dimensions
                let contentWidth = 0;
                let contentHeight = 0;
                
                if (stableContainer) {
                    // First, get the intrinsic size of the content
                    const originalWidth = stableContainer.style.width;
                    const originalHeight = stableContainer.style.height;
                    
                    // Temporarily set to auto to get natural size
                    stableContainer.style.width = 'auto';
                    stableContainer.style.height = 'auto';
                    
                    contentWidth = stableContainer.scrollWidth;
                    contentHeight = stableContainer.scrollHeight;
                    
                    // Restore original styles
                    stableContainer.style.width = originalWidth;
                    stableContainer.style.height = originalHeight;
                } else {
                    contentWidth = contentWrapper.scrollWidth;
                    contentHeight = contentWrapper.scrollHeight;
                }
                
                const hasHorizontalOverflow = contentWidth > contentWrapper.clientWidth;
                const hasVerticalOverflow = contentHeight > contentWrapper.clientHeight;
                
                // Store overflow info on the shape for external apps to query
                shape.hasOverflow = hasHorizontalOverflow || hasVerticalOverflow;
                shape.overflowInfo = {
                    horizontal: hasHorizontalOverflow,
                    vertical: hasVerticalOverflow,
                    scrollWidth: contentWidth,
                    scrollHeight: contentHeight,
                    clientWidth: contentWrapper.clientWidth,
                    clientHeight: contentWrapper.clientHeight
                };
                
                
                // Auto-resize component to content size when first created (if pending measurement)
                if (shape.pendingContentMeasurement) {
                    const buffer = this.options.contentResizeBuffer || 0;
                    const contentWidth = contentWrapper.scrollWidth;
                    const contentHeight = contentWrapper.scrollHeight;
                    
                    
                    // Calculate desired size based on content + buffer
                    const desiredWidth = contentWidth + buffer;
                    const desiredHeight = contentHeight + buffer;
                    
                    // Cap at default maximum (375×650 or configured defaults)
                    const maxWidth = this.options.defaultComponentWidth;
                    const maxHeight = this.options.defaultComponentHeight;
                    
                    // Set final size: min of desired size and maximum
                    const finalWidth = Math.min(desiredWidth, maxWidth);
                    const finalHeight = Math.min(desiredHeight, maxHeight);
                    shape.width = finalWidth;
                    shape.height = finalHeight;
                    
                    // Clear the pending flag and update the display
                    shape.pendingContentMeasurement = false;
                    this.updateHTMLElementTransform(element, shape, this.activeCanvasContext.camera);
                    this.redrawCanvas();
                }
                
                // Update scrollable size if configured by external app
                if (shape.scrollableSize) {
                    contentWrapper.style.width = shape.scrollableSize.width ? `${shape.scrollableSize.width}px` : '100%';
                    contentWrapper.style.height = shape.scrollableSize.height ? `${shape.scrollableSize.height}px` : '100%';
                }
            }, 10);
        };

        // Function to update pointer events and scrolling based on edit mode
        let lastMode = null; // Track mode to avoid redundant updates
        const updatePointerEvents = () => {
            const isInEditMode = this.editingComponentId === shape.id;
            const currentMode = isInEditMode ? 'edit' : 'select';
            
            // Skip if mode hasn't changed
            if (lastMode === currentMode) return;
            lastMode = currentMode;
            
            if (isInEditMode) {
                // In edit mode - allow interaction with HTML content
                contentWrapper.style.pointerEvents = 'auto';
                element.style.opacity = '1';
                
                // Enable scrolling if content overflows
                const hasHorizontalOverflow = contentWrapper.scrollWidth > contentWrapper.clientWidth;
                const hasVerticalOverflow = contentWrapper.scrollHeight > contentWrapper.clientHeight;
                
                if (hasHorizontalOverflow || hasVerticalOverflow) {
                    let overflowStyle = 'auto';
                    if (hasHorizontalOverflow && !hasVerticalOverflow) {
                        overflowStyle = 'auto hidden';
                    } else if (!hasHorizontalOverflow && hasVerticalOverflow) {
                        overflowStyle = 'hidden auto';
                    }
                    contentWrapper.style.overflow = overflowStyle;
                    
                    // Add visual indicator for scrollable content
                    contentWrapper.style.border = '1px solid rgba(59, 130, 246, 0.3)';
                    contentWrapper.style.borderRadius = '4px';
                } else {
                    contentWrapper.style.overflow = 'hidden';
                    contentWrapper.style.border = 'none';
                }
                
                // console.log(`[HTML-MODE] Component ${shape.id} set to EDIT mode - HTML interactive, scrolling: ${hasHorizontalOverflow || hasVerticalOverflow}`);
            } else {
                // Not in edit mode - make transparent so clicks go to canvas
                contentWrapper.style.pointerEvents = 'none';  
                contentWrapper.style.overflow = 'hidden';
                contentWrapper.style.border = 'none';
                element.style.opacity = '0.95'; // Slightly transparent when not in edit mode
                // console.log(`[HTML-MODE] Component ${shape.id} set to SELECTION mode - clicks pass through`);
            }
        };
        
        // Set initial state
        updatePointerEvents();
        
        // Store functions on element so we can call them later
        contentWrapper._updatePointerEvents = updatePointerEvents;
        contentWrapper._checkContentOverflow = checkContentOverflow;
        
        // Set content based on shape properties
        if (shape.htmlContent) {
            // HTML string content - wrap in stable container to prevent reflow
            const stableContainer = document.createElement('div');
            // Use fixed dimensions based on initial content size to prevent reflow
            stableContainer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                transform-origin: top left;
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            `;
            stableContainer.innerHTML = shape.htmlContent;
            contentWrapper.appendChild(stableContainer);
            
            // Don't set fixed dimensions - let content flow naturally
        } else if (shape.reactContent) {
            // React component (for now, treat as HTML)
            if (typeof shape.reactContent === 'string') {
                const stableContainer = document.createElement('div');
                // Use fixed dimensions based on initial content size to prevent reflow
                stableContainer.style.cssText = `
                    position: absolute;
                    top: 0;
                    left: 0;
                    transform-origin: top left;
                    margin: 0;
                    padding: 0;
                `;
                stableContainer.innerHTML = shape.reactContent;
                contentWrapper.appendChild(stableContainer);
                
                // Don't set fixed dimensions - let content flow naturally
            } else {
                // For actual React components, you'd need to render them here
                // This is a simplified approach for now
                contentWrapper.innerHTML = '<div>React Component</div>';
            }
        } else if (shape.domElement) {
            // Existing DOM element
            if (shape.domElement.cloneNode) {
                contentWrapper.appendChild(shape.domElement.cloneNode(true));
            } else {
                contentWrapper.innerHTML = shape.domElement.innerHTML || shape.domElement.textContent || 'DOM Element';
            }
        } else {
            // Fallback content if no HTML content is provided
            contentWrapper.innerHTML = `
                <div style="
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    font-family: system-ui, sans-serif;
                    font-size: 14px;
                    border-radius: 6px;
                    text-align: center;
                    padding: 8px;
                ">
                    <div>
                        <div style="font-weight: bold; margin-bottom: 4px;">HTML Component</div>
                        <div style="font-size: 12px; opacity: 0.8;">Double-click to edit</div>
                    </div>
                </div>
            `;
        }
        
        element.appendChild(contentWrapper);
        
        this.htmlRenderingLayer.appendChild(element);
        
        // Check for content overflow after content is added to DOM
        checkContentOverflow();
        
        // console.log(`[HTML-RENDER] Created HTML element for component ${shape.id}`);
        return element;
    }
    
    // Update HTML element position and size based on canvas transform
    updateHTMLElementTransform(element, shape, camera) {
        const canvas = this.canvas;
        
        // Apply the same transform as the canvas
        // Canvas transform: translate(center) -> scale(zoom) -> translate(camera)
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Set the viewport size to match the shape size - this acts like a window
        // The content inside stays the same size, we just show more/less of it
        element.style.width = `${shape.width}px`;
        element.style.height = `${shape.height}px`;
        
        // Apply transform to match canvas coordinate system exactly
        // Canvas transform: translate(center) -> scale(zoom) -> translate(camera)
        // So final position = center + (shape_position * zoom) + (camera * zoom)
        const translateX = centerX + shape.x * camera.zoom + camera.x * camera.zoom;
        const translateY = centerY + shape.y * camera.zoom + camera.y * camera.zoom;
        
        // console.log(`[HTML-POS] Shape ${shape.id}: world(${shape.x}, ${shape.y}) -> screen(${translateX}, ${translateY})`);
        
        element.style.left = '0px';
        element.style.top = '0px';
        element.style.transform = `translate(${translateX}px, ${translateY}px) scale(${camera.zoom})`;
        
        // Ensure element is visible
        element.style.display = 'block';
        
        // Only allow pointer events if in edit mode
        if (this.editingComponentId === shape.id) {
            element.style.pointerEvents = 'auto';
        } else {
            element.style.pointerEvents = 'none';
        }
    }
    
    // Clean up HTML elements for removed components
    cleanupHTMLComponents(activeShapes) {
        const activeShapeIds = new Set(activeShapes.filter(s => s.type === 'reactComponent').map(s => s.id));
        
        for (const [shapeId, element] of this.htmlComponents) {
            if (!activeShapeIds.has(shapeId)) {
                element.remove();
                this.htmlComponents.delete(shapeId);
                // console.log(`[HTML-RENDER] Cleaned up HTML element for removed component ${shapeId}`);
            }
        }
    }
    
    // Update all HTML component positions (called during pan/zoom)
    updateAllHTMLComponents(camera = null) {
        if (!camera) camera = this.activeCanvasContext.camera;
        
        for (const [shapeId, element] of this.htmlComponents) {
            // Find the corresponding shape
            const shape = this.activeCanvasContext.shapes.find(s => s.id === shapeId && s.type === 'reactComponent');
            if (shape) {
                this.updateHTMLElementTransform(element, shape, camera);
            }
        }
    }
    
    // Enter edit mode for a React component
    enterComponentEditMode(shape) {
        // console.log(`[HTML-RENDER] Entering edit mode for component ${shape.id}`);
        
        // Exit any existing edit mode
        if (this.editingComponentId) {
            this.exitComponentEditMode();
        }
        
        // Set the new editing component
        this.editingComponentId = shape.id;
        
        // Get the HTML element
        const element = this.htmlComponents.get(shape.id);
        if (!element) return;
        
        // Update pointer events using the stored function
        const contentWrapper = element.querySelector('div');
        if (contentWrapper && contentWrapper._updatePointerEvents) {
            contentWrapper._updatePointerEvents();
        }
        
        element.classList.add('editing');
        
        // Ensure smooth transition
        element.style.opacity = '1';
        
        
        // Resize handles will be hidden on next redraw
        
        // Listen for clicks outside to exit edit mode
        setTimeout(() => {
            // console.log(`[EDIT-MODE] Adding outside click listener`);
            document.addEventListener('mousedown', this.handleEditModeOutsideClick);
        }, 100);
        
        // Listen for ESC key
        // console.log(`[EDIT-MODE] Adding ESC key listener`);
        document.addEventListener('keydown', this.handleEditModeEscape);
    }
    
    // Exit edit mode for the current component
    exitComponentEditMode() {
        if (!this.editingComponentId) {
            // console.log(`[EDIT-EXIT] exitComponentEditMode called but no component in edit mode`);
            return;
        }
        
        const componentId = this.editingComponentId;
        // console.log(`[EDIT-EXIT] Starting exit process for component ${componentId}`);
        
        const element = this.htmlComponents.get(this.editingComponentId);
        // console.log(`[EDIT-EXIT] Found element:`, element ? 'YES' : 'NO');
        
        // Clear editing state FIRST
        this.editingComponentId = null;
        // console.log(`[EDIT-EXIT] Cleared editingComponentId`);
        
        if (element) {
            // Now update pointer events (will use the cleared editingComponentId)
            const contentWrapper = element.querySelector('div');
            // console.log(`[EDIT-EXIT] Found contentWrapper:`, contentWrapper ? 'YES' : 'NO');
            
            if (contentWrapper && contentWrapper._updatePointerEvents) {
                // console.log(`[EDIT-EXIT] Calling _updatePointerEvents`);
                contentWrapper._updatePointerEvents();
            }
            
            element.classList.remove('editing');
            // console.log(`[EDIT-EXIT] Removed editing class`);
        }
        
        
        // Remove event listeners
        // console.log(`[EDIT-EXIT] Removing event listeners`);
        document.removeEventListener('mousedown', this.handleEditModeOutsideClick);
        document.removeEventListener('keydown', this.handleEditModeEscape);
        
        // Brief delay to ensure event listeners are fully removed before next interaction
        setTimeout(() => {
            // console.log(`[EDIT-EXIT] Event listeners removal confirmed`);
        }, 10);
        
        // console.log(`[EDIT-EXIT] Exit process completed for component ${componentId}`);
        
        // Force immediate update of all HTML components to ensure consistent state
        this.htmlComponents.forEach((element, id) => {
            const contentWrapper = element.querySelector('div');
            if (contentWrapper && contentWrapper._updatePointerEvents) {
                contentWrapper._updatePointerEvents();
            }
        });
        
        // Visual state will be updated on next redraw
        
        // console.log(`[EDIT-EXIT] Forced state update and redraw`);
    }
    
    // Handle clicks outside during edit mode
    handleEditModeOutsideClick = (e) => {
        // console.log(`[EDIT-EXIT] Outside click detected, editing: ${this.editingComponentId}`);
        // console.log(`[EDIT-EXIT] Click target:`, e.target.tagName, e.target.className);
        
        if (!this.editingComponentId) return;
        
        const element = this.htmlComponents.get(this.editingComponentId);
        if (element) {
            const isOutside = !element.contains(e.target);
            const isCanvasClick = e.target.tagName === 'CANVAS';
            const isCanvasContainer = e.target.classList.contains('canvas-container');
            
            // console.log(`[EDIT-EXIT] Click outside component: ${isOutside}`);
            // console.log(`[EDIT-EXIT] Canvas click: ${isCanvasClick}, Container click: ${isCanvasContainer}`);
            // console.log(`[EDIT-EXIT] Is resizing: ${this.isResizing}`);
            
            // Exit edit mode if clicking outside the component
            // BUT stay in edit mode if currently resizing (to allow resize operations)
            if (isOutside) {
                if (this.isResizing) {
                    // console.log(`[EDIT-EXIT] Currently resizing - staying in edit mode`);
                } else {
                    // console.log(`[EDIT-EXIT] Exiting edit mode due to outside click`);
                    this.exitComponentEditMode();
                }
            }
        }
    }
    
    // Handle ESC key during edit mode
    handleEditModeEscape = (e) => {
        // console.log(`[EDIT-EXIT] Key pressed: ${e.key}, editing: ${this.editingComponentId}`);
        if (e.key === 'Escape') {
            // console.log(`[EDIT-EXIT] ESC key detected!`);
            if (this.editingComponentId) {
                // console.log(`[EDIT-EXIT] Exiting edit mode due to ESC key for component: ${this.editingComponentId}`);
                this.exitComponentEditMode();
            } else {
                // console.log(`[EDIT-EXIT] ESC pressed but no component in edit mode`);
            }
        }
    }
    
    // Draw background image/gradient
    drawBackgroundImage(ctx, backgroundImage, x, y, width, height) {
        if (backgroundImage.includes('linear-gradient')) {
            const match = backgroundImage.match(/linear-gradient\(([^)]+)\)/);
            if (match) {
                const gradientData = match[1];
                const parts = gradientData.split(',').map(p => p.trim());
                
                // Extract colors (simplified parsing)
                const colors = parts.filter(part => 
                    part.includes('#') || part.includes('rgb') || part.includes('hsl')
                );
                
                if (colors.length >= 2) {
                    // Create linear gradient
                    const gradient = ctx.createLinearGradient(x, y, x + width, y + height);
                    
                    colors.forEach((color, index) => {
                        const stop = index / (colors.length - 1);
                        gradient.addColorStop(stop, color);
                    });
                    
                    ctx.fillStyle = gradient;
                    ctx.fillRect(x, y, width, height);
                }
            }
        }
    }
    
    // Wrap text to fit within width
    wrapText(ctx, text, maxWidth) {
        const words = text.split(' ');
        const lines = [];
        let currentLine = '';
        
        for (const word of words) {
            const testLine = currentLine + (currentLine ? ' ' : '') + word;
            const metrics = ctx.measureText(testLine);
            
            if (metrics.width > maxWidth && currentLine) {
                lines.push(currentLine);
                currentLine = word;
            } else {
                currentLine = testLine;
            }
        }
        
        if (currentLine) {
            lines.push(currentLine);
        }
        
        return lines;
    }
    
    // Draw placeholder when component rendering fails
    drawComponentPlaceholder(ctx, shape) {
        // Draw a simple placeholder rectangle
        ctx.fillStyle = '#f0f0f0';
        ctx.fillRect(shape.x, shape.y, shape.width, shape.height);
        
        ctx.strokeStyle = '#ccc';
        ctx.setLineDash([5, 5]);
        ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
        ctx.setLineDash([]);
        
        // Draw placeholder text
        ctx.fillStyle = '#666';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('React Component', shape.x + shape.width/2, shape.y + shape.height/2);
    }
    
    // Update all React component positions immediately (for smooth pan/zoom)
    updateReactComponentPositions() {
        // No longer needed since components are rendered directly to canvas
        // Canvas redraws will handle positioning automatically
    }
    
    // Position React component DOM elements to sync with camera
    positionReactComponent(shape, camera, canvas) {
        const domElement = shape.domElement;
        if (!domElement) return;
        
        // Convert world coordinates to screen coordinates using the same transform as canvas rendering
        // This matches the canvas transformation: translate(width/2, height/2) -> scale(zoom) -> translate(camera.x, camera.y)
        
        // Apply the canvas transformation matrix to get screen coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        
        // Transform world coordinates (shape.x, shape.y) to screen coordinates
        const screenX = centerX + (shape.x + camera.x) * camera.zoom;
        const screenY = centerY + (shape.y + camera.y) * camera.zoom;
        
        // Calculate scaled dimensions
        const scaledWidth = shape.width * camera.zoom;
        const scaledHeight = shape.height * camera.zoom;
        
        // Use transform instead of left/top for better performance during animations
        domElement.style.position = 'absolute';
        domElement.style.left = '0px';
        domElement.style.top = '0px';
        domElement.style.width = scaledWidth + 'px';
        domElement.style.height = scaledHeight + 'px';
        domElement.style.transform = `translate(${screenX}px, ${screenY}px)`;
        domElement.style.transformOrigin = '0 0';
        
        // Optional: Add z-index to ensure proper layering
        domElement.style.zIndex = '100';
        
        // Optional: Add pointer events handling
        if (shape.interactive !== false) {
            domElement.style.pointerEvents = 'auto';
        } else {
            domElement.style.pointerEvents = 'none';
        }
    }
    
    clearCanvas() {
        // Clear HTML rendering layer FIRST while shapes still exist for proper cleanup
        this.clearHTMLRenderingLayer();
        
        // Clear the active canvas context data
        const canvasContext = this.activeCanvasContext;
        canvasContext.paths.length = 0;
        canvasContext.shapes.length = 0;
        canvasContext.texts.length = 0;
        canvasContext.nestedCanvases.length = 0;
        canvasContext.selectedElements.length = 0;
        canvasContext.previewSelectedElements.length = 0;
        canvasContext.hoveredElement = null;
        canvasContext.currentPath = [];
        
        // Clear nested canvas data
        this.nestedCanvasData.clear();
        
        // Reset all interaction states
        this.hoveredElement = null;
        this.hoveredResizeHandle = null;
        this.isDrawing = false;
        this.isSelecting = false;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.resizeOffset = null;
        this.initialCircleRadius = null;
        this.initialCircleClickDistance = null;
        this.editingComponentId = null;
        
        // Clear preview/temporary drawing state
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Hide all selection UI elements
        this.hideSelectionBox();
        this.hideSelectionBox(this.mainCanvasContext); // Main canvas
        if (this.nestedCanvasContext) {
            this.hideSelectionBox(this.nestedCanvasContext); // Nested canvas
        }
        
        // Force complete canvas clearing - clear ALL canvases to ensure visual cleanup
        const ctx = canvasContext.ctx;
        const canvas = canvasContext.canvas;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Always clear main canvas context too (in case shapes were drawn there)
        if (this.mainCanvasContext && this.mainCanvasContext !== canvasContext) {
            this.mainCanvasContext.ctx.clearRect(0, 0, this.mainCanvasContext.canvas.width, this.mainCanvasContext.canvas.height);
        }
        
        // Also clear the root canvas element if it's different from contexts
        if (this.canvas && this.canvas !== canvas && this.canvas !== this.mainCanvasContext?.canvas) {
            const rootCtx = this.canvas.getContext('2d');
            rootCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
        
        console.log('[CLEAR-CANVAS] Cleared visual canvas layers:', {
            activeCanvas: canvas.width + 'x' + canvas.height,
            mainCanvas: this.mainCanvasContext ? this.mainCanvasContext.canvas.width + 'x' + this.mainCanvasContext.canvas.height : 'none',
            rootCanvas: this.canvas ? this.canvas.width + 'x' + this.canvas.height : 'none'
        });
        
        // Clear any visual state CSS classes from canvas container
        const canvasContainer = canvas.parentElement;
        if (canvasContainer) {
            // Remove all cursor and state classes
            canvasContainer.className = canvasContainer.className.replace(
                /\b(pen-cursor|rectangle-cursor|circle-cursor|text-cursor|select-cursor|nested-canvas-cursor|line-cursor|arrow-cursor|drawing|selecting|grabbing|resizing|hovering|can-grab|resize-handle-hover|resize-[a-z-]+)\b/g, ''
            ).trim();
        }
        
        // Update cursor state to default
        this.updateCanvasCursor();
        
        // Force multiple aggressive visual clears before redraw
        console.log('[CLEAR-CANVAS] Forcing aggressive visual clearing...');
        
        // Clear all possible canvas contexts multiple times
        const allCanvases = [
            { name: 'active', ctx: canvasContext.ctx, canvas: canvasContext.canvas },
            { name: 'main', ctx: this.mainCanvasContext?.ctx, canvas: this.mainCanvasContext?.canvas },
            { name: 'root', ctx: this.canvas?.getContext('2d'), canvas: this.canvas },
            { name: 'nested', ctx: this.nestedCanvasContext?.ctx, canvas: this.nestedCanvasContext?.canvas }
        ].filter(c => c.ctx && c.canvas);
        
        // Clear each canvas 3 times to ensure visual artifacts are gone
        for (let i = 0; i < 3; i++) {
            allCanvases.forEach(({ name, ctx, canvas }) => {
                try {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    if (i === 0) console.log(`[CLEAR-CANVAS] Cleared ${name} canvas: ${canvas.width}x${canvas.height}`);
                } catch (error) {
                    console.warn(`[CLEAR-CANVAS] Error clearing ${name} canvas:`, error);
                }
            });
        }
        
        // Force complete visual clear to ensure canvas matches empty state
        console.log('[CLEAR-CANVAS] Starting redraw with cleared state...');
        this.forceVisualClear();
    }
    
    clearHTMLRenderingLayer() {
        if (this.htmlRenderingLayer) {
            // Remove all child elements from the HTML rendering layer
            while (this.htmlRenderingLayer.firstChild) {
                this.htmlRenderingLayer.removeChild(this.htmlRenderingLayer.firstChild);
            }
            
            // Clean up any component renderers from all contexts
            [this.mainCanvasContext, this.nestedCanvasContext].forEach(context => {
                if (!context) return;
                context.shapes.forEach(shape => {
                    if (shape.type === 'reactComponent' && shape.canvasRenderer) {
                        try {
                            shape.canvasRenderer.unmount();
                        } catch (error) {
                            console.warn('Error unmounting component renderer:', error);
                        }
                        shape.canvasRenderer = null;
                        shape.domElement = null;
                    }
                });
            });
            
            // Clear the HTML components map
            if (this.htmlComponents) {
                this.htmlComponents.clear();
            }
            
            // Reset the HTML rendering layer styles to ensure clean state
            this.htmlRenderingLayer.style.cssText = `
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                pointer-events: none;
                z-index: 10;
                overflow: hidden;
            `;
        }
    }
    
    async makeReal() {
        if (this.selectedElements.length === 0) {
            alert('Please select some elements first using the select tool.');
            return;
        }
        
        // Create a canvas with just the selected elements
        const tempCanvas = document.createElement('canvas');
        const tempCtx = tempCanvas.getContext('2d');
        tempCanvas.width = this.canvas.width;
        tempCanvas.height = this.canvas.height;
        
        // Draw only selected elements
        this.selectedElements.forEach(element => {
            if (element.type === 'path') {
                const path = this.paths[element.index];
                tempCtx.beginPath();
                tempCtx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    tempCtx.lineTo(path[i].x, path[i].y);
                }
                tempCtx.stroke();
            } else if (element.type === 'shape') {
                const shape = this.shapes[element.index];
                tempCtx.beginPath();
                if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                    tempCtx.strokeRect(shape.x, shape.y, shape.width, shape.height);
                } else if (shape.type === 'circle') {
                    tempCtx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                    tempCtx.stroke();
                }
            } else if (element.type === 'text') {
                const text = this.texts[element.index];
                tempCtx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
                tempCtx.fillText(text.text, text.x, text.y);
            }
        });
        
        // Convert to blob and send to AI API (placeholder)
        tempCanvas.toBlob(async (blob) => {
            await this.sendToAI(blob);
        });
    }
    
    async sendToAI(imageBlob) {
        // This is a placeholder for the AI integration
        // In a real implementation, you would send the image to an AI service
        // For now, we'll simulate the response
        
        const simulatedHTML = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Generated UI</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, sans-serif;
            padding: 20px;
            background: #f5f5f5;
        }
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            padding: 30px;
            border-radius: 10px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        .form-group {
            margin-bottom: 20px;
        }
        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
        }
        .form-group input {
            width: 100%;
            padding: 10px;
            border: 1px solid #ddd;
            border-radius: 5px;
            font-size: 16px;
        }
        .btn {
            background: #3b82f6;
            color: white;
            padding: 12px 24px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 16px;
        }
        .btn:hover {
            background: #2563eb;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Contact Form</h1>
            <p>Generated from your drawing!</p>
        </div>
        <form>
            <div class="form-group">
                <label for="name">Name</label>
                <input type="text" id="name" placeholder="Enter your name">
            </div>
            <div class="form-group">
                <label for="email">Email</label>
                <input type="email" id="email" placeholder="Enter your email">
            </div>
            <div class="form-group">
                <label for="message">Message</label>
                <input type="text" id="message" placeholder="Enter your message">
            </div>
            <button type="submit" class="btn">Submit</button>
        </form>
    </div>
</body>
</html>
        `;
        
        this.showPreview(simulatedHTML);
    }
    
    showPreview(html) {
        const modal = document.getElementById('preview-modal');
        const iframe = document.getElementById('preview-iframe');
        
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);
        
        iframe.src = url;
        modal.style.display = 'block';
        
        // Clean up the blob URL when modal is closed
        setTimeout(() => URL.revokeObjectURL(url), 100);
    }
    
    closeModal() {
        const modal = document.getElementById('preview-modal');
        modal.style.display = 'none';
    }
    
    updateZoomIndicator() {
        const zoomPercentage = Math.round(this.activeCanvasContext.camera.zoom * 100);
        
        // Update main canvas zoom indicator
        if (this.zoomIndicator) {
            this.zoomIndicator.textContent = `${zoomPercentage}%`;
        }
        
        // Update nested canvas zoom indicator if it's the active context
        if (this.nestedZoomIndicator && this.activeCanvasContext === this.nestedCanvasContext) {
            this.nestedZoomIndicator.textContent = `${zoomPercentage}%`;
        }
    }
    
    updateRecenterButton() {
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        const tolerance = 0.1;
        
        // Check if world origin (0,0) is centered - camera should be at (0,0) for this
        const isAtOriginalCenter = 
            Math.abs(camera.x) < tolerance && 
            Math.abs(camera.y) < tolerance;
        const isAt100Zoom = Math.abs(camera.zoom - 1) < tolerance;
        
        // Update main canvas buttons
        if (this.recenterBtn) {
            this.recenterBtn.style.display = isAtOriginalCenter ? 'none' : 'flex';
        }
        const resetZoomBtn = document.getElementById('reset-zoom-btn');
        if (resetZoomBtn) {
            resetZoomBtn.style.display = isAt100Zoom ? 'none' : 'flex';
        }
        
        // Update nested canvas buttons if it's the active context
        if (this.nestedRecenterBtn && this.activeCanvasContext === this.nestedCanvasContext) {
            this.nestedRecenterBtn.style.display = isAtOriginalCenter ? 'none' : 'flex';
        }
        const nestedResetZoomBtn = document.getElementById('nested-reset-zoom-btn');
        if (nestedResetZoomBtn && this.activeCanvasContext === this.nestedCanvasContext) {
            nestedResetZoomBtn.style.display = isAt100Zoom ? 'none' : 'flex';
        }
    }
    
    recenterCanvas() {
        // Center world origin (0,0) on screen at current zoom level
        const camera = this.activeCanvasContext.camera;
        
        // With CSS transforms, camera (0,0) means world origin at screen center
        camera.x = 0;
        camera.y = 0;
        
        // Apply camera constraints
        this.applyCameraConstraints();
        
        this.redrawCanvas();
        this.updateRecenterButton();
        this.notifyCameraChange();
    }
    
    resetZoom() {
        // Reset zoom to 100% while keeping current viewport center stable
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        
        // Calculate current viewport center in world coordinates
        const centerX = canvas.width / 2;
        const centerY = canvas.height / 2;
        const worldCenter = this.canvasToWorld(centerX, centerY);
        
        const oldZoom = camera.zoom;
        const newZoom = 1;
        
        // Emit beforeZoom event
        this.emit('beforeZoom', { 
            camera: { ...camera },
            oldZoom,
            newZoom,
            zoomCenter: { x: centerX, y: centerY }
        });
        
        // Reset zoom to 100%
        camera.zoom = newZoom;
        
        // Adjust camera to keep current viewport center stable during zoom
        const newWorldCenter = this.canvasToWorld(centerX, centerY);
        
        camera.x += newWorldCenter.x - worldCenter.x;
        camera.y += newWorldCenter.y - worldCenter.y;
        
        // Emit afterZoom event
        this.emit('afterZoom', { 
            camera: { ...camera },
            oldZoom,
            newZoom,
            zoomCenter: { x: centerX, y: centerY }
        });

        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
        this.notifyCameraChange();
    }
    
    
    selectElementsInAreaForContext(x1, y1, x2, y2, canvasContext) {
        // Convert canvas coordinates to world coordinates for proper selection
        const startWorld = this.canvasToWorld(x1, y1, canvasContext);
        const endWorld = this.canvasToWorld(x2, y2, canvasContext);
        
        const previewElements = this.getElementsInArea(startWorld.x, startWorld.y, endWorld.x, endWorld.y, canvasContext);
        canvasContext.selectedElements = previewElements;
        
        this.updateCanvasCursor();
        this.redrawCanvas(canvasContext);
        this.notifySelectionChange();
    }
    
    getResizeHandleForContext(worldX, worldY, canvasContext) {
        if (canvasContext.selectedElements.length !== 1) return null;
        
        const element = canvasContext.selectedElements[0];
        
        // Disable resize handle detection if component is in edit mode
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'reactComponent' && this.editingComponentId === shape.id) {
                // Component is in edit mode - disable resize handles
                return null;
            }
        }
        
        let bounds = null;
        
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
            } else if (shape.type === 'circle') {
                bounds = {
                    x: shape.x - shape.radius,
                    y: shape.y - shape.radius,
                    width: shape.radius * 2,
                    height: shape.radius * 2
                };
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                // For lines and arrows, allow endpoint resizing and middle dragging
                const handleSize = 8;
                const middleHandleSize = 6;
                const tolerance = 10; // 10px radius for better touch/click area
                
                // Check if clicking near start point
                const distToStart = Math.sqrt((worldX - shape.x1) * (worldX - shape.x1) + (worldY - shape.y1) * (worldY - shape.y1));
                if (distToStart <= tolerance) {
                    return 'line-start';
                }
                
                // Check if clicking near end point  
                const distToEnd = Math.sqrt((worldX - shape.x2) * (worldX - shape.x2) + (worldY - shape.y2) * (worldY - shape.y2));
                if (distToEnd <= tolerance) {
                    return 'line-end';
                }
                
                // Check if clicking near middle point (for dragging entire line)
                const midX = (shape.x1 + shape.x2) / 2;
                const midY = (shape.y1 + shape.y2) / 2;
                const distToMid = Math.sqrt((worldX - midX) * (worldX - midX) + (worldY - midY) * (worldY - midY));
                if (distToMid <= tolerance) {
                    return 'line-middle';
                }
                
                return null; // No handle in other areas
            } else if (shape.type === 'reactComponent') {
                bounds = {
                    x: shape.x,
                    y: shape.y,
                    width: shape.width,
                    height: shape.height
                };
            }
        } else if (element.type === 'nested-canvas') {
            const nestedCanvas = canvasContext.nestedCanvases[element.index];
            bounds = {
                x: nestedCanvas.x,
                y: nestedCanvas.y,
                width: nestedCanvas.width,
                height: nestedCanvas.height
            };
        } else if (element.type === 'text') {
            const text = canvasContext.texts[element.index];
            bounds = {
                x: text.x,
                y: text.y,
                width: text.width,
                height: text.height
            };
        }
        
        if (!bounds) return null;
        
        // Work in world coordinates (much simpler and more reliable)
        const handleSize = 8; // Handle size in world coordinates - canvas transform handles scaling
        const tolerance = 10; // 10px radius around resize handles for better touch/click area
        
        // Create handles in world coordinates matching the drawing function
        const handles = [
            { x: bounds.x - handleSize/2, y: bounds.y - handleSize/2, type: 'nw' },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y - handleSize/2, type: 'ne' },
            { x: bounds.x - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 'sw' },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 'se' },
            { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y - handleSize/2, type: 'n' },
            { x: bounds.x + bounds.width/2 - handleSize/2, y: bounds.y + bounds.height - handleSize/2, type: 's' },
            { x: bounds.x - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, type: 'w' },
            { x: bounds.x + bounds.width - handleSize/2, y: bounds.y + bounds.height/2 - handleSize/2, type: 'e' }
        ];
        
        // Check if worldX, worldY is within any handle bounds
        for (let handle of handles) {
            if (worldX >= handle.x - tolerance && worldX <= handle.x + handleSize + tolerance &&
                worldY >= handle.y - tolerance && worldY <= handle.y + handleSize + tolerance) {
                return handle.type;
            }
        }
        
        // If not on a handle, check if hovering over container edges for edge resizing
        const edgeTolerance = 6; // 6px radius around edges for precise interaction
        
        // Check if near edges (but only allow resize from outside or very close to edge)
        const nearLeft = Math.abs(worldX - bounds.x) <= edgeTolerance;
        const nearRight = Math.abs(worldX - (bounds.x + bounds.width)) <= edgeTolerance;
        const nearTop = Math.abs(worldY - bounds.y) <= edgeTolerance;
        const nearBottom = Math.abs(worldY - (bounds.y + bounds.height)) <= edgeTolerance;
        
        // Only allow edge resizing if we're actually near an edge, not deep inside component
        const isNearAnyEdge = nearLeft || nearRight || nearTop || nearBottom;
        
        if (isNearAnyEdge) {
            // Corner resizing (prioritize corners over edges)
            if (nearLeft && nearTop) return 'nw';
            if (nearRight && nearTop) return 'ne'; 
            if (nearLeft && nearBottom) return 'sw';
            if (nearRight && nearBottom) return 'se';
            
            // Edge resizing - only if close to that specific edge
            if (nearLeft) return 'w';
            if (nearRight) return 'e';
            if (nearTop) return 'n';
            if (nearBottom) return 's';
        }
        
        return null;
    }
    
    // Get the center position of a resize handle for a selected element
    getResizeHandleCenter(handleType, canvasContext) {
        if (canvasContext.selectedElements.length !== 1) return null;
        
        const element = canvasContext.selectedElements[0];
        if (element.type !== 'shape') return null;
        
        const shape = canvasContext.shapes[element.index];
        
        if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
            const bounds = {
                x: shape.x,
                y: shape.y,
                width: shape.width,
                height: shape.height
            };
            
            switch (handleType) {
                case 'nw': return { x: bounds.x, y: bounds.y };
                case 'ne': return { x: bounds.x + bounds.width, y: bounds.y };
                case 'sw': return { x: bounds.x, y: bounds.y + bounds.height };
                case 'se': return { x: bounds.x + bounds.width, y: bounds.y + bounds.height };
                case 'n': return { x: bounds.x + bounds.width / 2, y: bounds.y };
                case 's': return { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height };
                case 'w': return { x: bounds.x, y: bounds.y + bounds.height / 2 };
                case 'e': return { x: bounds.x + bounds.width, y: bounds.y + bounds.height / 2 };
            }
        } else if (shape.type === 'circle') {
            // For circles, there's no fixed handle position - the handle is wherever the user clicks
            // We need to store the initial click position relative to the circle center
            return null; // Circles handle offset differently
        }
        
        return null;
    }
    
    performResizeForContext(currentX, currentY, canvasContext) {
        if (canvasContext.selectedElements.length !== 1 || !this.resizeHandle) return;
        
        const element = canvasContext.selectedElements[0];
        
        // Adjust mouse position to compensate for initial click offset
        const adjustedX = currentX - (this.resizeOffset?.x || 0);
        const adjustedY = currentY - (this.resizeOffset?.y || 0);
        
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            
            if (shape.type === 'rectangle' || shape.type === 'reactComponent') {
                if (shape.type === 'reactComponent') {
                    // For HTML components, handle viewport-style resizing where content stays fixed
                    // and the viewport reveals/hides more content
                    const originalLeft = shape.x;
                    const originalTop = shape.y;
                    const originalRight = shape.x + shape.width;
                    const originalBottom = shape.y + shape.height;
                    
                    let newLeft = originalLeft;
                    let newTop = originalTop;  
                    let newRight = originalRight;
                    let newBottom = originalBottom;
                    
                    switch (this.resizeHandle) {
                        case 'nw': // top-left handle
                            newLeft = adjustedX;
                            newTop = adjustedY;
                            break;
                        case 'ne': // top-right handle
                            newRight = adjustedX;
                            newTop = adjustedY;
                            break;
                        case 'sw': // bottom-left handle
                            newLeft = adjustedX;
                            newBottom = adjustedY;
                            break;
                        case 'se': // bottom-right handle
                            newRight = adjustedX;
                            newBottom = adjustedY;
                            break;
                        case 'n': // top handle
                            newTop = adjustedY;
                            break;
                        case 's': // bottom handle
                            newBottom = adjustedY;
                            break;
                        case 'w': // left handle - expand viewport to the left
                            newLeft = adjustedX;
                            break;
                        case 'e': // right handle - expand viewport to the right
                            newRight = adjustedX;
                            break;
                    }
                    
                    // Apply minimum constraints and adjust positions accordingly
                    let finalWidth = newRight - newLeft;
                    let finalHeight = newBottom - newTop;
                    let finalLeft = newLeft;
                    let finalTop = newTop;
                    
                    // Handle minimum width constraint
                    if (finalWidth < 10) {
                        const widthDiff = 10 - finalWidth;
                        finalWidth = 10;
                        
                        // Adjust position based on which handle is being used
                        if (this.resizeHandle && (this.resizeHandle.includes('w') || this.resizeHandle === 'nw' || this.resizeHandle === 'sw')) {
                            // Resizing from left - keep right edge fixed
                            finalLeft = newRight - 10;
                        }
                        // For right-side handles, left position stays the same (newLeft)
                    }
                    
                    // Handle minimum height constraint
                    if (finalHeight < 10) {
                        const heightDiff = 10 - finalHeight;
                        finalHeight = 10;
                        
                        // Adjust position based on which handle is being used
                        if (this.resizeHandle && (this.resizeHandle.includes('n') || this.resizeHandle === 'nw' || this.resizeHandle === 'ne')) {
                            // Resizing from top - keep bottom edge fixed
                            finalTop = newBottom - 10;
                        }
                        // For bottom-side handles, top position stays the same (newTop)
                    }
                    
                    shape.x = finalLeft;
                    shape.y = finalTop;
                    shape.width = finalWidth;
                    shape.height = finalHeight;
                } else {
                    // For rectangles, use the original approach that can move position
                    const originalLeft = shape.x;
                    const originalTop = shape.y;
                    const originalRight = shape.x + shape.width;
                    const originalBottom = shape.y + shape.height;
                    
                    // Calculate new bounds by positioning the dragged handle at the mouse cursor
                    let newLeft = originalLeft;
                    let newTop = originalTop;
                    let newRight = originalRight;
                    let newBottom = originalBottom;
                    
                    switch (this.resizeHandle) {
                        case 'nw': // top-left handle
                            newLeft = adjustedX;
                            newTop = adjustedY;
                            break;
                        case 'ne': // top-right handle
                            newRight = adjustedX;
                            newTop = adjustedY;
                            break;
                        case 'sw': // bottom-left handle
                            newLeft = adjustedX;
                            newBottom = adjustedY;
                            break;
                        case 'se': // bottom-right handle
                            newRight = adjustedX;
                            newBottom = adjustedY;
                            break;
                        case 'n': // top handle
                            newTop = adjustedY;
                            break;
                        case 's': // bottom handle
                            newBottom = adjustedY;
                            break;
                        case 'w': // left handle
                            newLeft = adjustedX;
                            break;
                        case 'e': // right handle
                            newRight = adjustedX;
                            break;
                    }
                    
                    // Update shape bounds
                    shape.x = newLeft;
                    shape.y = newTop;
                    shape.width = newRight - newLeft;
                    shape.height = newBottom - newTop;
                }
                
                // Ensure minimum dimensions
                if (shape.width < 10) shape.width = 10;
                if (shape.height < 10) shape.height = 10;
                
                // Apply constraints based on shape type
                if (shape.type === 'reactComponent') {
                    this.applyHTMLComponentConstraints(shape);
                } else if (shape.type === 'rectangle') {
                    this.applyRectangleConstraints(shape);
                }
            } else if (shape.type === 'circle') {
                // For circles, set radius to distance from center to mouse (ignore offset compensation)
                const distance = Math.sqrt(
                    Math.pow(currentX - shape.x, 2) + Math.pow(currentY - shape.y, 2)
                );
                
                shape.radius = Math.max(distance, 5); // Minimum radius of 5
            } else {
                // Handle other shape types (lines, arrows) - use old delta approach
                const deltaX = currentX - this.dragOffset.x;
                const deltaY = currentY - this.dragOffset.y;
                this.performResizeForOtherShapes(canvasContext, element, deltaX, deltaY, currentX, currentY);
            }
        }
        
        // Update dragOffset to current position - NO MORE DELTA CALCULATION NEEDED!
        this.dragOffset.x = currentX;
        this.dragOffset.y = currentY;
        
        // Update HTML component immediately if it's a reactComponent
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'reactComponent') {
                this.updateReactComponentHTML(shape);
            }
        }
    }
    
    // Apply constraints specific to HTML components
    applyHTMLComponentConstraints(shape) {
        if (!shape.overflowInfo) return;
        
        // Use the overflow info directly - it should already have the correct measurements
        const contentWidth = shape.overflowInfo.scrollWidth;
        const contentHeight = shape.overflowInfo.scrollHeight;
        
        const buffer = 0;  // Always 0 for HTML components - no extra space
        
        // Simple constraint: can't resize larger than content
        const maxWidth = contentWidth + buffer;
        const maxHeight = contentHeight + buffer;
        
        // Store original bounds for position adjustment
        const originalRight = shape.x + shape.width;
        const originalBottom = shape.y + shape.height;
        
        // Apply width constraint
        if (shape.width > maxWidth) {
            const widthReduction = shape.width - maxWidth;
            shape.width = maxWidth;
            
            // If we're resizing from the left and hit the constraint,
            // adjust position to maintain the right edge position
            if (this.resizeHandle && (this.resizeHandle.includes('w') || this.resizeHandle === 'nw' || this.resizeHandle === 'sw')) {
                shape.x = originalRight - shape.width;
            }
        }
        
        // Apply height constraint  
        if (shape.height > maxHeight) {
            const heightReduction = shape.height - maxHeight;
            shape.height = maxHeight;
            
            // If we're resizing from the top and hit the constraint,
            // adjust position to maintain the bottom edge position
            if (this.resizeHandle && (this.resizeHandle.includes('n') || this.resizeHandle === 'nw' || this.resizeHandle === 'ne')) {
                shape.y = originalBottom - shape.height;
            }
        }
    }
    
    // Apply constraints specific to rectangles
    applyRectangleConstraints(shape) {
        // Add any rectangle-specific constraints here if needed
        // For now, just ensure minimum dimensions (already done above)
    }
    
    performRectangleResize(shape, deltaX, deltaY, constraints) {
        // Store original values to calculate constrained values
        const originalX = shape.x;
        const originalY = shape.y;
        const originalWidth = shape.width;
        const originalHeight = shape.height;
        
        // Apply resize transformation
        switch (this.resizeHandle) {
            case 'nw': // top-left
                shape.x += deltaX;
                shape.y += deltaY;
                shape.width -= deltaX;
                shape.height -= deltaY;
                break;
            case 'ne': // top-right
                shape.y += deltaY;
                shape.width += deltaX;
                shape.height -= deltaY;
                break;
            case 'sw': // bottom-left
                shape.x += deltaX;
                shape.width -= deltaX;
                shape.height += deltaY;
                break;
            case 'se': // bottom-right
                shape.width += deltaX;
                shape.height += deltaY;
                break;
            case 'n': // top
                shape.y += deltaY;
                shape.height -= deltaY;
                break;
            case 's': // bottom
                shape.height += deltaY;
                break;
            case 'w': // left
                shape.x += deltaX;
                shape.width -= deltaX;
                break;
            case 'e': // right
                shape.width += deltaX;
                break;
        }
        
        // Apply constraints to width and height
        const constrainedWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, shape.width));
        const constrainedHeight = Math.max(constraints.minHeight, Math.min(constraints.maxHeight, shape.height));
        
        // If width or height was constrained, adjust position to prevent drift
        if (shape.width !== constrainedWidth) {
            if (this.resizeHandle.includes('w')) {
                // When resizing from left, maintain right edge position
                shape.x = originalX + originalWidth - constrainedWidth;
            }
            shape.width = constrainedWidth;
        }
        
        if (shape.height !== constrainedHeight) {
            if (this.resizeHandle.includes('n')) {
                // When resizing from top, maintain bottom edge position
                shape.y = originalY + originalHeight - constrainedHeight;
            }
            shape.height = constrainedHeight;
        }
    }
    
    performResizeForOtherShapes(canvasContext, element, deltaX, deltaY, currentX, currentY) {
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            
            if (shape.type === 'circle') {
                const constraints = this.getResizeConstraints('circle');
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                
                // Determine direction based on resize handle position and mouse movement
                let direction = 1;
                if (this.resizeHandle) {
                    // For corner handles, expand if moving away from circle center
                    if (this.resizeHandle.includes('e')) {
                        // East side handles - expand when moving right (positive deltaX)
                        direction = deltaX > 0 ? 1 : -1;
                    } else if (this.resizeHandle.includes('w')) {
                        // West side handles - expand when moving left (negative deltaX)
                        direction = deltaX < 0 ? 1 : -1;
                    } else if (this.resizeHandle.includes('s')) {
                        // South side handles - expand when moving down (positive deltaY)
                        direction = deltaY > 0 ? 1 : -1;
                    } else if (this.resizeHandle.includes('n')) {
                        // North side handles - expand when moving up (negative deltaY)
                        direction = deltaY < 0 ? 1 : -1;
                    }
                }
                
                const newRadius = shape.radius + direction * distance * 0.1;
                shape.radius = Math.max(constraints.minRadius || 5, Math.min(constraints.maxRadius || 500, newRadius));
            } else if (shape.type === 'line' || shape.type === 'arrow') {
                if (this.resizeHandle === 'line-start') {
                    // Move the start point
                    shape.x1 = currentX;
                    shape.y1 = currentY;
                } else if (this.resizeHandle === 'line-end') {
                    // Move the end point
                    shape.x2 = currentX;
                    shape.y2 = currentY;
                } else if (this.resizeHandle === 'line-middle') {
                    // Move the entire line (drag both endpoints together)
                    const deltaX = currentX - this.dragStartX;
                    const deltaY = currentY - this.dragStartY;
                    shape.x1 = this.originalShapeState.x1 + deltaX;
                    shape.y1 = this.originalShapeState.y1 + deltaY;
                    shape.x2 = this.originalShapeState.x2 + deltaX;
                    shape.y2 = this.originalShapeState.y2 + deltaY;
                }
            }
        } else if (element.type === 'text') {
            const text = canvasContext.texts[element.index];
            const constraints = this.getResizeConstraints('text');
            
            // Store original values to calculate constrained values
            const originalX = text.x;
            const originalY = text.y;
            const originalWidth = text.width;
            const originalHeight = text.height;
            
            // Apply resize transformation
            switch (this.resizeHandle) {
                case 'nw': // top-left
                    text.x += deltaX;
                    text.y += deltaY;
                    text.width -= deltaX;
                    text.height -= deltaY;
                    break;
                case 'ne': // top-right
                    text.y += deltaY;
                    text.width += deltaX;
                    text.height -= deltaY;
                    break;
                case 'sw': // bottom-left
                    text.x += deltaX;
                    text.width -= deltaX;
                    text.height += deltaY;
                    break;
                case 'se': // bottom-right
                    text.width += deltaX;
                    text.height += deltaY;
                    break;
                case 'n': // top
                    text.y += deltaY;
                    text.height -= deltaY;
                    break;
                case 's': // bottom
                    text.height += deltaY;
                    break;
                case 'w': // left
                    text.x += deltaX;
                    text.width -= deltaX;
                    break;
                case 'e': // right
                    text.width += deltaX;
                    break;
            }
            
            // Apply constraints to width and height
            const constrainedWidth = Math.max(constraints.minWidth, Math.min(constraints.maxWidth, text.width));
            const constrainedHeight = Math.max(constraints.minHeight, Math.min(constraints.maxHeight, text.height));
            
            // If width or height was constrained, adjust position to prevent drift
            if (text.width !== constrainedWidth) {
                if (this.resizeHandle.includes('w')) {
                    // When resizing from left, maintain right edge position
                    text.x = originalX + originalWidth - constrainedWidth;
                }
                text.width = constrainedWidth;
            }
            
            if (text.height !== constrainedHeight) {
                if (this.resizeHandle.includes('n')) {
                    // When resizing from top, maintain bottom edge position
                    text.y = originalY + originalHeight - constrainedHeight;
                }
                text.height = constrainedHeight;
            }
        } else if (element.type === 'nested-canvas') {
            const nestedCanvas = canvasContext.nestedCanvases[element.index];
            
            switch (this.resizeHandle) {
                case 'nw': // top-left
                    nestedCanvas.x += deltaX;
                    nestedCanvas.y += deltaY;
                    nestedCanvas.width -= deltaX;
                    nestedCanvas.height -= deltaY;
                    break;
                case 'ne': // top-right
                    nestedCanvas.y += deltaY;
                    nestedCanvas.width += deltaX;
                    nestedCanvas.height -= deltaY;
                    break;
                case 'sw': // bottom-left
                    nestedCanvas.x += deltaX;
                    nestedCanvas.width -= deltaX;
                    nestedCanvas.height += deltaY;
                    break;
                case 'se': // bottom-right
                    nestedCanvas.width += deltaX;
                    nestedCanvas.height += deltaY;
                    break;
                case 'n': // top
                    nestedCanvas.y += deltaY;
                    nestedCanvas.height -= deltaY;
                    break;
                case 's': // bottom
                    nestedCanvas.height += deltaY;
                    break;
                case 'w': // left
                    nestedCanvas.x += deltaX;
                    nestedCanvas.width -= deltaX;
                    break;
                case 'e': // right
                    nestedCanvas.width += deltaX;
                    break;
            }
            
            // Ensure minimum nested canvas size
            nestedCanvas.width = Math.max(100, nestedCanvas.width);
            nestedCanvas.height = Math.max(100, nestedCanvas.height);
        }
        
        this.dragOffset.x = currentX;
        this.dragOffset.y = currentY;
        
        // Update HTML component size in real-time during resize for React components
        if (element.type === 'shape' && canvasContext.shapes[element.index].type === 'reactComponent') {
            this.updateReactComponentHTML(canvasContext.shapes[element.index]);
        }
    }
    
    // Testing helper functions for camera constraints and CSS transforms
    testCameraConstraints() {
        // console.log('Testing camera constraints with CSS transforms...');
        
        // Test 1: Set basic bounds
        // console.log('Test 1: Setting bounds to (-1000, -1000, 2000, 2000) with contain behavior');
        this.setCameraConstraints({
            bounds: { x: -1000, y: -1000, width: 2000, height: 2000 },
            behavior: 'contain'
        });
        
        // console.log('Current camera:', this.camera);
        // console.log('Try panning to see constraints in action!');
        // console.log('Use testCameraConstraints2() for inside behavior test');
        // console.log('Use clearCameraConstraints() to remove constraints');
    }
    
    testCameraConstraints2() {
        // console.log('Test 2: Setting bounds with inside behavior');
        this.setCameraConstraints({
            bounds: { x: -500, y: -500, width: 1000, height: 1000 },
            behavior: 'inside'
        });
        
        // console.log('Current camera:', this.camera);
        // console.log('Camera center must stay within bounds');
    }
    
    testCSSTransforms() {
        // console.log('Testing coordinate system...');
        // console.log('Camera coordinates:', this.camera);
        // console.log('Canvas size:', this.canvas.width, 'x', this.canvas.height);
        
        // Test coordinate conversion
        const screenCenter = { x: this.canvas.width / 2, y: this.canvas.height / 2 };
        const worldCenter = this.canvasToWorld(screenCenter.x, screenCenter.y);
        // console.log('Screen center to world:', screenCenter, '->', worldCenter);
        
        const backToScreen = this.worldToCanvas(worldCenter.x, worldCenter.y);
        // console.log('World back to screen:', worldCenter, '->', backToScreen);
        
        // console.log('Canvas transform applied via Canvas2D transforms');
    }
    
    testCoordinates() {
        // Add a test rectangle at world origin
        this.activeCanvasContext.shapes.push({
            type: 'rectangle',
            x: -50, y: -50,
            width: 100, height: 100,
            strokeColor: '#ff0000',
            fillColor: 'rgba(255,0,0,0.2)'
        });
        
        // console.log('Added red test rectangle at world origin (-50,-50,100,100)');
        // console.log('It should appear centered on screen');
        this.redrawCanvas();
    }
    
    // Traditional Event Emitter API for React Integration
    on(event, callback) {
        if (!this.eventListeners[event]) {
            this.eventListeners[event] = [];
        }
        this.eventListeners[event].push(callback);
    }
    
    off(event, callback) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event] = this.eventListeners[event].filter(cb => cb !== callback);
    }
    
    // Create additional canvas layers for unified layering
    ensureCanvasLayers() {
        if (!this.additionalCanvasLayers) {
            this.additionalCanvasLayers = new Map();
        }
        
        // Ensure main canvas has correct z-index
        if (this.canvas) {
            this.canvas.style.position = 'absolute';
            this.canvas.style.top = '0';
            this.canvas.style.left = '0';
            this.canvas.style.zIndex = '10';
        }
        
        // Get required z-indices from canvasLayers
        if (this.canvasLayers) {
            this.canvasLayers.forEach((_, zIndex) => {
                if (zIndex > 10 && !this.additionalCanvasLayers.has(zIndex)) {
                    // Create new canvas layer matching main canvas exactly
                    const layerCanvas = document.createElement('canvas');
                    
                    // Set properties to exactly match main canvas
                    layerCanvas.width = this.canvas.width;
                    layerCanvas.height = this.canvas.height;
                    
                    // Position layer canvas exactly like main canvas
                    const mainCanvasRect = this.canvas.getBoundingClientRect();
                    const containerRect = this.container.getBoundingClientRect();
                    
                    layerCanvas.style.position = 'absolute';
                    layerCanvas.style.top = `${mainCanvasRect.top - containerRect.top}px`;
                    layerCanvas.style.left = `${mainCanvasRect.left - containerRect.left}px`;
                    layerCanvas.style.width = `${mainCanvasRect.width}px`;
                    layerCanvas.style.height = `${mainCanvasRect.height}px`;
                    layerCanvas.style.background = 'transparent';
                    layerCanvas.style.zIndex = zIndex.toString();
                    layerCanvas.style.pointerEvents = 'none';
                    layerCanvas.style.transform = 'none'; // Explicitly prevent transform inheritance
                    layerCanvas.style.margin = '0';
                    layerCanvas.style.padding = '0';
                    layerCanvas.style.border = 'none';
                    layerCanvas.className = 'additional-canvas-layer';
                    
                    const layerCtx = layerCanvas.getContext('2d');
                    
                    this.container.appendChild(layerCanvas);
                    this.additionalCanvasLayers.set(zIndex, { canvas: layerCanvas, ctx: layerCtx });
                    
                }
            });
        }
        
        // Clean up unused canvas layers
        if (this.additionalCanvasLayers) {
            const requiredLayers = this.canvasLayers ? Array.from(this.canvasLayers.keys()) : [];
            this.additionalCanvasLayers.forEach((layer, zIndex) => {
                if (!requiredLayers.includes(zIndex)) {
                    layer.canvas.remove();
                    this.additionalCanvasLayers.delete(zIndex);
                    console.log(`Removed unused canvas layer with z-index ${zIndex}`);
                }
            });
        }
    }
    
    // Update HTML component z-indices for unified layering with all canvas elements  
    updateHTMLComponentZIndices() {
        // Initialize canvasLayers map
        this.canvasLayers = new Map();
        
        // Create unified ordering of all elements
        const allElements = [];
        
        // Collect all elements in current order
        this.activeCanvasContext.shapes.forEach((shape, index) => {
            allElements.push({ type: 'shape', index, element: shape, isHTML: shape.type === 'reactComponent', originalIndex: index });
        });
        this.activeCanvasContext.texts.forEach((text, index) => {
            allElements.push({ type: 'text', index, element: text, isHTML: false, originalIndex: index });
        });
        this.activeCanvasContext.paths.forEach((path, index) => {
            allElements.push({ type: 'path', index, element: path, isHTML: false, originalIndex: index });
        });
        
        // Assign z-indices and organize elements into layers
        let zIndex = 11; // Start above main canvas (which is at 10)
        let hasHTMLAbove = false;
        
        allElements.forEach((item, globalIndex) => {
            if (item.isHTML) {
                // HTML component gets z-index
                const htmlElement = this.htmlComponents.get(item.element.id);
                if (htmlElement) {
                    htmlElement.style.zIndex = zIndex.toString();
                }
                hasHTMLAbove = true;
            } else {
                // Canvas element - check if it needs to be on a higher layer
                if (hasHTMLAbove) {
                    // This canvas element comes after an HTML component, needs higher layer
                    item.element._layerZIndex = zIndex;
                    
                    // Add to canvasLayers map
                    if (!this.canvasLayers.has(zIndex)) {
                        this.canvasLayers.set(zIndex, []);
                    }
                    this.canvasLayers.get(zIndex).push(item);
                } else {
                    // This element stays on main canvas
                    delete item.element._layerZIndex;
                }
            }
            zIndex += 1;
        });
        
        // Ensure main canvas stays at base level
        if (this.canvas) {
            this.canvas.style.zIndex = '10';
        }
        
        // Ensure additional canvas layers exist for all required z-indices
        this.ensureCanvasLayers();
    }
    
    // Render canvas elements on specific layer
    renderElementsOnLayer(layerCtx, elements, canvasContext) {
        const { camera, selectedElements, previewSelectedElements, hoveredElement } = canvasContext;
        
        // Clear the layer
        layerCtx.clearRect(0, 0, layerCtx.canvas.width, layerCtx.canvas.height);
        
        
        // Apply exact same transforms as main canvas
        layerCtx.save();
        layerCtx.translate(layerCtx.canvas.width / 2, layerCtx.canvas.height / 2); // Center the canvas
        layerCtx.scale(camera.zoom, camera.zoom);                                   // Apply zoom  
        layerCtx.translate(camera.x, camera.y);                                     // Apply camera offset
        
        elements.forEach((item) => {
            const element = item.element;
            const isHovered = hoveredElement && hoveredElement.type === item.type && hoveredElement.index === item.originalIndex;
            const isSelected = selectedElements.some(sel => sel.type === item.type && sel.index === item.originalIndex);
            const isPreviewSelected = previewSelectedElements && previewSelectedElements.some(sel => sel.type === item.type && sel.index === item.originalIndex);
            
            if (item.type === 'path') {
                // Draw path
                layerCtx.strokeStyle = isSelected ? '#ef4444' : (isHovered ? '#3b82f6' : (isPreviewSelected ? '#f97316' : '#333'));
                layerCtx.lineWidth = (isSelected || isHovered || isPreviewSelected) ? 3 : 2;
                
                if (element.length > 0) {
                    layerCtx.beginPath();
                    layerCtx.moveTo(element[0].x, element[0].y);
                    for (let i = 1; i < element.length; i++) {
                        layerCtx.lineTo(element[i].x, element[i].y);
                    }
                    layerCtx.stroke();
                }
            } else if (item.type === 'text') {
                if (element.isEditing) return;
                
                // Draw text
                layerCtx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
                
                // Draw text box background if selected/hovered
                if (isSelected || isHovered || isPreviewSelected) {
                    layerCtx.fillStyle = isSelected ? 'rgba(239, 68, 68, 0.1)' : (isHovered ? 'rgba(59, 130, 246, 0.1)' : 'rgba(249, 115, 22, 0.1)');
                    const metrics = layerCtx.measureText(element.text);
                    const padding = 4;
                    layerCtx.fillRect(element.x - padding, element.y - 20 - padding, metrics.width + 2 * padding, 24 + 2 * padding);
                }
                
                layerCtx.fillStyle = isSelected ? '#ef4444' : (isHovered ? '#3b82f6' : (isPreviewSelected ? '#f97316' : (element.color || '#333')));
                layerCtx.fillText(element.text, element.x, element.y);
            } else if (item.type === 'shape' && element.type !== 'reactComponent') {
                // Draw shape
                
                if (element.fillColor && element.fillColor !== 'transparent') {
                    layerCtx.fillStyle = element.fillColor;
                    if (element.type === 'rectangle') {
                        layerCtx.fillRect(element.x, element.y, element.width, element.height);
                    } else if (element.type === 'circle') {
                        layerCtx.beginPath();
                        layerCtx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
                        layerCtx.fill();
                    }
                }
                
                // Draw stroke
                layerCtx.strokeStyle = isSelected ? '#ef4444' : (isHovered ? '#3b82f6' : (isPreviewSelected ? '#f97316' : (element.strokeColor || '#333')));
                layerCtx.lineWidth = (isSelected || isHovered || isPreviewSelected) ? 3 : 2;
                
                layerCtx.beginPath();
                if (element.type === 'rectangle') {
                    layerCtx.strokeRect(element.x, element.y, element.width, element.height);
                } else if (element.type === 'circle') {
                    layerCtx.arc(element.x, element.y, element.radius, 0, 2 * Math.PI);
                    layerCtx.stroke();
                } else if (element.type === 'line') {
                    layerCtx.moveTo(element.x1, element.y1);
                    layerCtx.lineTo(element.x2, element.y2);
                    layerCtx.stroke();
                } else if (element.type === 'arrow') {
                    // Draw arrow line
                    layerCtx.moveTo(element.x1, element.y1);
                    layerCtx.lineTo(element.x2, element.y2);
                    layerCtx.stroke();
                    
                    // Draw arrowhead
                    const arrowSize = element.arrowSize || 10;
                    const angle = Math.atan2(element.y2 - element.y1, element.x2 - element.x1);
                    
                    layerCtx.beginPath();
                    layerCtx.moveTo(element.x2, element.y2);
                    layerCtx.lineTo(
                        element.x2 - arrowSize * Math.cos(angle - Math.PI / 6),
                        element.y2 - arrowSize * Math.sin(angle - Math.PI / 6)
                    );
                    layerCtx.moveTo(element.x2, element.y2);
                    layerCtx.lineTo(
                        element.x2 - arrowSize * Math.cos(angle + Math.PI / 6),
                        element.y2 - arrowSize * Math.sin(angle + Math.PI / 6)
                    );
                    layerCtx.stroke();
                }
            }
        });
        
        layerCtx.restore();
    }

    emit(event, data) {
        if (!this.eventListeners[event]) return;
        this.eventListeners[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} event listener:`, error);
            }
        });
    }
    
    // Throttled event emission for high-frequency events
    emitThrottled(event, data, delay = 16) { // ~60fps
        const key = event;
        
        if (this.throttledEvents.has(key)) {
            clearTimeout(this.throttledEvents.get(key));
        }
        
        this.throttledEvents.set(key, setTimeout(() => {
            this.emit(event, data);
            this.throttledEvents.delete(key);
        }, delay));
    }
    
    // Hook System for Component Integration
    addHook(event, callback) {
        if (!this.hooks[event]) {
            console.warn(`Unknown hook event: ${event}`);
            return;
        }
        this.hooks[event].push(callback);
    }
    
    removeHook(event, callback) {
        if (!this.hooks[event]) return;
        const index = this.hooks[event].indexOf(callback);
        if (index > -1) {
            this.hooks[event].splice(index, 1);
        }
    }
    
    executeHooks(event, data) {
        if (!this.hooks[event]) return;
        this.hooks[event].forEach(callback => {
            try {
                callback(data);
            } catch (error) {
                console.error(`Error in ${event} hook:`, error);
            }
        });
    }
    
    // Camera change detection and notification
    notifyCameraChange() {
        const camera = this.activeCanvasContext.camera;
        const cameraData = { 
            x: camera.x, 
            y: camera.y, 
            zoom: camera.zoom 
        };
        
        // Emit traditional event for React components
        this.emit('cameraChange', cameraData);
        
        // Execute hooks for complex integrations
        this.executeHooks('onCameraChange', { 
            camera: cameraData,
            canvas: this.activeCanvasContext.canvas
        });
        
        // Notify registered React components that sync with camera
        this.notifyComponents({ syncWithCamera: true }, {
            type: 'cameraChange',
            camera: cameraData,
            viewport: this.getViewportInfo()
        });
    }
    
    // Helper method to update selection and notify
    setSelection(elements) {
        this.selectedElements = elements;
        this.notifySelectionChange();
    }
    

    // Selection change notification
    notifySelectionChange() {
        const selectionData = {
            selectedElements: this.selectedElements,
            count: this.selectedElements.length
        };
        
        // Emit traditional event for React components
        this.emit('selectionChange', selectionData);
        
        // Execute hooks for complex integrations
        this.executeHooks('onSelectionChange', {
            selectedElements: this.selectedElements,
            canvas: this.activeCanvasContext.canvas
        });
        
        // Notify registered React components that sync with selection
        this.notifyComponents({ syncWithSelection: true }, {
            type: 'selectionChange',
            selectedElements: this.selectedElements,
            count: this.selectedElements.length
        });
    }
    
    // Safe external component integration helper
    integrateExternalComponent(hooks) {
        const integration = {
            onCameraChange: hooks.onCameraChange || null,
            onSelectionChange: hooks.onSelectionChange || null,
            onBeforeRedraw: hooks.onBeforeRedraw || null,
            onAfterRedraw: hooks.onAfterRedraw || null,
            cleanup: () => {
                // Remove all hooks
                if (integration.onCameraChange) this.removeHook('onCameraChange', integration.onCameraChange);
                if (integration.onSelectionChange) this.removeHook('onSelectionChange', integration.onSelectionChange);
                if (integration.onBeforeRedraw) this.removeHook('beforeRedraw', integration.onBeforeRedraw);
                if (integration.onAfterRedraw) this.removeHook('afterRedraw', integration.onAfterRedraw);
            }
        };

        // Register hooks with existing event system
        if (integration.onCameraChange) {
            this.addHook('onCameraChange', integration.onCameraChange);
        }
        if (integration.onSelectionChange) {
            this.addHook('onSelectionChange', integration.onSelectionChange);
        }
        if (integration.onBeforeRedraw) {
            this.addHook('beforeRedraw', integration.onBeforeRedraw);
        }
        if (integration.onAfterRedraw) {
            this.addHook('afterRedraw', integration.onAfterRedraw);
        }

        return integration;
    }
}

// Export the class for use as a module (if modules are supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasMaker;
} else if (typeof window !== 'undefined') {
    window.CanvasMaker = CanvasMaker;
}

// Initialize the app when the DOM is loaded (only if running standalone and not in a test environment)
if (typeof document !== 'undefined' && typeof module === 'undefined' && !document.querySelector('[data-test-page]')) {
    document.addEventListener('DOMContentLoaded', () => {
        window.canvasMaker = new CanvasMaker();
    });
}