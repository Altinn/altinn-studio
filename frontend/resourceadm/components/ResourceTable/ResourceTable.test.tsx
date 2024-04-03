import React from 'react';
import { render, screen } from '@testing-library/react';
import type { ResourceTableProps } from './ResourceTable';
import { ResourceTable } from './ResourceTable';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { textMock } from '../../../testing/mocks/i18nMock';
import { act } from 'react-dom/test-utils';
import userEvent from '@testing-library/user-event';

const mockResourceListItem1: ResourceListItem = {
  title: { nb: 'tittel 1', en: '', nn: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-28',
  hasPolicy: true,
  identifier: 'resource-1',
};
const mockResourceListItem2: ResourceListItem = {
  title: { nb: 'tittel 2', en: '', nn: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-29',
  hasPolicy: false,
  identifier: 'resource-2',
};
const mockResourceListItem3: ResourceListItem = {
  title: { nb: '', en: '', nn: '' },
  createdBy: 'John Doe',
  lastChanged: '2023-08-30',
  hasPolicy: true,
  identifier: 'resource-3',
};
const mockResourceList: ResourceListItem[] = [
  mockResourceListItem1,
  mockResourceListItem2,
  mockResourceListItem3,
];

describe('ResourceTable', () => {
  const mockOnClickEditResource = jest.fn();

  const defaultProps: ResourceTableProps = {
    list: mockResourceList,
    onClickEditResource: mockOnClickEditResource,
  };

  it('toggles sort order when header is clicked', async () => {
    const user = userEvent.setup();
    render(<ResourceTable {...defaultProps} />);

    const listItemsBeforeSort = screen.getAllByRole('row').map((row) => row.textContent);
    const sortButton = screen.getByRole('columnheader', {
      name: textMock('resourceadm.dashboard_table_header_name'),
    });

    expect(sortButton).toBeInTheDocument();

    await act(() => user.click(sortButton)); // click twice; default sort is same as default order
    await act(() => user.click(sortButton));

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

    const lastChangedCell = screen.getByText(mockResourceListItem1.lastChanged);
    expect(lastChangedCell).toBeInTheDocument();
  });

  it('displays policy tag', () => {
    render(<ResourceTable {...defaultProps} />);

    const [policyTag] = screen.getAllByText(textMock('resourceadm.dashboard_table_row_has_policy'));
    expect(policyTag).toBeInTheDocument();
  });

  it('navigates to the clicked resource', async () => {
    const user = userEvent.setup();
    render(<ResourceTable {...defaultProps} />);

    const [editButton] = screen.getAllByText(textMock('resourceadm.dashboard_table_row_edit'));
    await act(() => user.click(editButton));

    expect(mockOnClickEditResource).toHaveBeenCalled();
  });
});
