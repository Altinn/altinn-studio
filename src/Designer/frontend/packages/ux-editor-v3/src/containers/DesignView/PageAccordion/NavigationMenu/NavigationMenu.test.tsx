import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import type { NavigationMenuProps } from './NavigationMenu';
import { NavigationMenu } from './NavigationMenu';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../../testing/mocks';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import { app, org } from '@studio/testing/testids';
import { layout1NameMock, layout2NameMock } from '@altinn/ux-editor-v3/testing/layoutMock';
import { layoutSet1NameMock } from '@altinn/ux-editor-v3/testing/layoutSetsMock';

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

  it('Calls updateFormLayoutName with new name when name is changed by the user', async () => {
    const user = userEvent.setup();
    await render();
    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);
    await user.click(screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_edit') }));

    const inputField = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(inputField).toHaveValue(mockPageName1);

    const newValue: string = `${mockPageName1}1`;

    await user.type(inputField, '1');

    const saveButton = screen.getByRole('button', {
      name: textMock('ux_editor.input_popover_save_button'),
    });
    await user.click(saveButton);

    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledWith(
      org,
      app,
      mockPageName1,
      newValue,
      mockSelectedLayoutSet,
    );
  });

  it('should close the menu when clicking cancel in the edit name popover', async () => {
    const user = userEvent.setup();
    await render();
    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);
    await user.click(screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_edit') }));

    const cancelButton = screen.getByRole('button', {
      name: textMock('general.cancel'),
    });
    await user.click(cancelButton);

    const inputFieldAfterClose = screen.queryByLabelText(textMock('ux_editor.input_popover_label'));
    expect(inputFieldAfterClose).not.toBeInTheDocument();
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
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(org, app, mockSelectedLayoutSet)).renderHookResult.result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<NavigationMenuProps> = {}) => {
  await waitForData();
  return renderWithMockStore()(
    <>
      <NavigationMenu {...defaultProps} {...props} />
      <NavigationMenu {...defaultProps} {...props} />
    </>,
  );
};
