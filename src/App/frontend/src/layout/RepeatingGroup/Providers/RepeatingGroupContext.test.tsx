import React, { useState } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import {
  RepeatingGroupProvider,
  RepGroupContext,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ILayout } from 'src/layout/layout';

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
  const editingId = useRepeatingGroupSelector((state) => state.editingId);
  const [openedIndex, setOpenedIndex] = useState<number | undefined>();
  return (
    <>
      <output data-testid='editing'>{editingId ?? 'closed'}</output>
      <output data-testid='opened'>{openedIndex ?? 'none'}</output>
      <button onClick={() => open({ index: 1, uuid: 'locked-row' })}>Open locked row</button>
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

async function render(rows: { altinnRowId: string; name: string }[]) {
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
  });
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
