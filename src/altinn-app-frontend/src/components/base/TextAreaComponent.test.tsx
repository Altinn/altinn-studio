import * as React from 'react';

import { render as rtlRender, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { TextAreaComponent } from 'src/components/base/TextAreaComponent';
import type { ITextAreaProps } from 'src/components/base/TextAreaComponent';

describe('TextAreaComponent.tsx', () => {
  const user = userEvent.setup();

  it('should render with initial text value', () => {
    render({
      formData: {
        simpleBinding: 'initial text content',
      },
    });

    const textarea = screen.getByRole('textbox');

    expect(textarea).toHaveValue('initial text content');
  });

  it('should fire handleDataChange with value when textarea is blurred', async () => {
    const initialText = 'initial text content';
    const addedText = ' + added content';

    const handleDataChange = jest.fn();
    render({
      formData: {
        simpleBinding: initialText,
      },
      handleDataChange,
    });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, addedText);
    await user.keyboard('{Tab}');

    expect(handleDataChange).toHaveBeenCalledWith(`${initialText}${addedText}`);
  });

  it('should not fire handleDataChange when readOnly is true', async () => {
    const initialText = 'initial text content';
    const addedText = ' + added content';

    const handleDataChange = jest.fn();
    render({
      formData: {
        simpleBinding: initialText,
      },
      handleDataChange,
      readOnly: true,
    });

    const textarea = screen.getByRole('textbox');
    await user.type(textarea, addedText);
    await user.keyboard('{Tab}');

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should have aria-describedby attribute if textResourceBindings is present', () => {
    render({
      textResourceBindings: {},
    });

    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveAttribute('aria-describedby', 'description-id');
  });

  it('should not have aria-describedby attribute if textResourceBindings is not present', () => {
    render();

    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('aria-describedby');
  });
});

const render = (props: Partial<ITextAreaProps> = {}) => {
  const allProps = {
    id: 'id',
    type: 'TextArea',
    handleDataChange: jest.fn(),
    getTextResource: (key: string) => key,
    ...props,
  } as ITextAreaProps;

  rtlRender(<TextAreaComponent {...allProps} />);
};
