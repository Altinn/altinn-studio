import React from 'react';
import { screen, within } from '@testing-library/react';
import type { PagesModel } from 'app-shared/types/api/dto/PagesModel';
import { renderWithProviders } from '../../testing/mocks';
import { PageGroupAccordion, type PageGroupAccordionProps } from './PageGroupAccordion';
import { layoutSet1NameMock } from '../../testing/layoutSetsMock';
import type { IFormLayouts } from '../../types/global';
import { layout1NameMock, layoutMock } from '../../testing/layoutMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { app, org, pageGroupAccordionHeader } from '@studio/testing/testids';
import { QueryKey } from 'app-shared/types/QueryKey';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import type { AppContextProps } from '../../AppContext';
import { ItemType } from '../../components/Properties/ItemType';
import { queriesMock } from 'app-shared/mocks/queriesMock';

const pagesMock: PagesModel = {
  groups: [
    {
      name: 'Group 1',
      order: [{ id: 'Side 1' }, { id: 'Side 2' }],
    },
    {
      order: [{ id: 'Side 3' }],
    },
  ],
};

const layoutSetName = layoutSet1NameMock;
const layouts: IFormLayouts = {
  [layout1NameMock]: layoutMock,
};

const singlePageGroupMock: PagesModel = {
  groups: [{ order: [{ id: 'Side1' }] }],
};

describe('PageGroupAccordion', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should disable move-up for first group, and move-down for last group', async () => {
    await renderPageGroupAccordion({});
    expect(moveGroupUpButton(0)).toBeDisabled();
    expect(moveGroupDownButton(0)).toBeEnabled();
    expect(moveGroupUpButton(1)).toBeEnabled();
    expect(moveGroupDownButton(1)).toBeDisabled();
  });

  it('should correctly call mutation on changePageGroupOrder when moving a group up', async () => {
    const user = userEvent.setup();
    const changePageGroups = jest.fn();
    await renderPageGroupAccordion({ queries: { changePageGroups } });
    await user.click(moveGroupUpButton(1));
    expect(changePageGroups).toHaveBeenCalledTimes(1);
    const expectedPagesMock = { ...pagesMock, groups: pagesMock.groups.toReversed() };
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetName, expectedPagesMock);
  });

  it('should correctly call mutation on changePageGroupOrder when moving a group up', async () => {
    const user = userEvent.setup();
    const changePageGroups = jest.fn();
    await renderPageGroupAccordion({ queries: { changePageGroups } });
    await user.click(moveGroupDownButton(0));
    expect(changePageGroups).toHaveBeenCalledTimes(1);
    const expectedPagesMock = { ...pagesMock, groups: pagesMock.groups.toReversed() };
    expect(changePageGroups).toHaveBeenCalledWith(org, app, layoutSetName, expectedPagesMock);
  });

  it('should display group name when group name is provided', async () => {
    await renderPageGroupAccordion({});
    const groupHeader = groupAccordionHeader(0);
    expect(groupHeader).toBeInTheDocument();
    const heading = within(groupHeader).getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Group 1');
  });

  it('should display page ID as fallback when group name is empty', async () => {
    await renderPageGroupAccordion({ props: { pages: singlePageGroupMock } });
    const groupHeader = groupAccordionHeader(0);
    expect(groupHeader).toBeInTheDocument();
    const heading = within(groupHeader).getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Side1');
  });

  it('should set selectedItem when group header is clicked', async () => {
    const user = userEvent.setup();
    const setSelectedItem = jest.fn();
    await renderPageGroupAccordion({
      appContextProps: { setSelectedItem },
    });

    const groupHeader = groupAccordionHeader(0);
    const heading = within(groupHeader).getByRole('heading', { level: 2 });
    await user.click(heading);
    expect(setSelectedItem).toHaveBeenCalledWith({ type: ItemType.Group, id: 0 });
  });

  it('should set selectedItem to null if group is selected and deleted', async () => {
    const user = userEvent.setup();
    const setSelectedItem = jest.fn();
    jest.spyOn(window, 'confirm').mockImplementation(jest.fn(() => true));
    await renderPageGroupAccordion({
      appContextProps: { selectedItem: { type: ItemType.Group, id: 0 }, setSelectedItem },
    });

    const deleteButton = screen.getByRole('button', {
      name: textMock('general.delete_item', { item: 'Group 1' }),
    });
    await user.click(deleteButton);
    expect(setSelectedItem).toHaveBeenCalledWith(null);
  });

  it('should display page ID when group has single page', async () => {
    await renderPageGroupAccordion({});
    const groupHeader = groupAccordionHeader(1);
    const heading = within(groupHeader).getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Side 3');
  });

  it('should display info message when group has just one page', async () => {
    await renderPageGroupAccordion({ props: { pages: singlePageGroupMock } });
    const infoMessage = screen.getByText(
      textMock('ux_editor.page_group.one_page_in_group_info_message'),
    );
    expect(infoMessage).toBeInTheDocument();
  });

  it('should display group name when group has multiple pages', async () => {
    await renderPageGroupAccordion({});
    const groupHeader = groupAccordionHeader(0);
    const heading = within(groupHeader).getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Group 1');
  });

  it('should call handleAddPageInsideGroup when add button is clicked', async () => {
    const user = userEvent.setup();
    await renderPageGroupAccordion({});
    const addButtons = screen.getAllByRole('button', {
      name: textMock('ux_editor.pages_add'),
    });
    await user.click(addButtons[0]);
    expect(queriesMock.changePageGroups).toHaveBeenCalledTimes(1);
  });
});

const groupAccordionHeader = (nth: number) => screen.getByTestId(pageGroupAccordionHeader(nth));
const moveGroupUpButton = (nth: number) =>
  within(groupAccordionHeader(nth)).getByRole('button', {
    name: textMock('ux_editor.page_menu_up'),
  });
const moveGroupDownButton = (nth: number) =>
  within(groupAccordionHeader(nth)).getByRole('button', {
    name: textMock('ux_editor.page_menu_down'),
  });

type renderParameters = {
  props?: Partial<PageGroupAccordionProps>;
  queries?: Partial<ServicesContextProps>;
  appContextProps?: Partial<AppContextProps>;
};

const renderPageGroupAccordion = async ({ props, queries, appContextProps }: renderParameters) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.Pages, org, app, layoutSetName], pagesMock);
  renderWithProviders(
    <PageGroupAccordion
      selectedFormLayoutName={layoutSet1NameMock}
      pages={pagesMock}
      layouts={layouts}
      onAccordionClick={jest.fn()}
      isAddPagePending={false}
      {...props}
    ></PageGroupAccordion>,
    { queryClient, queries, appContextProps },
  );
};
