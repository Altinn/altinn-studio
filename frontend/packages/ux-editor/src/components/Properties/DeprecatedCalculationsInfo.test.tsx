import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { appContextMock } from '@altinn/ux-editor/testing/appContextMock';
import { AppContext } from '@altinn/ux-editor/AppContext';
import { DeprecatedCalculationsInfo } from '@altinn/ux-editor/components/Properties/DeprecatedCalculationsInfo';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';

interface WindowWithRuleModel extends Window {
  ruleHandlerObject?: object;
}

declare let window: WindowWithRuleModel;

describe('DeprecatedCalculationsInfo', () => {
  afterEach(() => {
    delete window.ruleHandlerObject;
  });

  it('should render alert saying that calculations is deprecated with a documentation link ', () => {
    renderDeprecatedCalculationsInfo();
    const alert = screen.getByText(textMock('right_menu.rules_calculations_deprecated_info'));
    const linkToDocs = screen.getByRole('link', { name: textMock('right_menu.dynamics_link') });
    expect(alert).toBeInTheDocument();
    expect(linkToDocs).toBeInTheDocument();
  });

  it('should render link to edit ruleHandler directly in Gitea', () => {
    window.ruleHandlerObject = {};
    renderDeprecatedCalculationsInfo();
    const linkToEdit = screen.getByRole('link', {
      name: textMock('right_menu.rules_calculations_edit_in_gitea'),
    });
    expect(linkToEdit).toBeInTheDocument();
  });
});

const renderDeprecatedCalculationsInfo = () => {
  return renderWithProviders(
    <AppContext.Provider value={{ ...appContextMock }}>
      <DeprecatedCalculationsInfo />
    </AppContext.Provider>,
  );
};
