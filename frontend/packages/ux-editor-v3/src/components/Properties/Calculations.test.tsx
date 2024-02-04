import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calculations } from './Calculations';
import { FormContext } from '../../containers/FormContext';
import { formContextProviderMock } from '../../testing/formContextMocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import type { FormComponent } from '../../types/FormComponent';

describe('Calculations', () => {
  it('should render unknown component when components is unknown for Studio', () => {
    const formType = 'randomUnknownComponent' as unknown as FormComponent;
    studioRender({ form: { ...formContextProviderMock.form, type: formType } });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: formType,
        }),
      ),
    );
  });
});

const getCalculationsWithMockedFormContext = (props: Partial<FormContext> = {}) => {
  return (
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        ...props,
      }}
    >
      <Calculations />
    </FormContext.Provider>
  );
};
const studioRender = (props: Partial<FormContext> = {}) => {
  return render(getCalculationsWithMockedFormContext(props));
};
