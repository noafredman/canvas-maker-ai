class CanvasMaker {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'pen';
        this.isDrawing = false;
        this.isSelecting = false;
        this.isDragging = false;
        this.isResizing = false;
        this.resizeHandle = null;
        this.startX = 0;
        this.startY = 0;
        this.currentPath = [];
        this.paths = [];
        this.shapes = [];
        this.texts = [];
        this.selectedElements = [];
        this.hoveredElement = null;
        this.dragOffset = { x: 0, y: 0 };
        this.clipboard = [];
        
        // Preview shape coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Camera/viewport system for infinite canvas
        this.camera = {
            x: 0,
            y: 0,
            zoom: 1,
            minZoom: 0.1,
            maxZoom: 5
        };
        this.isPanning = false;
        
        // Touch gesture state
        this.touches = [];
        this.lastTouchDistance = 0;
        
        this.selectionBox = document.getElementById('selection-box');
        this.zoomIndicator = document.getElementById('zoom-indicator');
        this.recenterBtn = document.getElementById('recenter-btn');
        
        if (!this.selectionBox) {
            console.error('Selection box element not found!');
        }
        if (!this.zoomIndicator) {
            console.error('Zoom indicator element not found!');
        }
        if (!this.recenterBtn) {
            console.error('Recenter button element not found!');
        }
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
        this.updateZoomIndicator();
        this.updateRecenterButton();
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        
        // Set canvas size to match the element size in CSS pixels
        this.canvas.width = rect.width;
        this.canvas.height = rect.height;
        
        this.canvas.style.width = rect.width + 'px';
        this.canvas.style.height = rect.height + 'px';
        
        this.ctx.lineCap = 'round';
        this.ctx.lineJoin = 'round';
        this.ctx.lineWidth = 2;
        this.ctx.strokeStyle = '#333';
        this.ctx.fillStyle = 'transparent';
    }
    
    setupEventListeners() {
        this.canvas.addEventListener('mousedown', this.handleMouseDown.bind(this));
        this.canvas.addEventListener('mousemove', this.handleMouseMove.bind(this));
        this.canvas.addEventListener('mouseup', this.handleMouseUp.bind(this));
        this.canvas.addEventListener('click', this.handleClick.bind(this));
        
        window.addEventListener('resize', this.setupCanvas.bind(this));
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
    }
    
    setupToolbar() {
        const toolButtons = document.querySelectorAll('.tool-btn');
        const makeRealBtn = document.getElementById('make-real-btn');
        const clearBtn = document.getElementById('clear-btn');
        const closeModal = document.getElementById('close-modal');
        
        toolButtons.forEach(btn => {
            btn.addEventListener('click', () => {
                toolButtons.forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.currentTool = btn.dataset.tool;
                this.updateCanvasCursor();
            });
        });
        
        makeRealBtn.addEventListener('click', this.makeReal.bind(this));
        clearBtn.addEventListener('click', this.clearCanvas.bind(this));
        closeModal.addEventListener('click', this.closeModal.bind(this));
    }
    
    updateCanvasCursor() {
        const container = document.querySelector('.canvas-container');
        container.className = 'canvas-container';
        container.classList.add(`${this.currentTool}-cursor`);
        
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
        if (this.currentTool === 'select' && this.hoveredElement) {
            container.classList.add('hovering');
            if (this.selectedElements.length > 0 && !this.isDragging && !this.isResizing) {
                container.classList.add('can-grab');
            }
        }
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Transform canvas coordinates to world coordinates
        // Note: canvasX/Y are already in CSS pixels, no DPR scaling needed here
        return this.canvasToWorld(canvasX, canvasY);
    }
    
    canvasToWorld(canvasX, canvasY) {
        return {
            x: (canvasX / this.camera.zoom) - this.camera.x,
            y: (canvasY / this.camera.zoom) - this.camera.y
        };
    }
    
    worldToCanvas(worldX, worldY) {
        return {
            x: (worldX + this.camera.x) * this.camera.zoom,
            y: (worldY + this.camera.y) * this.camera.zoom
        };
    }
    
    handleMouseDown(e) {
        console.log('handleMouseDown called, button:', e.button, 'target:', e.target);
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
        
        this.isDrawing = true;
        
        // Clear any previous preview coordinates
        this.previewStartX = undefined;
        this.previewStartY = undefined;
        this.previewEndX = undefined;
        this.previewEndY = undefined;
        
        // Check if clicking on an element in any mode (except pen tool)
        if (this.hoveredElement && this.currentTool !== 'pen') {
            // Check if the clicked element is already selected - if so, start dragging
            const isAlreadySelected = this.selectedElements.some(sel => {
                if (this.hoveredElement.type === 'shape') {
                    return sel.type === 'shape' && sel.index === this.hoveredElement.index;
                } else if (this.hoveredElement.type === 'text') {
                    return sel.type === 'text' && sel.index === this.hoveredElement.index;
                } else if (this.hoveredElement.type === 'path') {
                    return sel.type === 'path' && sel.index === this.hoveredElement.index;
                }
                return false;
            });
            
            if (isAlreadySelected && this.currentTool === 'select') {
                // Start dragging the already-selected element
                this.isDragging = true;
                this.dragOffset.x = pos.x;
                this.dragOffset.y = pos.y;
                return;
            } else {
                // Select the clicked element regardless of current tool
                this.selectedElements = [this.hoveredElement];
                this.currentTool = 'select';
                this.updateCanvasCursor();
                this.redrawCanvas();
                
                // Update toolbar to show select tool as active
                document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('select-tool').classList.add('active');
                
                return; // Don't proceed with drawing
            }
        }
        
        if (this.currentTool === 'pen') {
            this.currentPath = [{ x: pos.x, y: pos.y }];
        } else if (this.currentTool === 'select') {
            // Check if clicking on a resize handle
            const resizeHandle = this.getResizeHandle(pos.x, pos.y);
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
                } else if (this.selectedElements.length > 0) {
                    // If we have selected elements and didn't click on anything specific, deselect
                    this.selectedElements = [];
                    this.redrawCanvas();
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
            const deltaX = e.clientX - this.dragOffset.x;
            const deltaY = e.clientY - this.dragOffset.y;
            
            this.camera.x += deltaX / this.camera.zoom;
            this.camera.y += deltaY / this.camera.zoom;
            
            this.dragOffset.x = e.clientX;
            this.dragOffset.y = e.clientY;
            
            this.redrawCanvas();
            this.updateRecenterButton();
            return;
        }
        
        const pos = this.getMousePos(e);
        
        if (!this.isDrawing) {
            // Handle hover detection when not drawing
            this.handleHover(pos);
            return;
        }
        
        if (this.currentTool === 'pen') {
            this.currentPath.push({ x: pos.x, y: pos.y });
            // Don't draw directly here - let redrawCanvas handle it
            this.redrawCanvas();
        } else if (this.currentTool === 'select' && this.isSelecting) {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.showSelectionBox(this.startX, this.startY, width, height);
        } else if (this.currentTool === 'select' && this.isResizing) {
            // Resizing selected element
            this.performResize(pos.x, pos.y);
            this.redrawCanvas();
        } else if (this.currentTool === 'select' && this.isDragging) {
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
                }
            });
            
            this.dragOffset.x = pos.x;
            this.dragOffset.y = pos.y;
            this.redrawCanvas();
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle') {
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
        
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        this.isDrawing = false;
        
        if (this.currentTool === 'pen') {
            this.paths.push([...this.currentPath]);
            this.currentPath = [];
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
            
            // Auto-switch to select mode and select the newly created shape
            this.currentTool = 'select';
            const newShapeIndex = this.shapes.length - 1;
            this.selectedElements = [{ type: 'shape', index: newShapeIndex }];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
            this.updateCanvasCursor();
            this.redrawCanvas();
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(pos.x - this.startX, 2) + Math.pow(pos.y - this.startY, 2)
            );
            this.shapes.push({
                type: 'circle',
                x: this.startX,
                y: this.startY,
                radius
            });
            // Clear preview coordinates
            this.previewStartX = undefined;
            this.previewStartY = undefined;
            this.previewEndX = undefined;
            this.previewEndY = undefined;
            
            // Auto-switch to select mode and select the newly created shape
            this.currentTool = 'select';
            this.selectedElements = [{ type: 'shape', index: this.shapes.length - 1 }];
            
            // Update toolbar to show select tool as active
            document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
            document.getElementById('select-tool').classList.add('active');
            
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
                this.selectElementsInArea(this.startX, this.startY, pos.x, pos.y);
                this.redrawCanvas();
            }
        }
        
        this.updateCanvasCursor();
    }
    
    handleClick(e) {
        if (this.currentTool === 'text') {
            const pos = this.getMousePos(e);
            const text = prompt('Enter text:');
            if (text) {
                this.texts.push({
                    text,
                    x: pos.x,
                    y: pos.y
                });
                
                // Auto-switch to select mode and select the newly created text
                this.currentTool = 'select';
                this.selectedElements = [{ type: 'text', index: this.texts.length - 1 }];
                
                // Update toolbar to show select tool as active
                document.querySelectorAll('.tool-btn').forEach(btn => btn.classList.remove('active'));
                document.getElementById('select-tool').classList.add('active');
                
                this.updateCanvasCursor();
                this.redrawCanvas();
            }
        }
    }
    
    handleKeyDown(e) {
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
        
        const rect = this.canvas.getBoundingClientRect();
        const canvasX = e.clientX - rect.left;
        const canvasY = e.clientY - rect.top;
        
        // Detect pinch-to-zoom vs scroll
        // On trackpad: ctrlKey is true for pinch-to-zoom
        // On trackpad: ctrlKey is false for two-finger scroll
        if (e.ctrlKey || e.metaKey) {
            // Pinch-to-zoom
            const zoomFactor = e.deltaY > 0 ? 0.95 : 1.05;
            const oldZoom = this.camera.zoom;
            const newZoom = Math.max(this.camera.minZoom, Math.min(this.camera.maxZoom, oldZoom * zoomFactor));
            
            if (newZoom !== oldZoom) {
                // Zoom towards cursor position
                const worldPos = this.canvasToWorld(canvasX, canvasY);
                this.camera.zoom = newZoom;
                const newWorldPos = this.canvasToWorld(canvasX, canvasY);
                
                this.camera.x += newWorldPos.x - worldPos.x;
                this.camera.y += newWorldPos.y - worldPos.y;
                
                this.redrawCanvas();
                this.updateZoomIndicator();
            }
        } else {
            // Two-finger scroll (pan)
            const panSpeed = 1 / this.camera.zoom;
            this.camera.x -= e.deltaX * panSpeed;
            this.camera.y -= e.deltaY * panSpeed;
            
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
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldCenter = this.canvasToWorld(centerX, centerY);
        
        this.camera.zoom = Math.min(this.camera.maxZoom, this.camera.zoom * 1.2);
        
        const newWorldCenter = this.canvasToWorld(centerX, centerY);
        this.camera.x += newWorldCenter.x - worldCenter.x;
        this.camera.y += newWorldCenter.y - worldCenter.y;
        
        this.redrawCanvas();
        this.updateZoomIndicator();
    }
    
    zoomOut() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const worldCenter = this.canvasToWorld(centerX, centerY);
        
        this.camera.zoom = Math.max(this.camera.minZoom, this.camera.zoom / 1.2);
        
        const newWorldCenter = this.canvasToWorld(centerX, centerY);
        this.camera.x += newWorldCenter.x - worldCenter.x;
        this.camera.y += newWorldCenter.y - worldCenter.y;
        
        this.redrawCanvas();
        this.updateZoomIndicator();
    }
    
    resetZoom() {
        this.camera.zoom = 1;
        this.camera.x = 0;
        this.camera.y = 0;
        this.redrawCanvas();
        this.updateZoomIndicator();
        this.updateRecenterButton();
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
            }
        });
        
        this.redrawCanvas();
        this.updateCanvasCursor();
    }
    
    drawPreviewShape(startX, startY, endX, endY) {
        this.ctx.strokeStyle = '#3b82f6';
        this.ctx.setLineDash([5, 5]);
        
        if (this.currentTool === 'rectangle') {
            const width = endX - startX;
            const height = endY - startY;
            this.ctx.strokeRect(startX, startY, width, height);
        } else if (this.currentTool === 'circle') {
            const radius = Math.sqrt(
                Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2)
            );
            this.ctx.beginPath();
            this.ctx.arc(startX, startY, radius, 0, 2 * Math.PI);
            this.ctx.stroke();
        }
        
        this.ctx.setLineDash([]);
        this.ctx.strokeStyle = '#333';
    }
    
    showSelectionBox(worldX, worldY, worldWidth, worldHeight) {
        if (!this.selectionBox) return;
        
        // Convert world coordinates to screen coordinates for the selection box
        const topLeft = this.worldToCanvas(worldX, worldY);
        const bottomRight = this.worldToCanvas(worldX + worldWidth, worldY + worldHeight);
        
        const screenLeft = Math.min(topLeft.x, bottomRight.x);
        const screenTop = Math.min(topLeft.y, bottomRight.y);
        const screenWidth = Math.abs(bottomRight.x - topLeft.x);
        const screenHeight = Math.abs(bottomRight.y - topLeft.y);
        
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = screenLeft + 'px';
        this.selectionBox.style.top = screenTop + 'px';
        this.selectionBox.style.width = screenWidth + 'px';
        this.selectionBox.style.height = screenHeight + 'px';
        
        // Ensure visibility
        this.selectionBox.style.border = '3px dashed #3b82f6';
        this.selectionBox.style.background = 'rgba(59, 130, 246, 0.2)';
        this.selectionBox.style.zIndex = '1000';
    }
    
    hideSelectionBox() {
        this.selectionBox.style.display = 'none';
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
        // Check shapes first (they're on top)
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
        
        // Check texts
        for (let i = this.texts.length - 1; i >= 0; i--) {
            const text = this.texts[i];
            // Approximate text bounds (simple check)
            const textWidth = this.ctx.measureText(text.text).width;
            const textHeight = 16; // font size
            if (x >= text.x && x <= text.x + textWidth &&
                y >= text.y - textHeight && y <= text.y) {
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

    selectElementsInArea(x1, y1, x2, y2) {
        const minX = Math.min(x1, x2);
        const maxX = Math.max(x1, x2);
        const minY = Math.min(y1, y2);
        const maxY = Math.max(y1, y2);
        
        
        this.selectedElements = [];
        
        // Check paths
        this.paths.forEach((path, index) => {
            const inSelection = path.some(point => 
                point.x >= minX && point.x <= maxX && 
                point.y >= minY && point.y <= maxY
            );
            if (inSelection) {
                this.selectedElements.push({ type: 'path', index });
            }
        });
        
        // Check shapes
        this.shapes.forEach((shape, index) => {
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
                this.selectedElements.push({ type: 'shape', index });
            }
        });
        
        // Check texts
        this.texts.forEach((text, index) => {
            if (text.x >= minX && text.x <= maxX && 
                text.y >= minY && text.y <= maxY) {
                this.selectedElements.push({ type: 'text', index });
            }
        });
        
        this.updateCanvasCursor();
        this.redrawCanvas();
    }
    
    redrawCanvas() {
        this.ctx.save();
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw infinite grid background
        this.drawGrid();
        
        // Apply camera transformation
        this.ctx.scale(this.camera.zoom, this.camera.zoom);
        this.ctx.translate(this.camera.x, this.camera.y);
        
        // Draw paths
        this.paths.forEach((path, index) => {
            const isHovered = this.hoveredElement && 
                             this.hoveredElement.type === 'path' && 
                             this.hoveredElement.index === index;
            const isSelected = this.selectedElements.some(sel => 
                              sel.type === 'path' && sel.index === index);
            
            this.ctx.strokeStyle = isSelected ? '#ef4444' : (isHovered ? '#3b82f6' : '#333');
            this.ctx.lineWidth = (isSelected || isHovered) ? 3 : 2;
            
            if (path.length > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    this.ctx.lineTo(path[i].x, path[i].y);
                }
                this.ctx.stroke();
            }
        });
        
        // Draw current path being drawn
        if (this.currentPath.length > 0) {
            this.ctx.strokeStyle = '#333';
            this.ctx.lineWidth = 2;
            this.ctx.beginPath();
            this.ctx.moveTo(this.currentPath[0].x, this.currentPath[0].y);
            for (let i = 1; i < this.currentPath.length; i++) {
                this.ctx.lineTo(this.currentPath[i].x, this.currentPath[i].y);
            }
            this.ctx.stroke();
        }
        
        // Draw shapes
        this.shapes.forEach((shape, index) => {
            const isHovered = this.hoveredElement && 
                             this.hoveredElement.type === 'shape' && 
                             this.hoveredElement.index === index;
            const isSelected = this.selectedElements.some(sel => 
                              sel.type === 'shape' && sel.index === index);
            
            this.ctx.strokeStyle = isSelected ? '#ef4444' : (isHovered ? '#3b82f6' : '#333');
            this.ctx.lineWidth = (isSelected || isHovered) ? 3 : 2;
            
            this.ctx.beginPath();
            if (shape.type === 'rectangle') {
                this.ctx.strokeRect(shape.x, shape.y, shape.width, shape.height);
            } else if (shape.type === 'circle') {
                this.ctx.arc(shape.x, shape.y, shape.radius, 0, 2 * Math.PI);
                this.ctx.stroke();
            }
        });
        
        // Draw texts
        this.ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
        this.texts.forEach((textObj, index) => {
            const isHovered = this.hoveredElement && 
                             this.hoveredElement.type === 'text' && 
                             this.hoveredElement.index === index;
            const isSelected = this.selectedElements.some(sel => 
                              sel.type === 'text' && sel.index === index);
            
            this.ctx.fillStyle = isSelected ? '#ef4444' : (isHovered ? '#3b82f6' : '#333');
            this.ctx.fillText(textObj.text, textObj.x, textObj.y);
        });
        
        // Draw preview shape if currently drawing rectangle or circle
        if ((this.currentTool === 'rectangle' || this.currentTool === 'circle') && 
            this.isDrawing && this.previewStartX !== undefined) {
            this.drawPreviewShape(this.previewStartX, this.previewStartY, this.previewEndX, this.previewEndY);
        }
        
        // Restore context before drawing UI elements
        this.ctx.restore();
        
        // Draw resize handles for selected elements (in screen space)
        this.drawResizeHandles();
    }
    
    drawGrid() {
        const gridSize = 50; // Grid size in world units
        const screenGridSize = gridSize * this.camera.zoom;
        
        // Only draw if grid is visible (not too small)
        if (screenGridSize < 4) return;
        
        // Calculate opacity based on grid size
        const opacity = Math.min(0.15, Math.max(0.03, screenGridSize / 200));
        this.ctx.strokeStyle = `rgba(150, 150, 150, ${opacity})`;
        this.ctx.lineWidth = 1;
        
        // Calculate visible world bounds with extra margin for infinite feel
        const topLeft = this.canvasToWorld(-gridSize, -gridSize);
        const bottomRight = this.canvasToWorld(this.canvas.width + gridSize, this.canvas.height + gridSize);
        
        // Extend grid way beyond visible area for truly infinite feel
        const margin = gridSize * 10;
        const startX = Math.floor((topLeft.x - margin) / gridSize) * gridSize;
        const endX = Math.ceil((bottomRight.x + margin) / gridSize) * gridSize;
        const startY = Math.floor((topLeft.y - margin) / gridSize) * gridSize;
        const endY = Math.ceil((bottomRight.y + margin) / gridSize) * gridSize;
        
        // Draw grid lines in screen space without camera transformation
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0); // Reset transform
        this.ctx.beginPath();
        
        // Vertical lines
        for (let x = startX; x <= endX; x += gridSize) {
            const screenPos = this.worldToCanvas(x, 0);
            this.ctx.moveTo(screenPos.x, 0);
            this.ctx.lineTo(screenPos.x, this.canvas.height);
        }
        
        // Horizontal lines
        for (let y = startY; y <= endY; y += gridSize) {
            const screenPos = this.worldToCanvas(0, y);
            this.ctx.moveTo(0, screenPos.y);
            this.ctx.lineTo(this.canvas.width, screenPos.y);
        }
        
        this.ctx.stroke();
        this.ctx.restore();
    }
    
    drawResizeHandles() {
        if (this.selectedElements.length !== 1) {
            return; // Only show handles for single selection
        }
        
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
        }
        
        if (bounds) {
            // Draw handles in screen space (no transformations applied)
            this.ctx.save();
            
            // Reset any transformations for UI elements
            this.ctx.setTransform(1, 0, 0, 1, 0, 0);
            
            // Convert world coordinates to screen coordinates for handles
            const topLeft = this.worldToCanvas(bounds.x, bounds.y);
            const bottomRight = this.worldToCanvas(bounds.x + bounds.width, bounds.y + bounds.height);
            
            this.ctx.fillStyle = '#3b82f6';
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 2;
            
            const handleSize = 8;
            const screenWidth = bottomRight.x - topLeft.x;
            const screenHeight = bottomRight.y - topLeft.y;
            
            // Only show handles if the shape is reasonably sized on screen
            if (Math.abs(screenWidth) > 20 && Math.abs(screenHeight) > 20) {
                const handles = [
                    { x: topLeft.x - handleSize/2, y: topLeft.y - handleSize/2, type: 'nw' },
                    { x: bottomRight.x - handleSize/2, y: topLeft.y - handleSize/2, type: 'ne' },
                    { x: topLeft.x - handleSize/2, y: bottomRight.y - handleSize/2, type: 'sw' },
                    { x: bottomRight.x - handleSize/2, y: bottomRight.y - handleSize/2, type: 'se' },
                    { x: topLeft.x + screenWidth/2 - handleSize/2, y: topLeft.y - handleSize/2, type: 'n' },
                    { x: topLeft.x + screenWidth/2 - handleSize/2, y: bottomRight.y - handleSize/2, type: 's' },
                    { x: topLeft.x - handleSize/2, y: topLeft.y + screenHeight/2 - handleSize/2, type: 'w' },
                    { x: bottomRight.x - handleSize/2, y: topLeft.y + screenHeight/2 - handleSize/2, type: 'e' }
                ];
                
                handles.forEach(handle => {
                    this.ctx.fillRect(handle.x, handle.y, handleSize, handleSize);
                    this.ctx.strokeRect(handle.x, handle.y, handleSize, handleSize);
                });
            }
            
            this.ctx.restore();
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
        }
        
        if (!bounds) return null;
        
        // Convert world coordinates to screen coordinates for hit testing
        const screenPos = this.worldToCanvas(worldX, worldY);
        const topLeft = this.worldToCanvas(bounds.x, bounds.y);
        const bottomRight = this.worldToCanvas(bounds.x + bounds.width, bounds.y + bounds.height);
        
        const handleSize = 8;
        const tolerance = 4;
        const screenWidth = bottomRight.x - topLeft.x;
        const screenHeight = bottomRight.y - topLeft.y;
        
        // Only check handles if shape is reasonably sized
        if (Math.abs(screenWidth) < 20 || Math.abs(screenHeight) < 20) {
            return null;
        }
        
        const handles = [
            { x: topLeft.x - handleSize/2, y: topLeft.y - handleSize/2, type: 'nw' },
            { x: bottomRight.x - handleSize/2, y: topLeft.y - handleSize/2, type: 'ne' },
            { x: topLeft.x - handleSize/2, y: bottomRight.y - handleSize/2, type: 'sw' },
            { x: bottomRight.x - handleSize/2, y: bottomRight.y - handleSize/2, type: 'se' },
            { x: topLeft.x + screenWidth/2 - handleSize/2, y: topLeft.y - handleSize/2, type: 'n' },
            { x: topLeft.x + screenWidth/2 - handleSize/2, y: bottomRight.y - handleSize/2, type: 's' },
            { x: topLeft.x - handleSize/2, y: topLeft.y + screenHeight/2 - handleSize/2, type: 'w' },
            { x: bottomRight.x - handleSize/2, y: topLeft.y + screenHeight/2 - handleSize/2, type: 'e' }
        ];
        
        for (let handle of handles) {
            if (screenPos.x >= handle.x - tolerance && screenPos.x <= handle.x + handleSize + tolerance &&
                screenPos.y >= handle.y - tolerance && screenPos.y <= handle.y + handleSize + tolerance) {
                return handle.type;
            }
        }
        
        return null;
    }
    
    performResize(currentX, currentY) {
        if (this.selectedElements.length !== 1 || !this.resizeHandle) return;
        
        const element = this.selectedElements[0];
        if (element.type !== 'shape') return;
        
        const shape = this.shapes[element.index];
        const deltaX = currentX - this.dragOffset.x;
        const deltaY = currentY - this.dragOffset.y;
        
        if (shape.type === 'rectangle') {
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
        this.selectedElements = [];
        this.hoveredElement = null;
        this.hideSelectionBox();
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
        if (this.zoomIndicator) {
            const zoomPercentage = Math.round(this.camera.zoom * 100);
            this.zoomIndicator.textContent = `${zoomPercentage}%`;
        }
    }
    
    updateRecenterButton() {
        if (this.recenterBtn) {
            // Show button if camera is not at origin (with small tolerance for floating point)
            const tolerance = 0.1;
            const isAtOrigin = Math.abs(this.camera.x) < tolerance && Math.abs(this.camera.y) < tolerance;
            this.recenterBtn.style.display = isAtOrigin ? 'none' : 'flex';
        }
    }
    
    recenterCanvas() {
        this.camera.x = 0;
        this.camera.y = 0;
        this.redrawCanvas();
        this.updateRecenterButton();
    }
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CanvasMaker();
});