import React from 'react';

import { screen } from '@testing-library/react';

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
