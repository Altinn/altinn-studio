import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import type { BpmnApiContextProps } from '../../../../contexts/BpmnApiContext';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { BpmnTypeEnum } from '../../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { ConfigSubformPdfServiceTask } from './ConfigSubformPdfServiceTask';

const updateModdleProperties = jest.fn((properties: object, element: object) =>
  Object.assign(element, properties),
);

const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) =>
      updateModdleProperties(...(args as [object, object])),
    createElement: jest.fn(),
  })),
}));

const taskId = mockBpmnDetails.id;
const componentId = 'subform-mopeder';
const subformDataTypeId = 'moped';

const componentIdLabel = textMock(
  'process_editor.configuration_panel_subform_pdf_component_id_label',
);
const requiredError = textMock('validation_errors.required');

describe('ConfigSubformPdfServiceTask', () => {
  afterEach(jest.clearAllMocks);

  describe('the component picker', () => {
    it('offers each component that opens a single subform with a default data type once', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask({
        subformComponents: [original, copyOnTaskPages, ...ambiguousComponents, brokenComponent],
      });

      await user.click(getComponentIdField());

      const options = await screen.findAllByRole('option', { name: componentId, hidden: true });
      expect(options).toHaveLength(1);
      expect(
        screen.queryByRole('option', { name: ambiguousComponentId, hidden: true }),
      ).not.toBeInTheDocument();
      expect(
        screen.queryByRole('option', { name: brokenComponent.componentId, hidden: true }),
      ).not.toBeInTheDocument();
    });

    it('asks for a Subform component in Utforming when the app has none', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask({ subformComponents: [] });

      await user.click(getComponentIdField());

      expect(
        await screen.findByText(
          textMock('process_editor.configuration_panel_subform_pdf_no_component_to_select'),
        ),
      ).toBeInTheDocument();
    });

    it('writes the component and the data type of its subform in one update', async () => {
      const user = userEvent.setup();
      const { subformPdfConfig } = renderConfigSubformPdfServiceTask();

      await selectComponent(user, componentId);

      await waitFor(() => expect(updateModdleProperties).toHaveBeenCalledTimes(1));
      expect(updateModdleProperties).toHaveBeenCalledWith(
        { subformComponentId: componentId, subformDataTypeId },
        subformPdfConfig,
      );
    });

    it('copies the chosen component to the task pages from the original', async () => {
      const user = userEvent.setup();
      const { saveSubformPdfComponent } = renderConfigSubformPdfServiceTask({
        subformComponents: [copyOnTaskPages, original],
      });

      await selectComponent(user, componentId);

      await waitFor(() => expect(saveSubformPdfComponent).toHaveBeenCalledTimes(1));
      expect(saveSubformPdfComponent).toHaveBeenCalledWith(org, app, taskId, {
        componentId,
        sourceLayoutSetId: original.layoutSetId,
      });
    });

    it('clears the data type along with the component', async () => {
      const user = userEvent.setup();
      const { subformPdfConfig, saveSubformPdfComponent } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId },
      });
      const input = getComponentIdField();
      await waitFor(() => expect(input).toHaveValue(componentId));

      await user.clear(input);
      await user.tab();

      await waitFor(() =>
        expect(updateModdleProperties).toHaveBeenCalledWith(
          { subformComponentId: undefined, subformDataTypeId: undefined },
          subformPdfConfig,
        ),
      );
      expect(saveSubformPdfComponent).not.toHaveBeenCalled();
    });

    it('says nothing about the required component until it is touched', () => {
      renderConfigSubformPdfServiceTask();

      expect(screen.queryByText(requiredError)).not.toBeInTheDocument();
    });

    it('reports the component as required once it is left empty', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask();

      await user.click(getComponentIdField());
      await user.tab();

      expect(await screen.findByText(requiredError)).toBeInTheDocument();
    });
  });

  describe('the status', () => {
    // A picker showing an id it does not offer filters out every option after mounting and
    // re-renders, so these tests wait for that instead of asserting right after the render.
    it('reports a component id that no component in the app has', async () => {
      renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: 'RemovedTable', subformDataTypeId },
      });

      expect(
        await screen.findByText(
          textMock('process_editor.configuration_panel_subform_pdf_component_not_found', {
            componentId: 'RemovedTable',
          }),
        ),
      ).toBeInTheDocument();
    });

    it('reports a component id that components opening different subforms share', async () => {
      renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: ambiguousComponentId, subformDataTypeId },
        subformComponents: ambiguousComponents,
      });

      expect(
        await screen.findByText(
          textMock('process_editor.configuration_panel_subform_pdf_component_ambiguous', {
            componentId: ambiguousComponentId,
          }),
        ),
      ).toBeInTheDocument();
    });

    it('reports a component whose subform has no default data type', async () => {
      renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: brokenComponent.componentId },
        subformComponents: [brokenComponent],
      });

      expect(
        await screen.findByText(
          textMock('process_editor.configuration_panel_subform_pdf_subform_data_type_missing', {
            componentId: brokenComponent.componentId,
          }),
        ),
      ).toBeInTheDocument();
    });

    it('corrects a data type that differs from the one the subform stores its entries in', async () => {
      const user = userEvent.setup();
      const { subformPdfConfig } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId: 'bicycle' },
        subformComponents: [original, copyOnTaskPages],
      });
      expect(
        screen.getByText(
          textMock('process_editor.configuration_panel_subform_pdf_data_type_mismatch', {
            componentId,
          }),
        ),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_subform_pdf_data_type_fix_button'),
        }),
      );

      expect(updateModdleProperties).toHaveBeenCalledWith({ subformDataTypeId }, subformPdfConfig);
    });

    it('creates the task pages with the copy when the task has no pages', async () => {
      const user = userEvent.setup();
      const { saveSubformPdfComponent } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId },
        layoutSets: [dataTaskPages],
      });
      expect(
        screen.getByText(
          textMock('process_editor.configuration_panel_subform_pdf_pages_missing', {
            componentId,
          }),
        ),
      ).toBeInTheDocument();

      await user.click(
        screen.getByRole('button', {
          name: textMock('process_editor.configuration_panel_subform_pdf_pages_create_button'),
        }),
      );

      expect(saveSubformPdfComponent).toHaveBeenCalledWith(org, app, taskId, {
        componentId,
        sourceLayoutSetId: original.layoutSetId,
      });
    });

    it('adds the copy when the task pages lack it', async () => {
      const user = userEvent.setup();
      const { saveSubformPdfComponent } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId },
      });
      expect(screen.getByText(componentCopyMissingText)).toBeInTheDocument();

      await user.click(getCreateComponentCopyButton());

      expect(saveSubformPdfComponent).toHaveBeenCalledWith(org, app, taskId, {
        componentId,
        sourceLayoutSetId: original.layoutSetId,
      });
    });

    it('offers to design the task once the saved copy is in place', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId },
        savedSubformComponents: [original, copyOnTaskPages],
      });

      await user.click(getCreateComponentCopyButton());

      expect(await screen.findByRole('button', { name: designTaskButtonName })).toBeInTheDocument();
      expect(screen.queryByText(componentCopyMissingText)).not.toBeInTheDocument();
    });

    it('opens the task pages in Utforming when the developer designs the task', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask();

      await user.click(screen.getByRole('button', { name: designTaskButtonName }));

      expect(mockNavigate).toHaveBeenCalledWith(`/${org}/${app}/ui-editor/layoutSet/${taskId}`);
    });

    it('writes nothing until the developer asks for it', () => {
      const { saveSubformPdfComponent } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId: 'bicycle' },
        layoutSets: [dataTaskPages],
      });

      expect(updateModdleProperties).not.toHaveBeenCalled();
      expect(saveSubformPdfComponent).not.toHaveBeenCalled();
    });
  });
});

