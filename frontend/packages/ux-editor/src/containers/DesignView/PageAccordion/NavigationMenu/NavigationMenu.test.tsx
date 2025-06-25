import {
  layout1NameMock,
  layout2NameMock,
  pageGroupsMultiplePagesMock,
  pagesModelMock,
} from '../../../../testing/layoutMock';
import { layoutSet1NameMock } from '../../../../testing/layoutSetsMock';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { queriesMock } from 'app-shared/mocks/queriesMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import React from 'react';
import { renderWithProviders } from '../../../../testing/mocks';
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

  describe('when the pages are in page order configuration', () => {
    it('should toggle the page order using up and down buttons', async () => {
      const user = userEvent.setup();
      await render({});

      const menuButtons = contextMenuTriggerButton();
      await user.click(menuButtons);
      await user.click(movePageDownButton());

      expect(queriesMock.changePageOrder).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageOrder).toHaveBeenCalledWith(org, app, mockSelectedLayoutSet, {
        pages: [{ id: layout2NameMock }, { id: layout1NameMock }],
      });

      await user.click(menuButtons);
      await user.click(movePageUpButton());
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
      await user.click(contextMenuTriggerButton());
      await user.click(movePageDownButton());

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
    });

    it('should be able to move a page to new group', async () => {
      const user = userEvent.setup();
      await render({
        pagesModel: pageGroupsMultiplePagesMock,
      });
      await user.click(contextMenuTriggerButton());
      await user.click(movePageToNewGroupButton());

      expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
      expect(queriesMock.changePageGroups).toHaveBeenCalledWith(
        org,
        app,
        mockSelectedLayoutSet,
        expect.objectContaining({ groups: [expect.anything(), expect.anything()] }),
      );
    });
  });
});

const contextMenuTriggerButton = () => screen.getByRole('button', { name: '' });
const movePageDownButton = () =>
  screen.getByRole('button', { name: textMock('ux_editor.page_menu_down') });
const movePageUpButton = () =>
  screen.getByRole('button', { name: textMock('ux_editor.page_menu_up') });
const movePageToNewGroupButton = () =>
  screen.getByRole('button', { name: textMock('ux_editor.page_menu_new_group') });

type renderParams = {
  props?: Partial<NavigationMenuProps>;
  pagesModel?: PagesModel;
};

const render = async ({ props = {}, pagesModel = pagesModelMock }: renderParams) => {
  const queryClient = createQueryClientMock();
  queryClient.invalidateQueries = jest.fn();
  queryClient.setQueryData([QueryKey.Pages, org, app, mockSelectedLayoutSet], pagesModel);
  return renderWithProviders(<NavigationMenu {...defaultProps} {...props} />, { queryClient });
};
