import React from 'react';
import type { ReactNode } from 'react';

import { screen } from '@testing-library/react';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { TaskOverrides } from 'src/core/contexts/TaskOverrides';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import { usePdfFormatQuery } from 'src/features/pdf/usePdfFormatQuery';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IPdfFormat } from 'src/features/pdf/types';
import type { IPdfFormatUrlOptions } from 'src/utils/urls/appUrlHelper';

const instanceId = '512345/75154373-aed4-41f7-95b4-e5b5115c2edc';

function PdfFormatProbe({ label = 'format' }: { label?: string }) {
  const { data } = usePdfFormatQuery(true);
  return <output aria-label={label}>{data?.excludedPages.join(',')}</output>;
}

async function render(children: ReactNode, taskId = 'Task_Pdf') {
  const instance = getInstanceWithProcessMock();
  instance.data.push(
    { ...instance.data[0], id: 'pdf-element', dataType: 'pdf-data' },
    { ...instance.data[0], id: 'subform-element-1', dataType: 'subform-data' },
    { ...instance.data[0], id: 'subform-element-2', dataType: 'subform-data' },
  );
  window.altinnAppGlobalData.ui.folders.Task_Pdf = {
    defaultDataType: 'pdf-data',
    pages: { order: ['preview'] },
  };
  window.altinnAppGlobalData.ui.folders.Subform = {
    defaultDataType: 'subform-data',
    pages: { order: ['subform'] },
  };

  return await renderWithoutInstanceAndLayout({
    renderer: () => <InstanceProvider>{children}</InstanceProvider>,
    router: ({ children }) => (
      <InstanceRouter
        instanceId={instanceId}
        taskId={taskId}
        query='pdf=1'
      >
        {children}
      </InstanceRouter>
    ),
    apis: {
      instanceApi: { getInstance: async () => instance },
    },
    queries: {
      fetchPdfFormat: async (
        _instanceId: string,
        _dataElementId: string,
        options?: IPdfFormatUrlOptions,
      ): Promise<IPdfFormat> => ({
        excludedPages: [`${options?.taskId}/${options?.uiFolder}`],
        excludedComponents: [],
      }),
    },
  });
}

describe('usePdfFormatQuery', () => {
  it('uses the rendered task and its data model when previewing a non-current task', async () => {
    const { queries } = await render(<PdfFormatProbe />);

    expect(await screen.findByText('Task_Pdf/Task_Pdf')).toBeInTheDocument();
    expect(queries.fetchPdfFormat).toHaveBeenCalledWith(instanceId, 'pdf-element', {
      taskId: 'Task_Pdf',
      uiFolder: 'Task_Pdf',
    });
  });

  it('uses the subform folder and selected data element while retaining the parent task', async () => {
    const { queries } = await render(
      <TaskOverrides
        uiFolder='Subform'
        dataModelElementId='subform-element-2'
      >
        <PdfFormatProbe />
      </TaskOverrides>,
      'Task_Parent',
    );

    expect(await screen.findByText('Task_Parent/Subform')).toBeInTheDocument();
    expect(queries.fetchPdfFormat).toHaveBeenCalledWith(instanceId, 'subform-element-2', {
      taskId: 'Task_Parent',
      uiFolder: 'Subform',
    });
  });

  it('keeps formatting queries separate for contexts sharing the same data element', async () => {
    const { queries } = await render(
      <>
        <TaskOverrides
          taskId='Task_First'
          uiFolder='First'
          dataModelElementId='pdf-element'
        >
          <PdfFormatProbe label='first format' />
        </TaskOverrides>
        <TaskOverrides
          taskId='Task_Second'
          uiFolder='Second'
          dataModelElementId='pdf-element'
        >
          <PdfFormatProbe label='second format' />
        </TaskOverrides>
      </>,
    );

    expect(await screen.findByText('Task_First/First')).toBeInTheDocument();
    expect(await screen.findByText('Task_Second/Second')).toBeInTheDocument();
    expect(queries.fetchPdfFormat).toHaveBeenCalledTimes(2);
  });
});
