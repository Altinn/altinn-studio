import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { textMock } from '@studio/testing/mocks/i18nMock';
import type { ModdleElement } from 'bpmn-js/lib/BaseModeler';
import { BpmnContext, type BpmnContextProps } from '../../../../contexts/BpmnContext';
import { mockBpmnContextValue } from '../../../../../test/mocks/bpmnContextMock';
import { mockBpmnDetails } from '../../../../../test/mocks/bpmnDetailsMock';
import type { BpmnDetails } from '../../../../types/BpmnDetails';
import { EditRunDefaultValidator } from './EditRunDefaultValidator';

const updateModdleProperties = jest.fn();
const createElement = jest.fn((elementType: string, options: object) => ({
  $type: elementType,
  ...options,
}));

jest.mock('../../../../utils/bpmnModeler/StudioModeler', () => ({
  StudioModeler: jest.fn().mockImplementation(() => ({
    updateModdleProperties: (...args: unknown[]) => updateModdleProperties(...args),
    createElement: (...args: unknown[]) => createElement(...(args as [string, object])),
  })),
}));

const label = textMock('process_editor.configuration_panel_run_default_validator_label');
const getSwitch = (): HTMLElement => screen.getByLabelText(label);

describe('EditRunDefaultValidator', () => {
  afterEach(jest.clearAllMocks);

  it('shows the switch as on when the signature config runs the default validator', () => {
    renderEditRunDefaultValidator({
      signatureConfig: { runDefaultValidator: { value: true } },
    });

    expect(getSwitch()).toBeChecked();
  });

  // The runtime reads a missing element as `false`, so an untouched signing task genuinely does
  // not run the validator. Showing the switch as on would be a lie about what the app will do.
  it('shows the switch as off when the element is absent', () => {
    renderEditRunDefaultValidator({ signatureConfig: {} });

    expect(getSwitch()).not.toBeChecked();
  });

  it('writes false explicitly when the developer turns the validator off', async () => {
    const user = userEvent.setup();
    const { signatureConfig } = renderEditRunDefaultValidator({
      signatureConfig: { runDefaultValidator: { value: true } },
    });

    await user.click(getSwitch());

    expect(createElement).toHaveBeenCalledWith('altinn:RunDefaultValidator', { value: false });
    expect(updateModdleProperties).toHaveBeenCalledWith(
      { runDefaultValidator: expect.objectContaining({ value: false }) },
      signatureConfig,
    );
  });

  it('writes true when the developer turns the validator on', async () => {
    const user = userEvent.setup();
    const { signatureConfig } = renderEditRunDefaultValidator({ signatureConfig: {} });

    await user.click(getSwitch());

    expect(updateModdleProperties).toHaveBeenCalledWith(
      { runDefaultValidator: expect.objectContaining({ value: true }) },
      signatureConfig,
    );
  });

  it('creates the signature config when a hand-authored signing task has none', async () => {
    const user = userEvent.setup();
    const { taskExtension } = renderEditRunDefaultValidator({ signatureConfig: undefined });

    await user.click(getSwitch());

    expect(createElement).toHaveBeenCalledWith('altinn:SignatureConfig', {
      runDefaultValidator: expect.objectContaining({ value: true }),
    });
    expect(updateModdleProperties).toHaveBeenCalledWith(
      { signatureConfig: expect.objectContaining({ $type: 'altinn:SignatureConfig' }) },
      taskExtension,
    );
  });
});

const createSigningDetails = (taskExtension: ModdleElement): BpmnDetails => ({
  ...mockBpmnDetails,
  taskType: 'signing',
  element: {
    ...mockBpmnDetails.element,
    businessObject: { extensionElements: { values: [taskExtension] } },
  },
});

type RenderProps = {
  signatureConfig?: object;
};

const renderEditRunDefaultValidator = ({ signatureConfig }: RenderProps = {}) => {
  const taskExtension = {
    $type: 'altinn:TaskExtension',
    taskType: 'signing',
    signatureConfig,
  } as unknown as ModdleElement;
  const bpmnContextProps: Partial<BpmnContextProps> = {
    bpmnDetails: createSigningDetails(taskExtension),
  };

  render(
    <BpmnContext.Provider value={{ ...mockBpmnContextValue, ...bpmnContextProps }}>
      <EditRunDefaultValidator />
    </BpmnContext.Provider>,
  );

  return { taskExtension, signatureConfig };
};
