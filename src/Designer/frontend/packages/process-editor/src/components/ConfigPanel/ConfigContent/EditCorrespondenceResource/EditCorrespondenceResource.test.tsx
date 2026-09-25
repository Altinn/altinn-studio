import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditCorrespondenceResource } from './EditCorrespondenceResource';
import { createBpmnTestModeler } from '../../../../../test/createBpmnTestModeler';

const fieldLabel = textMock('process_editor.configuration_panel.correspondence_resource');
const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');
const stagingLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_staging',
);

describe('EditCorrespondenceResource', () => {
  it('shows every environment-scoped resource, not just the environment-independent one', async () => {
    const user = userEvent.setup();
    renderEditCorrespondenceResource();

    await user.click(screen.getByRole('button', { name: fieldLabel }));

    expect(screen.getByLabelText(globalLabel)).toHaveValue('resource-global');
    expect(screen.getByLabelText(stagingLabel)).toHaveValue('resource-tt02');
  });

  it('persists an edited resource while preserving other scopes and signature settings', async () => {
    const user = userEvent.setup();
    const { saveXml } = renderEditCorrespondenceResource();

    await user.click(screen.getByRole('button', { name: fieldLabel }));
    await user.clear(screen.getByLabelText(stagingLabel));
    await user.type(screen.getByLabelText(stagingLabel), 'resource-updated');
    await user.tab();

    const xml = await saveXml();
    expect(xml).toContain(
      '<altinn:correspondenceResource env="tt02">resource-updated</altinn:correspondenceResource>',
    );
    expect(xml).toContain(
      '<altinn:correspondenceResource>resource-global</altinn:correspondenceResource>',
    );
    expect(xml).toContain(
      '<altinn:correspondenceResource env="at21">resource-imported</altinn:correspondenceResource>',
    );
    expect(xml).toContain('<altinn:signatureDataType>signature</altinn:signatureDataType>');
    expect(screen.getByLabelText(stagingLabel)).toHaveValue('resource-updated');
  });

  it('removes a cleared entry from XML while preserving the remaining scopes', async () => {
    const user = userEvent.setup();
    const { saveXml } = renderEditCorrespondenceResource();

    await user.click(screen.getByRole('button', { name: fieldLabel }));
    await user.clear(screen.getByLabelText(stagingLabel));
    await user.tab();

    const xml = await saveXml();
    expect(xml).not.toContain('env="tt02"');
    expect(xml).toContain(
      '<altinn:correspondenceResource>resource-global</altinn:correspondenceResource>',
    );
    expect(xml).toContain(
      '<altinn:correspondenceResource env="at21">resource-imported</altinn:correspondenceResource>',
    );
    expect(screen.getByLabelText(stagingLabel)).toHaveValue('');
  });
});

function renderEditCorrespondenceResource() {
  const modeler = createBpmnTestModeler('bpmn:Task');
  const correspondenceResource = [
    { value: 'resource-global' },
    { env: 'tt02', value: 'resource-tt02' },
    { env: 'at21', value: 'resource-imported' },
  ].map((entry) => modeler.moddle.create('altinn:EnvironmentConfig', entry));
  const signatureConfig = modeler.moddle.create('altinn:SignatureConfig', {
    signatureDataType: 'signature',
    correspondenceResource,
  });
  const taskExtension = modeler.moddle.create('altinn:TaskExtension', {
    taskType: 'signing',
    signatureConfig,
  });
  modeler.businessObject.extensionElements = modeler.moddle.create('bpmn:ExtensionElements', {
    values: [taskExtension],
  });
  render(<EditCorrespondenceResource />, { wrapper: modeler.Wrapper });
  return modeler;
}
