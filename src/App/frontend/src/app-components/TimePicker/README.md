# TimePicker Component

A React component for time input with intelligent Chrome-like segment typing behavior.

## Overview

The TimePicker component provides an intuitive time input interface with separate segments for hours, minutes, seconds (optional), and AM/PM period (for 12-hour format). It features smart typing behavior that mimics Chrome's date/time input controls.

## Features

### Smart Typing Behavior

- **Auto-coercion**: Invalid entries are automatically corrected (e.g., typing "9" in hours becomes "09")
- **Progressive completion**: Type digits sequentially to build complete values (e.g., "1" → "01", then "5" → "15")
- **Buffer management**: Handles rapid typing with timeout-based commits to prevent race conditions
- **Auto-advance**: Automatically moves to next segment when current segment is complete

### Keyboard Navigation

- **Arrow keys**: Navigate between segments and increment/decrement values
- **Tab**: Standard tab navigation between segments
- **Delete/Backspace**: Clear current segment
- **Separators**: Type ":", ".", "," or space to advance to next segment

### Format Support

- **24-hour format**: "HH:mm" or "HH:mm:ss"
- **12-hour format**: "HH:mm a" or "HH:mm:ss a" (with AM/PM)
- **Flexible display**: Configurable time format with optional seconds

## Usage

```tsx
import { TimePicker } from 'src/app-components/TimePicker/TimePicker';

// Basic usage
<TimePicker
  id="time-input"
  value="14:30"
  onChange={(value) => console.log(value)}
  aria-label="Select time"
/>

// With 12-hour format and seconds
<TimePicker
  id="time-input"
  value="2:30:45 PM"
  format="HH:mm:ss a"
  onChange={(value) => console.log(value)}
  aria-label="Select appointment time"
/>
```

## Props

### Required Props

- `id: string` - Unique identifier for the component
- `onChange: (value: string) => void` - Callback when time value changes
- `aria-label: string` - Accessibility label for the time picker

### Optional Props

- `value?: string` - Current time value in the specified format
- `format?: TimeFormat` - Time format string (default: "HH:mm")
- `disabled?: boolean` - Whether the component is disabled
- `readOnly?: boolean` - Whether the component is read-only
- `className?: string` - Additional CSS classes
- `placeholder?: string` - Placeholder text when empty

## Component Architecture

### Core Components

#### TimePicker (Main Component)

- Manages overall time state and validation
- Handles format parsing and time value composition
- Coordinates segment navigation and focus management

#### TimeSegment

- Individual input segment for hours, minutes, seconds, or period
- Implements Chrome-like typing behavior with buffer management
- Handles keyboard navigation and value coercion

### Supporting Modules

#### segmentTyping.ts

- **Input Processing**: Smart coercion logic for different segment types
- **Buffer Management**: Handles multi-character input with timeouts
- **Validation**: Ensures values stay within valid ranges

#### keyboardNavigation.ts

- **Navigation Logic**: Arrow key navigation between segments
- **Value Manipulation**: Increment/decrement with arrow keys
- **Key Handling**: Special key processing (Tab, Delete, etc.)

#### timeFormatUtils.ts

- **Format Parsing**: Converts format strings to display patterns
- **Value Formatting**: Formats time values for display
- **Validation**: Validates time format strings

## Typing Behavior Details

### Hour Input

- **24-hour mode**: First digit 0-2 waits for second digit, 3-9 auto-coerces to 0X
- **12-hour mode**: First digit 0-1 waits for second digit, 2-9 auto-coerces to 0X
- **Second digit**: Validates against first digit (e.g., 2X limited to 20-23 in 24-hour)

### Minute/Second Input

- **First digit**: 0-5 waits for second digit, 6-9 auto-coerces to 0X
- **Second digit**: Always accepts 0-9
- **Overflow handling**: Values > 59 are corrected during validation

### Period Input (AM/PM)

- **A/a key**: Sets to AM
- **P/p key**: Sets to PM
- **Case insensitive**: Accepts both upper and lower case

## Buffer Management

The component uses a sophisticated buffer system to handle rapid typing:

1. **Immediate Display**: Shows formatted value immediately as user types
2. **Timeout Commit**: Commits buffered value after 1 second of inactivity
3. **Race Condition Prevention**: Uses refs to avoid stale closure issues
4. **State Synchronization**: Keeps buffer state in sync with React state

## Accessibility

- **ARIA Labels**: Each segment has descriptive aria-label
- **Keyboard Navigation**: Full keyboard support for all interactions
- **Focus Management**: Proper focus handling and visual indicators
- **Screen Reader Support**: Announces current values and changes

## Testing

The component includes comprehensive tests covering:

- **Typing Scenarios**: Various input patterns and edge cases
- **Navigation**: Keyboard navigation between segments
- **Buffer Management**: Race condition prevention and timeout handling
- **Format Support**: Different time formats and validation
- **Accessibility**: Screen reader compatibility and ARIA support

## Browser Compatibility

Designed to work consistently across modern browsers with Chrome-like behavior as the reference implementation.
