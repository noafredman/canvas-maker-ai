const puppeteer = require('puppeteer');
const path = require('path');

async function testCursorBehavior() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--window-size=1200,800']
    });
    
    const page = await browser.newPage();
    
    // Enable console logging
    page.on('console', msg => {
        console.log('PAGE LOG:', msg.text());
    });
    
    // Navigate to the local file
    const filePath = `file://${path.resolve(__dirname, 'index.html')}`;
    await page.goto(filePath);
    
    // Wait for the page to load
    await page.waitForSelector('.canvas-container');
    
    console.log('\n=== Starting Cursor Tests ===\n');
    
    // Helper function to get cursor classes
    const getCursorClasses = async () => {
        return await page.evaluate(() => {
            const container = document.querySelector('.canvas-container');
            return container.className;
        });
    };
    
    // Helper function to check if cursor is grabbing
    const isGrabbingCursor = async () => {
        const classes = await getCursorClasses();
        return classes.includes('grabbing');
    };
    
    // Test 1: Draw a circle and verify select tool is active
    console.log('Test 1: Drawing a circle...');
    await page.click('#circle-tool');
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(400, 400);
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 500));
    
    let classes = await getCursorClasses();
    console.log('After drawing circle, classes:', classes);
    
    // Test 2: Hover over the circle
    console.log('\nTest 2: Hovering over circle...');
    await page.mouse.move(350, 350);
    await new Promise(resolve => setTimeout(resolve, 500));
    classes = await getCursorClasses();
    console.log('Hovering over circle, classes:', classes);
    
    // Test 3: Drag the circle
    console.log('\nTest 3: Dragging the circle...');
    await page.mouse.down();
    classes = await getCursorClasses();
    console.log('Mouse down on circle, classes:', classes);
    console.log('Is grabbing cursor?', await isGrabbingCursor());
    
    await page.mouse.move(450, 450);
    await new Promise(resolve => setTimeout(resolve, 500));
    classes = await getCursorClasses();
    console.log('During drag, classes:', classes);
    console.log('Is grabbing cursor?', await isGrabbingCursor());
    
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 500));
    classes = await getCursorClasses();
    console.log('After mouse up, classes:', classes);
    console.log('Is grabbing cursor?', await isGrabbingCursor());
    
    // Test 4: Move away from the circle
    console.log('\nTest 4: Moving away from circle...');
    await page.mouse.move(600, 600);
    await new Promise(resolve => setTimeout(resolve, 500));
    classes = await getCursorClasses();
    console.log('Away from circle, classes:', classes);
    
    // Test 5: Test pan mode (no tool selected)
    console.log('\nTest 5: Testing pan mode...');
    // Click on select tool again to deselect it
    await page.click('#select-tool');
    await new Promise(resolve => setTimeout(resolve, 500));
    classes = await getCursorClasses();
    console.log('After clicking select tool again, classes:', classes);
    
    // Check if tool is actually deselected
    const currentTool = await page.evaluate(() => {
        return window.canvasMaker ? window.canvasMaker.currentTool : 'unknown';
    });
    console.log('Current tool:', currentTool);
    
    // Test dragging in pan mode
    console.log('\nTest 6: Dragging in pan mode...');
    await page.mouse.move(500, 500);
    await page.mouse.down();
    classes = await getCursorClasses();
    console.log('Mouse down in pan mode, classes:', classes);
    
    await page.mouse.move(550, 550);
    await new Promise(resolve => setTimeout(resolve, 500));
    await page.mouse.up();
    classes = await getCursorClasses();
    console.log('After pan drag, classes:', classes);
    
    console.log('\n=== Tests Complete ===\n');
    
    // Keep browser open for manual inspection
    console.log('Browser will remain open for manual inspection. Press Ctrl+C to exit.');
}

testCursorBehavior().catch(console.error);