import React from 'react';
import { screen, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MockServicesContextWrapper } from '../../dashboardTestUtils';
import { searchRepositoryResponseMock } from '../../data-mocks/searchRepositoryResponseMock';
import type { RepoListProps } from './RepoList';
import { RepoList } from './RepoList';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { textMock } from '../../../testing/mocks/i18nMock';

const renderWithMockServices = (
  componentProps: Partial<RepoListProps>,
  services?: Partial<ServicesContextProps>,
) => {
  const repos = searchRepositoryResponseMock.data;
  const allComponentProps = {
    repos: repos,
    isLoading: false,
    isServerSort: false,
    totalRows: repos.length,
    pageNumber: 1,
    onPageChange: jest.fn(),
    onPageSizeChange: jest.fn(),
    onSortClick: jest.fn(),
    ...componentProps,
  };
  render(
    <MockServicesContextWrapper customServices={services}>
      <RepoList {...allComponentProps} />
    </MockServicesContextWrapper>,
  );
};

describe('RepoList', () => {
  it('should display spinner while loading repositories', () => {
    renderWithMockServices({
      repos: [],
      totalRows: 0,
      isLoading: true,
    });

    expect(screen.getByText(textMock('general.loading'))).toBeInTheDocument();
  });

  it('should display no repos message when repos are empty', () => {
    renderWithMockServices({
      repos: [],
      totalRows: 5,
      isLoading: false,
    });

    expect(screen.getByText(textMock('dashboard.no_repos_result'))).toBeInTheDocument();
  });

  it('should not call handleSorting when clicking sort button and isServerSort is false', async () => {
    const user = userEvent.setup();
    const handleSorting = jest.fn();
    renderWithMockServices({
      isServerSort: false,
      onSortClick: handleSorting,
    });

    await user.click(screen.getByRole('button', { name: textMock('dashboard.name') }));

    expect(handleSorting).not.toHaveBeenCalled();
  });

  it('should call handleSorting when clicking sort button and isServerSort is true', async () => {
    const user = userEvent.setup();
    const handleSorting = jest.fn();
    renderWithMockServices({
      isServerSort: true,
      onSortClick: handleSorting,
    });

    await user.click(screen.getByRole('button', { name: textMock('dashboard.name') }));

    expect(handleSorting).toHaveBeenCalledWith('name');
  });

  it('should call onPageChange when navigating to next page', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    renderWithMockServices({
      pageNumber: 0,
      isServerSort: true,
      onPageChange,
    });

    await user.click(screen.getByRole('button', { name: textMock('general.next') }));

    expect(onPageChange).toHaveBeenCalledWith(1);
  });

  it('should call onPageChange when navigating to previous page', async () => {
    const user = userEvent.setup();
    const onPageChange = jest.fn();
    renderWithMockServices({
      pageNumber: 1,
      isServerSort: true,
      onPageChange,
    });

    await user.click(screen.getByRole('button', { name: textMock('general.previous') }));

    expect(onPageChange).toHaveBeenCalledWith(0);
  });

  it('should call onPageSizeChange when selecting a new page size', async () => {
    const user = userEvent.setup();
    const pageSizeOption = '10';
    const onPageSizeChange = jest.fn();
    renderWithMockServices({
      isServerSort: true,
      onPageSizeChange,
    });

    const select = screen.getByRole('combobox', { name: textMock('dashboard.rows_per_page') });
    await user.selectOptions(select, pageSizeOption);

    expect(onPageSizeChange).toHaveBeenCalledWith(Number(pageSizeOption));
  });
});
