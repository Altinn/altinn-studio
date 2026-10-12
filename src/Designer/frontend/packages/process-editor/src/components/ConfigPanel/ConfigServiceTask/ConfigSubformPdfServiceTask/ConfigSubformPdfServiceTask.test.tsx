import { afterEach, describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { app, org } from '@studio/testing/testids';
import { createQueryClientMock } from 'app-shared/mocks/queryClientMock';
import { QueryKey } from 'app-shared/types/QueryKey';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import type { SubformComponent } from 'app-shared/types/api/SubformComponent';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { ConfigSubformPdfServiceTask } from './ConfigSubformPdfServiceTask';

const mockNavigate = vi.fn();
vi.mock('react-router-dom', async () => ({
  ...(await vi.importActual('react-router-dom')),
  useNavigate: () => mockNavigate,
}));

const taskId = mockBpmnDetails.id;
const componentId = 'subform-mopeder';
const subformDataTypeId = 'moped';

const componentIdLabel = textMock(
  'process_editor.configuration_panel_subform_pdf_component_id_label',
);
const requiredError = textMock('validation_errors.required');

describe('ConfigSubformPdfServiceTask', () => {
  afterEach(vi.clearAllMocks);

  describe('the component picker', () => {
    it('lists each valid source component once', async () => {
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

    it('prompts the user to add a Subform component when none exist', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask({ subformComponents: [] });

      await user.click(getComponentIdField());

      expect(
        await screen.findByText(
          textMock('process_editor.configuration_panel_subform_pdf_no_component_to_select'),
        ),
      ).toBeInTheDocument();
    });

    it('saves the selection and generated copy through the BPMN save', async () => {
      const user = userEvent.setup();
      const { saveBpmn, emitCommandStackChanged, saveSubformPdfComponent } =
        renderConfigSubformPdfServiceTask({ subformComponents: [copyOnTaskPages, original] });

      await selectComponent(user, componentId);
      await act(async () => emitCommandStackChanged());

      expect(getComponentIdField()).toHaveValue(componentId);
      expect(saveBpmn).toHaveBeenCalledWith(
        expect.stringContaining(
          `<altinn:subformComponentId>${componentId}</altinn:subformComponentId>`,
        ),
        {
          subformPdfComponentChange: {
            taskId,
            componentId,
            sourceLayoutSetId: original.layoutSetId,
          },
        },
      );
      expect(saveBpmn.mock.calls[0][0]).toContain(
        `<altinn:subformDataTypeId>${subformDataTypeId}</altinn:subformDataTypeId>`,
      );
      expect(saveSubformPdfComponent).not.toHaveBeenCalled();
    });

    it('includes the previous component when switching the selection', async () => {
      const user = userEvent.setup();
      const previousComponentId = 'previous-subform';
      const { saveBpmn, emitCommandStackChanged } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: previousComponentId, subformDataTypeId },
        subformComponents: [original, { ...original, componentId: previousComponentId }],
      });
      const input = getComponentIdField();
      await waitFor(() => expect(input).toHaveValue(previousComponentId));

      await user.click(input);
      await user.clear(input);
      await clickComponentOption(user, componentId);
      await act(async () => emitCommandStackChanged());

      expect(saveBpmn).toHaveBeenCalledWith(expect.any(String), {
        subformPdfComponentChange: {
          taskId,
          componentId,
          sourceLayoutSetId: original.layoutSetId,
          previousComponentId,
        },
      });
    });

    it('disables the selector while the BPMN save is pending', () => {
      renderConfigSubformPdfServiceTask({ pendingApiOperations: true });

      expect(getComponentIdField()).toBeDisabled();
    });

    it('clears the data type and removes the previous copy in one save', async () => {
      const user = userEvent.setup();
      const { saveBpmn, emitCommandStackChanged, saveSubformPdfComponent } =
        renderConfigSubformPdfServiceTask({
          subformPdfConfig: { subformComponentId: componentId, subformDataTypeId },
        });
      const input = getComponentIdField();
      await waitFor(() => expect(input).toHaveValue(componentId));

      await user.clear(input);
      await user.tab();
      await act(async () => emitCommandStackChanged());

      expect(saveBpmn).toHaveBeenCalledWith(expect.any(String), {
        subformPdfComponentChange: { taskId, componentId: null, previousComponentId: componentId },
      });
      expect(saveBpmn.mock.calls[0][0]).not.toContain('<altinn:subformComponentId>');
      expect(saveBpmn.mock.calls[0][0]).not.toContain('<altinn:subformDataTypeId>');
      expect(saveSubformPdfComponent).not.toHaveBeenCalled();
    });

    it('hides the required component error until the field is touched', () => {
      renderConfigSubformPdfServiceTask();

      expect(screen.queryByText(requiredError)).not.toBeInTheDocument();
    });

    it('shows the required component error when the field is cleared', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask();

      await user.click(getComponentIdField());
      await user.tab();

      expect(await screen.findByText(requiredError)).toBeInTheDocument();
    });
  });

  describe('the status', () => {
    // Wait for the picker to update its options when the selected ID is missing from the list.
    it('reports a missing source component', async () => {
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

    it('reports a component ID shared by different subforms', async () => {
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

    it('repairs a task data type that does not match the subform', async () => {
      const user = userEvent.setup();
      const { saveXml } = renderConfigSubformPdfServiceTask({
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

      expect(await saveXml()).toContain(
        `<altinn:subformDataTypeId>${subformDataTypeId}</altinn:subformDataTypeId>`,
      );
    });

    it('creates missing task pages with a component copy', async () => {
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

    it('adds a missing component copy to the task pages', async () => {
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

    it('enables page editing when the component copy is saved', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId },
        savedSubformComponents: [original, copyOnTaskPages],
      });

      await user.click(getCreateComponentCopyButton());

      expect(await screen.findByRole('button', { name: designTaskButtonName })).toBeInTheDocument();
      expect(screen.queryByText(componentCopyMissingText)).not.toBeInTheDocument();
    });

    it('opens the task pages when the user selects the edit action', async () => {
      const user = userEvent.setup();
      renderConfigSubformPdfServiceTask();

      await user.click(screen.getByRole('button', { name: designTaskButtonName }));

      expect(mockNavigate).toHaveBeenCalledWith(`/${org}/${app}/ui-editor/layoutSet/${taskId}`);
    });

    it('disables page editing until the task pages exist', () => {
      renderConfigSubformPdfServiceTask({ layoutSets: [dataTaskPages] });

      expect(screen.queryByRole('button', { name: designTaskButtonName })).not.toBeInTheDocument();
    });

    it('does not change configuration without user input', () => {
      const { modeling, saveSubformPdfComponent } = renderConfigSubformPdfServiceTask({
        subformPdfConfig: { subformComponentId: componentId, subformDataTypeId: 'bicycle' },
        layoutSets: [dataTaskPages],
      });

      expect(modeling.updateModdleProperties).not.toHaveBeenCalled();
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
  taskType: 'subformPdf',
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
  return screen.getByLabelText(componentIdLabel, { selector: 'input', exact: false });
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
  await user.click(getComponentIdField());
  await clickComponentOption(user, subformComponentId);
}

async function clickComponentOption(
  user: ReturnType<typeof userEvent.setup>,
  subformComponentId: string,
): Promise<void> {
  await user.click(await screen.findByRole('option', { name: subformComponentId, hidden: true }));
}

type RenderProps = {
  subformPdfConfig?: object;
  subformComponents?: SubformComponent[];
  savedSubformComponents?: SubformComponent[];
  layoutSets?: LayoutSets;
  pendingApiOperations?: boolean;
};

const renderConfigSubformPdfServiceTask = ({
  subformPdfConfig = {},
  subformComponents = [original],
  savedSubformComponents = subformComponents,
  layoutSets = [dataTaskPages, taskPages],
  pendingApiOperations = false,
}: RenderProps = {}) => {
  const saveBpmn = vi.fn().mockResolvedValue(undefined);
  const fixture = createBpmnTestModeler(
    'bpmn:ServiceTask',
    { id: taskId },
    { layoutSets, pendingApiOperations, saveBpmn },
  );
  const { moddle, businessObject, Wrapper } = fixture;
  businessObject.extensionElements = moddle.create('bpmn:ExtensionElements', {
    values: [
      moddle.create('altinn:TaskExtension', {
        taskType: 'subformPdf',
        subformPdfConfig: moddle.create('altinn:SubformPdfConfig', subformPdfConfig),
      }),
    ],
  });
  const queryClient = createQueryClientMock();
  queryClient.setQueryData([QueryKey.SubformComponents, org, app], subformComponents);
  const saveSubformPdfComponent = vi.fn().mockResolvedValue(savedSubformComponents);

  const { unmount } = renderWithProviders(
    <Wrapper>
      <ConfigSubformPdfServiceTask />
    </Wrapper>,
    {
      queries: { saveSubformPdfComponent },
      queryClient,
    },
  );

  return { ...fixture, saveBpmn, saveSubformPdfComponent, unmount };
};
