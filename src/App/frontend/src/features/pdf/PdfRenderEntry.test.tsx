import React from 'react';
import type { PropsWithChildren } from 'react';

import { screen, waitFor } from '@testing-library/react';

import { getDataModelBootstrapMock, getFormBootstrapMock } from 'src/__mocks__/getFormBootstrapMock';
import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { InstanceProvider } from 'src/features/instance/InstanceContext';
import Task from 'src/routes/task/task.route';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const dataElementId = 'aaaaaaaa-1111-4111-8111-aaaaaaaaaaaa';
const otherDataElementId = 'bbbbbbbb-1111-4111-8111-bbbbbbbbbbbb';

class TestErrorBoundary extends React.Component<PropsWithChildren, { error?: Error }> {
  state: { error?: Error } = {};
  static getDerivedStateFromError(error: Error) {
    return { error };
  }
  render() {
    return this.state.error ? <div role='alert'>{this.state.error.message}</div> : this.props.children;
  }
}

async function render(uiFolder = 'subform-layout', selectedElementId = dataElementId, customPdfLayout = true) {
  const instance = getInstanceWithProcessMock();
  instance.process.processTasks = [
    { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
    { elementId: 'Task_SubformPdf', elementType: 'ServiceTask', altinnTaskType: 'subformPdf' },
    { elementId: 'Task_Payment', elementType: 'Task', altinnTaskType: 'payment' },
  ];
  instance.process.workflow = { status: 'processing', targetTask: 'Task_SubformPdf' };
  instance.data.push(
    { ...instance.data[0], id: dataElementId, dataType: 'subform-data' },
    { ...instance.data[0], id: otherDataElementId, dataType: 'subform-data' },
  );
  window.altinnAppGlobalData.ui.folders['subform-layout'].pages = {
    order: ['Subform'],
    ...(customPdfLayout ? { pdfLayoutName: 'Subform' } : {}),
  };

  return await renderWithoutInstanceAndLayout({
    renderer: () => (
      <InstanceProvider>
        <TestErrorBoundary>
          <Task />
        </TestErrorBoundary>
      </InstanceProvider>
    ),
    router: ({ children }) => (
      <InstanceRouter
        taskId='Task_SubformPdf'
        initialPage=''
        query={`pdf=1&pdfUiFolder=${uiFolder}&pdfDataElementId=${selectedElementId}`}
      >
        {children}
      </InstanceRouter>
    ),
    apis: { instanceApi: { getInstance: async () => instance } },
    queries: {
      fetchPdfFormat: async () => ({ excludedPages: [], excludedComponents: ['excluded-from-pdf'] }),
      fetchFormBootstrapForInstance: async ({ uiFolder, dataElementId: requestedElementId }) => {
        if (uiFolder !== 'subform-layout') {
          throw new Error('The parent task must not be bootstrapped to render its subform PDF.');
        }
        return getFormBootstrapMock({
          layouts: {
            Subform: {
              data: {
                layout: [
                  {
                    id: 'selected',
                    type: 'Paragraph',
                    textResourceBindings: {
                      title: requestedElementId === dataElementId ? 'Selected subform only' : 'Other subform',
                    },
                  },
                  {
                    id: 'parent-reference',
                    type: 'Paragraph',
                    hidden: ['notEquals', ['dataModel', 'parentFlag', 'test-data-model'], 'allow'],
                    textResourceBindings: { title: 'Shared parent model expression resolved' },
                  },
                  {
                    id: 'excluded-from-pdf',
                    type: 'Paragraph',
                    textResourceBindings: { title: 'Excluded subform content' },
                  },
                  {
                    id: 'preselection',
                    type: 'Dropdown',
                    dataModelBindings: { simpleBinding: { field: 'choice', dataType: 'subform-data' } },
                    options: [{ label: 'Should not be selected automatically', value: 'automatic' }],
                    preselectedOptionIndex: 0,
                  },
                ],
              },
            },
          },
          dataModels: {
            'test-data-model': getDataModelBootstrapMock({ initialData: { parentFlag: 'allow' } }),
            'subform-data': getDataModelBootstrapMock({
              dataElementId: requestedElementId,
              schema: { type: 'object', properties: { choice: { type: 'string' } } },
              initialData: {},
            }),
          },
        });
      },
    },
  });
}

describe('explicit PDF task entry', () => {
  it('renders only the selected subform while preserving references to the shared parent model', async () => {
    const { queries, mutations } = await render();

    expect(await screen.findByText('Selected subform only')).toBeInTheDocument();
    expect(await screen.findByText('Shared parent model expression resolved')).toBeInTheDocument();
    expect(screen.queryByText('Other subform')).not.toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
    expect(queries.fetchFormBootstrapForInstance).toHaveBeenCalledExactlyOnceWith({
      instanceId: '512345/75154373-aed4-41f7-95b4-e5b5115c2edc',
      uiFolder: 'subform-layout',
      dataElementId,
      pdf: true,
      language: 'nb',
    });
    expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
    expect(document.body).not.toHaveAttribute('data-unsaved-changes');
    expect(queries.fetchPaymentInformationForTask).not.toHaveBeenCalled();
    expect(queries.fetchOrderDetails).not.toHaveBeenCalled();
  });

  it('uses the source task and selected subform context for automatic PDF formatting', async () => {
    const { queries, mutations } = await render('subform-layout', dataElementId, false);

    expect(await screen.findByText('Selected subform only')).toBeInTheDocument();
    expect(await screen.findByText('Shared parent model expression resolved')).toBeInTheDocument();
    await waitFor(() => expect(document.getElementById('readyForPrint')).not.toBeNull());
    expect(screen.queryByText('Excluded subform content')).not.toBeInTheDocument();
    expect(screen.queryByText('Other subform')).not.toBeInTheDocument();
    expect(queries.fetchPdfFormat).toHaveBeenCalledExactlyOnceWith(
      '512345/75154373-aed4-41f7-95b4-e5b5115c2edc',
      dataElementId,
      { taskId: 'Task_SubformPdf', uiFolder: 'subform-layout' },
    );
    expect(queries.fetchFormBootstrapForInstance).toHaveBeenCalledTimes(1);
    expect(mutations.doPatchMultipleFormData.mock).not.toHaveBeenCalled();
  });

  it.each([
    ['missing-folder', dataElementId],
    ['subform-layout', 'cccccccc-1111-4111-8111-cccccccccccc'],
    ['Task_1', dataElementId],
  ])('fails closed for mismatched folder %s and element %s', async (uiFolder, elementId) => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {});
    try {
      const { queries } = await render(uiFolder, elementId);
      expect(await screen.findByRole('alert')).toHaveTextContent('does not match UI folder');
      expect(queries.fetchFormBootstrapForInstance).not.toHaveBeenCalled();
      expect(document.getElementById('readyForPrint')).toBeNull();
    } finally {
      consoleError.mockRestore();
    }
  });
});
