import React from 'react';
import { render, screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ServicesContextProvider } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { appContextMock } from '@altinn/ux-editor/testing/appContextMock';
import { AppContext } from '@altinn/ux-editor/AppContext';
import { DeprecatedConditionalRenderingInfo } from '@altinn/ux-editor/components/FormDesigner/Properties/DeprecatedConditionalRenderingInfo';

describe('DeprecatedConditionalRenderingInfo', () => {
  it('should render alert saying that conditional rendering is deprecated with a documentation link ', () => {
    renderDeprecatedConditionalRenderingInfo();
    const alertHeader = screen.getByText(
      textMock('right_menu.rules_conditional_rendering_deprecated_info_title'),
    );
    const alert = screen.getByText(
      textMock('right_menu.rules_conditional_rendering_deprecated_info'),
    );
    expect(alertHeader).toBeInTheDocument();
    expect(alert).toBeInTheDocument();
  });

  it('should render link to edit ruleHandler directly in Gitea', () => {
    renderDeprecatedConditionalRenderingInfo();
    const linkToEdit = screen.getByRole('link', {
      name: textMock('right_menu.rules_conditional_rendering_edit_in_gitea'),
    });
    expect(linkToEdit).toBeInTheDocument();
  });
});

const renderDeprecatedConditionalRenderingInfo = () => {
  return render(
    <ServicesContextProvider {...queriesMock} client={createQueryClientMock()}>
      <AppContext.Provider value={{ ...appContextMock }}>
        <DeprecatedConditionalRenderingInfo />
      </AppContext.Provider>
    </ServicesContextProvider>,
  );
};
