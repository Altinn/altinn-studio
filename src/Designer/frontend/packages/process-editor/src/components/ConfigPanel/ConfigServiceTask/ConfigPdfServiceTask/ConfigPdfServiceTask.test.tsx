import { screen } from '@studio/ui-test';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigPdfServiceTask } from './ConfigPdfServiceTask';
import { createPdfBpmnDetails } from './testUtils';
import { renderWithProviders } from '../../../../../test/renderWithProviders';

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => {
  return {
    StudioModeler: jest.fn().mockImplementation(() => {
      return {
        getElementsByType: jest.fn(() => []),
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

describe('ConfigPdfServiceTask', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('PDF mode radio group', () => {
    it('should render PDF mode radio group with automatic and layout-based options', () => {
      renderConfigPdfServiceTask();

      expect(
        screen.getFieldsetByLegend(textMock('process_editor.configuration_panel_pdf_mode')),
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
      renderConfigPdfServiceTask();

      const automaticRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_automatic'),
      });
      expect(automaticRadio).toBeChecked();
    });

    it('should default to layout-based mode when a layout set exists for the task', () => {
      renderConfigPdfServiceTask({ withLayoutSet: true });

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      expect(layoutBasedRadio).toBeChecked();
    });

    it('should switch from automatic to layout-based mode when clicking layout-based radio', async () => {
      const user = userEvent.setup();

      renderConfigPdfServiceTask();

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
      const deleteLayoutSetMock = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(true);

      renderConfigPdfServiceTask({
        withLayoutSet: true,
        contextProps: {
          bpmnApiContextProps: {
            deleteLayoutSet: deleteLayoutSetMock,
          },
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
      const deleteLayoutSetMock = jest.fn();
      jest.spyOn(window, 'confirm').mockReturnValue(false);

      renderConfigPdfServiceTask({
        withLayoutSet: true,
        contextProps: {
          bpmnApiContextProps: {
            deleteLayoutSet: deleteLayoutSetMock,
          },
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
      const confirmSpy = jest.spyOn(window, 'confirm');

      renderConfigPdfServiceTask();

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

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
      renderConfigPdfServiceTask();

      expect(screen.getByRole('textbox')).toBeInTheDocument();
    });

    it('should render PdfLayoutBasedSection when in layout-based mode', async () => {
      const user = userEvent.setup();

      renderConfigPdfServiceTask();

      const layoutBasedRadio = screen.getByRole('radio', {
        name: textMock('process_editor.configuration_panel_pdf_mode_layout_based'),
      });
      await user.click(layoutBasedRadio);

      expect(
        screen.getByLabelText(
          textMock('process_editor.configuration_panel_pdf_select_data_model_label'),
        ),
      ).toBeInTheDocument();
    });

    it('should render FilenameTextResource component', () => {
      renderConfigPdfServiceTask();

      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_pdf_filename_label'),
        }),
      ).toBeInTheDocument();
    });
  });
});

type RenderOptions = {
  withLayoutSet?: boolean;
  contextProps?: Parameters<typeof renderWithProviders>[1];
};

const renderConfigPdfServiceTask = (options: RenderOptions = {}) => {
  const { withLayoutSet = false, contextProps = {} } = options;
  const bpmnDetails = createPdfBpmnDetails();

  return renderWithProviders(<ConfigPdfServiceTask />, {
    ...contextProps,
    bpmnContextProps: {
      bpmnDetails,
      ...contextProps?.bpmnContextProps,
    },
    bpmnApiContextProps: {
      layoutSets: withLayoutSet
        ? [
            {
              id: 'pdf-layout-set',
              taskId: bpmnDetails.id,
            },
          ]
        : [],
      ...contextProps?.bpmnApiContextProps,
    },
  });
};
