import React, { createRef } from 'react';
import { formLayoutSettingsMock, renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { ConvertChoicesModal } from '@altinn/ux-editor/components/Properties/PageConfigPanel/PdfConfig/ConvertPageToPdfWhenExistingModal/ConvertChoicesModal';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import { layout1NameMock } from '@altinn/ux-editor/testing/layoutMock';
import userEvent from '@testing-library/user-event';
import { screen } from '@testing-library/react';
import type { ILayoutSettings } from 'app-shared/types/global';
import type { AppContextProps } from '@altinn/ux-editor/AppContext';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';

const selectedLayoutSet = layoutSet1NameMock;
const handleModalActionMock = jest.fn();

describe('ConvertChoicesModal', () => {
  afterEach(() => jest.clearAllMocks());
  it('converts existing pdf back to formLayout when clicking convert in conversion choices modal', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    const mutateLayoutSettingsMock = jest.fn();
    await renderConvertChoicesModal(
      { pages: { order: [layout1NameMock], pdfLayoutName: pdfLayoutNameMock } },
      {},
      { saveFormLayoutSettings: mutateLayoutSettingsMock },
    );
    const convertExistingPdfToFormLayout = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_existing_pdf'),
    });
    await user.click(convertExistingPdfToFormLayout);
    expect(mutateLayoutSettingsMock).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSettingsMock).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      pages: { order: [pdfLayoutNameMock], pdfLayoutName: layout1NameMock },
    });
  });

  it('deletes existing pdf when clicking delete in conversion choices modal', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    const mutateLayoutSettingsMock = jest.fn();
    const deleteLayoutMock = jest.fn();
    await renderConvertChoicesModal(
      { pages: { order: [layout1NameMock], pdfLayoutName: pdfLayoutNameMock } },
      {},
      { saveFormLayoutSettings: mutateLayoutSettingsMock, deleteFormLayout: deleteLayoutMock },
    );
    const deleteExistingPdf = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_delete_existing_pdf'),
    });
    await user.click(deleteExistingPdf);
    expect(mutateLayoutSettingsMock).toHaveBeenCalledTimes(2); // Once from pdfConfig and another from deleteLayout
    expect(mutateLayoutSettingsMock).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      pages: { order: [], pdfLayoutName: layout1NameMock },
    });
    expect(deleteLayoutMock).toHaveBeenCalledTimes(1);
    expect(deleteLayoutMock).toHaveBeenCalledWith(org, app, pdfLayoutNameMock, selectedLayoutSet);
  });

  it('calls handleModalAction when converting existing pdf', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    await renderConvertChoicesModal({
      pages: { order: [layout1NameMock], pdfLayoutName: pdfLayoutNameMock },
    });
    const convertExistingPdfToFormLayout = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_existing_pdf'),
    });
    await user.click(convertExistingPdfToFormLayout);
    expect(handleModalActionMock).toHaveBeenCalledTimes(1);
  });

  it('calls handleModalAction when deleting existing pdf', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    await renderConvertChoicesModal({
      pages: { order: [layout1NameMock], pdfLayoutName: pdfLayoutNameMock },
    });
    const deleteExistingPdf = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_delete_existing_pdf'),
    });
    await user.click(deleteExistingPdf);
    expect(handleModalActionMock).toHaveBeenCalledTimes(1);
  });
});

const renderConvertChoicesModal = async (
  layoutSettings: Partial<ILayoutSettings> = {},
  appContextProps: Partial<AppContextProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const ref = createRef<HTMLDialogElement>();
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
    ...formLayoutSettingsMock,
    ...layoutSettings,
  });
  renderWithProviders(<ConvertChoicesModal handleModalAction={handleModalActionMock} ref={ref} />, {
    queries,
    queryClient,
    appContextProps,
  });
  ref.current?.showModal();
  await screen.findByRole('dialog');
};
