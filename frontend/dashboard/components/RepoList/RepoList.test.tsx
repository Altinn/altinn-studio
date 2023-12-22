import React from 'react';
import { act, screen, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { IRepoListProps, RepoList } from './RepoList';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';
import { repository } from 'app-shared/mocks/mocks';

const user = userEvent.setup();

const renderWithMockServices = (
  componentProps: IRepoListProps,
  services?: Partial<ServicesContextProps>,
) => {
  render(
    <MockServicesContextWrapper customServices={services}>
      <RepoList {...componentProps} />
    </MockServicesContextWrapper>,
  );
};

describe('RepoList', () => {
  test('should display spinner while loading starred repositories', () => {
    renderWithMockServices({
      isLoading: true,
      rowCount: 5,
    });
    expect(screen.getByRole('progressbar')).toBeInTheDocument();
  });

  test('should display no repos when repos are empty', async () => {
    renderWithMockServices({
      isLoading: false,
      rowCount: 5,
    });
    expect(await screen.findByText(textMock('dashboard.no_repos_result'))).toBeInTheDocument();
  });

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

  test('Should render GridActionsCellItem', async () => {
    renderWithMockServices({
      repos: [
        {
          ...repository,
          hasStarred: true,
        },
      ],
      isLoading: false,
      isServerSort: true,
      rowCount: 5,
    });
    const unstar = await screen.findByRole('menuitem', { name: textMock('dashboard.unstar') });
    const gridActionsCellItem = within(unstar).getByRole('img');
    expect(gridActionsCellItem).toBeInTheDocument();
  });
});
