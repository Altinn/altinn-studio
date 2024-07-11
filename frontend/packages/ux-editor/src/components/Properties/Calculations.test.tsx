import React from 'react';
import { render, screen } from '@testing-library/react';
import { Calculations } from './Calculations';
import { FormItemContext } from '../../containers/FormItemContext';
import { formItemContextProviderMock } from '../../testing/formItemContextMocks';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { FormComponent } from '../../types/FormComponent';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { appContextMock } from '@altinn/ux-editor/testing/appContextMock';
import { AppContext } from '@altinn/ux-editor/AppContext';

describe('Calculations', () => {
  it.skip('should render unknown component when components is unknown for Studio', () => {
    const formType = 'randomUnknownComponent' as unknown as FormComponent;
    renderCalculations({ formItem: { ...formItemContextProviderMock.formItem, type: formType } });
    expect(
      screen.getByText(
        textMock('ux_editor.edit_component.unknown_component', {
          componentName: formType,
        }),
      ),
    );
  });

  it('should render alert saying that calculations is deprecated with a documentation link ', () => {
    renderCalculations();
    const alert = screen.getByText(textMock('right_menu.rules_calculations_deprecated_info'));
    const linkToDocs = screen.getByRole('link', { name: textMock('right_menu.dynamics_link') });
    expect(alert).toBeInTheDocument();
    expect(linkToDocs).toBeInTheDocument();
  });

  it('should render link to edit ruleHandler directly in Gitea', () => {
    renderCalculations();
    const linkToEdit = screen.getByRole('link', { name: textMock('right_menu.dynamics_edit') });
    expect(linkToEdit).toBeInTheDocument();
  });
});

const getCalculationsWithMockedFormItemContext = (props: Partial<FormItemContext> = {}) => {
  return (
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <AppContext.Provider value={{ ...appContextMock }}>
        <FormItemContext.Provider
          value={{
            ...formItemContextProviderMock,
            ...props,
          }}
        >
          <Calculations />
        </FormItemContext.Provider>
      </AppContext.Provider>
    </ServicesContextProvider>
  );
};
const renderCalculations = (props: Partial<FormItemContext> = {}) => {
  return render(getCalculationsWithMockedFormItemContext(props));
};
