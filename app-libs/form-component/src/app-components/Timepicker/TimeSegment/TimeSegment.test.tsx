import { render, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import type { TimeSegmentProps } from '@app/form-component/app-components/Timepicker/types';

import { TimeSegment } from './TimeSegment';

describe('TimeSegment Component', () => {
  const defaultProps: TimeSegmentProps = {
    value: 12,
    min: 1,
    max: 12,
    type: 'hours',
    format: 'hh:mm a',
    onValueChange: vi.fn(),
    onNavigate: vi.fn(),
    'aria-label': 'Hours',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render with formatted value', () => {
      render(<TimeSegment {...defaultProps} value={9} />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('09');
    });

    it('should render period segment with AM/PM', () => {
      render(<TimeSegment {...defaultProps} type='period' value='AM' />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveValue('AM');
    });

    it('should render with placeholder', () => {
      render(<TimeSegment {...defaultProps} placeholder='HH' />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('placeholder', 'HH');
    });

    it('should render as disabled when disabled prop is true', () => {
      render(<TimeSegment {...defaultProps} disabled />);
      const input = screen.getByRole('textbox');
      expect(input).toBeDisabled();
    });

    it('should render as readonly when readOnly prop is true', () => {
      render(<TimeSegment {...defaultProps} readOnly />);
      const input = screen.getByRole('textbox');
      expect(input).toHaveAttribute('readonly');
    });
  });

  describe('User Input', () => {
    it('should accept valid numeric input', async () => {
      const onValueChange = vi.fn();
      render(<TimeSegment {...defaultProps} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      await userEvent.clear(input);
      await userEvent.type(input, '8');

      expect(onValueChange).toHaveBeenCalledWith(8);
    });

    it('should accept two-digit input', async () => {
      const onValueChange = vi.fn();
      render(<TimeSegment {...defaultProps} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      await userEvent.clear(input);
      await userEvent.type(input, '11');

      expect(onValueChange).toHaveBeenCalledWith(11);
    });

    it('should reject invalid input', async () => {
      const onValueChange = vi.fn();
      render(<TimeSegment {...defaultProps} onValueChange={onValueChange} value={12} />);
      const input = screen.getByRole('textbox');

      await userEvent.clear(input);
      await userEvent.type(input, 'abc');

      expect(input).toHaveValue('--');
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('should accept period input', async () => {
      const onValueChange = vi.fn();
      render(
        <TimeSegment {...defaultProps} type='period' value='AM' onValueChange={onValueChange} />,
      );
      const input = screen.getByRole('textbox');

      await userEvent.clear(input);
      await userEvent.type(input, 'P');
      await userEvent.tab();

      expect(onValueChange).toHaveBeenCalledWith('PM');
    });
  });

  describe('Keyboard Navigation', () => {
    it('should call onNavigate with right on ArrowRight', async () => {
      const onNavigate = vi.fn();
      render(<TimeSegment {...defaultProps} onNavigate={onNavigate} />);
      const input = screen.getByRole('textbox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowRight}');

      expect(onNavigate).toHaveBeenCalledWith('right');
    });

    it('should call onNavigate with left on ArrowLeft', async () => {
      const onNavigate = vi.fn();
      render(<TimeSegment {...defaultProps} onNavigate={onNavigate} />);
      const input = screen.getByRole('textbox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowLeft}');

      expect(onNavigate).toHaveBeenCalledWith('left');
    });

    it('should increment value on ArrowUp', async () => {
      const onValueChange = vi.fn();
      render(<TimeSegment {...defaultProps} value={8} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowUp}');

      expect(onValueChange).toHaveBeenCalledWith(9);
    });

    it('should decrement value on ArrowDown', async () => {
      const onValueChange = vi.fn();
      render(<TimeSegment {...defaultProps} value={8} onValueChange={onValueChange} />);
      const input = screen.getByRole('textbox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowDown}');

      expect(onValueChange).toHaveBeenCalledWith(7);
    });

    it('should toggle period on ArrowUp/Down', async () => {
      const onValueChange = vi.fn();
      render(
        <TimeSegment {...defaultProps} type='period' value='AM' onValueChange={onValueChange} />,
      );
      const input = screen.getByRole('textbox');

      await userEvent.click(input);
      await userEvent.keyboard('{ArrowUp}');
      expect(onValueChange).toHaveBeenCalledWith('PM');

      vi.clearAllMocks();

      render(
        <TimeSegment {...defaultProps} type='period' value='PM' onValueChange={onValueChange} />,
      );
      const pmInput = screen.getAllByRole('textbox')[1];

      await userEvent.click(pmInput);
      await userEvent.keyboard('{ArrowDown}');
      expect(onValueChange).toHaveBeenCalledWith('AM');
    });
  });

  describe('Focus Behavior', () => {
    it('should handle focus events', async () => {
      render(<TimeSegment {...defaultProps} value={12} />);
      const input = screen.getByRole('textbox') as HTMLInputElement;

      await userEvent.click(input);

      expect(document.activeElement).toBe(input);
    });

    it('should auto-pad single digit on blur', async () => {
      const onValueChange = vi.fn();
      const { rerender } = render(
        <TimeSegment {...defaultProps} value={3} onValueChange={onValueChange} />,
      );
      const input = screen.getByRole('textbox');

      await userEvent.clear(input);
      await userEvent.type(input, '3');
      await userEvent.tab();

      expect(onValueChange).toHaveBeenCalledWith(3);

      rerender(<TimeSegment {...defaultProps} value={3} onValueChange={onValueChange} />);
      expect(input).toHaveValue('03');
    });

    describe('Value Synchronization', () => {
      it('should update display when value prop changes', () => {
        const { rerender } = render(<TimeSegment {...defaultProps} value={8} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('08');

        rerender(<TimeSegment {...defaultProps} value={12} />);
        expect(input).toHaveValue('12');
      });

      it('should format value based on segment type', () => {
        render(<TimeSegment {...defaultProps} type='minutes' value={5} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('05');
      });

      it('should handle 24-hour format', () => {
        render(<TimeSegment {...defaultProps} format='HH:mm' type='hours' value={14} />);
        const input = screen.getByRole('textbox');
        expect(input).toHaveValue('14');
      });
    });
  });
});
