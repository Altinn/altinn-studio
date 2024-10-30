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

  it('calls save on FormLayoutSettings when convertToPdf switch is clicked', async () => {
    const user = userEvent.setup();
    const mutateLayoutSettings = jest.fn();
    renderPdfConfig({ queries: { saveFormLayoutSettings: mutateLayoutSettings } });
    const convertFormLayoutToPdfSwitch = screen.getByLabelText(
      textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    );
    await user.click(convertFormLayoutToPdfSwitch);
    expect(mutateLayoutSettings).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSettings).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      pages: { order: [layout2NameMock], pdfLayoutName: layout1NameMock },
    });
  });

  it('calls save on FormLayoutSettings when convertToFormLayout switch is clicked', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    const mutateLayoutSettings = jest.fn();
    renderPdfConfig({
      layoutSettings: { pages: { order: [], pdfLayoutName: pdfLayoutNameMock } },
      appContextProps: { selectedFormLayoutName: pdfLayoutNameMock },
      queries: { saveFormLayoutSettings: mutateLayoutSettings },
    });
    const convertPdfToFormLayoutSwitch = screen.getByLabelText(
      textMock('ux_editor.page_config_pdf_convert_existing_pdf'),
    );
    await user.click(convertPdfToFormLayoutSwitch);
    expect(mutateLayoutSettings).toHaveBeenCalledTimes(1);
    expect(mutateLayoutSettings).toHaveBeenCalledWith(org, app, layoutSet1NameMock, {
      pages: { order: [pdfLayoutNameMock] },
    });
  });

  it('shows conversion choices modal when converting a layout to pdf when there exists a pdfLayout from before', async () => {
    const user = userEvent.setup();
    const pdfLayoutNameMock = 'pdfLayoutNameMock';
    renderPdfConfig({
      layoutSettings: { pages: { order: [], pdfLayoutName: pdfLayoutNameMock } },
    });
    const convertFormLayoutToPdfSwitch = screen.getByLabelText(
      textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    );
    await user.click(convertFormLayoutToPdfSwitch);
    const conversionChoicesModalHeading = screen.getByRole('heading', {
      name: textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    });
    expect(conversionChoicesModalHeading).toBeInTheDocument();
  });
});

type Props = {
  layoutSettings: Partial<ILayoutSettings>;
  appContextProps: Partial<AppContextProps>;
  queries: Partial<ServicesContextProps>;
};

const renderPdfConfig = (props: Partial<Props> = {}) => {
  const { layoutSettings, appContextProps, queries } = props;

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
    ...formLayoutSettingsMock,
    ...layoutSettings,
  });
  renderWithProviders(<PdfConfig />, { queries, queryClient, appContextProps });
};
