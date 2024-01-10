import React from 'react';
import { act, screen, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { searchRepositoryResponseMock } from '../../data-mocks/searchRepositoryResponseMock';
import { IRepoListProps, RepoList } from './RepoList';
import { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';
import { DATAGRID_PAGE_SIZE_OPTIONS } from 'dashboard/constants';

const user = userEvent.setup();

const renderWithMockServices = (
  componentProps: Partial<IRepoListProps>,
  services?: Partial<ServicesContextProps>,
) => {
  const repos = searchRepositoryResponseMock.data;
  const allComponentProps = {
    repos,
    rowCount: repos.length,
    isLoading: false,
    isServerSort: false,
    onSortModelChange: jest.fn(),
    pageSizeOptions: DATAGRID_PAGE_SIZE_OPTIONS,
    ...componentProps,
  };
  render(
    <MockServicesContextWrapper customServices={services}>
      <RepoList {...allComponentProps} />
    </MockServicesContextWrapper>,
  );
};

describe('RepoList', () => {
  test('should not call onSortModelChange when clicking sort button and isServerSort is false', async () => {
    const handleSortMock = jest.fn();
    renderWithMockServices({
      isServerSort: false,
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
      isServerSort: true,
      onSortModelChange: handleSortMock,
    });

    // eslint-disable-next-line testing-library/no-node-access
    const sortBtn = document.querySelector('button[aria-label="Sort"]');
    await act(() => user.click(sortBtn));

    expect(handleSortMock).toHaveBeenCalledWith([{ field: 'name', sort: 'asc' }], {
      reason: undefined,
    });
  });

  test('Should render GridActionsCellItem', () => {
    renderWithMockServices({
      isServerSort: true,
    });
    const gridActionsCellItem = within(
      screen.getByRole('menuitem', { name: textMock('dashboard.unstar') }),
    ).getByRole('img');
    expect(gridActionsCellItem).toBeInTheDocument();
  });

  test('should call onPageChange when opening a new page', async () => {
    const newPage = 1;

    const onPageChange = jest.fn();
    renderWithMockServices({
      isServerSort: true,
      onPageChange,
    });

    const nextPageButton = screen.getByRole('button', {
      name: 'Go to next page',
    });
    expect(nextPageButton).toBeInTheDocument();
    await act(() => user.click(nextPageButton));

    expect(onPageChange).toHaveBeenCalledWith(newPage);
  });

  test('should call onPageSizeChange when selecting a new page size', async () => {
    const newPageSize = 10;

    const onPageSizeChange = jest.fn();
    renderWithMockServices({
      isServerSort: true,
      onPageSizeChange,
    });

    const pageSizeSelect = screen.getByRole('combobox', {
      name: textMock('dashboard.rows_per_page'),
    });
    await act(() => user.click(pageSizeSelect));

    const pageSizeOption = screen.getByRole('option', { name: newPageSize.toString() });
    await act(() => user.click(pageSizeOption));

    expect(onPageSizeChange).toHaveBeenCalledWith(newPageSize);
  });
});
