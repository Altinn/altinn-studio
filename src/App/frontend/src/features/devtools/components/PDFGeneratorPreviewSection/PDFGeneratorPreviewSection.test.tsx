import React from 'react';

import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { getInstanceWithProcessMock } from 'src/__mocks__/getInstanceDataMock';
import { PDFGeneratorPreviewSection } from 'src/features/devtools/components/PDFGeneratorPreviewSection/PDFGeneratorPreviewSection';
import { InstanceRouter, renderWithoutInstanceAndLayout } from 'src/test/renderWithProviders';
import type { IData } from 'src/types/shared';

const subformIds = ['aaaaaaaa-1111-2222-3333-444444444444', 'bbbbbbbb-1111-2222-3333-444444444444'];

async function render() {
  const instance = getInstanceWithProcessMock();
  instance.process.processTasks = [
    { elementId: 'Task_1', elementType: 'Task', altinnTaskType: 'data' },
    { elementId: 'Task_Pdf', elementType: 'ServiceTask', altinnTaskType: 'pdf' },
    { elementId: 'Task_SubformPdf', elementType: 'ServiceTask', altinnTaskType: 'subformPdf' },
  ];
  instance.data.push(...subformIds.map((id) => ({ ...instance.data[0], id, dataType: 'subform' }) as IData));
  window.altinnAppGlobalData.ui.folders.Task_SubformPdf = { defaultDataType: 'subform', pages: { order: ['Pdf'] } };

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
    expect(screen.getByRole('button', { name: /Generer PDF/i })).toBeDisabled();

    await user.click(screen.getByText('bbbbbbbb'));
    await user.click(screen.getByRole('button', { name: /Generer PDF/i }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalled());
    expect(fetchMock.mock.calls[0][0]).toContain(`taskId=Task_SubformPdf&dataElementId=${subformIds[1]}`);
    fetchMock.mockRestore();
    HTMLDialogElement.prototype.showModal = originalShowModal;
  });
});
