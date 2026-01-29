import React from 'react';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { createPdfBpmnDetails, renderWithProviders } from './testUtils';

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getAllTasksByType: jest.fn(() => []),
      };
    }),
  };
});

jest.mock('../../../../hooks/useUpdatePdfConfigTaskIds', () => ({
  useUpdatePdfConfigTaskIds: () => jest.fn(),
}));

jest.mock('app-shared/hooks/useStudioEnvironmentParams', () => ({
  useStudioEnvironmentParams: () => ({ org: 'test-org', app: 'test-app' }),
}));

jest.mock('app-shared/hooks/queries', () => ({
  useTextResourcesQuery: () => ({ data: { nb: [] } }),
}));

jest.mock('app-shared/hooks/mutations', () => ({
  useUpsertTextResourceMutation: () => ({ mutate: jest.fn() }),
}));

jest.mock('app-shared/hooks/useValidateLayoutSetName', () => ({
  useValidateLayoutSetName: () => ({
    validateLayoutSetName: () => undefined,
  }),
}));

describe('ConfigPdfServiceTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('version warnings', () => {
    it('should show warning when backendVersion is below minimum required version', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
          appVersion: {
            backendVersion: '8.0.0',
            frontendVersion: '4.25.2',
          },
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      expect(
        screen.getByText(
          textMock('process_editor.palette_pdf_service_task_version_error', {
            version: '8.9.0',
          }),
        ),
      ).toBeInTheDocument();
    });

    it('should show warning when frontendVersion is below minimum required version', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
          appVersion: {
            backendVersion: '8.9.0',
            frontendVersion: '4.0.0',
          },
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      expect(
        screen.getByText(
          textMock('process_editor.palette_pdf_service_task_frontend_version_error', {
            version: '4.25.2',
          }),
        ),
      ).toBeInTheDocument();
    });

    it('should not show version warning when both versions meet requirements', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
          appVersion: {
            backendVersion: '8.9.0',
            frontendVersion: '4.25.2',
          },
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      expect(
        screen.queryByText(
          textMock('process_editor.palette_pdf_service_task_version_error', {
            version: '8.9.0',
          }),
        ),
      ).not.toBeInTheDocument();

      expect(
        screen.queryByText(
          textMock('process_editor.palette_pdf_service_task_frontend_version_error', {
            version: '4.25.2',
          }),
        ),
      ).not.toBeInTheDocument();
    });
  });

  describe('PDF mode radio group', () => {
    it('should render PDF mode radio group with automatic and layout-based options', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      expect(
        screen.getByRole('group', {
          name: textMock('process_editor.configuration_panel_pdf_mode'),
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole('radio', {
          name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
        }),
      ).toBeInTheDocument();

      expect(
        screen.getByRole('radio', {
          name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
        }),
      ).toBeInTheDocument();
    });

    it('should default to automatic mode when no layout set exists for the task', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      expect(automaticRadio).toBeChecked();
    });

    it('should default to layout-based mode when a layout set exists for the task', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
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

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      expect(layoutBasedRadio).toBeChecked();
    });

    it('should switch from automatic to layout-based mode when clicking layout-based radio', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      expect(layoutBasedRadio).toBeChecked();
    });
  });

  describe('mode switching with layout set deletion', () => {
    it('should call deleteLayoutSet when switching from layout-based to automatic mode and confirming', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const deleteLayoutSetMock = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
          deleteLayoutSet: deleteLayoutSetMock,
        },
      });

      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      await user.click(automaticRadio);

      expect(window.confirm).toHaveBeenCalledWith(
        textMock('process_editor.configuration_panel_pdf_mode_change_to_automatic_confirm'),
      );
      expect(deleteLayoutSetMock).toHaveBeenCalledWith({ layoutSetIdToUpdate: 'pdf-layout-set' });
    });

    it('should not change mode when switching from layout-based to automatic mode and canceling', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const deleteLayoutSetMock = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: {
            sets: [
              {
                id: 'pdf-layout-set',
                tasks: [pdfBpmnDetails.id],
              },
            ],
          },
          deleteLayoutSet: deleteLayoutSetMock,
        },
      });

      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      await user.click(automaticRadio);

      expect(window.confirm).toHaveBeenCalled();
      expect(deleteLayoutSetMock).not.toHaveBeenCalled();

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      expect(layoutBasedRadio).toBeChecked();
    });

    it('should not show confirmation when switching to automatic mode without existing layout set', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});
      const confirmSpy = jest.spyOn(window, 'confirm');

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      // First switch to layout-based
      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      // Then switch back to automatic (no layout set was created)
      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      await user.click(automaticRadio);

      expect(confirmSpy).not.toHaveBeenCalled();
      expect(automaticRadio).toBeChecked();
    });
  });

  describe('renders child components', () => {
    it('should render PdfAutomaticTaskSelection when in automatic mode', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      // PdfAutomaticTaskSelection renders a combobox
      expect(screen.getByRole('combobox')).toBeInTheDocument();
    });

    it('should render PdfLayoutBasedSection when in layout-based mode', async () => {
      const user = userEvent.setup();
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      // PdfLayoutBasedSection renders layout set name input
      expect(
        screen.getByLabelText(
          textMock('process_editor.configuration_panel_pdf_layout_set_name_label'),
        ),
      ).toBeInTheDocument();
    });

    it('should render PdfFilenameTextResource component', () => {
      const pdfBpmnDetails = createPdfBpmnDetails({});

      renderConfigPdfServiceTask({
        bpmnContextProps: {
          bpmnDetails: pdfBpmnDetails,
        },
        bpmnApiContextProps: {
          layoutSets: { sets: [] },
        },
      });

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_filename_label'),
        }),
      ).toBeInTheDocument();
    });
  });
});

const renderConfigPdfServiceTask = (props: Parameters<typeof renderWithProviders>[1] = {}) => {
  return renderWithProviders(<ConfigPdfServiceTask />, props);
};
