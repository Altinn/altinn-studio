import {
  layout1NameMock,
  layout2NameMock,
  pageGroupsMultiplePagesMock,
  pagesModelMock,
} from '../../../../testing/layoutMock';
import { layoutSet1NameMock } from '../../../../testing/layoutSetsMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import React from 'react';
import { useFormLayoutSettingsQuery } from '../../../../hooks/queries/useFormLayoutSettingsQuery';
import {
  formLayoutSettingsMock,
  renderHookWithProviders,
  renderWithProviders,
} from '../../../../testing/mocks';
import type { NavigationMenuProps } from './NavigationMenu';
import { NavigationMenu } from './NavigationMenu';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';

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
};

describe('NavigationMenu', () => {
  afterEach(jest.clearAllMocks);

  it('should open the menu when clicking the menu icon', async () => {
    const user = userEvent.setup();
    await render({});

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
    await render({});

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
    await render({});

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

  it('shows the up and down button by default', async () => {
    const user = userEvent.setup();
    await render({});
    const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
    await user.click(menuButtons[0]);

    const upButton = screen.getByRole('menuitem', { name: textMock('ux_editor.page_menu_up') });
    const downButton = screen.getByRole('menuitem', {
      name: textMock('ux_editor.page_menu_down'),
    });

    expect(upButton).toBeInTheDocument();
    expect(downButton).toBeInTheDocument();
  });

  describe('when the pages are in page order configuration', () => {
    it('should toggle the page order using up and down buttons', async () => {
      const user = userEvent.setup();
      await render({});

      const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
      await user.click(menuButtons[0]);
      const menuItemDown = screen.getByRole('menuitem', {
        name: textMock('ux_editor.page_menu_down'),
      });
      await user.click(menuItemDown);

      expect(queriesMock.changePageOrder).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageOrder).toHaveBeenCalledWith(org, app, mockSelectedLayoutSet, {
        pages: [{ id: layout2NameMock }, { id: layout1NameMock }],
      });
      expect(menuItemDown).not.toBeInTheDocument();

      await user.click(menuButtons[1]);
      const menuItemUp = screen.getByRole('menuitem', {
        name: textMock('ux_editor.page_menu_up'),
      });
      await user.click(menuItemUp);
      expect(queriesMock.changePageOrder).toHaveBeenCalledTimes(2);
      expect(queriesMock.changePageOrder).toHaveBeenCalledWith(org, app, mockSelectedLayoutSet, {
        pages: [{ id: layout1NameMock }, { id: layout2NameMock }],
      });
    });
  });

  describe('when the pages are in groups', () => {
    it('should be able to move page in group down', async () => {
      const user = userEvent.setup();
      await render({
        pagesModel: pageGroupsMultiplePagesMock,
      });
      const menuButtons = screen.getAllByRole('button', { name: textMock('general.options') });
      await user.click(menuButtons[0]);
      const menuItemDown = screen.getByRole('menuitem', {
        name: textMock('ux_editor.page_menu_down'),
      });
      await user.click(menuItemDown);

      const updatedPagesModel = {
        ...pageGroupsMultiplePagesMock,
      };
      updatedPagesModel.groups[0].order.reverse();
      expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
        org,
        app,
        mockSelectedLayoutSet,
        updatedPagesModel,
      );
      expect(menuItemDown).not.toBeInTheDocument();
    });
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

type renderParams = {
  props?: Partial<NavigationMenuProps>;
  pagesModel?: PagesModel;
};

const render = async ({ props = {}, pagesModel = pagesModelMock }: renderParams) => {
  const queryClient = createQueryClientMock();
  queryClient.invalidateQueries = jest.fn();
  queryClient.setQueryData([QueryKey.Pages, org, app, mockSelectedLayoutSet], pagesModel);
  await waitForData();
  return renderWithProviders(
    <>
      <NavigationMenu {...defaultProps} {...props} />
      <NavigationMenu {...defaultProps} {...props} />
    </>,
    { queryClient },
  );
};
