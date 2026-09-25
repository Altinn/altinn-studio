import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { PdfLayoutBasedSection } from './PdfLayoutBasedSection';
import { createPdfBpmnDetails } from '../testUtils';
import { renderWithProviders } from '../../../../../../test/renderWithProviders';

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const getDataModelSuggestion = (): HTMLElement =>
  screen.getByLabelText(textMock('process_editor.configuration_panel_pdf_select_data_model_label'));

const getCreateButton = (): HTMLElement =>
  screen.getByRole('button', {
    name: textMock('process_editor.configuration_panel_pdf_create_button'),
  });

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
          layoutSets: [
            {
              id: 'pdf-layout-set',
              taskId: pdfBpmnDetails.id,
            },
          ],
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
          layoutSets: [
            {
              id: 'pdf-layout-set',
              taskId: pdfBpmnDetails.id,
            },
          ],
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

    it('should recognise a layout set named after the task', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [{ id: pdfBpmnDetails.id, dataType: 'dataModel1' }],
        },
      });

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_layout_set_link'),
        }),
      ).toBeInTheDocument();
    });
  });

  describe('when no layout set exists', () => {
    it('should show data model selector', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [],
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      expect(getDataModelSuggestion()).toBeInTheDocument();
    });

    it('should display available data models as options', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [],
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      const dataModelCombobox = getDataModelSuggestion();
      await user.click(dataModelCombobox);

      expect(screen.getByRole('option', { name: 'dataModel1', hidden: true })).toBeInTheDocument();
      expect(screen.getByRole('option', { name: 'dataModel2', hidden: true })).toBeInTheDocument();
    });

    it('should show empty state when no data models are available', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [],
          allDataModelIds: [],
        },
      });

      const dataModelCombobox = getDataModelSuggestion();
      await user.click(dataModelCombobox);

      expect(
        screen.getByText(textMock('process_editor.configuration_panel_pdf_no_data_models')),
      ).toBeInTheDocument();
    });

    it('should enable create button once a data model is selected', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [],
          allDataModelIds: ['dataModel1', 'dataModel2'],
        },
      });

      expect(getCreateButton()).toBeDisabled();

      const dataModelCombobox = getDataModelSuggestion();
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1', hidden: true }));

      await waitFor(() => expect(getCreateButton()).not.toBeDisabled());
    });

    it('should create the layout set under the task own id', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const addLayoutSetMock = jest.fn();

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [],
          allDataModelIds: ['dataModel1', 'dataModel2'],
          addLayoutSet: addLayoutSetMock,
        },
      });

      const dataModelCombobox = getDataModelSuggestion();
      await user.click(dataModelCombobox);
      await user.click(screen.getByRole('option', { name: 'dataModel1', hidden: true }));

      await waitFor(() => expect(getCreateButton()).not.toBeDisabled());
      await user.click(getCreateButton());

      await waitFor(() => expect(addLayoutSetMock).toHaveBeenCalledTimes(1));
      expect(addLayoutSetMock).toHaveBeenCalledWith({
        taskType: 'pdf',
        layoutSetConfig: {
          id: pdfBpmnDetails.id,
          dataType: 'dataModel1',
          taskId: pdfBpmnDetails.id,
        },
      });
    });

    it('should not call addLayoutSet when no data model is selected', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const addLayoutSetMock = jest.fn();

      renderWithProviders(<PdfLayoutBasedSection />, {
        bpmnContextProps: { bpmnDetails: pdfBpmnDetails },
        bpmnApiContextProps: {
          layoutSets: [],
          allDataModelIds: ['dataModel1'],
          addLayoutSet: addLayoutSetMock,
        },
      });

      await user.click(getCreateButton());

      expect(addLayoutSetMock).not.toHaveBeenCalled();
    });
  });
});
