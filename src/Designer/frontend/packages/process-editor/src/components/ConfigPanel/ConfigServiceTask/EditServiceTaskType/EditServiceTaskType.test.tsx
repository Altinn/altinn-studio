import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { EditServiceTaskType } from './EditServiceTaskType';

const label = textMock('process_editor.configuration_panel_service_task_type_label');

describe('EditServiceTaskType', () => {
  it('saves the task type and updates the field after the modeler event', async () => {
    const { saveXml } = renderEditServiceTaskType('myServiceTask');
    await editTaskType('myOtherServiceTask');
    expect(await saveXml()).toContain('<altinn:taskType>myOtherServiceTask</altinn:taskType>');
    expect(screen.getByText('myOtherServiceTask')).toBeInTheDocument();
  });

  it('creates a missing task extension without replacing other extensions', async () => {
    const { saveXml } = renderEditServiceTaskType(undefined, true);
    await editTaskType('myServiceTask');
    const xml = await saveXml();
    expect(xml).toContain('<altinn:taskType>myServiceTask</altinn:taskType>');
    expect(xml).toContain('<altinn:connectedDataTypeId>model</altinn:connectedDataTypeId>');
  });

  it('blocks an empty task type', async () => {
    const { modeling } = renderEditServiceTaskType('myServiceTask');
    await editTaskType('');
    expect(screen.getByText(textMock('validation_errors.required'))).toBeInTheDocument();
    expect(modeling.updateModdleProperties).not.toHaveBeenCalled();
  });
});

async function editTaskType(value: string) {
  const user = userEvent.setup();
  await user.click(screen.getByRole('button', { name: label }));
  await user.clear(screen.getByLabelText(label));
  if (value) await user.type(screen.getByLabelText(label), value);
  await user.tab();
}

function renderEditServiceTaskType(taskType?: string, withOtherExtension = false) {
  const modeler = createBpmnTestModeler();
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [
      ...(taskType ? [modeler.moddle.create('altinn:TaskExtension', { taskType })] : []),
      ...(withOtherExtension
        ? [modeler.moddle.create('altinn:GatewayExtension', { connectedDataTypeId: 'model' })]
        : []),
    ],
  });
  render(<EditServiceTaskType />, { wrapper: modeler.Wrapper });
  return modeler;
}
