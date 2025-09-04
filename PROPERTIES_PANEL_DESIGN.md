# Properties Panel Design Document

## Overview
A modern, Figma-style properties panel for the Canvas Maker that provides comprehensive styling controls for all element types, with special handling for HTML components that require edit mode.

## Panel States

### A. No Selection State
- Shows "No element selected" message
- Lists up to 5 recent/visible components with thumbnails
- Each component shows:
  - Small preview/thumbnail
  - Component type icon
  - Component name/ID
- Click on component to select it

### B. Canvas Element Selected (Non-HTML)
- Shows properties for rectangles, circles, text, lines, etc.
- Full styling controls available immediately
- Direct manipulation without edit mode

### C. HTML Component Selected (Not in Edit Mode)
- Shows basic component info:
  - Component dimensions
  - Position
  - Basic appearance (background, border)
- **"Double-click to edit styles"** prompt
- Limited controls until edit mode activated

### D. HTML Component in Edit Mode
- **This is when full styling becomes available!**
- Shows all HTML sub-element styling options
- Can select and style individual sub-elements
- Breadcrumb showing: Component > Selected Sub-element
- Exit edit mode button/indicator

### E. Multi-Selection State
- Only for canvas elements (not HTML in edit mode)
- Shows common properties
- Batch editing capability
- "Mixed" values indicator when properties differ

## Edit Mode Integration

### Entering Edit Mode for Styling
- Double-click HTML component → Enter edit mode
- Properties panel updates to show full controls
- Can now click on sub-elements within the component
- Selected sub-element gets highlighted border

### Sub-element Selection in Edit Mode
- **Single-click** any element inside the HTML component to select it
- Properties panel updates to show that element's styles
- Breadcrumb: "Card Component > Button"
- Navigation handled via properties panel controls (not double-clicking)

### Visual Indicators
- Edit mode indicator in panel header
- "Editing: [Component Name]" title
- ESC to exit reminder
- Different panel background color/border in edit mode

## Selection System

### Element Selection Model
**Canvas Elements (Direct Selection):**
- Rectangles, circles, text, lines → Single-click to select and style immediately
- No edit mode required

**HTML Components (Edit Mode Required):**
- Single-click → Select entire component (basic properties only)
- Double-click → Enter edit mode for sub-element access
- In edit mode: Single-click any sub-element → Select for styling
- ESC or click outside → Exit edit mode

### Why Edit Mode for HTML Components?
- ✅ **Clear intent** - Makes it obvious you're styling component internals
- ✅ **No conflicts** - Canvas tools work normally (double-click for text creation, etc.)
- ✅ **Safety** - Prevents accidental modification of deeply nested elements
- ✅ **Visual clarity** - Edit mode provides different visual feedback

## Navigation System

### Breadcrumb Navigation (Properties Panel)

Instead of complex double-click drilling like Figma, navigation is handled through the properties panel:

**Properties Panel Header:**
```
┌─ Editing: Card Component ─────────────────────────────┐
│ [Component] > [Content Div] > [Button] ↓              │
│  ↑ click up     ↑ click up       ↑ go down           │
└───────────────────────────────────────────────────────┘
```

**Navigation Options:**

**1. Navigate UP (via breadcrumb)** ✓
- Click any parent in the breadcrumb to select it
- Always available since we know the path
- Immediately updates properties panel to show parent's styles

**2. Navigate DOWN (contextual)** 
- **Single Child**: Show down arrow (↓) button when element has exactly 1 child
  ```
  Selected: Container [↓]  ← Click to select the only child
  ```
- **Multiple Children**: Skip for now (keep interface simple)

**Benefits of Panel-Based Navigation:**
- ✅ **Precise control** - Clear navigation options always visible
- ✅ **No interaction conflicts** - Canvas behavior stays consistent  
- ✅ **Visual feedback** - Breadcrumb shows exact selection path
- ✅ **Power user friendly** - Quick navigation without clicking around canvas

**Visual Example:**
```
[Card] > [Body] > [Content Div] ↓
                                └─ Has 1 child (paragraph)
```

**Common Use Cases:**
- Wrapper div → single content element  
- Button → single text span
- Link → single text node

**Later Enhancement** (if needed):
- Add small "children" section in properties panel
- Show immediate children as clickable items
- Only if users request this complexity

