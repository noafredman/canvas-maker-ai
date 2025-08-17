class CanvasMaker {
    constructor() {
        this.canvas = document.getElementById('canvas');
        this.ctx = this.canvas.getContext('2d');
        this.currentTool = 'pen';
        this.isDrawing = false;
        this.isSelecting = false;
        this.startX = 0;
        this.startY = 0;
        this.currentPath = [];
        this.paths = [];
        this.shapes = [];
        this.texts = [];
        this.selectedElements = [];
        this.selectionBox = document.getElementById('selection-box');
        
        this.setupCanvas();
        this.setupEventListeners();
        this.setupToolbar();
    }
    
    setupCanvas() {
        const rect = this.canvas.getBoundingClientRect();
        const dpr = window.devicePixelRatio || 1;
        
        this.canvas.width = rect.width * dpr;
        this.canvas.height = rect.height * dpr;
        
        this.ctx.scale(dpr, dpr);
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
    }
    
    getMousePos(e) {
        const rect = this.canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    }
    
    handleMouseDown(e) {
        const pos = this.getMousePos(e);
        this.startX = pos.x;
        this.startY = pos.y;
        this.isDrawing = true;
        
        if (this.currentTool === 'pen') {
            this.currentPath = [{ x: pos.x, y: pos.y }];
            this.ctx.beginPath();
            this.ctx.moveTo(pos.x, pos.y);
        } else if (this.currentTool === 'select') {
            this.isSelecting = true;
            this.showSelectionBox(pos.x, pos.y, 0, 0);
        }
    }
    
    handleMouseMove(e) {
        if (!this.isDrawing) return;
        
        const pos = this.getMousePos(e);
        
        if (this.currentTool === 'pen') {
            this.currentPath.push({ x: pos.x, y: pos.y });
            this.ctx.lineTo(pos.x, pos.y);
            this.ctx.stroke();
        } else if (this.currentTool === 'select' && this.isSelecting) {
            const width = pos.x - this.startX;
            const height = pos.y - this.startY;
            this.showSelectionBox(this.startX, this.startY, width, height);
        } else if (this.currentTool === 'rectangle' || this.currentTool === 'circle') {
            this.redrawCanvas();
            this.drawPreviewShape(this.startX, this.startY, pos.x, pos.y);
        }
    }
    
    handleMouseUp(e) {
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
            this.redrawCanvas();
        } else if (this.currentTool === 'select') {
            this.isSelecting = false;
            this.hideSelectionBox();
            this.selectElementsInArea(this.startX, this.startY, pos.x, pos.y);
        }
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
                this.redrawCanvas();
            }
        }
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
    
    showSelectionBox(x, y, width, height) {
        this.selectionBox.style.display = 'block';
        this.selectionBox.style.left = Math.min(x, x + width) + 'px';
        this.selectionBox.style.top = Math.min(y, y + height) + 'px';
        this.selectionBox.style.width = Math.abs(width) + 'px';
        this.selectionBox.style.height = Math.abs(height) + 'px';
    }
    
    hideSelectionBox() {
        this.selectionBox.style.display = 'none';
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
                inSelection = shape.x >= minX && shape.x + shape.width <= maxX &&
                             shape.y >= minY && shape.y + shape.height <= maxY;
            } else if (shape.type === 'circle') {
                inSelection = shape.x >= minX && shape.x <= maxX &&
                             shape.y >= minY && shape.y <= maxY;
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
        
        console.log('Selected elements:', this.selectedElements);
    }
    
    redrawCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw paths
        this.ctx.strokeStyle = '#333';
        this.ctx.lineWidth = 2;
        this.paths.forEach(path => {
            if (path.length > 0) {
                this.ctx.beginPath();
                this.ctx.moveTo(path[0].x, path[0].y);
                for (let i = 1; i < path.length; i++) {
                    this.ctx.lineTo(path[i].x, path[i].y);
                }
                this.ctx.stroke();
            }
        });
        
        // Draw shapes
        this.shapes.forEach(shape => {
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
        this.ctx.fillStyle = '#333';
        this.texts.forEach(textObj => {
            this.ctx.fillText(textObj.text, textObj.x, textObj.y);
        });
    }
    
    clearCanvas() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.paths = [];
        this.shapes = [];
        this.texts = [];
        this.selectedElements = [];
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
}

// Initialize the app when the DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new CanvasMaker();
});