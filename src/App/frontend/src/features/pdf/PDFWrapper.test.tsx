import React from 'react';
import { Form } from 'react-router';

import { screen, waitFor } from '@testing-library/react';

import { getApplicationMetadataMock } from 'src/__mocks__/getApplicationMetadataMock';
import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getPartyMock, getServiceOwnerPartyMock } from 'src/__mocks__/getPartyMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { defaultDataTypeMock, getLayoutSettingsMock } from 'src/__mocks__/getUiConfigMock';
import { PresentationComponent } from 'src/components/presentation/Presentation';
import { FormProvider } from 'src/features/form/FormProvider';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { PdfWrapper, rendersAutomaticPdf } from 'src/features/pdf/PdfWrapper';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { ProcessTaskType } from 'src/types';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { FormBootstrapResponse } from 'src/features/formBootstrap/types';
import type { IProcess } from 'src/types/shared';

const exampleGuid = '75154373-aed4-41f7-95b4-e5b5115c2edc';
const exampleInstanceId = `512345/${exampleGuid}`;

enum RenderAs {
  User,
  ServiceOwner,
}

interface RenderOptions {
  taskId?: string;
  query?: string;
  mutateProcess?: (process: IProcess) => void;
  layouts?: FormBootstrapResponse['layouts'];
}

const render = async (
  renderAs: RenderAs,
  { taskId = 'Task_1', query = 'pdf=1', mutateProcess, layouts = {} }: RenderOptions = {},
) => {
  window.altinnAppGlobalData.applicationMetadata = getApplicationMetadataMock((m) => {
    m.org = 'brg';
    m.partyTypesAllowed.person = true;
    m.partyTypesAllowed.organisation = true;
  });
  const getInstanceMock = vi.fn(async () => {
    const instanceOwnerParty = renderAs === RenderAs.User ? getPartyMock() : getServiceOwnerPartyMock();
    return {
      ...getInstanceDataMock(
        undefined,
        instanceOwnerParty.partyId,
        undefined,
        instanceOwnerParty.orgNumber,
        instanceOwnerParty,
      ),
      process: getProcessDataMock(mutateProcess),
    };
  });

  return await renderWithoutInstanceAndLayout({
    renderer: () => (
      <InstanceProvider>
        <FormProvider>
          <PdfWrapper>
            <PresentationComponent>
              <Form />
            </PresentationComponent>
          </PdfWrapper>
        </FormProvider>
      </InstanceProvider>
    ),
    router: ({ children }) => (
      <InstanceRouter
        instanceId={exampleInstanceId}
        taskId={taskId}
        initialPage=''
        query={query}
      >
        {children}
      </InstanceRouter>
    ),
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = layouts;
        }),
    },
    apis: {
      instanceApi: {
        getInstance: getInstanceMock,
      },
    },
  });
};

