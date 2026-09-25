import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { type BpmnContextProps } from '../../../contexts/BpmnContext';
import { type BpmnApiContextProps } from '../../../contexts/BpmnApiContext';
import { mockBpmnDetails } from '../../../../test/mocks/bpmnDetailsMock';
import { renderWithProviders } from '../../../../test/renderWithProviders';
import { BpmnTypeEnum } from '../../../enum/BpmnTypeEnum';
import type { BpmnDetails } from '../../../types/BpmnDetails';
import { ConfigGateway } from './ConfigGateway';

const updateModdleProperties = jest.fn((properties: object, element: object) =>
  Object.assign(element, properties),
);

jest.mock('../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) =>
      updateModdleProperties(...(args as [object, object])),
    updateElementProperties: jest.fn(),
    createElement: jest.fn(),
  })),
}));

const dataModelLabel = textMock(
  'process_editor.configuration_panel_gateway_connected_data_type_label',
);

describe('ConfigGateway', () => {
  afterEach(jest.clearAllMocks);

  it('saves the data model the developer picks', async () => {
    const user = userEvent.setup();
    const gatewayExtension = createGatewayExtension('');
    renderConfigGateway({
      extensionValues: [gatewayExtension],
      allDataModelIds: ['model', 'other-model'],
    });

    const input = screen.getByRole('textbox', { name: dataModelLabel });
    await user.click(input);
    await user.type(input, 'other-model{Enter}');

    await waitFor(() =>
      expect(updateModdleProperties).toHaveBeenCalledWith(
        { connectedDataTypeId: 'other-model' },
        gatewayExtension,
      ),
    );
  });

  it('offers the data model the gateway already points at, even when the app no longer has it', async () => {
    const user = userEvent.setup();
    renderConfigGateway({
      extensionValues: [createGatewayExtension('removed-model')],
      allDataModelIds: ['model'],
    });

    await user.click(screen.getByRole('textbox', { name: dataModelLabel }));

    expect(
      await screen.findByRole('option', { name: 'removed-model', hidden: true }),
    ).toBeInTheDocument();
  });

  it('empties the field when the developer clears the data model', async () => {
    const user = userEvent.setup();
    const gatewayExtension = createGatewayExtension('model');
    renderConfigGateway({ extensionValues: [gatewayExtension], allDataModelIds: ['model'] });

    const input = screen.getByRole('textbox', { name: dataModelLabel });
    await waitFor(() => expect(input).toHaveValue('model'));

    await user.clear(input);
    await user.tab();

    await waitFor(() =>
      expect(updateModdleProperties).toHaveBeenCalledWith(
        { connectedDataTypeId: undefined },
        gatewayExtension,
      ),
    );
    await waitFor(() => expect(input).toHaveValue(''));
  });
});

const createGatewayExtension = (connectedDataTypeId: string): ModdleElement =>
  ({ $type: 'altinn:GatewayExtension', connectedDataTypeId }) as unknown as ModdleElement;

const createGatewayDetails = (extensionValues?: ModdleElement[]): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType: null,
  type: BpmnTypeEnum.ExclusiveGateway,
  element: {
    ...mockBpmnDetails.element,
    businessObject: {
      extensionElements: extensionValues ? { values: extensionValues } : undefined,
    },
  },
});

type RenderProps = {
  extensionValues?: ModdleElement[];
  allDataModelIds?: string[];
};

const renderConfigGateway = ({ extensionValues, allDataModelIds = [] }: RenderProps = {}) => {
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: createGatewayDetails(extensionValues),
  };
  const bpmnApiContextProps: Partial<BpmnApiContextProps> = { allDataModelIds };

  return renderWithProviders(<ConfigGateway />, { bpmnContextProps, bpmnApiContextProps });
};
