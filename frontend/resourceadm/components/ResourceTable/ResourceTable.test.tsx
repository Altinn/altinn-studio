import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceTableProps } from './ResourceTable';
import { ResourceTable } from './ResourceTable';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { textMock } from '../../../testing/mocks/i18nMock';
import userEvent from '@testing-library/user-event';

const mockResourceListItem1: ResourceListItem = {
  title: { nb: 'tittel 1', en: '', nn: '' },
  createdBy: 'John Doe',
  lastChanged: new Date('2023-08-28'),
  hasPolicy: true,
  identifier: 'resource-1',
  environments: ['gitea'],
};
const mockResourceListItem2: ResourceListItem = {
  title: { nb: 'tittel 2', en: '', nn: '' },
  createdBy: 'John Doe',
  lastChanged: new Date('2023-08-29'),
  hasPolicy: false,
  identifier: 'resource-2',
  environments: ['gitea'],
};
const mockResourceListItem3: ResourceListItem = {
  title: { nb: '', en: '', nn: '' },
  createdBy: 'John Doe',
  lastChanged: null,
  hasPolicy: true,
  identifier: 'resource-3',
  environments: ['at22'],
};
const mockResourceList: ResourceListItem[] = [
  mockResourceListItem1,
  mockResourceListItem2,
  mockResourceListItem3,
];

describe('ResourceTable', () => {
  const mockOnClickEditResource = jest.fn();
  const mockOnClickImportResource = jest.fn();

  const defaultProps: ResourceTableProps = {
    list: mockResourceList,
    onClickEditResource: mockOnClickEditResource,
    onClickImportResource: mockOnClickImportResource,
  };

  it('toggles sort order when header is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceTable {...defaultProps} />);

    const listItemsBeforeSort = screen.getAllByRole('row').map((row) => row.textContent);
    const sortButton = screen.getByRole('columnheader', {
      name: textMock('resourceadm.dashboard_table_header_name'),
    });

    expect(sortButton).toBeInTheDocument();

    await user.click(sortButton); // click twice; default sort is same as default order
    await user.click(sortButton);

    const listItemsAfterSort = screen.getAllByRole('row').map((row) => row.textContent);

    expect(listItemsAfterSort).not.toEqual(listItemsBeforeSort);
  });

  it('displays resource title', () => {
    render(<ResourceTable {...defaultProps} />);

    const titleCell = screen.getByText(mockResourceListItem1.title['nb']);
    expect(titleCell).toBeInTheDocument();
  });

  it('displays default resource title when title is missing', () => {
    render(<ResourceTable {...defaultProps} />);

    const titleCell = screen.getByText(textMock('resourceadm.dashboard_table_row_missing_title'));
    expect(titleCell).toBeInTheDocument();
  });

  it('displays created by', () => {
    render(<ResourceTable {...defaultProps} />);

    const [createdByCell] = screen.getAllByText(mockResourceListItem1.createdBy);
    expect(createdByCell).toBeInTheDocument();
  });

  it('displays last changed date', () => {
    render(<ResourceTable {...defaultProps} />);

    const lastChangedCell = screen.getByText('28.08.2023');
    expect(lastChangedCell).toBeInTheDocument();
  });

  it('displays environments for resource', () => {
    render(<ResourceTable {...defaultProps} />);

    const environmentsTag = screen.getByText('AT22');
    expect(environmentsTag).toBeInTheDocument();
  });

  it('navigates to the clicked resource', async () => {
    const user = userEvent.setup();
    render(<ResourceTable {...defaultProps} />);

    const [editButton] = screen.getAllByText(textMock('resourceadm.dashboard_table_row_edit'));
    await user.click(editButton);

    expect(mockOnClickEditResource).toHaveBeenCalled();
  });

  it('does not display any action if resource cannot be imported or navigated to', () => {
    render(
      <ResourceTable
        {...defaultProps}
        onClickImportResource={undefined}
        list={[mockResourceListItem3]}
      />,
    );

    const editButton = screen.queryByText(textMock('resourceadm.dashboard_table_row_edit'));
    const importButton = screen.queryByText(textMock('resourceadm.dashboard_table_row_import'));

    expect(editButton).not.toBeInTheDocument();
    expect(importButton).not.toBeInTheDocument();
  });

  it('triggers import when import button is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceTable {...defaultProps} />);

    const [importButton] = screen.getAllByText(textMock('resourceadm.dashboard_table_row_import'));
    await user.click(importButton);

    expect(mockOnClickImportResource).toHaveBeenCalled();
  });

  it('should show spinner when importing resource', () => {
    render(<ResourceTable {...defaultProps} importResourceId={mockResourceListItem3.identifier} />);

    const importSpinner = screen.getByText(textMock('resourceadm.dashboard_table_row_importing'));
    expect(importSpinner).toBeInTheDocument();
  });
});
