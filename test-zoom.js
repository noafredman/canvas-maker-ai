import puppeteer from 'puppeteer';

async function testZoomBehavior() {
    const browser = await puppeteer.launch({ 
        headless: false, // Set to true for headless mode
        devtools: true 
    });
    
    const page = await browser.newPage();
    
    // Navigate to the canvas app
    await page.goto('http://localhost:8000');
    
    // Wait for canvas to load
    await page.waitForSelector('#canvas');
    
    console.log('Canvas loaded, starting zoom test...');
    
    // Function to get the red origin marker position
    const getOriginPosition = async () => {
        return await page.evaluate(() => {
            const canvas = document.getElementById('canvas');
            const canvasMaker = window.canvasMaker || window.app;
            if (!canvasMaker) return null;
            
            const camera = canvasMaker._camera || canvasMaker.activeCanvasContext.camera;
            const originScreenX = camera.x * camera.zoom;
            const originScreenY = camera.y * camera.zoom;
            
            return {
                x: originScreenX,
                y: originScreenY,
                zoom: camera.zoom,
                cameraX: camera.x,
                cameraY: camera.y
            };
        });
    };
    
    // Get initial position
    const initialPosition = await getOriginPosition();
    console.log('Initial origin position:', initialPosition);
    
    // Test zoom in button
    console.log('Testing zoom IN button...');
    await page.click('#zoom-in-btn');
    await page.waitForFunction(() => true, { timeout: 100 }); // Wait briefly
    
    const positionAfterZoomIn = await getOriginPosition();
    console.log('Position after zoom IN:', positionAfterZoomIn);
    
    // Test zoom out button  
    console.log('Testing zoom OUT button...');
    await page.click('#zoom-out-btn');
    await page.waitForFunction(() => true, { timeout: 100 });
    
    const positionAfterZoomOut = await getOriginPosition();
    console.log('Position after zoom OUT:', positionAfterZoomOut);
    
    // Test multiple zoom operations
    console.log('Testing multiple zoom operations...');
    for (let i = 0; i < 3; i++) {
        await page.click('#zoom-in-btn');
        await page.waitForFunction(() => true, { timeout: 50 });
    }
    
    const positionAfterMultipleZooms = await getOriginPosition();
    console.log('Position after multiple zooms:', positionAfterMultipleZooms);
    
    // Analysis
    const tolerance = 1; // 1 pixel tolerance
    
    console.log('\n=== ZOOM TEST RESULTS ===');
    
    const originMovedDuringZoomIn = Math.abs(initialPosition.x - positionAfterZoomIn.x) > tolerance || 
                                   Math.abs(initialPosition.y - positionAfterZoomIn.y) > tolerance;
    
    const originMovedDuringZoomOut = Math.abs(positionAfterZoomIn.x - positionAfterZoomOut.x) > tolerance || 
                                    Math.abs(positionAfterZoomIn.y - positionAfterZoomOut.y) > tolerance;
    
    const originMovedDuringMultiple = Math.abs(initialPosition.x - positionAfterMultipleZooms.x) > tolerance || 
                                     Math.abs(initialPosition.y - positionAfterMultipleZooms.y) > tolerance;
    
    console.log(`✓ Initial position: (${initialPosition.x.toFixed(1)}, ${initialPosition.y.toFixed(1)})`);
    console.log(`${originMovedDuringZoomIn ? '✗' : '✓'} Zoom IN: Origin ${originMovedDuringZoomIn ? 'MOVED' : 'stayed centered'}`);
    console.log(`${originMovedDuringZoomOut ? '✗' : '✓'} Zoom OUT: Origin ${originMovedDuringZoomOut ? 'MOVED' : 'stayed centered'}`);
    console.log(`${originMovedDuringMultiple ? '✗' : '✓'} Multiple zooms: Origin ${originMovedDuringMultiple ? 'MOVED' : 'stayed centered'}`);
    
    const allTestsPassed = !originMovedDuringZoomIn && !originMovedDuringZoomOut && !originMovedDuringMultiple;
    console.log(`\n🎯 Overall result: ${allTestsPassed ? 'PASSED' : 'FAILED'}`);
    
    if (!allTestsPassed) {
        console.log('\n📊 Position changes:');
        console.log(`Zoom IN moved origin by: (${(positionAfterZoomIn.x - initialPosition.x).toFixed(1)}, ${(positionAfterZoomIn.y - initialPosition.y).toFixed(1)})`);
        console.log(`Zoom OUT moved origin by: (${(positionAfterZoomOut.x - positionAfterZoomIn.x).toFixed(1)}, ${(positionAfterZoomOut.y - positionAfterZoomIn.y).toFixed(1)})`);
        console.log(`Multiple zooms moved origin by: (${(positionAfterMultipleZooms.x - initialPosition.x).toFixed(1)}, ${(positionAfterMultipleZooms.y - initialPosition.y).toFixed(1)})`);
        
        console.log('\n🔍 Camera data:');
        console.log('Initial camera:', { x: initialPosition.cameraX, y: initialPosition.cameraY, zoom: initialPosition.zoom });
        console.log('After zoom in:', { x: positionAfterZoomIn.cameraX, y: positionAfterZoomIn.cameraY, zoom: positionAfterZoomIn.zoom });
        console.log('After multiple:', { x: positionAfterMultipleZooms.cameraX, y: positionAfterMultipleZooms.cameraY, zoom: positionAfterMultipleZooms.zoom });
    }
    
    // Keep browser open for manual inspection
    console.log('\nBrowser will stay open for manual inspection. Press Ctrl+C to close.');
    
    // Don't close browser automatically - let user inspect
    // await browser.close();
}

// Run the test
testZoomBehavior().catch(console.error);