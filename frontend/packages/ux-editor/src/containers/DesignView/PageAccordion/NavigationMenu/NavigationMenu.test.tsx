import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
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
import { layout1NameMock } from '../../../../testing/layoutMock';

const mockOrg = 'org';
const mockApp = 'app';
const mockPageName1: string = layout1NameMock;
const mockSelectedLayoutSet = 'test-layout-set';

const mockSetSearchParams = jest.fn();
const mockSearchParams = { layout: mockPageName1 };
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useParams: () => ({
    org: mockOrg,
    app: mockApp,
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
    await act(() => user.click(menuButtons[0]));

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
    await act(() => user.click(menuButtons[0]));

    const elementInMenuAfter = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfter).toBeInTheDocument();

    await act(() => user.click(menuButtons[0]));

    const elementInMenuAfterClose = screen.queryByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfterClose).not.toBeInTheDocument();
  });

  it('should close the menu when clicking outside the menu', async () => {
    const user = userEvent.setup();
    await render();

    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await act(() => user.click(menuButtons[0]));

    const elementInMenu = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenu).toBeInTheDocument();

    await act(() => user.click(document.body));

    const elementInMenuAfterClose = screen.queryByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfterClose).not.toBeInTheDocument();
  });

  it('hides the up and down button when page is receipt', async () => {
    const user = userEvent.setup();
    await render({ pageIsReceipt: true });
    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await act(() => user.click(menuButtons[0]));

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
    await act(() => user.click(menuButtons[0]));

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
    await act(() => user.click(menuButtons[0]));
    const menuItemDown = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_down'),
    });
    await act(() => user.click(menuItemDown));

    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(1);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      mockOrg,
      mockApp,
      mockSelectedLayoutSet,
      { pages: { order: ['Side2', 'Side1'] }, receiptLayoutName: 'Kvittering' },
    );
    expect(menuItemDown).not.toBeInTheDocument();

    await act(() => user.click(menuButtons[1]));
    const menuItemUp = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    await act(() => user.click(menuItemUp));
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledTimes(2);
    expect(queriesMock.saveFormLayoutSettings).toHaveBeenCalledWith(
      mockOrg,
      mockApp,
      mockSelectedLayoutSet,
      { pages: { order: ['Side1', 'Side2'] }, receiptLayoutName: 'Kvittering' },
    );
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const settingsResult = renderHookWithProviders(
    () => useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet),
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
