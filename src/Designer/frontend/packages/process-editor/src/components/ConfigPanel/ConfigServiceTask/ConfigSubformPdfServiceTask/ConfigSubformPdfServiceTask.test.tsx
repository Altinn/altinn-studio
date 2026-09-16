import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { FormLayoutsResponse } from 'app-shared/types/api/FormLayoutsResponse';
import { ComponentType } from 'app-shared/types/ComponentType';
import type { BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { ConfigSubformPdfServiceTask } from './ConfigSubformPdfServiceTask';

// The write has to land in the config node the panel reads from, or nothing the developer does
// comes back out of the panel and the controlled fields cannot be exercised at all.
const updateModdleProperties = jest.fn((properties: object, element: object) =>
  Object.assign(element, properties),
);

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) =>
      updateModdleProperties(...(args as [object, object])),
    createElement: jest.fn(),
  })),
}));

const subformDataType = 'subform-data';
const subformLayoutSetId = 'my-subform';
const subformComponentIdInLayout = 'TheSubformTable';
const subformComponentIdInDataTask = 'SubformTableInTheDataTask';
const taskLayoutSetId = mockBpmnDetails.id;

const componentIdLabel = textMock(
  'process_editor.configuration_panel_subform_pdf_component_id_label',
);
const dataTypeLabel = textMock('process_editor.configuration_panel_subform_pdf_data_type_label');
const requiredError = textMock('validation_errors.required');