const designTaskButtonName = textMock(
  'process_editor.configuration_panel_subform_pdf_design_task_button',
);
const componentCopyMissingText = textMock(
  'process_editor.configuration_panel_subform_pdf_component_copy_missing',
  { componentId },
);

const original: SubformComponent = {
  componentId,
  layoutSetId: 'Task_1',
  layoutName: 'utfylling',
  subformLayoutSetId: 'moped-subform',
  subformDataTypeId,
};
const copyOnTaskPages: SubformComponent = {
  ...original,
  layoutSetId: taskId,
  layoutName: 'ServiceTask',
};
const ambiguousComponentId = 'subform-vehicles';
const ambiguousComponents: SubformComponent[] = [
  { ...original, componentId: ambiguousComponentId },
  {
    ...original,
    componentId: ambiguousComponentId,
    layoutSetId: 'Task_3',
    subformLayoutSetId: 'car',
  },
];
const brokenComponent: SubformComponent = {
  ...original,
  componentId: 'subform-broken',
  subformDataTypeId: null,
};

const dataTaskPages = { id: 'Task_1', dataType: 'model' };
const taskPages = { id: taskId, dataType: 'model' };

function getComponentIdField(): HTMLElement {
  return screen.getByRole('textbox', { name: componentIdLabel });
}

function getCreateComponentCopyButton(): HTMLElement {
  return screen.getByRole('button', {
    name: textMock('process_editor.configuration_panel_subform_pdf_component_copy_create_button'),
  });
}

async function selectComponent(
  user: ReturnType<typeof userEvent.setup>,
  subformComponentId: string,
): Promise<void> {
  const input = getComponentIdField();
  await user.click(input);
  await user.type(input, `${subformComponentId}{Enter}`);
}

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
  subformComponents?: SubformComponent[];
  savedSubformComponents?: SubformComponent[];
  layoutSets?: LayoutSets;
};

const renderConfigSubformPdfServiceTask = ({
  subformPdfConfig = {},
  subformComponents = [original],
  savedSubformComponents = subformComponents,
  layoutSets = [dataTaskPages, taskPages],
}: RenderProps = {}) => {
  const taskExtension = {
    $type: 'altinn:TaskExtension',
    taskType: 'subformPdf',
    subformPdfConfig,
  } as unknown as ModdleElement;
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: createSubformPdfDetails(taskExtension),
  };
  const bpmnApiContextProps: Partial<BpmnApiContextProps> = { layoutSets };
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.SubformComponents, org, app], subformComponents);
  const saveSubformPdfComponent = jest.fn().mockResolvedValue(savedSubformComponents);

  renderWithProviders(<ConfigSubformPdfServiceTask />, {
    bpmnContextProps,
    bpmnApiContextProps,
    queries: { saveSubformPdfComponent },
    queryClient,
  });

  return { subformPdfConfig, saveSubformPdfComponent };
};
