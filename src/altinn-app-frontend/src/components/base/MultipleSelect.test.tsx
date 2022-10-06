import React from 'react';

import { getInitialStateMock } from '__mocks__/initialStateMock';
import { fireEvent, screen } from '@testing-library/react';
import { renderWithProviders } from 'testUtils';
import type { PreloadedState } from 'redux';

import { MultipleSelect } from 'src/components/base/MultipleSelect';
import type { IMultipleSelectProps } from 'src/components/base/MultipleSelect';
import type { RootState } from 'src/store';

const dummyLabel = 'dummyLabel';

const render = (
  props: Partial<IMultipleSelectProps> = {},
  customState: PreloadedState<RootState> = {},
) => {
  const allProps: IMultipleSelectProps = {
    ...({} as IMultipleSelectProps),
    id: 'id',
    formData: { simpleBinding: '' },
    handleDataChange: jest.fn(),
    getTextResourceAsString: (key: string) => key,
    isValid: true,
    dataModelBindings: { simpleBinding: 'some.field' },
    componentValidations: {},
    language: {},
    options: [
      { value: 'value1', label: 'label1' },
      { value: 'value2', label: 'label2' },
      { value: 'value3', label: 'label3' },
    ],
    readOnly: false,
    required: false,
    textResourceBindings: {},
    ...props,
  };

  return renderWithProviders(
    <>
      <label htmlFor={allProps.id}>{dummyLabel}</label>
      <MultipleSelect {...allProps} />
    </>,
    {
      preloadedState: {
        ...getInitialStateMock(),
        ...customState,
      },
    },
  );
};

describe('MultipleSelect', () => {
  it('should display correct options as selected when supplied with a comma separated form data', () => {
    render({
      formData: { simpleBinding: 'value1,value3' },
    });
    expect(screen.getByText('label1')).toBeInTheDocument();
    expect(screen.queryByText('label2')).not.toBeInTheDocument();
    expect(screen.getByText('label3')).toBeInTheDocument();
  });

  it('should remove item from comma separated form data on delete', () => {
    const handleDataChange = jest.fn();
    render({
      handleDataChange,
      formData: { simpleBinding: 'value1,value2,value3' },
    });
    fireEvent.click(
      screen.getByRole('button', {
        name: /remove label2/i,
      }),
    );
    expect(handleDataChange).toBeCalledWith('value1,value3');
  });
});