## Panel Sections (When Element Selected)

### A. Transform
- X, Y position (updates live when dragging!)
- Width, Height
- Rotation
- Scale

### B. Appearance
- Fill color (with color picker)
- Stroke color, width, style
- Opacity
- Border radius (for rectangles)
- Shadow/effects

### C. Typography (for text elements)
- Font family dropdown
- Font size
- Font weight
- Line height
- Letter spacing
- Text alignment

### D. Layout (for HTML components)
- Display type
- **Visual Margin/Padding Controls** (Figma/XCode style)
- Position type (absolute/relative)
- Z-index

#### Visual Margin/Padding Controls
Interactive box model visualization similar to Figma/XCode:

```
┌─ Margin ─────────────────────────────┐
│  ┌─ 20px ─┐                         │
│  │ ┌─ Border ─────────────────────┐ │ │
│  │ │ ┌─ Padding ─────────────────┐ │ │
│  │ │ │  ┌─ 15px ─┐               │ │ │
│20px │ │ │ │ Content │            │ │ │
│  │ │ │  └─ 15px ─┘               │ │ │
│  │ │ └───────────────────────────┘ │ │
│  │ └─────────────────────────────────┘ │
│  └─ 20px ─┘                         │
└─────────────────────────────────────────┘
```

**Interactive Features:**
- **Click to edit**: Click any margin/padding value to edit directly
- **Dual input method**: 
  - Click the **number** (e.g., "20" in "20px") to edit value directly
  - Click the **unit** (e.g., "px" in "20px") to change unit type
- **Visual feedback**: Hover highlights the corresponding area on both panel and canvas
- **Linked values**: Chain icon to link all sides (like CSS shorthand: `margin: 20px`)
- **Individual control**: Edit top, right, bottom, left independently
- **Unit selection**: px, %, em, rem dropdown for each value
- **Live preview**: Changes reflect immediately on canvas element
- **Color coding**: 
  - Margin areas: Light blue tint
  - Padding areas: Light green tint
  - Border areas: Light orange tint
  - Content area: White/transparent

**Layout Examples:**

**Compact View** (with dual input):
```
Margin:  [🔗] [20|px ▼] [15|px ▼] [20|px ▼] [10|px ▼]
         Link  Top      Right     Bottom    Left
              ↑  ↑      ↑  ↑       ↑  ↑      ↑  ↑
           number unit number unit number unit number unit
```

**Interaction Details:**
- **Number click**: `20|px` → Select "20" for direct typing
- **Unit click**: `20|px` → Dropdown with px, %, em, rem, auto
- **Keyboard shortcuts**: 
  - Arrow up/down to increment/decrement numbers
  - Tab to move to next field
  - Enter to confirm, Escape to cancel

**Visual View** (when expanded):
```
       ┌── 20px ──┐
       │  ┌───────────────┐
  20px │  │   ┌───────┐   │ 20px  
       │  │15px Content 15px │
       │  │   └───────┘   │
       │  └───────────────┘
       └── 20px ──┘
```

**Canvas Integration:**
- When editing margin/padding, show overlay on selected element
- Highlight the specific area being modified (top margin, left padding, etc.)
- Color-coded borders around the element showing current spacing values

## Behavior & Interactions

### Real-time Updates
- Changes apply instantly as you type/drag
- **Dual input for all numeric fields**:
  - Click number portion to edit directly: `16|px`, `100|%`, `1.5|em`
  - Click unit portion to change units: `16|px ▼` → px, %, em, rem
- **Input methods**:
  - Direct typing: Click number and type new value
  - Increment/decrement: Arrow keys or +/- buttons
  - Sliders: For opacity, border radius, rotation
  - Scrubbing: Click and drag on number to adjust (like Adobe/Figma)
- Color picker with hex/rgba support

### Drag Feedback
- When dragging element on canvas, X/Y values update live
- When resizing, width/height update live
- Smooth number transitions

### Smart Defaults
- Panel loads with current element values
- Recently used colors in palette
- Common font sizes in dropdown

## HTML Sub-element Styling (Only in Edit Mode)

### Selection Feedback
- Clicked sub-element gets selection outline
- Properties panel instantly loads its computed styles
- Show element type (div, button, span, etc.)

