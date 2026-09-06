import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { PDFGeneratorPreviewSection } from 'src/features/devtools/components/PDFGeneratorPreviewSection/PDFGeneratorPreviewSection';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IPdfPreviewTasksResponse } from 'src/features/pdf/types';

const exampleInstanceId = '512345/75154373-aed4-41f7-95b4-e5b5115c2edc';

// PDFPreviewControls renders a <dialog> for errors; jsdom does not implement its show/showModal/close methods.
const originalDialogShow = HTMLDialogElement.prototype.show;
const originalDialogShowModal = HTMLDialogElement.prototype.showModal;
const originalDialogClose = HTMLDialogElement.prototype.close;

beforeAll(() => {
  HTMLDialogElement.prototype.show = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  }) as unknown as typeof HTMLDialogElement.prototype.show;
  HTMLDialogElement.prototype.showModal = vi.fn(function (this: HTMLDialogElement) {
    this.open = true;
  }) as unknown as typeof HTMLDialogElement.prototype.showModal;
  HTMLDialogElement.prototype.close = vi.fn(function (this: HTMLDialogElement) {
    this.open = false;
  }) as unknown as typeof HTMLDialogElement.prototype.close;
});

afterAll(() => {
  HTMLDialogElement.prototype.show = originalDialogShow;
  HTMLDialogElement.prototype.showModal = originalDialogShowModal;
  HTMLDialogElement.prototype.close = originalDialogClose;
});

const tasksResponse: IPdfPreviewTasksResponse = {
  tasks: [
    { taskId: 'Task_Pdf', taskType: 'pdf' },
    {
      taskId: 'Task_SubformPdf',
      taskType: 'subformPdf',
      subformComponentId: 'subform1',
      subformDataTypeId: 'subformDataType',
      dataElements: [
        { id: 'aaaaaaaa-1111-2222-3333-444444444444', dataType: 'subformDataType' },
        { id: 'bbbbbbbb-1111-2222-3333-444444444444', dataType: 'subformDataType' },
      ],
    },
  ],
};

async function render(response: IPdfPreviewTasksResponse = tasksResponse) {
  return await renderWithoutInstanceAndLayout({
    renderer: () => <PDFGeneratorPreviewSection />,
    router: ({ children }) => (
      <InstanceRouter
        instanceId={exampleInstanceId}
        taskId='Task_1'
        initialPage=''
      >
        {children}
      </InstanceRouter>
    ),
    queries: {
      fetchPdfPreviewTasks: async () => response,
    },
  });
}

describe('PDFGeneratorPreviewSection', () => {
  it('renders target options from fetchPdfPreviewTasks', async () => {
    await render();

    expect(await screen.findByText('Nåværende oppgave')).toBeInTheDocument();
    expect(screen.getByText('Task_Pdf (PDF)')).toBeInTheDocument();
    expect(screen.getByText('Task_SubformPdf (underskjema-PDF)')).toBeInTheDocument();
  });

  it('shows data elements when a subformPdf task is selected', async () => {
    const user = userEvent.setup();
    await render();

    await user.click(await screen.findByText('Task_SubformPdf (underskjema-PDF)'));

    expect(await screen.findByText('subformDataType – aaaaaaaa')).toBeInTheDocument();
    expect(screen.getByText('subformDataType – bbbbbbbb')).toBeInTheDocument();
  });

  it('shows a hint and disables generation when a subformPdf task has no data elements', async () => {
    const user = userEvent.setup();
    await render({
      tasks: [{ taskId: 'Task_SubformPdf', taskType: 'subformPdf', dataElements: [] }],
    });

    await user.click(await screen.findByText('Task_SubformPdf (underskjema-PDF)'));

    expect(await screen.findByText('Ingen dataelementer å forhåndsvise')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generer PDF/i })).toBeDisabled();
  });

  it('calls the preview endpoint with taskId and dataElementId when generating', async () => {
    const user = userEvent.setup();
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(
      new Response(new Blob(['pdf-content'], { type: 'application/pdf' }), {
        status: 200,
        headers: { 'Content-Type': 'application/pdf' },
      }),
    );

    await render();

    await user.click(await screen.findByText('Task_SubformPdf (underskjema-PDF)'));
    await waitFor(() => expect(screen.getByText('subformDataType – aaaaaaaa')).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Generer PDF/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    const calledUrl = fetchMock.mock.calls[0][0] as string;
    expect(calledUrl).toContain('taskId=Task_SubformPdf');
    expect(calledUrl).toContain('dataElementId=aaaaaaaa-1111-2222-3333-444444444444');

    fetchMock.mockRestore();
  });
});
