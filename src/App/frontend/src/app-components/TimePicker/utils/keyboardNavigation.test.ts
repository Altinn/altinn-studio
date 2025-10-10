import {
  getNextSegmentIndex,
  handleSegmentKeyDown,
  handleValueDecrement,
  handleValueIncrement,
} from 'src/app-components/TimePicker/utils/keyboardNavigation';

interface MockKeyboardEvent {
  key: string;
  preventDefault: () => void;
}

type SegmentType = 'hours' | 'minutes' | 'seconds' | 'period';

describe('Keyboard Navigation Logic', () => {
  describe('handleSegmentKeyDown', () => {
    it('should handle Arrow Up key', () => {
      const mockEvent = { key: 'ArrowUp', preventDefault: jest.fn() } as unknown as MockKeyboardEvent;
      const result = handleSegmentKeyDown(mockEvent);

      expect(result.shouldIncrement).toBe(true);
      expect(result.preventDefault).toBe(true);
      expect(mockEvent.preventDefault).toHaveBeenCalled();
    });

    it('should handle Arrow Down key', () => {
      const mockEvent = { key: 'ArrowDown', preventDefault: jest.fn() } as unknown as MockKeyboardEvent;
      const result = handleSegmentKeyDown(mockEvent);

      expect(result.shouldDecrement).toBe(true);
      expect(result.preventDefault).toBe(true);
    });

    it('should handle Arrow Right key', () => {
      const mockEvent = { key: 'ArrowRight', preventDefault: jest.fn() } as unknown as MockKeyboardEvent;
      const result = handleSegmentKeyDown(mockEvent);

      expect(result.shouldNavigate).toBe(true);
      expect(result.direction).toBe('right');
      expect(result.preventDefault).toBe(true);
    });

    it('should handle Arrow Left key', () => {
      const mockEvent = { key: 'ArrowLeft', preventDefault: jest.fn() } as unknown as MockKeyboardEvent;
      const result = handleSegmentKeyDown(mockEvent);

      expect(result.shouldNavigate).toBe(true);
      expect(result.direction).toBe('left');
      expect(result.preventDefault).toBe(true);
    });

    it('should not handle other keys', () => {
      const mockEvent = { key: 'Enter', preventDefault: jest.fn() } as unknown as MockKeyboardEvent;
      const result = handleSegmentKeyDown(mockEvent);

      expect(result.shouldNavigate).toBe(false);
      expect(result.shouldIncrement).toBe(false);
      expect(result.shouldDecrement).toBe(false);
      expect(result.preventDefault).toBe(false);
      expect(mockEvent.preventDefault).not.toHaveBeenCalled();
    });
  });

  describe('getNextSegmentIndex', () => {
    const segments: SegmentType[] = ['hours', 'minutes', 'seconds', 'period'];

    it('should navigate between segments correctly', () => {
      expect(getNextSegmentIndex(0, 'right', segments)).toBe(1);
      expect(getNextSegmentIndex(1, 'left', segments)).toBe(0);
      expect(getNextSegmentIndex(3, 'right', segments)).toBe(0); // wrap right
      expect(getNextSegmentIndex(0, 'left', segments)).toBe(3); // wrap left
    });
  });

  describe('handleValueIncrement', () => {
    it('should increment hours correctly', () => {
      expect(handleValueIncrement(8, 'hours', 'HH:mm')).toBe(9);
      expect(handleValueIncrement(23, 'hours', 'HH:mm')).toBe(0); // wrap 24h
      expect(handleValueIncrement(12, 'hours', 'hh:mm a')).toBe(1); // wrap 12h
    });

    it('should increment minutes and seconds', () => {
      expect(handleValueIncrement(30, 'minutes', 'HH:mm')).toBe(31);
      expect(handleValueIncrement(59, 'minutes', 'HH:mm')).toBe(0); // wrap
      expect(handleValueIncrement(59, 'seconds', 'HH:mm:ss')).toBe(0); // wrap
    });

    it('should toggle period', () => {
      expect(handleValueIncrement('AM', 'period', 'hh:mm a')).toBe('PM');
      expect(handleValueIncrement('PM', 'period', 'hh:mm a')).toBe('AM');
    });
  });

  describe('handleValueDecrement', () => {
    it('should decrement hours correctly', () => {
      expect(handleValueDecrement(8, 'hours', 'HH:mm')).toBe(7);
      expect(handleValueDecrement(0, 'hours', 'HH:mm')).toBe(23); // wrap 24h
      expect(handleValueDecrement(1, 'hours', 'hh:mm a')).toBe(12); // wrap 12h
    });

    it('should decrement minutes and seconds', () => {
      expect(handleValueDecrement(30, 'minutes', 'HH:mm')).toBe(29);
      expect(handleValueDecrement(0, 'minutes', 'HH:mm')).toBe(59); // wrap
      expect(handleValueDecrement(0, 'seconds', 'HH:mm:ss')).toBe(59); // wrap
    });

    it('should toggle period', () => {
      expect(handleValueDecrement('PM', 'period', 'hh:mm a')).toBe('AM');
      expect(handleValueDecrement('AM', 'period', 'hh:mm a')).toBe('PM');
    });
  });
});
