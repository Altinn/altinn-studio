import React from 'react';
import userEvent from '@testing-library/user-event';
import type { StudioTextResourceValueEditorProps } from './StudioTextResourceValueEditor';
import { StudioTextResourceValueEditor } from './StudioTextResourceValueEditor';
import { render, screen } from '@testing-library/react';

const user = userEvent.setup();

const textResourceId = '1';
const textResourceValue = 'Text 1';
const ariaLabel = 'Edit text resource';
const idLabel = 'ID:';
const mockOnTextChange = jest.fn();
const defaultProps: StudioTextResourceValueEditorProps = {
  textResourceId,
  ariaLabel,
  idLabel,
  onTextChange: mockOnTextChange,
};

describe('StudioTextResourceValueEditor', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('Displays textbox with given value', () => {
    renderTextResourceValueEditor({ textResourceValue });

    const textbox = screen.getByRole('textbox');
    expect(textbox).toHaveValue(textResourceValue);
  });

  it('Displays empty string when textResourceValue is undefined', () => {
    renderTextResourceValueEditor();

    const textbox = screen.getByRole('textbox');
    expect(textbox).toHaveValue('');
  });

  it('Calls onTextChange when value is changed', async () => {
    renderTextResourceValueEditor({ textResourceValue });
    const textbox = screen.getByRole('textbox', {
      name: ariaLabel,
    });
    await user.type(textbox, 'a');
    expect(mockOnTextChange).toHaveBeenCalled();
    const lastCall = mockOnTextChange.mock.calls[mockOnTextChange.mock.calls.length - 1];
    expect(lastCall[0]).toBe(textResourceValue + 'a');
  });

  it('Displays the text resource ID', () => {
    renderTextResourceValueEditor();

    expect(screen.getByText(textResourceId)).toBeInTheDocument();
  });
});

const renderTextResourceValueEditor = (
  props: Partial<StudioTextResourceValueEditorProps> = {},
): ReturnType<typeof render> => {
  return render(<StudioTextResourceValueEditor {...defaultProps} {...props} />);
};
