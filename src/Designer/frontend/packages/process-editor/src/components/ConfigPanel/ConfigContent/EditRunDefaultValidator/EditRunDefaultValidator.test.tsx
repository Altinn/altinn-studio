import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';
import { EditRunDefaultValidator } from './EditRunDefaultValidator';

const label = textMock('process_editor.configuration_panel_run_default_validator_label');
const getSwitch = (): HTMLElement => screen.getByLabelText(label);

describe('EditRunDefaultValidator', () => {
  it.each([true, false, undefined])('reads the stored value %s', (value) => {
    renderEditRunDefaultValidator(value);
    expect(getSwitch()).toHaveProperty('checked', value === true);
  });

  it('updates the visible switch and persists both choices explicitly', async () => {
    const user = userEvent.setup();
    const { saveXml } = renderEditRunDefaultValidator();
    await user.click(getSwitch());
    expect(getSwitch()).toBeChecked();
    expect(await saveXml()).toContain(
      '<altinn:runDefaultValidator>true</altinn:runDefaultValidator>',
    );

    await user.click(getSwitch());
    expect(getSwitch()).not.toBeChecked();
    expect(await saveXml()).toContain(
      '<altinn:runDefaultValidator>false</altinn:runDefaultValidator>',
    );
    expect(await saveXml()).toContain(
      '<altinn:signatureDataType>signatures</altinn:signatureDataType>',
    );
  });

  it('creates a missing signature config on an imported signing task', async () => {
    const user = userEvent.setup();
    const { saveXml } = renderEditRunDefaultValidator(undefined, false);
    await user.click(getSwitch());
    expect(await saveXml()).toContain(
      '<altinn:runDefaultValidator>true</altinn:runDefaultValidator>',
    );
  });
});

function renderEditRunDefaultValidator(value?: boolean, withConfig = true) {
  const modeler = createBpmnTestModeler('bpmn:Task');
  const signatureConfig = withConfig
    ? modeler.moddle.create('altinn:SignatureConfig', {
        signatureDataType: 'signatures',
        runDefaultValidator:
          value === undefined
            ? undefined
            : modeler.moddle.create('altinn:RunDefaultValidator', { value }),
      })
    : undefined;
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [
      modeler.moddle.create('altinn:TaskExtension', { taskType: 'signing', signatureConfig }),
    ],
  });
  render(<EditRunDefaultValidator />, { wrapper: modeler.Wrapper });
  return modeler;
}