describe('ConfigSubformPdfServiceTask', () => {
  afterEach(jest.clearAllMocks);

  it('saves the subform data type the developer picks', async () => {
    const user = userEvent.setup();
    const { subformPdfConfig } = renderConfigSubformPdfServiceTask({
      availableDataTypeIds: [subformDataType, 'other-data'],
    });

    const input = screen.getByRole('textbox', { name: dataTypeLabel });
    await user.click(input);
    await user.type(input, `${subformDataType}{Enter}`);

    await waitFor(() =>
      expect(updateModdleProperties).toHaveBeenCalledWith(
        { subformDataTypeId: subformDataType },
        subformPdfConfig,
      ),
    );
  });

  it('offers the data type the task already points at, even when the app no longer has it', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask({
      subformPdfConfig: { subformDataTypeId: 'removed-data' },
      availableDataTypeIds: ['other-data'],
    });

    await user.click(screen.getByRole('textbox', { name: dataTypeLabel }));

    expect(
      await screen.findByRole('option', { name: 'removed-data', hidden: true }),
    ).toBeInTheDocument();
  });

  it('says nothing about the required fields until they are touched', () => {
    renderConfigSubformPdfServiceTask();

    expect(screen.queryByText(requiredError)).not.toBeInTheDocument();
    expect(
      screen.getByText(textMock('process_editor.configuration_panel_subform_pdf_legend'), {
        exact: false,
      }),
    ).toBeInTheDocument();
  });

  it('reports the subform component id as required once it is left empty', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask();

    await user.click(screen.getByRole('textbox', { name: componentIdLabel }));
    await user.tab();

    expect(await screen.findByText(requiredError)).toBeInTheDocument();
  });

  it('reports the data type as required once it is left empty', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask({ availableDataTypeIds: [subformDataType] });

    await user.click(screen.getByRole('textbox', { name: dataTypeLabel }));
    await user.tab();

    expect(await screen.findByText(requiredError)).toBeInTheDocument();
  });

  // Suggestion treats an undefined `selected` as uncontrolled and keeps showing its own selection,
  // so a cleared field would go on displaying the data type the task no longer points at.
  it('empties the field when the developer clears the data type', async () => {
    const user = userEvent.setup();
    const { subformPdfConfig } = renderConfigSubformPdfServiceTask({
      subformPdfConfig: { subformDataTypeId: subformDataType },
      availableDataTypeIds: [subformDataType],
    });

    const input = screen.getByRole('textbox', { name: dataTypeLabel });
    await waitFor(() => expect(input).toHaveValue(subformDataType));

    await user.clear(input);
    await user.tab();

    await waitFor(() =>
      expect(updateModdleProperties).toHaveBeenCalledWith(
        { subformDataTypeId: undefined },
        subformPdfConfig,
      ),
    );
    await waitFor(() => expect(input).toHaveValue(''));
  });

  describe('the subform component id', () => {
    // The id is required, and Studio can only derive the candidates when the task has a layout set
    // of its own, which nothing creates for it. Typing has to work in every state.
    it('saves an id the developer types that no layout offers', async () => {
      const user = userEvent.setup();
      const { subformPdfConfig } = renderConfigSubformPdfServiceTask();

      await user.type(
        screen.getByRole('textbox', { name: componentIdLabel }),
        'HandTypedTable{Enter}',
      );

      await waitFor(() =>
        expect(updateModdleProperties).toHaveBeenCalledWith(
          { subformComponentId: 'HandTypedTable' },
          subformPdfConfig,
        ),
      );
    });

    // Whitespace would make the id miss the component it names.
    it('trims the typed component id in the field as well as in the bpmn', async () => {
      const user = userEvent.setup();
      const { subformPdfConfig } = renderConfigSubformPdfServiceTask();

      const input = screen.getByRole('textbox', { name: componentIdLabel });
      await user.type(input, '  HandTypedTable  {Enter}');

      await waitFor(() =>
        expect(updateModdleProperties).toHaveBeenCalledWith(
          { subformComponentId: 'HandTypedTable' },
          subformPdfConfig,
        ),
      );
      await waitFor(() => expect(input).toHaveValue('HandTypedTable'));
    });

    it('empties the field when the developer clears the chosen component', async () => {
      const user = userEvent.setup();
      const { subformPdfConfig } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: {
          subformDataTypeId: subformDataType,
          subformComponentId: subformComponentIdInLayout,
        },
      });

      const input = screen.getByRole('textbox', { name: componentIdLabel });
      await waitFor(() => expect(input).toHaveValue(subformComponentIdInLayout));

      await user.clear(input);
      await user.tab();

      await waitFor(() =>
        expect(updateModdleProperties).toHaveBeenCalledWith(
          { subformComponentId: undefined },
          subformPdfConfig,
        ),
      );
      await waitFor(() => expect(input).toHaveValue(''));
    });

    // The picker and the create affordance are two halves of one thing: the candidates are the
    // Subform components in the task own layout set, so with no layout set there is nothing to
    // offer and the panel has to point at the way out.
    it('offers to create the task pages when it has none to take candidates from', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformDataTypeId: subformDataType },
        layoutSets: allLayoutSets.filter((layoutSet) => layoutSet.id !== taskLayoutSetId),
      });

      await user.click(screen.getByRole('textbox', { name: componentIdLabel }));

      expect(
        await screen.findByText(
          textMock('process_editor.configuration_panel_subform_pdf_no_component_to_select'),
        ),
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_subform_pdf_pages_create_button'),
        }),
      ).toBeInTheDocument();
    });

    describe('when the data type points at a subform in the app', () => {
      it('offers the subform components in the task own layout set that store that data type', async () => {
        const user = userEvent.setup();
        renderConfigSubformPdfServiceTask({
          subformPdfConfig: { subformDataTypeId: subformDataType },
        });

        await user.click(screen.getByRole('textbox', { name: componentIdLabel }));

        expect(
          await screen.findByRole('option', { name: subformComponentIdInLayout, hidden: true }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole('option', { name: 'AnInput', hidden: true }),
        ).not.toBeInTheDocument();
        expect(
          screen.queryByRole('option', { name: 'AnotherSubformTable', hidden: true }),
        ).not.toBeInTheDocument();
      });

      // The runtime resolves the id in the ui folder named after the pdf task. A Subform component
      // in a data task's folder is the most natural thing to pick and the app cannot find it.
      it('does not offer a subform component that lives in another task layout set', async () => {
        const user = userEvent.setup();
        renderConfigSubformPdfServiceTask({
          subformPdfConfig: { subformDataTypeId: subformDataType },
        });

        await user.click(screen.getByRole('textbox', { name: componentIdLabel }));

        expect(
          await screen.findByRole('option', { name: subformComponentIdInLayout, hidden: true }),
        ).toBeInTheDocument();
        expect(
          screen.queryByRole('option', { name: subformComponentIdInDataTask, hidden: true }),
        ).not.toBeInTheDocument();
      });

      it('saves the subform component the developer picks', async () => {
        const user = userEvent.setup();
        const { subformPdfConfig } = renderConfigSubformPdfServiceTask({
          subformPdfConfig: { subformDataTypeId: subformDataType },
        });

        const input = screen.getByRole('textbox', { name: componentIdLabel });
        await user.click(input);
        await user.type(input, `${subformComponentIdInLayout}{Enter}`);

        await waitFor(() =>
          expect(updateModdleProperties).toHaveBeenCalledWith(
            { subformComponentId: subformComponentIdInLayout },
            subformPdfConfig,
          ),
        );
      });

      it('offers the component the task already points at, even when no layout has it', async () => {
        const user = userEvent.setup();
        renderConfigSubformPdfServiceTask({
          subformPdfConfig: {
            subformDataTypeId: subformDataType,
            subformComponentId: 'RemovedSubformTable',
          },
        });

        await user.click(screen.getByRole('textbox', { name: componentIdLabel }));

        expect(
          await screen.findByRole('option', { name: 'RemovedSubformTable', hidden: true }),
        ).toBeInTheDocument();
      });
    });
  });
});

