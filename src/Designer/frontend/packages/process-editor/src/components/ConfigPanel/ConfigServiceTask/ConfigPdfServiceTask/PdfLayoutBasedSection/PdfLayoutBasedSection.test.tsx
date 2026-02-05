import React from 'react';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfLayoutBasedSection } from './PdfLayoutBasedSection';
import { createPdfBpmnDetails, renderWithProviders } from '../testUtils';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/useValidateLayoutSetName', () => ({
  useValidateLayoutSetName: () => ({
    validateLayoutSetName: (name: string) => {
      if (name === 'invalid-name') return 'Name is invalid';
      return undefined;
    },
  }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

describe('PdfLayoutBasedSection', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when layout set exists', () => {
    it('should show edit PDF button when layout set exists for current task', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
        },
      });

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_layout_set_link'),
        }),
      ).toBeInTheDocument();
    });

    it('should navigate to layout editor when clicking edit button', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
        },
      });

      const editButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_layout_set_link'),
      });
      await user.click(editButton);

      expect(mockNavigate).toHaveBeenCalledWith(
        '/test-org/test-app/ui-editor/layoutSet/pdf-layout-set',
      );
    });
  });

  describe('when no layout set exists', () => {
    it('should show create layout set form', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: { layoutSets: { sets: [] } },
      });

      expect(
        screen.getByLabelText(
          textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
        ),
      ).toBeInTheDocument();
    });

    it('should show data model selector', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      expect(
        screen.getByLabelText(
          textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
        ),
      ).toBeInTheDocument();
    });

    it('should display available data models as options', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);

      expect(screen.getByRole('option', { name: 'dataModel1' })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'dataModel2' })).toBeInTheDocument();
    });

    it('should show empty state when no data models are available', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: [],
        },
      });

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);

      expect(
        screen.getByText(textMock('process_editor.configuration_panel_pdf_no_data_models')),
      ).toBeInTheDocument();
    });

    it('should have create button disabled initially', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1'],
        },
      });

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      expect(createButton).toBeDisabled();
    });

    it('should disable create button when layout set name is empty', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1'],
        },
      });

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));
      await user.keyboard('{Escape}');

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      expect(createButton).toBeDisabled();
    });

    it('should disable create button when data model is not selected', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1'],
        },
      });

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'my-pdf-layout');

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      expect(createButton).toBeDisabled();
    });

    it('should disable create button when layout set name has validation error', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1'],
        },
      });

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'invalid-name');

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));
      await user.keyboard('{Escape}');

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      expect(createButton).toBeDisabled();
    });

    it('should enable create button when both name and data model are provided', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });

      expect(createButton).toBeDisabled();

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'my-pdf-layout');

      expect(createButton).toBeDisabled();

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));

      await waitFor(() => expect(createButton).not.toBeDisabled());
    });

    it('should call addLayoutSet when clicking create button with valid inputs', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const addLayoutSetMock = jest.fn();

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1', 'dataModel2'],
          addLayoutSet: addLayoutSetMock,
        },
      });

      const layoutSetNameInput = screen.getByLabelText(
        textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
      );
      await user.type(layoutSetNameInput, 'my-pdf-layout');

      const dataModelCombobox = screen.getByRole('combobox', {
        name: textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
      });
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1' }));

      const createButton = await screen.findByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });
      await waitFor(() => expect(createButton).not.toBeDisabled());
      await user.click(createButton);

      await waitFor(() => expect(addLayoutSetMock).toHaveBeenCalledTimes(1));
      expect(addLayoutSetMock).toHaveBeenCalledWith({
        layoutSetIdToUpdate: 'my-pdf-layout',
        taskType: 'pdf',
        layoutSetConfig: {
          id: 'my-pdf-layout',
          dataType: 'dataModel1',
          tasks: [pdfBpmnDetails.id],
        },
      });
    });

    it('should not call addLayoutSet if validation fails when clicking create button', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const addLayoutSetMock = jest.fn();

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
          allDataModelIds: ['dataModel1'],
          addLayoutSet: addLayoutSetMock,
        },
      });

      const createButton = screen.getByRole('button', {
        name: textMock('process_editor.configuration_panel_pdf_create_button'),
      });

      await user.click(createButton);

      expect(addLayoutSetMock).not.toHaveBeenCalled();
    });
  });
});
