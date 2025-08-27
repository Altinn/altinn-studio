import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { SettingsNavigation } from './SettingsNavigation';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useTaskNavigationGroupQuery } from 'app-shared/hooks/queries/useTaskNavigationGroupQuery';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import { layoutSetsExtendedMock, layoutSet1NameMock } from '../../../testing/layoutSetsMock';

jest.mock('app-shared/hooks/queries/useTaskNavigationGroupQuery', () => ({
  useTaskNavigationGroupQuery: jest.fn(),
}));

const defaultData = [
  {
    taskId: 'Task_1',
    taskType: 'data',
  },
];

describe('SettingsNavigation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should render spinner while loading', async () => {
    (useTaskNavigationGroupQuery as jest.Mock).mockReturnValue({
      isPending: true,
    });

    renderSettingsNavigation();

    const spinner = screen.getByText(textMock('ux_editor.settings.navigation_tab_loading'));
    expect(spinner).toBeInTheDocument();
  });

  it('should render component with the tasks', async () => {
    (useTaskNavigationGroupQuery as jest.Mock).mockReturnValue({
      data: defaultData,
    });

    await renderSettingsNavigation();
    const dataTask = screen.getByText(
      `${textMock('ux_editor.task_table_type.data')}: ${layoutSet1NameMock}`,
    );
    expect(dataTask).toBeInTheDocument();
  });

  it('should display a info message if there are no navigation tasks', () => {
    (useTaskNavigationGroupQuery as jest.Mock).mockReturnValue({
      data: [],
    });

    renderSettingsNavigation();
    const warningMessage = screen.getByText(textMock('ux_editor.task_table_alert_title'));
    expect(warningMessage).toBeInTheDocument();
  });
});

const renderSettingsNavigation = async () => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], layoutSetsExtendedMock);

  return renderWithProviders(<SettingsNavigation />, { queryClient });
};
