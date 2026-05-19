import { screen } from '@testing-library/react';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import userEvent from '@testing-library/user-event';
import { GroupConfigPanel, type GroupConfigPanelProps } from './GroupConfigPanel';
import { renderWithProviders } from '../../../testing/mocks';
import { ItemType } from '../ItemType';
import type { SelectedItem } from '../../../AppContext';
import { groupsPagesModelMock } from '@altinn/ux-editor/testing/layoutMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { layoutSet1NameMock } from '../../../testing/layoutSetsMock';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { QueryClient } from '@tanstack/react-query';
import { GroupType } from 'app-shared/types/api/dto/PageModel';

describe('GroupConfigPanel', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should call mutation when clicking markAsCompleted toggle', async () => {
    const user = userEvent.setup();
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 0 };
    const changePageGroups = jest.fn();
    const getPages = jest.fn().mockResolvedValue(groupsPagesModelMock);
    renderGroupConfigPanel({ props: { selectedItem }, queries: { changePageGroups, getPages } });

    expect(markAsCompletedSwitch()).toBeInTheDocument();
    await user.click(markAsCompletedSwitch());
    expect(changePageGroups).toHaveBeenCalledTimes(1);
  });

  it('should call mutation when clicking expandedByDefault toggle', async () => {
    const user = userEvent.setup();
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 0 };
    const changePageGroups = jest.fn();
    const getPages = jest.fn().mockResolvedValue(groupsPagesModelMock);
    renderGroupConfigPanel({ props: { selectedItem }, queries: { changePageGroups, getPages } });

    expect(expandedByDefaultSwitch()).toBeInTheDocument();
    await user.click(expandedByDefaultSwitch());
    expect(changePageGroups).toHaveBeenCalledTimes(1);
  });

  it('should not throw an error and show a spinner if queries are pending', () => {
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 0 };
    const queryClientMock = createQueryClientMock();
    renderGroupConfigPanel({
      props: { selectedItem },
      queryClientMock,
      queries: { getPages: jest.fn().mockResolvedValue({ isPending: true }) },
    });

    expect(spinner()).toBeInTheDocument();
  });

  it('should call changePageGroups mutation when changing group type to info', async () => {
    const user = userEvent.setup();
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 0 };
    const changePageGroups = jest.fn();
    const getPages = jest.fn().mockResolvedValue(groupsPagesModelMock);

    renderGroupConfigPanel({ props: { selectedItem }, queries: { changePageGroups, getPages } });

    const infoTypeRadio = await screen.findByRole('radio', {
      name: textMock('ux_editor.page_group.select_info_type'),
    });
    await user.click(infoTypeRadio);

    const expectedGroupsModel = {
      ...groupsPagesModelMock,
      groups: groupsPagesModelMock.groups.map((group, index) =>
        index === 0 ? { ...group, type: GroupType.Info } : group,
      ),
    };

    expect(changePageGroups).toHaveBeenCalledTimes(1);
    expect(changePageGroups).toHaveBeenCalledWith(
      org,
      app,
      layoutSet1NameMock,
      expectedGroupsModel,
    );
  });

  it('should call changePageGroups mutation when changing group type to data', async () => {
    const user = userEvent.setup();
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 0 };
    const changePageGroups = jest.fn();
    const pagesWithInfoType = {
      ...groupsPagesModelMock,
      groups: groupsPagesModelMock.groups.map((group, index) =>
        index === 0 ? { ...group, type: GroupType.Info } : group,
      ),
    };
    const getPages = jest.fn().mockResolvedValue(pagesWithInfoType);

    renderGroupConfigPanel({
      props: { selectedItem },
      queries: { changePageGroups, getPages },
      initialPagesData: pagesWithInfoType,
    });

    const dataTypeRadio = await screen.findByRole('radio', {
      name: textMock('ux_editor.page_group.select_data_type'),
    });
    await user.click(dataTypeRadio);

    const expectedGroupsModel = {
      ...pagesWithInfoType,
      groups: pagesWithInfoType.groups.map((group, index) =>
        index === 0 ? { ...group, type: GroupType.Data } : group,
      ),
    };

    expect(changePageGroups).toHaveBeenCalledTimes(1);
    expect(changePageGroups).toHaveBeenCalledWith(
      org,
      app,
      layoutSet1NameMock,
      expectedGroupsModel,
    );
  });

  it('should render edit group name when group has multiple pages', () => {
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 0 };
    renderGroupConfigPanel({
      props: { selectedItem },
      queries: { getPages: jest.fn().mockResolvedValue(groupsPagesModelMock) },
    });
    expect(
      screen.getByRole('button', { name: textMock('ux_editor.page_group.name') }),
    ).toBeInTheDocument();
  });

  it('should not render edit group when group has a single page', () => {
    const selectedItem: SelectedItem = { type: ItemType.Group, id: 1 };
    renderGroupConfigPanel({
      props: { selectedItem },
      queries: { getPages: jest.fn().mockResolvedValue(groupsPagesModelMock) },
    });
    expect(
      screen.queryByRole('button', { name: textMock('ux_editor.page_group.name') }),
    ).not.toBeInTheDocument();
  });
});

const markAsCompletedSwitch = (): HTMLElement =>
  screen.getByRole('switch', {
    name: textMock('ux_editor.page_group.markAsCompleted_switch'),
  });

const expandedByDefaultSwitch = (): HTMLElement =>
  screen.getByRole('switch', {
    name: textMock('ux_editor.page_group.expandedByDefault_switch'),
  });

const spinner = (): HTMLElement => screen.getByRole('img', { name: textMock('general.loading') });

type renderGroupConfigPanelParams = {
  props: GroupConfigPanelProps;
  queries?: Partial<ServicesContextProps>;
  queryClientMock?: QueryClient;
  initialPagesData?: typeof groupsPagesModelMock;
};

const renderGroupConfigPanel = ({
  props,
  queries,
  queryClientMock,
  initialPagesData,
}: renderGroupConfigPanelParams) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.Pages, org, app, layoutSet1NameMock],
    initialPagesData ?? groupsPagesModelMock,
  );

  return renderWithProviders(<GroupConfigPanel {...props} />, {
    queryClient: queryClientMock || queryClient,
    queries,
  });
};
