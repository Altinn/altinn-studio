import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TimePicker } from './TimePicker';

describe('TimePicker - Responsive & Accessibility', () => {
  const defaultProps = {
    id: 'test-timepicker',
    value: '14:30',
    onChange: vi.fn(),
  };

  beforeAll(() => {
    // Mock getComputedStyle to avoid JSDOM errors with Popover
    Object.defineProperty(window, 'getComputedStyle', {
      value: () => ({
        getPropertyValue: () => '',
        position: 'absolute',
        top: '0px',
        left: '0px',
        width: '300px',
        height: '200px',
      }),
      writable: true,
    });
  });

  describe('Responsive Behavior', () => {
    const originalInnerWidth = window.innerWidth;

    afterEach(() => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: originalInnerWidth,
      });
    });

    it('should render at 205px width (smallest breakpoint)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 205,
      });

      render(<TimePicker {...defaultProps} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2); // hours and minutes
    });

    it('should render at 348px width (medium breakpoint)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 348,
      });

      render(<TimePicker {...defaultProps} />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(2);

      inputs.forEach((input) => {
        expect(input).toBeVisible();
      });
    });

    it('should handle long format at small widths', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 205,
      });

      render(<TimePicker {...defaultProps} format='hh:mm:ss a' value='02:30:45 PM' />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4);

      inputs.forEach((input) => {
        expect(input).toBeInTheDocument();
      });
    });
  });

  describe('Screen Reader Accessibility', () => {
    it('should have proper aria-labels for all inputs', () => {
      render(<TimePicker {...defaultProps} />);

      const hoursInput = screen.getByRole('textbox', { name: /hours/i });
      const minutesInput = screen.getByRole('textbox', { name: /minutes/i });

      expect(hoursInput).toHaveAttribute('aria-label', 'Hours');
      expect(minutesInput).toHaveAttribute('aria-label', 'Minutes');
    });

    it('should have proper aria-labels with custom labels', () => {
      render(
        <TimePicker
          {...defaultProps}
          labels={{
            hours: 'Timer',
            minutes: 'Minutter',
          }}
        />,
      );

      const hoursInput = screen.getByRole('textbox', { name: /timer/i });
      const minutesInput = screen.getByRole('textbox', { name: /minutter/i });

      expect(hoursInput).toHaveAttribute('aria-label', 'Timer');
      expect(minutesInput).toHaveAttribute('aria-label', 'Minutter');
    });

    it('should have proper aria-labels for 12-hour format', () => {
      render(<TimePicker {...defaultProps} format='hh:mm a' value='02:30 PM' />);

      const hoursInput = screen.getByRole('textbox', { name: /hours/i });
      const minutesInput = screen.getByRole('textbox', { name: /minutes/i });
      const periodInput = screen.getByRole('textbox', { name: /am\/pm/i });

      expect(hoursInput).toHaveAttribute('aria-label', 'Hours');
      expect(minutesInput).toHaveAttribute('aria-label', 'Minutes');
      expect(periodInput).toHaveAttribute('aria-label', 'AM/PM');
    });

    it('should have proper aria-labels with seconds', () => {
      render(<TimePicker {...defaultProps} format='HH:mm:ss' value='14:30:45' />);

      const secondsInput = screen.getByRole('textbox', { name: /seconds/i });
      expect(secondsInput).toHaveAttribute('aria-label', 'Seconds');
    });

    it('should have accessible dropdown dialog', () => {
      render(<TimePicker {...defaultProps} />);

      const clockButton = screen.getByRole('button', { name: /open time picker/i });
      expect(clockButton).toHaveAttribute('aria-label', 'Open time picker');
    });

    it('should announce dropdown state to screen readers', async () => {
      const user = userEvent.setup();
      render(<TimePicker {...defaultProps} />);

      const clockButton = screen.getByRole('button', { name: /open time picker/i });
      await user.click(clockButton);

      const dropdown = screen.getByLabelText('Time selection dropdown');
      expect(dropdown).toHaveAttribute('aria-modal', 'true');
    });

    it('should maintain semantic structure for screen readers', () => {
      render(<TimePicker {...defaultProps} format='hh:mm:ss a' value='02:30:45 PM' />);

      const inputs = screen.getAllByRole('textbox');
      expect(inputs).toHaveLength(4);

      inputs.forEach((input) => {
        expect(input).toHaveAttribute('aria-label');
      });

      const clockButton = screen.getByRole('button', { name: /open time picker/i });
      expect(clockButton).toHaveAttribute('aria-label');
    });
  });

  describe('Disabled State Accessibility', () => {
    it('should properly indicate disabled state to screen readers', () => {
      render(<TimePicker {...defaultProps} disabled />);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toBeDisabled();
      });

      const clockButton = screen.getByRole('button', { name: /open time picker/i });
      expect(clockButton).toBeDisabled();
    });

    it('should properly indicate readonly state', () => {
      render(<TimePicker {...defaultProps} readOnly />);

      const inputs = screen.getAllByRole('textbox');
      inputs.forEach((input) => {
        expect(input).toHaveAttribute('readonly');
      });

      const clockButton = screen.getByRole('button', { name: /open time picker/i });
      expect(clockButton).toBeDisabled();
    });
  });
});
