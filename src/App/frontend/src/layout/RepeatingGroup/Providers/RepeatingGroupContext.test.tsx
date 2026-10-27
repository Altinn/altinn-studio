import React, { useState } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import {
  RepeatingGroupProvider,
  RepGroupContext,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ILayout } from 'src/layout/layout';

const { deleteAttachments } = vi.hoisted(() => ({ deleteAttachments: vi.fn(async () => true) }));
vi.mock('src/features/attachments/useAttachmentDeletionInRepGroups', () => ({
  useAttachmentDeletionInRepGroups: () => deleteAttachments,
}));

const layout: ILayout = [
  {
    id: 'group',
    type: 'RepeatingGroup',
    dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'rows' } },
    children: ['name'],
    hiddenRow: ['equals', ['dataModel', 'rows.name'], 'hidden'],
    edit: { editButton: ['notEquals', ['dataModel', 'rows.name'], 'locked'] },
  },
  {
    id: 'name',
    type: 'Input',
    dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'rows.name' } },
  },
];

function Navigation() {
  const openNext = RepGroupContext.useOpenNextForEditing();
  const open = RepGroupContext.useOpenForEditing();
  const deleteRow = RepGroupContext.useDeleteRow();
  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const { numVisibleRows } = useRepeatingGroupRowState();
  const [openedIndex, setOpenedIndex] = useState<number | undefined>();
  return (
    <>
      <output data-testid='editing'>{editingId ?? 'closed'}</output>
      <output data-testid='opened'>{openedIndex ?? 'none'}</output>
      <output data-testid='rows'>{numVisibleRows}</output>
      <button onClick={() => open({ index: 1, uuid: 'locked-row' })}>Open locked row</button>
      <button onClick={() => deleteRow({ index: 0, uuid: 'first-row' })}>Delete first row</button>
      <button
        onClick={async () => {
          const row = await openNext();
          setOpenedIndex(row ? row.index : undefined);
        }}
      >
        Open next
      </button>
    </>
  );
}

async function render(rows: { altinnRowId: string; name: string }[], { transitioning = false } = {}) {
  await renderWithInstanceAndLayout({
    renderer: (
      <RepeatingGroupProvider baseComponentId='group'>
        <Navigation />
      </RepeatingGroupProvider>
    ),
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = { FormLayout: { data: { layout } } };
          obj.dataModels[defaultDataTypeMock].initialData = { rows };
        }),
    },
    apis: transitioning ? { instanceApi: { getInstance: getTransitioningInstance } } : undefined,
  });
}

async function getTransitioningInstance() {
  return getInstanceWithProcessMock((process) => (process.workflow = { status: 'processing' }));
}

it('skips hidden and non-editable rows and returns the opened row for focus', async () => {
  await render([
    { altinnRowId: 'hidden-row', name: 'hidden' },
    { altinnRowId: 'locked-row', name: 'locked' },
    { altinnRowId: 'editable-row', name: 'editable' },
  ]);
  await userEvent.click(screen.getByRole('button', { name: 'Open locked row' }));
  expect(screen.getByTestId('editing')).toHaveTextContent('closed');
  await userEvent.click(screen.getByRole('button', { name: 'Open next' }));
  await waitFor(() => expect(screen.getByTestId('editing')).toHaveTextContent('editable-row'));
  expect(screen.getByTestId('opened')).toHaveTextContent('2');
  await userEvent.click(screen.getByRole('button', { name: 'Open next' }));
  await waitFor(() => expect(screen.getByTestId('editing')).toHaveTextContent('closed'));
});

it('leaves an empty group closed when navigating to the next row', async () => {
  await render([]);
  await userEvent.click(screen.getByRole('button', { name: 'Open next' }));
  expect(screen.getByTestId('editing')).toHaveTextContent('closed');
  expect(screen.getByTestId('opened')).toHaveTextContent('none');
});

it('deletes a row and its attachments', async () => {
  await render([
    { altinnRowId: 'first-row', name: 'first' },
    { altinnRowId: 'second-row', name: 'second' },
  ]);
  await userEvent.click(screen.getByRole('button', { name: 'Delete first row' }));
  await waitFor(() => expect(screen.getByTestId('rows')).toHaveTextContent('1'));
  expect(deleteAttachments).toHaveBeenCalledWith(0);
});

it('deletes neither a row nor its attachments while the instance is transitioning', async () => {
  await render(
    [
      { altinnRowId: 'first-row', name: 'first' },
      { altinnRowId: 'second-row', name: 'second' },
    ],
    { transitioning: true },
  );
  await userEvent.click(screen.getByRole('button', { name: 'Delete first row' }));
  expect(deleteAttachments).not.toHaveBeenCalled();
  expect(screen.getByTestId('rows')).toHaveTextContent('2');
});
