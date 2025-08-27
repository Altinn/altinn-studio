import React from 'react';
import { StudioTextarea } from 'libs/studio-components-legacy/src';
import {
  DEFAULT_MAX_HEIGHT_PX_TEXTAREA,
  DEFAULT_MIN_HEIGHT_PX_TEXTAREA,
  useAutoSizeTextArea,
} from 'app-shared/hooks/useAutoSizeTextArea';
import { render, screen } from '@testing-library/react';

describe('useAutoSizeTextArea', () => {
  it('should set a default min height of the textarea where the scroll is not visible', () => {
    const testLabel = 'LabelForAShortText';
    const TestComponent = ({ value }: { value: string }) => {
      const textareaRef = useAutoSizeTextArea(value);
      return <StudioTextarea label={testLabel} value={value} ref={textareaRef} />;
    };

    render(<TestComponent value={'A text'} />);

    const textarea = screen.getByRole('textbox', { name: testLabel });

    expect(textarea.style.height).toBe(DEFAULT_MIN_HEIGHT_PX_TEXTAREA + 'px');
    expect(textarea.style.overflow).toBe('hidden');
  });

  it('should set a dynamic height of the textarea without visible scrollbar when the scrollHeight is between min and max', () => {
    const testLabel = 'LabelForMediumLongText';
    const scrollHeight = (DEFAULT_MIN_HEIGHT_PX_TEXTAREA + DEFAULT_MAX_HEIGHT_PX_TEXTAREA) / 2;
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: function () {
        return scrollHeight;
      },
    });

    const TestComponent = ({ value }: { value: string }) => {
      const textareaRef = useAutoSizeTextArea(value);
      return <StudioTextarea label={testLabel} value={value} ref={textareaRef} />;
    };

    render(<TestComponent value='A text' />);

    const textarea = screen.getByRole('textbox', { name: testLabel });

    expect(textarea.style.height).toBe(scrollHeight + 'px');
    expect(textarea.style.overflow).toBe('hidden');
  });

  it('should set the height of textarea to max with scrollbar when scrollHeight exceeds max height', async () => {
    const testLabel = 'LabelForLongText';
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: function () {
        return DEFAULT_MAX_HEIGHT_PX_TEXTAREA + 10;
      },
    });

    const TestComponent = ({ value }: { value: string }) => {
      const textareaRef = useAutoSizeTextArea(value);

      return <StudioTextarea label={testLabel} value={value} ref={textareaRef} />;
    };

    render(<TestComponent value='A text' />);

    const textarea = screen.getByRole('textbox', { name: testLabel });

    expect(textarea.style.height).toBe(DEFAULT_MAX_HEIGHT_PX_TEXTAREA + 'px');
    expect(textarea.style.overflow).toBe('auto');
  });

  it('should override the min height when passing as prop', () => {
    const newMinHeight = 10;
    const testLabel = 'LabelForLongText';
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: function () {
        return newMinHeight - 1;
      },
    });
    const TestComponent = ({ value }: { value: string }) => {
      const textareaRef = useAutoSizeTextArea(value, { minHeightInPx: newMinHeight });
      return <StudioTextarea label={testLabel} value={value} ref={textareaRef} />;
    };

    render(<TestComponent value='A text' />);

    const textarea = screen.getByRole('textbox', { name: testLabel });

    expect(textarea.style.height).toBe(newMinHeight + 'px');
  });

  it('should override the max height when passing as prop', () => {
    const newMaxHeight = 60;
    const testLabel = 'LabelForLongText';
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      configurable: true,
      get: function () {
        return newMaxHeight;
      },
    });
    const TestComponent = ({ value }: { value: string }) => {
      const textareaRef = useAutoSizeTextArea(value, { maxHeightInPx: newMaxHeight });
      return <StudioTextarea label={testLabel} value={value} ref={textareaRef} />;
    };

    render(<TestComponent value='A text' />);

    const textarea = screen.getByRole('textbox', { name: testLabel });

    expect(textarea.style.height).toBe(newMaxHeight + 'px');
  });
});
