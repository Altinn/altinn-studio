import { screen, within } from '@testing-library/react';
import type { UserEvent } from '@testing-library/user-event';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import { ConfigEFormidlingServiceTask } from './ConfigEFormidlingServiceTask';
import type { BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../../test/renderWithProviders';

const environmentConfigType = 'altinn:EnvironmentConfig';
const eFormidlingConfigType = 'altinn:EFormidlingConfig';
const eFormidlingDataTypesType = 'altinn:EFormidlingDataTypes';
const dataTypeType = 'altinn:DataType';

const globalLabel = textMock('process_editor.configuration_panel.environment_config.scope_global');
const developmentLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_development',
);
const stagingLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_staging',
);
const productionLabel = textMock(
  'process_editor.configuration_panel.environment_config.scope_production',
);

const fieldLabel = (property: string): string =>
  textMock(`process_editor.configuration_panel.eformidling.${property}_label`);

describe('ConfigEFormidlingServiceTask', () => {
  afterEach(jest.clearAllMocks);

  it.each([
    ['process', 'process', 'urn:no:difi:profile:arkivmelding:ver1.0'],
    ['standard', 'standard', 'urn:no:difi:arkivmelding:xsd::arkivmelding'],
    ['type', 'type', 'arkivmelding'],
    ['typeVersion', 'type_version', '2.0'],
    ['securityLevel', 'security_level', '3'],
  ])(
    'writes the required field %s to its own element and leaves the other eight alone',
    async (property, labelKey, typedValue) => {
      const user = userEvent.setup();
      const { updateModdleProperties, element, eFormidlingConfig } =
        renderConfigEFormidlingServiceTask();

      await expandField(user, fieldLabel(labelKey));
      await typeGlobalValue(user, typedValue);

      expect(updateModdleProperties).toHaveBeenCalledTimes(1);
      expect(updateModdleProperties).toHaveBeenCalledWith(element, eFormidlingConfig, {
        [property]: [{ $type: environmentConfigType, env: undefined, value: typedValue }],
      });
    },
  );

  it.each([
    ['receiver', 'receiver', '991825827'],
    ['dpfShipmentType', 'dpf_shipment_type', 'altinn3.skjema'],
  ])(
    'writes the optional field %s to its own element and leaves the other eight alone',
    async (property, labelKey, typedValue) => {
      const user = userEvent.setup();
      const { updateModdleProperties, element, eFormidlingConfig } =
        renderConfigEFormidlingServiceTask();

      await expandField(user, fieldLabel(labelKey));
      await typeGlobalValue(user, typedValue);

      expect(updateModdleProperties).toHaveBeenCalledTimes(1);
      expect(updateModdleProperties).toHaveBeenCalledWith(element, eFormidlingConfig, {
        [property]: [{ $type: environmentConfigType, env: undefined, value: typedValue }],
      });
    },
  );

  it('writes the disabled flag as the text the runtime parses', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties, element, eFormidlingConfig } =
      renderConfigEFormidlingServiceTask();

    await expandField(user, fieldLabel('disabled'));
    await user.click(
      within(screen.getByRole('group', { name: globalLabel })).getByRole('radio', {
        name: textMock('process_editor.configuration_panel.eformidling.sending_off'),
      }),
    );

    expect(updateModdleProperties).toHaveBeenCalledWith(element, eFormidlingConfig, {
      disabled: [{ $type: environmentConfigType, env: undefined, value: 'true' }],
    });
  });

  it('writes the chosen data types as the nested elements the runtime reads', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties, element, eFormidlingConfig } =
      renderConfigEFormidlingServiceTask({ availableDataTypeIds: ['model', 'attachment'] });

    await expandField(user, fieldLabel('data_types'));
    expect(screen.getByLabelText(globalLabel, { exact: false })).toHaveFocus();
    await user.keyboard('attachment{Enter}');

    expect(updateModdleProperties).toHaveBeenCalledWith(element, eFormidlingConfig, {
      dataTypes: [
        {
          $type: eFormidlingDataTypesType,
          env: undefined,
          values: [{ $type: dataTypeType, dataType: 'attachment' }],
        },
      ],
    });
  });

  it('creates the config node when the task has none', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties, element, taskExtension } = renderConfigEFormidlingServiceTask({
      eFormidlingConfig: undefined,
    });

    await expandField(user, fieldLabel('type'));
    await typeGlobalValue(user, 'arkivmelding');

    expect(updateModdleProperties).toHaveBeenCalledWith(element, taskExtension, {
      eFormidlingConfig: {
        $type: eFormidlingConfigType,
        type: [{ $type: environmentConfigType, env: undefined, value: 'arkivmelding' }],
      },
    });
  });

  it('keeps the per-environment entries of an existing configuration when one row is edited', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties, element, eFormidlingConfig } =
      renderConfigEFormidlingServiceTask({
        eFormidlingConfig: {
          type: [
            { $type: environmentConfigType, value: 'global-type' },
            { $type: environmentConfigType, env: 'tt02', value: 'staging-type' },
            { $type: environmentConfigType, env: 'at21', value: 'dead-type' },
          ],
        },
      });

    await expandField(user, fieldLabel('type'));
    await user.clear(screen.getByLabelText(globalLabel));
    await typeGlobalValue(user, 'new-global-type');

    expect(updateModdleProperties).toHaveBeenCalledWith(element, eFormidlingConfig, {
      type: [
        { $type: environmentConfigType, env: undefined, value: 'new-global-type' },
        { $type: environmentConfigType, env: 'tt02', value: 'staging-type' },
        { $type: environmentConfigType, env: 'at21', value: 'dead-type' },
      ],
    });
  });

  it('shows the values of every environment, not just the environment-independent one', async () => {
    const user = userEvent.setup();
    renderConfigEFormidlingServiceTask({
      eFormidlingConfig: {
        type: [
          { $type: environmentConfigType, value: 'global-type' },
          { $type: environmentConfigType, env: 'tt02', value: 'staging-type' },
          { $type: environmentConfigType, env: 'produksjon', value: 'production-type' },
        ],
      },
    });

    await expandField(user, fieldLabel('type'));

    expect(screen.getByLabelText(globalLabel)).toHaveValue('global-type');
    expect(screen.getByLabelText(stagingLabel)).toHaveValue('staging-type');
    expect(screen.getByLabelText(productionLabel)).toHaveValue('production-type');
  });

  it('tags each group with whether the developer has to answer it', () => {
    renderConfigEFormidlingServiceTask();

    expect(
      within(getGroupOf(fieldLabel('type'))).getByText(textMock('general.required')),
    ).toBeInTheDocument();
    expect(
      within(getGroupOf(fieldLabel('disabled'))).getByText(textMock('general.optional')),
    ).toBeInTheDocument();
  });

  it('closes only the selected optional editor when several are open', async () => {
    const user = userEvent.setup();
    renderConfigEFormidlingServiceTask();
    await expandField(user, fieldLabel('receiver'));
    await expandField(user, fieldLabel('dpf_shipment_type'));

    await user.click(
      screen.getByRole('button', {
        name: textMock('general.close_item', { item: fieldLabel('receiver') }),
      }),
    );

    expect(getFieldButton(fieldLabel('receiver'))).toHaveFocus();
    expect(
      within(screen.getByRole('group', { name: fieldLabel('dpf_shipment_type') })).getByRole(
        'textbox',
        { name: globalLabel },
      ),
    ).toBeInTheDocument();
  });

  it('does not write a security level that is not a whole number', async () => {
    const user = userEvent.setup();
    const { updateModdleProperties } = renderConfigEFormidlingServiceTask();

    await expandField(user, fieldLabel('security_level'));
    await typeGlobalValue(user, '3.5');

    expect(updateModdleProperties).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel.environment_config.integer_error'),
      ),
    ).toBeInTheDocument();
  });

  it('names the environments the app would fail to start in, and the fields that would stop it', () => {
    renderConfigEFormidlingServiceTask({
      eFormidlingConfig: {
        process: [{ $type: environmentConfigType, value: 'a-process' }],
        standard: [{ $type: environmentConfigType, value: 'a-standard' }],
        type: [{ $type: environmentConfigType, value: 'arkivmelding' }],
        typeVersion: [{ $type: environmentConfigType, value: '2.0' }],
        securityLevel: [{ $type: environmentConfigType, env: 'prod', value: '3' }],
      },
    });

    expect(
      screen.getByText(missingConfigText(developmentLabel, ['security_level'])),
    ).toBeInTheDocument();
    expect(
      screen.getByText(missingConfigText(stagingLabel, ['security_level'])),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(missingConfigText(productionLabel, ['security_level'])),
    ).not.toBeInTheDocument();
  });

  it('names the fields once when every environment is short of the same ones', () => {
    renderConfigEFormidlingServiceTask();

    expect(
      screen.getByText(
        textMock('process_editor.configuration_panel.eformidling.missing_required_everywhere', {
          fields: ['process', 'standard', 'type', 'type_version', 'security_level']
            .map(fieldLabel)
            .join(', '),
        }),
      ),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(
        textMock('process_editor.configuration_panel.eformidling.missing_required_alert'),
      ),
    ).not.toBeInTheDocument();
  });

  it('says nothing about missing configuration once every required field is answered', () => {
    renderConfigEFormidlingServiceTask({
      eFormidlingConfig: {
        process: [{ $type: environmentConfigType, value: 'a-process' }],
        standard: [{ $type: environmentConfigType, value: 'a-standard' }],
        type: [{ $type: environmentConfigType, value: 'arkivmelding' }],
        typeVersion: [{ $type: environmentConfigType, value: '2.0' }],
        securityLevel: [{ $type: environmentConfigType, value: '3' }],
      },
    });

    expect(
      screen.queryByText(
        textMock('process_editor.configuration_panel.eformidling.missing_required_alert'),
      ),
    ).not.toBeInTheDocument();
  });
});

