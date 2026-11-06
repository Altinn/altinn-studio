import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { DataLookupFuncName } from '@studio/components';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { dataModelMetadataResponseMock } from '@altinn/ux-editor/testing/dataModelMock';
import type { FormItem } from '@altinn/ux-editor/types/FormItem';
import { BrokerFileTransferRecipients } from './BrokerFileTransferRecipients';

type Recipients = FormItem<ComponentType.BrokerFileTransfer>['recipients'];

const text = (key: string) => textMock(`ux_editor.component_properties.recipients.${key}`);
const sourceRadio = (source: 'field' | 'text') =>
  screen.getByRole('radio', { name: text(`source_${source}`) });
const fieldSelect = () => screen.getByRole('combobox', { name: text('field') });
const recipientsTextField = () =>
  screen.getByRole('textbox', { name: textMock('ux_editor.component_properties.recipients') });

describe('BrokerFileTransferRecipients', () => {
  it('reads the recipients from the data model field that is chosen', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferRecipients(undefined, handleComponentChange);

    expect(sourceRadio('field')).toBeChecked();
    await screen.findByRole('option', { name: 'field1' });
    await user.selectOptions(fieldSelect(), 'field1');

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: [DataLookupFuncName.DataModel, 'field1'] }),
    );
  });

  it('shows the data model field the recipients are read from', async () => {
    renderBrokerFileTransferRecipients([DataLookupFuncName.DataModel, 'field1']);

    await screen.findByRole('option', { name: 'field1' });
    expect(fieldSelect()).toHaveValue('field1');
  });

  it('saves fixed recipients as they are written', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferRecipients(undefined, handleComponentChange);

    await user.click(sourceRadio('text'));
    await user.type(recipientsTextField(), '991825827');

    expect(handleComponentChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ recipients: '991825827' }),
    );
  });

  it('clears what was entered for one source when the other is chosen', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferRecipients('991825827', handleComponentChange);

    expect(recipientsTextField()).toHaveValue('991825827');
    await user.click(sourceRadio('field'));

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ recipients: undefined }),
    );
  });

  it('keeps recipients written as another expression in the layout', () => {
    renderBrokerFileTransferRecipients(['concat', '991825827', ', 912345678']);

    expect(screen.getByText(text('expression_info'))).toBeInTheDocument();
    expect(screen.queryByRole('radio')).not.toBeInTheDocument();
  });
});

const renderBrokerFileTransferRecipients = (
  recipients?: Recipients,
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
    hasCustomRecipients: true,
    recipients,
  };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData(
    [QueryKey.LayoutSets, org, app],
    [{ id: layoutSet1NameMock, dataType: 'defaultModel' }],
  );
  renderWithProviders(
    <BrokerFileTransferRecipients
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
