import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfFilenameTextResource } from './PdfFilenameTextResource';
import { createPdfBpmnDetails, renderWithProviders } from './testUtils';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({
    data: {
      nb: [
        { id: 'existing-text-resource', value: 'Existing filename' },
        { id: 'another-resource', value: 'Another value' },
      ],
    },
  }),
}));

const mockUpsertTextResource = jest.fn();
jest.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: mockUpsertTextResource }),
}));

describe('PdfFilenameTextResource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render filename section with title', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderWithProviders(<PdfFilenameTextResource />, {
      bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
      bpmnApiContextProps: { layoutSets: { sets: [] } },
    });

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_filename')),
    ).toBeInTheDocument();
  });

  it('should render filename description', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderWithProviders(<PdfFilenameTextResource />, {
      bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
      bpmnApiContextProps: { layoutSets: { sets: [] } },
    });

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_pdf_filename_description')),
    ).toBeInTheDocument();
  });

  it('should render filename property button', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderWithProviders(<PdfFilenameTextResource />, {
      bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
      bpmnApiContextProps: { layoutSets: { sets: [] } },
    });

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).toBeInTheDocument();
  });

  it('should display current filename value when text resource exists', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({
      filenameTextResourceKey: 'existing-text-resource',
    });

    renderWithProviders(<PdfFilenameTextResource />, {
      bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
      bpmnApiContextProps: { layoutSets: { sets: [] } },
    });

    expect(screen.getByText('Existing filename')).toBeInTheDocument();
  });

  it('should display empty value when no filename text resource is set', () => {
    const pdfBpmnDetails = createPdfBpmnDetails({});

    renderWithProviders(<PdfFilenameTextResource />, {
      bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
      bpmnApiContextProps: { layoutSets: { sets: [] } },
    });

    const button = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    expect(button).toBeInTheDocument();
  });
});
