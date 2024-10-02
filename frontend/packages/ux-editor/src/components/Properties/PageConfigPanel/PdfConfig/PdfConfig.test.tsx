import React from 'react';
import { PdfConfig } from './PdfConfig';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { formLayoutSettingsMock, renderWithProviders } from '@altinn/ux-editor/testing/mocks';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import { app, org } from '@studio/testing/testids';
import type { ILayoutSettings } from 'app-shared/types/global';
import { layoutSet1NameMock } from '@altinn/ux-editor/testing/layoutSetsMock';
import type { AppContextProps } from '@altinn/ux-editor/AppContext';
import userEvent from '@testing-library/user-event';
import type { ServicesContextProps } from 'app-shared/contexts/ServicesContext';
import { layout1NameMock, layout2NameMock } from '@altinn/ux-editor/testing/layoutMock';

const selectedLayoutSet = layoutSet1NameMock;

describe('PdfConfig', () => {
  afterEach(() => jest.clearAllMocks());
  it('renders convertToPdf button when current page is not pdf', () => {
    renderPdfConfig();
    const convertFormLayoutToPdfButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    });
    expect(convertFormLayoutToPdfButton).toBeInTheDocument();
  });

  it('renders convertToFormLayout button when current page is pdf', () => {
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    renderPdfConfig(
      { pages: { order: [], pdfLayoutName: pdfLayoutNameMock } },
      { selectedFormLayoutName: pdfLayoutNameMock },
    );
    const convertPdfToFormLayoutButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_existing_pdf'),
    });
    expect(convertPdfToFormLayoutButton).toBeInTheDocument();
  });

  it('calls save on FormLayoutSettings when convertToPdf button is clicked', async () => {
    const user = userEvent.setup();
    const mutateLayoutSettings = jest.fn();
    renderPdfConfig({}, {}, { saveFormLayoutSettings: mutateLayoutSettings });
    const convertFormLayoutToPdfButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    });
    await user.click(convertFormLayoutToPdfButton);
    expect(mutateLayoutSettings).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSettings).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      pages: { order: [layout2NameMock], pdfLayoutName: layout1NameMock },
    });
  });

  it('calls save on FormLayoutSettings when convertToFormLayout button is clicked', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    const mutateLayoutSettings = jest.fn();
    renderPdfConfig(
      { pages: { order: [], pdfLayoutName: pdfLayoutNameMock } },
      { selectedFormLayoutName: pdfLayoutNameMock },
      { saveFormLayoutSettings: mutateLayoutSettings },
    );
    const convertPdfToFormLayoutButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_existing_pdf'),
    });
    await user.click(convertPdfToFormLayoutButton);
    expect(mutateLayoutSettings).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSettings).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      pages: { order: [pdfLayoutNameMock] },
    });
  });

  it('shows conversion choices modal when converting a layout to pdf when there exists a pdfLayout from before', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    renderPdfConfig({ pages: { order: [], pdfLayoutName: pdfLayoutNameMock } });
    const convertFormLayoutToPdfButton = screen.getByRole('button', {
      name: textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    });
    await user.click(convertFormLayoutToPdfButton);
    const conversionChoicesModalHeading = screen.getByRole('heading', {
      name: textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    });
    expect(conversionChoicesModalHeading).toBeInTheDocument();
  });
});

const renderPdfConfig = (
  layoutSettings: Partial<ILayoutSettings> = {},
  appContextProps: Partial<AppContextProps> = {},
  queries: Partial<ServicesContextProps> = {},
) => {
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
    ...formLayoutSettingsMock,
    ...layoutSettings,
  });
  renderWithProviders(<PdfConfig />, { queries, queryClient, appContextProps });
};
