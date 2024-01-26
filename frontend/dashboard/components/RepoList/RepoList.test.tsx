import React from 'react';
import { act, screen, render, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { searchRepositoryResponseMock } from '../../data-mocks/searchRepositoryResponseMock';
import type { IRepoListProps } from './RepoList';
import { RepoList } from './RepoList';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';
import { repository } from 'app-shared/mocks/mocks';
import { nbNO } from '@mui/x-data-grid/locales';

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
    ...componentProps,
  };
  render(
    <MockServicesContextWrapper customServices={services}>
      <RepoList {...allComponentProps} />
    </MockServicesContextWrapper>,
  );
};

const { localeText } = nbNO.components.MuiDataGrid.defaultProps;

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
      repos: [],
    });
    expect(await screen.findByText(textMock('dashboard.no_repos_result'))).toBeInTheDocument();
  });

  test('should not call onSortModelChange when clicking sort button and isServerSort is false', async () => {
    const handleSortMock = jest.fn();
    renderWithMockServices({
      isServerSort: false,
      onSortModelChange: handleSortMock,
    });
    // eslint-disable-next-line testing-library/no-node-access
    const sortBtn = document.querySelector(
      'button[aria-label="' + localeText.columnHeaderSortIconLabel + '"]',
    );
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
    const sortBtn = document.querySelector(
      'button[aria-label="' + localeText.columnHeaderSortIconLabel + '"]',
    );
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
      isServerSort: true,
    });
    const unstar = await screen.findByRole('menuitem', {
      name: textMock('dashboard.unstar', { appName: repository.name }),
    });
    const gridActionsCellItem = within(unstar).getByRole('img');
    expect(gridActionsCellItem).toBeInTheDocument();
  });

  test('should call onPageSizeChange when navigating to next / previous page', async () => {
    const onPageChange = jest.fn();
    renderWithMockServices({
      isServerSort: true,
      onPageChange,
    });

    const nextPageButton = screen.getByRole('button', {
      name: localeText.MuiTablePagination.getItemAriaLabel('next'),
    });
    expect(nextPageButton).toBeInTheDocument();
    await act(() => user.click(nextPageButton));

    expect(onPageChange).toHaveBeenCalledWith(1);

    const previousPageButton = screen.getByRole('button', {
      name: localeText.MuiTablePagination.getItemAriaLabel('previous'),
    });
    expect(previousPageButton).toBeInTheDocument();
    await act(() => user.click(previousPageButton));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  test('should call onPageSizeChange when selecting a new page size', async () => {
    const newPageSize = 10;

    const onPageSizeChange = jest.fn();
    renderWithMockServices({
      isServerSort: true,
      onPageSizeChange,
    });

    const pageSizeSelect = screen.getByRole('combobox', {
      name: localeText.MuiTablePagination.labelRowsPerPage.toString(),
    });
    await act(() => user.click(pageSizeSelect));

    const pageSizeOption = screen.getByRole('option', { name: newPageSize.toString() });
    await act(() => user.click(pageSizeOption));

    expect(onPageSizeChange).toHaveBeenCalledWith(newPageSize);
  });
});
