import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { defaultMockDataElementId, getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { PDFGeneratorPreviewSection } from 'src/features/devtools/components/PDFGeneratorPreviewSection/PDFGeneratorPreviewSection';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';

const subformIds = ['aaaaaaaa-1111-2222-3333-444444444444', 'bbbbbbbb-1111-2222-3333-444444444444'];
const otherSubformId = 'cccccccc-1111-2222-3333-444444444444';

async function render({ otherSubform = false }: { otherSubform?: boolean } = {}) {
  const instance = getInstanceWithProcessMock();
  instance.process.processTasks = [
    { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
    { elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' },
    { elementId: 'Task_SubformPdf', elementType: 'ServiceTask', altinnTaskType: 'subformPdf' },
  ];
  instance.data.push(...subformIds.map((id) => ({ ...instance.data[0], id, dataType: 'subform' })), {
    ...instance.data[0],
    id: otherSubformId,
    dataType: 'otherSubform',
  });
  // The subform PDF task has no UI folder; it renders the subform's UI folder
  delete window.altinnAppGlobalData.ui.folders.Task_SubformPdf;
  window.altinnAppGlobalData.ui.folders.Subform = { defaultDataType: 'subform', pages: { order: ['Side1'] } };
  if (otherSubform) {
    window.altinnAppGlobalData.ui.folders.OtherSubform = {
      defaultDataType: 'otherSubform',
      pages: { order: ['Side1'] },
    };
  }

  return await renderWithoutInstanceAndLayout({
    renderer: () => <PDFGeneratorPreviewSection />,
    router: ({ children }) => <InstanceRouter initialPage=''>{children}</InstanceRouter>,
    apis: { instanceApi: { getInstance: async () => instance } },
  });
}

describe('PDFGeneratorPreviewSection', () => {
  it('offers the PDF service tasks as preview targets', async () => {
    await render();

    expect(await screen.findByText('Task_Pdf')).toBeInTheDocument();
    expect(screen.getByText('Task_SubformPdf')).toBeInTheDocument();
    expect(screen.getByText('Nåværende oppgave')).toBeInTheDocument();
    expect(screen.queryByText('Task_1')).not.toBeInTheDocument();
  });

  it('previews the chosen subform of a subform PDF service task', async () => {
    // jsdom does not implement the dialog the preview opens in
    const originalShowModal = HTMLDialogElement.prototype.showModal;
    HTMLDialogElement.prototype.showModal = vi.fn();
    const fetchMock = vi.spyOn(global, 'fetch').mockResolvedValue(new Response(null, { status: 204 }));
    const user = userEvent.setup();
    await render();

    await user.click(await screen.findByText('Task_SubformPdf'));
    expect(await screen.findByText(`Underskjema 1 (ID: ${subformIds[0]})`)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(defaultMockDataElementId))).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generer PDF/i })).toBeDisabled();

    await user.click(screen.getByText(`Underskjema 2 (ID: ${subformIds[1]})`));
    await user.click(screen.getByRole('button', { name: /Generer PDF/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain(`taskId=Task_SubformPdf&dataElementId=${subformIds[1]}`);
    fetchMock.mockRestore();
    HTMLDialogElement.prototype.showModal = originalShowModal;
  });

  it('offers the entries of each subform UI folder, and none of the data a task folder uses', async () => {
    const user = userEvent.setup();
    await render({ otherSubform: true });

    await user.click(await screen.findByText('Task_SubformPdf'));
    expect(await screen.findByText('Underskjema i Subform')).toBeInTheDocument();
    expect(screen.getByText('Underskjema i OtherSubform')).toBeInTheDocument();
    expect(screen.getByText(`Underskjema 2 (ID: ${subformIds[1]})`)).toBeInTheDocument();
    expect(screen.getByText(`Underskjema 1 (ID: ${otherSubformId})`)).toBeInTheDocument();
    expect(screen.queryByText(new RegExp(defaultMockDataElementId))).not.toBeInTheDocument();
  });

  it('offers no subform entries for a PDF service task', async () => {
    const user = userEvent.setup();
    await render();

    await user.click(await screen.findByText('Task_Pdf'));
    expect(screen.queryByText('Underskjema i Subform')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Generer PDF/i })).toBeEnabled();
  });
});
