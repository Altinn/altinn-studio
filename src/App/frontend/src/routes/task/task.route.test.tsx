import React from 'react';
import { Outlet } from 'react-router';

import { screen, waitFor } from '@testing-library/react';
import type { ILayoutSettings } from '@app/layout-contract/generated/common.generated';

import { getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceDataMock } from 'src/__mocks__/getInstanceDataMock';
import { getProcessDataMock } from 'src/__mocks__/getProcessDataMock';
import { renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import { InstanceRoutesRouter } from 'src/test/routerUtils';
import { ELEMENT_TYPE } from 'src/types/shared';
import type { fetchFormBootstrapForInstance } from 'src/queries/queries';

const subformPdfTaskId = 'Task_SubformPdf';
const subformIds = ['aaaaaaaa-1111-2222-3333-444444444444', 'bbbbbbbb-1111-2222-3333-444444444444'];

async function renderSubformPdf(ownFolder: ILayoutSettings) {
  const instance = getInstanceDataMock();
  instance.data.push(...subformIds.map((id) => ({ ...instance.data[0], id, dataType: 'subform' })));
  const instanceWithProcess = {
    ...instance,
    process: getProcessDataMock((process) => {
      const task = {
        elementId: subformPdfTaskId,
        elementType: ELEMENT_TYPE.SERVICE_TASK,
        altinnTaskType: 'subformPdf',
      };
      process.currentTask = { ...process.currentTask!, ...task, flow: 2, name: subformPdfTaskId };
      process.processTasks = [...(process.processTasks ?? []), task];
    }),
  };
  window.altinnAppGlobalData.ui.folders[subformPdfTaskId] = ownFolder;
  window.altinnAppGlobalData.ui.folders.Subform = { defaultDataType: 'subform', pages: { order: ['Side1'] } };

  // Like the app backend, which cannot tell which entry to load without a data element id
  const fetchFormBootstrap = vi.fn<typeof fetchFormBootstrapForInstance>(async (args) => {
    if (args.uiFolder !== 'Subform' || args.dataElementId !== subformIds[1]) {
      throw new Error(`Unexpected form load of UI folder ${args.uiFolder}`);
    }
    return getFormBootstrapMock((obj) => {
      obj.layouts = {
        Side1: {
          data: { layout: [{ id: 'entry', type: 'Paragraph', textResourceBindings: { title: 'Subform entry' } }] },
        },
      };
    });
  });

  const query = `pdf=1&subformUiFolder=Subform&subformDataElementId=${subformIds[1]}`;
  const result = await renderWithoutInstanceAndLayout({
    renderer: () => <Outlet />,
    router: ({ children }) => (
      <InstanceRoutesRouter path={`/instance/${instance.id}/${subformPdfTaskId}?${query}`}>
        {children}
      </InstanceRoutesRouter>
    ),
    queries: { fetchFormBootstrapForInstance: fetchFormBootstrap },
    apis: { instanceApi: { getInstance: async () => instanceWithProcess } },
  });

  return { ...result, fetchFormBootstrap };
}

describe('subform PDF task through the task routes', () => {
  // A subform PDF task may keep a UI folder of its own, such as one with a waiting page. Its PDF still renders the
  // entry from the subform's UI folder, without loading the task's own folder.
  it.each<[string, ILayoutSettings]>([
    ['lists no page', { defaultDataType: 'subform', pages: { order: [] } }],
    ['lists a waiting page, with the subform data type', { defaultDataType: 'subform', pages: { order: ['Side1'] } }],
  ])('renders the subform entry when its own UI folder %s', async (_, ownFolder) => {
    const { container, fetchFormBootstrap } = await renderSubformPdf(ownFolder);

    await waitFor(() => expect(container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
    expect(screen.getByText('Subform entry')).toBeInTheDocument();
    expect(fetchFormBootstrap).not.toHaveBeenCalledWith(expect.objectContaining({ uiFolder: subformPdfTaskId }));
  });
});

describe("a subform entry's own route", () => {
  // Only the task's form names the subform's UI folder, through its Subform component
  it("renders the entry's PDF in PDF mode", async () => {
    const instance = getInstanceDataMock();
    instance.data.push({ ...instance.data[0], id: subformIds[0], dataType: 'subform' });
    const instanceWithProcess = { ...instance, process: getProcessDataMock() };
    window.altinnAppGlobalData.ui.folders.Subform = { defaultDataType: 'subform', pages: { order: ['Side1'] } };

    const fetchFormBootstrap = vi.fn<typeof fetchFormBootstrapForInstance>(async (args) =>
      getFormBootstrapMock((obj) => {
        obj.layouts =
          args.uiFolder === 'Subform'
            ? {
                Side1: {
                  data: {
                    layout: [{ id: 'entry', type: 'Paragraph', textResourceBindings: { title: 'Subform entry' } }],
                  },
                },
              }
            : {
                FormLayout: {
                  data: {
                    layout: [
                      { id: 'main', type: 'Paragraph', textResourceBindings: { title: 'Main form' } },
                      { id: 'mopeds', type: 'Subform', layoutSet: 'Subform', tableColumns: [] },
                    ],
                  },
                },
              };
      }),
    );

    const path = `/instance/${instance.id}/Task_1/FormLayout/mopeds/${subformIds[0]}?pdf=1`;
    const { container } = await renderWithoutInstanceAndLayout({
      renderer: () => <Outlet />,
      router: ({ children }) => <InstanceRoutesRouter path={path}>{children}</InstanceRoutesRouter>,
      queries: { fetchFormBootstrapForInstance: fetchFormBootstrap },
      apis: { instanceApi: { getInstance: async () => instanceWithProcess } },
    });

    await waitFor(() => expect(container.querySelector('#readyForPrint')).not.toBeNull(), { timeout: 5000 });
    expect(screen.getByText('Subform entry')).toBeInTheDocument();
    expect(screen.queryByText('Main form')).not.toBeInTheDocument();
    expect(fetchFormBootstrap).toHaveBeenCalledWith(
      expect.objectContaining({ uiFolder: 'Subform', dataElementId: subformIds[0] }),
    );
  });
});
