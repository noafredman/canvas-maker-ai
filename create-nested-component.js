// Script to create a complex 3-level nested HTML component
// Run this by including it in HTML or calling createNestedComponent() in console

function createNestedComponent() {
    // Check if canvasMaker exists
    if (!window.canvasMaker) {
        console.error('❌ Canvas Maker not found! Make sure the app is loaded.');
        return;
    }

    // Define the complex HTML with 3 levels of nesting
    const complexHTML = [
        '<div style="width: 100% !important; height: 100% !important; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%) !important; border: 3px solid #4c51bf !important; border-radius: 12px !important; padding: 20px !important; position: relative !important; color: white !important; font-family: -apple-system, BlinkMacSystemFont, \'Segoe UI\', Roboto, sans-serif !important;">',
        
        // Level 1: Main title
        '<h2 style="margin: 0 0 20px 0; text-align: center; font-size: 24px; text-shadow: 0 2px 4px rgba(0,0,0,0.3);">📊 Level 1: Dashboard</h2>',
        
        // Level 2: Main content container
        '<div style="position: absolute; top: 60px; left: 20px; right: 20px; height: 280px; background: rgba(225, 29, 72, 0.15); border: 2px solid #e11d48; border-radius: 8px; padding: 15px; cursor: move; backdrop-filter: blur(10px);">',
        '<h3 style="margin: 0 0 15px 0; color: #fff; font-size: 18px;">🏢 Level 2: Content Container</h3>',
        
        // Level 3: Sidebar
        '<div style="position: absolute; left: 15px; top: 40px; width: 140px; height: 220px; background: rgba(0,0,0,0.2); border: 2px solid #0ea5e9; border-radius: 6px; padding: 12px; cursor: move;">',
        '<h4 style="margin: 0 0 12px 0; font-size: 14px; font-weight: 600;">📋 Level 3: Sidebar</h4>',
        '<div style="background: rgba(34, 197, 94, 0.7); padding: 8px; border-radius: 4px; margin-bottom: 8px; cursor: move; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(34, 197, 94, 0.9)\'" onmouseout="this.style.background=\'rgba(34, 197, 94, 0.7)\'">✅ Menu Item 1</div>',
        '<div style="background: rgba(59, 130, 246, 0.7); padding: 8px; border-radius: 4px; margin-bottom: 8px; cursor: move; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(59, 130, 246, 0.9)\'" onmouseout="this.style.background=\'rgba(59, 130, 246, 0.7)\'">📊 Menu Item 2</div>',
        '<div style="background: rgba(245, 158, 11, 0.7); padding: 8px; border-radius: 4px; margin-bottom: 8px; cursor: move; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(245, 158, 11, 0.9)\'" onmouseout="this.style.background=\'rgba(245, 158, 11, 0.7)\'">⚙️ Menu Item 3</div>',
        '<div style="background: rgba(239, 68, 68, 0.7); padding: 8px; border-radius: 4px; cursor: move; font-size: 12px; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(239, 68, 68, 0.9)\'" onmouseout="this.style.background=\'rgba(239, 68, 68, 0.7)\'">🚨 Menu Item 4</div>',
        '</div>',
        
        // Level 3: Main panel with stats
        '<div style="position: absolute; left: 170px; top: 40px; right: 15px; height: 220px; background: rgba(249, 115, 22, 0.15); border: 2px solid #f97316; border-radius: 6px; padding: 15px; cursor: move;">',
        '<h4 style="margin: 0 0 15px 0; font-size: 16px; font-weight: 600;">📈 Level 3: Stats Panel</h4>',
        
        // Level 4: Stats cards in a grid
        '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 15px; background: rgba(132, 204, 22, 0.15); border: 1px solid #84cc16; border-radius: 4px; padding: 8px;">',
        '<div style="background: rgba(34, 197, 94, 0.8); border: 1px solid rgba(34, 197, 94, 1); padding: 12px; border-radius: 6px; cursor: move; text-align: center; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">',
        '<div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">142</div>',
        '<div style="font-size: 11px; opacity: 0.9;">👥 Active Users</div>',
        '</div>',
        '<div style="background: rgba(59, 130, 246, 0.8); border: 1px solid rgba(59, 130, 246, 1); padding: 12px; border-radius: 6px; cursor: move; text-align: center; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">',
        '<div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">28</div>',
        '<div style="font-size: 11px; opacity: 0.9;">📦 New Orders</div>',
        '</div>',
        '<div style="background: rgba(245, 158, 11, 0.8); border: 1px solid rgba(245, 158, 11, 1); padding: 12px; border-radius: 6px; cursor: move; text-align: center; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">',
        '<div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">$4.2k</div>',
        '<div style="font-size: 11px; opacity: 0.9;">💰 Revenue</div>',
        '</div>',
        '<div style="background: rgba(239, 68, 68, 0.8); border: 1px solid rgba(239, 68, 68, 1); padding: 12px; border-radius: 6px; cursor: move; text-align: center; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">',
        '<div style="font-size: 24px; font-weight: bold; margin-bottom: 4px;">7</div>',
        '<div style="font-size: 11px; opacity: 0.9;">⚠️ Issues</div>',
        '</div>',
        '</div>',
        
        // Level 4: Action buttons
        '<div style="display: flex; gap: 8px; justify-content: center; background: rgba(168, 85, 247, 0.2); border: 1px solid #a855f7; border-radius: 4px; padding: 8px;">',
        '<button style="background: rgba(34, 197, 94, 0.8); border: 1px solid rgba(34, 197, 94, 1); padding: 8px 16px; border-radius: 4px; color: white; cursor: move; font-size: 12px; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(34, 197, 94, 1)\'" onmouseout="this.style.background=\'rgba(34, 197, 94, 0.8)\'">🔄 Refresh</button>',
        '<button style="background: rgba(59, 130, 246, 0.8); border: 1px solid rgba(59, 130, 246, 1); padding: 8px 16px; border-radius: 4px; color: white; cursor: move; font-size: 12px; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(59, 130, 246, 1)\'" onmouseout="this.style.background=\'rgba(59, 130, 246, 0.8)\'">📤 Export</button>',
        '<button style="background: rgba(107, 114, 128, 0.8); border: 1px solid rgba(107, 114, 128, 1); padding: 8px 16px; border-radius: 4px; color: white; cursor: move; font-size: 12px; font-weight: 500; transition: all 0.2s ease;" onmouseover="this.style.background=\'rgba(107, 114, 128, 1)\'" onmouseout="this.style.background=\'rgba(107, 114, 128, 0.8)\'">⚙️ Settings</button>',
        '</div>',
        '</div>',
        '</div>',
        
        // Level 2: Footer status bar
        '<div style="position: absolute; bottom: 20px; left: 20px; right: 20px; background: rgba(0,0,0,0.3); border: 2px solid #6366f1; padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; cursor: move;">',
        '<div style="font-size: 12px; font-weight: 500;">🔹 Level 2: Status Bar - System Online</div>',
        '<div style="display: flex; gap: 8px; align-items: center; background: rgba(0,0,0,0.1); border: 1px solid #64748b; border-radius: 4px; padding: 4px;">',
        '<div style="width: 10px; height: 10px; background: #10b981; border: 1px solid #059669; border-radius: 50%; cursor: move; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'scale(1)\'" title="System Online"></div>',
        '<div style="width: 10px; height: 10px; background: #f59e0b; border: 1px solid #d97706; border-radius: 50%; cursor: move; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'scale(1)\'" title="Warning"></div>',
        '<div style="width: 10px; height: 10px; background: #ef4444; border: 1px solid #dc2626; border-radius: 50%; cursor: move; transition: transform 0.2s ease;" onmouseover="this.style.transform=\'scale(1.2)\'" onmouseout="this.style.transform=\'scale(1)\'" title="Error"></div>',
        '</div>',
        '</div>',
        
        // Instructions
        '<div style="position: absolute; bottom: 5px; right: 20px; font-size: 10px; opacity: 0.7; font-style: italic;">',
        '💡 Double-click → Edit mode → Drag nested elements',
        '</div>',
        
        '</div>'
    ].join('');

    // Create the component
    try {
        console.log('🔍 Creating component with HTML (first 200 chars):', complexHTML.substring(0, 200) + '...');
        const component = window.canvasMaker.addReactComponentWithHTML(100, 50, 520, 420, complexHTML);
        
        console.log('✅ Complex nested HTML component created successfully!');
        console.log('📊 Component details:', component);
        
        // Check if the HTML element was created and inspect its styles
        setTimeout(() => {
            const htmlElement = window.canvasMaker.htmlComponents.get(component.id);
            if (htmlElement) {
                console.log('🔍 HTML element found:', htmlElement);
                
                // Find the actual div with our border styles (should be nested deeper)
                const actualContentDiv = htmlElement.querySelector('div div div'); // react-component-html > contentWrapper > stableContainer > our div
                console.log('🎨 Actual content div:', actualContentDiv);
                console.log('🎨 Content div styles:', actualContentDiv?.style.cssText);
                console.log('🎨 Content div computed border:', window.getComputedStyle(actualContentDiv || htmlElement).border);
                
                // Check all divs to find the one with border
                const allDivs = htmlElement.querySelectorAll('div');
                // console.log('🔍 All divs found:', allDivs.length);
                // allDivs.forEach((div, i) => {
                //     if (div.style.border) {
                //         console.log(`📦 Div ${i} has border:`, div.style.border, div);
                //     }
                // });
            } else {
                console.log('❌ HTML element not found');
            }
        }, 100);
        console.log('🎯 Instructions:');
        console.log('  1. Double-click the component to enter edit mode');
        console.log('  2. Drag individual elements (they respect parent bounds)');
        console.log('  3. Each level has interactive hover effects');
        console.log('  4. Check the Properties Panel on the right →');
        console.log('');
        console.log('📋 Nesting Levels:');
        console.log('  • Level 1: Dashboard container (purple gradient)');
        console.log('  • Level 2: Content container + Status bar');
        console.log('  • Level 3: Sidebar + Stats panel');
        console.log('  • Level 4: Menu items, stat cards, buttons, status dots');
        
        return component;
    } catch (error) {
        console.error('❌ Error creating component:', error);
        console.log('💡 Make sure you\'re on the Canvas Maker page at http://localhost:8000');
        return null;
    }
}

// Expose function globally so it can be called from console
if (typeof window !== 'undefined') {
    window.createNestedComponent = createNestedComponent;
    console.log('✅ window.createNestedComponent is now available');
}

// Auto-run if loaded via script tag and canvasMaker exists
if (typeof window !== 'undefined') {
    console.log('📜 create-nested-component.js loaded successfully');
    
    // Wait for Canvas Maker to be ready
    function waitForCanvasMaker() {
        try {
            if (window.canvasMaker) {
                console.log('🚀 Auto-creating nested component...');
                createNestedComponent();
            } else {
                console.log('⏳ Canvas Maker not ready yet, waiting...');
                setTimeout(waitForCanvasMaker, 100);
            }
        } catch (error) {
            console.error('❌ Error in waitForCanvasMaker:', error);
        }
    }
    
    // Start checking after a short delay to let the page load
    setTimeout(waitForCanvasMaker, 500);
}

// Export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { createNestedComponent };
}