function missingConfigText(environment: string, properties: string[]): string {
  return textMock('process_editor.configuration_panel.eformidling.missing_required_environment', {
    environment,
    fields: properties.map(fieldLabel).join(', '),
  });
}

function getFieldButton(label: string): HTMLElement {
  return screen.getByRole('button', { name: label });
}

function getGroupOf(fieldButtonLabel: string): HTMLElement {
  // eslint-disable-next-line testing-library/no-node-access
  const group = getFieldButton(fieldButtonLabel).closest('fieldset');
  if (!group) throw new Error(`The field ${fieldButtonLabel} is in no group.`);
  return group;
}

async function expandField(user: UserEvent, label: string): Promise<void> {
  await user.click(getFieldButton(label));
}

async function typeGlobalValue(user: UserEvent, value: string): Promise<void> {
  await user.type(screen.getByLabelText(globalLabel), value);
  await user.tab();
}

type RenderProps = {
  eFormidlingConfig?: Record<string, object[]>;
  availableDataTypeIds?: string[];
};

const defaultProps: RenderProps = { eFormidlingConfig: {} };

function renderConfigEFormidlingServiceTask(props: RenderProps = defaultProps) {
  const { eFormidlingConfig, availableDataTypeIds = [] } = { ...defaultProps, ...props };
  const taskExtension = {
    $type: 'altinn:TaskExtension',
    taskType: 'eFormidling',
    eFormidlingConfig,
  };
  const element = {
    ...mockBpmnDetails.element,
    businessObject: { extensionElements: { values: [taskExtension] } },
  };
  const updateModdleProperties = jest.fn();
  const moddle = {
    create: jest.fn((type: string, properties: object) => ({ $type: type, ...properties })),
  };
  const modelerRef = {
    current: {
      get: (name: string) => (name === 'moddle' ? moddle : { updateModdleProperties }),
    },
  } as unknown as BpmnContextProps['modelerRef'];

  renderWithProviders(<ConfigEFormidlingServiceTask />, {
    bpmnContextProps: {
      bpmnDetails: { ...mockBpmnDetails, taskType: 'eFormidling', element },
      modelerRef,
    },
    bpmnApiContextProps: { availableDataTypeIds },
  });

  return { element, taskExtension, eFormidlingConfig, updateModdleProperties };
}
