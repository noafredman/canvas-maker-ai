const puppeteer = require('puppeteer');
const path = require('path');

async function testCursorFix() {
    const browser = await puppeteer.launch({ 
        headless: false,
        defaultViewport: null,
        args: ['--window-size=1200,800']
    });
    
    const page = await browser.newPage();
    
    // Navigate to the local file
    const filePath = `file://${path.resolve(__dirname, 'index.html')}`;
    await page.goto(filePath);
    
    // Wait for the page to load
    await page.waitForSelector('.canvas-container');
    
    console.log('Testing cursor fix...\n');
    
    // Helper function to get cursor classes and computed cursor style
    const getCursorInfo = async () => {
        return await page.evaluate(() => {
            const container = document.querySelector('.canvas-container');
            const canvas = document.querySelector('#canvas');
            const computedStyle = window.getComputedStyle(canvas);
            return {
                classes: container.className,
                cursor: computedStyle.cursor
            };
        });
    };
    
    // Test 1: Draw a circle to have something to interact with
    console.log('1. Drawing a circle...');
    await page.click('#circle-tool');
    await page.mouse.move(300, 300);
    await page.mouse.down();
    await page.mouse.move(400, 400);
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    // Test 2: Hover over the circle with select tool
    console.log('2. Hovering over circle with select tool...');
    await page.mouse.move(350, 350);
    await new Promise(resolve => setTimeout(resolve, 300));
    let cursorInfo = await getCursorInfo();
    console.log('   Classes:', cursorInfo.classes);
    console.log('   Computed cursor:', cursorInfo.cursor);
    console.log('   Expected: grab cursor (when can-grab class is present)');
    
    // Test 3: Move away from circle
    console.log('3. Moving away from circle...');
    await page.mouse.move(600, 600);
    await new Promise(resolve => setTimeout(resolve, 300));
    cursorInfo = await getCursorInfo();
    console.log('   Classes:', cursorInfo.classes);
    console.log('   Computed cursor:', cursorInfo.cursor);
    console.log('   Expected: default cursor');
    
    // Test 4: Drag the circle
    console.log('4. Dragging the circle...');
    await page.mouse.move(350, 350);
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.mouse.down();
    cursorInfo = await getCursorInfo();
    console.log('   Classes during drag:', cursorInfo.classes);
    console.log('   Computed cursor during drag:', cursorInfo.cursor);
    console.log('   Expected: grabbing cursor');
    
    await page.mouse.move(450, 450);
    await page.mouse.up();
    await new Promise(resolve => setTimeout(resolve, 300));
    
    cursorInfo = await getCursorInfo();
    console.log('   Classes after drag:', cursorInfo.classes);
    console.log('   Computed cursor after drag:', cursorInfo.cursor);
    console.log('   Expected: default cursor (should NOT be grabbing anymore)');
    
    // Test 5: Test pan mode
    console.log('5. Testing pan mode (clicking select tool to deselect)...');
    await page.click('#select-tool');
    await new Promise(resolve => setTimeout(resolve, 300));
    cursorInfo = await getCursorInfo();
    console.log('   Classes in pan mode:', cursorInfo.classes);
    console.log('   Computed cursor in pan mode:', cursorInfo.cursor);
    console.log('   Expected: grab cursor (pan mode)');
    
    console.log('\nTest complete. Check the results above for any issues.');
    
    // Keep browser open briefly for manual verification
    await new Promise(resolve => setTimeout(resolve, 5000));
    await browser.close();
}

testCursorFix().catch(console.error);