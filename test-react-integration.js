import puppeteer from 'puppeteer';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

class CanvasMakerReactTest {
    constructor() {
        this.browser = null;
        this.page = null;
        this.testResults = {
            passed: 0,
            failed: 0,
            errors: []
        };
    }

    async setup() {
        console.log('🚀 Setting up Puppeteer test environment...');
        
        this.browser = await puppeteer.launch({
            headless: false, // Set to false to see the browser during testing
            devtools: false,
            args: ['--no-sandbox', '--disable-setuid-sandbox']
        });

        this.page = await this.browser.newPage();
        await this.page.setViewport({ width: 1200, height: 800 });

        // Listen for console logs from the page
        this.page.on('console', msg => {
            if (msg.type() === 'error') {
                console.log('❌ Browser Error:', msg.text());
            } else if (msg.type() === 'log' && msg.text().includes('DEBUG')) {
                console.log('🔍 Debug:', msg.text());
            }
        });

        // Listen for page errors
        this.page.on('pageerror', error => {
            console.log('💥 Page Error:', error.message);
            this.testResults.errors.push(error.message);
        });
    }

    async loadTestPage() {
        console.log('📄 Loading test page...');
        const testPagePath = join(__dirname, 'test-react-components.html');
        await this.page.goto(`file://${testPagePath}`);
        
        // Wait for CanvasMaker to initialize
        await this.page.waitForFunction(() => window.canvasMaker !== undefined, { timeout: 10000 });
        await new Promise(resolve => setTimeout(resolve, 1000)); // Additional wait for full initialization
    }

    async test(description, testFn) {
        try {
            console.log(`\n🧪 Testing: ${description}`);
            await testFn();
            console.log(`✅ PASS: ${description}`);
            this.testResults.passed++;
        } catch (error) {
            console.log(`❌ FAIL: ${description}`);
            console.log(`   Error: ${error.message}`);
            this.testResults.failed++;
            this.testResults.errors.push(`${description}: ${error.message}`);
        }
    }

