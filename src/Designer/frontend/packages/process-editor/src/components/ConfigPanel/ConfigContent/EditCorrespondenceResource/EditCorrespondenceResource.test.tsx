import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { EditCorrespondenceResource } from './EditCorrespondenceResource';
import { useBpmnContext } from '../../../../contexts/BpmnContext';

jest.mock('../../../../contexts/BpmnContext');

const environmentConfigType = 'altinn:EnvironmentConfig';
const fieldLabel = textMock('process_editor.configuration_panel.correspondence_resource');
const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');
const stagingLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_staging',
);

describe('EditCorrespondenceResource', () => {
  afterEach(jest.clearAllMocks);

  it('shows every environment-scoped resource, not just the environment-independent one', async () => {
    const user = userEvent.setup();
    setUpBpmnContext([
      { $type: environmentConfigType, value: 'resource-global' },
      { $type: environmentConfigType, env: 'tt02', value: 'resource-tt02' },
    ]);

    renderEditCorrespondenceResource();
    await user.click(screen.getByRole('button', { name: fieldLabel }));

    expect(screen.getByLabelText(globalLabel)).toHaveValue('resource-global');
    expect(screen.getByLabelText(stagingLabel)).toHaveValue('resource-tt02');
  });

  it('writes the whole list back, keeping the raw env attribute of the edited entry', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties, signatureConfig, element } = setUpBpmnContext([
      { $type: environmentConfigType, value: 'resource-global' },
      { $type: environmentConfigType, env: 'tt02', value: 'resource-tt02' },
    ]);

    renderEditCorrespondenceResource();
    await user.click(screen.getByRole('button', { name: fieldLabel }));
    await user.clear(screen.getByLabelText(stagingLabel));
    await user.type(screen.getByLabelText(stagingLabel), 'resource-updated');
    await user.tab();

    expect(updateModdleProperties).toHaveBeenCalledWith(element, signatureConfig, {
      correspondenceResource: [
        { $type: environmentConfigType, env: undefined, value: 'resource-global' },
        { $type: environmentConfigType, env: 'tt02', value: 'resource-updated' },
      ],
    });
  });

  it('removes the entry rather than writing an empty one when a value is cleared', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties, signatureConfig, element } = setUpBpmnContext([
      { $type: environmentConfigType, value: 'resource-global' },
      { $type: environmentConfigType, env: 'tt02', value: 'resource-tt02' },
    ]);

    renderEditCorrespondenceResource();
    await user.click(screen.getByRole('button', { name: fieldLabel }));
    await user.clear(screen.getByLabelText(stagingLabel));
    await user.tab();

    expect(updateModdleProperties).toHaveBeenCalledWith(element, signatureConfig, {
      correspondenceResource: [
        { $type: environmentConfigType, env: undefined, value: 'resource-global' },
      ],
    });
  });
});

function setUpBpmnContext(correspondenceResource: object[]) {
  const signatureConfig = { correspondenceResource };
  const element = {
    businessObject: { extensionElements: { values: [{ signatureConfig }] } },
  };
  const updateModdleProperties = jest.fn();
  const moddle = {
    create: jest.fn((type: string, properties: object) => ({ $type: type, ...properties })),
  };

  (useBpmnContext as jest.Mock).mockReturnValue({
    bpmnDetails: { element },
    modelerRef: {
      current: {
        get: (name: string) => (name === 'moddle' ? moddle : { updateModdleProperties }),
      },
    },
  });

  return { element, signatureConfig, updateModdleProperties };
}

function renderEditCorrespondenceResource(): void {
  render(<EditCorrespondenceResource />);
}