const allLayoutSets: LayoutSets = [
  { id: taskLayoutSetId, dataType: 'model' },
  { id: 'Task_1', dataType: 'model', taskId: 'Task_1' },
  { id: subformLayoutSetId, dataType: subformDataType, type: 'subform' },
  { id: 'another-subform', dataType: 'other-subform-data', type: 'subform' },
];

const layoutsByLayoutSetId: Record<string, FormLayoutsResponse> = {
  [taskLayoutSetId]: createLayouts([
    { id: 'AnInput', type: ComponentType.Input },
    { id: subformComponentIdInLayout, type: ComponentType.Subform, layoutSet: subformLayoutSetId },
    { id: 'AnotherSubformTable', type: ComponentType.Subform, layoutSet: 'another-subform' },
  ]),
  Task_1: createLayouts([
    {
      id: subformComponentIdInDataTask,
      type: ComponentType.Subform,
      layoutSet: subformLayoutSetId,
    },
  ]),
};

function createLayouts(layout: object[]): FormLayoutsResponse {
  return { Side1: { data: { layout } } } as unknown as FormLayoutsResponse;
}

const getFormLayouts = jest.fn((_org: string, _app: string, layoutSetName: string) =>
  Promise.resolve(layoutsByLayoutSetId[layoutSetName] ?? ({} as FormLayoutsResponse)),
);

const createSubformPdfDetails = (taskExtension: ModdleElement): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType: 'subformPdf',
  type: BpmnTypeEnum.ServiceTask,
  element: {
    ...mockBpmnDetails.element,
    businessObject: { extensionElements: { values: [taskExtension] } },
  },
});

type RenderProps = {
  subformPdfConfig?: object;
  availableDataTypeIds?: string[];
  layoutSets?: LayoutSets;
};

const renderConfigSubformPdfServiceTask = ({
  subformPdfConfig = {},
  availableDataTypeIds = [],
  layoutSets = allLayoutSets,
}: RenderProps = {}) => {
  const taskExtension = {
    $type: 'altinn:TaskExtension',
    taskType: 'subformPdf',
    subformPdfConfig,
  } as unknown as ModdleElement;
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: createSubformPdfDetails(taskExtension),
  };
  const bpmnApiContextProps: Partial<BpmnApiContextProps> = { availableDataTypeIds, layoutSets };

  renderWithProviders(<ConfigSubformPdfServiceTask />, {
    bpmnContextProps,
    bpmnApiContextProps,
    queries: { getFormLayouts },
  });

  return { subformPdfConfig };
};
