import React from 'react';
import { render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper, Services } from '../../dashboardTestUtils';
import { starredRepo } from '../../data-mocks/starredRepo';
import { IRepoListProps, RepoList } from './RepoList';
import { IRepository } from 'app-shared/types/global';

const user = userEvent.setup();

type RenderWithMockServicesProps = Services;
const renderWithMockServices = (
  componentProps: IRepoListProps,
  services?: RenderWithMockServicesProps
) => {
  render(
    <MockServicesContextWrapper
      customServices={services}
    >
      <RepoList repos={[starredRepo] as unknown as IRepository[]} {...componentProps} />
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
    await user.click(sortBtn);

    expect(handleSortMock).toHaveBeenCalledTimes(0);
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
    await user.click(sortBtn);

    expect(handleSortMock).toHaveBeenCalledWith([{ field: 'name', sort: 'asc' }], {
      reason: undefined,
    });
  });
});
