import React from 'react';
import { screen } from '@testing-library/react';
import { TaskCardBar } from './TaskCardBar';
import { renderWithProviders } from '../../../testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';

const mockLayoutSetsModel = [
  { id: '1', name: 'Task 1', dataType: 'default', type: 'default' },
  { id: '2', name: 'Task 2', dataType: 'default', type: 'default' },
];

describe('TaskCardBar', () => {
  it('should render TaskCard components for each layout set and an AddNewTask component', () => {
    renderTaskCardBar();

    expect(screen.getByText('1')).toBeInTheDocument();
    expect(screen.getByText('2')).toBeInTheDocument();
    expect(screen.getByText(/task_card_add_new_task/i)).toBeInTheDocument();
  });

  it('should render AddSubformCard', () => {
    renderTaskCardBar();
    expect(screen.getByText(/task_card_add_new_subform/i)).toBeInTheDocument();
  });
});

const renderTaskCardBar = ({ queryClient = createQueryClientMock() } = {}) => {
  queryClient.setQueryData([QueryKey.LayoutSetsExtended, org, app], mockLayoutSetsModel);
  return renderWithProviders(<TaskCardBar />, { queryClient });
};
