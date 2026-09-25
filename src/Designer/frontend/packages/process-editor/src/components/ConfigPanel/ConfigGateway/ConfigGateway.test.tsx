import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { createBpmnTestModeler } from '../../../../test/createBpmnTestModeler';
import { ConfigGateway } from './ConfigGateway';

const label = textMock('process_editor.configuration_panel_gateway_connected_data_type_label');

describe('ConfigGateway', () => {
  it('saves the chosen data model and refreshes the field through the modeler event', async () => {
    const user = userEvent.setup();
    const { saveXml } = renderConfigGateway();
    const input = screen.getByRole('combobox', { name: label });
    await user.click(input);
    await user.click(await screen.findByRole('option', { name: 'other-model', hidden: true }));
    expect(await saveXml()).toContain(
      '<altinn:connectedDataTypeId>other-model</altinn:connectedDataTypeId>',
    );
    await waitFor(() => expect(input).toHaveValue('other-model'));
  });

  it('offers an imported data model even when the app no longer has it', async () => {
    const user = userEvent.setup();
    renderConfigGateway('removed-model');
    await user.click(screen.getByRole('combobox', { name: label }));
    expect(
      await screen.findByRole('option', { name: 'removed-model', hidden: true }),
    ).toBeInTheDocument();
  });

  it('clears the committed field without leaving a data type in the BPMN', async () => {
    const user = userEvent.setup();
    const { saveXml } = renderConfigGateway('model');
    const input = screen.getByRole('combobox', { name: label });
    await waitFor(() => expect(input).toHaveValue('model'));
    await user.clear(input);
    await user.tab();
    await waitFor(() => expect(input).toHaveValue(''));
    expect(await saveXml()).not.toContain('connectedDataTypeId');
  });
});

function renderConfigGateway(connectedDataTypeId?: string) {
  const modeler = createBpmnTestModeler(
    'bpmn:ExclusiveGateway',
    {},
    { allDataModelIds: ['model', 'other-model'] },
  );
  if (connectedDataTypeId) {
    modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
      values: [modeler.moddle.create('altinn:GatewayExtension', { connectedDataTypeId })],
    });
  }
  render(<ConfigGateway />, { wrapper: modeler.Wrapper });
  return modeler;
}
