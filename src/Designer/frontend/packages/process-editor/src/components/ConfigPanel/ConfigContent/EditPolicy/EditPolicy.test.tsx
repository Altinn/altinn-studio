import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { EditPolicy } from './EditPolicy';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { typedLocalStorage } from 'libs/studio-pure-functions/src';
import { LocalStorageKey } from 'app-shared/enums/LocalStorageKey';
import { RoutePaths } from 'app-development/enums/RoutePaths';
import { MemoryRouter } from 'react-router-dom';
import { app, org } from '@studio/testing/testids';
import { APP_DEVELOPMENT_BASENAME } from 'app-shared/constants';

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
}));

describe('EditPolicy', () => {
  it('should render', () => {
    renderEditPolicy(<EditPolicy />);
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_button'),
      ),
    ).toBeInTheDocument();
  });

  it('should render informative message', () => {
    renderEditPolicy(<EditPolicy />);
    expect(
      screen.getByText(textMock('process_editor.configuration_panel.edit_policy_alert_message')),
    ).toBeInTheDocument();
  });

  it('adds the correct href to the button', () => {
    renderEditPolicy(<EditPolicy />);
    const button = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_button'),
    });
    expect(button).toHaveAttribute(
      'href',
      '/editor/testOrg/testApp/app-settings?currentTab=policy',
    );

    typedLocalStorage.removeItem('featureFlags');
  });

  it('sets the correct local storage item when the button is clicked', async () => {
    // As real navigations are not supported in jsdom, we need this mock to prevent errors
    jest.spyOn(console, 'error').mockImplementation(() => {});

    renderEditPolicy(<EditPolicy />);
    const user = userEvent.setup();
    const button = screen.getByRole('link', {
      name: textMock('process_editor.configuration_panel.edit_policy_open_policy_editor_button'),
    });
    await user.click(button);
    expect(typedLocalStorage.getItem(LocalStorageKey.PreviousRouteBeforeSettings)).toEqual(
      RoutePaths.ProcessEditor,
    );

    typedLocalStorage.removeItem('featureFlags');
  });
});

const renderEditPolicy = (children: React.ReactNode) => {
  return render(
    <MemoryRouter initialEntries={[`${APP_DEVELOPMENT_BASENAME}/${org}/${app}/process-editor`]}>
      {children}
    </MemoryRouter>,
  );
};