### Granulated Elements
- Special handling for text spans
- Group selection for granulated text
- Apply styles to parent container

### Style Inheritance
- Show inherited vs direct styles
- Override indicators
- Reset to inherited option

## UI/UX Features

### Modern Design
- Clean, minimal interface
- Smooth animations/transitions
- Hover states for all interactive elements
- Figma-like aesthetics

### Responsive
- Collapsible sections to save space
- Scrollable when content overflows
- Fixed width: 280px (or resizable?)

### Accessibility
- Keyboard navigation
- Tab through inputs
- Enter to confirm, Escape to cancel

## Custom Styles System

### Upload/Import
- Button to import style presets
- JSON format for style definitions
- Apply preset to selected element
- Save current styles as preset

### Default Styles
- App can provide initial theme
- Per-element-type defaults
- Global style variables

## Workflow Example

1. User sees HTML component on canvas
2. Single-clicks to select → Panel shows basic info + "Double-click to edit"
3. Double-clicks → Enters edit mode
4. Clicks on a button inside → Panel shows button's full styles
5. Changes button color → Updates live
6. Clicks on text → Panel switches to text styles
7. Presses ESC or clicks outside → Exits edit mode
8. Panel returns to basic component view

## Key Behavioral Rules

- **Canvas elements**: Always show full styling (no edit mode needed)
- **HTML components**: Require edit mode for sub-element styling
- **Drag updates**: Work for both canvas elements and HTML sub-elements in edit mode
- **Real-time sync**: All changes apply instantly
- **Mode persistence**: Stay in edit mode until explicitly exited

## Technical Considerations

### Performance
- Debounce rapid value changes
- Efficient DOM updates
- Minimal redraws

### Integration
- Panel as separate module
- Event system for updates
- Clean API for external control

## Platform-Specific Element Display

### The Problem
When designing mobile apps, showing HTML elements like "div" and "span" is not helpful. Developers need to see platform-appropriate element names.

### Solution: Platform Switcher (User Can Switch Platforms)

**Why This Approach:**
1. **Design once, target multiple platforms**
   - Designer creates a card component
   - iOS developer switches to "iOS" view to see UIView/UIButton
   - Android developer switches to "Android" view to see LinearLayout/Button
   - Same component, platform-appropriate terminology

2. **Cross-platform teams**
   - Multiple developers can reference same design with their platform's terms
   - No need for separate canvas instances
   - Consistent design system across platforms

3. **Copy/Export benefits**
   - Copy component in iOS mode → SwiftUI-friendly property names
   - Copy same component in Android mode → Compose-friendly names
   - Design specs automatically platform-appropriate

### Implementation

**UI Location:** Properties panel header
```
Properties                           [Web ▼] 
───────────────────────────────────────────
Editing: Card Component > UIView > UIButton
```

**Platform Options:**
- **Web (HTML)** - div, button, span, input
- **iOS (SwiftUI)** - VStack/HStack, Button, Text, TextField  
- **iOS (UIKit)** - UIView, UIButton, UILabel, UITextField
- **Android (Compose)** - Column/Row, Button, Text, TextField
- **Android (Views)** - LinearLayout, Button, TextView, EditText
- **React Native** - View, TouchableOpacity, Text, TextInput
- **Flutter** - Container/Column, ElevatedButton, Text, TextField

### Platform Mappings

**Element Name Mapping:**
| HTML | iOS (SwiftUI) | Android (Compose) | React Native | Flutter |
|------|---------------|-------------------|--------------|---------|
| div | VStack/HStack/Container | Column/Row/Box | View | Container/Column |
| button | Button | Button | TouchableOpacity | ElevatedButton |
| span/p | Text | Text | Text | Text |
| input | TextField | TextField | TextInput | TextField |

**Property Name Mapping:**
| Web | iOS | Android | React Native | Flutter |
|-----|-----|---------|--------------|---------|
| background-color | backgroundColor | backgroundColor | backgroundColor | color |
| border-radius | cornerRadius | cornerRadius | borderRadius | borderRadius |
| padding | padding | padding | padding | padding |

