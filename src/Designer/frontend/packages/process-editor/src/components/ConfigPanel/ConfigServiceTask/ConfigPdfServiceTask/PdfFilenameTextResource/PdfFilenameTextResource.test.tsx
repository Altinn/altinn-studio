import React from 'react';
import { screen } from '@testing-library/react';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfFilenameTextResource } from './PdfFilenameTextResource';
import { createPdfBpmnDetails, renderWithProviders } from '../testUtils';

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
    renderPdfFilenameTextResource();

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_filename')),
    ).toBeInTheDocument();
  });

  it('should render filename description', () => {
    renderPdfFilenameTextResource();

    expect(
      screen.getByText(textMock('process_editor.configuration_panel_pdf_filename_description')),
    ).toBeInTheDocument();
  });

  it('should render filename property button', () => {
    renderPdfFilenameTextResource();

    expect(
      screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_filename_label'),
      }),
    ).toBeInTheDocument();
  });

  it('should display current filename value when text resource exists', () => {
    renderPdfFilenameTextResource('existing-text-resource');

    expect(screen.getByText('Existing filename')).toBeInTheDocument();
  });

  it('should display empty value when no filename text resource is set', () => {
    renderPdfFilenameTextResource();

    const button = screen.getByRole('button', {
      name: textMock('process_editor.configuration_panel_pdf_filename_label'),
    });
    expect(button).toBeInTheDocument();
  });
});

const renderPdfFilenameTextResource = (filenameTextResourceKey?: string) => {
  const bpmnDetails = createPdfBpmnDetails({ filenameTextResourceKey });

  return renderWithProviders(<PdfFilenameTextResource />, {
    bpmnContextProps: { bpmnDetails },
    bpmnApiContextProps: { layoutSets: { sets: [] } },
  });
};
