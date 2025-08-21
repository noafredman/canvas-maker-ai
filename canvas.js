class CanvasMaker {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Make instance globally accessible for testing
        window.canvasMaker = this;
        this.currentTool = null; // No tool selected by default
        this.isDrawing = false;
        this.dragModeEnabled = true; // Default to drag mode enabled
        this.isSelecting = false;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
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
        // Track the original center position for recenter functionality
        this.originalCenter = { x: 0, y: 0 };
        this.isPanning = false;
        
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
        this.currentNestedCanvasId = null;
        this.nestedCanvasData = new Map(); // Store individual nested canvas data
        
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
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.updateZoomIndicator();
        this.updateRecenterButton();
        this.updateCanvasCursor();
        this.redrawCanvas();
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
        
        // Center the world origin (0,0) on the screen
        this._camera.x = availableWidth / 2;
        this._camera.y = availableHeight / 2;
        this.originalCenter.x = availableWidth / 2;
        this.originalCenter.y = availableHeight / 2;
        
        // Update the app and container to use the calculated size
        const app = document.querySelector('.app');
        const container = this.canvas.parentElement;
        
        app.style.width = availableWidth + 'px';
        app.style.height = (availableHeight + toolbarHeight) + 'px';
        container.style.width = availableWidth + 'px';
        container.style.height = availableHeight + 'px';
        
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
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
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
            btn.addEventListener('click', () => {
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
        
        makeRealBtn.addEventListener('click', this.makeReal.bind(this));
        clearBtn.addEventListener('click', this.clearCanvas.bind(this));
        closeModal.addEventListener('click', this.closeModal.bind(this));
        
        // Drag toggle button
        const dragToggle = document.getElementById('drag-toggle');
        if (dragToggle) {
            dragToggle.addEventListener('click', this.toggleDragMode.bind(this));
        }
    }
    
    toggleDragMode() {
        this.dragModeEnabled = !this.dragModeEnabled;
        const dragToggle = document.getElementById('drag-toggle');
        
        if (this.dragModeEnabled) {
            dragToggle.classList.add('active');
        } else {
            dragToggle.classList.remove('active');
        }
        
        this.updateCanvasCursor();
    }
    
    updateCanvasCursor() {
        const container = document.querySelector('.canvas-container');
        container.className = 'canvas-container';
        
        // Only add tool cursor if a tool is selected
        if (this.currentTool) {
            container.classList.add(`${this.currentTool}-cursor`);
        }
        
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
        }
        if (this.hoveredElement && this.dragModeEnabled) {
            container.classList.add('hovering');
            // Show can-grab cursor when hovering over any draggable element (only when drag mode is enabled)
            if (!this.isDragging && !this.isResizing) {
                container.classList.add('can-grab');
            }
        }
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
    
    canvasToWorld(canvasX, canvasY) {
        const camera = this.activeCanvasContext.camera;
        return {
            x: canvasX / camera.zoom - camera.x,
            y: canvasY / camera.zoom - camera.y
        };
    }
    
    worldToCanvas(worldX, worldY) {
        const camera = this.activeCanvasContext.camera;
        return {
            x: (worldX + camera.x) * camera.zoom,
            y: (worldY + camera.y) * camera.zoom
        };
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        
        // Check for panning (middle mouse button)
        if (e.button === 1) {
            this.isPanning = true;
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            return;
        }
        
        // If no tool is selected, act like select tool for object interaction or pan for empty areas
        if (!this.currentTool) {
            // Check if clicking on an element when drag mode is enabled
            if (this.hoveredElement && this.dragModeEnabled) {
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
                
                if (isAlreadySelected) {
                    // Start dragging the selected elements
                    this.isDragging = true;
                    this.dragOffset.x = pos.x;
                    this.dragOffset.y = pos.y;
                } else {
                    // Select the clicked element and start dragging
                    this.selectedElements = [this.hoveredElement];
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
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                this.updateCanvasCursor();
                return;
            }
            
            // If clicking on empty area, start selection box or pan
            const clickedElement = this.getElementAtPoint(pos.x, pos.y);
            if (!clickedElement) {
                // Start panning for empty areas
                this.isPanning = true;
                this.dragOffset.x = e.clientX;
                this.dragOffset.y = e.clientY;
                return;
            } else {
                // Start selection box behavior
                this.isSelecting = true;
                this.showSelectionBox(pos.x, pos.y);
                this.updateCanvasCursor();
                return;
            }
        }
        
        this.isDrawing = true;
        
        // Clear any previous preview coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Check if clicking on an element when drag mode is enabled
        if (this.hoveredElement && this.dragModeEnabled) {
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
                this.redrawCanvas();
            }
            
            // Start dragging immediately regardless of current tool
            this.isDragging = true;
            this.dragOffset.x = pos.x;
            this.dragOffset.y = pos.y;
            this.updateCanvasCursor();
            return;
        }
        
        if (this.currentTool === 'pen') {
            this.currentPath = [{ x: pos.x, y: pos.y }];
        } else if (this.currentTool === 'select') {
            // Check if clicking on a resize handle
            const resizeHandle = this.getResizeHandleForContext(pos.x, pos.y, this.activeCanvasContext);
            if (resizeHandle) {
                this.isResizing = true;
                this.resizeHandle = resizeHandle;
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
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
            
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            
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
                this.performResize(pos, this.resizeHandle, this.activeCanvasContext);
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
        
        if (!this.isDrawing) {
            // Handle hover detection when not drawing
            this.handleHover(pos);
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
            this.performResize(pos.x, pos.y);
            this.redrawCanvas();
        } else if (this.isDragging) {
            // Dragging selected elements
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
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'nested-canvas') {
            // Store preview coordinates for redrawCanvas to use
            this.previewStartX = this.startX;
            this.previewStartY = this.startY;
            this.previewEndX = pos.x;
            this.previewEndY = pos.y;
            this.redrawCanvas();
        }
    }
    
    handleMouseUp(e) {
        // Stop panning
        if (this.isPanning) {
            this.isPanning = false;
            return;
        }
        
        // Handle pan mode interactions (when no tool is selected)
        if (!this.currentTool) {
            const pos = this.getMousePos(e);
            
            if (this.isResizing) {
                this.isResizing = false;
                this.resizeHandle = null;
                this.updateCanvasCursor();
                this.redrawCanvas();
                return;
            } else if (this.isDragging) {
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
                this.updateCanvasCursor();
                this.redrawCanvas();
                return;
            }
            return;
        }
        
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        this.isDrawing = false;
        
        if (this.currentTool === 'pen' && !this.isDragging && !this.isResizing) {
            this.paths.push([...this.currentPath]);
            this.currentPath = [];
            
            // Auto-switch to pan mode after drawing
            this.currentTool = null;
            this.selectedElements = [];
            
            // Update toolbar to show no tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
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
            
            // Auto-switch to pan mode after drawing
            this.currentTool = null;
            this.selectedElements = [];
            
            // Update toolbar to show no tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'circle') {
            // Calculate circle that fits in the bounding box from start to end
            const centerX = (this.startX + pos.x) / 2;
            const centerY = (this.startY + pos.y) / 2;
            const radius = Math.sqrt(
                Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2)
            ) / 2;
            console.log('Circle created:', {
                startX: this.startX,
                startY: this.startY,
                endX: pos.x,
                endY: pos.y,
                centerX: centerX,
                centerY: centerY,
                radius: radius
            });
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
            
            // Auto-switch to pan mode after drawing
            this.currentTool = null;
            this.selectedElements = [];
            
            // Update toolbar to show no tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            
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
            
            // Auto-switch to pan mode after drawing
            this.currentTool = null;
            this.selectedElements = [];
            
            // Update toolbar to show no tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'select') {
            if (this.isResizing) {
                this.isResizing = false;
                this.resizeHandle = null;
            } else if (this.isDragging) {
                this.isDragging = false;
                // Keep selection active after drag - don't clear
            } else {
                this.isSelecting = false;
                this.hideSelectionBox();
                // Clear preview selection before finalizing the actual selection
                this.activeCanvasContext.previewSelectedElements = [];
                this.selectElementsInArea(this.startX, this.startY, pos.x, pos.y);
                this.redrawCanvas();
            }
        }
        
        this.updateCanvasCursor();
    }
    
    handleClick(e) {
        if (this.currentTool === 'text') {
            const pos = this.getMousePos(e);
            
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
            
            // Auto-switch to pan mode after creating text
            this.currentTool = null;
            this.selectedElements = [];
            
            // Update toolbar to show no tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            
            // Create and show text input for immediate editing
            this.createTextInput(newTextBox, this.texts.length - 1);
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        }
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
            this.currentTextInput.remove();
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
                // Zoom towards cursor position
                const worldPos = this.canvasToWorld(canvasX, canvasY);
                camera.zoom = newZoom;
                const newWorldPos = this.canvasToWorld(canvasX, canvasY);
                
                camera.x += newWorldPos.x - worldPos.x;
                camera.y += newWorldPos.y - worldPos.y;
                
                this.redrawCanvas();
                this.updateZoomIndicator();
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
    
    zoomIn() {
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        
        // Calculate where world origin (0,0) should appear on screen (center)
        const targetScreenX = canvas.width / 2;
        const targetScreenY = canvas.height / 2;
        
        const oldZoom = camera.zoom;
        const newZoom = Math.min(camera.maxZoom, oldZoom * 1.2);
        
        // Adjust camera position to keep world origin (0,0) at screen center
        camera.x = targetScreenX / newZoom;
        camera.y = targetScreenY / newZoom;
        camera.zoom = newZoom;

        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
    }
    
    zoomOut() {
        const camera = this.activeCanvasContext.camera;
        const canvas = this.activeCanvasContext.canvas;
        
        // Calculate where world origin (0,0) should appear on screen (center)
        const targetScreenX = canvas.width / 2;
        const targetScreenY = canvas.height / 2;
        
        const oldZoom = camera.zoom;
        const newZoom = Math.max(camera.minZoom, oldZoom / 1.2);
        
        // Adjust camera position to keep world origin (0,0) at screen center
        camera.x = targetScreenX / newZoom;
        camera.y = targetScreenY / newZoom;
        camera.zoom = newZoom;

        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
    }
    
    
    handleDoubleClick(e) {
        const pos = this.getMousePos(e);
        const clickedElement = this.getElementAtPoint(pos.x, pos.y);
        
        // Check if user double-clicked on a text box
        if (clickedElement && clickedElement.type === 'text') {
            const textBox = this.texts[clickedElement.index];
            textBox.isEditing = true;
            
            // Select the text box
            this.selectedElements = [{ type: 'text', index: clickedElement.index }];
            
            // Create text input for editing
            this.createTextInput(textBox, clickedElement.index);
            
            this.redrawCanvas();
        }
        // Check if user double-clicked on a nested canvas
        else if (clickedElement && clickedElement.type === 'nested-canvas') {
            this.openNestedCanvas(clickedElement.index);
        }
    }
    
    openNestedCanvas(index) {
        if (index >= 0 && index < this.nestedCanvases.length) {
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
        
        // Add show animation
        requestAnimationFrame(() => {
            this.nestedCanvasOverlay.classList.add('show');
            
            // Setup canvas dimensions after the transition
            setTimeout(() => {
                this.setupNestedCanvasDimensions(this.nestedCanvases.find(nc => nc.id === this.currentNestedCanvasId));
            }, 350); // Wait for CSS transition to complete (300ms + buffer)
        });
    }
    
    setupNestedCanvasDimensions(nestedCanvasShape) {
        // Use a consistent approach for all nested canvases
        setTimeout(() => {
            const container = this.nestedCanvas.parentElement;
            const containerRect = container.getBoundingClientRect();
            
            // Ensure we have valid dimensions
            if (containerRect.width <= 0 || containerRect.height <= 0) {
                console.warn('Invalid container dimensions, retrying...');
                setTimeout(() => this.setupNestedCanvasDimensions(nestedCanvasShape), 100);
                return;
            }
            
            // Use fixed dimensions to ensure consistency across all nested canvases
            const canvasWidth = Math.round(containerRect.width);
            const canvasHeight = Math.round(containerRect.height);
            
            // Only resize if dimensions have actually changed to avoid coordinate issues
            if (this.nestedCanvas.width !== canvasWidth || this.nestedCanvas.height !== canvasHeight) {
                console.log('Resizing nested canvas:', { 
                    oldWidth: this.nestedCanvas.width,
                    oldHeight: this.nestedCanvas.height,
                    newWidth: canvasWidth,
                    newHeight: canvasHeight
                });
                
                this.nestedCanvas.width = canvasWidth;
                this.nestedCanvas.height = canvasHeight;
                this.nestedCanvas.style.width = canvasWidth + 'px';
                this.nestedCanvas.style.height = canvasHeight + 'px';
                
                // Reset context properties after resize
                this.nestedCtx.lineCap = 'round';
                this.nestedCtx.lineJoin = 'round';
            }
            
            // Redraw the canvas with the new dimensions
            this.redrawCanvas(this.nestedCanvasContext);
        }, 50);
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
        
        console.log('Nested canvas setup:', {
            width: this.nestedCanvas.width,
            height: this.nestedCanvas.height,
            styleWidth: this.nestedCanvas.style.width,
            styleHeight: this.nestedCanvas.style.height,
            rect: rect
        });
        
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
            if (this.nestedCanvasContext.hoveredElement && this.dragModeEnabled) {
                container.classList.add('hovering');
                // Show can-grab cursor when hovering over any draggable element (only when drag mode is enabled)
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
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            return;
        }
        
        this.isDrawing = true;
        
        // Clear any previous preview coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Check if clicking on a hovered element when drag mode is enabled (except pen tool)
        if (this.nestedCanvasContext.hoveredElement && this.dragModeEnabled && this.currentTool !== 'pen') {
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
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
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
                    shape.x += deltaX;
                    shape.y += deltaY;
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
                this.isResizing = false;
                this.resizeHandle = null;
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
        
        console.log('handleNestedWheel called:', {
            deltaY: e.deltaY,
            deltaX: e.deltaX,
            ctrlKey: e.ctrlKey,
            metaKey: e.metaKey,
            hasContext: !!this.nestedCanvasContext,
            hasCamera: !!(this.nestedCanvasContext && this.nestedCanvasContext.camera)
        });
        
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
            
            console.log('Nested canvas zoom attempt:', {
                ctrlKey: e.ctrlKey,
                metaKey: e.metaKey, 
                deltaY: e.deltaY,
                oldZoom,
                newZoom,
                zoomFactor,
                minZoom: camera.minZoom,
                maxZoom: camera.maxZoom,
                willZoom: newZoom !== oldZoom && !isNaN(newZoom) && newZoom > 0
            });
            
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
                    
                    console.log('Zoom applied successfully:', {
                        finalCamera: { x: camera.x, y: camera.y, zoom: camera.zoom }
                    });
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
            } else if (shape.type === 'circle') {
                const distance = Math.sqrt(
                    Math.pow(x - shape.x, 2) + Math.pow(y - shape.y, 2)
                );
                if (distance <= shape.radius) {
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
            console.log('Circle preview:', {
                startX: startX,
                startY: startY,
                endX: endX,
                endY: endY,
                centerX: centerX,
                centerY: centerY,
                radius: radius
            });
            canvasContext.ctx.beginPath();
            canvasContext.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
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
    
    showSelectionBox(worldX, worldY, worldWidth, worldHeight) {
        // Use the appropriate selection box based on active canvas
        const isNestedCanvas = this.activeCanvasContext === this.nestedCanvasContext;
        const selectionBox = isNestedCanvas ? 
            document.getElementById('nested-selection-box') : 
            this.selectionBox;
            
        if (!selectionBox) return;
        
        // Convert world coordinates to screen coordinates for the selection box
        const topLeft = this.worldToCanvas(worldX, worldY);
        const bottomRight = this.worldToCanvas(worldX + worldWidth, worldY + worldHeight);
        
        // Get canvas position for absolute positioning
        const canvas = this.activeCanvasContext.canvas;
        const canvasRect = canvas.getBoundingClientRect();
        
        const screenLeft = Math.min(topLeft.x, bottomRight.x);
        const screenTop = Math.min(topLeft.y, bottomRight.y);
        const screenWidth = Math.abs(bottomRight.x - topLeft.x);
        const screenHeight = Math.abs(bottomRight.y - topLeft.y);
        
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
    
    hideSelectionBox() {
        // Hide the appropriate selection box based on active canvas
        const isNestedCanvas = this.activeCanvasContext === this.nestedCanvasContext;
        const selectionBox = isNestedCanvas ? 
            document.getElementById('nested-selection-box') : 
            this.selectionBox;
            
        if (selectionBox) {
            selectionBox.style.display = 'none';
        }
    }
    
    handleHover(pos) {
        const hoveredElement = this.getElementAtPoint(pos.x, pos.y);
        
        if (hoveredElement !== this.hoveredElement) {
            this.hoveredElement = hoveredElement;
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
            if (shape.type === 'rectangle') {
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
                    console.log('Path detected at hover:', { type: 'path', index: i, distance });
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
            if (shape.type === 'rectangle') {
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
        const previewElements = this.getElementsInArea(x1, y1, x2, y2);
        this.selectedElements = previewElements;
        
        this.updateCanvasCursor();
        this.redrawCanvas();
    }
    
    redrawCanvas(canvasContext = this.activeCanvasContext) {
        const { canvas, ctx, camera, paths, shapes, texts, nestedCanvases, selectedElements, previewSelectedElements, hoveredElement, currentPath } = canvasContext;
        
        ctx.save();
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Draw infinite grid background (for all canvases)
        this.drawGrid(canvasContext);
        
        // Apply camera transformation
        ctx.scale(camera.zoom, camera.zoom);
        ctx.translate(camera.x, camera.y);
        
        // Draw paths
        paths.forEach((path, index) => {
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
        
        // Draw shapes
        shapes.forEach((shape, index) => {
            const isHovered = hoveredElement && 
                             hoveredElement.type === 'shape' && 
                             hoveredElement.index === index;
            const isSelected = selectedElements.some(sel => 
                              sel.type === 'shape' && sel.index === index);
            const isPreviewSelected = previewSelectedElements && previewSelectedElements.some(sel => 
                              sel.type === 'shape' && sel.index === index);
            
            // Priority: Selected (red) > Hovered (blue) > Preview Selected (orange) > Default (gray)
            ctx.strokeStyle = isSelected ? '#ef4444' : 
                             (isHovered ? '#3b82f6' : 
                             (isPreviewSelected ? '#f97316' : '#333'));
            ctx.lineWidth = (isSelected || isHovered || isPreviewSelected) ? 3 : 2;
            
            ctx.beginPath();
            if (shape.type === 'rectangle') {
                ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            } else if (shape.type === 'circle') {
                ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                ctx.stroke();
            }
        });
        
        // Draw texts
        ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        texts.forEach((textObj, index) => {
            if (textObj.isEditing) return; // Don't render text that's being edited
            
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
        
        // Draw preview shape if currently drawing rectangle, circle, or nested-canvas
        if ((this.currentTool === 'rectangle' || this.currentTool === 'circle' || this.currentTool === 'nested-canvas') && 
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
        
        // Draw resize handles for selected elements (in world space)
        this.drawResizeHandles(canvasContext);
        
        // Restore context before drawing UI elements
        ctx.restore();
    }
    
    drawGrid(canvasContext) {
        const { canvas, ctx, camera } = canvasContext;
        const gridSize = 50; // Grid size in world units
        const screenGridSize = gridSize * camera.zoom;
        
        // Only draw if grid is visible (not too small)
        if (screenGridSize < 4) return;
        
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
        
        // Draw origin marker at world (0,0)
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
        if (canvasContext.selectedElements.length !== 1) {
            return; // Only show handles for single selection
        }
        
        const element = canvasContext.selectedElements[0];
        let bounds = null;
        
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'rectangle') {
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
            // Draw handles in world space (with camera transformations applied)
            canvasContext.ctx.fillStyle = '#3b82f6'; // Blue
            canvasContext.ctx.strokeStyle = '#ffffff'; // White border
            canvasContext.ctx.lineWidth = 2 / canvasContext.camera.zoom; // Scale line width with zoom
            
            // Handle size in world coordinates (scales with zoom)
            const handleSize = 8 / canvasContext.camera.zoom;
            
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
            if (shape.type === 'rectangle') {
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
        const handleSize = 8 / this.activeCanvasContext.camera.zoom; // Handle size in world coordinates
        const tolerance = 4 / this.activeCanvasContext.camera.zoom; // Tolerance in world coordinates
        
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
        
        return null;
    }
    
    performResize(currentX, currentY) {
        if (this.selectedElements.length !== 1 || !this.resizeHandle) return;
        
        const element = this.selectedElements[0];
        if (element.type !== 'shape' && element.type !== 'nested-canvas') return;
        
        const shape = element.type === 'shape' ? this.shapes[element.index] : this.activeCanvasContext.nestedCanvases[element.index];
        const deltaX = currentX - this.dragOffset.x;
        const deltaY = currentY - this.dragOffset.y;
        
        // Check if it's a rectangle shape or a nested canvas (nested canvases are always rectangular)
        if ((element.type === 'shape' && shape.type === 'rectangle') || element.type === 'nested-canvas') {
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
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths = [];
        this.shapes = [];
        this.texts = [];
        this.nestedCanvases = [];
        this.nestedCanvasData.clear();
        this.selectedElements = [];
        this.hoveredElement = null;
        this.hideSelectionBox();
        this.redrawCanvas();
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
                if (shape.type === 'rectangle') {
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
        
        // Check if world origin (0,0) is centered at current zoom level
        const expectedCameraX = canvas.width / 2 / camera.zoom;
        const expectedCameraY = canvas.height / 2 / camera.zoom;
        const isAtOriginalCenter = 
            Math.abs(camera.x - expectedCameraX) < tolerance && 
            Math.abs(camera.y - expectedCameraY) < tolerance;
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
        const canvas = this.activeCanvasContext.canvas;
        
        // Calculate camera position to center world origin (0,0) at current zoom
        camera.x = canvas.width / 2 / camera.zoom;
        camera.y = canvas.height / 2 / camera.zoom;
        
        this.redrawCanvas();
        this.updateRecenterButton();
    }
    
    resetZoom() {
        // Reset zoom to 100% (without changing position)
        const camera = this.activeCanvasContext.camera;
        camera.zoom = 1;
        
        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
    }
    
    
    selectElementsInAreaForContext(x1, y1, x2, y2, canvasContext) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        canvasContext.selectedElements = [];
        
        // Check paths
        canvasContext.paths.forEach((path, index) => {
            const pathBounds = this.getPathBounds(path);
            if (pathBounds.x >= minX && pathBounds.x + pathBounds.width <= maxX &&
                pathBounds.y >= minY && pathBounds.y + pathBounds.height <= maxY) {
                canvasContext.selectedElements.push({ type: 'path', index });
            }
        });
        
        // Check shapes
        canvasContext.shapes.forEach((shape, index) => {
            if (shape.type === 'rectangle') {
                if (shape.x >= minX && shape.x + shape.width <= maxX &&
                    shape.y >= minY && shape.y + shape.height <= maxY) {
                    canvasContext.selectedElements.push({ type: 'shape', index });
                }
            } else if (shape.type === 'circle') {
                if (shape.x - shape.radius >= minX && shape.x + shape.radius <= maxX &&
                    shape.y - shape.radius >= minY && shape.y + shape.radius <= maxY) {
                    canvasContext.selectedElements.push({ type: 'shape', index });
                }
            }
        });
        
        // Check texts
        canvasContext.texts.forEach((text, index) => {
            if (text.x >= minX && text.x <= maxX && text.y >= minY && text.y <= maxY) {
                canvasContext.selectedElements.push({ type: 'text', index });
            }
        });
    }
    
    getResizeHandleForContext(worldX, worldY, canvasContext) {
        if (canvasContext.selectedElements.length !== 1) return null;
        
        const element = canvasContext.selectedElements[0];
        let bounds = null;
        
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            if (shape.type === 'rectangle') {
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
        const handleSize = 8 / canvasContext.camera.zoom; // Handle size in world coordinates
        const tolerance = 4 / canvasContext.camera.zoom; // Tolerance in world coordinates
        
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
        
        return null;
    }
    
    performResizeForContext(currentX, currentY, canvasContext) {
        if (canvasContext.selectedElements.length !== 1 || !this.resizeHandle) return;
        
        const element = canvasContext.selectedElements[0];
        const deltaX = currentX - this.dragOffset.x;
        const deltaY = currentY - this.dragOffset.y;
        
        if (element.type === 'shape') {
            const shape = canvasContext.shapes[element.index];
            
            if (shape.type === 'rectangle') {
                switch (this.resizeHandle) {
                    case 'top-left':
                        shape.x += deltaX;
                        shape.y += deltaY;
                        shape.width -= deltaX;
                        shape.height -= deltaY;
                        break;
                    case 'top-right':
                        shape.y += deltaY;
                        shape.width += deltaX;
                        shape.height -= deltaY;
                        break;
                    case 'bottom-left':
                        shape.x += deltaX;
                        shape.width -= deltaX;
                        shape.height += deltaY;
                        break;
                    case 'bottom-right':
                        shape.width += deltaX;
                        shape.height += deltaY;
                        break;
                }
            } else if (shape.type === 'circle') {
                const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
                const direction = deltaX > 0 || deltaY > 0 ? 1 : -1;
                shape.radius = Math.max(5, shape.radius + direction * distance * 0.1);
            }
        } else if (element.type === 'text') {
            const text = canvasContext.texts[element.index];
            
            switch (this.resizeHandle) {
                case 'top-left':
                    text.x += deltaX;
                    text.y += deltaY;
                    text.width -= deltaX;
                    text.height -= deltaY;
                    break;
                case 'top-right':
                    text.y += deltaY;
                    text.width += deltaX;
                    text.height -= deltaY;
                    break;
                case 'bottom-left':
                    text.x += deltaX;
                    text.width -= deltaX;
                    text.height += deltaY;
                    break;
                case 'bottom-right':
                    text.width += deltaX;
                    text.height += deltaY;
                    break;
            }
            
            // Ensure minimum text box size
            text.width = Math.max(50, text.width);
            text.height = Math.max(20, text.height);
        } else if (element.type === 'nested-canvas') {
            const nestedCanvas = canvasContext.nestedCanvases[element.index];
            
            switch (this.resizeHandle) {
                case 'top-left':
                    nestedCanvas.x += deltaX;
                    nestedCanvas.y += deltaY;
                    nestedCanvas.width -= deltaX;
                    nestedCanvas.height -= deltaY;
                    break;
                case 'top-right':
                    nestedCanvas.y += deltaY;
                    nestedCanvas.width += deltaX;
                    nestedCanvas.height -= deltaY;
                    break;
                case 'bottom-left':
                    nestedCanvas.x += deltaX;
                    nestedCanvas.width -= deltaX;
                    nestedCanvas.height += deltaY;
                    break;
                case 'bottom-right':
                    nestedCanvas.width += deltaX;
                    nestedCanvas.height += deltaY;
                    break;
            }
            
            // Ensure minimum nested canvas size
            nestedCanvas.width = Math.max(100, nestedCanvas.width);
            nestedCanvas.height = Math.max(100, nestedCanvas.height);
        }
        
        this.dragOffset.x = currentX;
        this.dragOffset.y = currentY;
    }
}

// Export the class for use as a module (if modules are supported)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CanvasMaker;
} else if (typeof window !== 'undefined') {
    window.CanvasMaker = CanvasMaker;
}

// Initialize the app when the DOM is loaded (only if running standalone)
if (typeof document !== 'undefined' && typeof module === 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        new CanvasMaker();
    });
}