import React from 'react';
import { screen } from '@testing-library/react';
import { TaskCardBar } from './TaskCardBar';
import { renderWithProviders } from '../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

jest.mock('app-shared/utils/featureToggleUtils', () => ({
  shouldDisplayFeature: jest.fn(),
  FeatureFlag: {
    TaskNavigationSubform: 'taskNavigationSubform',
  },
}));

const mockLayoutSetsModel = {
  sets: [
    { id: '1', name: 'Task 1', dataType: 'default', type: 'default' },
    { id: '2', name: 'Task 2', dataType: 'default', type: 'default' },
  ],
};

describe('TaskCardBar', () => {
  const { shouldDisplayFeature } = require('app-shared/utils/featureToggleUtils');
  beforeEach(() => {
    shouldDisplayFeature.mockReturnValue(false);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should render TaskCard components for each layout set and an AddNewTask component', () => {
    renderTaskCardBar();

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/task_card_add_new_task/i)).toBeInTheDocument();
  });

  it('should render AddSubformCard when taskNavigationSubform is enabled', async () => {
    shouldDisplayFeature.mockReturnValue(true);
    renderTaskCardBar();
    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/task_card_add_new_task/i)).toBeInTheDocument();
    expect(screen.getByText(/task_card_add_new_subform/i)).toBeInTheDocument();
  });
});

const renderTaskCardBar = ({ queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], mockLayoutSetsModel);
  return renderWithProviders(<TaskCardBar />, { queryClient });
};
