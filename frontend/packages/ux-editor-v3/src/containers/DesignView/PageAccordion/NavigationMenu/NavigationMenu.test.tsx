import React from 'react';
import { act, screen, waitFor } from '@testing-library/react';
import type { NavigationMenuProps } from './NavigationMenu';
import { NavigationMenu } from './NavigationMenu';
import userEvent from '@testing-library/user-event';
import { textMock } from '../../../../../../../testing/mocks/i18nMock';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import {
  formLayoutSettingsMock,
  renderHookWithMockStore,
  renderWithMockStore,
} from '../../../../testing/mocks';
import { formDesignerMock } from '../../../../testing/stateMocks';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';

const mockOrg = 'org';
const mockApp = 'app';
const mockPageName1: string = formDesignerMock.layout.selectedLayout;
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

    const menuButton = screen.getByRole('button', { name: textMock('general.options') });
    await act(() => user.click(menuButton));

    const elementInMenuAfter = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_up'),
    });
    expect(elementInMenuAfter).toBeInTheDocument();
  });

  it('Calls updateFormLayoutName with new name when name is changed by the user', async () => {
    const user = userEvent.setup();
    await render();

    await act(() => user.click(screen.getByTitle(textMock('general.options'))));
    await act(() =>
      user.click(screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_edit') })),
    );

    const inputField = screen.getByLabelText(textMock('ux_editor.input_popover_label'));
    expect(inputField).toHaveValue(mockPageName1);

    const newValue: string = `${mockPageName1}1`;

    await act(() => user.type(inputField, '1'));

    const saveButton = screen.getByRole('button', {
      name: textMock('ux_editor.input_popover_save_button'),
    });
    await act(() => user.click(saveButton));

    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledTimes(1);
    expect(queriesMock.updateFormLayoutName).toHaveBeenCalledWith(
      mockOrg,
      mockApp,
      mockPageName1,
      newValue,
      mockSelectedLayoutSet,
    );
  });

  it('hides the up and down button when page is receipt', async () => {
    const user = userEvent.setup();
    await render({ pageIsReceipt: true });

    await act(() => user.click(screen.getByTitle(textMock('general.options'))));

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

    await act(() => user.click(screen.getByTitle(textMock('general.options'))));

    const upButton = screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_up') });
    const downButton = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_down'),
    });

    expect(upButton).toBeInTheDocument();
    expect(downButton).toBeInTheDocument();
  });
});

const waitForData = async () => {
  const getFormLayoutSettings = jest
    .fn()
    .mockImplementation(() => Promise.resolve(formLayoutSettingsMock));
  const settingsResult = renderHookWithMockStore(
    {},
    { getFormLayoutSettings },
  )(() => useFormLayoutSettingsQuery(mockOrg, mockApp, mockSelectedLayoutSet)).renderHookResult
    .result;

  await waitFor(() => expect(settingsResult.current.isSuccess).toBe(true));
};

const render = async (props: Partial<NavigationMenuProps> = {}) => {
  await waitForData();
  return renderWithMockStore()(<NavigationMenu {...defaultProps} {...props} />);
};
