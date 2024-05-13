import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { NavigationMenuProps } from './NavigationMenu';
import { NavigationMenu } from './NavigationMenu';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import {
  formLayoutSettingsMock,
  renderHookWithProviders,
  renderWithProviders,
} from '../../../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import {
  layout1NameMock,
  layout2NameMock,
  layoutSet1NameMock,
} from '../../../../testing/layoutMock';
import { app, org } from '@studio/testing/testids';

const mockPageName1: string = layout1NameMock;
const mockSelectedLayoutSet = layoutSet1NameMock;

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: mockPageName1 };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org,
    app,
  }),
  useSearchParams: () => {
    return [new URLSearchParams(mockSearchParams), mockSetSearchParams];
  },
}));

const defaultProps: NavigationMenuProps = {
  pageName: mockPageName1,
  pageIsReceipt: false,
};

describe('NavigationMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should open the menu when clicking the menu icon', async () => {
    const user = userEvent.setup();
    await render();

    const elementInMenu = screen.queryByText(textMock('ux_editor.page_menu_up'));
    expect(elementInMenu).not.toBeInTheDocument();

    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);

    const elementInMenuAfter = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfter).toBeInTheDocument();
  });
  it('should close the menu when clicking the menu icon twice', async () => {
    const user = userEvent.setup();
    await render();

    const elementInMenu = screen.queryByText(textMock('ux_editor.page_menu_up'));
    expect(elementInMenu).not.toBeInTheDocument();

    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);

    const elementInMenuAfter = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfter).toBeInTheDocument();

    await user.click(menuButtons[0]);

    const elementInMenuAfterClose = screen.queryByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfterClose).not.toBeInTheDocument();
  });

  it('should close the menu when clicking outside the menu', async () => {
    const user = userEvent.setup();
    await render();

    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);

    const elementInMenu = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenu).toBeInTheDocument();

    await user.click(document.body);

    const elementInMenuAfterClose = screen.queryByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfterClose).not.toBeInTheDocument();
  });

  it('hides the up and down button when page is receipt', async () => {
    const user = userEvent.setup();
    await render({ pageIsReceipt: true });
    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);

    const upButton = screen.queryByRole('menuitem', { name: textMock('ux_editor.page_menu_up') });
    const downButton = screen.queryByRole('menuitem', {
      name: textMock('ux_editor.page_menu_down'),
    });

    expect(upButton).not.toBeInTheDocument();
    expect(downButton).not.toBeInTheDocument();
  });

  it('shows the up and down button by default', async () => {
    const user = userEvent.setup();
    await render();
    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);

    const upButton = screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_up') });
    const downButton = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_down'),
    });

    expect(upButton).toBeInTheDocument();
    expect(downButton).toBeInTheDocument();
  });

  it('should toggle the page order using up and down buttons', async () => {
    const user = userEvent.setup();
    await render();

    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);
    const menuItemDown = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_down'),
    });
    await user.click(menuItemDown);

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      mockSelectedLayoutSet,
      { pages: { order: [layout2NameMock, layout1NameMock] }, receiptLayoutName: 'Kvittering' },
    );
    expect(menuItemDown).not.toBeInTheDocument();

    await user.click(menuButtons[1]);
    const menuItemUp = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    await user.click(menuItemUp);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(2);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      org,
      app,
      mockSelectedLayoutSet,
      { pages: { order: [layout1NameMock, layout2NameMock] }, receiptLayoutName: 'Kvittering' },
    );
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(org, app, mockSelectedLayoutSet),
    { queries: { getFormLayoutSettings } },
  ).result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<NavigationMenuProps> = {}) => {
  await waitForData();
  return renderWithProviders(
    <>
      <NavigationMenu {...defaultProps} {...props} />
      <NavigationMenu {...defaultProps} {...props} />
    </>,
  );
};
