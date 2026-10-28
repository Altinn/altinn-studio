import { describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderWithProviders } from '../../../../testing/mocks';
import { BrokerFileTransferMainConfig } from './BrokerFileTransferMainConfig';
import type { FormItem } from '../../../../types/FormItem';
import { ComponentType } from '@altinn/ux-editor/types/ComponentType';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';

const brokerFileTransferComponent: FormItem<ComponentType.BrokerFileTransfer> = {
  id: 'broker-file-transfer',
  type: ComponentType.BrokerFileTransfer,
  dataModelBindings: {
    fileTransferId: { dataType: 'model', field: 'property1' },
    fileTransferStatus: { dataType: 'model', field: 'property2' },
  },
  resourceId: 'broker-resource',
};

const recipientsSwitch = () =>
  screen.getByRole('switch', {
    name: textMock('ux_editor.component_properties.hasCustomRecipients'),
  });

describe('BrokerFileTransferMainConfig', () => {
  it('shows the resource ID, the recipients switch, the size limit and the virus scan switch', () => {
    renderBrokerFileTransferMainConfig(brokerFileTransferComponent);

    expect(
      screen.getByText(textMock('ux_editor.component_properties.resourceId')),
    ).toBeInTheDocument();
    expect(recipientsSwitch()).toBeInTheDocument();
    expect(
      screen.getByText(textMock('ux_editor.component_properties.maxFileTransferSizeInMB')),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('switch', {
        name: textMock('ux_editor.component_properties.disableVirusScan'),
      }),
    ).toBeInTheDocument();
  });

  it('keeps the allowed file types out of the main settings, as file upload does', () => {
    renderBrokerFileTransferMainConfig(brokerFileTransferComponent);

    expect(
      screen.queryByText(textMock('ux_editor.component_properties.hasCustomFileEndings')),
    ).not.toBeInTheDocument();
  });

  it('shows the recipients field only when recipients are specified', () => {
    renderBrokerFileTransferMainConfig(brokerFileTransferComponent);

    expect(
      screen.queryByText(textMock('ux_editor.component_properties.recipients')),
    ).not.toBeInTheDocument();
  });

  it('clears the recipients when specifying them is switched off', async () => {
    const user = userEvent.setup();
    const handleComponentChange = vi.fn();
    renderBrokerFileTransferMainConfig(
      { ...brokerFileTransferComponent, hasCustomRecipients: true, recipients: '991825827' },
      handleComponentChange,
    );

    expect(
      screen.getByText(textMock('ux_editor.component_properties.recipients')),
    ).toBeInTheDocument();
    await user.click(recipientsSwitch());

    expect(handleComponentChange).toHaveBeenCalledWith(
      expect.objectContaining({ hasCustomRecipients: false, recipients: undefined }),
    );
  });
});

const renderBrokerFileTransferMainConfig = (
  component: FormItem<ComponentType.BrokerFileTransfer>,
  handleComponentChange: (component: FormItem) => void = vi.fn(),
) => {
  renderWithProviders(
    <BrokerFileTransferMainConfig
      component={component}
      handleComponentChange={handleComponentChange}
    />,
    { queryClient: createQueryClientMock() },
  );
};
