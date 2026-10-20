import React from 'react';

import { screen } from '@testing-library/react';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { useDisplayData } from 'src/features/displayData/useDisplayData';
import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { renderGenericComponentTest } from 'src/test/renderWithProviders';
import type { RenderGenericComponentTestProps } from 'src/test/renderWithProviders';

const dummyLabel = 'dummyLabel';

function DisplayValue({ baseComponentId }: { baseComponentId: string }) {
  return <output data-testid='display-value'>{useDisplayData(baseComponentId)}</output>;
}

const render = async ({ component, ...rest }: Partial<RenderGenericComponentTestProps<'MultipleSelect'>> = {}) =>
  await renderGenericComponentTest({
    type: 'MultipleSelect',
    renderer: (props) => (
      <>
        <label htmlFor={props.baseComponentId}>{dummyLabel}</label>
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
  it.each([
    { initialData: {}, expected: '' },
    { initialData: { choices: [] }, expected: '' },
    {
      initialData: {
        choices: [
          { value: 'first', checked: true },
          { value: 'second', checked: false },
        ],
      },
      expected: 'first',
    },
  ])('displays selected group values for $initialData', async ({ initialData, expected }) => {
    await render({
      renderer: ({ baseComponentId }) => <DisplayValue baseComponentId={baseComponentId} />,
      component: {
        dataModelBindings: {
          group: { dataType: defaultDataTypeMock, field: 'choices' },
          simpleBinding: { dataType: defaultDataTypeMock, field: 'choices.value' },
          checked: { dataType: defaultDataTypeMock, field: 'choices.checked' },
        },
      },
      queries: {
        fetchFormBootstrapForInstance: async () =>
          getFormBootstrapMock((obj) => {
            obj.dataModels[defaultDataTypeMock].initialData = initialData;
          }),
      },
    });

    expect(screen.getByTestId('display-value').textContent).toBe(expected);
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
