import React from 'react';
import { Outlet } from 'react-router';

import { screen, waitFor } from '@testing-library/react';
import type { ILayoutSettings } from '@app/layout-contract/generated/common.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { defaultDataTypeMock, getLayoutSettingsMock } from 'src/__mocks__/getUiConfigMock';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { InstanceRoutesRouter } from 'src/test/routerUtils';
import { ELEMENT_TYPE } from 'src/types/shared';

const pdfTaskId = 'Task_PDF';
const instancePath = '/instance/12345/91cefc5e-c47b-40ff-a8a4-05971205f783';

async function renderPdfTask(query: string) {
  const instance = {
    ...getInstanceDataMock(),
    process: getProcessDataMock((process) => {
      const pdfTask = { elementId: pdfTaskId, elementType: ELEMENT_TYPE.SERVICE_TASK, altinnTaskType: 'pdf' };
      process.currentTask = { ...process.currentTask!, ...pdfTask, flow: 2, name: pdfTaskId };
      process.processTasks = [...(process.processTasks ?? []), pdfTask];
    }),
  };

  return await renderWithoutInstanceAndLayout({
    renderer: () => <Outlet />,
    router: ({ children }) => (
      <InstanceRoutesRouter path={`${instancePath}/${pdfTaskId}?${query}`}>{children}</InstanceRoutesRouter>
    ),
    queries: {
      fetchFormBootstrapForInstance: async () =>
        getFormBootstrapMock((obj) => {
          obj.layouts = {
            WaitingPage: {
              data: { layout: [{ id: 'waiting', type: 'Paragraph', textResourceBindings: { title: 'Waiting' } }] },
            },
            Page1: {
              data: { layout: [{ id: 'page1-text', type: 'Paragraph', textResourceBindings: { title: 'Task 1' } }] },
            },
            PdfLayout: {
              data: {
                layout: [{ id: 'designed-pdf', type: 'Paragraph', textResourceBindings: { title: 'Designed' } }],
              },
            },
          };
        }),
    },
    apis: { instanceApi: { getInstance: async () => instance } },
  });
}

function setPdfTaskFolder(pages: ILayoutSettings['pages']) {
  window.altinnAppGlobalData.ui.folders[pdfTaskId] = getLayoutSettingsMock({
    defaultDataType: defaultDataTypeMock,
    pages,
  });
}

describe('PDF task through the task routes', () => {
  it.each([[[]], [['WaitingPage']]])('draws the pdfLayoutName page when pages.order is %j', async (order) => {
    setPdfTaskFolder({ order, pdfLayoutName: 'PdfLayout' });

    const { container } = await renderPdfTask('pdf=1');

    await waitFor(() => expect(container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
    expect(screen.getByText('Designed')).toBeInTheDocument();
    expect(screen.queryByText('Waiting')).not.toBeInTheDocument();
    expect(screen.queryByText('Ukjent feil')).not.toBeInTheDocument();
  });

  it.each([[[]], [['WaitingPage']]])(
    'draws the automatic PDF of autoPdfTaskIds when pages.order is %j',
    async (order) => {
      setPdfTaskFolder({ order });

      const { container } = await renderPdfTask('pdf=1&task=Task_1');

      await waitFor(() => expect(container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
      expect(screen.getByText('Avsender:')).toBeInTheDocument();
      expect(screen.queryByText('Designed')).not.toBeInTheDocument();
      expect(screen.queryByText('Ukjent feil')).not.toBeInTheDocument();
    },
  );
});