### Dynamic Behavior
- **Switch platform** → Breadcrumb updates immediately
- **Property names change** → backgroundColor ↔ background-color  
- **Available options change** → Platform-specific values
- **Same underlying HTML** → Different presentation layer only

### Integration with Properties Panel
1. **Breadcrumb display**: Shows platform-appropriate names
2. **Property sections**: Platform-specific properties when relevant
3. **Style names**: Platform-appropriate property names
4. **Available options**: Platform-specific values and constraints

## Code Export System

### Export as Code Button
**Location:** Bottom of properties panel
```
┌─ Properties Panel ────────────────────────┐
│ ... styling controls ...                  │
│                                           │
│ ┌───────────────────────────────────────┐ │
│ │        Export as Code [▼]             │ │
│ └───────────────────────────────────────┘ │
└───────────────────────────────────────────┘
```

### Export Options
- **SwiftUI** (Static UI)
- **Android Compose** (Static UI) 
- **React Native** (Static UI)
- **Flutter** (Static UI)
- **HTML/CSS** (Full fidelity)

### AI Code Generation Feasibility

**✅ Highly Doable:**
- Simple UI components - Buttons, text, basic layouts
- Static layouts - Cards, forms, lists without complex logic
- Style translations - Colors, fonts, spacing, borders
- Basic structure - Views, containers, simple hierarchies

**⚠️ Challenging but Possible:**
- Complex layouts - Nested scrollviews, dynamic sizing
- Responsive design - Different screen sizes and orientations
- Custom styling - Platform-specific design patterns

**❌ Likely Buggy/Incomplete:**
- Interactive logic - Button actions, form validation, navigation
- State management - Dynamic data, user interactions
- Platform integrations - APIs, permissions, native features
- Performance optimizations - Complex rendering, memory management

### Generated Code Quality

**What We Can Reliably Generate:**
- ✅ Compilable code structure
- ✅ Accurate styling (colors, fonts, spacing)
- ✅ Proper layout hierarchy
- ✅ Platform-appropriate components
- ✅ TODO comments for interactive parts

**What Developers Still Need to Add:**
- Button actions and navigation
- Data binding and state management
- Business logic and API integration
- Error handling and validation

### Code Examples

**SwiftUI Export:**
```swift
VStack {
    Text("Card Title")
        .font(.headline)
        .foregroundColor(.primary)
    
    Button("Submit") {
        // TODO: Add button action
    }
    .foregroundColor(.white)
    .background(Color.blue)
    .cornerRadius(8)
}
.padding()
.background(Color.white)
.cornerRadius(12)
```

**Android Compose Export:**
```kotlin
Card(
    modifier = Modifier.padding(16.dp),
    shape = RoundedCornerShape(12.dp)
) {
    Column(modifier = Modifier.padding(16.dp)) {
        Text(
            text = "Card Title",
            style = MaterialTheme.typography.headlineSmall
        )
        Button(
            onClick = { /* TODO: Add button action */ },
            colors = ButtonDefaults.buttonColors(containerColor = Color.Blue)
        ) {
            Text("Submit")
        }
    }
}
```

### Implementation Strategy

**Phase 1: Static UI Generation**
- Export basic, compilable UI structure
- Focus on layout and styling accuracy
- Include TODO comments for interactive elements
- Target 70-80% completion rate

**Quality Goals:**
- **Starter-quality**: Solid foundation for developers
- **Compilable**: Yes, with placeholder functions  
- **Production-ready**: No, needs developer completion
- **Time-saving**: Significant - handles all styling/layout work

### Integration with Outer App
The outer app receives the generated code and can:
1. **Post-process** - Add app-specific imports, themes
2. **Enhance** - Fill in TODO sections with business logic  
3. **Customize** - Apply coding standards and conventions
4. **Validate** - Run through linters and build systems

## Open Questions

1. **Panel Position**: Fixed right side or draggable/dockable?
2. **Panel Width**: Fixed 280px or resizable?
3. **Color System**: Include gradient support?
4. **Presets**: Built-in style presets (Material, iOS, etc.)?
5. **Copy/Paste Styles**: Add style clipboard functionality?
6. **Undo/Redo**: Track style changes for undo?
7. **Responsive Breakpoints**: Show different values at different canvas sizes?
8. **Platform Defaults**: Should switching platforms change available properties/constraints?