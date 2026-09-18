import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { BpmnApiContextProps } from '../../../../../contexts/BpmnApiContext';
import { mockBpmnDetails } from '../../../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../../../test/renderWithProviders';
import { BpmnTypeEnum } from '../../../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../../../types/BpmnDetails';
import { SubformPdfLayoutSetSection } from './SubformPdfLayoutSetSection';

const dataModelId = 'model';
const taskId = mockBpmnDetails.id;

const createButtonName = textMock(
  'process_editor.configuration_panel_subform_pdf_pages_create_button',
);
const dataModelLabel = textMock(
  'process_editor.configuration_panel_subform_pdf_pages_data_model_label',
);

describe('SubformPdfLayoutSetSection', () => {
  afterEach(jest.clearAllMocks);

  it('creates the pages under the task own id', async () => {
    const user = userEvent.setup();
    const addLayoutSet = jest.fn();
    renderSubformPdfLayoutSetSection({ addLayoutSet, allDataModelIds: [dataModelId] });

    await user.click(screen.getByRole('textbox', { name: dataModelLabel }));
    await user.click(await screen.findByRole('option', { name: dataModelId, hidden: true }));
    await user.click(screen.getByRole('button', { name: createButtonName }));

    await waitFor(() => expect(addLayoutSet).toHaveBeenCalledTimes(1));
    expect(addLayoutSet).toHaveBeenCalledWith({
      taskType: 'subformPdf',
      layoutSetConfig: { id: taskId, dataType: dataModelId, taskId },
    });
  });

  it('reports the missing data model instead of creating pages without one', async () => {
    const user = userEvent.setup();
    const addLayoutSet = jest.fn();
    renderSubformPdfLayoutSetSection({ addLayoutSet, allDataModelIds: [dataModelId] });

    await user.click(screen.getByRole('button', { name: createButtonName }));

    expect(addLayoutSet).not.toHaveBeenCalled();
    expect(await screen.findByText(textMock('validation_errors.required'))).toBeInTheDocument();
  });

  it('says nothing about the data model before the developer asks to create the pages', () => {
    renderSubformPdfLayoutSetSection({ allDataModelIds: [dataModelId] });

    expect(screen.queryByText(textMock('validation_errors.required'))).not.toBeInTheDocument();
  });

  describe('when the task already has pages', () => {
    const layoutSets: LayoutSets = [{ id: taskId, dataType: dataModelId }];

    it('offers the designer instead of the create form', () => {
      renderSubformPdfLayoutSetSection({ layoutSets });

      expect(
        screen.getByRole('link', {
          name: textMock('process_editor.configuration_panel_subform_pdf_pages_link'),
        }),
      ).toHaveAttribute('href', expect.stringContaining(`/ui-editor/layoutSet/${taskId}`));
      expect(screen.queryByRole('button', { name: createButtonName })).not.toBeInTheDocument();
    });

    it('says the subform component still has to be added', () => {
      renderSubformPdfLayoutSetSection({ layoutSets });

      expect(
        screen.getByText(
          textMock('process_editor.configuration_panel_subform_pdf_pages_next_step'),
        ),
      ).toBeInTheDocument();
    });
  });
});

const subformPdfBpmnDetails: BpmnDetails = {
  ...mockBpmnDetails,
  taskType: 'subformPdf',
  type: BpmnTypeEnum.ServiceTask,
};

const renderSubformPdfLayoutSetSection = (
  bpmnApiContextProps: Partial<BpmnApiContextProps> = {},
): void => {
  renderWithProviders(<SubformPdfLayoutSetSection />, {
    bpmnContextProps: { bpmnDetails: subformPdfBpmnDetails },
    bpmnApiContextProps: { layoutSets: [], allDataModelIds: [], ...bpmnApiContextProps },
  });
};
