import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithMockStore } from '../../testing/mocks';
import { textMock } from '../../../../../testing/mocks/i18nMock';
import { OldDynamicsInfo } from './OldDynamicsInfo';
import type { AppContextProps } from '../../AppContext';
import { AppContext } from '../../AppContext';
import { appContextMock } from '../../testing/appContextMock';

describe('OldDynamicsInfo', () => {
  it('should render OldDynamicsInfo with all texts', async () => {
    await render();
    expect(screen.getByText(textMock('right_menu.dynamics_description'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.dynamics_edit'))).toBeInTheDocument();
    expect(screen.getByText(textMock('right_menu.dynamics_edit_comment'))).toBeInTheDocument();
  });

  it('should have layoutSetName as part of link to gitea when app has layout sets', async () => {
    await render();
    const editLink = screen.getByText(textMock('right_menu.dynamics_edit'));
    expect(editLink).toHaveAttribute(
      'href',
      expect.stringContaining(appContextMock.selectedLayoutSet),
    );
  });

  it('should have simple url to edit file in gitea when app does not have layout sets', async () => {
    await render({ selectedLayoutSet: null });
    const editLink = screen.getByText(textMock('right_menu.dynamics_edit'));
    expect(editLink).toHaveAttribute('href', expect.stringContaining('App/ui/RuleHandler.js'));
  });
});

const render = async (props: Partial<AppContextProps> = {}) => {
  return renderWithMockStore({})(
    <AppContext.Provider
      value={{
        ...appContextMock,
        ...props,
      }}
    >
      <OldDynamicsInfo />
    </AppContext.Provider>,
  );
};
