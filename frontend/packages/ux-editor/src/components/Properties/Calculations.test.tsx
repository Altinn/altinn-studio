import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calculations } from './Calculations';
import { FormContext } from '../../containers/FormContext';
import { formContextProviderMock } from '../../testing/formContextMocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';

describe('Calculations', () => {
  it('should render unknown component when components is unknown for Studio', () => {
    studioRender({
      form: {
        type: 'randomUnknownComponent',
      },
    });
  });
  expect(
    screen.getByText(textMock('ux_editor.edit_component.unknown_component', {
      componentName: 'randomUnknownComponent',
    }),
  ));
});
const getComponent = (formContextProps: Partial<FormContext> = {}) => (
  <FormContext.Provider
    value={{
      ...formContextProviderMock,
      ...formContextProps,
    }}
  >
    <Calculations />
  </FormContext.Provider>
);

const studioRender = (formContextProps: Partial<FormContext> = {}) =>
  render(getComponent(formContextProps));
