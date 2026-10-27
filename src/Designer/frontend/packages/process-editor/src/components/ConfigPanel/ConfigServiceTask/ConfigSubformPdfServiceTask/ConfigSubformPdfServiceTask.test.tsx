import { describe, expect, it, vi } from 'vitest';
import { act, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { LayoutSets } from 'app-shared/types/api/LayoutSetsResponse';
import { renderWithProviders } from '../../../../../test/renderWithProviders';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { ConfigSubformPdfServiceTask } from './ConfigSubformPdfServiceTask';

const subformUiFolder = 'vehicleSubform';
const otherSubformUiFolder = 'notesSubform';

const uiFolderLabel = textMock('process_editor.configuration_panel_subform_pdf_ui_folder_label');
const requiredError = textMock('validation_errors.required');

describe('ConfigSubformPdfServiceTask', () => {
  it('lists the subform UI folders and no other UI folders', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask();

    await user.click(getUiFolderField());

    expect(
      await screen.findByRole('option', { name: subformUiFolder, hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole('option', { name: otherSubformUiFolder, hidden: true }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: dataTaskUiFolder.id, hidden: true }),
    ).not.toBeInTheDocument();
  });

  it('prompts the user to add a subform when the app has none', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask({ layoutSets: [dataTaskUiFolder] });

    await user.click(getUiFolderField());

    expect(
      await screen.findByText(
        textMock('process_editor.configuration_panel_subform_pdf_no_ui_folder_to_select'),
      ),
    ).toBeInTheDocument();
  });

  it('offers no UI folders while the layout sets are not loaded', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask({ layoutSets: null });

    await user.click(getUiFolderField());

    expect(
      await screen.findByText(
        textMock('process_editor.configuration_panel_subform_pdf_no_ui_folder_to_select'),
      ),
    ).toBeInTheDocument();
  });

  it('saves the selected UI folder in the BPMN and nothing else', async () => {
    const user = userEvent.setup();
    const { saveBpmn, emitCommandStackChanged } = renderConfigSubformPdfServiceTask();

    await selectUiFolder(user, subformUiFolder);
    await act(async () => emitCommandStackChanged());

    expect(getUiFolderField()).toHaveValue(subformUiFolder);
    expect(saveBpmn).toHaveBeenCalledTimes(1);
    const [savedXml, metadata] = saveBpmn.mock.calls[0];
    expect(savedXml).toContain(
      `<altinn:subformUiFolder>${subformUiFolder}</altinn:subformUiFolder>`,
    );
    expect(savedXml).not.toContain('subformComponentId');
    expect(savedXml).not.toContain('subformDataTypeId');
    expect(metadata).toBeNull();
  });

  it('replaces the settings of a task configured before UI folders were chosen', async () => {
    const user = userEvent.setup();
    const { saveBpmn, emitCommandStackChanged } = renderConfigSubformPdfServiceTask({
      subformPdfConfig: { subformComponentId: 'vehicles', subformDataTypeId: 'vehicle' },
    });
    expect(getUiFolderField()).toHaveValue('');

    await selectUiFolder(user, subformUiFolder);
    await act(async () => emitCommandStackChanged());

    const [savedXml] = saveBpmn.mock.calls[0];
    expect(savedXml).toContain(
      `<altinn:subformUiFolder>${subformUiFolder}</altinn:subformUiFolder>`,
    );
    expect(savedXml).not.toContain('subformComponentId');
    expect(savedXml).not.toContain('subformDataTypeId');
  });

  it('shows the saved UI folder', async () => {
    renderConfigSubformPdfServiceTask({ subformPdfConfig: { subformUiFolder } });

    await waitFor(() => expect(getUiFolderField()).toHaveValue(subformUiFolder));
  });

  it('hides the required error until the field is touched', () => {
    renderConfigSubformPdfServiceTask();

    expect(screen.queryByText(requiredError)).not.toBeInTheDocument();
  });

  it('shows the required error when the field is left empty', async () => {
    const user = userEvent.setup();
    renderConfigSubformPdfServiceTask();

    await user.click(getUiFolderField());
    await user.tab();

    expect(await screen.findByText(requiredError)).toBeInTheDocument();
  });

  it('does not change the configuration without user input', () => {
    const { modeling } = renderConfigSubformPdfServiceTask({
      subformPdfConfig: { subformComponentId: 'vehicles', subformDataTypeId: 'vehicle' },
    });

    expect(modeling.updateModdleProperties).not.toHaveBeenCalled();
  });
});

const dataTaskUiFolder = { id: 'Task_1', dataType: 'model' };

function getUiFolderField(): HTMLElement {
  return screen.getByLabelText(uiFolderLabel, { selector: 'input', exact: false });
}

async function selectUiFolder(
  user: ReturnType<typeof userEvent.setup>,
  uiFolder: string,
): Promise<void> {
  await user.click(getUiFolderField());
  await user.click(await screen.findByRole('option', { name: uiFolder, hidden: true }));
}

type RenderProps = {
  subformPdfConfig?: object;
  layoutSets?: LayoutSets | null;
};

const renderConfigSubformPdfServiceTask = ({
  subformPdfConfig = {},
  layoutSets = [
    dataTaskUiFolder,
    { id: subformUiFolder, dataType: 'vehicle', type: 'subform' },
    { id: otherSubformUiFolder, dataType: 'note', type: 'subform' },
  ],
}: RenderProps = {}) => {
  const saveBpmn = vi.fn().mockResolvedValue(undefined);
  const fixture = createBpmnTestModeler(
    'bpmn:ServiceTask',
    { id: 'SubformPdf' },
    { layoutSets: layoutSets ?? undefined, saveBpmn },
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

  renderWithProviders(
    <Wrapper>
      <ConfigSubformPdfServiceTask />
    </Wrapper>,
  );

  return { ...fixture, saveBpmn };
};
