import React from 'react';
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
});

const markAsCompletedSwitch = (): HTMLElement =>
  screen.getByRole('switch', {
    name: textMock('ux_editor.page_group.markAsCompleted_switch'),
  });

const spinner = (): HTMLElement => screen.getByRole('img', { name: textMock('general.loading') });

type renderGroupConfigPanelParams = {
  props: GroupConfigPanelProps;
  queries?: Partial<ServicesContextProps>;
  queryClientMock?: QueryClient;
};

const renderGroupConfigPanel = ({
  props,
  queries,
  queryClientMock,
}: renderGroupConfigPanelParams) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.Pages, org, app, layoutSet1NameMock], groupsPagesModelMock);

  return renderWithProviders(<GroupConfigPanel {...props} />, {
    queryClient: queryClientMock || queryClient,
    queries,
  });
};
