import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
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
      reference: { field: 'myTextArea', dataType: defaultDataTypeMock },
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

  it('should have aria-describedby attribute if title and description is present', async () => {
    await render({
      component: {
        id: 'id',
        textResourceBindings: { title: 'tittel', description: 'beskrivelse' },
      },
    });

    expect(screen.getByRole('textbox', { description: 'beskrivelse' })).toBeInTheDocument();
  });

  it('should not have aria-describedby attribute if textResourceBindings is present without description', async () => {
    await render({
      component: {
        id: 'id',
        textResourceBindings: {},
      },
    });

    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('aria-describedby');
  });

  it('should not have aria-describedby attribute if textResourceBindings is not present', async () => {
    await render();

    const textarea = screen.getByRole('textbox');
    expect(textarea).not.toHaveAttribute('aria-describedby');
  });
});

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'TextArea'>> = {}) =>
  await renderGenericComponentTest({
    type: 'TextArea',
    renderer: (props) => <TextAreaComponent {...props} />,
    component: {
      dataModelBindings: {
        simpleBinding: { dataType: defaultDataTypeMock, field: 'myTextArea' },
      },
      ...component,
    },
    ...rest,
  });
