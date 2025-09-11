# Drag & Drop + Hierarchy System Specification

## Overview
Canvas Maker implements a hybrid visual-structural approach inspired by Figma's containment model and Xcode's hierarchy panel, optimized for UI mockup creation and component design.

## Core Philosophy
> "Let users do what they want, show them the visual result, give them tools to fix it afterward."

- **Never prevent user actions** - if they want to put it there, they can
- **Visual feedback shows consequences** - immediate visual results
- **Non-restrictive UX** - users can fix issues after seeing results

## Dual Interface System

### 1. Canvas View (Visual Mode) - Primary Interface
**Purpose**: Visual design and layout
**Behavior**: Figma-inspired visual containment

**Drag & Drop Rules:**
- ✅ **Free dragging** - all elements can move anywhere on canvas
- ✅ **Visual containment** - elements dropped "inside" a container automatically become its children
- ✅ **Cross-container movement** - drag Button from Card A to Card B seamlessly
- ✅ **No size restrictions** - larger children can be dropped into smaller parents

**Visual Feedback:**
- **Smart snapping lines** showing alignment and spacing (8px, 16px, 24px)
- **Live distance measurements** between elements during drag
- **Container highlight** when hovering over valid drop zones
- **Hierarchy breadcrumbs** showing current containment during drag

### 2. Layer Panel (Structural Mode) - Power User Interface
**Purpose**: Precise hierarchy control and organization
**Behavior**: Xcode-inspired document outline

**Features:**
- **Tree structure view** showing complete element hierarchy
- **Drag & drop reorganization** within the panel itself
- **Expand/collapse** nested structures
- **Element renaming** directly in the hierarchy
- **Selection sync** - click in panel selects on canvas and vice versa
- **Context menus** for structural operations (group, ungroup, duplicate)

## Element Containment Behavior

### Container Types

#### Auto-Layout Containers (Flex/Grid-like)
- **Auto-grow** to accommodate larger children
- **Maintain spacing** and alignment rules
- **Reflow content** when children are added/removed
- **Examples**: Card components, button groups, navigation bars

#### Fixed-Size Containers  
- **Accept all children** regardless of size
- **Allow visual overflow** - children can extend beyond boundaries
- **Optional clipping** - container can clip overflow or show it
- **Examples**: Fixed frames, image containers, modal overlays

#### Regular Shapes/Groups
- **Accept children** without size constraints
- **Visual positioning** independent of parent size
- **Hierarchy relationship** established for organization
- **Examples**: Background shapes, decorative elements

### Size Mismatch Handling

**When Child > Parent:**

```
Scenario: Button (120px × 40px) → Small Div (80px × 20px)
```

**Auto-Layout Container:**
- ✅ Container automatically expands to 120px × 40px
- ✅ Maintains proper padding and spacing
- ✅ Other children reflow accordingly

**Fixed-Size Container:**
- ✅ Button becomes child of div
- ✅ Button visually overflows container boundaries
- ✅ User sees immediate visual feedback
- ✅ Container properties panel shows "Content Overflow" warning

**User Options to Fix:**
1. Resize container manually
2. Convert container to auto-layout
3. Resize child element
4. Move child to different container

## Visual Feedback System

### During Drag
- **Element elevation** - dragged element floats above everything (z-index: 999999)
- **Semi-transparency** - dragged element opacity: 0.9
- **Smart guides** - red snap lines for alignment
- **Distance measurements** - live pixel distances to nearby elements
- **Drop zone highlighting** - containers show green outline when valid

### Drop Indicators
- **Green outline** - valid drop target
- **Blue highlight** - auto-layout container (will auto-resize)
- **Orange warning** - fixed container (will overflow)
- **Dotted preview** - ghost element showing final position

### Post-Drop Feedback
- **Visual overflow indicators** - red outline on containers with overflowing children
- **Auto-resize notifications** - brief toast: "Container resized to fit content"
- **Hierarchy animations** - smooth transitions when structure changes

## Spacing and Layout Visualization

### Smart Spacing Guides
- **Real-time measurements** - show distances during drag
- **Common increments** - snap suggestions for 8px, 16px, 24px, 32px
- **Alignment lines** - red guides for edge and center alignment
- **Margin/padding zones** - dotted areas showing container spacing

### Properties Panel Integration
- **Selected element spacing** - margin/padding controls
- **Container properties** - padding, gap, alignment options
- **Overflow controls** - clip, scroll, visible options
- **Auto-layout settings** - flex direction, wrap, justify

## Hierarchy Rules and Constraints

### Structural Guidelines (Non-Restrictive)
- **Semantic suggestions** - warn when putting text inside buttons
- **Depth limits** - suggest alternatives for deeply nested structures (>5 levels)
- **Performance warnings** - notify when creating many nested elements
- **Export compatibility** - highlight structures that may not export well

### User Override Capability
- **All rules are bypassable** - warnings, not restrictions
- **"I know what I'm doing" option** - dismiss warnings permanently
- **Custom hierarchy rules** - users can define their own constraints

## Technical Implementation

### Free Drag System (Current Implementation)
```javascript
// Phase 1: Smooth dragging without coordinate system mixing
- Temporarily move element to document.body during drag
- Use position: fixed for smooth movement
- Apply z-index: 999999 for visual elevation
- Return to proper parent on drop with coordinate adjustment
```

### Visual Containment Detection
```javascript
// Phase 2: Smart parent detection
- Use document.elementsFromPoint() to find containers under drop
- Filter valid containers (positioned, adequate size)
- Choose deepest/most specific container
- Handle DOM re-parenting with position adjustment
```

### Container Type Detection
- **Auto-layout**: Elements with CSS display: flex, grid, or custom auto-layout class
- **Fixed-size**: Elements with explicit width/height and overflow settings
- **Regular**: Default behavior for groups and shapes

## Export Behavior

### Code Generation
- **Maintain hierarchy** - nested structure reflects visual containment
- **Include spacing** - padding/margin values from visual positioning
- **Respect container types** - export flex/grid properties appropriately
- **Clean structure** - optimize nesting for target platform

### Platform-Specific Adaptations
- **React**: Nested JSX components with proper styling
- **Flutter**: Widget hierarchy with Container/Padding wrappers
- **HTML/CSS**: Semantic markup with appropriate layout properties
- **Swift UI**: View hierarchy with proper modifiers

## User Experience Priorities

### Primary Use Cases
1. **Quick mockups** - drag rectangles, text, buttons around freely
2. **Layout design** - focus on visual arrangement and spacing
3. **Component creation** - build reusable UI patterns with proper structure

### Success Metrics
- ✅ **Smooth dragging** - no coordinate system issues or jumping
- ✅ **Intuitive containment** - visual relationships match structural ones
- ✅ **Flexible organization** - both visual and structural editing available
- ✅ **Clear feedback** - users understand consequences of their actions
- ✅ **Easy corrections** - mistakes can be fixed without starting over

## Future Enhancements

### Advanced Features (Low Priority)
- **Multi-select dragging** - move groups of elements together
- **Smart suggestions** - AI-powered layout recommendations
- **Template patterns** - common UI structures (cards, forms, navbars)
- **Collaborative editing** - real-time hierarchy changes
- **Version history** - track structural changes over time

### Accessibility Considerations
- **Keyboard navigation** - tab through hierarchy panel
- **Screen reader support** - announce containment relationships
- **High contrast mode** - clear visual feedback for drag operations
- **Motor accessibility** - adjustable snap sensitivity and drop zones