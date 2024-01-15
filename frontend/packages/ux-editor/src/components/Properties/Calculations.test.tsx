import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calculations } from './Calculations';
import { FormContext } from '../../containers/FormContext';
import { formContextProviderMock } from '../../testing/formContextMocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import {FormComponent} from "../../types/FormComponent";

describe('Calculations', () => {
  it('should render unknown component when components is unknown for Studio', () => {
    studioRender();
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: 'randomUnknownComponent',
        }),
      ),
    );
  });
});

const getCalculationsWithMockedFormContext = () => {
  return (
    <FormContext.Provider
      value={{
        ...formContextProviderMock,
        form: {
          type: 'randomUnknownComponent' as FormComponent,
        },
      }}
    >
      <Calculations />
    </FormContext.Provider>
  );
};
const studioRender = () => {
  return render(getCalculationsWithMockedFormContext());
};
