import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const dummyLabel = 'dummyLabel';

const render = async ({
  component,
  genericProps,
  ...rest
}: Partial<RenderGenericComponentTestProps<'MultipleSelect'>> = {}) =>
  await renderGenericComponentTest({
    type: 'MultipleSelect',
    renderer: (props) => (
      <>
        <label htmlFor={props.node.item.id}>{dummyLabel}</label>
        <MultipleSelectComponent {...props} />
      </>
    ),
    component: {
      dataModelBindings: { simpleBinding: 'someField' },
      options: [
        { value: 'value1', label: 'label1' },
        { value: 'value2', label: 'label2' },
        { value: 'value3', label: 'label3' },
      ],
      readOnly: false,
      required: false,
      textResourceBindings: {},
      ...component,
    },
    genericProps: {
      isValid: true,
      ...genericProps,
    },
    ...rest,
  });

describe('MultipleSelect', () => {
  it('should display correct options as selected when supplied with a comma separated form data', async () => {
    await render({
      queries: {
        fetchFormData: async () => ({ someField: 'value1,value3' }),
      },
    });
    expect(screen.getByText('label1')).toBeInTheDocument();
    expect(screen.queryByText('label2')).not.toBeInTheDocument();
    expect(screen.getByText('label3')).toBeInTheDocument();
  });

  it('should remove item from comma separated form data on delete', async () => {
    const { formDataMethods } = await render({
      queries: {
        fetchFormData: async () => ({ someField: 'value1,value2,value3' }),
      },
    });

    await userEvent.click(screen.getByRole('button', { name: /Slett label2/i }));

    await waitFor(() =>
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({ path: 'someField', newValue: 'value1,value3' }),
    );
  });
});
