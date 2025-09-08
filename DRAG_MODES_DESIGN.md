# Drag Modes Design Document

## Overview
Two distinct drag modes for nested HTML components to provide flexibility in element manipulation.

## Modes

### 1. Constrained Drag (Default)
- **Activation**: Normal drag (no modifiers)
- **Behavior**: Element moves within parent container bounds
- **Implementation**: Pure transform coordinates (current implementation)
- **Layer**: Element stays in its original DOM parent
- **Use Case**: Organizing elements within their container

### 2. Free Drag
- **Activation**: Shift + drag
- **Behavior**: Element can move anywhere within the entire HTML component
- **Implementation**: Temporarily set `position: fixed` with high z-index
- **Layer**: Visual only - DOM structure unchanged
- **Use Case**: Repositioning elements across containers

## Technical Implementation

### Free Drag Start
```javascript
if (e.shiftKey) {
    element.style.position = 'fixed';
    element.style.zIndex = '9999';
    // Convert to viewport coordinates
}
```

### Free Drag End
```javascript
element.style.position = 'absolute';
element.style.zIndex = '';
// Restore to relative parent coordinates
```

## Layer Behavior Examples

### Example 1: Moving Text Between Containers
```
Initial State:
Container A
  └── Text Element ← (dragging this)
Container B
  └── Other Element

Shift+Drag to Container B area:
- Visually: Text appears over Container B
- DOM: Still Container A > Text Element
- Release: Text snaps back to Container A bounds
```

### Example 2: Visual Overlap Without DOM Change
```
During Shift+Drag:
- Text visually overlaps Container B
- Text remains child of Container A in DOM
- No automatic re-parenting occurs
```

## Important Notes

1. **No Automatic Re-parenting**: Free drag is visual only. Elements don't automatically become children of containers they're dragged over.

2. **Snap Back Behavior**: On release, if element is outside original parent bounds, it could either:
   - Snap back to nearest edge of parent (current plan)
   - Stay at dropped position (would need different implementation)

3. **Future Enhancement**: Could add drop zones or explicit re-parenting UI if needed

## User Feedback
- Visual indicators during drag (cursor change, element opacity)
- Highlight mode with border color or shadow
- Show bounds during constrained drag

## Questions to Resolve

1. **Drop Behavior**: When releasing after free drag outside parent:
   - Snap back to parent edge?
   - Stay at position (clamped to component bounds)?
   
2. **Re-parenting**: Should we add a way to move elements between containers?
   - Could use Alt+Drop to re-parent
   - Could add drop zone indicators
   - Keep it visual-only for now?

## Future Enhancement: Re-parenting Feature

### Concept: Alt+Drop for Container Transfer
Allow elements to be moved between containers in the DOM structure.

### Implementation Plan
1. **Detection Phase**
   - On Alt+Drop, detect container under cursor
   - Validate if container can accept the element
   - Show visual feedback during hover

2. **Transfer Phase**
   ```javascript
   // On Alt+Drop
   const dropTarget = getContainerUnderCursor(e.clientX, e.clientY);
   if (dropTarget && dropTarget !== currentParent) {
       // Remove from current parent
       element.remove();
       // Add to new parent
       dropTarget.appendChild(element);
       // Adjust coordinates to new parent space
       recalculatePosition(element, dropTarget);
   }
   ```

3. **Visual Indicators**
   - Highlight valid drop targets on Alt+Drag
   - Show "Move to [Container]" tooltip
   - Different border color for valid targets

4. **Constraints**
   - Prevent circular nesting (container into its own child)
   - Respect component structure rules
   - Maintain valid HTML structure

### User Experience
- `Shift+Drag` = Free move (visual only)
- `Alt+Drag` = Re-parent mode (shows drop zones)
- `Normal Drag` = Constrained to parent

### Priority: LOW
Implement after basic free-drag mode is working and tested.