    async runTests() {
        console.log('\n🎯 Starting React Component Integration Tests\n');

        // Test 1: Verify React methods exist
        await this.test('React component methods are available', async () => {
            const methodsExist = await this.page.evaluate(() => {
                return window.testAPI.testMethodsExist();
            });

            if (!methodsExist.addReactComponent) {
                throw new Error('addReactComponent method not found');
            }
            if (!methodsExist.removeReactComponent) {
                throw new Error('removeReactComponent method not found');
            }
            if (!methodsExist.positionReactComponent) {
                throw new Error('positionReactComponent method not found');
            }
        });

        // Test 2: Add React component
        await this.test('Add React component to canvas', async () => {
            const initialCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            
            await this.page.evaluate(() => window.testAPI.addComponent());
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const newCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            
            if (newCount !== initialCount + 1) {
                throw new Error(`Expected ${initialCount + 1} components, got ${newCount}`);
            }

            // Check if component exists in canvas system (canvas-based rendering)
            const canvasShapeExists = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                const shapes = canvasMaker.activeCanvasContext.shapes || [];
                return shapes.some(shape => shape && shape.type === 'reactComponent');
            });
            
            if (!canvasShapeExists) {
                throw new Error('React component shape not found in canvas system');
            }
        });

        // Test 3: Add multiple components
        await this.test('Add multiple React components', async () => {
            for (let i = 0; i < 3; i++) {
                await this.page.evaluate(() => window.testAPI.addComponent());
                await new Promise(resolve => setTimeout(resolve, 200));
            }

            const componentCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            if (componentCount < 4) { // Initial + 3 new
                throw new Error(`Expected at least 4 components, got ${componentCount}`);
            }

            // Check canvas shapes exist (canvas-based rendering)
            const canvasComponentCount = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                const shapes = canvasMaker.activeCanvasContext.shapes || [];
                return shapes.filter(shape => shape && shape.type === 'reactComponent').length;
            });
            
            if (canvasComponentCount < 4) {
                throw new Error(`Expected at least 4 canvas component shapes, got ${canvasComponentCount}`);
            }
        });

        // Test 4: Add button components
        await this.test('Add button components', async () => {
            const initialCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            
            await this.page.evaluate(() => window.testAPI.addButton());
            await this.page.evaluate(() => window.testAPI.addButton());
            await new Promise(resolve => setTimeout(resolve, 500));
            
            const newCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            
            if (newCount !== initialCount + 2) {
                throw new Error(`Expected ${initialCount + 2} components, got ${newCount}`);
            }

            // Check button canvas shapes (canvas-based rendering)
            const buttonShapeCount = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                const shapes = canvasMaker.activeCanvasContext.shapes || [];
                return shapes.filter(shape => shape && shape.type === 'reactComponent' && shape.domElement && shape.domElement.tagName === 'BUTTON').length;
            });
            
            if (buttonShapeCount < 2) {
                throw new Error(`Expected at least 2 button component shapes, found ${buttonShapeCount}`);
            }
        });

        // Test 5: Test zoom synchronization (canvas-based rendering)
        await this.test('Canvas components sync with zoom', async () => {
            // Get initial zoom level
            const initialZoom = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                return canvasMaker.camera.zoom;
            });

            // Zoom in
            await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                canvasMaker.zoomIn();
            });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check that zoom level changed (components are now rendered to canvas)
            const newZoom = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                return canvasMaker.camera.zoom;
            });

            if (newZoom === initialZoom) {
                throw new Error('Zoom level did not change');
            }

            // Verify components are still tracked in the canvas system
            const componentCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            if (componentCount === 0) {
                throw new Error('Components lost during zoom operation');
            }
        });

        // Test 6: Test pan synchronization (canvas-based rendering)
        await this.test('Canvas components sync with pan', async () => {
            // Get initial camera position
            const initialCamera = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                return { x: canvasMaker.camera.x, y: canvasMaker.camera.y };
            });

            // Pan the camera
            await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                canvasMaker.camera.x += 100;
                canvasMaker.camera.y += 50;
                canvasMaker.redrawCanvas();
            });
            await new Promise(resolve => setTimeout(resolve, 500));

            // Check camera position changed
            const newCamera = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                return { x: canvasMaker.camera.x, y: canvasMaker.camera.y };
            });

            if (Math.abs(newCamera.x - initialCamera.x) < 50 || 
                Math.abs(newCamera.y - initialCamera.y) < 25) {
                throw new Error('Camera position did not change sufficiently');
            }

            // Verify components are still tracked
            const componentCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            if (componentCount === 0) {
                throw new Error('Components lost during pan operation');
            }
        });

        // Test 7: Test component interaction (canvas-based)
        await this.test('React components are interactive', async () => {
            const componentCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            if (componentCount === 0) {
                throw new Error('No React components found to test interaction');
            }

            // Simulate a canvas click on the first component's position
            const clickResult = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                if (!canvasMaker || !canvasMaker.canvas) {
                    throw new Error('Canvas not available for interaction test');
                }

                // Get first component shape
                const shapes = canvasMaker.activeCanvasContext.shapes || [];
                const reactShape = shapes.find(shape => shape && shape.type === 'reactComponent');
                
                if (!reactShape) {
                    throw new Error('No React component shape found for interaction');
                }


                // Simulate click at component center using proper coordinate transformation
                const componentCenterWorldX = reactShape.x + reactShape.width / 2;
                const componentCenterWorldY = reactShape.y + reactShape.height / 2;
                
                // Transform world coordinates to screen coordinates 
                const screenPos = canvasMaker.worldToCanvas(componentCenterWorldX, componentCenterWorldY);
                const screenX = screenPos.x;
                const screenY = screenPos.y;

                // Create mock mouse event
                const clickEvent = new MouseEvent('click', {
                    clientX: screenX,
                    clientY: screenY,
                    bubbles: true,
                    cancelable: true
                });

                // Trigger the canvas click handler directly for testing
                const handled = canvasMaker.handleReactComponentClick({ x: screenX, y: screenY });
                
                return { 
                    screenX, screenY, 
                    shapeX: reactShape.x, shapeY: reactShape.y,
                    handled 
                };
            });

            await new Promise(resolve => setTimeout(resolve, 1000));

            // Check if click was registered in logs
            const wasClicked = await this.page.evaluate(() => {
                const logs = window.testAPI.getLogs();
                return logs.includes('Mock component') && logs.includes('clicked');
            });

            if (!wasClicked) {
                throw new Error('Canvas-based component click was not registered');
            }
        });

        // Test 8: Test component removal
        await this.test('Remove React components', async () => {
            const initialCount = await this.page.evaluate(() => window.testAPI.getComponentCount());
            
            if (initialCount === 0) {
                // Add a component first
                await this.page.evaluate(() => window.testAPI.addComponent());
                await new Promise(resolve => setTimeout(resolve, 500));
            }

            const beforeRemoval = await this.page.evaluate(() => window.testAPI.getComponentCount());
            
            // Remove all components
            await this.page.evaluate(() => window.testAPI.removeAll());
            await new Promise(resolve => setTimeout(resolve, 500));

            const afterRemoval = await this.page.evaluate(() => window.testAPI.getComponentCount());

            if (afterRemoval !== 0) {
                throw new Error(`Expected 0 components after removal, got ${afterRemoval}`);
            }

            // Verify canvas shapes are removed (canvas-based rendering)
            const canvasShapeCount = await this.page.evaluate(() => {
                const canvasMaker = window.testAPI.getCanvasMaker();
                const shapes = canvasMaker.activeCanvasContext.shapes || [];
                return shapes.filter(shape => shape && shape.type === 'reactComponent').length;
            });
            
            if (canvasShapeCount > 0) {
                throw new Error(`Found ${canvasShapeCount} React component shapes still in canvas after removal`);
            }
        });

        // Test 9: Run automated test sequence
        await this.test('Automated test sequence', async () => {
            await this.page.evaluate(() => window.testAPI.runAutomated());
            
            // Wait for automated test to complete
            await new Promise(resolve => setTimeout(resolve, 8000));
            
            // Check if test completed successfully
            const logs = await this.page.evaluate(() => window.testAPI.getLogs());
            
            if (!logs.includes('Automated test sequence completed successfully')) {
                throw new Error('Automated test sequence did not complete successfully');
            }
        });
    }

    async cleanup() {
        console.log('\n🧹 Cleaning up...');
        if (this.browser) {
            await this.browser.close();
        }
    }

    printResults() {
        console.log('\n📊 Test Results:');
        console.log(`✅ Passed: ${this.testResults.passed}`);
        console.log(`❌ Failed: ${this.testResults.failed}`);
        console.log(`📈 Total: ${this.testResults.passed + this.testResults.failed}`);
        
        if (this.testResults.errors.length > 0) {
            console.log('\n🚨 Errors:');
            this.testResults.errors.forEach((error, index) => {
                console.log(`  ${index + 1}. ${error}`);
            });
        }

        if (this.testResults.failed === 0) {
            console.log('\n🎉 All tests passed! React component integration is working correctly.');
        } else {
            console.log(`\n⚠️  ${this.testResults.failed} test(s) failed. Please review the errors above.`);
        }
    }

    async run() {
        try {
            await this.setup();
            await this.loadTestPage();
            await this.runTests();
        } catch (error) {
            console.log(`💥 Test runner error: ${error.message}`);
            this.testResults.errors.push(`Test runner: ${error.message}`);
        } finally {
            this.printResults();
            await this.cleanup();
        }
    }
}

// Run the tests
const tester = new CanvasMakerReactTest();
tester.run().then(() => {
    process.exit(tester.testResults.failed === 0 ? 0 : 1);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});