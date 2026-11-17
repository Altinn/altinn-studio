import React, { useState } from 'react';

import { screen, waitFor } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getAttachmentDataMock } from 'src/__mocks__/getAttachmentsMock';
import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceAtServiceTaskMock, getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import {
  RepeatingGroupProvider,
  RepGroupContext,
  useRepeatingGroupRowState,
  useRepeatingGroupSelector,
} from 'src/layout/RepeatingGroup/Providers/RepeatingGroupContext';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ILayout } from 'src/layout/layout';
import type { IData } from 'src/types/shared';

const layout: ILayout = [
  {
    id: 'group',
    type: 'RepeatingGroup',
    dataModelBindings: { group: { dataType: defaultDataTypeMock, field: 'rows' } },
    children: ['name', 'file'],
    hiddenRow: ['equals', ['dataModel', 'rows.name'], 'hidden'],
    edit: { editButton: ['notEquals', ['dataModel', 'rows.name'], 'locked'] },
  },
  {
    id: 'name',
    type: 'Input',
    dataModelBindings: { simpleBinding: { dataType: defaultDataTypeMock, field: 'rows.name' } },
  },
  {
    id: 'file',
    type: 'FileUpload',
    dataModelBindings: { list: { dataType: defaultDataTypeMock, field: 'rows.attachments' } },
    displayMode: 'simple',
    maxFileSizeInMB: 10,
    maxNumberOfAttachments: 10,
    minNumberOfAttachments: 0,
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

async function render(
  rows: { altinnRowId: string; name: string; attachments?: string[] }[],
  { onServiceTaskPage = false, attachments = [] }: { onServiceTaskPage?: boolean; attachments?: IData[] } = {},
) {
  const instance = onServiceTaskPage ? getInstanceAtServiceTaskMock() : getInstanceWithProcessMock();
  instance.data.push(...attachments);
  window.altinnAppGlobalData.applicationMetadata.dataTypes.push({
    id: 'file',
    allowedContentTypes: ['application/pdf'],
    maxCount: 10,
    minCount: 0,
  });

  return renderWithInstanceAndLayout({
    instanceId: instance.id,
    renderer: (
      <RepeatingGroupProvider baseComponentId='group'>
        <Navigation />
      </RepeatingGroupProvider>
    ),
    queries: {
      getInstance: async () => instance,
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

it('deletes a row and its attachments', async () => {
  const attachment = getAttachmentDataMock();
  const otherAttachment = getAttachmentDataMock();
  const { mutations } = await render(
    [
      { altinnRowId: 'first-row', name: 'first', attachments: [attachment.id] },
      { altinnRowId: 'second-row', name: 'second', attachments: [otherAttachment.id] },
    ],
    { attachments: [attachment, otherAttachment] },
  );
  await userEvent.click(screen.getByRole('button', { name: 'Delete first row' }));
  await waitFor(() =>
    expect(mutations.doAttachmentRemove.mock).toHaveBeenCalledWith(
      getInstanceWithProcessMock().id,
      attachment.id,
      'nb',
    ),
  );
  expect(screen.getByTestId('rows')).toHaveTextContent('2');
  mutations.doAttachmentRemove.resolve();
  await waitFor(() => expect(screen.getByTestId('rows')).toHaveTextContent('1'));
  expect(mutations.doAttachmentRemove.mock).toHaveBeenCalledTimes(1);
});

it("deletes neither a row nor its attachments on a service task's page", async () => {
  const attachment = getAttachmentDataMock();
  const { mutations } = await render(
    [
      { altinnRowId: 'first-row', name: 'first', attachments: [attachment.id] },
      { altinnRowId: 'second-row', name: 'second' },
    ],
    { onServiceTaskPage: true, attachments: [attachment] },
  );
  await userEvent.click(screen.getByRole('button', { name: 'Delete first row' }));
  expect(mutations.doAttachmentRemove.mock).not.toHaveBeenCalled();
  expect(screen.getByTestId('rows')).toHaveTextContent('2');
});
