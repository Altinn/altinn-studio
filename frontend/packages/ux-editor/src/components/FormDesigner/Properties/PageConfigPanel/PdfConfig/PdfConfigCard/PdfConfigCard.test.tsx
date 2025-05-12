import React from 'react';
import { screen } from '@testing-library/react';
import { PdfConfigCard, type PdfConfigCardProps } from './PdfConfigCard';
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

const selectedLayoutSet: string = layoutSet1NameMock;
const pdfLayoutNameMock: string = 'pdfLayoutNameMock';
const mutateLayoutSettings = jest.fn();

describe('PdfConfigCard', () => {
  afterEach(() => jest.clearAllMocks());

  it('renders convertToPdf label when current page is not pdf', () => {
    renderPdfConfigCard();
    const convertFormLayoutToPdfSwitch = screen.getByLabelText(
      textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    );
    expect(convertFormLayoutToPdfSwitch).toBeInTheDocument();
  });

  it('renders convertToFormLayout label when current page is pdf', () => {
    renderPdfConfigCard({
      layoutSettings: { pages: { order: [], pdfLayoutName: pdfLayoutNameMock } },
      appContextProps: { selectedFormLayoutName: pdfLayoutNameMock },
    });
    const convertPdfToFormLayoutSwitch = screen.getByLabelText(
      textMock('ux_editor.page_config_pdf_convert_existing_pdf'),
    );
    expect(convertPdfToFormLayoutSwitch).toBeInTheDocument();
  });

  it('should call onClickConvert when the switch is toggled and the page is not a PDF', async () => {
    const user = userEvent.setup();

    renderPdfConfigCard();

    const convertFormLayoutToPdfSwitch = screen.getByLabelText(
      textMock('ux_editor.page_config_pdf_convert_page_to_pdf'),
    );
    await user.click(convertFormLayoutToPdfSwitch);

    expect(mockOnClickConvert).toHaveBeenCalledTimes(1);
  });

  it('should call convertExistingPdfToPage and save when the switch is toggled and the page is a PDF', async () => {
    const user = userEvent.setup();

    renderPdfConfigCard({
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
});

const mockOnClickConvert = jest.fn();

const defaultProps: PdfConfigCardProps = {
  onClickConvert: mockOnClickConvert,
};

type Props = {
  layoutSettings: Partial<ILayoutSettings>;
  appContextProps: Partial<AppContextProps>;
  queries: Partial<ServicesContextProps>;
};

const renderPdfConfigCard = (props: Partial<Props> = {}) => {
  const { layoutSettings, appContextProps, queries } = props;

  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.FormLayoutSettings, org, app, selectedLayoutSet], {
    ...formLayoutSettingsMock,
    ...layoutSettings,
  });
  renderWithProviders(<PdfConfigCard {...defaultProps} />, {
    queries,
    queryClient,
    appContextProps,
  });
};
