import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataLookupFuncName } from '@designer/components';
import { textMock } from '@designer/testing/mocks/i18nMock';
import { app, org } from '@designer/testing/testids';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { dataModelMetadataResponseMock } from '@altinn/ux-editor/testing/dataModelMock';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { BrokerFileTransferMetadata } from './BrokerFileTransferMetadata';
import type { BrokerMetadata } from './metadataUtils';

const text = (key: string) => textMock(`ux_editor.component_properties.metadata.${key}`);
const keyField = () => screen.getByRole('textbox', { name: text('key') });
const saveButton = () => screen.getByRole('button', { name: text('save') });

describe('BrokerFileTransferMetadata', () => {
  it('lists each entry with where its value comes from', () => {
    renderBrokerFileTransferMetadata({
      caseNumber: [DataLookupFuncName.DataModel, 'field1'],
      category: 'invoice',
      combined: ['concat', 'a', 'b'],
    });

    expect(screen.getByRole('button', { name: 'caseNumber' })).toHaveTextContent(
      textMock('ux_editor.component_properties.metadata.field_summary', {
        field: 'field1',
        interpolation: { escapeValue: false },
      }),
    );
    expect(screen.getByRole('button', { name: 'category' })).toHaveTextContent(
      textMock('ux_editor.component_properties.metadata.text_summary', {
        text: 'invoice',
        interpolation: { escapeValue: false },
      }),
    );
    expect(screen.getByRole('button', { name: 'combined' })).toHaveTextContent(
      text('expression_summary'),
    );
  });

  it('adds an entry whose value is a data model field', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata(undefined, handleComponentChange);

    await user.click(screen.getByRole('button', { name: text('add') }));
    await user.type(keyField(), 'caseNumber');
    await screen.findByRole('option', { name: 'field1' });
    await user.selectOptions(screen.getByRole('combobox', { name: text('field') }), 'field1');
    await user.click(saveButton());

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { caseNumber: [DataLookupFuncName.DataModel, 'field1'] },
      }),
    );
  });

  it('adds an entry whose value is a fixed text', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata(undefined, handleComponentChange);

    await user.click(screen.getByRole('button', { name: text('add') }));
    await user.type(keyField(), 'category');
    await user.click(screen.getByRole('radio', { name: text('source_text') }));
    await user.type(screen.getByRole('textbox', { name: text('text') }), 'invoice');
    await user.click(saveButton());

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { category: 'invoice' } }),
    );
  });

  it('refuses a key another entry has', async () => {
    const user = userEvent.setup();
    renderBrokerFileTransferMetadata({ category: 'invoice' });

    await user.click(screen.getByRole('button', { name: text('add') }));
    await user.type(keyField(), 'category');

    expect(screen.getByText(text('key_taken'))).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('renames an entry and keeps its place', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata(
      { first: 'a', second: 'b', third: 'c' },
      handleComponentChange,
    );

    await user.click(screen.getByRole('button', { name: 'second' }));
    await user.clear(keyField());
    await user.type(keyField(), 'renamed');
    await user.click(saveButton());

    const { metadata } = handleComponentChange.mock.lastCall[0];
    expect(Object.entries(metadata)).toEqual([
      ['first', 'a'],
      ['renamed', 'b'],
      ['third', 'c'],
    ]);
  });

  it('keeps a value written as an expression in the layout', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata({ combined: ['concat', 'a', 'b'] }, handleComponentChange);

    await user.click(screen.getByRole('button', { name: 'combined' }));
    expect(screen.getByText(text('expression_info'))).toBeInTheDocument();
    await user.clear(keyField());
    await user.type(keyField(), 'joined');
    await user.click(saveButton());

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { joined: ['concat', 'a', 'b'] } }),
    );
  });

  it('deletes an entry', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata({ category: 'invoice' }, handleComponentChange);

    await user.click(screen.getByRole('button', { name: 'category' }));
    await user.click(screen.getByRole('button', { name: text('delete') }));

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: undefined }),
    );
  });

  it('keeps the other entries when one is deleted', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata(
      { category: 'invoice', priority: 'high' },
      handleComponentChange,
    );

    await user.click(screen.getByRole('button', { name: 'category' }));
    await user.click(screen.getByRole('button', { name: text('delete') }));

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ metadata: { priority: 'high' } }),
    );
  });

  it('drops a new entry that is deleted before it is saved', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata({ category: 'invoice' }, handleComponentChange);

    await user.click(screen.getByRole('button', { name: text('add') }));
    await user.click(screen.getByRole('button', { name: text('delete') }));

    expect(handleComponentChange).not.toHaveBeenCalled();
    expect(screen.getByRole('button', { name: text('add') })).toBeInTheDocument();
  });

  it('shows the data model field an entry reads from when the entry is opened', async () => {
    const user = userEvent.setup();
    renderBrokerFileTransferMetadata({ caseNumber: [DataLookupFuncName.DataModel, 'field1'] });

    await user.click(screen.getByRole('button', { name: 'caseNumber' }));

    await screen.findByRole('option', { name: 'field1' });
    expect(screen.getByRole('combobox', { name: text('field') })).toHaveValue('field1');
  });

  it('refuses a key longer than the 50 characters Broker allows', async () => {
    const user = userEvent.setup();
    renderBrokerFileTransferMetadata();

    await user.click(screen.getByRole('button', { name: text('add') }));
    await user.type(keyField(), 'a'.repeat(51));

    expect(screen.getByText(text('key_too_long'))).toBeInTheDocument();
    expect(saveButton()).toBeDisabled();
  });

  it('reads the value from a data model field again after fixed text was chosen', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMetadata(undefined, handleComponentChange);

    await user.click(screen.getByRole('button', { name: text('add') }));
    await user.type(keyField(), 'caseNumber');
    await user.click(screen.getByRole('radio', { name: text('source_text') }));
    await user.click(screen.getByRole('radio', { name: text('source_field') }));
    await screen.findByRole('option', { name: 'field1' });
    await user.selectOptions(screen.getByRole('combobox', { name: text('field') }), 'field1');
    await user.click(saveButton());

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({
        metadata: { caseNumber: [DataLookupFuncName.DataModel, 'field1'] },
      }),
    );
  });

  it('stops offering to add entries at the 10 Broker allows', () => {
    renderBrokerFileTransferMetadata(
      Object.fromEntries(Array.from({ length: 10 }, (_, index) => [`key${index}`, 'value'])),
    );

    expect(screen.queryByRole('button', { name: text('add') })).not.toBeInTheDocument();
  });
});

const renderBrokerFileTransferMetadata = (
  metadata?: BrokerMetadata,
  handleComponentChange: (component: FormItem) => void = vi.fn(),
) => {
  const component: FormItem<ComponentType.BrokerFileTransfer> = {
    id: 'broker-file-transfer',
    type: ComponentType.BrokerFileTransfer,
    dataModelBindings: {
      fileTransferId: { dataType: 'defaultModel', field: 'field1' },
      fileTransferStatus: { dataType: 'defaultModel', field: 'field2' },
    },
    resourceId: 'broker-resource',
    metadata,
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.LayoutSets, org, app],
    [{ id: layoutSet1NameMock, dataType: 'defaultModel' }],
  );
  renderWithProviders(
    <BrokerFileTransferMetadata
      component={component}
      handleComponentChange={handleComponentChange}
    />,
    {
      queryClient,
      queries: {
        getAppMetadataModelIds: vi.fn().mockResolvedValue(['defaultModel']),
        getDataModelMetadata: vi.fn().mockResolvedValue(dataModelMetadataResponseMock),
      },
    },
  );
};
