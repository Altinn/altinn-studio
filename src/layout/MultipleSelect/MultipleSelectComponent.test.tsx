import React from 'react';

import { act, screen, within } from '@testing-library/react';

import { MultipleSelectComponent } from 'src/layout/MultipleSelect/MultipleSelectComponent';
import { renderGenericComponentTest } from 'src/testUtils';
import type { RenderGenericComponentTestProps } from 'src/testUtils';

const dummyLabel = 'dummyLabel';

const render = ({ component, genericProps }: Partial<RenderGenericComponentTestProps<'MultipleSelect'>> = {}) => {
  renderGenericComponentTest({
    type: 'MultipleSelect',
    renderer: (props) => (
      <>
        <label htmlFor={props.node.item.id}>{dummyLabel}</label>
        <MultipleSelectComponent {...props} />
      </>
    ),
    component: {
      dataModelBindings: { simpleBinding: 'some.field' },
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
      formData: { simpleBinding: '' },
      isValid: true,
      handleDataChange: jest.fn(),
      ...genericProps,
    },
  });
};

describe('MultipleSelect', () => {
  jest.useFakeTimers();
  it('should display correct options as selected when supplied with a comma separated form data', () => {
    render({
      genericProps: {
        formData: { simpleBinding: 'value1,value3' },
      },
    });
    const input = screen.getByTestId('InputWrapper');
    expect(within(input).getByText('label1')).toBeInTheDocument();
    expect(within(input).queryByText('label2')).not.toBeInTheDocument();
    expect(within(input).getByText('label3')).toBeInTheDocument();
  });

  it('should remove item from comma separated form data on delete', async () => {
    const handleDataChange = jest.fn();
    render({
      genericProps: {
        handleDataChange,
        formData: { simpleBinding: 'value1,value2,value3' },
      },
    });

    await act(() => screen.getByRole('button', { name: /Slett label2/i }).click());
    jest.runOnlyPendingTimers();

    expect(handleDataChange).toBeCalledWith('value1,value3', { validate: true });
  });
});