describe('PDFWrapper', () => {
  it('should render PDF with correct sender for user', async () => {
    const result = await render(RenderAs.User);

    await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

    expect(screen.queryByText('Avsender:')).not.toBeNull();
    expect(screen.queryByText('010175*****-Ola Privatperson')).not.toBeNull();
  });

  it('should render PDF with correct sender for service owner', async () => {
    const result = await render(RenderAs.ServiceOwner);

    await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

    expect(screen.queryByText('Avsender:')).not.toBeNull();
    expect(screen.queryByText('010175*****-Ola Privatperson')).toBeNull();
    expect(screen.queryByText('974760673-Brønnøysundregistrene')).not.toBeNull();
  });

  describe('hideAppNameInPdf', () => {
    it('should show app name by default', async () => {
      const result = await render(RenderAs.User);

      await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

      expect(screen.queryByRole('heading', { name: 'Test App' })).not.toBeNull();
    });

    it('should show app name when hideAppNameInPdf is set to false', async () => {
      window.altinnAppGlobalData.ui.settings!.hideAppNameInPdf = false;
      const result = await render(RenderAs.User);

      await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

      expect(screen.queryByRole('heading', { name: 'Test App' })).not.toBeNull();
    });

    it('should hide app name when hideAppNameInPdf is set to true', async () => {
      window.altinnAppGlobalData.ui.settings!.hideAppNameInPdf = true;
      const result = await render(RenderAs.User);

      await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });

      expect(screen.queryByRole('heading', { name: 'Test App' })).toBeNull();
    });
  });

  describe('PDF service task', () => {
    const pdfTaskId = 'Task_PDF';
    const designedLayouts: FormBootstrapResponse['layouts'] = {
      PdfLayout: {
        data: {
          layout: [{ id: 'designed-pdf', type: 'Paragraph', textResourceBindings: { title: 'Designed PDF' } }],
        },
      },
    };

    function asPdfTask(process: IProcess) {
      const pdfTask = { elementId: pdfTaskId, elementType: ELEMENT_TYPE.SERVICE_TASK, altinnTaskType: 'pdf' };
      process.currentTask = { ...getProcessDataMock().currentTask, ...pdfTask, flow: 2, started: '', name: pdfTaskId };
      process.processTasks = [...(process.processTasks ?? []), pdfTask];
    }

    function setPdfTaskFolder(pdfLayoutName?: string) {
      window.altinnAppGlobalData.ui.folders[pdfTaskId] = getLayoutSettingsMock({
        defaultDataType: defaultDataTypeMock,
        pages: { order: ['WaitingPage'], pdfLayoutName },
      });
    }

    it('draws the automatic PDF of autoPdfTaskIds when its UI folder has no pdfLayoutName', async () => {
      setPdfTaskFolder(undefined);

      const result = await render(RenderAs.User, {
        taskId: pdfTaskId,
        query: 'pdf=1&task=Task_1',
        mutateProcess: asPdfTask,
        layouts: designedLayouts,
      });

      await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
      expect(screen.queryByText('Avsender:')).not.toBeNull();
      expect(screen.queryByText('Designed PDF')).toBeNull();
    });

    it('draws the automatic PDF of autoPdfTaskIds when it has no UI folder', async () => {
      const result = await render(RenderAs.User, {
        taskId: pdfTaskId,
        query: 'pdf=1&task=Task_1',
        mutateProcess: asPdfTask,
        layouts: designedLayouts,
      });

      await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
      expect(screen.queryByText('Avsender:')).not.toBeNull();
      expect(screen.queryByText('Designed PDF')).toBeNull();
    });

    it.each([
      ['with', 'pdf=1&task=Task_1'],
      ['without', 'pdf=1'],
    ])('draws the pdfLayoutName page %s task search params', async (_, query) => {
      setPdfTaskFolder('PdfLayout');

      const result = await render(RenderAs.User, {
        taskId: pdfTaskId,
        query,
        mutateProcess: asPdfTask,
        layouts: designedLayouts,
      });

      await waitFor(() => expect(result.container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
      expect(screen.queryByText('Designed PDF')).not.toBeNull();
      expect(screen.queryByText('Avsender:')).toBeNull();
    });
  });
});

describe('rendersAutomaticPdf', () => {
  const pdfTask = getProcessDataMock((process) => {
    process.processTasks = [
      { elementId: 'Task_1', altinnTaskType: 'data', elementType: ELEMENT_TYPE.TASK },
      { elementId: 'Task_PDF', altinnTaskType: 'pdf', elementType: ELEMENT_TYPE.SERVICE_TASK },
      { elementId: 'Task_Subform', altinnTaskType: 'subformPdf', elementType: ELEMENT_TYPE.SERVICE_TASK },
    ];
  });

  function setFolder(taskId: string, pdfLayoutName?: string) {
    window.altinnAppGlobalData.ui.folders[taskId] = getLayoutSettingsMock({
      pages: { order: ['Page1'], pdfLayoutName },
    });
  }

  it.each([
    // Whatever the task counts as: a folder with an empty pages.order may count as having no page
    [ProcessTaskType.Data],
    [ProcessTaskType.Service],
  ])('decides a PDF service task by its pdfLayoutName when it counts as %s', (taskType) => {
    expect(rendersAutomaticPdf(pdfTask, 'Task_PDF', taskType)).toBe(true);

    setFolder('Task_PDF');
    expect(rendersAutomaticPdf(pdfTask, 'Task_PDF', taskType)).toBe(true);

    setFolder('Task_PDF', ' ');
    expect(rendersAutomaticPdf(pdfTask, 'Task_PDF', taskType)).toBe(true);

    setFolder('Task_PDF', 'PdfLayout');
    expect(rendersAutomaticPdf(pdfTask, 'Task_PDF', taskType)).toBe(false);
  });

  it('decides other tasks by their task type', () => {
    expect(rendersAutomaticPdf(pdfTask, 'Task_1', ProcessTaskType.Data)).toBe(false);
    expect(rendersAutomaticPdf(pdfTask, 'Task_Subform', ProcessTaskType.Data)).toBe(false);
    expect(rendersAutomaticPdf(pdfTask, 'Task_Subform', ProcessTaskType.Service)).toBe(true);
  });
});
