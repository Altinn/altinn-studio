import React from 'react';
import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { starredRepoMock } from '../../data-mocks/starredRepoMock';
import { IRepoListProps, RepoList } from './RepoList';
import { IRepository } from 'app-shared/types/global';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';

const user = userEvent.setup();

const renderWithMockServices = (
  componentProps: IRepoListProps,
  services?: Partial<ServicesContextProps>
) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <RepoList repos={[starredRepoMock] as unknown as IRepository[]} {...componentProps} />
    </MockServicesContextWrapper>
  );
};

describe('RepoList', () => {

  test('should not call onSortModelChange when clicking sort button and isServerSort is false', async () => {
    const handleSortMock = jest.fn();
    renderWithMockServices({
      isLoading: false,
      isServerSort: false,
      rowCount: 5,
      onSortModelChange: handleSortMock,
    });
    // eslint-disable-next-line testing-library/no-node-access
    const sortBtn = document.querySelector('button[aria-label="Sort"]');
    await act(() => user.click(sortBtn));

    expect(handleSortMock).not.toHaveBeenCalled();
  });

  test('should call onSortModelChange when clicking sort button and isServerSort is true', async () => {
    const handleSortMock = jest.fn();
    renderWithMockServices({
      isLoading: false,
      isServerSort: true,
      rowCount: 5,
      onSortModelChange: handleSortMock,
    });

    // eslint-disable-next-line testing-library/no-node-access
    const sortBtn = document.querySelector('button[aria-label="Sort"]');
    await act(() => user.click(sortBtn));

    expect(handleSortMock).toHaveBeenCalledWith([{ field: 'name', sort: 'asc' }], {
      reason: undefined,
    });
  });
});
