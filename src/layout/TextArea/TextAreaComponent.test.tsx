import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { TextAreaComponent } from 'src/layout/TextArea/TextAreaComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

describe('TextAreaComponent', () => {
  it('should render with initial text value', async () => {
    await render({
      queries: {
        fetchFormData: async () => ({
          myTextArea: 'initial text content',
        }),
      },
    });

    const textarea = screen.getByRole('textbox');

    expect(textarea).toHaveValue('initial text content');
  });

  it('should fire setLeafValue with value', async () => {
    const initialText = 'initial text content';
    const addedText = ' + added content';

    const { formDataMethods } = await render({
      queries: {
        fetchFormData: async () => ({
          myTextArea: initialText,
        }),
      },
    });

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, addedText);

    expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
      path: 'myTextArea',
      newValue: `${initialText}${addedText}`,
    });
  });

  it('should not fire setLeafValue when readOnly is true', async () => {
    const initialText = 'initial text content';
    const addedText = ' + added content';

    const { formDataMethods } = await render({
      component: {
        readOnly: true,
      },
      queries: {
        fetchFormData: async () => ({
          myTextArea: initialText,
        }),
      },
    });

    const textarea = screen.getByRole('textbox');
    await userEvent.type(textarea, addedText);

    expect(formDataMethods.setLeafValue).not.toHaveBeenCalled();
  });

  it('should have aria-describedby attribute if textResourceBindings.description is present', async () => {
    await render({
      component: {
        id: 'id',
        textResourceBindings: { description: 'tekst' },
      },
    });

    const textarea = screen.getByRole('textbox');
    expect(textarea.getAttribute('aria-describedby')).toContain('description-id');
  });

  it('should not have aria-describedby attribute if textResourceBindings is present without description', async () => {
    await render({
      component: {
        id: 'id',
        textResourceBindings: {},
      },
      genericProps: {
        isValid: true,
      },
    });

    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('aria-describedby');
  });

  it('should not have aria-describedby attribute if textResourceBindings is not present', async () => {
    await render({
      genericProps: {
        isValid: true,
      },
    });

    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('aria-describedby');
  });
});

const render = async ({
  component,
  genericProps,
  ...rest
}: Partial<RenderGenericComponentTestProps<'TextArea'>> = {}) =>
  await renderGenericComponentTest({
    type: 'TextArea',
    renderer: (props) => <TextAreaComponent {...props} />,
    component: {
      dataModelBindings: {
        simpleBinding: 'myTextArea',
      },
      ...component,
    },
    genericProps,
    ...rest,
  });
