import React from 'react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { RedirectToLayoutSet } from './RedirectToLayoutSet';
import { screen } from '@testing-library/react';
import { renderWithProviders } from '../../../../testing/mocks';
import userEvent from '@testing-library/user-event';
import { AppContext } from '../../../../AppContext';
import { appContextMock } from '../../../../testing/appContextMock';

const subformLayoutSetIdMock = 'subformLayoutSetId';
const setSelectedFormLayoutSetMock = jest.fn();

describe('RedirectToLayoutSet', () => {
  it('displays a redirect button to design layout set for the subform if set', () => {
    renderRedirectToLayoutSet();
    const redirectBoxTitle = screen.queryByText(
      textMock('ux_editor.component_properties.subform.go_to_layout_set'),
    );
    expect(redirectBoxTitle).toBeInTheDocument();
  });

  it('calls setSelectedFormLayoutSet when clicking the redirect button', async () => {
    const user = userEvent.setup();
    const subformLayoutSetId = 'subformLayoutSetId';
    renderRedirectToLayoutSet();
    const redirectButton = screen.queryByRole('button', {
      name: textMock('top_menu.create'),
    });
    await user.click(redirectButton);
    expect(setSelectedFormLayoutSetMock).toHaveBeenCalledTimes(1);
    expect(setSelectedFormLayoutSetMock).toHaveBeenCalledWith(subformLayoutSetId);
  });
});

const renderRedirectToLayoutSet = (selectedSubform: string = subformLayoutSetIdMock) => {
  return renderWithProviders(
    <AppContext.Provider
      value={{ ...appContextMock, setSelectedFormLayoutSetName: setSelectedFormLayoutSetMock }}
    >
      <RedirectToLayoutSet selectedSubform={selectedSubform} />
    </AppContext.Provider>,
  );
};
