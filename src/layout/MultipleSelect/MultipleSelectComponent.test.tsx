import React from 'react';

import { fireEvent, screen } from '@testing-library/react';

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
  it('should display correct options as selected when supplied with a comma separated form data', () => {
    render({
      genericProps: {
        formData: { simpleBinding: 'value1,value3' },
      },
    });
    expect(screen.getByText('label1')).toBeInTheDocument();
    expect(screen.queryByText('label2')).not.toBeInTheDocument();
    expect(screen.getByText('label3')).toBeInTheDocument();
  });

  it('should remove item from comma separated form data on delete', () => {
    const handleDataChange = jest.fn();
    render({
      genericProps: {
        handleDataChange,
        formData: { simpleBinding: 'value1,value2,value3' },
      },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: /remove label2/i,
      }),
    );
    expect(handleDataChange).toBeCalledWith('value1,value3');
  });
});
