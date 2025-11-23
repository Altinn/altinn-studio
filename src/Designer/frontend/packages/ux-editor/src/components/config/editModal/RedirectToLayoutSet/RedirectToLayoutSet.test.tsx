import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RedirectToLayoutSet } from './RedirectToLayoutSet';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import userEvent from '@testing-library/user-event';
import { AppContext } from '../../../../AppContext';
import { appContextMock } from '../../../../testing/appContextMock';

const subformLayoutSetIdMock = 'subformLayoutSetId';
const mockNavigate = jest.fn();

jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('RedirectToLayoutSet', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('displays a redirect button to design layout set for the subform if set', () => {
    renderRedirectToLayoutSet();
    const redirectBoxTitle = screen.queryByText(
      textMock('ux_editor.component_properties.subform.go_to_layout_set'),
    );
    expect(redirectBoxTitle).toBeInTheDocument();
  });

  it('calls navigate when clicking the redirect button', async () => {
    const user = userEvent.setup();
    renderRedirectToLayoutSet();
    const redirectButton = screen.queryByRole('button', {
      name: textMock('top_menu.create'),
    });
    await user.click(redirectButton);
    expect(mockNavigate).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith(
      '/testOrg/testApp/ui-editor/layoutSet/subformLayoutSetId',
    );
  });
});

const renderRedirectToLayoutSet = (selectedSubform: string = subformLayoutSetIdMock) => {
  return renderWithProviders(
    <AppContext.Provider value={{ ...appContextMock }}>
      <RedirectToLayoutSet selectedSubform={selectedSubform} />
    </AppContext.Provider>,
  );
};
