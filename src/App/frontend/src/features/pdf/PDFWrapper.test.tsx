import React from 'react';
import { Form } from 'react-router-dom';

import { jest } from '@jest/globals';
import { screen, waitFor } from '@testing-library/react';

import { getIncomingApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock, getServiceOwnerPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { FormProvider } from 'src/features/form/FormContext';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PDFWrapper } from 'src/features/pdf/PDFWrapper';
import { fetchApplicationMetadata, fetchInstanceData, fetchProcessState } from 'src/queries/queries';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { ProcessTaskType } from 'src/types';
import type { AppQueries } from 'src/queries/types';

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleInstanceId = `512345/${exampleGuid}`;

enum RenderAs {
  User,
  ServiceOwner,
}

const render = async (renderAs: RenderAs, queriesOverride?: Partial<AppQueries>) => {
  jest.mocked(fetchApplicationMetadata).mockImplementationOnce(async () =>
    getIncomingApplicationMetadataMock((m) => {
      m.org = 'brg';
      m.partyTypesAllowed.person = true;
      m.partyTypesAllowed.organisation = true;
    }),
  );
  jest.mocked(fetchProcessState).mockImplementation(async () =>
    getProcessDataMock((p) => {
      p.processTasks = [p.currentTask!];
    }),
  );
  jest.mocked(fetchInstanceData).mockImplementation(async () => {
    const instanceOwnerParty = renderAs === RenderAs.User ? getPartyMock() : getServiceOwnerPartyMock();
    return getInstanceDataMock(
      undefined,
      instanceOwnerParty.partyId,
      undefined,
      instanceOwnerParty.orgNumber,
      instanceOwnerParty,
    );
  });

  return await renderWithoutInstanceAndLayout({
    renderer: () => (
      <InstanceProvider>
        <FormProvider>
          <PDFWrapper>
            <PresentationComponent type={ProcessTaskType.Data}>
              <Form />
            </PresentationComponent>
          </PDFWrapper>
        </FormProvider>
      </InstanceProvider>
    ),
    router: ({ children }) => (
      <InstanceRouter
        instanceId={exampleInstanceId}
        taskId='Task_1'
        initialPage=''
        query='pdf=1'
      >
        {children}
      </InstanceRouter>
    ),
    queries: {
      fetchLayouts: async () => ({}),
      ...queriesOverride,
    },
  });
};

describe('PDFWrapper', () => {
  it('should render PDF with correct sender for user', async () => {
    const result = await render(RenderAs.User);

    await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

    expect(screen.queryByText('Avsender:')).not.toBeNull();
    expect(screen.queryByText('01017512345-Ola Privatperson')).not.toBeNull();
  });

  it('should render PDF with correct sender for service owner', async () => {
    const result = await render(RenderAs.ServiceOwner);

    await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

    expect(screen.queryByText('Avsender:')).not.toBeNull();
    expect(screen.queryByText('01017512345-Ola Privatperson')).toBeNull();
    expect(screen.queryByText('974760673-Brønnøysundregistrene')).not.toBeNull();
  });
});
