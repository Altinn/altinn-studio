import React from 'react';
import { renderWithProviders } from '../../../testing/mocks';
import { SettingsNavigation } from './SettingsNavigation';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { useTaskNavigationGroupQuery } from 'app-shared/hooks/queries/useTaskNavigationGroupQuery';

jest.mock('app-shared/hooks/queries/useTaskNavigationGroupQuery', () => ({
  useTaskNavigationGroupQuery: jest.fn(),
}));

const defaultData = [
  {
    taskId: '1',
    taskType: 'data',
  },
  {
    taskId: '2',
    taskType: 'receipt',
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

    renderSettingsNavigation();

    const dataTask = screen.getByText(textMock('ux_editor.task_table_type.data'));
    expect(dataTask).toBeInTheDocument();
    const receiptTask = screen.getAllByText(textMock('ux_editor.task_table_type.receipt'))[0];
    expect(receiptTask).toBeInTheDocument();
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

const renderSettingsNavigation = () => {
  return renderWithProviders(<SettingsNavigation />);
};
