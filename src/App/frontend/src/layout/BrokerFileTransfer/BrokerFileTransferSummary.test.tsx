import React from 'react';

import { screen } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { defaultDataTypeMock } from 'src/__mocks__/getUiConfigMock';
import { GenericComponent } from 'src/layout/GenericComponent';
import { SummaryComponent2 } from 'src/layout/Summary2/SummaryComponent2/SummaryComponent2';
import { renderWithInstanceAndLayout } from 'src/test/renderWithProviders';
import type { ILayoutCollection } from 'src/layout/layout';

const binding = (field: string) => ({ dataType: defaultDataTypeMock, field });

const layoutsFor = (componentId: string): ILayoutCollection => ({
  FormLayout: {
    data: {
      layout: [
        {
          id: componentId,
          type: 'BrokerFileTransfer',
          resourceId: 'broker-resource',
          dataModelBindings: {
            fileTransferId: binding('broker.id'),
            fileTransferStatus: binding('broker.status'),
            fileName: binding('broker.name'),
          },
          textResourceBindings: { title: 'Last opp rapporten' },
        },
        { id: 'mySummary2', type: 'Summary2', target: { type: 'component', id: componentId } },
      ],
    },
  },
});

describe('BrokerFileTransferSummary', () => {
  const { featureToggles } = window;

  beforeEach(() => {
    window.featureToggles = { ...featureToggles, brokerFileTransferEnabled: true };
  });

  afterEach(() => {
    window.featureToggles = featureToggles;
  });

  it('shows a sent file the way the component does, with nothing left to change', async () => {
    await renderSummary({ id: 'transfer-1', status: 'Published', name: 'rapport.pdf' });

    expect(await screen.findByText('rapport.pdf')).toBeInTheDocument();
    expect(screen.getByText('Sendt')).toBeInTheDocument();
    expect(screen.getByText('Formidlings-ID: transfer-1')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /Endre/ })).not.toBeInTheDocument();
  });

  it('says when a transfer has started but the file is not fully sent', async () => {
    await renderSummary({ id: 'transfer-1', status: 'Initialized', name: 'rapport.pdf' });

    expect(await screen.findByText('Ikke ferdig sendt')).toBeInTheDocument();
    expect(screen.getByText('Formidlings-ID: transfer-1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Endre/ })).toBeInTheDocument();
  });

  it('says so when nothing has been sent', async () => {
    await renderSummary({});

    expect(await screen.findByText('Du har ikke lagt inn informasjon her')).toBeInTheDocument();
  });

  it('shows a chosen file as not sent, as soon as it is chosen', async () => {
    window.altinnAppGlobalData.platformFrontendSettings.brokerApiBaseUrl = undefined;
    await renderSummary({}, 'broker-with-chosen-file');

    await userEvent.upload(
      await screen.findByLabelText(/Last opp rapporten/, { selector: 'input' }),
      new File(['content'], 'rapport.pdf'),
    );

    expect(await screen.findByText('Ikke sendt')).toBeInTheDocument();
    expect(screen.getAllByText('rapport.pdf')).toHaveLength(2);
    expect(screen.getByRole('button', { name: /Endre/ })).toBeInTheDocument();
  });
});

// The component itself is rendered too when it is given, as on a page with both
async function renderSummary(formData: Record<string, string>, componentId?: string) {
  return await renderWithInstanceAndLayout({
    renderer: (
      <>
        {componentId && <GenericComponent baseComponentId={componentId} />}
        <SummaryComponent2 baseComponentId='mySummary2' />
      </>
    ),
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((bootstrap) => {
          bootstrap.layouts = layoutsFor(componentId ?? 'broker');
          bootstrap.dataModels[defaultDataTypeMock].initialData = { broker: formData };
        }),
    },
  });
}
