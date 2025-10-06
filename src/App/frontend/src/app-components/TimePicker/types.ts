// Time format types
export type TimeFormat = 'HH:mm' | 'HH:mm:ss' | 'hh:mm a' | 'hh:mm:ss a';

// Segment types
export type SegmentType = 'hours' | 'minutes' | 'seconds' | 'period';
export type NumericSegmentType = Extract<SegmentType, 'hours' | 'minutes' | 'seconds'>;

// Core time value interface
export interface TimeValue {
  hours: number;
  minutes: number;
  seconds: number;
  period?: 'AM' | 'PM';
}

// Time constraints
export interface TimeConstraints {
  minTime?: string;
  maxTime?: string;
}

export interface SegmentConstraints {
  min: number;
  max: number;
  validValues: number[];
}

// Component props
export interface TimePickerProps {
  id: string;
  value: string;
  onChange: (time: string) => void;
  format?: TimeFormat;
  minTime?: string;
  maxTime?: string;
  disabled?: boolean;
  readOnly?: boolean;
  labels?: {
    hours?: string;
    minutes?: string;
    seconds?: string;
    amPm?: string;
  };
}

export interface TimeSegmentProps {
  value: number | string;
  min: number;
  max: number;
  type: SegmentType;
  format: TimeFormat;
  onValueChange: (value: number | string) => void;
  onNavigate: (direction: 'left' | 'right') => void;
  placeholder?: string;
  disabled?: boolean;
  readOnly?: boolean;
  required?: boolean;
  'aria-label': string;
  'aria-describedby'?: string;
  className?: string;
  autoFocus?: boolean;
}

// Dropdown and navigation
export interface DropdownFocusState {
  column: number;
  option: number;
  isActive: boolean;
}

export type NavigationAction =
  | { type: 'ARROW_UP' }
  | { type: 'ARROW_DOWN' }
  | { type: 'ARROW_LEFT' }
  | { type: 'ARROW_RIGHT' }
  | { type: 'ENTER' }
  | { type: 'ESCAPE' };

export interface TimeOption {
  value: number;
  label: string;
}

// Segment typing and validation
export interface SegmentTypingResult {
  value: string;
  shouldAdvance: boolean;
}

export interface SegmentBuffer {
  displayValue: string;
  actualValue: number | string | null;
  isComplete: boolean;
}

export interface SegmentNavigationResult {
  shouldNavigate: boolean;
  direction?: 'left' | 'right';
  shouldIncrement?: boolean;
  shouldDecrement?: boolean;
  preventDefault: boolean;
}

export interface SegmentChangeResult {
  updatedTimeValue: Partial<TimeValue>;
}

// Hook configurations
export interface SegmentInputConfig {
  segmentType: SegmentType;
  timeFormat: TimeFormat;
  currentValue: number | string;
  onValueChange: (value: number | string | null) => void;
  onNavigate: (direction: 'left' | 'right') => void;
  onUpdateDisplay: (value: string) => void;
}

export interface TypingBufferConfig {
  onCommit: (buffer: string) => void;
  commitDelayMs: number;
  typingEndDelayMs: number;
}
