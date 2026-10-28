import React from 'react';

import { screen } from '@testing-library/react';
import { vi } from 'vitest';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { GenericComponent } from 'src/layout/GenericComponent';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { CompExternal } from 'src/layout/layout';

const binding = (field: string) => ({ dataType: defaultDataTypeMock, field });

describe('BrokerFileTransferLayoutValidator', () => {
  const { featureToggles } = window;

  beforeEach(() => {
    window.featureToggles = { ...featureToggles, brokerFileTransferEnabled: true };
    window.forceLayoutPropertiesValidation = 'on';
    vi.spyOn(window, 'logErrorOnce').mockImplementation(() => {});
  });

  afterEach(() => {
    window.featureToggles = featureToggles;
    window.forceLayoutPropertiesValidation = 'off';
  });

  it('reports configuration mistakes before the component is shown', async () => {
    await render({
      hasCustomRecipients: true,
      recipients: '991825827, 12345',
      metadata: Object.fromEntries(Array.from({ length: 11 }, (_, index) => [`name${index}`, 'value'])),
    });

    expect(
      await screen.findByText('Disse mottakerne i recipients er ikke organisasjonsnummer: 12345'),
    ).toBeInTheDocument();
    expect(screen.getByText('metadata kan ha høyst 10 oppføringer, men har 11.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Send filen' })).not.toBeInTheDocument();
    expect(window.logErrorOnce).toHaveBeenCalledWith(
      "Validation error for 'broker': metadata kan ha høyst 10 oppføringer, men har 11.",
    );
  });

  it('says the feature flag must be enabled', async () => {
    window.featureToggles = { ...featureToggles, brokerFileTransferEnabled: false };
    await render();

    expect(
      await screen.findByText(/You need to enable the feature flag brokerFileTransferEnabled/),
    ).toBeInTheDocument();
  });
});

async function render(component: Partial<CompExternal<'BrokerFileTransfer'>> = {}) {
  return renderWithInstanceAndLayout({
    renderer: <GenericComponent baseComponentId='broker' />,
    queries: {
      fetchLayoutSchema: async () => null,
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.dataModels[defaultDataTypeMock].schema.properties = {
            broker: {
              type: 'object',
              properties: { id: { type: 'string' }, status: { type: 'string' } },
            },
          };
          bootstrap.layouts = {
            FormLayout: {
              data: {
                layout: [
                  {
                    id: 'broker',
                    type: 'BrokerFileTransfer',
                    resourceId: 'broker-resource',
                    dataModelBindings: {
                      fileTransferId: binding('broker.id'),
                      fileTransferStatus: binding('broker.status'),
                    },
                    textResourceBindings: { title: 'Last opp rapporten' },
                    ...component,
                  },
                ],
              },
            },
          };
        }),
    },
  });
}
