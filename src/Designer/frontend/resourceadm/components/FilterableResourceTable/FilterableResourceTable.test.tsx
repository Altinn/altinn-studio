import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ResourceListItem } from 'app-shared/types/ResourceAdm';
import { FilterableResourceTable } from './FilterableResourceTable';
import type { FilterableResourceTableProps } from './FilterableResourceTable';

const createResource = (identifier: string, status?: string): ResourceListItem => ({
  title: { nb: `Title of ${identifier}`, nn: '', en: '' },
  createdBy: 'John Doe',
  lastChanged: new Date('2023-08-30'),
  identifier,
  environments: ['gitea'],
  status,
});

const completedResource = createResource('completed-resource', 'Completed');
const resourceWithoutStatus = createResource('resource-without-status');
const deprecatedResource = createResource('deprecated-resource', 'Deprecated');
const withdrawnResource = createResource('withdrawn-resource', 'Withdrawn');

const defaultProps: FilterableResourceTableProps = {
  list: [completedResource, resourceWithoutStatus, deprecatedResource, withdrawnResource],
  headingLevel: 2,
  onClickEditResource: vi.fn(),
};

describe('FilterableResourceTable', () => {
  it('hides inactive resources by default', () => {
    renderFilterableResourceTable();

    expect(getShowInactiveSwitch()).not.toBeChecked();
    expect(getNumResourcesHeading(2)).toBeInTheDocument();
    expect(getCell(completedResource.identifier)).toBeInTheDocument();
    expect(getCell(resourceWithoutStatus.identifier)).toBeInTheDocument();
    expect(queryCell(deprecatedResource.identifier)).not.toBeInTheDocument();
    expect(queryCell(withdrawnResource.identifier)).not.toBeInTheDocument();
  });

  it('shows inactive resources when the switch is turned on', async () => {
    const user = userEvent.setup();
    renderFilterableResourceTable();

    await user.click(getShowInactiveSwitch());

    expect(getShowInactiveSwitch()).toBeChecked();
    expect(getNumResourcesHeading(4)).toBeInTheDocument();
    expect(getCell(deprecatedResource.identifier)).toBeInTheDocument();
    expect(getCell(withdrawnResource.identifier)).toBeInTheDocument();
  });

  it('counts the resources matching both the search value and the switch', async () => {
    const user = userEvent.setup();
    renderFilterableResourceTable({ searchValue: 'deprecated' });

    expect(getNumResourcesHeading(0)).toBeInTheDocument();

    await user.click(getShowInactiveSwitch());

    expect(getNumResourcesHeading(1)).toBeInTheDocument();
    expect(getCell(deprecatedResource.identifier)).toBeInTheDocument();
  });

  it('renders the heading with the given level', () => {
    renderFilterableResourceTable({ headingLevel: 3 });

    expect(
      screen.getByRole('heading', {
        name: textMock('dashboard.resource_table_num_resources', { num: 2 }),
        level: 3,
      }),
    ).toBeInTheDocument();
  });
});

const getShowInactiveSwitch = (): HTMLElement =>
  screen.getByRole('switch', { name: textMock('dashboard.resource_table_show_inactive') });

const getNumResourcesHeading = (num: number): HTMLElement =>
  screen.getByRole('heading', {
    name: textMock('dashboard.resource_table_num_resources', { num }),
    level: 2,
  });

const getCell = (text: string): HTMLElement => screen.getByRole('cell', { name: text });

const queryCell = (text: string): HTMLElement | null => screen.queryByRole('cell', { name: text });

const renderFilterableResourceTable = (props: Partial<FilterableResourceTableProps> = {}) =>
  render(<FilterableResourceTable {...defaultProps} {...props} />);
