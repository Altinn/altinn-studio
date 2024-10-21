import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { defaultDataTypeMock } from 'src/__mocks__/getLayoutSetsMock';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const dummyLabel = 'dummyLabel';

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'MultipleSelect'>> = {}) =>
  await renderGenericComponentTest({
    type: 'MultipleSelect',
    renderer: (props) => (
      <>
        <label htmlFor={props.node.id}>{dummyLabel}</label>
        <MultipleSelectComponent {...props} />
      </>
    ),
    component: {
      dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'someField' } },
      options: [
        { value: 'value1', label: 'label1' },
        { value: 'value2', label: 'label2' },
        { value: 'value3', label: 'label3' },
      ],
      readOnly: false,
      required: false,
      textResourceBindings: {
        title: 'Velg',
      },
      ...component,
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
      expect(formDataMethods.setLeafValue).toHaveBeenCalledWith({
        reference: { field: 'someField', dataType: defaultDataTypeMock },
        newValue: 'value1,value3',
      }),
    );
  });

  it('required validation should only show for simpleBinding', async () => {
    await render({
      component: {
        showValidations: ['Required'],
        required: true,
        dataModelBindings: {
          simpleBinding: { dataType: defaultDataTypeMock, field: 'value' },
          label: { dataType: defaultDataTypeMock, field: 'label' },
          metadata: { dataType: defaultDataTypeMock, field: 'metadata' },
        },
      },
      queries: {
        fetchFormData: () => Promise.resolve({ simpleBinding: '', label: '', metadata: '' }),
      },
    });

    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    expect(screen.getByRole('listitem')).toHaveTextContent('Du må fylle ut velg');
  });
});
