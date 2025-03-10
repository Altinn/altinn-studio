import React from 'react';
import { screen } from '@testing-library/react';
import { useLayoutSetsExtendedQuery } from 'app-shared/hooks/queries/useLayoutSetsExtendedQuery';
import { useStudioEnvironmentParams } from 'app-shared/hooks/useStudioEnvironmentParams';
import { TaskCardBar } from './TaskCardBar';
import { renderWithProviders } from 'dashboard/testing/mocks';
import type { UseQueryResult } from '@tanstack/react-query';

jest.mock('app-shared/hooks/queries/useLayoutSetsExtendedQuery');
jest.mock('app-shared/hooks/useStudioEnvironmentParams');
jest.mock('./TaskCard', () => ({
  TaskCard: ({ layoutSetModel }: { layoutSetModel: { id: string; name: string } }) => (
    <div data-testid={`task-card-${layoutSetModel.id}`}>{layoutSetModel.name}</div>
  ),
}));

jest.mock('@altinn/ux-editor/containers/AddNewTask', () => ({
  AddNewTask: () => <div data-testid='add-new-task'>Add New Task</div>,
}));

const mockUseStudioEnvironmentParams = useStudioEnvironmentParams as jest.MockedFunction<
  typeof useStudioEnvironmentParams
>;
const mockUseLayoutSetsExtendedQuery = useLayoutSetsExtendedQuery as jest.MockedFunction<
  typeof useLayoutSetsExtendedQuery
>;

describe('TaskCardBar', () => {
  const mockLayoutSetsModel = {
    sets: [
      { id: '1', name: 'Task 1', dataType: 'default', type: 'default' },
      { id: '2', name: 'Task 2', dataType: 'default', type: 'default' },
    ],
  };

  beforeEach(() => {
    mockUseStudioEnvironmentParams.mockReturnValue({ org: 'testOrg', app: 'testApp' });
    mockUseLayoutSetsExtendedQuery.mockReturnValue({
      data: mockLayoutSetsModel,
      isPending: false,
    } as UseQueryResult<typeof mockLayoutSetsModel, Error>);
  });

  it('should render TaskCard components for each layout set and an AddNewTask component', () => {
    renderWithProviders(<TaskCardBar />);
    expect(screen.getByTestId('task-card-1')).toBeInTheDocument();
    expect(screen.getByTestId('task-card-2')).toBeInTheDocument();
    expect(screen.getByTestId('add-new-task')).toBeInTheDocument();
  });
});
