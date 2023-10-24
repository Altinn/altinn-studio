import React from 'react';

import { act, screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TextAreaComponent } from 'src/layout/TextArea/TextAreaComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('TextAreaComponent.tsx', () => {
  const user = userEvent.setup();

  it('should render with initial text value', () => {
    render({
      genericProps: {
        formData: {
          simpleBinding: 'initial text content',
        },
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
      genericProps: {
        formData: {
          simpleBinding: initialText,
        },
        handleDataChange,
      },
    });

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      await user.type(textarea, addedText);
      await user.keyboard('{Tab}');
    });

    expect(handleDataChange).toHaveBeenCalledWith(`${initialText}${addedText}`, { validate: true });
  });

  it('should not fire handleDataChange when readOnly is true', async () => {
    const initialText = 'initial text content';
    const addedText = ' + added content';

    const handleDataChange = jest.fn();
    render({
      component: {
        readOnly: true,
      },
      genericProps: {
        formData: {
          simpleBinding: initialText,
        },
        handleDataChange,
      },
    });

    const textarea = screen.getByRole('textbox');
    await act(async () => {
      await user.type(textarea, addedText);
      await user.keyboard('{Tab}');
    });

    expect(handleDataChange).not.toHaveBeenCalled();
  });

  it('should have aria-describedby attribute if textResourceBindings is present', () => {
    render({
      component: {
        id: 'id',
        textResourceBindings: {},
      },
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

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'TextArea'>> = {}) => {
  renderGenericComponentTest({
    type: 'TextArea',
    renderer: (props) => <TextAreaComponent {...props} />,
    component,
    genericProps,
  });
};
