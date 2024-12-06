import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calculations } from './Calculations';
import { FormItemContext } from '../../containers/FormItemContext';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { FormComponent } from '../../types/FormComponent';

describe('Calculations', () => {
  it('should render unknown component when components is unknown for Studio', () => {
    const formType = 'randomUnknownComponent' as unknown as FormComponent;
    studioRender({ formItem: { ...formItemContextProviderMock.formItem, type: formType } });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: formType,
        }),
      ),
    );
  });
});

const getCalculationsWithMockedFormItemContext = (props: Partial<FormItemContext> = {}) => {
  return (
    <FormItemContext.Provider
      value={{
        ...formItemContextProviderMock,
        ...props,
      }}
    >
      <Calculations />
    </FormItemContext.Provider>
  );
};
const studioRender = (props: Partial<FormItemContext> = {}) => {
  return render(getCalculationsWithMockedFormItemContext(props));
};
